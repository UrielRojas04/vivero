import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { variedadesPlantasApi } from '../api/variedades-plantas.api';
import { useUIStore } from '../store/useUIStore';

export default function VariedadPlantaForm({ variedad, onClose }) {
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    diasCrecimiento: 30
  });

  useEffect(() => {
    if (variedad) {
      setFormData({
        nombre: variedad.nombre || '',
        descripcion: variedad.descripcion || '',
        diasCrecimiento: variedad.diasCrecimiento || 30
      });
    }
  }, [variedad]);

  const mutation = useMutation({
    mutationFn: (data) => 
      variedad 
        ? variedadesPlantasApi.update(variedad.id, data)
        : variedadesPlantasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variedades-plantas'] });
      pushToast('success', variedad ? 'Variedad actualizada' : 'Variedad creada');
      onClose();
    },
    onError: () => {
      pushToast('error', 'Error al guardar variedad');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {variedad ? 'Editar Variedad' : 'Nueva Variedad de Planta'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="Ej: Tomate Platense"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Días de Crecimiento (aprox)</label>
            <input
              type="number"
              required
              min="1"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
              value={formData.diasCrecimiento}
              onChange={(e) => setFormData({...formData, diasCrecimiento: parseInt(e.target.value) || 0})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <textarea
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
            >
              <Save size={18} />
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
