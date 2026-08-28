import { useEffect } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

const ConfirmDialog = () => {
  const { confirmState, closeConfirm } = useUIStore();

  useEffect(() => {
    if (!confirmState?.open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeConfirm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState?.open, closeConfirm]);

  if (!confirmState?.open) return null;

  const {
    title,
    message,
    variant = 'danger',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
  } = confirmState;

  const isDanger = variant !== 'warning';
  const ConfirmIcon = isDanger ? Trash2 : AlertTriangle;

  const handleConfirm = () => {
    onConfirm?.();
    closeConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn"
      onClick={closeConfirm}
    >
      <div
        className="bg-paper rounded-t-panel sm:rounded-panel border border-line w-full sm:max-w-md shadow-md p-6 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDanger ? 'bg-danger-bg text-danger-ink' : 'bg-warn-bg text-warn-ink'
            }`}
          >
            <ConfirmIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-ink">{title}</h3>
            <p className="mt-2 text-sm text-muted">{message}</p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
          <button
            onClick={closeConfirm}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-line rounded-base text-sm font-medium text-body hover:bg-canvas transition-colors cursor-pointer text-center"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`w-full sm:w-auto px-4 py-3 sm:py-2 text-paper rounded-base text-sm font-semibold transition-all cursor-pointer text-center ${
              isDanger
                ? 'bg-danger hover:brightness-95'
                : 'bg-warn hover:brightness-95'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;