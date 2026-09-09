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
    // Bug real corregido 2026-09-04: antes se armaba el rango con un Date de JS y
    // .toISOString(), que lo convierte a UTC -- en una zona horaria negativa (ej. Argentina,
    // UTC-3) el límite de "fin de mes" quedaba unas horas DENTRO del mes siguiente
    // (23:59:59.999 local == 02:59:59.999 UTC del día 1 del mes que viene). El backend
    // (RendicionColegaController.obtenerLiquidacion) parsea el string recibido con
    // LocalDateTime.parse, que ignora cualquier offset/zona -- así que ese corrimiento se
    // colaba tal cual, y un insumo o gasto cargado el 1° del mes siguiente a la madrugada
    // aparecía por error en el total del mes anterior. Se arma el string de fecha/hora local
    // directo, sin pasar por Date/.toISOString(), para que el backend reciba exactamente el
    // límite que corresponde, sin conversión de zona horaria de por medio.
    const pad = (n) => String(n).padStart(2, '0');
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const desde = `${anio}-${pad(mes)}-01T00:00:00`;
    const hasta = `${anio}-${pad(mes)}-${pad(ultimoDia)}T23:59:59.999`;
    return axios.get('/abono/rendiciones/liquidacion', { params: { desde, hasta } });
  },

  // Liquidación acumulada (sin filtro de mes/año): pedido del dueño para que la pantalla
  // "Finanzas" de Abono muestre ganancias/gastos/ingresos de siempre, sin depender del mes
  // seleccionado -- Sergio y Pablo no cobran su ganancia mes a mes, a veces pasan 2-3 meses.
  getLiquidacionAcumulada: () =>
    axios.get('/abono/rendiciones/liquidacion-acumulada'),

  // Retiro de ganancia personal (change retiro-ganancia-abono): el jefe o el colega registran
  // que sacaron plata de SU PROPIA ganancia ya generada, para uso personal. Distinto de una
  // rendición (esa es plata operativa moviéndose entre las dos cuentas).
  registrarRetiroGanancia: (data) =>
    axios.post('/abono/rendiciones/retiros-ganancia', data),

  getRetirosGanancia: (page = 0, size = 10) =>
    axios.get('/abono/rendiciones/retiros-ganancia', { params: { page, size } }),

  getGananciaDisponible: () =>
    axios.get('/abono/rendiciones/ganancia-disponible'),
};
