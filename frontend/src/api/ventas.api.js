import axiosInstance from './axios';

export const ventasApi = {
  crearVenta: async (ventaRequest) => {
    const { data } = await axiosInstance.post('/ventas', ventaRequest);
    return data;
  },

  listarVentas: async () => {
    const { data } = await axiosInstance.get('/ventas');
    return data;
  },

  // Pago sobre una venta YA existente (el cliente vuelve y trae plata a cuenta de lo que debía).
  // El backend recalcula el estadoPago de la venta y actualiza el saldo de cuenta corriente.
  registrarPago: async (ventaId, payload) => {
    const { data } = await axiosInstance.post(`/ventas/${ventaId}/pagos`, payload);
    return data;
  },

  // Una venta puntual con sus items, para el botón "ver remito" del historial de cobros de Abono.
  obtenerPorId: async (ventaId) => {
    const { data } = await axiosInstance.get(`/ventas/${ventaId}`);
    return data;
  }
};
