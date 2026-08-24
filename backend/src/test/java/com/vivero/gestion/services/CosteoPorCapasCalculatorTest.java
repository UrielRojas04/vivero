package com.vivero.gestion.services;

import com.vivero.gestion.models.CapaCostoStock;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

// Tests de la clase pura CosteoPorCapasCalculator (costeo-fifo-herramientas, grupo 5 de
// tasks.md). Sin JPA, sin base de datos — mismo patrón que costeo-flexible-por-producto usó para
// CostoCalculator. Los valores de capaDeReferencia son los verificados contra la base real el
// 2026-08-21 (id=3 Pala pocera, id=1 Pala corazón).
class CosteoPorCapasCalculatorTest {

    private static CapaCostoStock capa(Long id, int cantidadRestante, String costo, LocalDateTime fecha) {
        CapaCostoStock c = new CapaCostoStock();
        c.setId(id);
        c.setCantidadOriginal(cantidadRestante);
        c.setCantidadRestante(cantidadRestante);
        c.setCostoUnitario(new BigDecimal(costo));
        c.setFecha(fecha);
        return c;
    }

    private static final LocalDateTime T1 = LocalDateTime.of(2026, 8, 13, 10, 0);
    private static final LocalDateTime T2 = LocalDateTime.of(2026, 8, 19, 10, 0);
    private static final LocalDateTime T3 = LocalDateTime.of(2026, 8, 20, 10, 0);

    // ---- 5.2 RED — capaDeReferencia, caso base (id=3 Pala pocera) ----
    // La más nueva ($25.987,50, mov. 66) es más cara que la más vieja ($21.780,00, mov. 5).
    // La regla nueva devuelve la más cara, no la más vieja (eso sería FIFO).
    @Test
    void capaDeReferencia_devuelveLaMasCaraAunqueSeaLaMasNueva() {
        CapaCostoStock vieja = capa(5L, 1, "21780.00", T1);
        CapaCostoStock nueva = capa(66L, 5, "25987.50", T2);

        CapaCostoStock referencia = CosteoPorCapasCalculator.capaDeReferencia(Arrays.asList(vieja, nueva));

        assertSame(nueva, referencia);
        assertEquals(new BigDecimal("25987.50"), referencia.getCostoUnitario());
    }

    // ---- 5.3 RED — triangulación (id=1 Pala corazón) ----
    // Acá la más cara ES la más vieja: el máximo y FIFO coinciden, pero tienen que coincidir por
    // el motivo correcto (es el máximo, no porque sea la primera).
    @Test
    void capaDeReferencia_devuelveLaMasCaraCuandoTambienEsLaMasVieja() {
        CapaCostoStock vieja = capa(67L, 5, "22822.80", T1);
        CapaCostoStock nueva = capa(104L, 1, "15561.00", T3);

        CapaCostoStock referencia = CosteoPorCapasCalculator.capaDeReferencia(Arrays.asList(vieja, nueva));

        assertSame(vieja, referencia);
        assertEquals(new BigDecimal("22822.80"), referencia.getCostoUnitario());
    }

    // ---- 5.4 RED — casos borde ----
    @Test
    void capaDeReferencia_conTresCapas_laMasCaraEnElMedioGana() {
        CapaCostoStock barata = capa(1L, 2, "100.00", T1);
        CapaCostoStock cara = capa(2L, 2, "300.00", T2);
        CapaCostoStock media = capa(3L, 2, "200.00", T3);

        CapaCostoStock referencia = CosteoPorCapasCalculator.capaDeReferencia(Arrays.asList(barata, cara, media));

        assertSame(cara, referencia);
    }

    @Test
    void capaDeReferencia_excluyeCapasAgotadasDelMaximo() {
        // Una capa más cara pero agotada (cantidadRestante = 0) NO cuenta para el máximo — es la
        // diferencia con el "número que nunca baja" descartado en design.md.
        CapaCostoStock agotadaCara = capa(1L, 0, "500.00", T1);
        CapaCostoStock activaBarata = capa(2L, 3, "200.00", T2);

        CapaCostoStock referencia = CosteoPorCapasCalculator.capaDeReferencia(Arrays.asList(agotadaCara, activaBarata));

        assertSame(activaBarata, referencia);
    }

