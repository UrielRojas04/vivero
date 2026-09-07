package com.vivero.gestion.services;

import com.vivero.gestion.dto.PagoHistorialAbonoDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.FacturaCliente;
import com.vivero.gestion.models.Pago;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.models.enums.EstadoPago;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.FacturaClienteRepository;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
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
 * Grupo 5 de tasks.md de historial-cobros-abono: HistorialCobrosAbonoService, capa que resuelve
 * la unidad "Abono" por nombre (nunca id literal, patrón vigente en RendicionColegaServiceImpl) y
 * enriquece la proyección del repositorio con cobradoPor/origen.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class HistorialCobrosAbonoServiceTest {

    @Autowired
    private HistorialCobrosAbonoService historialCobrosAbonoService;

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
        CuentaAbonoContextHolder.clear();
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

    private Cliente crearCliente(UnidadNegocio unidad, String nombre) {
        Cliente c = new Cliente();
        c.setNombreRazonSocial(nombre);
        c.setUnidadNegocio(unidad);
        Cliente guardado = clienteRepository.save(c);
        clientesCreados.add(guardado.getId());
        return guardado;
    }

    private Venta crearVenta(UnidadNegocio unidad, CuentaAbono cuenta, Cliente cliente, LocalDateTime fecha) {
        Venta v = new Venta();
        v.setUnidadNegocio(unidad);
        v.setCuentaAbono(cuenta);
        v.setCliente(cliente);
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

    private Pago crearPago(Venta venta, FacturaCliente factura, CuentaAbono cuenta, BigDecimal monto, LocalDateTime fecha) {
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
    void listarHistorialDevuelvePagoSembradoDeLaUnidadAbono() {
        Cliente cliente = crearCliente(abono(), "Cliente Service " + UUID.randomUUID());
        Venta venta = crearVenta(abono(), CuentaAbono.JEFE, cliente, LocalDateTime.now());
        Pago pago = crearPago(venta, null, CuentaAbono.JEFE, BigDecimal.TEN, LocalDateTime.now());

        Page<PagoHistorialAbonoDTO> pagina =
                historialCobrosAbonoService.listarHistorial(null, null, null, PageRequest.of(0, 20));

        assertThat(pagina.getContent())
                .extracting(PagoHistorialAbonoDTO::getId)
                .contains(pago.getId());
    }

    // --- 5.3: cobradoPor se resuelve vía CuentaAbonoNombres.nombreVisible(...) ---

    @Test
    void listarHistorialResuelveCobradoPorParaCuentaJefe() {
        Cliente cliente = crearCliente(abono(), "Cliente CobradoPor " + UUID.randomUUID());
        Venta venta = crearVenta(abono(), CuentaAbono.JEFE, cliente, LocalDateTime.now());
        Pago pago = crearPago(venta, null, CuentaAbono.JEFE, BigDecimal.TEN, LocalDateTime.now());

        Page<PagoHistorialAbonoDTO> pagina =
                historialCobrosAbonoService.listarHistorial(null, null, null, PageRequest.of(0, 20));

        PagoHistorialAbonoDTO encontrado = pagina.getContent().stream()
                .filter(dto -> dto.getId().equals(pago.getId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Pago no encontrado"));

        assertThat(encontrado.getCobradoPor()).isEqualTo("Sergio");
    }

    // --- 5.4: las tres variantes de cuenta conviven en el mismo listado sin romperlo ---

    @Test
    void listarHistorialResuelveCobradoParaLasTresVariantesDeCuenta() {
        Cliente cliente = crearCliente(abono(), "Cliente Tres Variantes " + UUID.randomUUID());

        Venta ventaJefe = crearVenta(abono(), CuentaAbono.JEFE, cliente, LocalDateTime.now());
        Pago pagoJefe = crearPago(ventaJefe, null, CuentaAbono.JEFE, BigDecimal.ONE, LocalDateTime.now());

        Venta ventaColega = crearVenta(abono(), CuentaAbono.COLEGA, cliente, LocalDateTime.now());
        Pago pagoColega = crearPago(ventaColega, null, CuentaAbono.COLEGA, BigDecimal.ONE, LocalDateTime.now());

        Venta ventaSinCuenta = crearVenta(abono(), null, cliente, LocalDateTime.now());
        Pago pagoSinCuenta = crearPago(ventaSinCuenta, null, null, BigDecimal.ONE, LocalDateTime.now());

        Page<PagoHistorialAbonoDTO> pagina =
                historialCobrosAbonoService.listarHistorial(null, null, null, PageRequest.of(0, 50));

        assertThat(cobradoPorDe(pagina, pagoJefe.getId())).isEqualTo("Sergio");
        assertThat(cobradoPorDe(pagina, pagoColega.getId())).isEqualTo("Pablo");
        assertThat(cobradoPorDe(pagina, pagoSinCuenta.getId())).isEqualTo("Sin cuenta asignada");
    }

    private String cobradoPorDe(Page<PagoHistorialAbonoDTO> pagina, Long pagoId) {
        return pagina.getContent().stream()
                .filter(dto -> dto.getId().equals(pagoId))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Pago " + pagoId + " no encontrado"))
                .getCobradoPor();
    }

    // --- 5.5: origen -- VENTA cuando hay ventaId, CUENTA_CORRIENTE cuando sólo hay facturaId ---

    @Test
    void listarHistorialMarcaOrigenVentaCuandoElPagoVieneDeUnaVenta() {
        Cliente cliente = crearCliente(abono(), "Cliente Origen Venta " + UUID.randomUUID());
        Venta venta = crearVenta(abono(), CuentaAbono.JEFE, cliente, LocalDateTime.now());
        Pago pago = crearPago(venta, null, CuentaAbono.JEFE, BigDecimal.TEN, LocalDateTime.now());

        Page<PagoHistorialAbonoDTO> pagina =
                historialCobrosAbonoService.listarHistorial(null, null, null, PageRequest.of(0, 20));

        PagoHistorialAbonoDTO encontrado = pagina.getContent().stream()
                .filter(dto -> dto.getId().equals(pago.getId()))
                .findFirst().orElseThrow();

        assertThat(encontrado.getOrigen()).isEqualTo("VENTA");
    }

    @Test
    void listarHistorialMarcaOrigenCuentaCorrienteCuandoElPagoEsDirectoAFactura() {
        Cliente cliente = crearCliente(abono(), "Cliente Origen CC " + UUID.randomUUID());
        FacturaCliente factura = crearFactura(abono(), cliente);
        Pago pago = crearPago(null, factura, CuentaAbono.COLEGA, BigDecimal.TEN, LocalDateTime.now());

        Page<PagoHistorialAbonoDTO> pagina =
                historialCobrosAbonoService.listarHistorial(null, null, null, PageRequest.of(0, 20));

        PagoHistorialAbonoDTO encontrado = pagina.getContent().stream()
                .filter(dto -> dto.getId().equals(pago.getId()))
                .findFirst().orElseThrow();

        assertThat(encontrado.getOrigen()).isEqualTo("CUENTA_CORRIENTE");
    }

    // --- 5.6: guard de no-partición (Decisión 4 de design.md) ---

    @Test
    void listarHistorialEsIdenticoParaJefeYColega() {
        Cliente cliente = crearCliente(abono(), "Cliente No Particion " + UUID.randomUUID());
        Venta ventaJefe = crearVenta(abono(), CuentaAbono.JEFE, cliente, LocalDateTime.now());
        Pago pagoJefe = crearPago(ventaJefe, null, CuentaAbono.JEFE, BigDecimal.ONE, LocalDateTime.now());
        Venta ventaColega = crearVenta(abono(), CuentaAbono.COLEGA, cliente, LocalDateTime.now());
        Pago pagoColega = crearPago(ventaColega, null, CuentaAbono.COLEGA, BigDecimal.ONE, LocalDateTime.now());

        try {
            CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);
            Page<PagoHistorialAbonoDTO> comoJefe =
                    historialCobrosAbonoService.listarHistorial(null, null, null, PageRequest.of(0, 50));
            List<Long> idsComoJefe = comoJefe.getContent().stream().map(PagoHistorialAbonoDTO::getId).toList();

            CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.COLEGA);
            Page<PagoHistorialAbonoDTO> comoColega =
                    historialCobrosAbonoService.listarHistorial(null, null, null, PageRequest.of(0, 50));
            List<Long> idsComoColega = comoColega.getContent().stream().map(PagoHistorialAbonoDTO::getId).toList();

            // El jefe ve también los cobros del colega, y viceversa: mismo conjunto.
            assertThat(idsComoJefe).contains(pagoJefe.getId(), pagoColega.getId());
            assertThat(idsComoColega).contains(pagoJefe.getId(), pagoColega.getId());
            assertThat(idsComoJefe).containsExactlyInAnyOrderElementsOf(idsComoColega);
        } finally {
            CuentaAbonoContextHolder.clear();
        }
    }
}
