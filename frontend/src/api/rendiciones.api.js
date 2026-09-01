import axios from './axios';

export const rendicionesApi = {
  // Historial de rendiciones
  getRendiciones: (page = 0, size = 10) => 
    axios.get('/abono/rendiciones', { params: { page, size } }),

  // Registrar nueva rendición
  registrarRendicion: (data) => 
    axios.post('/abono/rendiciones', data),

  // Generar liquidación mensual
  getLiquidacion: (mes, anio) => {
    // Calcular el primer y último día del mes y convertirlos a formato ISO esperado por el backend
    const desde = new Date(anio, mes - 1, 1).toISOString();
    const hasta = new Date(anio, mes, 0, 23, 59, 59, 999).toISOString();
    return axios.get('/abono/rendiciones/liquidacion', { params: { desde, hasta } });
  }
};
