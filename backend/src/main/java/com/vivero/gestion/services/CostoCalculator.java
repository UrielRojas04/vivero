package com.vivero.gestion.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import com.vivero.gestion.models.MonedaCosto;

/**
 * Calculador único y sin estado del costo de un producto (Decisión 6 de design.md de
 * costeo-flexible-por-producto, change en curso). Reemplaza las cuatro copias manuales de la
 * aritmética que existían antes de este change: las dos ramas de
 * {@code MovimientoStockServiceImpl} (grupo 6), {@code ProductoServiceImpl.calcularPrecioSiAplica()}
 * (grupo 7) y el equivalente en {@code frontend/src/utils/costeo.js} (grupo 9, mismo orden y mismo
 * redondeo, pero en JS — no se puede compartir código real entre Java y JS).
 *
 * <p>Orden de la cadena (Decisión 3, CORREGIDA 2026-08-22 — ver nota junto al cálculo de IVA/envío
 * más abajo): {@code base → descuentos en cascada → IVA sobre el neto con descuentos → envío en
 * cadena sobre el neto+IVA}, equivalente a {@code neto × (1+IVA%) × (1+envío%)}.
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
     * Calcula el desglose completo de costo, sin conversión de moneda (moneda {@code ARS}
     * implícita — el paso 0 es la identidad). Delega en la sobrecarga de 6 parámetros con
     * {@code moneda=null, cotizacion=null}, que el guard de {@link #calcular(BigDecimal,
     * MonedaCosto, BigDecimal, List, BigDecimal, BigDecimal)} trata igual que {@code ARS}: ni
     * {@link CostoResultado#getMonedaAplicada()} ni {@link CostoResultado#getCotizacionAplicada()}
     * quedan informados. Usada por los llamadores que no operan en el contexto de un pedido con
     * cotización (ej. {@code ProductoServiceImpl.calcularPrecioSiAplica()}).
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
        return calcular(costoBase, null, null, descuentosPorcentaje, ivaEfectivoPorcentaje, envioEfectivoPorcentaje);
    }

    /**
     * Calcula el desglose completo de costo, con el paso 0 de conversión de moneda (Decisión 6/OQ6
     * de design.md de config-costeo-por-proveedor, grupo 6 de tasks.md): {@code base ARS = importe
     * × cotización}, ANTES de la cascada de descuentos y dentro de la misma escala intermedia 6 —
     * el base convertido NO se redondea a 2 decimales antes de seguir la cadena.
     *
     * <p>⚠️ <b>El guard más importante del change (tarea 6.3):</b> la conversión se aplica
     * <b>únicamente</b> cuando {@code moneda == MonedaCosto.USD}. Nunca "si hay cotización
     * cargada" — un {@code cotizacion} no nulo con {@code moneda == ARS} (o {@code null}, el caso
     * de la sobrecarga de 4 parámetros) se ignora por completo: no hay conversión y
     * {@code costoBaseConvertido == costoBase} exactamente (identidad, contrato de no-regresión
     * del change, tarea 6.6).
     *
     * @param moneda      moneda de ESTA operación (línea de pedido o producto). {@code null} se
     *                    trata igual que {@code ARS}.
     * @param cotizacion  cotización a aplicar, sólo relevante si {@code moneda == USD}. Si viene
     *                    {@code null} con {@code moneda == USD} se trata como 0 (el llamador es
     *                    responsable de nunca invocar así: la validación de "cotización obligatoria
     *                    para líneas en USD" vive en el llamador — {@code PedidoServiceImpl},
     *                    tarea 7.4 — no acá).
     */
    public static CostoResultado calcular(BigDecimal costoBase,
                                           MonedaCosto moneda,
                                           BigDecimal cotizacion,
                                           List<BigDecimal> descuentosPorcentaje,
                                           BigDecimal ivaEfectivoPorcentaje,
                                           BigDecimal envioEfectivoPorcentaje) {
        BigDecimal base = costoBase != null ? costoBase : BigDecimal.ZERO;
        BigDecimal iva = ivaEfectivoPorcentaje != null ? ivaEfectivoPorcentaje : BigDecimal.ZERO;
        BigDecimal envio = envioEfectivoPorcentaje != null ? envioEfectivoPorcentaje : BigDecimal.ZERO;

        // Paso 0 (tareas 6.2/6.3): conversión de moneda, dentro de la escala intermedia 6, SIN
        // redondear a 2 decimales antes de seguir la cadena. El guard es exclusivamente
        // `moneda == USD` — nunca "si hay cotización cargada" (una cotización presente pero con
        // moneda ARS/null se ignora totalmente, ver verificación 6.7).
        boolean esUsd = moneda == MonedaCosto.USD;
        BigDecimal cotizacionAplicada = null;
        String monedaAplicada = null;
        BigDecimal baseConvertida6;
        if (esUsd) {
            BigDecimal cot = cotizacion != null ? cotizacion : BigDecimal.ZERO;
            baseConvertida6 = base.multiply(cot).setScale(ESCALA_INTERMEDIA, RoundingMode.HALF_UP);
            cotizacionAplicada = cot;
            monedaAplicada = MonedaCosto.USD.name();
        } else {
            baseConvertida6 = base.setScale(ESCALA_INTERMEDIA, RoundingMode.HALF_UP);
        }

        // Cascada de descuentos: producto de factores (1 - d_i/100), NUNCA suma (Decisión 2,
        // confirmada por el usuario). Con lista vacía, factorAcumulado queda en 1 y
        // netoConDescuentos == baseConvertida exactamente (tarea 5.7) — no hay ninguna división
        // acá, así que tampoco hay riesgo de división por cero.
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

        BigDecimal netoConDescuentos6 = baseConvertida6.multiply(factorAcumulado)
                .setScale(ESCALA_INTERMEDIA, RoundingMode.HALF_UP);

        // IVA sobre el neto con descuentos, y envío en cadena sobre el resultado de aplicar el IVA
        // (Decisión 3, CORREGIDA 2026-08-22 tras verificar contra la planilla real del proveedor
        // Shimura, img/shimura.png fila "escalera shimura aluminio 4.70m": la fórmula anterior
        // sumaba IVA y envío en paralelo sobre el mismo neto, lo que pierde el término cruzado
        // neto × IVA% × envío% cuando los dos son distintos de cero a la vez. Con Ingco nunca se
        // notó porque su IVA siempre es 0%, así que el término cruzado daba cero. Ahora
        // netoConDescuentos + montoIva + montoEnvio == neto × (1 + IVA%/100) × (1 + envío%/100)
        // exactamente, calculando el envío sobre neto+IVA en vez de sobre el neto solo.
        BigDecimal montoIva6 = netoConDescuentos6.multiply(iva)
                .divide(CIEN, ESCALA_INTERMEDIA, RoundingMode.HALF_UP);
        BigDecimal netoConIva6 = netoConDescuentos6.add(montoIva6);
        BigDecimal montoEnvio6 = netoConIva6.multiply(envio)
                .divide(CIEN, ESCALA_INTERMEDIA, RoundingMode.HALF_UP);

        BigDecimal costoUnitario6 = netoConDescuentos6.add(montoIva6).add(montoEnvio6);

        // Descuento efectivo total equivalente de la cascada (lo que se persiste en
        // MovimientoStock.descuentoPorcentaje, Decisión 7): 100 * (1 - factorAcumulado).
        BigDecimal descuentoEfectivo6 = BigDecimal.ONE.subtract(factorAcumulado).multiply(CIEN);

        // Redondeo (Decisión 10, tarea 5.5): escala 6 HALF_UP en todos los intermedios de arriba;
        // acá, y sólo acá, se redondea a 2 decimales HALF_UP una única vez por cada valor que se
        // expone (persiste o muestra). costoBaseConvertido también se expone redondeado a 2
        // decimales (tarea 6.4): es lo que el llamador congela en MovimientoStock.costoBase.
        return new CostoResultado(
                netoConDescuentos6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP),
                montoIva6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP),
                montoEnvio6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP),
                descuentoEfectivo6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP),
                costoUnitario6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP),
                baseConvertida6.setScale(ESCALA_FINAL, RoundingMode.HALF_UP),
                monedaAplicada,
                cotizacionAplicada
        );
    }

    /** Desglose de costo devuelto por {@link #calcular}. Inmutable. */
    public static final class CostoResultado {
        private final BigDecimal netoConDescuentos;
        private final BigDecimal montoIva;
        private final BigDecimal montoEnvio;
        private final BigDecimal descuentoEfectivoPorcentaje;
        private final BigDecimal costoUnitario;
        // Congelado de moneda (tarea 6.4): el costo base YA convertido (identidad si no era USD),
        // y la moneda/cotización efectivamente aplicadas — null/null cuando no hubo conversión
        // (moneda != USD), nunca un valor inventado. El llamador los usa para setear
        // MovimientoStock.costoBase/monedaOrigen/cotizacionAplicada sin recalcular nada.
        private final BigDecimal costoBaseConvertido;
        private final String monedaAplicada;
        private final BigDecimal cotizacionAplicada;

        public CostoResultado(BigDecimal netoConDescuentos, BigDecimal montoIva, BigDecimal montoEnvio,
                               BigDecimal descuentoEfectivoPorcentaje, BigDecimal costoUnitario,
                               BigDecimal costoBaseConvertido, String monedaAplicada, BigDecimal cotizacionAplicada) {
            this.netoConDescuentos = netoConDescuentos;
            this.montoIva = montoIva;
            this.montoEnvio = montoEnvio;
            this.descuentoEfectivoPorcentaje = descuentoEfectivoPorcentaje;
            this.costoUnitario = costoUnitario;
            this.costoBaseConvertido = costoBaseConvertido;
            this.monedaAplicada = monedaAplicada;
            this.cotizacionAplicada = cotizacionAplicada;
        }

        public BigDecimal getNetoConDescuentos() { return netoConDescuentos; }
        public BigDecimal getMontoIva() { return montoIva; }
        public BigDecimal getMontoEnvio() { return montoEnvio; }
        public BigDecimal getDescuentoEfectivoPorcentaje() { return descuentoEfectivoPorcentaje; }
        public BigDecimal getCostoUnitario() { return costoUnitario; }
        public BigDecimal getCostoBaseConvertido() { return costoBaseConvertido; }
        public String getMonedaAplicada() { return monedaAplicada; }
        public BigDecimal getCotizacionAplicada() { return cotizacionAplicada; }
    }
}
