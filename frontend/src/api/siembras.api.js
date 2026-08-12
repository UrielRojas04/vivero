import api from './axios';

export const siembrasApi = {
  getAll: () => api.get('/siembras'),
  getById: (id) => api.get(`/siembras/${id}`),
  create: (data) => api.post('/siembras', data),
  update: (id, data) => api.put(`/siembras/${id}`, data),
  delete: (id) => api.delete(`/siembras/${id}`),
  finalizar: (id, idProducto, cantidad) => 
    api.post(`/siembras/${id}/finalizar`, null, { params: { idProducto, cantidad } }),
  pasarAStock: (id, data) => api.post(`/siembras/${id}/pasar-a-stock`, data),
  getAlertas: () => api.get('/siembras/alertas')
};
