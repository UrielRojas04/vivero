import { Leaf, Wrench, ShoppingBag } from 'lucide-react';

/**
 * getIconoUnidad(unidadNegocioActiva)
 *
 * Mapeo centralizado de la unidad de negocio activa a su ícono de identidad
 * visual (lucide-react). Reemplaza los ternarios de 2 ramas hardcodeados
 * (`unidadNegocioActiva === '2' ? Wrench : Leaf`) que asumían sólo Vivero y
 * Herramientas y hacían caer a Abono en la rama de Vivero por accidente
 * (ej. ícono de hoja en vez de bolsa). Mismo precedente que
 * `saldoDisplay.js`/`chequeDisplay.js`/`bandejasDisplay.js`: una única función
 * de mapeo por estado/tipo, para que una cuarta unidad futura sólo requiera
 * tocar este archivo.
 *
 * '1' -> Vivero (Leaf), '2' -> Herramientas (Wrench), '3' -> Abono (ShoppingBag).
 * Cualquier id desconocido cae en Leaf como default neutral (mismo criterio
 * que el resto del sistema de diseño: acento neutral como caída).
 */
export const ICONOS_POR_UNIDAD = {
  '1': Leaf,
  '2': Wrench,
  '3': ShoppingBag,
};

export const getIconoUnidad = (unidadNegocioActiva) =>
  ICONOS_POR_UNIDAD[unidadNegocioActiva] || Leaf;

export default getIconoUnidad;
