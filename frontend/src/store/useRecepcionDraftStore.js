import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Borrador de "Confirmar Recepción" (pedido del usuario, grupo 12 de codigo-barras-herramientas):
// las cantidades tocadas y los códigos de barra escaneados en el modal de recepción no deben
// perderse si el modal se cierra (a propósito o sin querer) antes de confirmar — al volver a
// abrirlo para el mismo pedido, tienen que aparecer precargados tal como quedaron. Mismo patrón
// que useCartStore (Zustand + persist en sessionStorage): sobrevive a cerrar/reabrir el modal e
// incluso a un refresh de la página, pero no a cerrar la pestaña del todo.
//
// Guardado por pedidoId (no un único borrador global) porque puede haber más de un pedido
// pendiente de confirmar a la vez.
export const useRecepcionDraftStore = create(
  persist(
    (set, get) => ({
      drafts: {}, // { [pedidoId]: { cantidades: {}, codigosBarra: {} } }

      obtenerDraft: (pedidoId) => get().drafts[pedidoId] || null,

      guardarDraft: (pedidoId, data) => set((state) => ({
        drafts: { ...state.drafts, [pedidoId]: data },
      })),

      // Se llama al confirmar la recepción con éxito: ese pedido ya quedó COMPLETO/PARCIAL, no
      // hay nada más que resumir para él.
      limpiarDraft: (pedidoId) => set((state) => {
        const drafts = { ...state.drafts };
        delete drafts[pedidoId];
        return { drafts };
      }),
    }),
    {
      name: 'recepcion-draft-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
