/**
 * describirSaldo(balance)
 *
 * Mapeo puro y compartido de un saldo de cuenta corriente (dinero) a su
 * presentación: estado semántico, etiqueta legible, monto absoluto formateado
 * y las clases Tailwind (tono) a usar en cada vista (tabla, card, modal).
 *
 * Convención de signo (no se toca la semántica del backend):
 * - balance < 0  -> el cliente DEBE (deuda)      -> danger
 * - balance > 0  -> el cliente tiene A_FAVOR      -> ok
 * - balance === 0 / null / undefined -> NEUTRO   -> neutral (antes se pintaba verde, bug corregido)
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
      texto: 'text-danger',
      fondo: 'bg-danger-bg',
      chip: 'bg-danger-bg text-danger-ink',
    },
    A_FAVOR: {
      texto: 'text-ok',
      fondo: 'bg-ok-bg',
      chip: 'bg-ok-bg text-ok-ink',
    },
    NEUTRO: {
      texto: 'text-muted',
      fondo: 'bg-thead',
      chip: 'bg-thead text-body border border-line',
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
