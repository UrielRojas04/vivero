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
};
