package com.vivero.gestion.services;

import com.vivero.gestion.dto.GastoDTO;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bug real reportado por el dueño (2026-09-04): el listado unificado de gastos ("Gastos"
 * drill-down, reciclado hoy también en la Finanzas de Abono) no mostraba los insumos de Abono.
 * La causa: GastoRepository.listarGastosUnificados tenía la rama de insumos hardcodeada a
 * `:unidadId = 1` (Vivero) en vez de filtrar por el unidad_negocio_id real de cada insumo -- así
 * que CUALQUIER unidad que no fuera Vivero (Herramientas, y ahora Abono, que sí tiene insumos
 * propios) nunca veía sus insumos en este listado, sin importar a qué unidad pertenecieran.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class GastoServiceInsumosPorUnidadTest {

    @Autowired
    private GastoService gastoService;

    @AfterEach
    void limpiarContexto() {
        UnidadNegocioContextHolder.clear();
    }

    @Test
    void listarGastosDeAbonoIncluyeSusPropiosInsumos() {
        UnidadNegocioContextHolder.setUnidadNegocioId(3L);

        Page<GastoDTO> pagina = gastoService.listarGastos(null, PageRequest.of(0, 50));

        assertThat(pagina.getContent())
                .anySatisfy(g -> {
                    assertThat(g.getTipo()).isEqualTo("INSUMO");
                    assertThat(g.getConcepto()).contains("DESDE COLEGA");
                });
    }

    @Test
    void listarGastosDeViveroSigueIncluyendoSusPropiosInsumos() {
        // Triangulación: el fix no debe romper el caso que ya andaba (Vivero).
        UnidadNegocioContextHolder.setUnidadNegocioId(1L);

        Page<GastoDTO> pagina = gastoService.listarGastos(null, PageRequest.of(0, 50));

        assertThat(pagina.getContent())
                .anySatisfy(g -> assertThat(g.getTipo()).isEqualTo("INSUMO"));
    }

    @Test
    void listarGastosDeHerramientasNoIncluyeInsumosDeOtrasUnidades() {
        // Herramientas no tiene insumos propios hoy -- la rama de insumos no debe traer nada
        // filtrando por una unidad que no es la suya (antes del fix, con unidadId != 1, la rama
        // entera se saltaba -- después del fix, se filtra por unidad_negocio_id = 2 y sigue sin
        // traer nada, pero por la razón correcta: no hay insumos de Herramientas, no porque la
        // unidad no sea Vivero).
        UnidadNegocioContextHolder.setUnidadNegocioId(2L);

        Page<GastoDTO> pagina = gastoService.listarGastos(null, PageRequest.of(0, 50));

        assertThat(pagina.getContent())
                .noneMatch(g -> "INSUMO".equals(g.getTipo()));
    }
}
