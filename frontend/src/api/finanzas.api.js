import axiosInstance from './axios';

export const finanzasApi = {
  fetchResumenFinanzas: async (desde, hasta) => {
    const { data } = await axiosInstance.get('/finanzas/resumen', { params: { desde, hasta } });
    return data;
  },

  fetchVentasFinanzas: async (desde, hasta, q = '', page = 0, size = 10) => {
    const params = new URLSearchParams({ desde, hasta, page, size });
    if (q) params.append('q', q);
    const response = await axiosInstance.get('/finanzas/ventas', { params });
    return response.data;
  },

  fetchCogsDetalle: async (desde, hasta) => {
    const params = new URLSearchParams({ desde, hasta });
    const response = await axiosInstance.get('/finanzas/cogs-detalle', { params });
    return response.data;
  }
};