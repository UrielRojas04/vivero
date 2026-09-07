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

// SIN_SEMBRAR -> danger sólido (pedido del dueño 2026-09-06: los empleados necesitan ver de un
// vistazo, incluso desde el celular, qué falta sembrar primero -- el tono neutral pasaba
// desapercibido). SEMBRADAS -> ok sólido, con la misma fuerza visual que SIN_SEMBRAR (mismo
// pedido: "al igual que la de sembrado"), para que ambos estados operativos destaquen igual de
// claro y sólo se diferencien por el color. CONSUMIDA -> warn (sin cambios, no fue parte de este
// pedido: mismo tono ámbar que ya usa el resto de la app para "terminado, prestá atención").
//
// A diferencia del resto de los chips de la app (que usan "-bg", un relleno pálido), acá se usa
// el color sólido (bg-danger / bg-ok, no bg-danger-bg / bg-ok-bg) a propósito: es la combinación
// de mayor contraste disponible en la paleta de 3 tonos, pensada para que se lea de reojo en la
// pantalla chica de un celular en el invernadero.
const TONOS_ESTADO = {
  SIN_SEMBRAR: { chip: 'bg-danger text-paper border border-danger', texto: 'text-danger-ink' },
  SEMBRADAS: { chip: 'bg-ok text-paper border border-ok', texto: 'text-ok-ink' },
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
