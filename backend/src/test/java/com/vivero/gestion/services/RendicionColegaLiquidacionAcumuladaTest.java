package com.vivero.gestion.services;

import com.vivero.gestion.dto.GastoDTO;
import com.vivero.gestion.dto.LiquidacionAbonoDTO;
import com.vivero.gestion.dto.RendicionRequestDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.Gasto;
import com.vivero.gestion.models.Pago;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.models.enums.EstadoPago;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.GastoRepository;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.RendicionColegaRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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

/**
 * Pedido directo del dueño (sesión de chat, no un doc previo): la pantalla "Finanzas" de Abono
 * (`LiquidacionAbono.jsx`, `/abono/liquidacion`) está atada a un mes/año seleccionado
 * (`RendicionColegaServiceImpl.obtenerLiquidacion(desde, hasta)`), y Sergio/Pablo no operan mes a
 * mes -- a veces cobran su ganancia recién a las 2-3 meses. Quieren ver "en qué estado financiero
 * están" en cualquier momento, sin filtro de mes ni de año. Exclusivo de Abono (no toca Vivero ni
 * Herramientas, y no toca la pestaña "Rendiciones" de RendicionColega.jsx, que sigue mes a mes).
 *
 * `obtenerLiquidacionAcumulada()` es la versión sin filtro de fecha de `obtenerLiquidacion`: mismo
 * DTO (`LiquidacionAbonoDTO`), misma fórmula de reparto (`calcularReparticion`, ya compartida desde
 * la tarea 4.7 de retiro-ganancia-abono), sólo que con rango época (2000-01-01) -> ahora en vez de
 * un mes elegido por el usuario -- mismo truco que ya usan `obtenerSaldoCajaColega()` y
 * `obtenerGananciaDisponible()`.
 *
 * Patrón antes/después (mismo criterio que RetiroGananciaAbonoServiceTest, grupo 4): la base es
 * real y compartida, así que se aserta el DELTA causado por los datos sembrados en este test, nunca
 * un valor absoluto. Las fechas sembradas están deliberadamente varios meses en el pasado para
 * probar que el método NO está acotado al mes actual -- si lo estuviera, el delta esperado no
 * aparecería.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RendicionColegaLiquidacionAcumuladaTest {

    private static final String CONCEPTO_GASTO_TEST = "Test gasto manual liquidacion acumulada";
    private static final String OBSERVACION_RENDICION_TEST = "Test rendicion liquidacion acumulada";
    private static final LocalDateTime FECHA_VIEJA = LocalDateTime.now().minusMonths(6);

    @Autowired
    private RendicionColegaService rendicionService;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private PagoRepository pagoRepository;

    @Autowired
    private GastoRepository gastoRepository;

    @Autowired
    private GastoService gastoService;

    @Autowired
    private RendicionColegaRepository rendicionColegaRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private final List<Long> ventasCreadas = new ArrayList<>();
    private final List<Long> clientesCreados = new ArrayList<>();
    private final List<Long> gastosCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        for (Long id : ventasCreadas) ventaRepository.deleteById(id);
        ventasCreadas.clear();
        for (Long id : clientesCreados) clienteRepository.deleteById(id);
        clientesCreados.clear();
        gastoRepository.findAll().stream()
                .filter(g -> CONCEPTO_GASTO_TEST.equals(g.getConcepto()))
                .forEach(g -> gastoRepository.deleteById(g.getId()));
        gastosCreados.clear();
        UnidadNegocio abono = abono();
        rendicionColegaRepository.findAllByUnidadNegocioIdOrderByFechaDescIdDesc(abono.getId(), PageRequest.of(0, 200))
                .stream()
                .filter(r -> OBSERVACION_RENDICION_TEST.equals(r.getObservacion()))
                .forEach(r -> rendicionColegaRepository.deleteById(r.getId()));
        UnidadNegocioContextHolder.clear();
        CuentaAbonoContextHolder.clear();
        SecurityContextHolder.clearContext();
    }

    private UnidadNegocio abono() {
        return unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Abono sembrada"));
    }

    /** Venta + pago acreditado de la cuenta indicada, con una fecha explícita (no "ahora"). */
    private void sembrarIngresoConFecha(CuentaAbono cuenta, BigDecimal monto, LocalDateTime fecha) {
        Cliente cliente = new Cliente();
        cliente.setNombreRazonSocial("Cliente Liquidacion Acumulada " + UUID.randomUUID());
        cliente.setUnidadNegocio(abono());
        Cliente clienteGuardado = clienteRepository.save(cliente);
        clientesCreados.add(clienteGuardado.getId());

        Venta v = new Venta();
        v.setUnidadNegocio(abono());
        v.setCuentaAbono(cuenta);
        v.setCliente(clienteGuardado);
        v.setSubtotal(monto);
        v.setTotalFinal(monto);
        v.setEstadoPago("PAGADO");
        v.setFecha(fecha);
        Venta guardada = ventaRepository.save(v);
        ventasCreadas.add(guardada.getId());

        Pago p = new Pago();
        p.setVenta(guardada);
        p.setCuentaAbono(cuenta);
        p.setMonto(monto);
        p.setMetodoPago("EFECTIVO");
        p.setEstado(EstadoPago.ACREDITADO);
        p.setFecha(fecha);
        pagoRepository.save(p);
    }

    private void sembrarGastoManualConFecha(BigDecimal monto, LocalDateTime fecha) {
        Gasto g = new Gasto();
        g.setUnidadNegocio(abono());
        g.setMonto(monto);
        g.setFecha(fecha);
        g.setConcepto(CONCEPTO_GASTO_TEST);
        Gasto guardado = gastoRepository.save(g);
        gastosCreados.add(guardado.getId());
    }

    private void registrarRendicionConFecha(String username, CuentaAbono cuenta, BigDecimal monto, LocalDateTime fecha) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null,
                        List.of(new SimpleGrantedAuthority("ESCRIBIR_VENTAS"))));
        CuentaAbonoContextHolder.setCuentaAbono(cuenta);

        RendicionRequestDTO req = new RendicionRequestDTO();
        req.setMonto(monto);
        req.setObservacion(OBSERVACION_RENDICION_TEST);
        req.setMedioPago("EFECTIVO");
        req.setFecha(fecha.toLocalDate().toString());

        rendicionService.registrarRendicion(req);

        SecurityContextHolder.clearContext();
        CuentaAbonoContextHolder.clear();
    }

    @Test
    void obtenerLiquidacionAcumuladaIncluyeUnIngresoDeHaceSeisMeses() {
        LiquidacionAbonoDTO antes = rendicionService.obtenerLiquidacionAcumulada();

        BigDecimal monto = new BigDecimal("15000");
        sembrarIngresoConFecha(CuentaAbono.JEFE, monto, FECHA_VIEJA);

        LiquidacionAbonoDTO despues = rendicionService.obtenerLiquidacionAcumulada();

        // Si el método estuviera acotado al mes actual (como obtenerLiquidacion(mesActual)), este
        // delta sería cero -- la fecha sembrada está 6 meses atrás.
        assertThat(despues.getVentasJefe().subtract(antes.getVentasJefe())).isEqualByComparingTo(monto);
        assertThat(despues.getIngresosJefe().subtract(antes.getIngresosJefe())).isEqualByComparingTo(monto);
    }

    @Test
    void obtenerLiquidacionAcumuladaSumaUnGastoManualDeHaceSeisMeses() {
        LiquidacionAbonoDTO antes = rendicionService.obtenerLiquidacionAcumulada();

        BigDecimal monto = new BigDecimal("2345");
        sembrarGastoManualConFecha(monto, FECHA_VIEJA);

        LiquidacionAbonoDTO despues = rendicionService.obtenerLiquidacionAcumulada();

        assertThat(despues.getGastosInsumos().subtract(antes.getGastosInsumos())).isEqualByComparingTo(monto);
    }

    @Test
    void obtenerLiquidacionAcumuladaRestaUnaRendicionDeHaceSeisMesesDelSaldoDeCaja() {
        LiquidacionAbonoDTO antes = rendicionService.obtenerLiquidacionAcumulada();

        BigDecimal monto = new BigDecimal("777");
        registrarRendicionConFecha("Pablo", CuentaAbono.COLEGA, monto, FECHA_VIEJA);

        LiquidacionAbonoDTO despues = rendicionService.obtenerLiquidacionAcumulada();

        assertThat(despues.getRendicionesEntregadas().subtract(antes.getRendicionesEntregadas()))
                .isEqualByComparingTo(monto);
        assertThat(despues.getSaldoCajaColega().subtract(antes.getSaldoCajaColega()))
                .isEqualByComparingTo(monto.negate());
    }
}
