package com.vivero.gestion.repositories;

import com.vivero.gestion.dto.PagoHistorialAbonoDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.FacturaCliente;
import com.vivero.gestion.models.Pago;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.models.enums.EstadoPago;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Grupo 4 de tasks.md de historial-cobros-abono: proyección JPQL paginada de PagoRepository
 * (Decisión 3 de design.md). Base real (Postgres localhost:5433), sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class PagoHistorialAbonoRepositoryTest {

    @Autowired
    private PagoRepository pagoRepository;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private FacturaClienteRepository facturaClienteRepository;

    private final List<Long> pagosCreados = new ArrayList<>();
    private final List<Long> ventasCreadas = new ArrayList<>();
    private final List<Long> facturasCreadas = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        for (Long id : pagosCreados) pagoRepository.deleteById(id);
        pagosCreados.clear();
        for (Long id : ventasCreadas) ventaRepository.deleteById(id);
        ventasCreadas.clear();
        for (Long id : facturasCreadas) facturaClienteRepository.deleteById(id);
        facturasCreadas.clear();
        for (Long id : clientesCreados) clienteRepository.deleteById(id);
        clientesCreados.clear();
    }

    private UnidadNegocio abono() {
        return unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Abono sembrada"));
    }

    private UnidadNegocio vivero() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
    }

    private Cliente crearCliente(UnidadNegocio unidad, String nombre) {
        Cliente c = new Cliente();
        c.setNombreRazonSocial(nombre);
        c.setUnidadNegocio(unidad);
        Cliente guardado = clienteRepository.save(c);
        clientesCreados.add(guardado.getId());
        return guardado;
    }

    private Venta crearVenta(UnidadNegocio unidad, CuentaAbono cuenta, Cliente cliente,
                              String clienteNombreCasual, LocalDateTime fecha) {
        Venta v = new Venta();
        v.setUnidadNegocio(unidad);
        v.setCuentaAbono(cuenta);
        v.setCliente(cliente);
        v.setClienteNombreCasual(clienteNombreCasual);
        v.setSubtotal(BigDecimal.TEN);
        v.setTotalFinal(BigDecimal.TEN);
        v.setEstadoPago("PAGADO");
        v.setFecha(fecha != null ? fecha : LocalDateTime.now());
        Venta guardada = ventaRepository.save(v);
        ventasCreadas.add(guardada.getId());
        return guardada;
    }

    private FacturaCliente crearFactura(UnidadNegocio unidad, Cliente cliente) {
        FacturaCliente f = new FacturaCliente();
        f.setUnidadNegocio(unidad);
        f.setCliente(cliente);
        f.setFechaApertura(LocalDateTime.now());
        f.setEstado("ABIERTA");
        FacturaCliente guardada = facturaClienteRepository.save(f);
        facturasCreadas.add(guardada.getId());
        return guardada;
    }

    private Pago crearPago(Venta venta, FacturaCliente factura, CuentaAbono cuenta,
                            BigDecimal monto, LocalDateTime fecha) {
        Pago p = new Pago();
        p.setVenta(venta);
        p.setFactura(factura);
        p.setCuentaAbono(cuenta);
        p.setMonto(monto);
        p.setMetodoPago("EFECTIVO");
        p.setEstado(EstadoPago.ACREDITADO);
        p.setFecha(fecha != null ? fecha : LocalDateTime.now());
        Pago guardado = pagoRepository.save(p);
        pagosCreados.add(guardado.getId());
        return guardado;
    }

    @Test
    void listarHistorialCobrosDevuelvePagoDeVentaDeAbono() {
        Cliente cliente = crearCliente(abono(), "Cliente Test " + UUID.randomUUID());
        Venta venta = crearVenta(abono(), CuentaAbono.JEFE, cliente, null, LocalDateTime.now());
        Pago pago = crearPago(venta, null, CuentaAbono.JEFE, BigDecimal.TEN, LocalDateTime.now());

        Page<PagoHistorialAbonoDTO> pagina = pagoRepository.listarHistorialCobros(
                abono().getId(), null, null, null, PageRequest.of(0, 20));

        PagoHistorialAbonoDTO encontrado = pagina.getContent().stream()
                .filter(dto -> dto.getId().equals(pago.getId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Pago no encontrado en el historial"));

        assertThat(encontrado.getClienteNombre()).isEqualTo(cliente.getNombreRazonSocial());
        assertThat(encontrado.getVentaId()).isEqualTo(venta.getId());
        assertThat(encontrado.getFechaVenta()).isNotNull();
    }

    // --- 4.3: pago directo a factura, sin venta ---

    @Test
    void listarHistorialCobrosDevuelvePagoDirectoAFacturaSinVenta() {
        Cliente cliente = crearCliente(abono(), "Cliente Factura " + UUID.randomUUID());
        FacturaCliente factura = crearFactura(abono(), cliente);
        Pago pago = crearPago(null, factura, CuentaAbono.COLEGA, BigDecimal.valueOf(50), LocalDateTime.now());

        Page<PagoHistorialAbonoDTO> pagina = pagoRepository.listarHistorialCobros(
                abono().getId(), null, null, null, PageRequest.of(0, 20));

        PagoHistorialAbonoDTO encontrado = pagina.getContent().stream()
                .filter(dto -> dto.getId().equals(pago.getId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Pago directo a factura no encontrado"));

        assertThat(encontrado.getVentaId()).isNull();
        assertThat(encontrado.getFacturaId()).isEqualTo(factura.getId());
        assertThat(encontrado.getClienteNombre()).isEqualTo(cliente.getNombreRazonSocial());
    }

    // --- 4.4: aislamiento por unidad -- un pago de Vivero no aparece en el historial de Abono ---

    @Test
    void listarHistorialCobrosNoDevuelvePagosDeOtraUnidad() {
        Cliente clienteVivero = crearCliente(vivero(), "Cliente Vivero " + UUID.randomUUID());
        Venta ventaVivero = crearVenta(vivero(), null, clienteVivero, null, LocalDateTime.now());
        Pago pagoVivero = crearPago(ventaVivero, null, null, BigDecimal.ONE, LocalDateTime.now());

        Page<PagoHistorialAbonoDTO> pagina = pagoRepository.listarHistorialCobros(
                abono().getId(), null, null, null, PageRequest.of(0, 20));

        assertThat(pagina.getContent())
                .extracting(PagoHistorialAbonoDTO::getId)
                .doesNotContain(pagoVivero.getId());
    }

    // --- 4.5: cliente casual -- venta de Abono sin cliente de agenda ---

    @Test
    void listarHistorialCobrosUsaClienteNombreCasualCuandoNoHayClienteDeAgenda() {
        String nombreCasual = "Casual " + UUID.randomUUID();
        Venta venta = crearVenta(abono(), CuentaAbono.JEFE, null, nombreCasual, LocalDateTime.now());
        Pago pago = crearPago(venta, null, CuentaAbono.JEFE, BigDecimal.TEN, LocalDateTime.now());

        Page<PagoHistorialAbonoDTO> pagina = pagoRepository.listarHistorialCobros(
                abono().getId(), null, null, null, PageRequest.of(0, 20));

        PagoHistorialAbonoDTO encontrado = pagina.getContent().stream()
                .filter(dto -> dto.getId().equals(pago.getId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Pago de cliente casual no encontrado"));

        assertThat(encontrado.getClienteNombre()).isEqualTo(nombreCasual);
    }

    // --- búsqueda por número de venta (pedido puntual del dueño, además de por cliente) ---

    @Test
    void listarHistorialCobrosBuscaPorNumeroDeVenta() {
        Cliente cliente = crearCliente(abono(), "Cliente Numero Venta " + UUID.randomUUID());
        Venta venta = crearVenta(abono(), CuentaAbono.JEFE, cliente, null, LocalDateTime.now());
        Pago pago = crearPago(venta, null, CuentaAbono.JEFE, BigDecimal.TEN, LocalDateTime.now());

        Page<PagoHistorialAbonoDTO> conNumeroExacto = pagoRepository.listarHistorialCobros(
                abono().getId(), null, null, String.valueOf(venta.getId()), PageRequest.of(0, 20));

        assertThat(conNumeroExacto.getContent())
                .extracting(PagoHistorialAbonoDTO::getId)
                .contains(pago.getId());

        Page<PagoHistorialAbonoDTO> conNumeroDeOtraVenta = pagoRepository.listarHistorialCobros(
                abono().getId(), null, null, String.valueOf(venta.getId() + 999999L), PageRequest.of(0, 20));

        assertThat(conNumeroDeOtraVenta.getContent())
                .extracting(PagoHistorialAbonoDTO::getId)
                .doesNotContain(pago.getId());
    }

    // --- 4.6: filtros de fecha y búsqueda ---

    @Test
    void listarHistorialCobrosFiltraPorRangoDeFechas() {
        LocalDateTime dentro = LocalDateTime.now().minusDays(2);
        LocalDateTime fuera = LocalDateTime.now().minusDays(30);
        String nombreUnico = "Cliente Rango " + UUID.randomUUID();
        Cliente cliente = crearCliente(abono(), nombreUnico);
        Venta ventaDentro = crearVenta(abono(), CuentaAbono.JEFE, cliente, null, dentro);
        Pago pagoDentro = crearPago(ventaDentro, null, CuentaAbono.JEFE, BigDecimal.TEN, dentro);
        Venta ventaFuera = crearVenta(abono(), CuentaAbono.JEFE, cliente, null, fuera);
        Pago pagoFuera = crearPago(ventaFuera, null, CuentaAbono.JEFE, BigDecimal.TEN, fuera);

        LocalDateTime desde = LocalDateTime.now().minusDays(5);
        LocalDateTime hasta = LocalDateTime.now();

        Page<PagoHistorialAbonoDTO> conRango = pagoRepository.listarHistorialCobros(
                abono().getId(), desde, hasta, null, PageRequest.of(0, 20));
        List<Long> idsConRango = conRango.getContent().stream().map(PagoHistorialAbonoDTO::getId).toList();
        assertThat(idsConRango).contains(pagoDentro.getId());
        assertThat(idsConRango).doesNotContain(pagoFuera.getId());

        Page<PagoHistorialAbonoDTO> sinFiltros = pagoRepository.listarHistorialCobros(
                abono().getId(), null, null, null, PageRequest.of(0, 50));
        List<Long> idsSinFiltros = sinFiltros.getContent().stream().map(PagoHistorialAbonoDTO::getId).toList();
        assertThat(idsSinFiltros).contains(pagoDentro.getId(), pagoFuera.getId());
    }

    @Test
    void listarHistorialCobrosBuscaPorClienteParcialEInsensibleAMayusculas() {
        String nombre = "Zzz Buscable " + UUID.randomUUID();
        Cliente cliente = crearCliente(abono(), nombre);
        Venta venta = crearVenta(abono(), CuentaAbono.JEFE, cliente, null, LocalDateTime.now());
        Pago pago = crearPago(venta, null, CuentaAbono.JEFE, BigDecimal.TEN, LocalDateTime.now());

        String qParcial = nombre.substring(0, 8).toUpperCase();
        Page<PagoHistorialAbonoDTO> conCoincidencia = pagoRepository.listarHistorialCobros(
                abono().getId(), null, null, qParcial, PageRequest.of(0, 20));

        assertThat(conCoincidencia.getContent())
                .extracting(PagoHistorialAbonoDTO::getId)
                .contains(pago.getId());

        Page<PagoHistorialAbonoDTO> sinCoincidencia = pagoRepository.listarHistorialCobros(
                abono().getId(), null, null, "texto-que-no-matchea-" + UUID.randomUUID(), PageRequest.of(0, 20));

        assertThat(sinCoincidencia.getContent()).isEmpty();
        assertThat(sinCoincidencia.getTotalElements()).isZero();
    }

    // --- 4.7: orden por fecha descendente y paginación ---

    @Test
    void listarHistorialCobrosOrdenaPorFechaDescendenteYPagina() {
        Cliente cliente = crearCliente(abono(), "Cliente Orden " + UUID.randomUUID());
        LocalDateTime base = LocalDateTime.now().minusHours(1);

        Venta v1 = crearVenta(abono(), CuentaAbono.JEFE, cliente, null, base);
        Pago p1 = crearPago(v1, null, CuentaAbono.JEFE, BigDecimal.ONE, base);

        Venta v2 = crearVenta(abono(), CuentaAbono.JEFE, cliente, null, base.plusMinutes(10));
        Pago p2 = crearPago(v2, null, CuentaAbono.JEFE, BigDecimal.ONE, base.plusMinutes(10));

        Venta v3 = crearVenta(abono(), CuentaAbono.JEFE, cliente, null, base.plusMinutes(20));
        Pago p3 = crearPago(v3, null, CuentaAbono.JEFE, BigDecimal.ONE, base.plusMinutes(20));

        Page<PagoHistorialAbonoDTO> primeraPagina = pagoRepository.listarHistorialCobros(
                abono().getId(), base.minusMinutes(1), base.plusMinutes(21), null, PageRequest.of(0, 2));

        assertThat(primeraPagina.getContent()).hasSize(2);
        assertThat(primeraPagina.getTotalElements()).isEqualTo(3);
        assertThat(primeraPagina.getContent().get(0).getId()).isEqualTo(p3.getId());
        assertThat(primeraPagina.getContent().get(1).getId()).isEqualTo(p2.getId());
    }
}
