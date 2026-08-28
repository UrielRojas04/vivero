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
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-paper rounded-panel border border-line-strong max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-line">
          <h2 className="text-xl font-bold text-ink">
            {variedad ? 'Editar Variedad' : 'Nueva Variedad de Planta'}
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
            <label className="block text-sm font-medium text-body mb-1">Nombre</label>
            <input
              type="text"
              required
              className="w-full rounded-base border border-line px-4 py-2.5 text-ink focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="Ej: Tomate Platense"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-body">Días de Crecimiento (aprox)</label>
              <div className="flex bg-canvas p-1 rounded-base">
                <button
                  type="button"
                  onClick={() => setModoIngreso('estacion')}
                  className={`px-3 py-1 text-xs font-medium rounded-base transition-colors cursor-pointer ${modoIngreso === 'estacion' ? 'bg-paper text-ink' : 'text-muted hover:text-body'}`}
                >
                  Por Estación
                </button>
                <button
                  type="button"
                  onClick={() => setModoIngreso('mes')}
                  className={`px-3 py-1 text-xs font-medium rounded-base transition-colors cursor-pointer ${modoIngreso === 'mes' ? 'bg-paper text-ink' : 'text-muted hover:text-body'}`}
                >
                  Por Mes
                </button>
              </div>
            </div>

            {modoIngreso === 'estacion' ? (
              <div className="grid grid-cols-2 gap-3">
                {estaciones.map(est => (
                  <div key={est.label}>
                    <label className="block text-xs text-muted mb-1">{est.label}</label>
                    <FormattedNumberInput
                      required
                      className="w-full rounded-base border border-line px-2 py-1.5 text-sm text-ink focus:ring-2 focus:ring-accent focus:border-accent transition-colors text-center font-mono tabular-nums"
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
                    className="text-xs text-accent-ink hover:brightness-90 font-medium cursor-pointer flex items-center gap-1 bg-accent-soft hover:brightness-95 px-2.5 py-1 rounded-base transition-colors"
                    title="Copia el valor de Enero a todos los meses"
                  >
                    Aplicar Enero a Todos
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {meses.map(mes => (
                    <div key={mes.key}>
                      <label className="block text-xs text-muted mb-1">{mes.label}</label>
                      <FormattedNumberInput
                        required
                        className="w-full rounded-base border border-line px-2 py-1.5 text-sm text-ink focus:ring-2 focus:ring-accent focus:border-accent transition-colors text-center font-mono tabular-nums"
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
            <label className="block text-sm font-medium text-body mb-1">Descripción (opcional)</label>
            <textarea
              className="w-full rounded-base border border-line px-4 py-2.5 text-ink focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent cursor-pointer transition-colors"
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