    @Test
    void capaDeReferencia_empateDeCosto_desempataPorFechaAscLuegoIdAsc() {
        CapaCostoStock masVieja = capa(1L, 2, "100.00", T1);
        CapaCostoStock masNueva = capa(2L, 2, "100.00", T2);

        CapaCostoStock referencia = CosteoPorCapasCalculator.capaDeReferencia(Arrays.asList(masNueva, masVieja));

        assertSame(masVieja, referencia);
    }

    @Test
    void capaDeReferencia_empateDeCostoYFecha_desempataPorIdAsc() {
        CapaCostoStock idMenor = capa(1L, 2, "100.00", T1);
        CapaCostoStock idMayor = capa(2L, 2, "100.00", T1);

        CapaCostoStock referencia = CosteoPorCapasCalculator.capaDeReferencia(Arrays.asList(idMayor, idMenor));

        assertSame(idMenor, referencia);
    }

    @Test
    void capaDeReferencia_listaVacia_devuelveNullSinExcepcion() {
        assertNull(CosteoPorCapasCalculator.capaDeReferencia(Collections.emptyList()));
    }

    @Test
    void capaDeReferencia_sinCapasActivas_devuelveNullSinExcepcion() {
        CapaCostoStock agotada = capa(1L, 0, "500.00", T1);

        assertNull(CosteoPorCapasCalculator.capaDeReferencia(Collections.singletonList(agotada)));
    }

    @Test
    void capaDeReferencia_null_devuelveNullSinExcepcion() {
        assertNull(CosteoPorCapasCalculator.capaDeReferencia(null));
    }

    // ---- 5.5 RED — el costo BAJA cuando la capa más cara se agota del todo ----
    // Partiendo de 1 @ 25987.50 (agotada) + 4 @ 21780.00 (activa), la referencia pasa a 21780.00.
    // Es la propiedad que distingue esta regla del "máximo histórico que nunca baja" descartado.
    @Test
    void capaDeReferencia_bajaCuandoLaCapaMasCaraSeAgotaDelTodo() {
        CapaCostoStock caraAgotada = capa(1L, 0, "25987.50", T1);
        CapaCostoStock barataActiva = capa(2L, 4, "21780.00", T2);

        CapaCostoStock referencia = CosteoPorCapasCalculator.capaDeReferencia(Arrays.asList(caraAgotada, barataActiva));

        assertSame(barataActiva, referencia);
        assertEquals(new BigDecimal("21780.00"), referencia.getCostoUnitario());
    }

    // ---- 5.7 RED — descontar, caso base ----
    // Egreso que cabe entero en la capa más antigua (3 de una capa de 5): esa capa queda en 2,
    // las demás intactas.
    @Test
    void descontar_egresoQueCabeEnteroEnLaCapaMasAntigua() {
        CapaCostoStock antigua = capa(1L, 5, "100.00", T1);
        CapaCostoStock otra = capa(2L, 3, "200.00", T2);
        List<CapaCostoStock> capas = Arrays.asList(otra, antigua);

        CosteoPorCapasCalculator.descontar(capas, 3);

        assertEquals(2, antigua.getCantidadRestante());
        assertEquals(3, otra.getCantidadRestante());
    }

    // ---- 5.8 RED — descontar, triangulación y casos borde ----
    @Test
    void descontar_egresoQueAgotaLaMasAntiguaYSigueEnLaSiguiente() {
        CapaCostoStock antigua = capa(1L, 5, "100.00", T1);
        CapaCostoStock siguiente = capa(2L, 2, "200.00", T2);

        CosteoPorCapasCalculator.descontar(Arrays.asList(siguiente, antigua), 6);

        assertEquals(0, antigua.getCantidadRestante());
        assertEquals(1, siguiente.getCantidadRestante());
    }

    @Test
    void descontar_egresoQueAgotaExactamenteUnaCapa() {
        CapaCostoStock unica = capa(1L, 4, "100.00", T1);

        CosteoPorCapasCalculator.descontar(Collections.singletonList(unica), 4);

        assertEquals(0, unica.getCantidadRestante());
    }

