import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { variedadesBandejasApi } from '../api/variedades-bandejas.api';
import { useUIStore } from '../store/useUIStore';
import FormattedNumberInput from './FormattedNumberInput';

export default function VariedadBandejaForm({ bandeja, onClose }) {
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();
  
  const [formData, setFormData] = useState({
    nombre: '',
    cantidadCeldas: 288
  });

  useEffect(() => {
    if (bandeja) {
      setFormData({
        nombre: bandeja.nombre || '',
        cantidadCeldas: bandeja.cantidadCeldas || 288
      });
    }
  }, [bandeja]);

  const mutation = useMutation({
    mutationFn: (data) => 
      bandeja 
        ? variedadesBandejasApi.update(bandeja.id, data)
        : variedadesBandejasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variedades-bandejas'] });
      pushToast('success', bandeja ? 'Bandeja actualizada' : 'Bandeja creada');
      onClose();
    },
    onError: () => {
      pushToast('error', 'Error al guardar bandeja');
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
            {bandeja ? 'Editar Tipo de Bandeja' : 'Nuevo Tipo de Bandeja'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (Modelo/Tipo)</label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="Ej: Speedling 288"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Celdas</label>
            <FormattedNumberInput
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
              value={formData.cantidadCeldas}
              onChange={(val) => setFormData({...formData, cantidadCeldas: val === '' ? '' : (parseInt(val) || 0)})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
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
