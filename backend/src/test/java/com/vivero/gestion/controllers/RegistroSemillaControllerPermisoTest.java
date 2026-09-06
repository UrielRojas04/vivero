package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.RegistroSemillaDTO;
import com.vivero.gestion.models.UnidadCantidadSemilla;
import com.vivero.gestion.repositories.RegistroSemillaRepository;
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
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Cambio de alcance de registro-semillas-clientes, pedido del dueño el 2026-09-03: los permisos
 * de este controller dejan de reutilizar LEER_SIEMBRAS/ESCRIBIR_SIEMBRAS y pasan a ser
 * INDEPENDIENTES (LEER_REGISTRO_SEMILLAS / ESCRIBIR_REGISTRO_SEMILLAS, PermisoEnum IDs 19/20).
 * Este test demuestra esa independencia: tener acceso a Siembras ya NO alcanza para acceder a
 * Registro de Semillas, y viceversa sería el caso simétrico (no ejercido acá porque no hay
 * endpoints de Siembras que dependan de este permiso).
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RegistroSemillaControllerPermisoTest {

    @Autowired
    private RegistroSemillaController controller;

    @Autowired
    private RegistroSemillaRepository registroSemillaRepository;

    private Long registroCreadoId;

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
        if (registroCreadoId != null) {
            registroSemillaRepository.deleteById(registroCreadoId);
            registroCreadoId = null;
        }
    }

    private void autenticarCon(String... autoridades) {
        List<SimpleGrantedAuthority> authorities = List.of(autoridades).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null, authorities));
    }

    private RegistroSemillaDTO dtoMinimoValido() {
        RegistroSemillaDTO dto = new RegistroSemillaDTO();
        dto.setFechaRecepcion(LocalDate.now());
        dto.setLote("PERM-TEST-" + System.nanoTime());
        dto.setNombreQuienTrajo("Test Permiso");
        dto.setDescripcionSemilla("Semilla de prueba de permisos");
        dto.setCantidad(BigDecimal.valueOf(1));
        dto.setUnidadCantidad(UnidadCantidadSemilla.SEMILLAS);
        return dto;
    }

    @Test
    void soloPermisosDeSiembrasNoAlcanzanParaLeerRegistroSemillas() {
        // Tener LEER_SIEMBRAS + ESCRIBIR_SIEMBRAS (y ningún permiso de registro de semillas) ya
        // no da acceso: los permisos son independientes desde 2026-09-03.
        autenticarCon("LEER_SIEMBRAS", "ESCRIBIR_SIEMBRAS");

        assertThatThrownBy(() -> controller.obtenerTodos())
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void soloPermisosDeSiembrasNoAlcanzanParaEscribirRegistroSemillas() {
        autenticarCon("LEER_SIEMBRAS", "ESCRIBIR_SIEMBRAS");

        assertThatThrownBy(() -> controller.crear(dtoMinimoValido(), null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void soloLeerRegistroSemillasPuedeLeerPeroNoCrear() {
        autenticarCon("LEER_REGISTRO_SEMILLAS");

        assertDoesNotThrow(() -> controller.obtenerTodos());
        assertThatThrownBy(() -> controller.crear(dtoMinimoValido(), null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void leerYEscribirRegistroSemillasPuedeCrear() {
        autenticarCon("LEER_REGISTRO_SEMILLAS", "ESCRIBIR_REGISTRO_SEMILLAS");

        var response = assertDoesNotThrow(() -> controller.crear(dtoMinimoValido(), null));
        registroCreadoId = response.getBody().getId();
    }
}
