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

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * GET /api/ventas/{id} (botón "ver remito" del historial de cobros de Abono): exige
 * LEER_FINANZAS, el mismo permiso que ya protege esa pantalla -- no se amplía el acceso general
 * a ventas, sólo se habilita lo que esta pantalla puntual necesita.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class VentaControllerObtenerPorIdPermisoTest {

    @Autowired
    private VentaController controller;

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

        assertThatThrownBy(() -> controller.obtenerPorId(1L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void permiteUsuarioConPermisoFinancieroAunqueLaVentaNoExista() {
        autenticarCon("LEER_FINANZAS");

        // El permiso se resuelve ANTES que el cuerpo del método (proxy de @PreAuthorize): si el id
        // es inválido, la excepción que llega es la de "venta no encontrada", no AccessDenied.
        assertDoesNotThrow(() -> {
            try {
                controller.obtenerPorId(Long.MAX_VALUE);
            } catch (RuntimeException ex) {
                if (ex instanceof AccessDeniedException) throw ex;
                // Cualquier otra RuntimeException (venta no encontrada) confirma que sí pasó el
                // gate de permiso.
            }
        });
    }
}
