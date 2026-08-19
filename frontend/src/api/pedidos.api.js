import api from './axios';

export const pedidosApi = {
  // page/size + filtros opcionales estado/proveedorId. El backend nace paginado (Decisión 11 de
  // design.md) y ordenado por fecha de creación descendente.
  getAll: async ({ page = 0, size = 10, estado, proveedorId } = {}) => {
    const params = { page, size };
    if (estado) params.estado = estado;
    if (proveedorId) params.proveedorId = proveedorId;
    const { data } = await api.get('/pedidos', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/pedidos/${id}`);
    return data;
  },
  create: async (payload) => {
    const { data } = await api.post('/pedidos', payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await api.put(`/pedidos/${id}`, payload);
    return data;
  },
  // Único camino de ingreso de stock por compra (Decisión 13 de design.md). payload:
  // { items: [{ detalleId, cantidadRecibida }] } — TODOS los ítems del pedido, no sólo los tocados.
  confirmarRecepcion: async (id, payload) => {
    const { data } = await api.post(`/pedidos/${id}/recepcion`, payload);
    return data;
  },
  cancelar: async (id) => {
    await api.post(`/pedidos/${id}/cancelar`);
  },
  eliminar: async (id) => {
    await api.delete(`/pedidos/${id}`);
  }
};
