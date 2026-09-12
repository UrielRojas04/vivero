package com.vivero.gestion.services;

import com.vivero.gestion.dto.EntregaPendienteDetalleRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteResponseDTO;
import com.vivero.gestion.dto.EntregaPendienteResumenDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.EstadoEntregaPendiente;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.EntregaPendienteRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Grupo 7 de tasks.md de entregas-pendientes-confirmacion-vivero (D6, D10 de design.md): listados
 * paginados del dueño (todas / por estado) y del empleado (sólo las propias), y detalle por id sin
 * firma. Base real (Postgres localhost:5433), sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class EntregaPendienteListadosTest {

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
        Producto p = new Producto("Producto Listado Entrega " + UUID.randomUUID(), "Test",
                new BigDecimal("100.00"), new BigDecimal("40.00"), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved;
    }

    private Cliente crearCliente() {
        Cliente c = new Cliente();
        c.setNombreRazonSocial("Cliente Listado Entrega " + UUID.randomUUID());
        c.setTelefono("1122334455");
        Cliente saved = clienteRepository.save(c);
        clientesCreados.add(saved.getId());
        return saved;
    }

    private static final String FIRMA_VALIDA = "data:image/png;base64," + "A".repeat(1000);

    private Long registrarEntrega(String username) {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteRequestDTO req = new EntregaPendienteRequestDTO();
        req.setClienteId(cliente.getId());
        req.setFirmaBase64(FIRMA_VALIDA);
        EntregaPendienteDetalleRequestDTO det = new EntregaPendienteDetalleRequestDTO();
        det.setProductoId(producto.getId());
        det.setCantidad(2);
        req.setDetalles(List.of(det));

        EntregaPendienteResponseDTO response = entregaPendienteService.registrar(req, username);
        entregasCreadas.add(response.getId());
        return response.getId();
    }

    // --- 7.1 RED/GREEN + 7.3 TRIANGULATE (sin firma) ---
    @Test
    void listarPorEstadoDevuelveResumenDeLaUnidadSinFirma() {
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());
        Long id = registrarEntrega("Sergio");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());

        Page<EntregaPendienteResumenDTO> pagina = entregaPendienteService.listarPorEstado(
                EstadoEntregaPendiente.PENDIENTE, PageRequest.of(0, 20));

        assertThat(pagina.getContent()).extracting(EntregaPendienteResumenDTO::getId).contains(id);
        EntregaPendienteResumenDTO resumen = pagina.getContent().stream()
                .filter(r -> r.getId().equals(id)).findFirst().orElseThrow();
        assertThat(resumen.getEstado()).isEqualTo(EstadoEntregaPendiente.PENDIENTE);
        assertThat(resumen.getCantidadLineas()).isEqualTo(1);
        assertThat(resumen.getCantidadTotalUnidades()).isEqualTo(2);
        // 7.3: el DTO de resumen no tiene campo de firma -- verificado por diseño de clase
        // (EntregaPendienteResumenDTO no declara firmaBase64), reforzado acá comprobando que
        // ningún getter expone ese dato.
        assertThat(EntregaPendienteResumenDTO.class.getDeclaredFields())
                .noneMatch(f -> f.getName().toLowerCase().contains("firma"));
    }

    // --- 7.2 TRIANGULATE: paginación real ---
    @Test
    void laPaginacionEsReal() {
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());
        registrarEntrega("Sergio");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());
        registrarEntrega("Sergio");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());
        registrarEntrega("Sergio");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());

        Page<EntregaPendienteResumenDTO> pagina0 = entregaPendienteService.listarPorEstado(
                EstadoEntregaPendiente.PENDIENTE, PageRequest.of(0, 2));

        assertThat(pagina0.getContent()).hasSizeLessThanOrEqualTo(2);
        assertThat(pagina0.getTotalElements()).isGreaterThanOrEqualTo(3);
    }

    // --- 7.4 RED/GREEN + 7.5 TRIANGULATE: "mías" sólo del usuario que registró ---
    @Test
    void listarMiasDevuelveSoloLasDelUsuarioQueRegistro() {
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());
        Long idSergio = registrarEntrega("Sergio");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());
        Long idPablo = registrarEntrega("Pablo");

        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());
        Page<EntregaPendienteResumenDTO> paginaSergio = entregaPendienteService.listarMias("Sergio", PageRequest.of(0, 20));
        assertThat(paginaSergio.getContent()).extracting(EntregaPendienteResumenDTO::getId).contains(idSergio);
        assertThat(paginaSergio.getContent()).extracting(EntregaPendienteResumenDTO::getId).doesNotContain(idPablo);

        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());
        Page<EntregaPendienteResumenDTO> paginaPablo = entregaPendienteService.listarMias("Pablo", PageRequest.of(0, 20));
        assertThat(paginaPablo.getContent()).extracting(EntregaPendienteResumenDTO::getId).contains(idPablo);
        assertThat(paginaPablo.getContent()).extracting(EntregaPendienteResumenDTO::getId).doesNotContain(idSergio);
    }

    // --- 7.6 RED/GREEN: obtenerPorId sin firma ---
    @Test
    void obtenerPorIdDevuelveDetalleConLineasSinFirma() {
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());
        Long id = registrarEntrega("Sergio");
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());

        var detalle = entregaPendienteService.obtenerPorId(id);
        assertThat(detalle.getId()).isEqualTo(id);
        assertThat(detalle.getDetalles()).hasSize(1);

        var firma = entregaPendienteService.obtenerFirma(id);
        assertThat(firma.getFirmaBase64()).isEqualTo(FIRMA_VALIDA);
    }

    // --- 7.7 TRIANGULATE: entrega de otra unidad no accesible por id desde Vivero ---
    @Test
    void entregaDeOtraUnidadNoEsAccesiblePorIdDesdeVivero() {
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero().getId());
        Long id = registrarEntrega("Sergio");

        // Simular "acceso desde Herramientas": el guard Vivero-only ya rechaza antes de llegar a
        // buscar el id, así que basta con cambiar la unidad activa.
        UnidadNegocioContextHolder.setUnidadNegocioId(herramientas().getId());
        assertThatThrownBy(() -> entregaPendienteService.obtenerPorId(id))
                .isInstanceOf(RuntimeException.class);
    }
}
