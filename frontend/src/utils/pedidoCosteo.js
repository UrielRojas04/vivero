// Único punto de cálculo del costo de línea de un pedido a proveedor (change
// pedido-planilla-editable, grupo 1 — fix del bug del total). Antes de este archivo existían TRES
// cálculos de costo por línea en `PedidoNuevo.jsx`: el `reduce` del total (crudo, sin IVA/envío/
// descuentos), `TablaCosteoProductoExistente` (correcto) y la vista previa de línea pendiente
// (correcto). El bug reportado (img/pedido ejemplo.png: la fila decía $3.811,50 y los totales
// decían $3.000) no era un typo en el `reduce`, era que había una fórmula de más — cualquier fix
// que no unifique los tres puntos vuelve a divergir en el próximo cambio. Ver design.md,
// Decisión 1.
//
// Funciones puras, sin React: son la única parte de este change verificable sin navegador (no hay
// test runner en el frontend todavía — ver Open Question 1 de design.md).

import { calcularCosto } from './costeo.js';

/**
 * Resuelve los porcentajes de descuento aplicables a una línea de pedido.
 *
 * Ampliación 2026-08-25 (pedido explícito del dueño del negocio, "los descuentos y los impuestos
 * pueden ir variando a pesar de que sea el mismo producto" — mismo criterio ya aplicado antes a
 * IVA/envío): la fuente YA NO depende del tipo de línea. Antes (Decisión 1 original de design.md)
 * una línea de producto existente leía `producto.descuentos` de la ficha del catálogo (sólo
 * lectura) mientras que una línea pendiente leía `linea.descuentosPactados` (editable); ahora
 * ambos tipos de línea son editables por igual y las dos leen `linea.descuentosPactados` — para
 * una línea existente, ese campo se precarga con los descuentos ACTUALES de la ficha al elegir el
 * producto (`seleccionarProducto` en PedidoNuevo.jsx) y desde ahí el usuario puede editarlos sin
 * que la ficha se toque hasta confirmar la recepción (ver
 * `ProductoServiceImpl.actualizarDescuentosSiDistinto` en el backend). Ya no necesita el catálogo
 * completo de `productos` para resolver la fuente (antes usado sólo para buscar
 * `producto.descuentos`) — se saca el parámetro; los llamadores se actualizan junto con este
 * cambio.
 *
 * Filtra entradas sin porcentaje numérico (fila de descuento a medio cargar).
 *
 * @param {object} linea
 * @returns {number[]}
 */
export function porcentajesDescuentoDeLinea(linea) {
  return (linea.descuentosPactados || [])
    .map((d) => (d.porcentaje !== null && d.porcentaje !== undefined && d.porcentaje !== ''
      ? parseFloat(d.porcentaje)
      : NaN))
    .filter((p) => !Number.isNaN(p));
}

/**
 * Desglose completo del costo de una línea de pedido, pasando por la misma cadena de costeo que
 * usa el backend al confirmar la recepción (`calcularCosto` de `utils/costeo.js`). Devuelve el
 * desglose completo (no sólo `costoFinal`) para que llamadores que necesitan otro campo del
 * desglose — por ejemplo `costoBaseConvertido` para el aviso de auto-ratchet en
 * `TablaCosteoProductoExistente` — no tengan que volver a llamar a `calcularCosto` por su cuenta
 * (design.md, tarea 1.4: "no duplicar el cálculo").
 *
 * @param {object} linea
 * @param {object[]} productos
 * @param {string|number} cotizacionDolar - cotización del pedido, sólo relevante si la línea es USD.
 * @returns {object|null} el desglose de `calcularCosto`, o `null` si la línea está a medio cargar
 *   (sin `costoUnitarioPactado` numérico).
 */
export function desgloseDeLinea(linea, productos, cotizacionDolar) {
  const costoBase = linea.costoUnitarioPactado !== '' && linea.costoUnitarioPactado !== null && linea.costoUnitarioPactado !== undefined
    ? parseFloat(linea.costoUnitarioPactado)
    : NaN;
  if (!Number.isFinite(costoBase)) return null;

  const iva = linea.ivaPactadoPorcentaje !== '' && linea.ivaPactadoPorcentaje !== null && linea.ivaPactadoPorcentaje !== undefined
    ? (parseFloat(linea.ivaPactadoPorcentaje) || 0)
    : 0;
  const envio = linea.envioPactadoPorcentaje !== '' && linea.envioPactadoPorcentaje !== null && linea.envioPactadoPorcentaje !== undefined
    ? (parseFloat(linea.envioPactadoPorcentaje) || 0)
    : 0;

  const porcentajesDescuento = porcentajesDescuentoDeLinea(linea);
  // Guard de moneda (mismo criterio que calcularCosto/CostoCalculator): sólo se arma cotización
  // si la línea es USD. Sin cotización cargada, `parseFloat('') || 0` da 0 — calcularCosto con
  // cotización 0 hace que la base convertida (y por lo tanto todo el resto de la cadena) sea 0,
  // así que la línea aporta 0 en vez de sumar dólares como si fueran pesos.
  const cotizacionLinea = linea.monedaLinea === 'USD' ? (parseFloat(cotizacionDolar) || 0) : null;

  return calcularCosto(costoBase, porcentajesDescuento, iva, envio, linea.monedaLinea, cotizacionLinea);
}

/**
 * Colapsa una lista de porcentajes de descuento en un único porcentaje EFECTIVO, aplicando la
 * misma cascada (producto de factores) que `calcularCosto`/`CostoCalculator.java`: no es una
 * suma simple, dos descuentos del 10% no dan 20% sino ~19%. Usado por la celda-resumen de
 * descuentos (change pedido-planilla-editable, grupo 4 — Decisión 4 de design.md) para mostrar
 * "(-14,5%)" junto a los chips, sin recalcular la cascada con una fórmula distinta a la que ya
 * usa `desgloseDeLinea` para el costo real de la fila (mismo motivo que Decisión 1: un solo
 * cálculo, nunca dos fórmulas que puedan divergir).
 *
 * @param {number[]} porcentajes
 * @returns {number} porcentaje efectivo (0 si la lista está vacía)
 */
export function efectivoCascadaDescuentos(porcentajes) {
  if (!porcentajes || porcentajes.length === 0) return 0;
  let factor = 1;
  porcentajes.forEach((p) => {
    factor *= (1 - p / 100);
  });
  return (1 - factor) * 100;
}

/**
 * Costo final (ya con descuentos/IVA/envío/conversión aplicados) de una línea de pedido. Único
 * punto de cálculo que consumen el total del header/footer, `TablaCosteoProductoExistente` y la
 * vista previa de línea pendiente — los tres puntos que antes calculaban por separado.
 *
 * @param {object} linea
 * @param {object[]} productos
 * @param {string|number} cotizacionDolar
 * @returns {number} `costoFinal`, o `0` si la línea está a medio cargar (sin costo pactado
 *   numérico) o si es USD sin cotización cargada.
 */
export function costoFinalDeLinea(linea, productos, cotizacionDolar) {
  const desglose = desgloseDeLinea(linea, productos, cotizacionDolar);
  return desglose ? desglose.costoFinal : 0;
}
