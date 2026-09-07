import React from 'react';
import { X, PackageSearch, PackageX, Plus, Truck } from 'lucide-react';

// Ficha del resultado de una búsqueda por código de barras (Productos.jsx, sólo Herramientas).
// Dos estados posibles: `producto` presente (200 del endpoint) muestra la ficha completa;
// `producto` null (404) muestra el estado "no encontrado" con el código leído y, si corresponde,
// la opción de cargarlo (Decisión 8 de design.md).
const ProductoEncontradoModal = ({ isOpen, onClose, producto, codigoBuscado, isColega, onCargarConEsteCodigo }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const encontrado = Boolean(producto);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-paper rounded-panel border border-line-strong w-full max-w-md flex flex-col max-h-[90vh] scale-100 transition-transform duration-300 animate-scaleIn overflow-hidden">
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            {encontrado ? <PackageSearch className="w-5 h-5 text-accent" /> : <PackageX className="w-5 h-5 text-warn-ink" />}
            {encontrado ? 'Producto encontrado' : 'Código no encontrado'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-canvas transition-colors text-faint hover:text-body cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {encontrado ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-ink">{producto.nombre}</h3>
                {producto.descripcion && (
                  <p className="mt-1 text-sm text-muted">{producto.descripcion}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-canvas border border-line rounded-base p-3">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Precio</p>
                  <p className="text-lg font-bold text-ink font-mono tabular-nums">
                    ${Number(producto.precio ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-canvas border border-line rounded-base p-3">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Stock</p>
                  <p className={`text-lg font-bold font-mono tabular-nums ${
                    (producto.stock ?? 0) === 0 ? 'text-danger-ink' : 'text-ink'
                  }`}>
                    {producto.stock ?? 0} u.
                  </p>
                </div>
              </div>

              {producto.proveedorNombre && (
                <div className="flex items-center gap-2 text-sm text-body">
                  <Truck className="w-4 h-4 text-accent" />
                  <span>Proveedor: <span className="font-semibold">{producto.proveedorNombre}</span></span>
                </div>
              )}

              <p className="text-[11px] text-faint font-mono tabular-nums">Código: {producto.codigoBarra}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 bg-warn-bg text-warn-ink rounded-full flex items-center justify-center border border-warn-line">
                <PackageX className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-ink">No hay ningún producto con este código</h3>
              <p className="text-xs text-faint font-mono tabular-nums">{codigoBuscado}</p>

              {!isColega && (
                <button
                  type="button"
                  onClick={onCargarConEsteCodigo}
                  className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-base bg-accent hover:brightness-95 text-sm font-semibold text-paper transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Cargar producto con este código
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductoEncontradoModal;
