package com.vivero.gestion.services;

import com.vivero.gestion.dto.GastoDTO;
import com.vivero.gestion.dto.LiquidacionAbonoDTO;
import com.vivero.gestion.repositories.GastoRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bug real reportado por el dueño (2026-09-04): el número grande de la tarjeta "Gastos" de la
 * Finanzas de Abono (LiquidacionAbonoDTO.gastosInsumos, calculado en
 * RendicionColegaServiceImpl.obtenerLiquidacion) sólo sumaba insumos -- los gastos manuales que
 * se cargan desde el drill-down (misma pantalla, reciclado de GastosDrillDown) nunca se
 * reflejaban en ese total, aunque sí aparecían correctamente en la lista de abajo.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RendicionColegaLiquidacionGastosManualesTest {

    private static final String CONCEPTO_TEST = "Test gasto manual liquidacion abono";

    @Autowired
    private RendicionColegaService rendicionService;

    @Autowired
    private GastoService gastoService;

    @Autowired
    private GastoRepository gastoRepository;

    @AfterEach
    void limpiar() {
        gastoRepository.findAll().stream()
                .filter(g -> CONCEPTO_TEST.equals(g.getConcepto()))
                .forEach(g -> gastoRepository.deleteById(g.getId()));
        UnidadNegocioContextHolder.clear();
    }

    @Test
    void gastosInsumosDeLaLiquidacionSumaTambienGastosManuales() {
        LocalDateTime desde = LocalDateTime.now().minusDays(1);
        LocalDateTime hasta = LocalDateTime.now().plusDays(1);

        LiquidacionAbonoDTO antes = rendicionService.obtenerLiquidacion(desde, hasta);

        UnidadNegocioContextHolder.setUnidadNegocioId(3L); // Abono
        GastoDTO gasto = new GastoDTO();
        gasto.setConcepto(CONCEPTO_TEST);
        gasto.setMonto(new BigDecimal("1234.56"));
        gastoService.crearGasto(gasto);
        UnidadNegocioContextHolder.clear();

        LiquidacionAbonoDTO despues = rendicionService.obtenerLiquidacion(desde, hasta);

        assertThat(despues.getGastosInsumos())
                .isEqualByComparingTo(antes.getGastosInsumos().add(new BigDecimal("1234.56")));
    }

    @Test
    void gastosManualesDeOtraUnidadNoSeSumanALaLiquidacionDeAbono() {
        // Triangulación: aislamiento por unidad. Un gasto manual cargado en Vivero no debe
        // afectar el total de Abono -- si el fix sumara todos los gastos manuales sin filtrar por
        // unidad, este test lo detectaría.
        LocalDateTime desde = LocalDateTime.now().minusDays(1);
        LocalDateTime hasta = LocalDateTime.now().plusDays(1);

        LiquidacionAbonoDTO antes = rendicionService.obtenerLiquidacion(desde, hasta);

        UnidadNegocioContextHolder.setUnidadNegocioId(1L); // Vivero
        GastoDTO gasto = new GastoDTO();
        gasto.setConcepto(CONCEPTO_TEST);
        gasto.setMonto(new BigDecimal("999.00"));
        gastoService.crearGasto(gasto);
        UnidadNegocioContextHolder.clear();

        LiquidacionAbonoDTO despues = rendicionService.obtenerLiquidacion(desde, hasta);

        assertThat(despues.getGastosInsumos()).isEqualByComparingTo(antes.getGastosInsumos());
    }
}
