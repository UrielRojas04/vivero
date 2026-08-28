import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const ClienteForm = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    nombreRazonSocial: '',
    telefono: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombreRazonSocial: initialData.nombreRazonSocial || '',
        telefono: initialData.telefono || '',
      });
    } else {
      setFormData({
        nombreRazonSocial: '',
        telefono: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
      <div className="bg-paper rounded-panel border border-line-strong w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-line">
          <h2 className="text-xl font-bold text-ink">
            {initialData ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-faint hover:text-body hover:bg-canvas rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="nombreRazonSocial" className="block text-sm font-medium text-body mb-1">
              Nombre o Razón Social
            </label>
            <input
              type="text"
              id="nombreRazonSocial"
              name="nombreRazonSocial"
              value={formData.nombreRazonSocial}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all bg-canvas focus:bg-paper"
              placeholder="Ej: Juan Pérez o Vivero Sur SRL"
            />
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-body mb-1">
              Teléfono (opcional)
            </label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all bg-canvas focus:bg-paper"
              placeholder="Ej: 341 1234567"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-body bg-canvas hover:bg-thead rounded-base font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-paper bg-accent hover:brightness-95 rounded-base font-medium transition-colors cursor-pointer"
            >
              {initialData ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClienteForm;
