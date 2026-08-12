import api from './axios';

export const clientesApi = {
  getAll: async () => {
    const { data } = await api.get('/clientes');
    return data;
  },
  ajustarSaldoCliente: async (id, monto) => {
    const { data } = await api.post(`/clientes/${id}/saldo/ajuste`, { monto });
    return data;
  }
};
