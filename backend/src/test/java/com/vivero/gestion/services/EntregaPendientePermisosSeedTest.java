package com.vivero.gestion.services;

import com.vivero.gestion.dto.PermisoDTO;
import com.vivero.gestion.models.PermisoEnum;
import com.vivero.gestion.models.Rol;
import com.vivero.gestion.repositories.RolRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Grupo 3 de tasks.md de entregas-pendientes-confirmacion-vivero (Decisión 8 de design.md):
 * `RolService.getAllPermisos()` expone los dos permisos nuevos sin tocar nada (enumera
 * `PermisoEnum.values()`); JEFE los recibe automáticamente (`EnumSet.allOf`); COLEGA (rol
 * exclusivo de Abono) los tiene explícitamente afuera en `DataInitializer`, mismo criterio que
 * `LEER_CONFIGURACION`. Base real (Postgres localhost:5433), sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class EntregaPendientePermisosSeedTest {

    @Autowired
    private RolService rolService;

    @Autowired
    private RolRepository rolRepository;

    // --- 3.3 TRIANGULATE ---
    @Test
    void getAllPermisosDevuelveLosDosPermisosNuevosConSusIds() {
        List<PermisoDTO> permisos = rolService.getAllPermisos();

        assertThat(permisos).anySatisfy(p -> {
            assertThat(p.getNombre()).isEqualTo("LEER_ENTREGAS");
            assertThat(p.getId()).isEqualTo(22L);
        });
        assertThat(permisos).anySatisfy(p -> {
            assertThat(p.getNombre()).isEqualTo("ESCRIBIR_ENTREGAS");
            assertThat(p.getId()).isEqualTo(23L);
        });
    }

    // --- 3.4 RED/GREEN: COLEGA sin los permisos nuevos, JEFE con ambos ---
    @Test
    void colegaNoTieneLosPermisosDeEntregasYJefeTieneAmbos() {
        Rol colega = rolRepository.findByNombre("COLEGA")
                .orElseThrow(() -> new IllegalStateException("Falta el rol COLEGA sembrado"));
        assertThat(colega.getPermisos()).doesNotContain(PermisoEnum.LEER_ENTREGAS, PermisoEnum.ESCRIBIR_ENTREGAS);

        Rol jefe = rolRepository.findByNombre("JEFE")
                .orElseThrow(() -> new IllegalStateException("Falta el rol JEFE sembrado"));
        assertThat(jefe.getPermisos()).contains(PermisoEnum.LEER_ENTREGAS, PermisoEnum.ESCRIBIR_ENTREGAS);
    }
}
