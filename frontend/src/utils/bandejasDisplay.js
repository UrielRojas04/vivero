/**
 * bandejasDisplay.js
 *
 * Mapeo puro y compartido de un movimiento de bandejas (`HistorialBandejasDTO`)
 * a su presentación: tipo de movimiento (etiqueta + tono) y detalle de origen
 * (venta asociada o devolución directa). Consumido por la tarjeta mobile y la
 * tabla desktop de `HistorialBandejasModal.jsx`, para que ninguna vista pueda
 * divergir.
 *
 * Convención de archivo: camelCase en `utils/` (no PascalCase, no son
 * componentes), en línea con `chequeDisplay.js` y `saldoDisplay.js`.
 */

const TONO_ENTREGA = { chip: 'bg-orange-50 text-orange-700', texto: 'text-orange-700' };
const TONO_DEVOLUCION = { chip: 'bg-emerald-50 text-emerald-700', texto: 'text-emerald-700' };

/**
 * describirTipoMovimiento(tipo) -> { etiqueta, tono: { chip, texto } }
 *
 * `'ENTREGA'` se presenta en tono de salida (naranja); cualquier otro valor
 * (incluidos `null`/`undefined`, en la práctica `DEVOLUCION`) se presenta en
 * tono de ingreso (esmeralda). `etiqueta` es el propio `tipo`, con fallback
 * a cadena vacía si viene nulo.
 */
export const describirTipoMovimiento = (tipo) => {
  const etiqueta = tipo || '';
  const tono = tipo === 'ENTREGA' ? TONO_ENTREGA : TONO_DEVOLUCION;
  return { etiqueta, tono };
};

/**
 * describirDetalleMovimiento(mov) -> { etiqueta, esVenta }
 *
 * Con `mov.ventaId` presente, identifica la venta de origen por su número;
 * en caso contrario, lo identifica como una devolución directa.
 */
export const describirDetalleMovimiento = (mov) => {
  const ventaId = mov?.ventaId;
  return ventaId
    ? { etiqueta: `Venta #${ventaId}`, esVenta: true }
    : { etiqueta: 'Devolución directa', esVenta: false };
};

export default describirTipoMovimiento;
