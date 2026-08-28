import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

const PermissionDeniedModal = () => {
  const { permissionDenied, closePermissionDenied } = useUIStore();

  useEffect(() => {
    if (!permissionDenied?.open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closePermissionDenied();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [permissionDenied?.open, closePermissionDenied]);

  if (!permissionDenied?.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn"
      onClick={closePermissionDenied}
    >
      <div
        className="bg-paper rounded-t-panel sm:rounded-panel border border-line w-full sm:max-w-md shadow-md p-6 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-danger-bg text-danger-ink flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-ink">Acceso Denegado</h3>
            <p className="mt-2 text-sm text-muted">{permissionDenied.message}</p>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={closePermissionDenied}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-accent hover:brightness-95 text-paper rounded-base text-sm font-semibold transition-colors cursor-pointer text-center"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionDeniedModal;