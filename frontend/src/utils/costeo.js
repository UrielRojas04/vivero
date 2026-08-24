// Replica en JS el CostoCalculator de backend (Java, BigDecimal HALF_UP) del change
// costeo-flexible-por-producto, para que el desglose que ve el usuario en ProductoForm coincida
// al centavo con lo que el backend termina persistiendo en MovimientoStock (verificación 11.12).
//
// Mismo orden de la cadena que el backend: base -> descuentos en cascada -> IVA sobre el neto ->
// envío en cadena sobre el neto+IVA (Decisión 3, CORREGIDA 2026-08-22 — ver nota junto al cálculo
// de IVA/envío más abajo), equivalente a neto × (1+IVA%) × (1+envío%). No comparte código real
// con CostoCalculator.java (no se puede compartir Java y JS): esta es la segunda y última
// implementación de la fórmula que sobrevive a este change (Decisión 6) — reemplaza la cuarta
// copia manual que tenía ProductoForm.

const ESCALA_INTERMEDIA = 6;
const ESCALA_FINAL = 2;

/**
 * Redondeo HALF_UP a `decimales` posiciones. Evita el error de punto flotante típico de
 * Math.round(x * 100) / 100 (ej. binario de 1.005 queda por debajo de 1.005) sumando
 * Number.EPSILON antes de redondear. Sólo pensado para valores no negativos, que es todo lo que
 * entra a este calculador (costos y porcentajes).
 */
export function roundHalfUp(value, decimales = ESCALA_FINAL) {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimales);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Resuelve el fallback IVA/envío efectivo (Decisión 5, mismo contrato que
 * CostoCalculator.resolverEfectivo en backend): el valor propio del producto se usa siempre que
 * esté informado —incluido 0, que significa "no aplica para este producto"—; sólo cuando el
 * producto no tiene valor propio (null/undefined/'') cae al default de la unidad de negocio.
 */
