// Replica en JS el CostoCalculator de backend (Java, BigDecimal HALF_UP) del change
// costeo-flexible-por-producto, para que el desglose que ve el usuario en ProductoForm coincida
// al centavo con lo que el backend termina persistiendo en MovimientoStock (verificación 11.12).
//
// Mismo orden de la cadena que el backend: base -> descuentos en cascada -> IVA sobre el neto ->
// envío sobre el neto -> suma. IVA y envío se calculan los dos sobre el mismo neto, nunca uno
// sobre el resultado del otro (Decisión 3). No comparte código real con CostoCalculator.java (no
// se puede compartir Java y JS): esta es la segunda y última implementación de la fórmula que
// sobrevive a este change (Decisión 6) — reemplaza la cuarta copia manual que tenía ProductoForm.

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
 * CostoCalculator.calcular(costoBase, descuentosPorcentaje, ivaEfectivo, envioEfectivo) en
 * backend, devolviendo el mismo desglose de 5 valores (tarea 9.1).
 *
 * @param {number} costoBase
 * @param {number[]} descuentosPorcentaje - porcentajes de descuento, aplicados en cascada
 *   (Decisión 2: producto de factores, nunca suma). Vacío o null => sin reducción.
 * @param {number} ivaEfectivoPorcentaje - IVA ya resuelto (ver resolverEfectivo).
 * @param {number} envioEfectivoPorcentaje - envío ya resuelto (ver resolverEfectivo).
 */
export function calcularCosto(costoBase, descuentosPorcentaje, ivaEfectivoPorcentaje, envioEfectivoPorcentaje) {
  const base = Number.isFinite(costoBase) ? costoBase : 0;
  const iva = Number.isFinite(ivaEfectivoPorcentaje) ? ivaEfectivoPorcentaje : 0;
  const envio = Number.isFinite(envioEfectivoPorcentaje) ? envioEfectivoPorcentaje : 0;

  // Cascada de descuentos: producto de factores (1 - d_i/100), NUNCA suma (Decisión 2). Lista
  // vacía => factorAcumulado queda en 1 y netoConDescuentos == costoBase exactamente.
  let factorAcumulado = 1;
  (descuentosPorcentaje || []).forEach((descuento) => {
    if (descuento === null || descuento === undefined || descuento === '') return;
    const d = Number(descuento);
    if (Number.isNaN(d)) return;
    const factor = roundHalfUp(1 - d / 100, ESCALA_INTERMEDIA);
    factorAcumulado = roundHalfUp(factorAcumulado * factor, ESCALA_INTERMEDIA);
  });

  const netoConDescuentos6 = roundHalfUp(base * factorAcumulado, ESCALA_INTERMEDIA);

  // IVA y envío, los dos sobre el mismo neto con descuentos (Decisión 3) — nunca uno sobre el
  // resultado del otro (si no, el envío se infla solo al activar el IVA).
  const montoIva6 = roundHalfUp((netoConDescuentos6 * iva) / 100, ESCALA_INTERMEDIA);
  const montoEnvio6 = roundHalfUp((netoConDescuentos6 * envio) / 100, ESCALA_INTERMEDIA);

  const costoUnitario6 = netoConDescuentos6 + montoIva6 + montoEnvio6;

  // Descuento efectivo total equivalente de la cascada: 100 * (1 - factorAcumulado).
  const descuentoEfectivo6 = (1 - factorAcumulado) * 100;

  return {
    netoConDescuentos: roundHalfUp(netoConDescuentos6, ESCALA_FINAL),
    montoIva: roundHalfUp(montoIva6, ESCALA_FINAL),
    montoEnvio: roundHalfUp(montoEnvio6, ESCALA_FINAL),
    descuentoEfectivo: roundHalfUp(descuentoEfectivo6, ESCALA_FINAL),
    costoFinal: roundHalfUp(costoUnitario6, ESCALA_FINAL),
  };
}
