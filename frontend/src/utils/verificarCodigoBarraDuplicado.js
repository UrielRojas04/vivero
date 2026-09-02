import api from '../api/axios';

// Grupo 13 de tasks.md de codigo-barras-herramientas (extensión post-cierre: aviso de código
// duplicado al escanear). Centraliza acá la única llamada de red que necesitan tanto
// ProductoForm.jsx como RecepcionPedidoModal.jsx para chequear, apenas se escanea un código, si
// ya está asignado a otro producto — reusa el mismo GET que ya usa Productos.jsx para su propio
// flujo de búsqueda (handleCodigoDetectado), no se agrega ningún endpoint nuevo para esto.
//
// Devuelve el ProductoDTO encontrado, o null si el backend respondió 404 (nadie tiene ese
// código todavía — no es un conflicto). Cualquier otro error (403, 500, red caída) se propaga tal
// cual para que el componente que llama decida cómo avisarlo (mismo criterio que
// Productos.jsx.handleCodigoDetectado).
export async function verificarCodigoBarraDuplicado(codigo) {
  try {
    const { data } = await api.get(`/productos/codigo-barra/${encodeURIComponent(codigo)}`);
    return data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return null;
    }
    throw err;
  }
}
