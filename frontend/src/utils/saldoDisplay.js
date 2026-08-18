/**
 * describirSaldo(balance)
 *
 * Mapeo puro y compartido de un saldo de cuenta corriente (dinero) a su
 * presentación: estado semántico, etiqueta legible, monto absoluto formateado
 * y las clases Tailwind (tono) a usar en cada vista (tabla, card, modal).
 *
 * Convención de signo (no se toca la semántica del backend):
 * - balance < 0  -> el cliente DEBE (deuda)      -> rojo
 * - balance > 0  -> el cliente tiene A_FAVOR      -> emerald
 * - balance === 0 / null / undefined -> NEUTRO   -> gris (antes se pintaba verde, bug corregido)
 */
export const describirSaldo = (balance) => {
  const valor = balance || 0;

  let estado;
  let etiqueta;

  if (valor < 0) {
    estado = 'DEUDA';
    etiqueta = 'Debe';
  } else if (valor > 0) {
    estado = 'A_FAVOR';
    etiqueta = 'A favor';
  } else {
    estado = 'NEUTRO';
    etiqueta = 'Sin saldo';
  }

  const monto = Math.abs(valor).toLocaleString('es-AR');

  const tonosPorEstado = {
    DEUDA: {
      texto: 'text-red-600',
      fondo: 'bg-red-50',
      chip: 'bg-red-50 text-red-700',
    },
    A_FAVOR: {
      texto: 'text-emerald-600',
      fondo: 'bg-emerald-50',
      chip: 'bg-emerald-50 text-emerald-700',
    },
    NEUTRO: {
      texto: 'text-gray-500',
      fondo: 'bg-gray-100',
      chip: 'bg-gray-100 text-gray-600',
    },
  };

  return {
    estado,
    etiqueta,
    monto,
    tono: tonosPorEstado[estado],
  };
};

export default describirSaldo;
