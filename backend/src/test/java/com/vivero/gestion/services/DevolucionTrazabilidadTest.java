package com.vivero.gestion.services;

import com.vivero.gestion.dto.DevolucionProductoDTO;
import com.vivero.gestion.dto.FacturaClienteDTO;
import com.vivero.gestion.dto.PagoResponseDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.CuentaCorrienteBandejas;
import com.vivero.gestion.models.CuentaCorrienteDinero;
import com.vivero.gestion.models.FacturaCliente;
import com.vivero.gestion.models.HistorialBandejas;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteBandejasRepository;
import com.vivero.gestion.repositories.CuentaCorrienteDineroRepository;
import com.vivero.gestion.repositories.FacturaClienteRepository;
import com.vivero.gestion.repositories.HistorialBandejasRepository;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Change trazabilidad-devolucion-producto, grupo 3 de tasks.md: `DevolucionServiceImpl.
 * registrarDevolucionLlenas` acredita saldos (CuentaCorrienteDinero.balancePesos,
 * CuentaCorrienteBandejas.balanceBandejas) sin dejar ningún rastro itemizado -- ni un `Pago` en
 * la factura del cliente, ni un movimiento en `historial_bandejas`. Estos tests describen el
 * rastro que hoy no existe. Base real (Postgres localhost:5433), sin mocks de DB, mismo patrón
 * que FacturaClienteSaldoBandejasTest y EntregaPendienteRegistrarTest.
 *
 * Gobernanza CRITICA (design.md): la premisa del change es que los balances NO cambian de valor
 * -- sólo se agregan registros. El test de invariancia (balanceInvarianteDinero_...) describe el
 * comportamiento actual que no debe romperse y debe pasar TANTO ANTES COMO DESPUES del change.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class DevolucionTrazabilidadTest {

    @Autowired
    private DevolucionService devolucionService;

    @Autowired
    private BandejasService bandejasService;

    @Autowired
    private FacturaClienteService facturaClienteService;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private FacturaClienteRepository facturaClienteRepository;

    @Autowired
    private PagoRepository pagoRepository;

    @Autowired
    private HistorialBandejasRepository historialBandejasRepository;

    @Autowired
    private CuentaCorrienteDineroRepository ccdRepository;

    @Autowired
    private CuentaCorrienteBandejasRepository ccbRepository;

    private final List<Long> pagosCreados = new ArrayList<>();
    private final List<Long> historialCreados = new ArrayList<>();
    private final List<Long> facturasCreadas = new ArrayList<>();
    private final List<Long> productosCreados = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();
    private Long ccbId;
    private Long ccdId;

    @AfterEach
    void limpiar() {
        // Auto-recolección defensiva ANTES de borrar nada: varios tests disparan la creación de
        // un Pago y/o un HistorialBandejas como efecto colateral de `registrarDevolucionLlenas`
        // sin que el test en cuestión los necesite para su aserción (ej. 3.1 sólo verifica el
        // Pago pero la misma llamada, con cantidad > 0, también crea un HistorialBandejas). Sin
        // esto, esas filas quedaban sin trackear y se filtraban entre corridas -- se detectó
        // comparando el conteo real contra la línea de base de la tarea 1.2 (gate 6.7). Recorre
        // TODOS los clientes de este test, no sólo los que el método individual haya trackeado,
        // así que cubre cualquier test presente o futuro que olvide trackear manualmente.
        for (Long clienteId : clientesCreados) {
            historialBandejasRepository.findByClienteIdOrderByFechaDesc(clienteId).forEach(h -> {
                if (!historialCreados.contains(h.getId())) historialCreados.add(h.getId());
            });
            FacturaClienteDTO facturaActiva = facturaClienteService.obtenerFacturaActiva(clienteId);
            if (facturaActiva != null && facturaActiva.getPagos() != null) {
                facturaActiva.getPagos().forEach(p -> {
                    if (!pagosCreados.contains(p.getId())) pagosCreados.add(p.getId());
                });
            }
        }

        pagosCreados.forEach(pagoRepository::deleteById);
        pagosCreados.clear();
        historialCreados.forEach(historialBandejasRepository::deleteById);
        historialCreados.clear();
        facturasCreadas.forEach(facturaClienteRepository::deleteById);
        facturasCreadas.clear();
        if (ccdId != null) ccdRepository.deleteById(ccdId);
        ccdId = null;
        if (ccbId != null) ccbRepository.deleteById(ccbId);
        ccbId = null;
        productosCreados.forEach(productoRepository::deleteById);
        productosCreados.clear();
        clientesCreados.forEach(clienteRepository::deleteById);
        clientesCreados.clear();
        SecurityContextHolder.clearContext();
        UnidadNegocioContextHolder.clear();
    }

    private UnidadNegocio vivero() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
    }

    private void autenticarComoSergio() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null,
                        List.of(new SimpleGrantedAuthority("ESCRIBIR_CLIENTES"),
                                new SimpleGrantedAuthority("ESCRIBIR_BANDEJAS"))));
    }

    private Cliente crearCliente(UnidadNegocio unidad) {
        Cliente c = new Cliente();
        c.setNombreRazonSocial("Cliente Devolucion Test " + UUID.randomUUID());
        c.setUnidadNegocio(unidad);
        Cliente saved = clienteRepository.save(c);
        clientesCreados.add(saved.getId());
        return saved;
    }

    private Producto crearProducto(UnidadNegocio unidad, int stock) {
        Producto p = new Producto("Producto Devolucion Test " + UUID.randomUUID(), "Test",
                new BigDecimal("100.00"), new BigDecimal("40.00"), stock, null, null);
        p.setUnidadNegocio(unidad);
        Producto saved = productoRepository.save(p);
        productosCreados.add(saved.getId());
        return saved;
    }

    private FacturaCliente crearFacturaAbierta(Cliente cliente, UnidadNegocio unidad) {
        FacturaCliente f = new FacturaCliente();
        f.setCliente(cliente);
        f.setUnidadNegocio(unidad);
        f.setEstado("ABIERTA");
        f.setFechaApertura(LocalDateTime.now());
        FacturaCliente saved = facturaClienteRepository.save(f);
        facturasCreadas.add(saved.getId());
        return saved;
    }

    private void prepararCuentasCorrientes(Cliente cliente, int balanceBandejasInicial, BigDecimal balancePesosInicial) {
        CuentaCorrienteBandejas ccb = new CuentaCorrienteBandejas();
        ccb.setCliente(cliente);
        ccb.setBalanceBandejas(balanceBandejasInicial);
        ccb = ccbRepository.save(ccb);
        ccbId = ccb.getId();

        CuentaCorrienteDinero ccd = new CuentaCorrienteDinero();
        ccd.setCliente(cliente);
        ccd.setBalancePesos(balancePesosInicial);
        ccd = ccdRepository.save(ccd);
        ccdId = ccd.getId();
    }

    private DevolucionProductoDTO devolucion(Long clienteId, Long productoId, Integer cantidad, BigDecimal montoAcreditar) {
        DevolucionProductoDTO dto = new DevolucionProductoDTO();
        dto.setClienteId(clienteId);
        dto.setProductoId(productoId);
        dto.setCantidad(cantidad);
        dto.setMontoAcreditar(montoAcreditar);
        return dto;
    }

    /** Encuentra los pagos de la factura ABIERTA de un cliente vía el DTO ya mapeado por
     * FacturaClienteServiceImpl.mapearADTO, NO por `pagoRepository.findAll()`: la tabla `pagos`
     * real tiene filas preexistentes cuya `venta` fue soft-eliminada, y traer la entidad `Pago`
     * completa (con su `venta` @ManyToOne EAGER) para ESAS filas dispara el mismo bug de clase
     * documentado en PagoRepository.listarHistorialCobros (Hibernate 6, FetchNotFoundException /
     * AssertionError en EntityInitializerImpl) -- confirmado al correr este test la primera vez.
     * mapearADTO no tiene ese problema porque sólo lee `p.getVenta() != null ? p.getVenta().
     * getId() : null` sobre el proxy, sin inicializarlo, y la colección `factura.getPagos()` ya
     * viene acotada a nuestra factura de test. */
    private List<PagoResponseDTO> pagosDeFacturaActiva(Long clienteId) {
        FacturaClienteDTO dto = facturaClienteService.obtenerFacturaActiva(clienteId);
        return dto != null ? dto.getPagos() : List.of();
    }

    private List<HistorialBandejas> historialDeCliente(Long clienteId) {
        return historialBandejasRepository.findByClienteIdOrderByFechaDesc(clienteId);
    }

    // ------------------------------------------------------------------------------------
    // 3.1 RED -- dinero: la devolución con monto > 0 debe dejar un Pago ligado a la factura
    // ABIERTA del cliente, con metodoPago = "DEVOLUCION". Hoy NO se crea ningún Pago.
    // ------------------------------------------------------------------------------------
    @Test
    void devolucionConMontoCreaPagoTrazableEnFacturaAbierta() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        FacturaCliente factura = crearFacturaAbierta(cliente, vivero);
        prepararCuentasCorrientes(cliente, 0, BigDecimal.ZERO);

        devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 5, new BigDecimal("1500.00")));

        List<PagoResponseDTO> pagos = pagosDeFacturaActiva(cliente.getId());
        pagos.forEach(p -> pagosCreados.add(p.getId()));

        assertThat(pagos).hasSize(1);
        PagoResponseDTO pago = pagos.get(0);
        assertThat(pago.getMonto()).isEqualByComparingTo(new BigDecimal("1500.00"));
        assertThat(pago.getMetodoPago()).isEqualTo("DEVOLUCION");
        assertThat(pago.getFecha()).isNotNull();
    }

    // ------------------------------------------------------------------------------------
    // 3.2 RED -- bandejas: la devolución con cantidad > 0 debe dejar una fila DEVOLUCION en
    // historial_bandejas, con el usuario autenticado y sin venta asociada. Hoy no se crea nada.
    // ------------------------------------------------------------------------------------
    @Test
    void devolucionConCantidadCreaMovimientoEnHistorialBandejas() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();
        Usuario sergio = usuarioRepository.findByUsername("Sergio").orElseThrow();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        FacturaCliente factura = crearFacturaAbierta(cliente, vivero);
        prepararCuentasCorrientes(cliente, 10, BigDecimal.ZERO);

        devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 4, BigDecimal.ZERO));

        List<HistorialBandejas> historial = historialDeCliente(cliente.getId()).stream()
                .filter(h -> "DEVOLUCION".equals(h.getTipo()))
                .toList();
        historial.forEach(h -> historialCreados.add(h.getId()));

        assertThat(historial).hasSize(1);
        HistorialBandejas mov = historial.get(0);
        assertThat(mov.getCantidad()).isEqualTo(4);
        assertThat(mov.getUsuario().getId()).isEqualTo(sergio.getId());
        assertThat(mov.getVenta()).isNull();
    }

    // ------------------------------------------------------------------------------------
    // 3.3 RED -- apertura automática: cliente sin factura ABIERTA; la devolución no debe
    // fallar, debe abrir una factura ABIERTA nueva, y el Pago debe colgar de ella.
    // ------------------------------------------------------------------------------------
    @Test
    void devolucionSinFacturaAbiertaAbreUnaYLeAsociaElPago() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        prepararCuentasCorrientes(cliente, 0, BigDecimal.ZERO);

        assertThatCode(() -> devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 3, new BigDecimal("900.00"))))
                .doesNotThrowAnyException();

        FacturaCliente abierta = facturaClienteRepository
                .findByClienteIdAndEstadoAndUnidadNegocioId(cliente.getId(), "ABIERTA", vivero.getId())
                .orElseThrow(() -> new AssertionError("No se abrió ninguna factura ABIERTA"));
        facturasCreadas.add(abierta.getId());

        List<PagoResponseDTO> pagos = pagosDeFacturaActiva(cliente.getId());
        pagos.forEach(p -> pagosCreados.add(p.getId()));
        assertThat(pagos).hasSize(1);
        assertThat(pagos.get(0).getMonto()).isEqualByComparingTo(new BigDecimal("900.00"));
    }

    // ------------------------------------------------------------------------------------
    // 3.4 RED -- no-duplicación: cliente CON factura ABIERTA; tras la devolución sigue
    // habiendo una sola factura ABIERTA, y es la misma (mismo id).
    // ------------------------------------------------------------------------------------
    @Test
    void devolucionConFacturaAbiertaExistenteNoCreaOtra() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        FacturaCliente facturaExistente = crearFacturaAbierta(cliente, vivero);
        prepararCuentasCorrientes(cliente, 0, BigDecimal.ZERO);

        devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 2, new BigDecimal("400.00")));

        List<FacturaCliente> abiertas = facturaClienteRepository
                .findByClienteIdAndUnidadNegocioIdOrderByFechaAperturaDesc(cliente.getId(), vivero.getId())
                .stream().filter(f -> "ABIERTA".equals(f.getEstado())).toList();

        assertThat(abiertas).hasSize(1);
        assertThat(abiertas.get(0).getId()).isEqualTo(facturaExistente.getId());

        // Misma razón que 3.1: sin el fix no se crea ningún Pago, así que esta parte también
        // falla hoy -- la parte de "no duplica factura" sola ya sería cierta incluso sin el fix.
        List<PagoResponseDTO> pagos = pagosDeFacturaActiva(cliente.getId());
        pagos.forEach(p -> pagosCreados.add(p.getId()));
        assertThat(pagos).hasSize(1);
        assertThat(pagos.get(0).getMonto()).isEqualByComparingTo(new BigDecimal("400.00"));
    }

    // ------------------------------------------------------------------------------------
    // 3.5 -- invariancia de balances: PASA HOY (describe el comportamiento actual que NO debe
    // cambiar). balancePesos sube exactamente montoAcreditar, balanceBandejas baja exactamente
    // cantidad. Su rotura durante el apply es señal inequívoca de regresión.
    // ------------------------------------------------------------------------------------
    @Test
    void balanceInvarianteDineroYBandejas() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        FacturaCliente factura = crearFacturaAbierta(cliente, vivero);
        prepararCuentasCorrientes(cliente, 8, new BigDecimal("200.00"));

        BigDecimal montoAcreditar = new BigDecimal("650.00");
        Integer cantidad = 6;

        devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), cantidad, montoAcreditar));

        CuentaCorrienteDinero ccdDespues = ccdRepository.findByClienteId(cliente.getId()).orElseThrow();
        CuentaCorrienteBandejas ccbDespues = ccbRepository.findByClienteId(cliente.getId()).orElseThrow();

        assertThat(ccdDespues.getBalancePesos()).isEqualByComparingTo(new BigDecimal("850.00")); // 200 + 650
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(2); // 8 - 6

        pagosDeFacturaActiva(cliente.getId()).forEach(p -> pagosCreados.add(p.getId()));
        historialDeCliente(cliente.getId()).stream()
                .filter(h -> "DEVOLUCION".equals(h.getTipo()))
                .forEach(h -> historialCreados.add(h.getId()));
    }

    // ------------------------------------------------------------------------------------
    // 3.6 RED -- visibilidad end-to-end: tras la devolución, el FacturaClienteDTO debe traer
    // la línea de pago, totalPagos sube y saldoDeudor baja exactamente montoAcreditar, sin que
    // totalVentas ni totalConceptos se muevan.
    // ------------------------------------------------------------------------------------
    @Test
    void devolucionVisibleEnFacturaClienteDTO() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        FacturaCliente factura = crearFacturaAbierta(cliente, vivero);
        prepararCuentasCorrientes(cliente, 0, BigDecimal.ZERO);

        FacturaClienteDTO antes = facturaClienteService.obtenerFacturaActiva(cliente.getId());
        BigDecimal totalPagosAntes = antes.getTotalPagos();
        BigDecimal totalVentasAntes = antes.getTotalVentas();
        BigDecimal totalConceptosAntes = antes.getTotalConceptos();
        BigDecimal saldoDeudorAntes = antes.getSaldoDeudor();

        BigDecimal montoAcreditar = new BigDecimal("300.00");
        devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 3, montoAcreditar));

        FacturaClienteDTO despues = facturaClienteService.obtenerFacturaActiva(cliente.getId());

        assertThat(despues.getPagos()).anySatisfy(p -> {
            assertThat(p.getMetodoPago()).isEqualTo("DEVOLUCION");
            assertThat(p.getMonto()).isEqualByComparingTo(montoAcreditar);
        });
        assertThat(despues.getTotalPagos()).isEqualByComparingTo(totalPagosAntes.add(montoAcreditar));
        assertThat(despues.getSaldoDeudor()).isEqualByComparingTo(saldoDeudorAntes.subtract(montoAcreditar));
        assertThat(despues.getTotalVentas()).isEqualByComparingTo(totalVentasAntes);
        assertThat(despues.getTotalConceptos()).isEqualByComparingTo(totalConceptosAntes);

        pagosDeFacturaActiva(cliente.getId()).forEach(p -> pagosCreados.add(p.getId()));
    }

    // ========================================================================================
    // Grupo 6 -- TRIANGULATE: casos borde y no-regresión (design.md, tasks.md grupo 6)
    // ========================================================================================

    // 6.1a -- montoAcreditar nulo: no crea Pago, no abre factura por ese motivo, balancePesos
    // no se mueve.
    @Test
    void montoAcreditarNuloNoCreaPagoNiAbreFactura() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        prepararCuentasCorrientes(cliente, 4, new BigDecimal("50.00"));

        devolucionService.registrarDevolucionLlenas(devolucion(cliente.getId(), producto.getId(), 2, null));

        assertThat(facturaClienteRepository
                .findByClienteIdAndEstadoAndUnidadNegocioId(cliente.getId(), "ABIERTA", vivero.getId()))
                .isEmpty();
        CuentaCorrienteDinero ccdDespues = ccdRepository.findByClienteId(cliente.getId()).orElseThrow();
        assertThat(ccdDespues.getBalancePesos()).isEqualByComparingTo(new BigDecimal("50.00"));

        historialDeCliente(cliente.getId()).stream()
                .filter(h -> "DEVOLUCION".equals(h.getTipo()))
                .forEach(h -> historialCreados.add(h.getId()));
    }

    // 6.1b -- montoAcreditar en cero: mismo comportamiento que nulo.
    @Test
    void montoAcreditarCeroNoCreaPagoNiAbreFactura() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        prepararCuentasCorrientes(cliente, 4, new BigDecimal("50.00"));

        devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 2, BigDecimal.ZERO));

        assertThat(facturaClienteRepository
                .findByClienteIdAndEstadoAndUnidadNegocioId(cliente.getId(), "ABIERTA", vivero.getId()))
                .isEmpty();
        CuentaCorrienteDinero ccdDespues = ccdRepository.findByClienteId(cliente.getId()).orElseThrow();
        assertThat(ccdDespues.getBalancePesos()).isEqualByComparingTo(new BigDecimal("50.00"));

        historialDeCliente(cliente.getId()).stream()
                .filter(h -> "DEVOLUCION".equals(h.getTipo()))
                .forEach(h -> historialCreados.add(h.getId()));
    }

    // 6.2 -- sin unidad de negocio activa: la operación lanza, y NINGÚN saldo, producto ni
    // movimiento de stock queda escrito (Decisión 4 de design.md).
    @Test
    void sinUnidadDeNegocioActivaRechazaSinEscribirNada() {
        UnidadNegocio vivero = vivero();
        // No se setea UnidadNegocioContextHolder a propósito.
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        prepararCuentasCorrientes(cliente, 7, new BigDecimal("70.00"));

        assertThatThrownBy(() -> devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 3, new BigDecimal("300.00"))))
                .isInstanceOf(IllegalArgumentException.class);

        CuentaCorrienteBandejas ccbDespues = ccbRepository.findByClienteId(cliente.getId()).orElseThrow();
        CuentaCorrienteDinero ccdDespues = ccdRepository.findByClienteId(cliente.getId()).orElseThrow();
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(7);
        assertThat(ccdDespues.getBalancePesos()).isEqualByComparingTo(new BigDecimal("70.00"));
        assertThat(historialDeCliente(cliente.getId())).isEmpty();
        assertThat(productoRepository.findByNombreAndUnidadNegocioIdAndDeletedFalse(
                producto.getNombre() + " DEVUELTO", vivero.getId())).isEmpty();
    }

    // 6.3 -- dos devoluciones consecutivas del mismo cliente: dos Pago sobre la MISMA factura
    // ABIERTA, totalPagos acumula los dos, sigue habiendo una sola factura abierta.
    @Test
    void dosDevolucionesConsecutivasAcumulanPagosEnLaMismaFacturaAbierta() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto productoA = crearProducto(vivero, 20);
        Producto productoB = crearProducto(vivero, 20);
        FacturaCliente factura = crearFacturaAbierta(cliente, vivero);
        prepararCuentasCorrientes(cliente, 0, BigDecimal.ZERO);

        devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), productoA.getId(), 2, new BigDecimal("100.00")));
        devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), productoB.getId(), 3, new BigDecimal("200.00")));

        List<FacturaCliente> abiertas = facturaClienteRepository
                .findByClienteIdAndUnidadNegocioIdOrderByFechaAperturaDesc(cliente.getId(), vivero.getId())
                .stream().filter(f -> "ABIERTA".equals(f.getEstado())).toList();
        assertThat(abiertas).hasSize(1);
        assertThat(abiertas.get(0).getId()).isEqualTo(factura.getId());

        List<PagoResponseDTO> pagos = pagosDeFacturaActiva(cliente.getId());
        pagos.forEach(p -> pagosCreados.add(p.getId()));
        assertThat(pagos).hasSize(2);
        BigDecimal totalPagos = pagos.stream().map(PagoResponseDTO::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(totalPagos).isEqualByComparingTo(new BigDecimal("300.00"));

        historialDeCliente(cliente.getId()).stream()
                .filter(h -> "DEVOLUCION".equals(h.getTipo()))
                .forEach(h -> historialCreados.add(h.getId()));
    }

    // 6.4 -- rollback: se fuerza un fallo DESPUÉS de que ya se escribió producto, movimiento de
    // stock, descuento de bandejas e historial (usando una unidad de negocio inexistente para
    // que la apertura automática de factura falle al buscar la UnidadNegocio) -- nada de eso
    // debe sobrevivir, todo dentro de la misma transacción.
    @Test
    void fallaAlResolverFacturaRevierteTodaLaTransaccion() {
        UnidadNegocio vivero = vivero();
        Long unidadInexistente = 999999L;
        UnidadNegocioContextHolder.setUnidadNegocioId(unidadInexistente);
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        prepararCuentasCorrientes(cliente, 5, new BigDecimal("100.00"));

        assertThatThrownBy(() -> devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 3, new BigDecimal("500.00"))))
                .isInstanceOf(RuntimeException.class);

        CuentaCorrienteBandejas ccbDespues = ccbRepository.findByClienteId(cliente.getId()).orElseThrow();
        CuentaCorrienteDinero ccdDespues = ccdRepository.findByClienteId(cliente.getId()).orElseThrow();
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(5);
        assertThat(ccdDespues.getBalancePesos()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(historialDeCliente(cliente.getId())).isEmpty();
        assertThat(productoRepository.findByNombreAndUnidadNegocioIdAndDeletedFalse(
                producto.getNombre() + " DEVUELTO", vivero.getId())).isEmpty();
    }

    // 6.5 -- no-regresión de la rendición de Abono: con un Pago de devolución creado (cuentaAbono
    // null, Decisión 5), el total de sumarPagosPorCuentaYPeriodo para JEFE y para COLEGA no se
    // mueve.
    @Test
    void devolucionNoAlteraTotalesDeRendicionAbono() {
        UnidadNegocio vivero = vivero();
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        autenticarComoSergio();

        Cliente cliente = crearCliente(vivero);
        Producto producto = crearProducto(vivero, 20);
        FacturaCliente factura = crearFacturaAbierta(cliente, vivero);
        prepararCuentasCorrientes(cliente, 0, BigDecimal.ZERO);

        LocalDateTime desde = LocalDateTime.now().minusDays(1);
        LocalDateTime hasta = LocalDateTime.now().plusDays(1);
        BigDecimal jefeAntes = pagoRepository.sumarPagosPorCuentaYPeriodo(CuentaAbono.JEFE, desde, hasta);
        BigDecimal colegaAntes = pagoRepository.sumarPagosPorCuentaYPeriodo(CuentaAbono.COLEGA, desde, hasta);

        devolucionService.registrarDevolucionLlenas(
                devolucion(cliente.getId(), producto.getId(), 2, new BigDecimal("500.00")));

        BigDecimal jefeDespues = pagoRepository.sumarPagosPorCuentaYPeriodo(CuentaAbono.JEFE, desde, hasta);
        BigDecimal colegaDespues = pagoRepository.sumarPagosPorCuentaYPeriodo(CuentaAbono.COLEGA, desde, hasta);

        assertThat(jefeDespues).isEqualByComparingTo(jefeAntes);
        assertThat(colegaDespues).isEqualByComparingTo(colegaAntes);

        pagosDeFacturaActiva(cliente.getId()).forEach(p -> pagosCreados.add(p.getId()));
    }

    // 6.6 -- no-regresión de la devolución de bandejas sueltas: BandejasServiceImpl NO fue
    // tocado por este change (verificado también por `git diff --stat` fuera de este test) -- se
    // registra una devolución suelta directa y se confirma el mismo comportamiento de siempre:
    // historial DEVOLUCION sin venta, descuento de balance, sin ningún efecto sobre facturas.
    @Test
    void devolucionDeBandejasSueltasSigueIgualQueAntes() {
        UnidadNegocio vivero = vivero();
        Cliente cliente = crearCliente(vivero);
        prepararCuentasCorrientes(cliente, 6, BigDecimal.ZERO);

        bandejasService.registrarDevolucion(cliente.getId(), 4, "Sergio");

        List<HistorialBandejas> historial = historialDeCliente(cliente.getId()).stream()
                .filter(h -> "DEVOLUCION".equals(h.getTipo()))
                .toList();
        historial.forEach(h -> historialCreados.add(h.getId()));

        assertThat(historial).hasSize(1);
        assertThat(historial.get(0).getVenta()).isNull();
        assertThat(historial.get(0).getCantidad()).isEqualTo(4);

        CuentaCorrienteBandejas ccbDespues = ccbRepository.findByClienteId(cliente.getId()).orElseThrow();
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(2);
    }
}
