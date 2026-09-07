import axios from './axios';

export const getStockPorNegocio = async (unidadId) => {
    const response = await axios.get('/estadisticas/stock', {
        params: { unidadId }
    });
    return response.data;
};

export const getStockCritico = async (unidadId, limit = 10) => {
    const response = await axios.get('/estadisticas/stock-critico', {
        params: { unidadId, limit }
    });
    return response.data;
};

export const getBandejasDisponibles = async () => {
    const response = await axios.get('/estadisticas/bandejas-disponibles');
    return response.data;
};
