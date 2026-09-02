import React from 'react';
import { X, ScanBarcode, AlertTriangle } from 'lucide-react';

// Grupo 13 de tasks.md de codigo-barras-herramientas (extensión post-cierre): aviso de código
// duplicado apenas se ESCANEA, no recién al guardar. Simple y sin lógica de red propia — sólo
// muestra el código escaneado y el producto que ya lo tiene, y dispara los callbacks que le pase
// el componente padre (ProductoForm.jsx / RecepcionPedidoModal.jsx). La llamada real a
// DELETE /api/productos/codigo-barra/{codigo} vive en el padre, no acá.
const CodigoBarraDuplicadoModal = ({ isOpen, onClose, codigo, productoEnConflicto, onDescartar, onQuedarme }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-paper rounded-panel border border-line-strong w-full max-w-md flex flex-col max-h-[90vh] scale-100 transition-transform duration-300 animate-scaleIn overflow-hidden">
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warn-ink" />
            Código ya asignado
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-canvas transition-colors text-faint hover:text-body cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-warn-bg border border-warn-line rounded-base text-sm text-warn-ink">
            <ScanBarcode className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              El código <span className="font-mono font-semibold">{codigo}</span> ya está asignado a otro producto.
            </p>
          </div>

          <div className="bg-canvas border border-line rounded-base p-3">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Producto en conflicto</p>
            <p className="text-base font-bold text-ink">{productoEnConflicto?.nombre}</p>
          </div>

          <p className="text-xs text-faint">
            Podés descartar este código nuevo (no cambia nada) o quedarte con él — se lo saca al producto de arriba
            y queda libre para asignarlo acá cuando guardes.
          </p>
        </div>

        <div className="flex-none flex items-center justify-end gap-3 p-4 px-6 border-t border-line bg-canvas rounded-b-panel">
          <button
            type="button"
            onClick={onDescartar}
            className="px-5 py-2.5 rounded-panel border border-line text-sm font-medium text-body hover:bg-paper transition-colors cursor-pointer"
          >
            Descartar código nuevo
          </button>
          <button
            type="button"
            onClick={onQuedarme}
            className="px-5 py-2.5 rounded-panel bg-accent hover:brightness-95 text-sm font-semibold text-paper transition-all cursor-pointer"
          >
            Quedarme con este código
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodigoBarraDuplicadoModal;
