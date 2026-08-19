import api from './axios';

export const bandejasApi = {
  // Lista reducida de clientes (id, nombreRazonSocial, balanceBandejas) para la pantalla de
  // Devolución de Bandejas. Nunca trae balanceDinero ni teléfono: es el propósito del endpoint.
  getClientes: async () => {
    const { data } = await api.get('/bandejas/clientes');
    return data;
  }
};
