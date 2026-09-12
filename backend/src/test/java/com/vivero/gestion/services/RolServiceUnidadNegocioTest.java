package com.vivero.gestion.services;

import com.vivero.gestion.dto.RolDTO;
import com.vivero.gestion.dto.RolRequestDTO;
import com.vivero.gestion.models.Rol;
import com.vivero.gestion.repositories.RolRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cambio de modelo de datos: campo real `unidadNegocio` en Rol (reemplaza la heurística por
 * permisos que filtraba roles por unidad en UsuariosAdmin.jsx — ver contexto del pedido del
 * dueño, 2026-09-03). Base real (sin mocks de DB), mismo patrón que ProductoLiberarCodigoBarraTest:
 * PostgreSQL de desarrollo (localhost:5433/vivero_db).
 *
 * Cada test crea sus propios roles con nombre único (sufijo UUID) y los borra en @AfterEach.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RolServiceUnidadNegocioTest {

    @Autowired
    private RolService rolService;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private final List<Long> rolesCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        // rolService.delete() ya está @Transactional (RolServiceImpl) y hace exactamente el
        // borrado que necesitamos (asociaciones de permisos + rol).
        for (Long id : rolesCreados) {
            if (rolRepository.findById(id).isPresent()) {
                rolService.delete(id);
            }
        }
        rolesCreados.clear();
    }

    private Long herramientasId() {
        return unidadNegocioRepository.findByNombre("Herramientas")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Herramientas sembrada"))
                .getId();
    }

    private Long viveroId() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"))
                .getId();
    }

    private String nombreUnico(String prefijo) {
        return prefijo + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    // Crear un rol con unidadNegocioId de una unidad concreta -> el DTO devuelto trae ese
    // unidadNegocioId/unidadNegocioNombre correctos.
    @Test
    void crearRolConUnidadConcretaDevuelveIdYNombreDeEsaUnidad() {
        Long herramientasId = herramientasId();
        RolRequestDTO dto = RolRequestDTO.builder()
                .nombre(nombreUnico("ROL_HERRAMIENTAS"))
                .permisoIds(Collections.emptyList())
                .unidadNegocioId(herramientasId)
                .build();

        RolDTO creado = rolService.create(dto);
        rolesCreados.add(creado.getId());

        assertThat(creado.getUnidadNegocioId()).isEqualTo(herramientasId);
        assertThat(creado.getUnidadNegocioNombre()).isEqualTo("Herramientas");
    }

    // Crear un rol con unidadNegocioId = null -> el DTO devuelto trae ambos campos en null
    // (rol global).
    @Test
    void crearRolConUnidadNullDevuelveAmbosCamposEnNull() {
        RolRequestDTO dto = RolRequestDTO.builder()
                .nombre(nombreUnico("ROL_GLOBAL"))
                .permisoIds(Collections.emptyList())
                .unidadNegocioId(null)
                .build();

        RolDTO creado = rolService.create(dto);
        rolesCreados.add(creado.getId());

        assertThat(creado.getUnidadNegocioId()).isNull();
        assertThat(creado.getUnidadNegocioNombre()).isNull();
    }

    // Actualizar un rol existente cambiándole la unidad (de una unidad concreta a otra, o a
    // null) -> el cambio se refleja al releer.
    @Test
    void actualizarRolCambiaUnidadYSeReflejaAlReleer() {
        Long herramientasId = herramientasId();
        Long viveroId = viveroId();

        RolRequestDTO dtoCrear = RolRequestDTO.builder()
                .nombre(nombreUnico("ROL_CAMBIA"))
                .permisoIds(Collections.emptyList())
                .unidadNegocioId(herramientasId)
                .build();
        RolDTO creado = rolService.create(dtoCrear);
        rolesCreados.add(creado.getId());

        // Cambiar de Herramientas a Vivero
        RolRequestDTO dtoActualizarAVivero = RolRequestDTO.builder()
                .nombre(creado.getNombre())
                .permisoIds(Collections.emptyList())
                .unidadNegocioId(viveroId)
                .build();
        rolService.update(creado.getId(), dtoActualizarAVivero);

        RolDTO releidoVivero = rolService.getById(creado.getId());
        assertThat(releidoVivero.getUnidadNegocioId()).isEqualTo(viveroId);
        assertThat(releidoVivero.getUnidadNegocioNombre()).isEqualTo("Vivero");

        // Cambiar de Vivero a null (rol global)
        RolRequestDTO dtoActualizarANull = RolRequestDTO.builder()
                .nombre(creado.getNombre())
                .permisoIds(Collections.emptyList())
                .unidadNegocioId(null)
                .build();
        rolService.update(creado.getId(), dtoActualizarANull);

        RolDTO releidoGlobal = rolService.getById(creado.getId());
        assertThat(releidoGlobal.getUnidadNegocioId()).isNull();
        assertThat(releidoGlobal.getUnidadNegocioNombre()).isNull();
    }
}
