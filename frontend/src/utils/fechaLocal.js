/**
 * fechaLocal.js
 *
 * Bug real corregido (2026-09-04, reportado por el dueño: seleccionaba hoy 4/9 en el modal de
 * Siembra pero la tarjeta mostraba "Sembrado: 3/9"). El backend serializa los campos `LocalDate`
 * (fechaSiembraInicio, fechaSiembraFin, fechaEstimada, etc.) como string "YYYY-MM-DD" puro, sin
 * hora ni zona horaria. `new Date("2026-09-04")` lo interpreta como medianoche UTC; al mostrarlo
 * con `.toLocaleDateString()` en un huso horario negativo (Argentina, UTC-3) esa medianoche UTC
 * cae en el día anterior en hora local -> se ve un día atrás.
 *
 * `parsearFechaLocal` arma el `Date` a partir de año/mes/día directamente en huso horario local
 * (sin pasar por UTC), así el día que se ve es siempre el mismo que mandó el backend.
 */

export const parsearFechaLocal = (fechaISO) => {
  if (!fechaISO) return null;
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
};

export const formatearFechaLocal = (fechaISO) => {
  const fecha = parsearFechaLocal(fechaISO);
  return fecha ? fecha.toLocaleDateString('es-AR') : null;
};

export default formatearFechaLocal;
