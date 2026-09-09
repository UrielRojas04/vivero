package com.vivero.gestion.services;

import com.vivero.gestion.dto.EntregaPendienteDetalleRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteResponseDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.EstadoEntregaPendiente;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.EntregaPendienteRepository;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Grupo 6 de tasks.md de entregas-pendientes-confirmacion-vivero (D5, D7, D9 de design.md):
 * registrar una entrega pendiente descuenta stock de inmediato, deja un MovimientoStock
 * ENTREGA_PENDIENTE trazable, exige firma y cliente real, y es exclusivamente de Vivero. Base
 * real (Postgres localhost:5433), sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class EntregaPendienteRegistrarTest {

    @Autowired
    private EntregaPendienteService entregaPendienteService;

    @Autowired
    private EntregaPendienteRepository entregaPendienteRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private MovimientoStockRepository movimientoStockRepository;

    @Autowired
    private VentaRepository ventaRepository;

    private final List<Long> entregasCreadas = new ArrayList<>();
    private final List<Long> productosCreados = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        entregasCreadas.forEach(entregaPendienteRepository::deleteById);
        entregasCreadas.clear();
        productosCreados.forEach(productoRepository::deleteById);
        productosCreados.clear();
        clientesCreados.forEach(clienteRepository::deleteById);
        clientesCreados.clear();
        UnidadNegocioContextHolder.clear();
    }

    private UnidadNegocio vivero() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
    }

    private UnidadNegocio herramientas() {
        return unidadNegocioRepository.findByNombre("Herramientas")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Herramientas sembrada"));
    }

    private Producto crearProducto(UnidadNegocio unidad, int stock) {
        Producto p = new Producto("Producto Entrega " + UUID.randomUUID(), "Test",
                new BigDecimal("100.00"), new BigDecimal("40.00"), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved;
    }

    private Cliente crearCliente() {
        Cliente c = new Cliente();
        c.setNombreRazonSocial("Cliente Entrega " + UUID.randomUUID());
        c.setTelefono("1122334455");
        Cliente saved = clienteRepository.save(c);
        clientesCreados.add(saved.getId());
        return saved;
    }

    private static final String FIRMA_VALIDA = "data:image/png;base64," + "A".repeat(1000);

    private EntregaPendienteRequestDTO requestValido(Long clienteId, Long productoId, int cantidad) {
        EntregaPendienteRequestDTO req = new EntregaPendienteRequestDTO();
        req.setClienteId(clienteId);
        req.setFirmaBase64(FIRMA_VALIDA);
        req.setObservacion("Entrega de prueba");
        EntregaPendienteDetalleRequestDTO det = new EntregaPendienteDetalleRequestDTO();
        det.setProductoId(productoId);
        det.setCantidad(cantidad);
        req.setDetalles(List.of(det));
        return req;
    }

    // --- 6.1 RED / 6.2 GREEN ---
    @Test
    void registrarEntregaValidaDescuentaStockYNoCreaVenta() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();
        long ventasAntes = ventaRepository.count();

        EntregaPendienteResponseDTO response = entregaPendienteService.registrar(
                requestValido(cliente.getId(), producto.getId(), 10), "Sergio");
        entregasCreadas.add(response.getId());

        Producto productoDespues = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(productoDespues.getStock()).isEqualTo(30);
        assertThat(ventaRepository.count()).isEqualTo(ventasAntes);
        assertThat(response.getEstado()).isEqualTo(EstadoEntregaPendiente.PENDIENTE);
    }

    // --- 6.3 TRIANGULATE: stock insuficiente ---
    @Test
    void stockInsuficienteRechazaSinPersistirNiMoverStock() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 5);
        Cliente cliente = crearCliente();
        long entregasAntes = entregaPendienteRepository.count();

        assertThatThrownBy(() -> entregaPendienteService.registrar(
                requestValido(cliente.getId(), producto.getId(), 50), "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(entregaPendienteRepository.count()).isEqualTo(entregasAntes);
        Producto productoDespues = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(productoDespues.getStock()).isEqualTo(5);
    }

    // --- 6.4 TRIANGULATE: cantidad 0 o negativa ---
    @Test
    void cantidadInvalidaRechazaSinPersistirNada() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();
        long entregasAntes = entregaPendienteRepository.count();

        assertThatThrownBy(() -> entregaPendienteService.registrar(
                requestValido(cliente.getId(), producto.getId(), 0), "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> entregaPendienteService.registrar(
                requestValido(cliente.getId(), producto.getId(), -1), "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(entregaPendienteRepository.count()).isEqualTo(entregasAntes);
    }

    // --- 6.5 TRIANGULATE: sin clienteId / cliente inexistente ---
    @Test
    void sinClienteIdORVAlidoRechaza() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);

        assertThatThrownBy(() -> entregaPendienteService.registrar(
                requestValido(null, producto.getId(), 5), "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> entregaPendienteService.registrar(
                requestValido(999999999L, producto.getId(), 5), "Sergio"))
                .isInstanceOf(RuntimeException.class);
    }

    // --- 6.6 TRIANGULATE: sin líneas ---
    @Test
    void sinLineasRechaza() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Cliente cliente = crearCliente();

        EntregaPendienteRequestDTO req = new EntregaPendienteRequestDTO();
        req.setClienteId(cliente.getId());
        req.setFirmaBase64(FIRMA_VALIDA);
        req.setDetalles(List.of());

        assertThatThrownBy(() -> entregaPendienteService.registrar(req, "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // --- 6.7 RED/GREEN/TRIANGULATE: validación de firma ---
    @Test
    void firmaAusenteOInvalidaRechaza() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteRequestDTO sinFirma = requestValido(cliente.getId(), producto.getId(), 5);
        sinFirma.setFirmaBase64(null);
        assertThatThrownBy(() -> entregaPendienteService.registrar(sinFirma, "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);

        EntregaPendienteRequestDTO firmaBlanco = requestValido(cliente.getId(), producto.getId(), 5);
        firmaBlanco.setFirmaBase64("   ");
        assertThatThrownBy(() -> entregaPendienteService.registrar(firmaBlanco, "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);

        EntregaPendienteRequestDTO prefijoInvalido = requestValido(cliente.getId(), producto.getId(), 5);
        prefijoInvalido.setFirmaBase64("data:image/jpeg;base64,AAAA");
        assertThatThrownBy(() -> entregaPendienteService.registrar(prefijoInvalido, "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);

        EntregaPendienteRequestDTO firmaGigante = requestValido(cliente.getId(), producto.getId(), 5);
        firmaGigante.setFirmaBase64("data:image/png;base64," + "A".repeat(520 * 1024));
        assertThatThrownBy(() -> entregaPendienteService.registrar(firmaGigante, "Sergio"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void firmaValidaSePersisteYSeRecuperaIdentica() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO response = entregaPendienteService.registrar(
                requestValido(cliente.getId(), producto.getId(), 5), "Sergio");
        entregasCreadas.add(response.getId());

        var firma = entregaPendienteService.obtenerFirma(response.getId());
        assertThat(firma.getFirmaBase64()).isEqualTo(FIRMA_VALIDA);
    }

    // --- 6.8 TRIANGULATE: estado, fecha, unidad, usuario y referencia al MovimientoStock ---
    @Test
    void laEntregaQuedaPendienteConFechaUnidadYUsuarioYSuLineaReferenciaElMovimiento() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO response = entregaPendienteService.registrar(
                requestValido(cliente.getId(), producto.getId(), 7), "Sergio");
        entregasCreadas.add(response.getId());

        assertThat(response.getEstado()).isEqualTo(EstadoEntregaPendiente.PENDIENTE);
        assertThat(response.getFecha()).isNotNull();
        assertThat(response.getUsuarioRegistroNombre()).isEqualTo("Sergio");
        assertThat(response.getDetalles()).hasSize(1);

        var entregaPersistida = entregaPendienteRepository.findByIdWithDetalles(response.getId()).orElseThrow();
        assertThat(entregaPersistida.getUnidadNegocio().getId()).isEqualTo(vivero.getId());
        assertThat(entregaPersistida.getDetalles().get(0).getMovimientoStock()).isNotNull();
        assertThat(entregaPersistida.getDetalles().get(0).getMovimientoStock().getTipoMovimiento())
                .isEqualTo(TipoMovimientoStock.ENTREGA_PENDIENTE);
    }

    // --- 6.9 TRIANGULATE: fuera de Vivero, rechaza sin persistir ni mover stock ---
    @Test
    void conUnidadActivaHerramientasRegistrarLanzaYNoPersisteNiMueveStock() {
        UnidadNegocio herramientas = herramientas();
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientas.getId());
        Producto producto = crearProducto(herramientas, 40);
        Cliente cliente = crearCliente();
        long entregasAntes = entregaPendienteRepository.count();

        assertThatThrownBy(() -> entregaPendienteService.registrar(
                requestValido(cliente.getId(), producto.getId(), 5), "Sergio"))
                .isInstanceOf(RuntimeException.class);

        assertThat(entregaPendienteRepository.count()).isEqualTo(entregasAntes);
        Producto productoDespues = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(productoDespues.getStock()).isEqualTo(40);
    }
}
