import axiosInstance from './axios';

export const finanzasApi = {
  fetchResumenFinanzas: async (desde, hasta, usuarioId = null) => {
    const params = { desde, hasta };
    if (usuarioId) params.usuarioId = usuarioId;
    const { data } = await axiosInstance.get('/finanzas/resumen', { params });
    return data;
  },

  fetchVentasFinanzas: async (desde, hasta, q = '', usuarioId = null, page = 0, size = 10) => {
    const params = new URLSearchParams({ desde, hasta, page, size });
    if (q) params.append('q', q);
    if (usuarioId) params.append('usuarioId', usuarioId);
    const response = await axiosInstance.get('/finanzas/ventas', { params });
    return response.data;
  },

  fetchCogsDetalle: async (desde, hasta) => {
    const params = new URLSearchParams({ desde, hasta });
    const response = await axiosInstance.get('/finanzas/cogs-detalle', { params });
    return response.data;
  }
};