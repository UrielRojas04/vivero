import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import FormattedNumberInput from './FormattedNumberInput';
import { useAuthStore } from '../store/useAuthStore';

const ProductoForm = ({ producto, onSave, onCancel, isOpen }) => {
  const { unidadNegocioActiva } = useAuthStore();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [costoProducto, setCostoProducto] = useState('');
  const [descuentoProveedor, setDescuentoProveedor] = useState('');
  const [stock, setStock] = useState('');
  const [lote, setLote] = useState('');
  const [dueno, setDueno] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (producto) {
      setNombre(producto.nombre || '');
      setDescripcion(producto.descripcion || '');
      setPrecio(producto.precio || '');
      setCostoProducto(producto.costoProducto || '');
      setDescuentoProveedor(producto.descuentoProveedor || '');
      setStock(producto.stock || '');
      setLote(producto.lote || '');
      setDueno(producto.dueno || '');
    } else {
      setNombre('');
      setDescripcion('');
      setPrecio('');
      setCostoProducto('');
      setDescuentoProveedor('');
      setStock('');
      setLote('');
      setDueno('');
    }
    setErrors({});
  }, [producto, isOpen]);

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
        costoProducto: costoProducto ? parseFloat(costoProducto) : null,
        descuentoProveedor: descuentoProveedor ? parseFloat(descuentoProveedor) : null,
        stock: parseInt(stock, 10),
        lote: lote.trim() || null,
        dueno: dueno.trim() || null
      });
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Listen for Escape key
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/20 w-full max-w-lg shadow-2xl overflow-hidden scale-100 transition-transform duration-300 animate-scaleIn">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600 text-white">
          <h2 className="text-lg font-semibold">
            {producto ? 'Editar Producto (Planta)' : 'Nuevo Producto (Planta)'}
          </h2>
          <button 
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-emerald-700 transition-colors text-white/90 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Nombre de la Planta
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                errors.nombre ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:border-emerald-500'
              }`}
              placeholder="Ej: Lechuga morada, Repollo, Acelga"
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
              placeholder="Detalles sobre cuidados, tamaño, riego..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="precio" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Precio (ARS)
              </label>
              <FormattedNumberInput
                id="precio"
                value={precio}
                onChange={(val) => setPrecio(val)}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.precio ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:border-emerald-500'
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
              <FormattedNumberInput
                id="stock"
                value={stock}
                onChange={(val) => setStock(val)}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.stock ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:border-emerald-500'
                }`}
                placeholder="0"
              />
              {errors.stock && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.stock}</p>
              )}
            </div>
            
            {unidadNegocioActiva === '2' && (
              <>
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="costoProducto" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Costo Producto (ARS)
                  </label>
                  <FormattedNumberInput
                    id="costoProducto"
                    value={costoProducto}
                    onChange={(val) => setCostoProducto(val)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all border-gray-200 focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="descuentoProveedor" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Descuento Prov. (%)
                  </label>
                  <FormattedNumberInput
                    id="descuentoProveedor"
                    value={descuentoProveedor}
                    onChange={(val) => setDescuentoProveedor(val)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all border-gray-200 focus:border-emerald-500"
                    placeholder="Ej: 10"
                  />
                </div>
              </>
            )}
          </div>

          {unidadNegocioActiva !== '2' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="lote" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Lote (Opcional)
                </label>
                <input
                  type="text"
                  id="lote"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Ej. L-2026-A"
                />
              </div>
              <div>
                <label htmlFor="dueno" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Dueño (Opcional)
                </label>
                <input
                  type="text"
                  id="dueno"
                  value={dueno}
                  onChange={(e) => setDueno(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Dueño del lote"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer"
            >
              {producto ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ProductoForm;
