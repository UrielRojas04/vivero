import api from './axios';

export const registroSemillasApi = {
  getAll: () => api.get('/registro-semillas'),
  getById: (id) => api.get(`/registro-semillas/${id}`),
  create: (data) => api.post('/registro-semillas', data),
  update: (id, data) => api.put(`/registro-semillas/${id}`, data),
  delete: (id) => api.delete(`/registro-semillas/${id}`),
  consumir: (id) => api.patch(`/registro-semillas/${id}/consumir`),
  getAlertas: () => api.get('/registro-semillas/alertas'),
};
