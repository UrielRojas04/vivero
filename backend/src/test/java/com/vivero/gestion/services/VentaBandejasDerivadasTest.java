package com.vivero.gestion.services;

import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.dto.VentaDetalleRequestDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaCorrienteBandejas;
import com.vivero.gestion.models.HistorialBandejas;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteBandejasRepository;
import com.vivero.gestion.repositories.HistorialBandejasRepository;
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

/**
 * Bug real reportado por el dueño (2026-09-11, confirmado en desarrollo Y en producción): una
 * venta con detalles reales (ej. 12 unidades) no dejaba ningún registro ENTREGA en
 * historial_bandejas, porque VentaServiceImpl confiaba en request.getBandejasEntregadas() -- un
 * campo separado, autocalculado en el frontend (NuevaVenta.jsx) y sin ningún input que lo muestre
 * o edite -- que podía llegar en 0/null aunque la venta tuviera líneas reales. El fix deriva la
 * cantidad de bandejas directo de venta.getDetalles() (misma cantidad que el producto vendido),
 * eliminando la dependencia del campo separado. Base real (Postgres localhost:5433), sin mocks.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class VentaBandejasDerivadasTest {

    @Autowired
    private VentaService ventaService;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private HistorialBandejasRepository historialBandejasRepository;

    @Autowired
    private CuentaCorrienteBandejasRepository ccbRepository;

    private final List<Long> ventasCreadas = new ArrayList<>();
    private final List<Long> productosCreados = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();
    private final List<Long> historialCreados = new ArrayList<>();
    private Long ccbId;

    @AfterEach
    void limpiar() {
        for (Long clienteId : clientesCreados) {
            historialBandejasRepository.findByClienteIdOrderByFechaDesc(clienteId).forEach(h -> {
                if (!historialCreados.contains(h.getId())) historialCreados.add(h.getId());
            });
        }
        historialCreados.forEach(historialBandejasRepository::deleteById);
        historialCreados.clear();
        ventasCreadas.forEach(ventaRepository::deleteById);
        ventasCreadas.clear();
        if (ccbId != null) ccbRepository.deleteById(ccbId);
        ccbId = null;
        productosCreados.forEach(productoRepository::deleteById);
        productosCreados.clear();
        clientesCreados.forEach(clienteRepository::deleteById);
        clientesCreados.clear();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        UnidadNegocioContextHolder.clear();
    }

    private UnidadNegocio vivero() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
    }

    private Cliente crearCliente(UnidadNegocio unidad) {
        Cliente c = new Cliente();
        c.setNombreRazonSocial("Cliente Bandejas Venta Test " + UUID.randomUUID());
        c.setUnidadNegocio(unidad);
        Cliente saved = clienteRepository.save(c);
        clientesCreados.add(saved.getId());
        return saved;
    }

    private Producto crearProducto(UnidadNegocio unidad, int stock) {
        Producto p = new Producto("Producto Bandejas Venta Test " + UUID.randomUUID(), "Test",
                new BigDecimal("100.00"), new BigDecimal("40.00"), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved;
    }

    private VentaDetalleRequestDTO detalle(Long productoId, int cantidad, BigDecimal precioUnitario) {
        VentaDetalleRequestDTO det = new VentaDetalleRequestDTO();
        det.setProductoId(productoId);
        det.setCantidad(cantidad);
        det.setPrecioUnitario(precioUnitario);
        return det;
    }

    private VentaRequestDTO requestConDetalles(Long clienteId, List<VentaDetalleRequestDTO> detalles, BigDecimal totalAPagar) {
        VentaRequestDTO req = new VentaRequestDTO();
        req.setClienteId(clienteId);
        req.setDetalles(detalles);
        PagoRequestDTO pago = new PagoRequestDTO();
        pago.setMonto(totalAPagar);
        pago.setMetodoPago("EFECTIVO");
        req.setPagos(List.of(pago));
        return req;
    }

    // --- RED/GREEN: la venta con detalles reales registra la entrega derivada del total vendido ---
    @Test
    void ventaConDetallesRealesRegistraEntregaDeBandejasDerivadaDeLaCantidadVendida() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 30);

        CuentaCorrienteBandejas ccb = new CuentaCorrienteBandejas();
        ccb.setCliente(cliente);
        ccb.setBalanceBandejas(0);
        ccb = ccbRepository.save(ccb);
        ccbId = ccb.getId();

        VentaDetalleRequestDTO det = detalle(producto.getId(), 12, new BigDecimal("100.00"));
        VentaRequestDTO req = requestConDetalles(cliente.getId(), List.of(det), new BigDecimal("1200.00"));

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        List<HistorialBandejas> entregas = historialBandejasRepository.findByClienteIdOrderByFechaDesc(cliente.getId())
                .stream().filter(h -> "ENTREGA".equals(h.getTipo())).toList();
        entregas.forEach(h -> historialCreados.add(h.getId()));

        assertThat(entregas).hasSize(1);
        assertThat(entregas.get(0).getCantidad()).isEqualTo(12);
        assertThat(entregas.get(0).getVenta().getId()).isEqualTo(response.getId());

        CuentaCorrienteBandejas ccbDespues = ccbRepository.findByClienteId(cliente.getId()).orElseThrow();
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(12);
    }

    // --- TRIANGULATE: dos líneas de productos distintos suman ambas cantidades ---
    @Test
    void ventaConVariasLineasSumaTodasLasCantidadesParaLaEntrega() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Cliente cliente = crearCliente(vivero);
        Producto productoA = crearProducto(vivero, 30);
        Producto productoB = crearProducto(vivero, 30);

        CuentaCorrienteBandejas ccb = new CuentaCorrienteBandejas();
        ccb.setCliente(cliente);
        ccb.setBalanceBandejas(0);
        ccb = ccbRepository.save(ccb);
        ccbId = ccb.getId();

        VentaDetalleRequestDTO detA = detalle(productoA.getId(), 5, new BigDecimal("100.00"));
        VentaDetalleRequestDTO detB = detalle(productoB.getId(), 7, new BigDecimal("100.00"));
        VentaRequestDTO req = requestConDetalles(cliente.getId(), List.of(detA, detB), new BigDecimal("1200.00"));

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        List<HistorialBandejas> entregas = historialBandejasRepository.findByClienteIdOrderByFechaDesc(cliente.getId())
                .stream().filter(h -> "ENTREGA".equals(h.getTipo())).toList();
        entregas.forEach(h -> historialCreados.add(h.getId()));

        assertThat(entregas).hasSize(1);
        assertThat(entregas.get(0).getCantidad()).isEqualTo(12); // 5 + 7
    }

    // --- TRIANGULATE: cliente real SIN CuentaCorrienteBandejas previa (primera compra) crea la
    // cuenta en vez de fallar la venta entera ---
    @Test
    void ventaDeClienteSinCuentaCorrienteBandejasPreviaCreaLaCuentaYRegistraLaEntrega() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Cliente cliente = crearCliente(vivero); // sin CuentaCorrienteBandejas previa
        Producto producto = crearProducto(vivero, 30);

        VentaDetalleRequestDTO det = detalle(producto.getId(), 8, new BigDecimal("100.00"));
        VentaRequestDTO req = requestConDetalles(cliente.getId(), List.of(det), new BigDecimal("800.00"));

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        CuentaCorrienteBandejas ccbDespues = ccbRepository.findByClienteId(cliente.getId()).orElseThrow();
        ccbId = ccbDespues.getId();
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(8);

        List<HistorialBandejas> entregas = historialBandejasRepository.findByClienteIdOrderByFechaDesc(cliente.getId())
                .stream().filter(h -> "ENTREGA".equals(h.getTipo())).toList();
        entregas.forEach(h -> historialCreados.add(h.getId()));
        assertThat(entregas).hasSize(1);
    }

    // --- TRIANGULATE: cliente casual (sin Cliente real) no intenta registrar entrega ---
    @Test
    void clienteCasualNoRegistraEntregaDeBandejas() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 30);

        com.vivero.gestion.dto.ClienteAdHocDTO adHoc = new com.vivero.gestion.dto.ClienteAdHocDTO();
        adHoc.setNombre("Casual Bandejas Test " + UUID.randomUUID());
        adHoc.setCasual(true);

        VentaRequestDTO req = new VentaRequestDTO();
        req.setClienteAdHoc(adHoc);
        req.setDetalles(List.of(detalle(producto.getId(), 6, new BigDecimal("100.00"))));
        PagoRequestDTO pago = new PagoRequestDTO();
        pago.setMonto(new BigDecimal("600.00"));
        pago.setMetodoPago("EFECTIVO");
        req.setPagos(List.of(pago));

        long historialAntes = historialBandejasRepository.count();

        VentaResponseDTO response = ventaService.crearVenta(req, "Sergio");
        ventasCreadas.add(response.getId());

        assertThat(historialBandejasRepository.count()).isEqualTo(historialAntes);
    }
}
