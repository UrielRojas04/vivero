export const formatearMoneda = (valor) =>
  Number(valor ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default formatearMoneda;
