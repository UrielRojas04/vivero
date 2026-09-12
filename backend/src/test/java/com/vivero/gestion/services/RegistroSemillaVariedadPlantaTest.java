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
import com.vivero.gestion.models.VariedadPlanta;
import com.vivero.gestion.repositories.RegistroSemillaRepository;
import com.vivero.gestion.repositories.VariedadPlantaRepository;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pedido del dueño (2026-09-04): agregar VariedadPlanta opcional a RegistroSemilla, con el
 * mismo patrón "buscar o escribir libre" que ya usa el campo cliente/nombreQuienTrajo -- al
 * vincular una variedad del catálogo, descripcionSemilla se autocompleta con su nombre
 * (snapshot, no referencia viva).
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RegistroSemillaVariedadPlantaTest {

    @Autowired
    private RegistroSemillaService registroSemillaService;

    @Autowired
    private RegistroSemillaRepository registroSemillaRepository;

    @Autowired
    private VariedadPlantaRepository variedadPlantaRepository;

    private Long registroId;
    private Long variedadId;

    @AfterEach
    void limpiar() {
        // El soft-delete de RegistroSemilla (@SQLDelete) no limpia la FK hacia
        // VariedadPlanta -- hay que desvincularla a mano antes, si no la fila borrada
        // lógicamente sigue bloqueando el delete real de la variedad de prueba.
        if (registroId != null) {
            registroSemillaRepository.findById(registroId).ifPresent(r -> {
                r.setVariedadPlanta(null);
                registroSemillaRepository.save(r);
            });
            registroSemillaRepository.deleteById(registroId);
        }
        if (variedadId != null) variedadPlantaRepository.deleteById(variedadId);
        registroId = null;
        variedadId = null;
    }

    private Long crearVariedad(String nombre) {
        VariedadPlanta vp = new VariedadPlanta();
        vp.setNombre(nombre);
        VariedadPlanta saved = variedadPlantaRepository.save(vp);
        variedadId = saved.getId();
        return saved.getId();
    }

    private RegistroSemillaDTO dtoMinimoValido() {
        RegistroSemillaDTO dto = new RegistroSemillaDTO();
        dto.setFechaRecepcion(LocalDate.now());
        dto.setLote("TEST-VARIEDAD-" + System.nanoTime());
        dto.setNombreQuienTrajo("Cliente Test Variedad");
        dto.setDescripcionSemilla("texto libre inicial");
        dto.setCantidad(BigDecimal.valueOf(500));
        dto.setUnidadCantidad(UnidadCantidadSemilla.SEMILLAS);
        return dto;
    }

    @Test
    void vincularVariedadAutocompletaLaDescripcionConSuNombre() {
        Long variedadId = crearVariedad("Tomate Juliet");
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setVariedadPlantaId(variedadId);

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, null);
        registroId = creado.getId();

        assertThat(creado.getVariedadPlantaId()).isEqualTo(variedadId);
        assertThat(creado.getDescripcionSemilla()).isEqualTo("Tomate Juliet");
    }

    @Test
    void sinVariedadUsaElTextoLibreTalCual() {
        // Triangulación: sin variedadPlantaId, se comporta exactamente como antes de este
        // change -- descripcionSemilla queda con lo que el usuario escribió.
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setDescripcionSemilla("Pimiento camino Real");

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, null);
        registroId = creado.getId();

        assertThat(creado.getVariedadPlantaId()).isNull();
        assertThat(creado.getDescripcionSemilla()).isEqualTo("Pimiento camino Real");
    }

    @Test
    void editarParaQuitarLaVariedadVinculadaVuelveATextoLibre() {
        Long variedadId = crearVariedad("Kimba F1");
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setVariedadPlantaId(variedadId);
        RegistroSemillaDTO creado = registroSemillaService.crear(dto, null);
        registroId = creado.getId();

        RegistroSemillaDTO edicion = dtoMinimoValido();
        edicion.setVariedadPlantaId(null);
        edicion.setDescripcionSemilla("Variedad sin catalogar");

        RegistroSemillaDTO actualizado = registroSemillaService.actualizar(registroId, edicion);

        assertThat(actualizado.getVariedadPlantaId()).isNull();
        assertThat(actualizado.getDescripcionSemilla()).isEqualTo("Variedad sin catalogar");
    }
}
