import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { variedadesPlantasApi } from '../api/variedades-plantas.api';
import { useUIStore } from '../store/useUIStore';
import FormattedNumberInput from './FormattedNumberInput';

export default function VariedadPlantaForm({ variedad, onClose }) {
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    diasEnero: 30,
    diasFebrero: 30,
    diasMarzo: 30,
    diasAbril: 30,
    diasMayo: 30,
    diasJunio: 30,
    diasJulio: 30,
    diasAgosto: 30,
    diasSeptiembre: 30,
    diasOctubre: 30,
    diasNoviembre: 30,
    diasDiciembre: 30
  });

  const [modoIngreso, setModoIngreso] = useState('estacion');

  useEffect(() => {
    if (variedad) {
      setFormData({
        nombre: variedad.nombre || '',
        descripcion: variedad.descripcion || '',
        diasEnero: variedad.diasEnero || 30,
        diasFebrero: variedad.diasFebrero || 30,
        diasMarzo: variedad.diasMarzo || 30,
        diasAbril: variedad.diasAbril || 30,
        diasMayo: variedad.diasMayo || 30,
        diasJunio: variedad.diasJunio || 30,
        diasJulio: variedad.diasJulio || 30,
        diasAgosto: variedad.diasAgosto || 30,
        diasSeptiembre: variedad.diasSeptiembre || 30,
        diasOctubre: variedad.diasOctubre || 30,
        diasNoviembre: variedad.diasNoviembre || 30,
        diasDiciembre: variedad.diasDiciembre || 30
      });
    }
  }, [variedad]);

  const meses = [
    { key: 'diasEnero', label: 'Ene' },
    { key: 'diasFebrero', label: 'Feb' },
    { key: 'diasMarzo', label: 'Mar' },
    { key: 'diasAbril', label: 'Abr' },
    { key: 'diasMayo', label: 'May' },
    { key: 'diasJunio', label: 'Jun' },
    { key: 'diasJulio', label: 'Jul' },
    { key: 'diasAgosto', label: 'Ago' },
    { key: 'diasSeptiembre', label: 'Sep' },
    { key: 'diasOctubre', label: 'Oct' },
    { key: 'diasNoviembre', label: 'Nov' },
    { key: 'diasDiciembre', label: 'Dic' }
  ];

  const estaciones = [
    { label: 'Verano', key: 'verano', peakKey: 'diasFebrero' },
    { label: 'Otoño', key: 'otono', peakKey: 'diasMayo' },
    { label: 'Invierno', key: 'invierno', peakKey: 'diasAgosto' },
    { label: 'Primavera', key: 'primavera', peakKey: 'diasNoviembre' }
  ];

  const handleEstacionChange = (estacionKey, value) => {
    const val = value === '' ? '' : (parseInt(value) || 0);
    
    setFormData(prev => {
      const peaks = {
        verano: estacionKey === 'verano' ? val : prev.diasFebrero,
        otono: estacionKey === 'otono' ? val : prev.diasMayo,
        invierno: estacionKey === 'invierno' ? val : prev.diasAgosto,
        primavera: estacionKey === 'primavera' ? val : prev.diasNoviembre
      };

      const v = peaks.verano || 0;
      const o = peaks.otono || 0;
      const i = peaks.invierno || 0;
      const p = peaks.primavera || 0;

      const interpolate = (start, end, fraction) => Math.round(start + (end - start) * fraction);

      return {
        ...prev,
        diasFebrero: peaks.verano,
        diasMayo: peaks.otono,
        diasAgosto: peaks.invierno,
        diasNoviembre: peaks.primavera,
        
        diasMarzo: interpolate(v, o, 1/3),
        diasAbril: interpolate(v, o, 2/3),
        
        diasJunio: interpolate(o, i, 1/3),
        diasJulio: interpolate(o, i, 2/3),
        
        diasSeptiembre: interpolate(i, p, 1/3),
        diasOctubre: interpolate(i, p, 2/3),
        
        diasDiciembre: interpolate(p, v, 1/3),
        diasEnero: interpolate(p, v, 2/3)
      };
    });
  };

  const handleApplyToAll = () => {
    const valor = formData.diasEnero;
    setFormData(prev => ({
      ...prev,
      diasFebrero: valor, diasMarzo: valor, diasAbril: valor, diasMayo: valor,
      diasJunio: valor, diasJulio: valor, diasAgosto: valor, diasSeptiembre: valor,
      diasOctubre: valor, diasNoviembre: valor, diasDiciembre: valor
    }));
  };

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
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
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
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Días de Crecimiento (aprox)</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setModoIngreso('estacion')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${modoIngreso === 'estacion' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Por Estación
                </button>
                <button
                  type="button"
                  onClick={() => setModoIngreso('mes')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${modoIngreso === 'mes' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Por Mes
                </button>
              </div>
            </div>
            
            {modoIngreso === 'estacion' ? (
              <div className="grid grid-cols-2 gap-3">
                {estaciones.map(est => (
                  <div key={est.label}>
                    <label className="block text-xs text-gray-500 mb-1">{est.label}</label>
                    <FormattedNumberInput
                      required
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors text-center"
                      value={formData[est.peakKey] === 0 ? '' : formData[est.peakKey]}
                      onChange={(val) => handleEstacionChange(est.key, val)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <button 
                    type="button" 
                    onClick={handleApplyToAll}
                    className="text-xs text-green-600 hover:text-green-700 font-medium cursor-pointer flex items-center gap-1 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md transition-colors"
                    title="Copia el valor de Enero a todos los meses"
                  >
                    Aplicar Enero a Todos
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {meses.map(mes => (
                    <div key={mes.key}>
                      <label className="block text-xs text-gray-500 mb-1">{mes.label}</label>
                      <FormattedNumberInput
                        required
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors text-center"
                        value={formData[mes.key] === 0 ? '' : formData[mes.key]}
                        onChange={(val) => setFormData({...formData, [mes.key]: val === '' ? '' : (parseInt(val) || 0)})}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
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
