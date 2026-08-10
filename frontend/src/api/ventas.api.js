import axiosInstance from './axios';

export const ventasApi = {
  crearVenta: async (ventaRequest) => {
    const { data } = await axiosInstance.post('/ventas', ventaRequest);
    return data;
  },

  listarVentas: async () => {
    const { data } = await axiosInstance.get('/ventas');
    return data;
  }
};
