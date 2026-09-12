package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.SiembraDTO;
import com.vivero.gestion.models.TipoOrigenSiembra;
import com.vivero.gestion.repositories.SiembraRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Bug de seguridad corregido 2026-09-03 (pedido del dueño, cambio de alcance de
 * registro-semillas-clientes): SiembraController sólo exigía LEER_SIEMBRAS a nivel de clase y
 * ningún método de escritura agregaba ESCRIBIR_SIEMBRAS, así que un usuario de solo lectura podía
 * crear, editar, borrar y finalizar siembras. Este test demuestra el bug corregido (rechazo de
 * escritura sin ESCRIBIR_SIEMBRAS) sin romper la lectura, que sigue protegida únicamente por
 * LEER_SIEMBRAS.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class SiembraControllerPermisoTest {

    @Autowired
    private SiembraController controller;

    @Autowired
    private SiembraRepository siembraRepository;

    private Long siembraCreadaId;

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
        if (siembraCreadaId != null) {
            siembraRepository.deleteById(siembraCreadaId);
            siembraCreadaId = null;
        }
    }

    private void autenticarCon(String... autoridades) {
        List<SimpleGrantedAuthority> authorities = List.of(autoridades).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null, authorities));
    }

    private SiembraDTO dtoMinimoValido() {
        SiembraDTO dto = new SiembraDTO();
        dto.setTipoOrigen(TipoOrigenSiembra.SUELTO);
        dto.setNumeroSiembra("TEST-PERM-" + System.nanoTime());
        dto.setFechaSiembraInicio(LocalDate.now());
        return dto;
    }

    @Test
    void crearSiembraRechazaUsuarioConSoloLeerSiembras() {
        autenticarCon("LEER_SIEMBRAS");

        assertThatThrownBy(() -> controller.crearSiembra(dtoMinimoValido()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void eliminarSiembraRechazaUsuarioConSoloLeerSiembras() {
        // Triangulación: otro método de escritura distinto de crearSiembra. @PreAuthorize se
        // evalúa antes del cuerpo del método (proxy AOP), así que un id inexistente no interfiere.
        autenticarCon("LEER_SIEMBRAS");

        assertThatThrownBy(() -> controller.eliminarSiembra(-1L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void crearSiembraPermiteUsuarioConLeerYEscribirSiembras() {
        autenticarCon("LEER_SIEMBRAS", "ESCRIBIR_SIEMBRAS");

        var response = assertDoesNotThrow(() -> controller.crearSiembra(dtoMinimoValido()));
        siembraCreadaId = response.getBody().getId();
    }

    @Test
    void obtenerTodasSigueFuncionandoSoloConLeerSiembras() {
        // La lectura no se rompió: sigue protegida únicamente por LEER_SIEMBRAS.
        autenticarCon("LEER_SIEMBRAS");

        assertDoesNotThrow(() -> controller.obtenerTodas());
    }
}
