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

// TONO_ENTREGA migrado en el barrido de cierre G8 (tasks.md 13.1): el naranja literal no
// venía de la paleta vieja reemplazada por G0-G7, por eso quedó fuera del grep base de Capa A
// y sin migrar hasta esta ronda. Semántico por Decisión 3 (depende de `tipo === 'ENTREGA'`,
// dato de negocio) → `warn`, mismo vocabulario que `EN_CARTERA`/`TONO_AMBAR` en `chequeDisplay.js`.
const TONO_ENTREGA = { chip: 'bg-warn-bg text-warn-ink', texto: 'text-warn-ink' };
const TONO_DEVOLUCION = { chip: 'bg-ok-bg text-ok-ink', texto: 'text-ok-ink' };

/**
 * describirTipoMovimiento(tipo) -> { etiqueta, tono: { chip, texto } }
 *
 * `'ENTREGA'` se presenta en tono de salida (`warn`); cualquier otro valor
 * (incluidos `null`/`undefined`, en la práctica `DEVOLUCION`) se presenta en
 * tono de ingreso (ok, Decisión 3 de design.md: depende del dato `tipo`).
 * `etiqueta` es el propio `tipo`, con fallback a cadena vacía si viene nulo.
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
