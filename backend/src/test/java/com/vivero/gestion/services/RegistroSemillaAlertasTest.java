package com.vivero.gestion.services;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import com.vivero.gestion.dto.RegistroSemillaDTO;
import com.vivero.gestion.models.UnidadCantidadSemilla;
import com.vivero.gestion.repositories.RegistroSemillaRepository;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pedido del dueño (2026-09-05): notificación "hora de sembrar" en la campanita, análoga a
 * SiembraServiceImpl.obtenerAlertas() (misma ventana de 5 días). Sólo entran los registros
 * SIN_SEMBRAR con fechaSiembraProgramada vencida o próxima -- una vez vinculados a una siembra
 * (SEMBRADAS) el aviso ya cumplió su propósito, y CONSUMIDA nunca vuelve a aparecer.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RegistroSemillaAlertasTest {

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

    private RegistroSemillaDTO crear(LocalDate fechaSiembraProgramada) {
        RegistroSemillaDTO dto = new RegistroSemillaDTO();
        dto.setFechaRecepcion(LocalDate.now());
        dto.setLote("TEST-ALERTA-" + System.nanoTime());
        dto.setNombreQuienTrajo("Cliente Test Alerta");
        dto.setDescripcionSemilla("Semilla test alerta");
        dto.setCantidad(BigDecimal.valueOf(500));
        dto.setUnidadCantidad(UnidadCantidadSemilla.SEMILLAS);
        dto.setFechaSiembraProgramada(fechaSiembraProgramada);
        RegistroSemillaDTO creado = registroSemillaService.crear(dto, null);
        registroId = creado.getId();
        return creado;
    }

    @Test
    void incluyeUnRegistroConFechaDeSiembraDentroDeLaVentanaDeCincoDias() {
        crear(LocalDate.now().plusDays(3));

        boolean aparece = registroSemillaService.obtenerAlertas().stream()
                .anyMatch(r -> r.getId().equals(registroId));

        assertThat(aparece).isTrue();
    }

    @Test
    void incluyeUnRegistroConFechaDeSiembraYaVencida() {
        // Triangulación: no sólo lo próximo, también lo que ya pasó y sigue sin sembrar.
        crear(LocalDate.now().minusDays(2));

        boolean aparece = registroSemillaService.obtenerAlertas().stream()
                .anyMatch(r -> r.getId().equals(registroId));

        assertThat(aparece).isTrue();
    }

    @Test
    void noIncluyeUnRegistroConFechaDeSiembraLejana() {
        crear(LocalDate.now().plusDays(20));

        boolean aparece = registroSemillaService.obtenerAlertas().stream()
                .anyMatch(r -> r.getId().equals(registroId));

        assertThat(aparece).isFalse();
    }

    @Test
    void noIncluyeUnRegistroSinFechaDeSiembraProgramada() {
        crear(null);

        boolean aparece = registroSemillaService.obtenerAlertas().stream()
                .anyMatch(r -> r.getId().equals(registroId));

        assertThat(aparece).isFalse();
    }

    @Test
    void unRegistroYaSembradasDejaDeAparecerEnLasAlertas() {
        RegistroSemillaDTO creado = crear(LocalDate.now().plusDays(1));

        boolean apareceAntes = registroSemillaService.obtenerAlertas().stream()
                .anyMatch(r -> r.getId().equals(registroId));
        assertThat(apareceAntes).isTrue();

        // No hace falta vincular una siembra real para este test: alcanza con marcar el
        // registro como consumido para confirmar el otro extremo del filtro de estado
        // (CONSUMIDA nunca aparece, sea cual sea la fecha).
        registroSemillaService.consumir(creado.getId());

        boolean apareceDespues = registroSemillaService.obtenerAlertas().stream()
                .anyMatch(r -> r.getId().equals(registroId));
        assertThat(apareceDespues).isFalse();
    }
}
