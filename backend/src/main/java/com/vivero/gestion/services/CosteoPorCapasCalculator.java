package com.vivero.gestion.services;

import com.vivero.gestion.models.CapaCostoStock;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Motor de costeo por capas de costeo-fifo-herramientas, sin estado y sin JPA — mismo patrón que
 * {@link CostoCalculator}: una clase pura que se testea con JUnit plano, sin mocks de base de
 * datos (regla dura 4 del proyecto).
 *
 * <p><b>El nombre del directorio del change (`costeo-fifo-herramientas`) es histórico: el
 * algoritmo final NO es FIFO.</b> Ver el encabezado de {@code design.md}/{@code tasks.md}.
 *
 * <p>Esta clase separa, a propósito, DOS reglas independientes que no deben colapsarse en una
 * sola:
 * <ul>
 *   <li>{@link #capaDeReferencia(List)} — elige EL COSTO: el máximo {@code costoUnitario} entre
 *       las capas con {@code cantidadRestante > 0}, sin importar el orden de compra. No depende
 *       de qué capa se consume. Nunca se queda pegado a un número viejo: cuando la capa más cara
 *       se agota del todo, el costo se recalcula sobre lo que quede y BAJA si corresponde — es la
 *       diferencia con el "máximo histórico que nunca baja", descartado en el diseño.</li>
 *   <li>{@link #descontar(List, int)} — elige DE DÓNDE SALEN LAS UNIDADES: siempre la capa más
 *       vieja primero ({@code fecha ASC, id ASC}), el mismo criterio de siempre (Decisión 2b).
 *       El costo NO depende de esta elección.</li>
 * </ul>
 *
 * <p>Las dos reglas son ciertas a la vez y no se contradicen: una gobierna el inventario, la otra
 * gobierna el margen. Ver el ejemplo de {@code id=3 Pala pocera} en design.md.
 */
public final class CosteoPorCapasCalculator {

    private CosteoPorCapasCalculator() {
        // Sin estado, sin instancias (mismo patrón que CostoCalculator).
    }

    /**
     * Devuelve la <b>capa de referencia</b>: la capa activa ({@code cantidadRestante > 0}) con el
     * mayor {@code costoUnitario}. En caso de empate de costo, desempata por la más antigua
     * ({@code fecha ASC}, luego {@code id ASC}).
     *
     * <p><b>Evaluar SIEMPRE antes de descontar</b> (Decisión 2): un egreso que agota la capa de
     * referencia tiene que costearse al valor que el producto tenía cuando la operación empezó,
     * no al que queda después.
     *
     * @param capas las capas del producto, en cualquier orden. Puede ser {@code null} o vacía.
     * @return la capa de referencia, o {@code null} si no hay ninguna capa activa (nunca cero, ni
     *         excepción) — el llamador cae al comportamiento viejo (Decisión 7 / tarea 6.8).
     */
    public static CapaCostoStock capaDeReferencia(List<CapaCostoStock> capas) {
        if (capas == null || capas.isEmpty()) {
            return null;
        }

        CapaCostoStock referencia = null;
        for (CapaCostoStock capa : capas) {
            if (!estaActiva(capa)) {
                continue; // Capa agotada: excluida del máximo, no cuenta aunque sea la más cara.
            }
            if (referencia == null || esMejorReferencia(capa, referencia)) {
                referencia = capa;
            }
        }
        return referencia;
    }

    // Una capa está activa cuando todavía tiene unidades: cantidadRestante > 0. Único criterio de
    // actividad de toda la clase, para no duplicar la comparación null/0 en cada método.
    private static boolean estaActiva(CapaCostoStock capa) {
        return capa.getCantidadRestante() != null && capa.getCantidadRestante() > 0;
    }

    // candidata reemplaza a la actual referencia si tiene mayor costo, o si empata en costo y es
    // más antigua (fecha ASC, luego id ASC).
    private static boolean esMejorReferencia(CapaCostoStock candidata, CapaCostoStock actual) {
        int comparacionCosto = candidata.getCostoUnitario().compareTo(actual.getCostoUnitario());
        if (comparacionCosto != 0) {
            return comparacionCosto > 0;
        }
        int comparacionFecha = candidata.getFecha().compareTo(actual.getFecha());
        if (comparacionFecha != 0) {
            return comparacionFecha < 0;
        }
        return candidata.getId().compareTo(actual.getId()) < 0;
    }

    /**
     * Descuenta {@code cantidad} unidades de las capas activas, siempre de la más vieja primero
     * ({@code fecha ASC, id ASC} — Decisión 2b). Muta {@code cantidadRestante} de las capas
     * recibidas; no toca ningún otro campo, no persiste nada por sí misma (sin JPA).
     *
     * <p><b>Todo o nada:</b> si el total activo es menor que {@code cantidad}, no descuenta
     * absolutamente nada y lanza {@link IllegalStateException} — el llamador transaccional
     * (grupo 6) se encarga de que la operación completa se revierta.
     *
     * @param capas    las capas del producto. Puede ser {@code null} o vacía si {@code cantidad}
     *                 también es 0.
     * @param cantidad la cantidad a descontar. 0 es un no-op: ninguna capa cambia.
     * @throws IllegalStateException si las capas activas no alcanzan para cubrir {@code cantidad}.
     */
    public static void descontar(List<CapaCostoStock> capas, int cantidad) {
        if (cantidad < 0) {
            throw new IllegalArgumentException("La cantidad a descontar no puede ser negativa.");
        }
        if (cantidad == 0) {
            return; // No-op explícito: ninguna capa cambia.
        }

        List<CapaCostoStock> ordenadas = new ArrayList<>(capas == null ? List.of() : capas);
        ordenadas.sort(Comparator
                .comparing(CapaCostoStock::getFecha)
                .thenComparing(CapaCostoStock::getId));

        int disponible = 0;
        for (CapaCostoStock capa : ordenadas) {
            if (estaActiva(capa)) {
                disponible += capa.getCantidadRestante();
            }
        }
        if (disponible < cantidad) {
            // Todo o nada: no se toca ni una capa si no alcanza (tarea 6.10 / 5.8).
            throw new IllegalStateException(
                    "Stock insuficiente en capas activas: disponible " + disponible + ", requerido " + cantidad);
        }

        int restantePorDescontar = cantidad;
        for (CapaCostoStock capa : ordenadas) {
            if (restantePorDescontar == 0) {
                break;
            }
            if (!estaActiva(capa)) {
                continue;
            }
            int aDescontar = Math.min(capa.getCantidadRestante(), restantePorDescontar);
            capa.setCantidadRestante(capa.getCantidadRestante() - aDescontar);
            restantePorDescontar -= aDescontar;
        }
    }
}
