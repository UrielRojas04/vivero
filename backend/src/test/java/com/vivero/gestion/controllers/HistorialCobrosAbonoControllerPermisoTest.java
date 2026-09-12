package com.vivero.gestion.controllers;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Grupo 6 de tasks.md de historial-cobros-abono: GET /api/abono/cobros exige LEER_FINANZAS
 * (Decisión 5 de design.md), mismo permiso financiero que ya protege Cheques/Finanzas/
 * Liquidación de Abono. Mismo patrón que RendicionColegaControllerPermisoTest.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class HistorialCobrosAbonoControllerPermisoTest {

    @Autowired
    private HistorialCobrosAbonoController controller;

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    private void autenticarCon(String... autoridades) {
        List<SimpleGrantedAuthority> authorities = List.of(autoridades).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null, authorities));
    }

    @Test
    void rechazaUsuarioSinPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS");

        assertThatThrownBy(() -> controller.listarHistorial(0, 20, null, null, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void permiteUsuarioConPermisoFinanciero() {
        autenticarCon("ESCRIBIR_VENTAS", "LEER_FINANZAS");

        assertDoesNotThrow(() -> {
            var response = controller.listarHistorial(0, 20, null, null, null);
            assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        });
    }
}
