package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.RetiroGananciaRequestDTO;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Grupo 5 de tasks.md de retiro-ganancia-abono: los tres endpoints nuevos bajo
 * /api/abono/rendiciones/retiros-ganancia y /ganancia-disponible exigen LEER_FINANZAS -- más
 * sensible que ESCRIBIR_VENTAS (que sigue protegiendo registrarRendicion, sin cambios), porque
 * es plata personal, no una operación de venta.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RetiroGananciaAbonoControllerPermisoTest {

    @Autowired
    private RendicionColegaController controller;

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
        CuentaAbonoContextHolder.clear();
    }

    private void autenticarCon(String... autoridades) {
        List<SimpleGrantedAuthority> authorities = List.of(autoridades).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null, authorities));
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);
    }

    private RetiroGananciaRequestDTO buildRequest() {
        RetiroGananciaRequestDTO req = new RetiroGananciaRequestDTO();
        req.setMonto(new BigDecimal("1"));
        req.setObservacion("Test permiso retiro ganancia (no debe persistir de verdad)");
        return req;
    }

    @Test
    void registrarRetiroRechazaUsuarioSinPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS");

        assertThatThrownBy(() -> controller.registrarRetiroGanancia(buildRequest()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void historialRetirosRechazaUsuarioSinPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS");

        assertThatThrownBy(() -> controller.obtenerHistorialRetirosGanancia(0, 10))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void gananciaDisponibleRechazaUsuarioSinPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS");

        assertThatThrownBy(() -> controller.obtenerGananciaDisponible())
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void historialRetirosPermiteUsuarioConPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS", "LEER_FINANZAS");

        assertDoesNotThrow(() -> {
            var response = controller.obtenerHistorialRetirosGanancia(0, 10);
            assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        });
    }

    @Test
    void gananciaDisponiblePermiteUsuarioConPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS", "LEER_FINANZAS");

        assertDoesNotThrow(() -> controller.obtenerGananciaDisponible());
    }
}
