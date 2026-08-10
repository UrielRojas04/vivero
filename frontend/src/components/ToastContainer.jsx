import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    const delay = toast.type === 'error' ? 4000 : 3000;
    const timer = setTimeout(() => onDismiss(toast.id), delay);
    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onDismiss]);

  const isError = toast.type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div className="bg-white rounded-xl border shadow-lg px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-sm animate-scaleIn">
      <Icon className={`w-5 h-5 shrink-0 ${isError ? 'text-red-500' : 'text-emerald-500'}`} />
      <p className="flex-1 text-sm text-gray-700">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const { toasts, dismissToast } = useUIStore();

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};

export default ToastContainer;