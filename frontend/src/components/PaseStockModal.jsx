import React, { useState, useEffect } from 'react';
import { X, PackagePlus } from 'lucide-react';
import FormattedNumberInput from './FormattedNumberInput';

const PaseStockModal = ({ isOpen, siembra, onClose, onConfirm }) => {
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && siembra) {
      setPrecio('');
      setStock(siembra.cantidad || '');
      setErrors({});
    }
  }, [isOpen, siembra]);

  if (!isOpen || !siembra) return null;

  const validate = () => {
    const newErrors = {};
    if (!precio) {
      newErrors.precio = 'El precio de venta es requerido';
    } else if (parseFloat(precio) <= 0) {
      newErrors.precio = 'El precio debe ser mayor a 0';
    }

    if (stock === '' || stock === null) {
      newErrors.stock = 'El stock es requerido';
    } else if (parseInt(stock, 10) <= 0) {
      newErrors.stock = 'El stock debe ser mayor a 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validate()) {
      onConfirm({
        precioVenta: parseFloat(precio),
        stock: parseInt(stock, 10)
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-paper rounded-none sm:rounded-panel border border-line-strong w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] max-w-md overflow-hidden scale-100 animate-scaleIn flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-soft rounded-base">
              <PackagePlus className="w-5 h-5 text-accent-ink" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-ink">Pasar a Stock</h3>
              <p className="text-sm text-muted">Convierte la siembra en producto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-faint hover:text-body hover:bg-canvas rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          <div className="bg-canvas rounded-base p-4 border border-line">
            <h4 className="text-sm font-semibold text-ink mb-1">
              Planta: {siembra.variedadPlanta?.nombre}
            </h4>
            <p className="text-xs text-muted">
              Siembra: {siembra.numeroSiembra || '-'}{siembra.codigoLote ? ` • Lote: ${siembra.codigoLote}` : ''} • Dueño: {siembra.dueno}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-body mb-1">
                Stock (Unidades logradas)
              </label>
              <FormattedNumberInput
                value={stock}
                onChange={setStock}
                className={`w-full px-4 py-2 border rounded-base outline-none focus:ring-2 focus:ring-accent/20 transition-all font-mono tabular-nums ${
                  errors.stock ? 'border-danger-line focus:border-danger' : 'border-line focus:border-accent'
                }`}
              />
              {errors.stock && <p className="mt-1 text-sm text-danger">{errors.stock}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">
                Precio de Venta ($)
              </label>
              <FormattedNumberInput
                value={precio}
                onChange={setPrecio}
                decimales={0}
                placeholder="Ej. 1500"
                className={`w-full px-4 py-2 border rounded-base outline-none focus:ring-2 focus:ring-accent/20 transition-all font-mono tabular-nums ${
                  errors.precio ? 'border-danger-line focus:border-danger' : 'border-line focus:border-accent'
                }`}
              />
              {errors.precio && <p className="mt-1 text-sm text-danger">{errors.precio}</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-line flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-body font-medium border border-line hover:bg-canvas rounded-base transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-paper font-medium bg-accent hover:brightness-95 rounded-base transition-colors flex items-center gap-2 cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            Ingresar a Stock
          </button>
        </div>

      </div>
    </div>
  );
};

export default PaseStockModal;
