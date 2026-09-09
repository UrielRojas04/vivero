package com.vivero.gestion.services;

import com.vivero.gestion.dto.EntregaPendienteConfirmarLineaDTO;
import com.vivero.gestion.dto.EntregaPendienteConfirmarRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteDetalleRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteResponseDTO;
import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.EntregaPendienteDetalle;
import com.vivero.gestion.models.EstadoEntregaPendiente;
import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.dto.DashboardResumenDTO;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Grupo 9 de tasks.md de entregas-pendientes-confirmacion-vivero (D3, D4, D11 de design.md):
 * confirmar una EntregaPendiente crea la Venta real reutilizando el MovimientoStock ya congelado
 * de cada línea, sin volver a tocar stock. Base real (Postgres localhost:5433), sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class EntregaPendienteConfirmarTest {

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
    private VentaService ventaService;

    @Autowired
    private FacturaClienteRepository facturaClienteRepository;

    @Autowired
    private CuentaCorrienteDineroRepository ccdRepository;

    @Autowired
    private FinanzasService finanzasService;

    private final List<Long> entregasCreadas = new ArrayList<>();
    private final List<Long> ventasCreadas = new ArrayList<>();
    private final List<Long> productosCreados = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        // Venta y EntregaPendiente usan soft delete (@SQLDelete = UPDATE ... deleted = true): el
        // orden de borrado no importa para esas FK, la fila física sigue existiendo. Cliente
        // también es soft delete, PERO tiene un @OneToOne mappedBy con cascade PERSIST/MERGE hacia
        // CuentaCorrienteDinero: si confirmar() creó una CCD para este cliente (pago parcial,
        // tests 9.10/9.11), hay que borrarla ANTES que al cliente o Hibernate tira
        // TransientObjectException al flushear -- mismo patrón que
        // FacturaClienteSaldoBandejasTest.limpiar(). FacturaCliente NO se borra acá a propósito:
        // no tiene soft delete y ventas (soft-deleted, fila física intacta) la sigue referenciando
        // por FK -- se deja como dato de test huérfano, igual que los MovimientoStock.
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
        Producto p = new Producto("Producto Confirmar " + UUID.randomUUID(), "Test",
                new BigDecimal("100.00"), new BigDecimal("40.00"), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved;
    }

    private Cliente crearCliente() {
        Cliente c = new Cliente();
        c.setNombreRazonSocial("Cliente Confirmar " + UUID.randomUUID());
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

    private EntregaPendienteConfirmarRequestDTO confirmarRequest(Long detalleId, BigDecimal precio, BigDecimal totalAPagar) {
        EntregaPendienteConfirmarRequestDTO req = new EntregaPendienteConfirmarRequestDTO();
        EntregaPendienteConfirmarLineaDTO linea = new EntregaPendienteConfirmarLineaDTO();
        linea.setDetalleId(detalleId);
        linea.setPrecioUnitario(precio);
        req.setLineas(new ArrayList<>(List.of(linea)));
        if (totalAPagar != null) {
            PagoRequestDTO pago = new PagoRequestDTO();
            pago.setMonto(totalAPagar);
            pago.setMetodoPago("EFECTIVO");
            req.setPagos(new ArrayList<>(List.of(pago)));
        }
        return req;
    }

    // --- 9.1 RED / 9.2 GREEN / 9.3 / 9.8 TRIANGULATE ---
    @Test
    void confirmarCreaLaVentaSinVolverATocarStockYQuedaConfirmada() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 10);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStock()).isEqualTo(30);
        long movimientosTrasEntrega = movimientoStockRepository.count();

        Long detalleId = entrega.getDetalles().get(0).getDetalleId();
        VentaResponseDTO ventaResponse = entregaPendienteService.confirmar(
                entrega.getId(), confirmarRequest(detalleId, new BigDecimal("150.00"), new BigDecimal("1500.00")), "Pablo");
        ventasCreadas.add(ventaResponse.getId());

        assertThat(ventaResponse.getDetalles()).hasSize(1);
        assertThat(ventaResponse.getDetalles().get(0).getSubtotal()).isEqualByComparingTo("1500.00");
        assertThat(ventaResponse.getSubtotal()).isEqualByComparingTo("1500.00");

        Producto productoDespues = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(productoDespues.getStock()).isEqualTo(30); // sin cambios

        assertThat(movimientoStockRepository.count()).isEqualTo(movimientosTrasEntrega); // ningún movimiento nuevo

        EntregaPendienteResponseDTO entregaDespues = entregaPendienteService.obtenerPorId(entrega.getId());
        assertThat(entregaDespues.getEstado()).isEqualTo(EstadoEntregaPendiente.CONFIRMADA);
        assertThat(entregaDespues.getVentaId()).isEqualTo(ventaResponse.getId());
        assertThat(entregaDespues.getUsuarioResolucionNombre()).isEqualTo("Pablo");
        assertThat(entregaDespues.getFechaResolucion()).isNotNull();
    }

    // --- 9.4 TRIANGULATE: costo histórico es el del momento de la entrega, no el del catálogo actual ---
    @Test
    void costoHistoricoEsElCongeladoAlMomentoDeLaEntregaNoElDelCatalogoActual() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 5);

        var detallePersistido = entregaPendienteRepository.findByIdWithDetalles(entrega.getId()).orElseThrow()
                .getDetalles().get(0);
        MovimientoStock movimientoDeLaEntrega = detallePersistido.getMovimientoStock();
        BigDecimal costoCongelado = movimientoDeLaEntrega.getCostoUnitario();

        // El catálogo cambia DESPUÉS de que la mercadería salió.
        Producto productoActualizado = productoRepository.findById(producto.getId()).orElseThrow();
        productoActualizado.setCostoProducto(new BigDecimal("999.00"));
        productoRepository.save(productoActualizado);

        Long detalleId = entrega.getDetalles().get(0).getDetalleId();
        VentaResponseDTO ventaResponse = entregaPendienteService.confirmar(
                entrega.getId(), confirmarRequest(detalleId, new BigDecimal("150.00"), new BigDecimal("750.00")), "Pablo");
        ventasCreadas.add(ventaResponse.getId());

        assertThat(ventaResponse.getDetalles().get(0).getCostoUnitarioHistorico()).isEqualByComparingTo(costoCongelado);
    }

    // --- 9.5 TRIANGULATE: precio distinto del de lista, precio de lista del producto intacto ---
    @Test
    void precioAsignadoEsElQueSeCobraYElPrecioDeListaQuedaIntacto() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();
        BigDecimal precioListaOriginal = producto.getPrecio();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 4);
        Long detalleId = entrega.getDetalles().get(0).getDetalleId();
        BigDecimal precioAsignado = new BigDecimal("55.00");

        VentaResponseDTO ventaResponse = entregaPendienteService.confirmar(
                entrega.getId(), confirmarRequest(detalleId, precioAsignado, new BigDecimal("220.00")), "Pablo");
        ventasCreadas.add(ventaResponse.getId());

        assertThat(ventaResponse.getDetalles().get(0).getPrecioUnitarioHistorico()).isEqualByComparingTo(precioAsignado);
        assertThat(ventaResponse.getDetalles().get(0).getSubtotal()).isEqualByComparingTo("220.00");

        Producto productoDespues = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(productoDespues.getPrecio()).isEqualByComparingTo(precioListaOriginal);
    }

    // --- 9.6 TRIANGULATE: precio faltante, sobrante (detalleId ajeno) o negativo rechazan ---
    @Test
    void precioFaltanteSobranteONegativoRechazaSinCrearVentaYEntregaSiguePendiente() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();
        long ventasAntes = ventaRepository.count();

        // Precio faltante: lineas vacías.
        EntregaPendienteResponseDTO entrega1 = registrarEntrega(cliente, producto, 3);
        EntregaPendienteConfirmarRequestDTO sinLineas = new EntregaPendienteConfirmarRequestDTO();
        sinLineas.setLineas(new ArrayList<>());
        assertThatThrownBy(() -> entregaPendienteService.confirmar(entrega1.getId(), sinLineas, "Pablo"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(entregaPendienteService.obtenerPorId(entrega1.getId()).getEstado()).isEqualTo(EstadoEntregaPendiente.PENDIENTE);

        // Precio para un detalleId que no pertenece a la entrega.
        EntregaPendienteResponseDTO entrega2 = registrarEntrega(cliente, producto, 3);
        assertThatThrownBy(() -> entregaPendienteService.confirmar(
                entrega2.getId(), confirmarRequest(999999999L, new BigDecimal("10.00"), null), "Pablo"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(entregaPendienteService.obtenerPorId(entrega2.getId()).getEstado()).isEqualTo(EstadoEntregaPendiente.PENDIENTE);

        // Precio negativo.
        EntregaPendienteResponseDTO entrega3 = registrarEntrega(cliente, producto, 3);
        Long detalleId3 = entrega3.getDetalles().get(0).getDetalleId();
        assertThatThrownBy(() -> entregaPendienteService.confirmar(
                entrega3.getId(), confirmarRequest(detalleId3, new BigDecimal("-5.00"), null), "Pablo"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(entregaPendienteService.obtenerPorId(entrega3.getId()).getEstado()).isEqualTo(EstadoEntregaPendiente.PENDIENTE);

        assertThat(ventaRepository.count()).isEqualTo(ventasAntes);
    }

    // --- 9.7 TRIANGULATE: precio 0 es válido (línea bonificada) ---
    @Test
    void precioCeroEsValido() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 3);
        Long detalleId = entrega.getDetalles().get(0).getDetalleId();

        VentaResponseDTO ventaResponse = entregaPendienteService.confirmar(
                entrega.getId(), confirmarRequest(detalleId, BigDecimal.ZERO, BigDecimal.ZERO), "Pablo");
        ventasCreadas.add(ventaResponse.getId());

        assertThat(ventaResponse.getDetalles().get(0).getPrecioUnitarioHistorico()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(ventaResponse.getDetalles().get(0).getSubtotal()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // --- 9.8: Venta.usuario y Venta.fecha son los de la confirmación, no los de la entrega ---
    @Test
    void laVentaLlevaElUsuarioYLaFechaDeLaConfirmacionNoLosDeLaEntrega() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 2); // registrada por "Sergio"
        LocalDateTime antesDeConfirmar = LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")).minusSeconds(2);

        Long detalleId = entrega.getDetalles().get(0).getDetalleId();
        VentaResponseDTO ventaResponse = entregaPendienteService.confirmar(
                entrega.getId(), confirmarRequest(detalleId, new BigDecimal("10.00"), new BigDecimal("20.00")), "Pablo");
        ventasCreadas.add(ventaResponse.getId());

        Venta ventaPersistida = ventaRepository.findById(ventaResponse.getId()).orElseThrow();
        assertThat(ventaPersistida.getUsuario().getUsername()).isEqualTo("Pablo");
        assertThat(ventaPersistida.getFecha()).isAfterOrEqualTo(antesDeConfirmar);
    }

    // --- 9.9 TRIANGULATE: no se puede confirmar dos veces ---
    @Test
    void noSePuedeConfirmarUnaEntregaYaResuelta() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 2);
        Long detalleId = entrega.getDetalles().get(0).getDetalleId();

        VentaResponseDTO primeraVenta = entregaPendienteService.confirmar(
                entrega.getId(), confirmarRequest(detalleId, new BigDecimal("10.00"), new BigDecimal("20.00")), "Pablo");
        ventasCreadas.add(primeraVenta.getId());
        long ventasTrasPrimeraConfirmacion = ventaRepository.count();

        assertThatThrownBy(() -> entregaPendienteService.confirmar(
                entrega.getId(), confirmarRequest(detalleId, new BigDecimal("10.00"), new BigDecimal("20.00")), "Pablo"))
                .isInstanceOf(IllegalStateException.class);

        assertThat(ventaRepository.count()).isEqualTo(ventasTrasPrimeraConfirmacion);
    }

    // --- 9.10 TRIANGULATE: pago parcial se asocia a la FacturaCliente abierta y la cuenta corriente refleja la diferencia ---
    @Test
    void pagoParcialSeAsociaALaFacturaAbiertaYLaCuentaCorrienteReflejaLaDiferencia() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 10);
        Long detalleId = entrega.getDetalles().get(0).getDetalleId();

        // Total 1000.00, paga sólo 400.00 -> debe 600.00.
        VentaResponseDTO ventaResponse = entregaPendienteService.confirmar(
                entrega.getId(), confirmarRequest(detalleId, new BigDecimal("100.00"), new BigDecimal("400.00")), "Pablo");
        ventasCreadas.add(ventaResponse.getId());

        assertThat(ventaResponse.getEstadoPago()).isEqualTo("PARCIAL");

        var facturaAbierta = facturaClienteRepository
                .findByClienteIdAndEstadoAndUnidadNegocioId(cliente.getId(), "ABIERTA", vivero.getId());
        assertThat(facturaAbierta).isPresent();
        Venta ventaPersistida = ventaRepository.findById(ventaResponse.getId()).orElseThrow();
        assertThat(ventaPersistida.getFactura()).isNotNull();
        assertThat(ventaPersistida.getFactura().getId()).isEqualTo(facturaAbierta.get().getId());

        var ccd = ccdRepository.findByClienteId(cliente.getId());
        assertThat(ccd).isPresent();
        assertThat(ccd.get().getBalancePesos()).isEqualByComparingTo("-600.00");
    }

    // --- 9.11 TRIANGULATE: antes de confirmar nada impacta; después, todo impacta ---
    @Test
    void antesDeConfirmarNadaImpactaYDespuesTodoImpacta() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        LocalDateTime desde = LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")).minusMinutes(2);
        LocalDateTime hasta = LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")).plusMinutes(2);
        DashboardResumenDTO finanzasAntes = finanzasService.resumen(desde, hasta, null);

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 10);

        // Antes de confirmar: nada en historial de ventas del cliente, ni factura, ni CC, ni Finanzas.
        assertThat(ventaService.listarVentasPorCliente(cliente.getId())).isEmpty();
        assertThat(facturaClienteRepository.findByClienteIdAndEstadoAndUnidadNegocioId(cliente.getId(), "ABIERTA", vivero.getId()))
                .isEmpty();
        assertThat(ccdRepository.findByClienteId(cliente.getId())).isEmpty();
        DashboardResumenDTO finanzasDuranteEntregaPendiente = finanzasService.resumen(desde, hasta, null);
        assertThat(finanzasDuranteEntregaPendiente.getTotalVentas()).isEqualByComparingTo(finanzasAntes.getTotalVentas());

        Long detalleId = entrega.getDetalles().get(0).getDetalleId();
        VentaResponseDTO ventaResponse = entregaPendienteService.confirmar(
                entrega.getId(), confirmarRequest(detalleId, new BigDecimal("120.00"), new BigDecimal("500.00")), "Pablo");
        ventasCreadas.add(ventaResponse.getId());

        // Después de confirmar: los cuatro reflejan la venta.
        assertThat(ventaService.listarVentasPorCliente(cliente.getId()))
                .anyMatch(v -> v.getId().equals(ventaResponse.getId()));
        assertThat(facturaClienteRepository.findByClienteIdAndEstadoAndUnidadNegocioId(cliente.getId(), "ABIERTA", vivero.getId()))
                .isPresent();
        assertThat(ccdRepository.findByClienteId(cliente.getId())).isPresent();
        DashboardResumenDTO finanzasDespues = finanzasService.resumen(desde, hasta, null);
        assertThat(finanzasDespues.getTotalVentas().subtract(finanzasAntes.getTotalVentas())).isEqualByComparingTo("1200.00");
    }

    // --- 9.12 TRIANGULATE: si la creación de la venta falla, revierte y la entrega sigue PENDIENTE sin venta ---
    @Test
    void siLaCreacionDeLaVentaFallaLaEntregaSigueigualPendienteSinVenta() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        Producto producto = crearProducto(vivero, 40);
        Cliente cliente = crearCliente();

        EntregaPendienteResponseDTO entrega = registrarEntrega(cliente, producto, 5);
        Long detalleId = entrega.getDetalles().get(0).getDetalleId();
        long ventasAntes = ventaRepository.count();

        // Precio negativo hace fallar crearVentaConStockYaDescontado a mitad de camino.
        assertThatThrownBy(() -> entregaPendienteService.confirmar(
                entrega.getId(), confirmarRequest(detalleId, new BigDecimal("-1.00"), null), "Pablo"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(ventaRepository.count()).isEqualTo(ventasAntes);
        EntregaPendienteResponseDTO entregaDespues = entregaPendienteService.obtenerPorId(entrega.getId());
        assertThat(entregaDespues.getEstado()).isEqualTo(EstadoEntregaPendiente.PENDIENTE);
        assertThat(entregaDespues.getVentaId()).isNull();
    }
}
