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

const TONOS_ESTADO = {
  EN_CARTERA: { chip: 'bg-amber-100 text-amber-800', texto: 'text-amber-800' },
  COBRADO: { chip: 'bg-blue-100 text-blue-800', texto: 'text-blue-800' },
  ENTREGADO: { chip: 'bg-emerald-100 text-emerald-800', texto: 'text-emerald-800' },
  RECHAZADO: { chip: 'bg-red-100 text-red-800', texto: 'text-red-800' },
};

const TONO_GRIS = { texto: 'text-gray-500', fondo: 'bg-gray-100', chip: 'bg-gray-100 text-gray-600' };
const TONO_ROJO = { texto: 'text-red-600', fondo: 'bg-red-50', chip: 'bg-red-50 text-red-700' };
const TONO_AMBAR = { texto: 'text-amber-600', fondo: 'bg-amber-50', chip: 'bg-amber-50 text-amber-700' };

/**
 * describirEstadoCheque(cheque) -> { estado, etiqueta, tono, editable }
 *
 * `etiqueta` absorbe la regla de emisión propia: un cheque propio en
 * EN_CARTERA se presenta como "EMITIDO" y en COBRADO como "DEBITADO",
 * porque desde el punto de vista del vivero es plata que sale, no que entra.
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

  return {
    estado,
    etiqueta,
    tono: TONOS_ESTADO[estado] || TONO_GRIS,
    editable,
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
  return esEmisionPropia
    ? { esEmisionPropia, etiqueta: 'Emitido a cliente', tono: { chip: 'bg-blue-100 text-blue-800' } }
    : { esEmisionPropia, etiqueta: 'Recibido de cliente', tono: { chip: 'bg-emerald-100 text-emerald-800' } };
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
