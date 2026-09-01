import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { negociosApi } from '../api/negocios.api';
import { useUIStore } from '../store/useUIStore';
import { Percent, CheckCircle2 } from 'lucide-react';

const ConfiguracionAbono = ({ unidadId }) => {
  const { pushToast } = useUIStore();
  const queryClient = useQueryClient();
  const [porcentaje, setPorcentaje] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['configuracion', 'repartoAbono', unidadId],
    queryFn: () => negociosApi.getAll().then(data => data.find(n => n.id === unidadId)),
    enabled: !!unidadId
  });

  useEffect(() => {
    if (config && config.porcentajeRepartoColega !== undefined && config.porcentajeRepartoColega !== null) {
      setPorcentaje(config.porcentajeRepartoColega);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data) => negociosApi.update(unidadId, data),
    onSuccess: () => {
      pushToast('success', 'Configuración guardada correctamente');
      queryClient.invalidateQueries({ queryKey: ['configuracion', 'repartoAbono'] });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    },
    onError: () => {
      pushToast('error', 'Error al actualizar configuración');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(porcentaje);
    if (isNaN(val) || val < 0 || val > 100) {
      pushToast('warn', 'El porcentaje debe estar entre 0 y 100');
      return;
    }

    updateMutation.mutate({
      ...config,
      porcentajeRepartoColega: val
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted">Cargando...</div>;

  return (
    <div className="bg-paper border border-line rounded-panel p-6">
      <h2 className="text-lg font-bold text-ink mb-6 flex items-center">
        <Percent className="w-5 h-5 mr-2 text-accent" />
        Reparto de Ingresos (Abono)
      </h2>
      
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-semibold text-body mb-1">Porcentaje para mi colega (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            className="w-full border border-line rounded-base px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent font-mono"
            required
          />
          <p className="text-xs text-muted mt-2">
            El porcentaje restante ({(100 - (parseInt(porcentaje) || 0))}%) será retenido automáticamente por vos (Jefe).
          </p>
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending || isSaved}
          className={`w-full py-2 font-semibold rounded-base transition-colors flex items-center justify-center disabled:opacity-50 ${
            isSaved ? 'bg-ok text-paper' : 'bg-accent text-paper hover:bg-accent-hi'
          }`}
        >
          {updateMutation.isPending ? 'Guardando...' : isSaved ? (
            <><CheckCircle2 className="w-5 h-5 mr-2 animate-scaleIn" /> ¡Guardado!</>
          ) : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
};

export default ConfiguracionAbono;
