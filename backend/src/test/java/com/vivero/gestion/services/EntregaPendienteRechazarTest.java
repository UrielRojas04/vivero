package com.vivero.gestion.services;

import com.vivero.gestion.dto.EntregaPendienteConfirmarLineaDTO;
import com.vivero.gestion.dto.EntregaPendienteConfirmarRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteDetalleRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteResponseDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.EstadoEntregaPendiente;
import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteDineroRepository;
import com.vivero.gestion.repositories.EntregaPendienteRepository;
import com.vivero.gestion.repositories.FacturaClienteRepository;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
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
 * Grupo 10 de tasks.md de entregas-pendientes-confirmacion-vivero (Decisión 2 de design.md):
 * rechazar una entrega PENDIENTE repone el stock con un MovimientoStock REVERSA_ENTREGA_PENDIENTE
 * y NO crea ninguna Venta. Base real (Postgres localhost:5433), sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class EntregaPendienteRechazarTest {

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
    private MovimientoStockRepository movimientoStockRepository;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private FacturaClienteRepository facturaClienteRepository;

    @Autowired
    private CuentaCorrienteDineroRepository ccdRepository;

    private final List<Long> entregasCreadas = new ArrayList<>();
    private final List<Long> ventasCreadas = new ArrayList<>();
    private final List<Long> productosCreados = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        ventasCreadas.forEach(ventaRepository::deleteById);
        ventasCreadas.clear();
        entregasCreadas.forEach(entregaPendienteRepository::deleteById);
        entregasCreadas.clear();
        productosCreados.forEach(productoRepository::deleteById);
        productosCreados.clear();
        for (Long clienteId : clientesCreados) {
            ccdRepository.findByClienteId(clienteId).ifPresent(ccd -> ccdRepository.deleteById(ccd.getId()));
            clienteRepository.deleteById(clienteId);
        }
        clientesCreados.clear();
        UnidadNegocioContextHolder.clear();
    }

    private UnidadNegocio vivero() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
    }

    private Producto crearProducto(UnidadNegocio unidad, int stock) {
        Producto p = new Producto("Producto Rechazar " + UUID.randomUUID(), "Test",
                new BigDecimal("100.00"), new BigDecimal("40.00"), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved;
    }

    private Cliente crearCliente() {
        Cliente c = new Cliente();
        c.setNombreRazonSocial("Cliente Rechazar " + UUID.randomUUID());
        c.setTelefono("1122334455");
        Cliente saved = clienteRepository.save(c);
        clientesCreados.add(saved.getId());
        return saved;
    }

    private static final String FIRMA_VALIDA = "data:image/png;base64," + "A".repeat(1000);

    private EntregaPendienteResponseDTO registrarEntrega(Cliente cliente, Producto producto, int cantidad) {
        EntregaPendienteRequestDTO req = new EntregaPendienteRequestDTO();
        req.setClienteId(cliente.getId());
        req.setFirmaBase64(FIRMA_VALIDA);
        EntregaPendienteDetalleRequestDTO det = new EntregaPendienteDetalleRequestDTO();
        det.setProductoId(producto.getId());
        det.setCantidad(cantidad);
        req.setDetalles(List.of(det));
        EntregaPendienteResponseDTO resp = entregaPendienteService.registrar(req, "Sergio");
        entregasCreadas.add(resp.getId());
        return resp;
    }

    // --- 10.1 RED / 10.2 GREEN: rechazar repone el stock ---
    @Test
    void rechazarReponeElStock() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 10);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStock()).isEqualTo(30);

        EntregaPendienteResponseDTO rechazada = entregaPendienteService.rechazar(entrega.getId(), "El cliente no vino", "Pablo");

        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStock()).isEqualTo(40);
        assertThat(rechazada.getEstado()).isEqualTo(EstadoEntregaPendiente.RECHAZADA);
        assertThat(rechazada.getMotivoRechazo()).isEqualTo("El cliente no vino");
        assertThat(rechazada.getUsuarioResolucionNombre()).isEqualTo("Pablo");
        assertThat(rechazada.getFechaResolucion()).isNotNull();
    }

    // --- 10.3 TRIANGULATE: MovimientoStock REVERSA_ENTREGA_PENDIENTE por línea, cantidad y usuario correctos ---
    @Test
    void dejaUnMovimientoReversaPorLineaConCantidadYUsuarioCorrectos() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 7);
        long movimientosAntesDeRechazar = movimientoStockRepository.count();

        entregaPendienteService.rechazar(entrega.getId(), null, "Pablo");

        assertThat(movimientoStockRepository.count()).isEqualTo(movimientosAntesDeRechazar + 1);

        List<MovimientoStock> movimientosDelProducto = movimientoStockRepository.findAll().stream()
                .filter(m -> m.getProducto() != null && m.getProducto().getId().equals(producto.getId()))
                .filter(m -> m.getTipoMovimiento() == TipoMovimientoStock.REVERSA_ENTREGA_PENDIENTE)
                .toList();
        assertThat(movimientosDelProducto).hasSize(1);
        MovimientoStock reversa = movimientosDelProducto.get(0);
        assertThat(reversa.getCantidad()).isEqualTo(7);
        assertThat(reversa.getUsuario().getUsername()).isEqualTo("Pablo");
    }

    // --- 10.4 TRIANGULATE: no crea Venta, no toca cuenta corriente ni factura ---
    @Test
    void noCreaVentaNiTocaCuentaCorrienteNiFactura() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 5);
        long ventasAntes = ventaRepository.count();

        entregaPendienteService.rechazar(entrega.getId(), "motivo", "Pablo");

        assertThat(ventaRepository.count()).isEqualTo(ventasAntes);
        assertThat(facturaClienteRepository.findByClienteIdAndEstadoAndUnidadNegocioId(cliente.getId(), "ABIERTA", vivero.getId()))
                .isEmpty();
        assertThat(ccdRepository.findByClienteId(cliente.getId())).isEmpty();
    }

    // --- 10.5 TRIANGULATE: no se puede rechazar una entrega ya resuelta; el stock no cambia ---
    @Test
    void noSePuedeRechazarUnaEntregaYaResuelta() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        // Caso A: ya RECHAZADA.
        EntregaPendienteResponseDTO entregaRechazada = registrarEntrega(cliente, producto, 3);
        entregaPendienteService.rechazar(entregaRechazada.getId(), null, "Pablo");
        int stockTrasPrimerRechazo = productoRepository.findById(producto.getId()).orElseThrow().getStock();

        assertThatThrownBy(() -> entregaPendienteService.rechazar(entregaRechazada.getId(), null, "Pablo"))
                .isInstanceOf(IllegalStateException.class);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStock()).isEqualTo(stockTrasPrimerRechazo);

        // Caso B: ya CONFIRMADA.
        EntregaPendienteResponseDTO entregaConfirmada = registrarEntrega(cliente, producto, 4);
        Long detalleId = entregaConfirmada.getDetalles().get(0).getDetalleId();
        EntregaPendienteConfirmarRequestDTO confirmarReq = new EntregaPendienteConfirmarRequestDTO();
        EntregaPendienteConfirmarLineaDTO linea = new EntregaPendienteConfirmarLineaDTO();
        linea.setDetalleId(detalleId);
        linea.setPrecioUnitario(new BigDecimal("10.00"));
        confirmarReq.setLineas(new ArrayList<>(List.of(linea)));
        VentaResponseDTO venta = entregaPendienteService.confirmar(entregaConfirmada.getId(), confirmarReq, "Pablo");
        ventasCreadas.add(venta.getId());
        int stockTrasConfirmar = productoRepository.findById(producto.getId()).orElseThrow().getStock();

        assertThatThrownBy(() -> entregaPendienteService.rechazar(entregaConfirmada.getId(), null, "Pablo"))
                .isInstanceOf(IllegalStateException.class);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStock()).isEqualTo(stockTrasConfirmar);
    }
}
