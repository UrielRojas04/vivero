package com.vivero.gestion.services;

import com.vivero.gestion.dto.LiquidacionAbonoDTO;
import com.vivero.gestion.dto.RendicionColegaDTO;
import com.vivero.gestion.dto.RendicionRequestDTO;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.repositories.RendicionColegaRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import org.junit.jupiter.api.AfterEach;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Cambio bidireccional de rendiciones (Colega <-> Jefe), simplificado 2026-09-04: la dirección ya
 * no se elige en un selector -- se deriva automáticamente de la cuenta (Jefe/Colega) del usuario
 * autenticado, vía CuentaAbonoContextHolder (mismo mecanismo que ya usa el resto de Abono; ver
 * CuentaAbonoFilter). Logueado como Sergio -> siempre JEFE_A_COLEGA. Logueado como
 * Pablo -> siempre COLEGA_A_JEFE.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RendicionColegaDireccionTest {

    private static final String OBSERVACION_TEST = "Test direccion bidireccional rendicion";

    @Autowired
    private RendicionColegaService rendicionService;

    @Autowired
    private RendicionColegaRepository rendicionRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @AfterEach
    void limpiar() {
        unidadNegocioRepository.findByNombre("Abono").ifPresent(abono ->
                rendicionRepository.findAllByUnidadNegocioIdOrderByFechaDescIdDesc(abono.getId(), PageRequest.of(0, 50))
                        .stream()
                        .filter(r -> OBSERVACION_TEST.equals(r.getObservacion()))
                        .forEach(r -> rendicionRepository.deleteById(r.getId())));
        SecurityContextHolder.clearContext();
        CuentaAbonoContextHolder.clear();
    }

    private void autenticarComo(String username, CuentaAbono cuenta) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null,
                        List.of(new SimpleGrantedAuthority("ESCRIBIR_VENTAS"))));
        CuentaAbonoContextHolder.setCuentaAbono(cuenta);
    }

    private RendicionRequestDTO buildRequest(String monto) {
        RendicionRequestDTO req = new RendicionRequestDTO();
        req.setMonto(new BigDecimal(monto));
        req.setObservacion(OBSERVACION_TEST);
        req.setMedioPago("EFECTIVO");
        return req;
    }

    @Test
    void logueadoComoJefeLaRendicionEsSiempreJefeAColega() {
        autenticarComo("Sergio", CuentaAbono.JEFE);
        rendicionService.registrarRendicion(buildRequest("500"));

        RendicionColegaDTO creada = ultimaCreada();
        assertThat(creada.getDireccion()).isEqualTo("JEFE_A_COLEGA");
    }

    @Test
    void logueadoComoColegaLaRendicionEsSiempreColegaAJefe() {
        // Triangulación: la otra cuenta produce la otra dirección.
        autenticarComo("Pablo", CuentaAbono.COLEGA);
        rendicionService.registrarRendicion(buildRequest("500"));

        RendicionColegaDTO creada = ultimaCreada();
        assertThat(creada.getDireccion()).isEqualTo("COLEGA_A_JEFE");
    }

    @Test
    void netoDeLiquidacionRestaJefeAColegaDelColegaAJefe() {
        LocalDateTime desde = LocalDateTime.now().minusDays(1);
        LocalDateTime hasta = LocalDateTime.now().plusDays(1);

        autenticarComo("Pablo", CuentaAbono.COLEGA);
        LiquidacionAbonoDTO antes = rendicionService.obtenerLiquidacion(desde, hasta);

        rendicionService.registrarRendicion(buildRequest("1000"));
        autenticarComo("Sergio", CuentaAbono.JEFE);
        rendicionService.registrarRendicion(buildRequest("300"));

        LiquidacionAbonoDTO despues = rendicionService.obtenerLiquidacion(desde, hasta);

        // Neto esperado: +1000 (Colega->Jefe) - 300 (Jefe->Colega) = +700 sobre lo previo
        assertThat(despues.getRendicionesEntregadas())
                .isEqualByComparingTo(antes.getRendicionesEntregadas().add(new BigDecimal("700")));
    }

    @Test
    void sinCuentaAbonoResueltaRechazaConMensajeClaro() {
        // Ni jefe ni colega: CuentaAbonoContextHolder queda vacío (mismo criterio que
        // CuentaAbonoFilter, nunca cae en JEFE por defecto).
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("empleado-nuevo@vivero.com", null,
                        List.of(new SimpleGrantedAuthority("ESCRIBIR_VENTAS"))));

        assertThatThrownBy(() -> rendicionService.registrarRendicion(buildRequest("100")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cuenta");
    }

    @Test
    void historialDevuelveDireccionYMedioPagoDeUnaRendicionRecienCreada() {
        autenticarComo("Sergio", CuentaAbono.JEFE);
        rendicionService.registrarRendicion(buildRequest("42"));

        RendicionColegaDTO creada = ultimaCreada();

        assertThat(creada.getDireccion()).isEqualTo("JEFE_A_COLEGA");
        assertThat(creada.getMedioPago()).isEqualTo("EFECTIVO");
    }

    private RendicionColegaDTO ultimaCreada() {
        Page<RendicionColegaDTO> historial = rendicionService.obtenerHistorialRendiciones(PageRequest.of(0, 10));
        return historial.getContent().stream()
                .filter(r -> OBSERVACION_TEST.equals(r.getObservacion()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No se encontró la rendición creada en el historial"));
    }
}
