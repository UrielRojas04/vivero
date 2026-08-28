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
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-paper border border-line-strong rounded-panel max-w-md w-full overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-line">
          <h2 className="text-xl font-bold text-ink">
            {bandeja ? 'Editar Tipo de Bandeja' : 'Nuevo Tipo de Bandeja'}
          </h2>
          <button
            onClick={onClose}
            className="text-faint hover:text-body hover:bg-canvas p-2 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-body mb-1">Nombre (Modelo/Tipo)</label>
            <input
              type="text"
              required
              className="w-full rounded-base border border-line-strong px-4 py-2.5 text-ink focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="Ej: Speedling 288"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-body mb-1">Cantidad de Celdas</label>
            <FormattedNumberInput
              required
              className="w-full rounded-base border border-line-strong px-4 py-2.5 text-ink focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              value={formData.cantidadCeldas}
              onChange={(val) => setFormData({...formData, cantidadCeldas: val === '' ? '' : (parseInt(val) || 0)})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-body bg-paper border border-line-strong rounded-base hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-paper bg-accent rounded-base hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 cursor-pointer transition-colors"
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
