import axios from './axios';

export const abonoApi = {
  // Stock actual (raw - StockAbono entities)
  getStock: () => axios.get('/abono/stock'),

  // Stock consolidado (Producto | Invernadero | Colega | Total)
  getStockConsolidado: () => axios.get('/abono/stock/consolidado'),

  // Historial de movimientos (producción, traslados, mermas, etc.)
  getHistorial: (page = 0, size = 10, tipos = null) => {
    const params = { page, size };
    if (tipos) params.tipos = tipos;
    return axios.get('/abono/stock/historial', { params });
  },

  // Registrar nueva producción (ingreso a Invernadero)
  registrarProduccion: (data) => 
    axios.post('/abono/stock/produccion', data),

  // Trasladar stock (Invernadero -> Depósito Colega)
  registrarTraslado: (data) => 
    axios.post('/abono/stock/traslados', data),

  // Ajustar stock (correcciones o mermas)
  registrarAjuste: (data) =>
    axios.post('/abono/stock/ajustes', data),

  // Historial global de cobros de Abono (change historial-cobros-abono): ambas cuentas juntas,
  // paginado, filtrable por rango de fechas y por cliente. Sólo se envían los parámetros
  // presentes (mismo estilo que getHistorial).
  getHistorialCobros: ({ page = 0, size = 20, desde, hasta, q } = {}) => {
    const params = { page, size };
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (q) params.q = q;
    return axios.get('/abono/cobros', { params });
  },
};
