package com.vivero.gestion.services;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import com.vivero.gestion.dto.RegistroSemillaDTO;
import com.vivero.gestion.models.EstadoRegistroSemilla;
import com.vivero.gestion.models.UnidadCantidadSemilla;
import com.vivero.gestion.repositories.RegistroSemillaRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Change trazabilidad-semillas-siembras (2026-09-04): botón "Consumir" -- transición manual y
 * terminal de RegistroSemilla.estado a CONSUMIDA (tarea 2.5).
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RegistroSemillaConsumirTest {

    @Autowired
    private RegistroSemillaService registroSemillaService;

    @Autowired
    private RegistroSemillaRepository registroSemillaRepository;

    private Long registroId;

    @AfterEach
    void limpiar() {
        if (registroId != null) registroSemillaRepository.deleteById(registroId);
        registroId = null;
    }

    private Long crearRegistroSemilla() {
        RegistroSemillaDTO dto = new RegistroSemillaDTO();
        dto.setFechaRecepcion(LocalDate.now());
        dto.setLote("TEST-CONSUMIR-" + System.nanoTime());
        dto.setNombreQuienTrajo("Cliente Test Consumir");
        dto.setDescripcionSemilla("Semilla test consumir");
        dto.setCantidad(BigDecimal.valueOf(500));
        dto.setUnidadCantidad(UnidadCantidadSemilla.SEMILLAS);
        RegistroSemillaDTO creado = registroSemillaService.crear(dto, null);
        registroId = creado.getId();
        return creado.getId();
    }

    @Test
    void nuevoRegistroNaceEnEstadoSinSembrar() {
        Long id = crearRegistroSemilla();
        RegistroSemillaDTO registro = registroSemillaService.obtenerPorId(id);
        assertThat(registro.getEstado()).isEqualTo(EstadoRegistroSemilla.SIN_SEMBRAR);
    }

    @Test
    void consumirCambiaElEstadoAConsumida() {
        Long id = crearRegistroSemilla();

        RegistroSemillaDTO resultado = registroSemillaService.consumir(id);

        assertThat(resultado.getEstado()).isEqualTo(EstadoRegistroSemilla.CONSUMIDA);
        assertThat(registroSemillaService.obtenerPorId(id).getEstado()).isEqualTo(EstadoRegistroSemilla.CONSUMIDA);
    }

    @Test
    void consumirUnRegistroYaConsumidoRechaza() {
        // Triangulación: CONSUMIDA es terminal, no se puede volver a consumir ni revertir.
        Long id = crearRegistroSemilla();
        registroSemillaService.consumir(id);

        assertThatThrownBy(() -> registroSemillaService.consumir(id))
                .isInstanceOf(RuntimeException.class);
    }
}
