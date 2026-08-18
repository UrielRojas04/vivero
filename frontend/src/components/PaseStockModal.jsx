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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] max-w-md overflow-hidden shadow-2xl scale-100 animate-scaleIn flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-emerald-600 text-white shrink-0 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Pasar a Stock</h3>
              <p className="text-sm text-emerald-100">Convierte la siembra en producto</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <h4 className="text-sm font-semibold text-emerald-800 mb-1">
              Planta: {siembra.variedadPlanta?.nombre}
            </h4>
            <p className="text-xs text-emerald-600">
              Siembra: {siembra.numeroSiembra || '-'}{siembra.codigoLote ? ` • Lote: ${siembra.codigoLote}` : ''} • Dueño: {siembra.dueno}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock (Unidades logradas)
              </label>
              <FormattedNumberInput
                value={stock}
                onChange={setStock}
                className={`w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                  errors.stock ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
                }`}
              />
              {errors.stock && <p className="mt-1 text-sm text-red-500">{errors.stock}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de Venta ($)
              </label>
              <FormattedNumberInput
                value={precio}
                onChange={setPrecio}
                placeholder="Ej. 1500"
                className={`w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                  errors.precio ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
                }`}
              />
              {errors.precio && <p className="mt-1 text-sm text-red-500">{errors.precio}</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-white font-medium bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2"
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
