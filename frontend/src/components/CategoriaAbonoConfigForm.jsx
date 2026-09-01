import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

export default function CategoriaAbonoConfigForm({ categoria, onClose, onSubmit }) {
  const { pushToast } = useUIStore();
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });

  useEffect(() => {
    if (categoria) {
      setFormData({
        nombre: categoria.nombre || '',
        descripcion: categoria.descripcion || ''
      });
    }
  }, [categoria]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      pushToast('error', 'El nombre es obligatorio');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-paper rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-slideUpScale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas/30">
          <h2 className="text-xl font-bold text-ink">
            {categoria ? 'Editar Categoría' : 'Nueva Categoría'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-ink hover:bg-canvas rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full bg-paper border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              placeholder="Ej: Compost Fino"
              value={formData.nombre}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Descripción
            </label>
            <textarea
              className="w-full bg-paper border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
              placeholder="Opcional"
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-canvas text-ink font-semibold rounded-xl hover:bg-line transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-accent text-white font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md shadow-accent/20 cursor-pointer"
            >
              {categoria ? 'Guardar Cambios' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
