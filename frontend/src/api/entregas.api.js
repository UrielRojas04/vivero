import api from './axios';

// Change entregas-pendientes-confirmacion-vivero (tarea 12.1): los 7 endpoints de
// EntregaPendienteController, mismo estilo que registroSemillas.api.js / bandejas.api.js --
// funciones finas que devuelven `response.data`, sin lógica de negocio acá.
export const entregasApi = {
  registrar: async (data) => {
    const response = await api.post('/entregas-pendientes', data);
    return response.data;
  },

  listarMias: async (page = 0, size = 20) => {
    const response = await api.get('/entregas-pendientes/mias', { params: { page, size } });
    return response.data;
  },

  listar: async (estado, page = 0, size = 20) => {
    const response = await api.get('/entregas-pendientes', { params: { estado, page, size } });
    return response.data;
  },

  obtenerPorId: async (id) => {
    const response = await api.get(`/entregas-pendientes/${id}`);
    return response.data;
  },

  obtenerFirma: async (id) => {
    const response = await api.get(`/entregas-pendientes/${id}/firma`);
    return response.data;
  },

  confirmar: async (id, data) => {
    const response = await api.post(`/entregas-pendientes/${id}/confirmar`, data);
    return response.data;
  },

  rechazar: async (id, data) => {
    const response = await api.post(`/entregas-pendientes/${id}/rechazar`, data);
    return response.data;
  },
};
