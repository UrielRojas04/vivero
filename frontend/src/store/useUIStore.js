import { create } from 'zustand';

let toastCounter = 0;

export const useUIStore = create((set) => ({
  toasts: [],
  confirmState: null,
  permissionDenied: null,

  pushToast: (type, message) => {
    const id = ++toastCounter;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }].slice(-4),
    }));
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  askConfirm: ({
    title,
    message,
    variant = 'danger',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
  }) => {
    set({ confirmState: { open: true, title, message, variant, confirmLabel, cancelLabel, onConfirm } });
  },
  closeConfirm: () => {
    set({ confirmState: null });
  },
  denyAccess: (message) => {
    set({ permissionDenied: { open: true, message } });
  },
  closePermissionDenied: () => {
    set({ permissionDenied: null });
  },
}));