import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// Modal con el shell fullscreen-mobile de ProductoForm.jsx (Decisión 12 de design.md):
// overlay p-0 sm:p-4, panel w-full h-full sm:h-auto rounded-none sm:rounded-2xl,
// header/body/footer flex-none / flex-1 overflow-y-auto / flex-none.
const ProveedorForm = ({ proveedor, isOpen, onSave, onCancel }) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contacto, setContacto] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (proveedor) {
      setNombre(proveedor.nombre || '');
      setTelefono(proveedor.telefono || '');
      setContacto(proveedor.contacto || '');
    } else {
      setNombre('');
      setTelefono('');
      setContacto('');
    }
    setErrors({});
  }, [proveedor, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      contacto: contacto.trim() || null,
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm transition-all duration-300"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto max-w-lg shadow-2xl flex flex-col max-h-screen sm:max-h-[95vh]">
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600 text-white sm:rounded-t-2xl">
          <h2 className="text-lg font-semibold">
            {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-emerald-700 transition-colors text-white/90 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.nombre ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:border-emerald-500'
                }`}
                placeholder="Ej: Distribuidora Ferretera SA"
              />
              {errors.nombre && <p className="mt-1 text-xs text-red-500 font-medium">{errors.nombre}</p>}
            </div>

            <div>
              <label htmlFor="contacto" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Persona de contacto (opcional)
              </label>
              <input
                id="contacto"
                type="text"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="Ej: Marcelo"
              />
            </div>

            <div>
              <label htmlFor="telefono" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Teléfono (opcional)
              </label>
              <input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="Ej: 341 1234567"
              />
            </div>
          </div>

          <div className="flex-none flex items-center justify-end gap-3 p-4 px-6 border-t border-gray-100 bg-gray-50/50 sm:rounded-b-2xl">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {proveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProveedorForm;
