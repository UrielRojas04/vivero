/**
 * diasCrecimiento.js
 *
 * Cálculo puro compartido de fechas a partir de los días de crecimiento mensuales de una
 * VariedadPlanta (`diasEnero`...`diasDiciembre`). Usado tanto por SiembraForm.jsx (fecha de
 * siembra conocida -> fecha estimada de entrega, sumando días) como por
 * RegistroSemillaForm.jsx (fecha de entrega pedida por el cliente -> fecha de siembra
 * estimada, restando días -- pedido del dueño, 2026-09-04). Antes de este archivo, la lógica
 * de "sumar" vivía duplicada sólo en SiembraForm.jsx; se extrae acá para que ambas direcciones
 * usen exactamente el mismo mapeo de meses y no puedan divergir.
 *
 * Convención de archivo: camelCase en `utils/` (no PascalCase, no son componentes), en línea
 * con `quincenas.js` y `registroSemillaDisplay.js`.
 */

const MESES_CAMPO = [
  'diasEnero', 'diasFebrero', 'diasMarzo', 'diasAbril',
  'diasMayo', 'diasJunio', 'diasJulio', 'diasAgosto',
  'diasSeptiembre', 'diasOctubre', 'diasNoviembre', 'diasDiciembre'
];

/**
 * obtenerDiasCrecimiento(planta, date) -> number
 *
 * Días de crecimiento de `planta` para el mes de `date` (0 si falta la planta o el mes no
 * tiene un valor cargado).
 */
export const obtenerDiasCrecimiento = (planta, date = new Date()) => {
  if (!planta) return 0;
  return planta[MESES_CAMPO[date.getMonth()]] || 0;
};

/**
 * calcularFechaSumandoDias(planta, fechaBaseISO) -> string ('' si no se puede calcular)
 *
 * Fecha estimada de entrega = fechaBase (fin de siembra) + días de crecimiento del MES de
 * fechaBase. Es la dirección "hacia adelante": conocés cuándo sembrás, no sabés cuándo va a
 * estar lista.
 */
export const calcularFechaSumandoDias = (planta, fechaBaseISO) => {
  if (!planta || !fechaBaseISO) return '';
  const date = new Date(`${fechaBaseISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const dias = obtenerDiasCrecimiento(planta, date);
  if (!dias || dias <= 0) return '';
  date.setDate(date.getDate() + dias);
  return date.toISOString().split('T')[0];
};

/**
 * calcularFechaRestandoDias(planta, fechaObjetivoISO) -> string ('' si no se puede calcular)
 *
 * Fecha estimada de siembra = fechaObjetivo (entrega pedida por el cliente) - días de
 * crecimiento. Es la dirección "hacia atrás": sabés cuándo la quieren retirar, no sabés
 * todavía cuándo hay que sembrarla.
 *
 * Bug real corregido (2026-09-05, reportado por el dueño): la primera versión usaba un solo
 * paso con los días de crecimiento del MES de la fecha de ENTREGA. Si ese mes tiene más días
 * de crecimiento cargados que el mes real en que termina cayendo la siembra (variedades que
 * crecen a ritmo distinto según la época del año), el resultado quedaba corrido hacia atrás de
 * más -- la notificación pedía sembrar antes de lo necesario, e inconsistente con
 * `calcularFechaSumandoDias`: sembrar en la fecha sugerida NO reproducía la fecha de entrega
 * pedida.
 *
 * Se corrige con una segunda vuelta: se recalcula usando los días de crecimiento del MES DE
 * SIEMBRA que la primera vuelta estimó (en vez de seguir usando el mes de entrega). Con esto,
 * `calcularFechaSumandoDias(planta, resultado)` vuelve a dar exactamente `fechaObjetivo` --
 * las dos direcciones quedan matemáticamente consistentes entre sí. Sigue siendo una
 * aproximación frente a la realidad (el crecimiento real nunca es exacto), pero ya no es
 * inconsistente contra sí misma.
 */
export const calcularFechaRestandoDias = (planta, fechaObjetivoISO) => {
  if (!planta || !fechaObjetivoISO) return '';
  const fechaObjetivo = new Date(`${fechaObjetivoISO}T00:00:00`);
  if (Number.isNaN(fechaObjetivo.getTime())) return '';

  const diasSegunMesEntrega = obtenerDiasCrecimiento(planta, fechaObjetivo);
  if (!diasSegunMesEntrega || diasSegunMesEntrega <= 0) return '';

  const estimacionInicial = new Date(fechaObjetivo);
  estimacionInicial.setDate(estimacionInicial.getDate() - diasSegunMesEntrega);

  const diasSegunMesSiembra = obtenerDiasCrecimiento(planta, estimacionInicial);
  const diasAUsar = diasSegunMesSiembra > 0 ? diasSegunMesSiembra : diasSegunMesEntrega;

  const resultado = new Date(fechaObjetivo);
  resultado.setDate(resultado.getDate() - diasAUsar);
  return resultado.toISOString().split('T')[0];
};
