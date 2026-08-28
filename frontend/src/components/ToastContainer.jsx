import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

// El color codifica el TIPO de mensaje (éxito/advertencia/error/info) — es 100% semántico
// (Decisión 3 de design.md, tarea 12.4): nunca `accent`, ni siquiera para 'info'. 'info' usa
// neutro de token, mismo criterio que el azul informativo colapsado a neutral en
// chequeDisplay.js (Decisión 4).
const TOAST_STYLES = {
  success: { Icon: CheckCircle2, iconClass: 'text-ok' },
  warning: { Icon: AlertTriangle, iconClass: 'text-warn' },
  error: { Icon: AlertCircle, iconClass: 'text-danger' },
  info: { Icon: Info, iconClass: 'text-muted' },
};

const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    const delay = toast.type === 'error' ? 4000 : 3000;
    const timer = setTimeout(() => onDismiss(toast.id), delay);
    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onDismiss]);

  const { Icon, iconClass } = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

  return (
    <div className="bg-paper rounded-panel border border-line-strong px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-sm animate-scaleIn">
      <Icon className={`w-5 h-5 shrink-0 ${iconClass}`} />
      <p className="flex-1 text-sm text-body">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-faint hover:text-body transition-colors shrink-0 cursor-pointer"
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