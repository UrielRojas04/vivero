/**
 * registroSemillaDisplay.js
 *
 * Mapeo puro y compartido del estado de un RegistroSemilla (SIN_SEMBRAR / SEMBRADAS /
 * CONSUMIDA) a su presentación: etiqueta + tono. Consumido por la tarjeta mobile y la tabla
 * desktop de RegistroSemillas.jsx, para que ninguna vista pueda divergir (change
 * trazabilidad-semillas-siembras, 2026-09-04).
 *
 * Convención de archivo: camelCase en `utils/` (no PascalCase, no son componentes), en línea
 * con `chequeDisplay.js` y `bandejasDisplay.js`.
 */

// SIN_SEMBRAR -> neutral (todavía no pasó nada). SEMBRADAS -> ok (ya se usó, en curso; sigue
// pudiendo reusarse en otra siembra). CONSUMIDA -> warn (pedido del dueño 2026-09-05: quería
// que se distinguiera con color, no que se confundiera con el gris neutral de SIN_SEMBRAR --
// mismo tono ámbar que ya usa el resto de la app para "terminado, prestá atención").
//
// Bug real corregido (2026-09-05, reportado por el dueño): en modo claro los fondos "-bg" son
// muy pálidos y casi no se distinguen del fondo blanco/crema de la página -- sobre todo
// SIN_SEMBRAR, que usaba bg-thead (pensado para franjas de encabezado de tabla, no para chips).
// Se agrega un borde sólido en el tono correspondiente a cada estado (mismo recurso que ya usa
// la etiqueta de "Lote" en esta misma pantalla: border-accent sobre bg-accent-soft) para que el
// chip tenga un borde marcado incluso cuando el relleno es pálido.
const TONOS_ESTADO = {
  SIN_SEMBRAR: { chip: 'bg-thead text-body border border-line-strong', texto: 'text-muted' },
  SEMBRADAS: { chip: 'bg-ok-bg text-ok-ink border border-ok-line', texto: 'text-ok-ink' },
  CONSUMIDA: { chip: 'bg-warn-bg text-warn-ink border border-warn-line', texto: 'text-warn-ink' },
};

const ETIQUETAS_ESTADO = {
  SIN_SEMBRAR: 'Sin sembrar',
  SEMBRADAS: 'Sembradas',
  CONSUMIDA: 'Consumida',
};

/**
 * describirEstadoRegistroSemilla(estado) -> { etiqueta, tono }
 *
 * Un registro sin estado cargado (dato viejo, previo a este change) se trata como
 * SIN_SEMBRAR: es el default real que el backend le da a todo registro nuevo, así que
 * ausencia de dato equivale a "todavía no se vinculó a ninguna siembra".
 */
export const describirEstadoRegistroSemilla = (estado) => {
  const clave = estado || 'SIN_SEMBRAR';
  return {
    etiqueta: ETIQUETAS_ESTADO[clave] || clave,
    tono: TONOS_ESTADO[clave] || TONOS_ESTADO.SIN_SEMBRAR,
  };
};

export default describirEstadoRegistroSemilla;
