import api from './axios';

export const devolucionesApi = {
    registrarDevolucionLlenas: async (data) => {
        const response = await api.post('/devoluciones', data);
        return response.data;
    }
};
