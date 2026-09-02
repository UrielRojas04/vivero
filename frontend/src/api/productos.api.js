import api from './axios';

export const productosApi = {
  getAll: async () => {
    const { data } = await api.get('/productos');
    return data;
  },
  // Reutilizado tal cual (sin endpoint nuevo) para el alta inline de producto desde el armado de
  // un pedido a proveedor — ver Decisión 3 de openspec/changes/herramientas-pedidos-proveedores/design.md.
  create: async (payload) => {
    const { data } = await api.post('/productos', payload);
    return data;
  },
  // Grupo 13 de codigo-barras-herramientas (extensión post-cierre): libera un código de barras
  // de quien lo tenga hoy, sin asignárselo a nadie — usado por "Quedarme con este código" en
  // ProductoForm.jsx y RecepcionPedidoModal.jsx tras el aviso de duplicado al escanear.
  liberarCodigoBarra: async (codigo) => {
    await api.delete(`/productos/codigo-barra/${encodeURIComponent(codigo)}`);
  }
};
