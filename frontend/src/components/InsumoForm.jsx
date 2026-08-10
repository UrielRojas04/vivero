import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const InsumoForm = ({ insumo, onSave, onCancel, isOpen }) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (insumo) {
      setNombre(insumo.nombre || '');
      setDescripcion(insumo.descripcion || '');
      setPrecio(insumo.precio || '');
      setStock(insumo.stock || '');
    } else {
      setNombre('');
      setDescripcion('');
      setPrecio('');
      setStock('');
    }
    setErrors({});
  }, [insumo, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!precio) {
      newErrors.precio = 'El precio es requerido';
    } else if (parseFloat(precio) <= 0) {
      newErrors.precio = 'El precio debe ser mayor a 0';
    }
    if (stock === '' || stock === null) {
      newErrors.stock = 'El stock es requerido';
    } else if (parseInt(stock, 10) < 0) {
      newErrors.stock = 'El stock no puede ser negativo';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: parseInt(stock, 10),
        unidadNegocioId: insumo?.unidadNegocioId || 1 // Por defecto vivero=1
      });
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-white/95 backdrop-blur-md rounded-t-2xl sm:rounded-2xl border border-white/20 w-full max-w-lg shadow-2xl overflow-hidden scale-100 transition-transform duration-300 animate-scaleIn max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 border-b border-gray-100 bg-sky-600 text-white shrink-0">
          <h2 className="text-lg font-semibold">
            {insumo ? 'Editar Insumo' : 'Nuevo Insumo'}
          </h2>
          <button 
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-sky-700 transition-colors text-white/90 hover:text-white cursor-pointer"
          >
            <X className="w-6 h-6 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Form (scrollable for mobile) */}
        <div className="overflow-y-auto overflow-x-hidden">
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            <div>
              <label htmlFor="nombre" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Nombre del Insumo
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={`w-full px-4 py-3 sm:py-2.5 rounded-xl border bg-white/70 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-base ${
                  errors.nombre ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:border-sky-500'
                }`}
                placeholder="Ej: Sustrato universal 50L, Maceta N12"
              />
              {errors.nombre && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.nombre}</p>
              )}
            </div>

            <div>
              <label htmlFor="descripcion" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Descripción
              </label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows="3"
                className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all resize-none text-base"
                placeholder="Detalles sobre marca, tipo, composición..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
              <div>
                <label htmlFor="precio" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Precio (ARS)
                </label>
                <input
                  id="precio"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className={`w-full px-4 py-3 sm:py-2.5 rounded-xl border bg-white/70 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-base ${
                    errors.precio ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:border-sky-500'
                  }`}
                  placeholder="0.00"
                />
                {errors.precio && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.precio}</p>
                )}
              </div>

              <div>
                <label htmlFor="stock" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Stock (Unidades)
                </label>
                <input
                  id="stock"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={`w-full px-4 py-3 sm:py-2.5 rounded-xl border bg-white/70 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-base ${
                    errors.stock ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:border-sky-500'
                  }`}
                  placeholder="0"
                />
                {errors.stock && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.stock}</p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:space-x-3 pt-5 border-t border-gray-100 mt-2">
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 hover:shadow-sky-600/30 transition-all cursor-pointer text-center"
              >
                {insumo ? 'Guardar Cambios' : 'Crear Insumo'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default InsumoForm;
