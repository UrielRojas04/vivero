import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const initialState = {
  clienteSeleccionado: '',
  detalles: [],
  descuento: '',
  metodoPago: 'EFECTIVO',
  fechaVenta: '',
  nota: '',
  bandejasEntregadas: '',
};

export const useCartStore = create(
  persist(
    (set) => ({
      ...initialState,

      setCliente: (clienteId) => set({ clienteSeleccionado: clienteId }),
      setDetalles: (updaterOrValue) => set((state) => ({
        detalles: typeof updaterOrValue === 'function'
          ? updaterOrValue(state.detalles)
          : updaterOrValue,
      })),
      addDetalle: (detalle) => set((state) => ({ detalles: [...state.detalles, detalle] })),
      removeDetalle: (productoId) => set((state) => ({
        detalles: state.detalles.filter((d) => d.productoId !== productoId),
      })),
      updateDetalleCantidad: (productoId, cantidad) => set((state) => ({
        detalles: state.detalles.map((d) =>
          d.productoId === productoId ? { ...d, cantidad } : d
        ),
      })),
      setDescuento: (descuento) => set({ descuento }),
      setBandejasEntregadas: (bandejasEntregadas) => set({ bandejasEntregadas }),
      setMetodoPago: (metodoPago) => set({ metodoPago }),
      setFechaVenta: (fechaVenta) => set({ fechaVenta }),
      setNota: (nota) => set({ nota }),

      clearCart: () => {
        set(initialState);
        useCartStore.persist.clearStorage();
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);