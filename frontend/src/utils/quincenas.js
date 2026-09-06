/**
 * quincenas.js
 *
 * Cálculo puro de rangos de fecha a partir de hoy, para los filtros de Registro de Semillas.jsx:
 * "Quincena actual" / "Próxima quincena" (días 1-15 y 16-fin de mes, change
 * trazabilidad-semillas-siembras, 2026-09-04, Decisión 5 de design.md: calculados por fecha de
 * hoy, sin selección manual de mes/año) y "Próximo mes" (pedido del dueño 2026-09-05).
 */

/**
 * calcularRangoQuincena(offset, hoy = new Date()) -> { desde: Date, hasta: Date }
 *
 * offset 0 = la quincena en la que cae `hoy`. offset 1 = la siguiente. Los objetos Date
 * devueltos están normalizados a medianoche local, listos para comparar contra una fecha
 * "sólo día" (sin hora).
 */
export const calcularRangoQuincena = (offset, hoy = new Date()) => {
  const esPrimeraQuincenaActual = hoy.getDate() <= 15;
  const indice = (esPrimeraQuincenaActual ? 0 : 1) + offset;
  const mesesAAvanzar = Math.floor(indice / 2);
  const esPrimeraQuincena = indice % 2 === 0;
  const mesDestino = hoy.getMonth() + mesesAAvanzar;

  const anioNormalizado = new Date(hoy.getFullYear(), mesDestino, 1).getFullYear();
  const mesNormalizado = new Date(hoy.getFullYear(), mesDestino, 1).getMonth();

  const desde = new Date(anioNormalizado, mesNormalizado, esPrimeraQuincena ? 1 : 16);
  const hasta = esPrimeraQuincena
    ? new Date(anioNormalizado, mesNormalizado, 15)
    : new Date(anioNormalizado, mesNormalizado + 1, 0); // día 0 del mes siguiente = último día de este mes

  return { desde, hasta };
};

/**
 * calcularRangoProximoMes(hoy = new Date()) -> { desde: Date, hasta: Date }
 *
 * El mes calendario completo siguiente al de `hoy` (pedido del dueño 2026-09-05, filtro
 * "Próximo mes" en Registro de Semillas -- distinto de "Próxima quincena": cubre las 4-5
 * semanas completas del mes que viene, no sólo la primera/segunda mitad).
 */
export const calcularRangoProximoMes = (hoy = new Date()) => {
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
  return { desde, hasta };
};

/**
 * fechaStringDentroDeRango(fechaStr, desde, hasta) -> boolean
 *
 * `fechaStr` es una fecha "sólo día" en formato ISO (yyyy-MM-dd), como la que devuelve el
 * backend para LocalDate. Se parsea como fecha local (no UTC) para evitar el desfasaje de
 * huso horario ya conocido en este proyecto (ver rendiciones.api.js).
 */
export const fechaStringDentroDeRango = (fechaStr, desde, hasta) => {
  if (!fechaStr) return false;
  const [anio, mes, dia] = fechaStr.split('-').map(Number);
  if (!anio || !mes || !dia) return false;
  const fecha = new Date(anio, mes - 1, dia);
  return fecha >= desde && fecha <= hasta;
};
