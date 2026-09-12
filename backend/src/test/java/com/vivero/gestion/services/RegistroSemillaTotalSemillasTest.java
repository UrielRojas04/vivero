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
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.RegistroSemillaRepository;
import com.vivero.gestion.repositories.UsuarioRepository;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Change registro-semillas-clientes, tarea 4.3: totalSemillas es derivado en mapToDTO
 * (cantidad × contenidoPorSobre sólo cuando unidadCantidad == SOBRES y contenidoPorSobre !=
 * null) y NUNCA se persiste (tarea 2.6). Base real, sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RegistroSemillaTotalSemillasTest {

    @Autowired
    private RegistroSemillaService registroSemillaService;

    @Autowired
    private RegistroSemillaRepository registroSemillaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Long registroId;

    @AfterEach
    void limpiar() {
        if (registroId != null) registroSemillaRepository.deleteById(registroId);
        registroId = null;
    }

    private Long obtenerUsuarioJefeId() {
        Usuario jefe = usuarioRepository.findByUsername("Sergio")
                .orElseThrow(() -> new IllegalStateException("Falta usuario jefe sembrado"));
        return jefe.getId();
    }

    private RegistroSemillaDTO dtoBase() {
        RegistroSemillaDTO dto = new RegistroSemillaDTO();
        dto.setFechaRecepcion(LocalDate.now());
        dto.setLote("043");
        dto.setNombreQuienTrajo("Rolando Vidaurre");
        dto.setDescripcionSemilla("Tomate Juliet");
        return dto;
    }

    @Test
    void sieteSobresPorMilCalculaTotalSieteMil() {
        RegistroSemillaDTO dto = dtoBase();
        dto.setUnidadCantidad(UnidadCantidadSemilla.SOBRES);
        dto.setCantidad(BigDecimal.valueOf(7));
        dto.setContenidoPorSobre(1000);

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, obtenerUsuarioJefeId());
        registroId = creado.getId();

        assertThat(creado.getTotalSemillas()).isEqualByComparingTo(BigDecimal.valueOf(7000));
    }

    @Test
    void nueveSobresSinContenidoPorSobreDejaTotalNulo() {
        RegistroSemillaDTO dto = dtoBase();
        dto.setUnidadCantidad(UnidadCantidadSemilla.SOBRES);
        dto.setCantidad(BigDecimal.valueOf(9));
        dto.setContenidoPorSobre(null);

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, obtenerUsuarioJefeId());
        registroId = creado.getId();

        assertThat(creado.getTotalSemillas()).isNull();
    }

    @Test
    void doceComaCincoGramosDejaTotalNuloYPreservaDecimalSinRedondear() {
        RegistroSemillaDTO dto = dtoBase();
        dto.setUnidadCantidad(UnidadCantidadSemilla.GRAMOS);
        dto.setCantidad(new BigDecimal("12.5"));

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, obtenerUsuarioJefeId());
        registroId = creado.getId();

        assertThat(creado.getTotalSemillas()).isNull();
        assertThat(creado.getCantidad()).isEqualByComparingTo(new BigDecimal("12.5"));
    }
}