    @Test
    void descontar_egresoQueAbarcaTresCapas() {
        CapaCostoStock c1 = capa(1L, 2, "100.00", T1);
        CapaCostoStock c2 = capa(2L, 2, "200.00", T2);
        CapaCostoStock c3 = capa(3L, 2, "300.00", T3);

        CosteoPorCapasCalculator.descontar(Arrays.asList(c3, c2, c1), 5);

        assertEquals(0, c1.getCantidadRestante());
        assertEquals(0, c2.getCantidadRestante());
        assertEquals(1, c3.getCantidadRestante());
    }

    @Test
    void descontar_egresoMayorAlTotalDisponible_fallaSinDescontarNada() {
        CapaCostoStock c1 = capa(1L, 2, "100.00", T1);
        CapaCostoStock c2 = capa(2L, 2, "200.00", T2);
        List<CapaCostoStock> capas = Arrays.asList(c1, c2);

        assertThrows(IllegalStateException.class, () -> CosteoPorCapasCalculator.descontar(capas, 5));

        // Todo o nada: ninguna capa cambió.
        assertEquals(2, c1.getCantidadRestante());
        assertEquals(2, c2.getCantidadRestante());
    }

    @Test
    void descontar_cantidadCero_ningunaCapaCambia() {
        CapaCostoStock c1 = capa(1L, 2, "100.00", T1);

        CosteoPorCapasCalculator.descontar(Collections.singletonList(c1), 0);

        assertEquals(2, c1.getCantidadRestante());
    }

    // ---- 5.10 RED/GREEN — independencia entre las dos reglas ----
    // 1 @ 21780.00 (vieja) + 5 @ 25987.50 (nueva). Al descontar 1 unidad: sale de la capa vieja
    // (barata), pero capaDeReferencia EVALUADA ANTES del descuento da la cara. Las dos cosas
    // ciertas a la vez — es el corazón de la corrección post-checkpoint (id=3 Pala pocera).
    @Test
    void independenciaEntreCostoYConsumo_id3PalaPocera() {
        CapaCostoStock vieja = capa(5L, 1, "21780.00", T1);
        CapaCostoStock nueva = capa(66L, 5, "25987.50", T2);
        List<CapaCostoStock> capas = Arrays.asList(vieja, nueva);

        // (b) capaDeReferencia evaluada ANTES de descontar.
        CapaCostoStock referenciaAntes = CosteoPorCapasCalculator.capaDeReferencia(capas);
        assertSame(nueva, referenciaAntes);
        assertEquals(new BigDecimal("25987.50"), referenciaAntes.getCostoUnitario());

        CosteoPorCapasCalculator.descontar(capas, 1);

        // (a) La unidad salió de la capa más vieja ($21.780,00), que queda agotada.
        assertEquals(0, vieja.getCantidadRestante());
        assertEquals(5, nueva.getCantidadRestante());

        // Después del descuento, la referencia sigue siendo la cara (no cambió, sigue activa).
        CapaCostoStock referenciaDespues = CosteoPorCapasCalculator.capaDeReferencia(capas);
        assertSame(nueva, referenciaDespues);
    }

    // ---- 5.11 RED/GREEN — orden de evaluación ----
    // 1 @ 25987.50 (la más cara) + 4 @ 21780.00. Se vende 1 unidad: el costo del egreso es
    // 25987.50 (evaluado ANTES de descontar), y recién el egreso SIGUIENTE costea a 21780.00.
    @Test
    void ordenDeEvaluacion_egresoQueAgotaLaCapaDeReferenciaSeCosteaAlValorAnterior() {
        CapaCostoStock cara = capa(1L, 1, "25987.50", T1);
        CapaCostoStock barata = capa(2L, 4, "21780.00", T2);
        List<CapaCostoStock> capas = Arrays.asList(cara, barata);

        // Primer egreso: la referencia se evalúa ANTES de descontar.
        CapaCostoStock referenciaPrimerEgreso = CosteoPorCapasCalculator.capaDeReferencia(capas);
        assertEquals(new BigDecimal("25987.50"), referenciaPrimerEgreso.getCostoUnitario());

        CosteoPorCapasCalculator.descontar(capas, 1);
        assertEquals(0, cara.getCantidadRestante());

        // Egreso siguiente: la capa cara ya está agotada, ahora la referencia es la barata.
        CapaCostoStock referenciaSegundoEgreso = CosteoPorCapasCalculator.capaDeReferencia(capas);
        assertEquals(new BigDecimal("21780.00"), referenciaSegundoEgreso.getCostoUnitario());
    }
}