export function resolverEfectivo(valorProducto, valorUnidadNegocio) {
  if (valorProducto !== null && valorProducto !== undefined && valorProducto !== '') {
    const n = Number(valorProducto);
    return Number.isNaN(n) ? 0 : n;
  }
  if (valorUnidadNegocio !== null && valorUnidadNegocio !== undefined && valorUnidadNegocio !== '') {
    const n = Number(valorUnidadNegocio);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * Calcula el desglose completo de costo. Misma firma conceptual que
 * CostoCalculator.calcular(costoBase, moneda, cotizacion, descuentosPorcentaje, ivaEfectivo,
 * envioEfectivo) en backend, devolviendo el mismo desglose (tarea 9.1, extendido por la tarea 6.5
 * de config-costeo-por-proveedor con el paso 0 de conversión de moneda).
 *
 * ⚠️ Guard más importante del change (tarea 6.3, replicado tal cual del backend): la conversión
 * se aplica ÚNICAMENTE cuando `moneda === 'USD'`. Nunca "si hay cotización cargada" — pasar una
 * `cotizacion` con `moneda !== 'USD'` (incluido `null`/`undefined`, el caso por defecto de todos
 * los llamadores que no operan en el contexto de un pedido con cotización) se ignora por
 * completo: no hay conversión y `costoBaseConvertido === costoBase` exactamente (identidad,
 * contrato de no-regresión del change).
 *
 * @param {number} costoBase
 * @param {number[]} descuentosPorcentaje - porcentajes de descuento, aplicados en cascada
 *   (Decisión 2: producto de factores, nunca suma). Vacío o null => sin reducción.
 * @param {number} ivaEfectivoPorcentaje - IVA ya resuelto (ver resolverEfectivo).
 * @param {number} envioEfectivoPorcentaje - envío ya resuelto (ver resolverEfectivo).
 * @param {'ARS'|'USD'|null} [moneda] - moneda de esta operación. Cualquier valor distinto de
 *   'USD' (incluido omitirlo) se trata como ARS: paso 0 identidad.
 * @param {number} [cotizacion] - cotización a aplicar, sólo relevante si moneda === 'USD'.
 */
export function calcularCosto(
  costoBase,
  descuentosPorcentaje,
  ivaEfectivoPorcentaje,
  envioEfectivoPorcentaje,
  moneda = null,
  cotizacion = null,
) {
  const base = Number.isFinite(costoBase) ? costoBase : 0;
  const iva = Number.isFinite(ivaEfectivoPorcentaje) ? ivaEfectivoPorcentaje : 0;
  const envio = Number.isFinite(envioEfectivoPorcentaje) ? envioEfectivoPorcentaje : 0;

  // Paso 0 (tareas 6.2/6.3/6.5): conversión de moneda, dentro de la escala intermedia 6, sin
  // redondear a 2 decimales antes de seguir la cadena. Guard exclusivo: moneda === 'USD'.
  const esUsd = moneda === 'USD';
  let cotizacionAplicada = null;
  let monedaAplicada = null;
  let baseConvertida6;
  if (esUsd) {
    const cot = Number.isFinite(cotizacion) ? cotizacion : 0;
    baseConvertida6 = roundHalfUp(base * cot, ESCALA_INTERMEDIA);
    cotizacionAplicada = cot;
    monedaAplicada = 'USD';
  } else {
    baseConvertida6 = roundHalfUp(base, ESCALA_INTERMEDIA);
  }

  // Cascada de descuentos: producto de factores (1 - d_i/100), NUNCA suma (Decisión 2). Lista
  // vacía => factorAcumulado queda en 1 y netoConDescuentos == baseConvertida exactamente.
  let factorAcumulado = 1;
  (descuentosPorcentaje || []).forEach((descuento) => {
    if (descuento === null || descuento === undefined || descuento === '') return;
    const d = Number(descuento);
    if (Number.isNaN(d)) return;
    const factor = roundHalfUp(1 - d / 100, ESCALA_INTERMEDIA);
    factorAcumulado = roundHalfUp(factorAcumulado * factor, ESCALA_INTERMEDIA);
  });

  const netoConDescuentos6 = roundHalfUp(baseConvertida6 * factorAcumulado, ESCALA_INTERMEDIA);

  // IVA sobre el neto con descuentos, y envío en cadena sobre el resultado de aplicar el IVA
  // (Decisión 3, CORREGIDA 2026-08-22 tras verificar contra la planilla real del proveedor
  // Shimura, img/shimura.png fila "escalera shimura aluminio 4.70m": la fórmula anterior sumaba
  // IVA y envío en paralelo sobre el mismo neto, lo que pierde el término cruzado
  // neto × IVA% × envío% cuando los dos son distintos de cero a la vez. Con Ingco nunca se notó
  // porque su IVA siempre es 0%. Ahora netoConDescuentos + montoIva + montoEnvio ==
  // neto × (1 + IVA%/100) × (1 + envío%/100) exactamente, calculando el envío sobre neto+IVA en
  // vez de sobre el neto solo.
  const montoIva6 = roundHalfUp((netoConDescuentos6 * iva) / 100, ESCALA_INTERMEDIA);
  const netoConIva6 = roundHalfUp(netoConDescuentos6 + montoIva6, ESCALA_INTERMEDIA);
  const montoEnvio6 = roundHalfUp((netoConIva6 * envio) / 100, ESCALA_INTERMEDIA);

  const costoUnitario6 = netoConDescuentos6 + montoIva6 + montoEnvio6;

  // Descuento efectivo total equivalente de la cascada: 100 * (1 - factorAcumulado).
  const descuentoEfectivo6 = (1 - factorAcumulado) * 100;

  return {
    netoConDescuentos: roundHalfUp(netoConDescuentos6, ESCALA_FINAL),
    montoIva: roundHalfUp(montoIva6, ESCALA_FINAL),
    montoEnvio: roundHalfUp(montoEnvio6, ESCALA_FINAL),
    descuentoEfectivo: roundHalfUp(descuentoEfectivo6, ESCALA_FINAL),
    costoFinal: roundHalfUp(costoUnitario6, ESCALA_FINAL),
    // Congelado de moneda (tarea 6.5): costo base ya convertido (identidad si no era USD), y la
    // moneda/cotización efectivamente aplicadas — null/null cuando no hubo conversión.
    costoBaseConvertido: roundHalfUp(baseConvertida6, ESCALA_FINAL),
    monedaAplicada,
    cotizacionAplicada,
  };
}
