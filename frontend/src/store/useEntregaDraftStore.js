import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Borrador de "Registrar entrega" (pedido del usuario, change entregas-pendientes-confirmacion-
// vivero): cliente, líneas, observación y firma ya cargados no deben perderse si el empleado
// cambia de sección sin querer antes de terminar de registrar la entrega. Mismo patrón que
// useRecepcionDraftStore/useCartStore (Zustand + persist en sessionStorage): sobrevive a navegar
// entre secciones e incluso a un refresh de la página, pero no a cerrar la pestaña del todo.
//
// Un solo borrador global (no por id, a diferencia de useRecepcionDraftStore) porque acá sólo hay
// un formulario de registro a la vez, no varios pedidos en paralelo.
export const useEntregaDraftStore = create(
  persist(
    (set) => ({
      draft: null, // { clienteId, lineas, observacion, firmaBase64 }

      guardarDraft: (data) => set({ draft: data }),

      // Se llama al registrar la entrega con éxito: no queda nada que restaurar.
      limpiarDraft: () => set({ draft: null }),
    }),
    {
      name: 'entrega-draft-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
