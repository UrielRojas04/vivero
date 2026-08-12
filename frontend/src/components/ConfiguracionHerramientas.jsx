import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { negociosApi } from '../api/negocios.api';
import { useUIStore } from '../store/useUIStore';
import FormattedNumberInput from './FormattedNumberInput';

export default function ConfiguracionHerramientas() {
  const { pushToast } = useUIStore();
  const queryClient = useQueryClient();
  const [costoEnvioPorcentaje, setCostoEnvioPorcentaje] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const { data: negocios, isLoading } = useQuery({
    queryKey: ['negocios'],
    queryFn: () => negociosApi.getAll(),
  });

  const herramientasConfig = negocios?.find(n => n.id === 2);

  useEffect(() => {
    if (herramientasConfig && herramientasConfig.costoEnvioPorcentaje !== undefined) {
      setCostoEnvioPorcentaje(herramientasConfig.costoEnvioPorcentaje);
    }
  }, [herramientasConfig]);

  const updateMutation = useMutation({
    mutationFn: (data) => negociosApi.update(2, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['negocios']);
      pushToast('success', 'Configuración guardada correctamente');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    },
    onError: () => {
      pushToast('error', 'Error al guardar configuración');
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      ...herramientasConfig,
      costoEnvioPorcentaje: costoEnvioPorcentaje ? parseFloat(costoEnvioPorcentaje) : 0
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Costos y Recargos Generales</h2>
          <p className="text-sm text-gray-500">Configuración global para la unidad de negocio Herramientas</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Costo de Envío (%)
          </label>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <FormattedNumberInput
                value={costoEnvioPorcentaje}
                onChange={setCostoEnvioPorcentaje}
                placeholder="Ej: 5.00"
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
              />
            </div>
            <span className="text-sm text-gray-500">
              Recargo porcentual aplicado al costo base (luego del descuento) para calcular el costo de inventario.
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ${
              isSaved 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSaved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaved ? 'Guardada' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
