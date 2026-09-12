package com.vivero.gestion.services;

import com.vivero.gestion.dto.GananciaDisponibleAbonoDTO;
import com.vivero.gestion.dto.RetiroGananciaDTO;
import com.vivero.gestion.dto.RetiroGananciaRequestDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.Gasto;
import com.vivero.gestion.models.Pago;
import com.vivero.gestion.models.RetiroGananciaAbono;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.models.enums.EstadoPago;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.GastoRepository;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.RetiroGananciaAbonoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

/**
 * Grupos 3 y 4 de tasks.md de retiro-ganancia-abono: registrar/listar retiros de ganancia
 * personal y calcular la ganancia disponible acumulada. Base real (Postgres localhost:5433).
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RetiroGananciaAbonoServiceTest {

    private static final String OBSERVACION_TEST = "Test retiro ganancia service";

    @Autowired
    private RendicionColegaService rendicionColegaService;

    @Autowired
    private RetiroGananciaAbonoRepository retiroGananciaAbonoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private PagoRepository pagoRepository;

    @Autowired
    private GastoRepository gastoRepository;

    private final List<Long> ventasCreadas = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();
    private final List<Long> gastosCreados = new ArrayList<>();

    private boolean modoOriginal;
    private BigDecimal porcentajeOriginal;

    @BeforeEach
    void guardarConfigOriginal() {
        UnidadNegocio abono = abono();
        modoOriginal = abono.isRepartoSobreVentasColega();
        porcentajeOriginal = abono.getPorcentajeRepartoColega();
    }

    @AfterEach
    void limpiar() {
        UnidadNegocio abono = abono();
        abono.setRepartoSobreVentasColega(modoOriginal);
        abono.setPorcentajeRepartoColega(porcentajeOriginal);
        unidadNegocioRepository.save(abono);
        retiroGananciaAbonoRepository.findAllByUnidadNegocioIdOrderByFechaDescIdDesc(abono.getId(), PageRequest.of(0, 100))
                .stream()
                .filter(r -> OBSERVACION_TEST.equals(r.getObservacion()))
                .forEach(r -> retiroGananciaAbonoRepository.deleteById(r.getId()));
        for (Long id : gastosCreados) gastoRepository.deleteById(id);
        gastosCreados.clear();
        for (Long id : ventasCreadas) ventaRepository.deleteById(id);
        ventasCreadas.clear();
        for (Long id : clientesCreados) clienteRepository.deleteById(id);
        clientesCreados.clear();
        SecurityContextHolder.clearContext();
        CuentaAbonoContextHolder.clear();
    }

    private UnidadNegocio abono() {
        return unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Abono sembrada"));
    }

    private Cliente crearCliente(String nombre) {
        Cliente c = new Cliente();
        c.setNombreRazonSocial(nombre);
        c.setUnidadNegocio(abono());
        Cliente guardado = clienteRepository.save(c);
        clientesCreados.add(guardado.getId());
        return guardado;
    }

    /** Venta de Abono con un pago acreditado de la cuenta indicada, por el monto exacto dado. */
    private void sembrarIngreso(CuentaAbono cuenta, BigDecimal monto) {
        Cliente cliente = crearCliente("Cliente Ganancia Disponible " + UUID.randomUUID());
        Venta v = new Venta();
        v.setUnidadNegocio(abono());
        v.setCuentaAbono(cuenta);
        v.setCliente(cliente);
        v.setSubtotal(monto);
        v.setTotalFinal(monto);
        v.setEstadoPago("PAGADO");
        v.setFecha(LocalDateTime.now());
        Venta guardada = ventaRepository.save(v);
        ventasCreadas.add(guardada.getId());

        Pago p = new Pago();
        p.setVenta(guardada);
        p.setCuentaAbono(cuenta);
        p.setMonto(monto);
        p.setMetodoPago("EFECTIVO");
        p.setEstado(EstadoPago.ACREDITADO);
        p.setFecha(LocalDateTime.now());
        pagoRepository.save(p);
    }

    private void sembrarGastoManual(BigDecimal monto) {
        Gasto g = new Gasto();
        g.setUnidadNegocio(abono());
        g.setMonto(monto);
        g.setFecha(LocalDateTime.now());
        g.setConcepto("Test gasto manual ganancia disponible");
        Gasto guardado = gastoRepository.save(g);
        gastosCreados.add(guardado.getId());
    }

    private void autenticarComo(String username, CuentaAbono cuenta) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null,
                        List.of(new SimpleGrantedAuthority("LEER_FINANZAS"))));
        if (cuenta != null) {
            CuentaAbonoContextHolder.setCuentaAbono(cuenta);
        }
    }

    private RetiroGananciaRequestDTO buildRequest(String monto) {
        RetiroGananciaRequestDTO req = new RetiroGananciaRequestDTO();
        req.setMonto(new BigDecimal(monto));
        req.setObservacion(OBSERVACION_TEST);
        req.setMedioPago("EFECTIVO");
        return req;
    }

    @Test
    void registrarRetiroGananciaPersisteConLaCuentaDeLaSesion() {
        autenticarComo("Sergio", CuentaAbono.JEFE);

        rendicionColegaService.registrarRetiroGanancia(buildRequest("500"));

        RetiroGananciaDTO creado = ultimoCreado();
        assertThat(creado.getCuentaAbono()).isEqualTo(CuentaAbono.JEFE);
        assertThat(creado.getMonto()).isEqualByComparingTo(new BigDecimal("500"));
    }

    // --- 3.4/3.5: el historial resuelve retiradoPor vía CuentaAbonoNombres ---

    @Test
    void obtenerHistorialRetirosGananciaResuelveRetiradoPorParaLaCuentaJefe() {
        autenticarComo("Sergio", CuentaAbono.JEFE);
        rendicionColegaService.registrarRetiroGanancia(buildRequest("500"));

        RetiroGananciaDTO creado = ultimoCreado();

        assertThat(creado.getRetiradoPor()).isEqualTo("Sergio");
    }

    // --- 3.3: rechazo de monto no positivo y sin cuenta resuelta ---

    @Test
    void registrarRetiroGananciaRechazaMontoCero() {
        autenticarComo("Sergio", CuentaAbono.JEFE);

        assertThatThrownBy(() -> rendicionColegaService.registrarRetiroGanancia(buildRequest("0")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void registrarRetiroGananciaRechazaMontoNegativo() {
        autenticarComo("Sergio", CuentaAbono.JEFE);

        assertThatThrownBy(() -> rendicionColegaService.registrarRetiroGanancia(buildRequest("-100")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void registrarRetiroGananciaSinCuentaResueltaRechazaConMensajeClaro() {
        // Ni jefe ni colega: CuentaAbonoContextHolder queda vacío (mismo criterio que
        // CuentaAbonoFilter/registrarRendicion, nunca cae en JEFE por defecto).
        autenticarComo("empleado-nuevo@vivero.com", null);

        assertThatThrownBy(() -> rendicionColegaService.registrarRetiroGanancia(buildRequest("100")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cuenta");
    }

    // --- 3.6: guard de no-partición (Decisión 6 de design.md) ---

    @Test
    void obtenerHistorialRetirosGananciaEsIdenticoParaJefeYColega() {
        autenticarComo("Sergio", CuentaAbono.JEFE);
        rendicionColegaService.registrarRetiroGanancia(buildRequest("111"));
        autenticarComo("Pablo", CuentaAbono.COLEGA);
        rendicionColegaService.registrarRetiroGanancia(buildRequest("222"));

        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);
        List<Long> idsComoJefe = rendicionColegaService.obtenerHistorialRetirosGanancia(PageRequest.of(0, 50))
                .getContent().stream()
                .filter(r -> OBSERVACION_TEST.equals(r.getObservacion()))
                .map(RetiroGananciaDTO::getId)
                .toList();

        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.COLEGA);
        List<Long> idsComoColega = rendicionColegaService.obtenerHistorialRetirosGanancia(PageRequest.of(0, 50))
                .getContent().stream()
                .filter(r -> OBSERVACION_TEST.equals(r.getObservacion()))
                .map(RetiroGananciaDTO::getId)
                .toList();

        assertThat(idsComoJefe).hasSize(2);
        assertThat(idsComoJefe).containsExactlyInAnyOrderElementsOf(idsComoColega);
    }

    // --- Grupo 4: ganancia disponible acumulada. Patrón antes/despues (mismo criterio que
    // RendicionColegaDireccionTest#netoDeLiquidacionRestaJefeAColegaDelColegaAJefe): la base es
    // real y compartida, así que se asertan DELTAS causados por los datos sembrados en este test,
    // nunca valores absolutos. ---

    @Test
    void obtenerGananciaDisponibleReflejaUnIngresoDeLaCuentaJefe() {
        UnidadNegocio abono = abono();
        BigDecimal porcentajeColega = abono.getPorcentajeRepartoColega() != null ? abono.getPorcentajeRepartoColega() : BigDecimal.ZERO;
        boolean repartoSobreVentas = abono.isRepartoSobreVentasColega();

        GananciaDisponibleAbonoDTO antes = rendicionColegaService.obtenerGananciaDisponible();

        BigDecimal monto = new BigDecimal("10000");
        sembrarIngreso(CuentaAbono.JEFE, monto);

        GananciaDisponibleAbonoDTO despues = rendicionColegaService.obtenerGananciaDisponible();

        // Sin gastos ni ingresos de colega en este delta: ingresosNetosDelta = monto.
        BigDecimal baseColegaDelta = repartoSobreVentas ? BigDecimal.ZERO : monto; // ingresosColegaDelta = 0
        BigDecimal gananciaTeoricaColegaDelta = baseColegaDelta.multiply(porcentajeColega).divide(BigDecimal.valueOf(100));
        BigDecimal gananciaTeoricaJefeDelta = monto.subtract(gananciaTeoricaColegaDelta);

        assertThat(despues.getGananciaTeoricaAcumuladaJefe().subtract(antes.getGananciaTeoricaAcumuladaJefe()))
                .isEqualByComparingTo(gananciaTeoricaJefeDelta);
        assertThat(despues.getGananciaTeoricaAcumuladaColega().subtract(antes.getGananciaTeoricaAcumuladaColega()))
                .isEqualByComparingTo(gananciaTeoricaColegaDelta);
        // Sin retiros de por medio en este test: el delta de disponible = delta de teórica.
        assertThat(despues.getGananciaDisponibleJefe().subtract(antes.getGananciaDisponibleJefe()))
                .isEqualByComparingTo(gananciaTeoricaJefeDelta);
    }

    // --- 4.3: los gastos manuales de Finanzas restan de la ganancia acumulada ---

    @Test
    void obtenerGananciaDisponibleRestaGastosManuales() {
        GananciaDisponibleAbonoDTO antes = rendicionColegaService.obtenerGananciaDisponible();

        BigDecimal gastoManual = new BigDecimal("1500");
        sembrarGastoManual(gastoManual);

        GananciaDisponibleAbonoDTO despues = rendicionColegaService.obtenerGananciaDisponible();

        BigDecimal deltaTotalTeorica = despues.getGananciaTeoricaAcumuladaJefe().add(despues.getGananciaTeoricaAcumuladaColega())
                .subtract(antes.getGananciaTeoricaAcumuladaJefe().add(antes.getGananciaTeoricaAcumuladaColega()));

        // Sin ingresos nuevos en este test: el único movimiento es el gasto, que resta del total
        // repartido entre las dos cuentas (ingresosNetos baja exactamente ese monto).
        assertThat(deltaTotalTeorica).isEqualByComparingTo(gastoManual.negate());
    }

    // --- 4.4: los retiros sólo restan de su propia cuenta ---

    @Test
    void obtenerGananciaDisponibleRestaRetirosSoloDeLaCuentaQueLosHizo() {
        GananciaDisponibleAbonoDTO antes = rendicionColegaService.obtenerGananciaDisponible();

        autenticarComo("Pablo", CuentaAbono.COLEGA);
        rendicionColegaService.registrarRetiroGanancia(buildRequest("400"));

        GananciaDisponibleAbonoDTO despues = rendicionColegaService.obtenerGananciaDisponible();

        assertThat(despues.getGananciaDisponibleColega().subtract(antes.getGananciaDisponibleColega()))
                .isEqualByComparingTo(new BigDecimal("-400"));
        assertThat(despues.getGananciaDisponibleJefe()).isEqualByComparingTo(antes.getGananciaDisponibleJefe());
    }

    // --- 4.5: sobre-retiro permitido, saldo negativo, sin excepción ---

    @Test
    void obtenerGananciaDisponibleNoLanzaConSobreRetiro() {
        autenticarComo("Sergio", CuentaAbono.JEFE);
        // Un monto deliberadamente enorme para garantizar que supere cualquier ganancia teórica
        // acumulada real de la base de test, sea cual sea.
        rendicionColegaService.registrarRetiroGanancia(buildRequest("999999999"));

        GananciaDisponibleAbonoDTO resultado = rendicionColegaService.obtenerGananciaDisponible();

        assertThat(resultado.getGananciaDisponibleJefe()).isNegative();
    }

    // --- 4.6: modo repartoSobreVentasColega = true (mismo patrón que
    // RendicionColegaLiquidacionModoColegaTest, ahora acumulado) ---

    @Test
    void obtenerGananciaDisponibleEnModoVentasColegaUsaSoloIngresosColega() {
        UnidadNegocio abono = abono();
        abono.setRepartoSobreVentasColega(true);
        abono.setPorcentajeRepartoColega(new BigDecimal("40"));
        unidadNegocioRepository.save(abono);

        GananciaDisponibleAbonoDTO antes = rendicionColegaService.obtenerGananciaDisponible();

        // Un gasto grande no debe afectar la compensación del colega en este modo (queda a cargo
        // del jefe), y un ingreso del colega sí debe entrar en su base al 40%.
        sembrarGastoManual(new BigDecimal("5000"));
        sembrarIngreso(CuentaAbono.COLEGA, new BigDecimal("1000"));

        GananciaDisponibleAbonoDTO despues = rendicionColegaService.obtenerGananciaDisponible();

        BigDecimal deltaTeoricaColega = despues.getGananciaTeoricaAcumuladaColega().subtract(antes.getGananciaTeoricaAcumuladaColega());
        assertThat(deltaTeoricaColega).isEqualByComparingTo(new BigDecimal("1000").multiply(new BigDecimal("40")).divide(BigDecimal.valueOf(100)));
    }

    private RetiroGananciaDTO ultimoCreado() {
        Page<RetiroGananciaDTO> historial = rendicionColegaService.obtenerHistorialRetirosGanancia(PageRequest.of(0, 20));
        return historial.getContent().stream()
                .filter(r -> OBSERVACION_TEST.equals(r.getObservacion()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No se encontró el retiro creado en el historial"));
    }
}
