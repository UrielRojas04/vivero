import { create } from 'zustand';

export const useStockStore = create((set) => ({
  liveStocks: {}, // { [productoId]: nuevoStock }
  updateStock: (productoId, nuevoStock) => 
    set((state) => ({
      liveStocks: {
        ...state.liveStocks,
        [productoId]: nuevoStock
      }
    })),
}));
