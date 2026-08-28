/**
 * chequeDisplay.js
 *
 * Mapeo puro y compartido de la semántica de un Cheque a su presentación:
 * estado (etiqueta + tono + editable) y vencimiento de cobro (días + tono).
 * Consumido por la tarjeta mobile y la tabla desktop de `Cheques.jsx`, por
 * la tabla/tarjeta de "Cheques en Cartera" de `Finanzas.jsx` y por el
 * encabezado de `ChequeEstadoModal`, para que ninguna vista pueda divergir.
 *
 * Convención de archivo: camelCase en `utils/` (no PascalCase, no son
 * componentes), en línea con `saldoDisplay.js` y `errorMessage.js`.
 */

// Corte de "esta semana": unidad con la que se maneja la cartera en el
// mostrador. Ajustable de un solo lugar si el uso real lo pide.
const DIAS_PROXIMO_COBRO = 7;

// EN_CARTERA -> warn (requiere atención, todavía no se resolvió). COBRADO -> neutral de token
// (Decisión 4 de design.md: el azul informativo no tiene par semántico en la paleta de 3 tonos;
// se colapsa a neutral en vez de inventar un --color-info fuera de la spec — pendiente de
// confirmación explícita en el CP2). ENTREGADO -> ok (resuelto, a favor). RECHAZADO -> danger.
const TONOS_ESTADO = {
  EN_CARTERA: { chip: 'bg-warn-bg text-warn-ink', texto: 'text-warn-ink' },
  COBRADO: { chip: 'bg-thead text-body border border-line', texto: 'text-muted' },
  ENTREGADO: { chip: 'bg-ok-bg text-ok-ink', texto: 'text-ok-ink' },
  RECHAZADO: { chip: 'bg-danger-bg text-danger-ink', texto: 'text-danger-ink' },
};

const TONO_GRIS = { texto: 'text-muted', fondo: 'bg-thead', chip: 'bg-thead text-body border border-line' };
const TONO_ROJO = { texto: 'text-danger', fondo: 'bg-danger-bg', chip: 'bg-danger-bg text-danger-ink' };
const TONO_AMBAR = { texto: 'text-warn', fondo: 'bg-warn-bg', chip: 'bg-warn-bg text-warn-ink' };

/**
 * describirEstadoCheque(cheque) -> { estado, etiqueta, tono, editable, rechazable }
 *
 * `etiqueta` absorbe la regla de emisión propia: un cheque propio en
 * EN_CARTERA se presenta como "EMITIDO" y en COBRADO como "DEBITADO",
 * porque desde el punto de vista del vivero es plata que sale, no que entra.
 *
 * `editable` NO cambió de definición (cheques-rebote-endosado, Decisión 6):
 * un cheque `ENTREGADO` sigue sin ser editable en el sentido amplio de "abrir
 * el selector completo de estados". `rechazable` es el indicador nuevo y
 * separado: verdadero cuando el cheque puede pasar a `RECHAZADO`, que hoy es
 * el caso de `EN_CARTERA` (como siempre) y también de `ENTREGADO` (el rebote
 * de un cheque ya endosado). Las vistas dibujan el botón de acción cuando
 * `editable || rechazable`, y es el modal quien decide, con el estado real
 * del cheque, qué opciones ofrecer dentro de él.
 */
export const describirEstadoCheque = (cheque) => {
  const estado = cheque.estado;
  const esEmisionPropia = !!cheque.esEmisionPropia;

  let etiqueta;
  if (esEmisionPropia && estado === 'EN_CARTERA') {
    etiqueta = 'EMITIDO';
  } else if (esEmisionPropia && estado === 'COBRADO') {
    etiqueta = 'DEBITADO';
  } else {
    etiqueta = estado.replace('_', ' ');
  }

  const editable = !['RECHAZADO', 'ENTREGADO', 'COBRADO'].includes(estado);
  const rechazable = estado === 'EN_CARTERA' || estado === 'ENTREGADO';

  return {
    estado,
    etiqueta,
    tono: TONOS_ESTADO[estado] || TONO_GRIS,
    editable,
    rechazable,
  };
};

/**
 * describirOrigenCheque(cheque) -> { esEmisionPropia, etiqueta, tono }
 *
 * Etiqueta explícita de DIRECCIÓN (no solo "propio/tercero", que no dice
 * hacia dónde va la plata y confunde en el mostrador): un cheque con
 * `esEmisionPropia` es uno que el vivero emitió y entregó a un cliente
 * (aumenta la deuda del cliente); si no, es un cheque que el vivero
 * recibió de un cliente como pago (suma saldo a favor). Mismo criterio y
 * mismas palabras que usa `NuevoChequeModal` ("De mí para Cliente" /
 * "De Cliente para mí"), solo que abreviado para caber en un chip.
 */
export const describirOrigenCheque = (cheque) => {
  const esEmisionPropia = !!cheque.esEmisionPropia;
  // "Emitido a cliente" (sale plata) usaba azul informativo -> neutral de token (Decisión 4,
  // misma decisión que COBRADO arriba). "Recibido de cliente" (entra plata) es un evento
  // positivo que depende del mismo dato -> ok, siguiendo la misma asimetría que saldoDisplay.js
  // (entrada = ok, salida sin ser deuda = neutral).
  return esEmisionPropia
    ? { esEmisionPropia, etiqueta: 'Emitido a cliente', tono: { chip: 'bg-thead text-body border border-line' } }
    : { esEmisionPropia, etiqueta: 'Recibido de cliente', tono: { chip: 'bg-ok-bg text-ok-ink' } };
};

/** Normaliza una Date (o string parseable) a medianoche local. */
const aMedianocheLocal = (fecha) => {
  const d = fecha instanceof Date ? new Date(fecha.getTime()) : new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * describirVencimientoCheque(fechaCobro, hoy = new Date()) -> { dias, etiqueta, urgencia, tono }
 *
 * Normaliza ambas fechas a medianoche local antes de restar, para obtener
 * una diferencia de días de calendario (no de milisegundos) y evitar el
 * clásico off-by-one por hora del día u horario de verano. `hoy` es
 * inyectable para que el cálculo sea determinista y testeable.
 */
export const describirVencimientoCheque = (fechaCobro, hoy = new Date()) => {
  if (!fechaCobro) {
    return { dias: null, etiqueta: 'Sin fecha de cobro', urgencia: 'SIN_FECHA', tono: TONO_GRIS };
  }

  const cobro = aMedianocheLocal(fechaCobro);
  const hoyMedianoche = aMedianocheLocal(hoy);
  const dias = Math.round((cobro.getTime() - hoyMedianoche.getTime()) / MS_POR_DIA);

  if (dias < 0) {
    return { dias, etiqueta: `Vencido hace ${Math.abs(dias)} días`, urgencia: 'VENCIDO', tono: TONO_ROJO };
  }
  if (dias === 0) {
    return { dias, etiqueta: 'Se cobra hoy', urgencia: 'HOY', tono: TONO_ROJO };
  }
  if (dias <= DIAS_PROXIMO_COBRO) {
    return { dias, etiqueta: `En ${dias} días`, urgencia: 'PROXIMO', tono: TONO_AMBAR };
  }
  return { dias, etiqueta: `En ${dias} días`, urgencia: 'LEJANO', tono: TONO_GRIS };
};

export default describirEstadoCheque;
