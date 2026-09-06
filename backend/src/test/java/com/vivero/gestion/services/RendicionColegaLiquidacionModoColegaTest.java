package com.vivero.gestion.services;

import com.vivero.gestion.dto.LiquidacionAbonoDTO;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Nuevo modo de reparto (2026-09-04, pedido del dueño): además del modo global (histórico), Abono
 * puede repartir el porcentaje del colega sólo sobre lo que el colega cobró, sin restar
 * gastos/insumos -- esos quedan a cargo del Jefe en este modo (confirmado explícitamente por el
 * dueño vía AskUserQuestion, junto con que la base sigue siendo lo efectivamente cobrado, no las
 * ventas totales). El campo UnidadNegocio.repartoSobreVentasColega elige el modo; default false
 * preserva el comportamiento existente (RendicionColegaLiquidacionGastosManualesTest y
 * RendicionColegaDireccionTest siguen pasando sin tocar nada).
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RendicionColegaLiquidacionModoColegaTest {

    @Autowired
    private RendicionColegaService rendicionService;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private UnidadNegocio abono;
    private boolean modoOriginal;
    private BigDecimal porcentajeOriginal;

    @BeforeEach
    void guardarConfigOriginal() {
        abono = unidadNegocioRepository.findByNombre("Abono").orElseThrow();
        modoOriginal = abono.isRepartoSobreVentasColega();
        porcentajeOriginal = abono.getPorcentajeRepartoColega();
    }

    @AfterEach
    void restaurarConfigOriginal() {
        abono.setRepartoSobreVentasColega(modoOriginal);
        abono.setPorcentajeRepartoColega(porcentajeOriginal);
        unidadNegocioRepository.save(abono);
    }

    @Test
    void modoVentasColegaCalculaCompensacionSobreIngresosColegaSinRestarGastos() {
        LocalDateTime desde = LocalDateTime.now().minusDays(1);
        LocalDateTime hasta = LocalDateTime.now().plusDays(1);

        abono.setRepartoSobreVentasColega(true);
        abono.setPorcentajeRepartoColega(new BigDecimal("40"));
        unidadNegocioRepository.save(abono);

        LiquidacionAbonoDTO liq = rendicionService.obtenerLiquidacion(desde, hasta);

        BigDecimal esperado = liq.getIngresosColega().multiply(new BigDecimal("40")).divide(BigDecimal.valueOf(100));
        assertThat(liq.getCompensacionTeorica()).isEqualByComparingTo(esperado);
    }

    @Test
    void modoGlobalSigueRestandoGastosDelTotalCombinado() {
        // Triangulación: con el flag en false (modo histórico), la base sigue siendo el ingreso
        // neto combinado (Jefe + Colega - gastos), no sólo el ingreso del colega.
        LocalDateTime desde = LocalDateTime.now().minusDays(1);
        LocalDateTime hasta = LocalDateTime.now().plusDays(1);

        abono.setRepartoSobreVentasColega(false);
        abono.setPorcentajeRepartoColega(new BigDecimal("40"));
        unidadNegocioRepository.save(abono);

        LiquidacionAbonoDTO liq = rendicionService.obtenerLiquidacion(desde, hasta);

        BigDecimal ingresosNetos = liq.getIngresosJefe().add(liq.getIngresosColega()).subtract(liq.getGastosInsumos());
        BigDecimal esperado = ingresosNetos.multiply(new BigDecimal("40")).divide(BigDecimal.valueOf(100));
        assertThat(liq.getCompensacionTeorica()).isEqualByComparingTo(esperado);
    }
}
