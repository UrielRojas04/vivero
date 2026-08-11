import axiosInstance from './axios';

export const finanzasApi = {
  fetchResumenFinanzas: async (desde, hasta) => {
    const { data } = await axiosInstance.get('/finanzas/resumen', { params: { desde, hasta } });
    return data;
  },

  fetchVentasFinanzas: async (desde, hasta, page = 0, size = 10) => {
    const { data } = await axiosInstance.get('/finanzas/ventas', { params: { desde, hasta, page, size } });
    return data;
  }
};