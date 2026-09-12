package com.vivero.gestion.controllers;

import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.RendicionColega;
import com.vivero.gestion.repositories.RendicionColegaRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Hallazgo #3 de la auditoría de negocio-abono: `/api/abono/rendiciones/liquidacion` exponía
 * cuánto gana/tiene cada socio (LiquidacionAbonoDTO: ingresosJefe, ingresosColega,
 * compensacionTeorica) detrás de ESCRIBIR_VENTAS — el mismo permiso que tiene cualquiera que
 * carga una venta. Se exige LEER_FINANZAS (el permiso financiero que ya protege Finanzas.jsx),
 * dejando `registrarRendicion` (operativo: "anotar que el colega entregó plata") con
 * ESCRIBIR_VENTAS sin cambios.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RendicionColegaControllerPermisoTest {

    private static final String OBSERVACION_TEST =
            "Test de permiso — registrarRendicion no debe exigir LEER_FINANZAS";

    @Autowired
    private RendicionColegaController controller;

    @Autowired
    private RendicionColegaRepository rendicionRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
        CuentaAbonoContextHolder.clear();
        unidadNegocioRepository.findByNombre("Abono").ifPresent(abono ->
                rendicionRepository.findAllByUnidadNegocioIdOrderByFechaDescIdDesc(abono.getId(), PageRequest.of(0, 5))
                        .stream()
                        .filter(r -> OBSERVACION_TEST.equals(r.getObservacion()))
                        .forEach(rendicionRepository::delete));
    }

    private void autenticarCon(String... autoridades) {
        List<SimpleGrantedAuthority> authorities = List.of(autoridades).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                // Username real (sembrado en DataInitializer): RendicionColegaServiceImpl busca
                // el usuario autenticado por username para adjuntarlo a la RendicionColega.
                new UsernamePasswordAuthenticationToken("Sergio", null, authorities));
        // La dirección de la rendición se deriva de CuentaAbonoContextHolder (ver
        // RendicionColegaServiceImpl), que normalmente puebla CuentaAbonoFilter según el username
        // -- acá se llama al controller directo, sin pasar por el filtro, así que se fija a mano
        // para que coincida con "Sergio" (mismo patrón que CuentaAbonoFilterTest).
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);
    }

    @Test
    void liquidacionRechazaUsuarioSinPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS");

        String desde = LocalDateTime.now().minusDays(1).format(DateTimeFormatter.ISO_DATE_TIME);
        String hasta = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);

        assertThatThrownBy(() -> controller.obtenerLiquidacion(desde, hasta))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void liquidacionPermiteUsuarioConPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS", "LEER_FINANZAS");

        String desde = LocalDateTime.now().minusDays(1).format(DateTimeFormatter.ISO_DATE_TIME);
        String hasta = LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);

        assertDoesNotThrow(() -> {
            var response = controller.obtenerLiquidacion(desde, hasta);
            assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        });
    }

    // --- /liquidacion-acumulada: mismo permiso que /liquidacion (misma naturaleza financiera) ---

    @Test
    void liquidacionAcumuladaRechazaUsuarioSinPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS");

        assertThatThrownBy(() -> controller.obtenerLiquidacionAcumulada())
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void liquidacionAcumuladaPermiteUsuarioConPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS", "LEER_FINANZAS");

        assertDoesNotThrow(() -> {
            var response = controller.obtenerLiquidacionAcumulada();
            assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        });
    }

    @Test
    void registrarRendicionSigueFuncionandoSoloConEscribirVentas() {
        // El endpoint operativo (anotar que el colega entregó plata) no requiere el permiso
        // financiero: sigue protegido únicamente por ESCRIBIR_VENTAS.
        autenticarCon("ESCRIBIR_VENTAS");

        com.vivero.gestion.dto.RendicionRequestDTO request = new com.vivero.gestion.dto.RendicionRequestDTO();
        request.setMonto(new java.math.BigDecimal("1"));
        request.setObservacion(OBSERVACION_TEST);

        assertDoesNotThrow(() -> controller.registrarRendicion(request));
    }
}
