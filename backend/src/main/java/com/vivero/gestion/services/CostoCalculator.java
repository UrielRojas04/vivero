package com.vivero.gestion.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Calculador único y sin estado del costo de un producto (Decisión 6 de design.md de
 * costeo-flexible-por-producto, change en curso). Reemplaza las cuatro copias manuales de la
 * aritmética que existían antes de este change: las dos ramas de
 * {@code MovimientoStockServiceImpl} (grupo 6), {@code ProductoServiceImpl.calcularPrecioSiAplica()}
 * (grupo 7) y el equivalente en {@code frontend/src/utils/costeo.js} (grupo 9, mismo orden y mismo
 * redondeo, pero en JS — no se puede compartir código real entre Java y JS).
 *
 * <p>Orden de la cadena (Decisión 3): {@code base → descuentos en cascada → IVA sobre el neto con
 * descuentos → envío sobre el mismo neto → suma}. IVA y envío se calculan los dos sobre el mismo
 * neto, nunca uno sobre el resultado del otro (Decisión 3, razón (c): si no, el envío se infla solo
 * al activar el IVA).
 *
 * <p>Esta clase NO resuelve el fallback IVA/envío producto→unidad de negocio ni construye el
 * snapshot textual de descuentos: recibe el IVA y el envío ya efectivos, y la lista de descuentos
 * ya resuelta. {@link #resolverEfectivo(BigDecimal, BigDecimal)} es el único método de fallback que
 * expone (Decisión 5), para que el llamador lo use tanto para IVA como para envío antes de invocar
 * {@link #calcular}.
 */
public final class CostoCalculator {

    private static final int ESCALA_INTERMEDIA = 6;
    private static final int ESCALA_FINAL = 2;
    private static final BigDecimal CIEN = new BigDecimal("100");

    private CostoCalculator() {
        // Sin estado, sin instancias (Decisión 6).
    }

    /**
     * Resuelve el fallback IVA/envío efectivo (Decisión 5, tarea 5.6): el valor propio del
     * producto se usa siempre que sea distinto de {@code null} —incluido {@code 0}, que significa
     * "no aplica para este producto"—; sólo cuando el producto tiene {@code null} ("hereda") se cae
     * al valor de la unidad de negocio.
     *
     * <p>Un {@code 0} configurado en el producto NUNCA cae al default de la unidad: es
     * explícitamente la diferencia entre "no aplica" y "hereda".
     */
    public static BigDecimal resolverEfectivo(BigDecimal valorProducto, BigDecimal valorUnidadNegocio) {
        if (valorProducto != null) {
            return valorProducto;
        }
        return valorUnidadNegocio != null ? valorUnidadNegocio : BigDecimal.ZERO;
    }

    /**
     * Calcula el desglose completo de costo.
     *
     * @param costoBase                 el costo base (ya resuelto por el llamador: costoBaseExplícito
     *                                   del pedido, o {@code producto.getCostoProducto()}).
     * @param descuentosPorcentaje      lista de porcentajes de descuento a aplicar en cascada, en
     *                                   cualquier orden (el producto de factores es conmutativo,
     *                                   Decisión 2). Puede ser vacía o {@code null}: en ese caso no
     *                                   hay reducción alguna.
     * @param ivaEfectivoPorcentaje     IVA efectivo ya resuelto (ver {@link #resolverEfectivo}).
     * @param envioEfectivoPorcentaje   envío efectivo ya resuelto (ver {@link #resolverEfectivo}).
     */
    public static CostoResultado calcular(BigDecimal costoBase,
                                           List<BigDecimal> descuentosPorcentaje,
                                           BigDecimal ivaEfectivoPorcentaje,
                                           BigDecimal envioEfectivoPorcentaje) {
        BigDecimal base = costoBase != null ? costoBase : BigDecimal.ZERO;
        BigDecimal iva = ivaEfectivoPorcentaje != null ? ivaEfectivoPorcentaje : BigDecimal.ZERO;
        BigDecimal envio = envioEfectivoPorcentaje != null ? envioEfectivoPorcentaje : BigDecimal.ZERO;

        // Cascada de descuentos: producto de factores (1 - d_i/100), NUNCA suma (Decisión 2,
        // confirmada por el usuario). Con lista vacía, factorAcumulado queda en 1 y
        // netoConDescuentos == costoBase exactamente (tarea 5.7) — no hay ninguna división acá,
        // así que tampoco hay riesgo de división por cero.
        BigDecimal factorAcumulado = BigDecimal.ONE;
        if (descuentosPorcentaje != null) {
            for (BigDecimal descuento : descuentosPorcentaje) {
                if (descuento == null) {
                    continue;
                }
                BigDecimal factor = BigDecimal.ONE.subtract(
                        descuento.divide(CIEN, ESCALA_INTERMEDIA, RoundingMode.HALF_UP));
                factorAcumulado = factorAcumulado.multiply(factor)
                        .setScale(ESCALA_INTERMEDIA, RoundingMode.HALF_UP);
            }
        }

        BigDecimal netoConDescuentos6 = base.multiply(factorAcumulado)
                .setScale(ESCALA_INTERMEDIA, RoundingMode.HALF_UP);

        // IVA y envío, los dos sobre el mismo neto con descuentos (Decisión 3) — nunca uno sobre
        // el resultado del otro.
        BigDecimal montoIva6 = netoConDescuentos6.multiply(iva)
                .divide(CIEN, ESCALA_INTERMEDIA, RoundingMode.HALF_UP);
        BigDecimal montoEnvio6 = netoConDescuentos6.multiply(envio)
                .divide(CIEN, ESCALA_INTERMEDIA, RoundingMode.HALF_UP);

        BigDecimal costoUnitario6 = netoConDescuentos6.add(montoIva6).add(montoEnvio6);

        // Descuento efectivo total equivalente de la cascada (lo que se persiste en
        // MovimientoStock.descuentoPorcentaje, Decisión 7): 100 * (1 - factorAcumulado).
        BigDecimal descuentoEfectivo6 = BigDecimal.ONE.subtract(factorAcumulado).multiply(CIEN);

        // Redondeo (Decisión 10, tarea 5.5): escala 6 HALF_UP en todos los intermedios de arriba;
        // acá, y sólo acá, se redondea a 2 decimales HALF_UP una única vez por cada valor que se
        // expone (persiste o muestra).
        return new CostoResultado(
                netoConDescuentos6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP),
                montoIva6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP),
                montoEnvio6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP),
                descuentoEfectivo6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP),
                costoUnitario6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP)
        );
    }

    /** Desglose de costo devuelto por {@link #calcular}. Inmutable. */
    public static final class CostoResultado {
        private final BigDecimal netoConDescuentos;
        private final BigDecimal montoIva;
        private final BigDecimal montoEnvio;
        private final BigDecimal descuentoEfectivoPorcentaje;
        private final BigDecimal costoUnitario;

        public CostoResultado(BigDecimal netoConDescuentos, BigDecimal montoIva, BigDecimal montoEnvio,
                               BigDecimal descuentoEfectivoPorcentaje, BigDecimal costoUnitario) {
            this.netoConDescuentos = netoConDescuentos;
            this.montoIva = montoIva;
            this.montoEnvio = montoEnvio;
            this.descuentoEfectivoPorcentaje = descuentoEfectivoPorcentaje;
            this.costoUnitario = costoUnitario;
        }

        public BigDecimal getNetoConDescuentos() { return netoConDescuentos; }
        public BigDecimal getMontoIva() { return montoIva; }
        public BigDecimal getMontoEnvio() { return montoEnvio; }
        public BigDecimal getDescuentoEfectivoPorcentaje() { return descuentoEfectivoPorcentaje; }
        public BigDecimal getCostoUnitario() { return costoUnitario; }
    }
}
