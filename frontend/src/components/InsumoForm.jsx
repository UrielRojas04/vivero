import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import FormattedNumberInput from './FormattedNumberInput';

const InsumoForm = ({ insumo, onSave, onCancel, isOpen }) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [fechaCompra, setFechaCompra] = useState('');
  const [stock, setStock] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (insumo) {
      setNombre(insumo.nombre || '');
      setDescripcion(insumo.descripcion || '');
      setPrecio(insumo.precio || '');
      setFechaCompra(insumo.fechaCompra ? String(insumo.fechaCompra).slice(0, 10) : '');
      setStock(insumo.stock || '');
    } else {
      setNombre('');
      setDescripcion('');
      setPrecio('');
      setFechaCompra('');
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
        fechaCompra: fechaCompra ? `${fechaCompra}T00:00:00` : null,
        stock: parseInt(stock, 10)
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
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-paper rounded-none sm:rounded-panel border border-line-strong w-full h-full sm:h-auto max-w-lg flex flex-col max-h-screen sm:max-h-[90vh] scale-100 transition-transform duration-300 animate-scaleIn overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 border-b border-line shrink-0">
          <h2 className="text-lg font-semibold text-ink">
            {insumo ? 'Editar Insumo' : 'Nuevo Insumo'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-canvas transition-colors text-faint hover:text-body cursor-pointer"
          >
            <X className="w-6 h-6 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Form (scrollable for mobile) */}
        <div className="overflow-y-auto overflow-x-hidden">
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            <div>
              <label htmlFor="nombre" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Nombre del Insumo
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={`w-full px-4 py-3 sm:py-2.5 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all text-base ${
                  errors.nombre ? 'border-danger-line focus:ring-danger' : 'border-line focus:border-accent'
                }`}
                placeholder="Ej: Sustrato universal 50L, Maceta N12"
              />
              {errors.nombre && (
                <p className="mt-1 text-xs text-danger font-medium">{errors.nombre}</p>
              )}
            </div>

            <div>
              <label htmlFor="descripcion" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Descripción
              </label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows="3"
                className="w-full px-4 py-3 sm:py-2.5 rounded-base border border-line bg-paper focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-none text-base"
                placeholder="Detalles sobre marca, tipo, composición..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
              <div>
                <label htmlFor="precio" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Precio (ARS)
                </label>
                <FormattedNumberInput
                  id="precio"
                  value={precio}
                  onChange={(val) => setPrecio(val)}
                  className={`w-full px-4 py-3 sm:py-2.5 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all text-base ${
                    errors.precio ? 'border-danger-line focus:ring-danger' : 'border-line focus:border-accent'
                  }`}
                  placeholder="0.00"
                />
                {errors.precio && (
                  <p className="mt-1 text-xs text-danger font-medium">{errors.precio}</p>
                )}
              </div>

              <div>
                <label htmlFor="stock" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Stock (Unidades)
                </label>
                <FormattedNumberInput
                  id="stock"
                  value={stock}
                  onChange={(val) => setStock(val)}
                  className={`w-full px-4 py-3 sm:py-2.5 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all text-base ${
                    errors.stock ? 'border-danger-line focus:ring-danger' : 'border-line focus:border-accent'
                  }`}
                  placeholder="0"
                />
                {errors.stock && (
                  <p className="mt-1 text-xs text-danger font-medium">{errors.stock}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="fechaCompra" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Fecha de Compra
              </label>
              <input
                id="fechaCompra"
                type="date"
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 rounded-base border border-line bg-paper focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all text-base sm:text-sm"
              />
              <p className="mt-1 text-xs text-faint">Opcional: se usa para calcular los gastos del período en Finanzas.</p>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:space-x-3 pt-5 border-t border-line mt-2">
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-base border border-line text-sm font-medium text-body hover:bg-canvas transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-base bg-accent hover:brightness-95 text-sm font-semibold text-paper transition-all cursor-pointer text-center"
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
