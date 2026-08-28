import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { negociosApi } from '../api/negocios.api';
import { useUIStore } from '../store/useUIStore';
import FormattedNumberInput from './FormattedNumberInput';

export default function ConfiguracionHerramientas() {
  const { pushToast, askConfirm } = useUIStore();
  const queryClient = useQueryClient();
  const [costoEnvioPorcentaje, setCostoEnvioPorcentaje] = useState('');
  const [ivaPorcentaje, setIvaPorcentaje] = useState('');
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
    if (herramientasConfig && herramientasConfig.ivaPorcentaje !== undefined) {
      setIvaPorcentaje(herramientasConfig.ivaPorcentaje);
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

  const guardar = () => {
    updateMutation.mutate({
      ...herramientasConfig,
      costoEnvioPorcentaje: costoEnvioPorcentaje ? parseFloat(costoEnvioPorcentaje) : 0,
      ivaPorcentaje: ivaPorcentaje ? parseFloat(ivaPorcentaje) : 0
    });
  };

  // Advertencia obligatoria antes de guardar (tarea 10.3, Decisión 5 / riesgo de design.md):
  // este cambio sólo afecta el costo de los ingresos de stock FUTUROS — los precios de venta ya
  // guardados de los productos existentes no se recalculan solos. Vía useUIStore.askConfirm,
  // nunca alert/confirm nativos (regla dura del proyecto).
  const handleSave = () => {
    askConfirm({
      title: 'Confirmar cambio de valores por defecto',
      message: 'Este cambio va a afectar el costo de los próximos ingresos de stock. Los precios de venta ya guardados en los productos existentes NO se recalculan solos: hay que editar cada producto para que tome el nuevo valor. ¿Confirmás guardar?',
      variant: 'warning',
      confirmLabel: 'Guardar de todas formas',
      onConfirm: guardar,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-accent-ink animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-panel border border-line p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent-soft text-accent-ink rounded-base">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-ink">Costos y Recargos Generales</h2>
          <p className="text-sm text-muted">Configuración global para la unidad de negocio Herramientas</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-body mb-2">
            Costo de Envío por defecto (%)
          </label>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <FormattedNumberInput
                value={costoEnvioPorcentaje}
                onChange={setCostoEnvioPorcentaje}
                placeholder="Ej: 5.00"
                className="w-full px-4 py-2 rounded-base border border-line focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
              />
            </div>
            <span className="text-sm text-muted">
              Recargo porcentual aplicado al costo base (luego del descuento) para calcular el costo de inventario.
              Es el valor por defecto de la unidad: un producto puede tener su propio envío y usarlo en su lugar.
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-body mb-2">
            IVA por defecto (%)
          </label>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <FormattedNumberInput
                value={ivaPorcentaje}
                onChange={setIvaPorcentaje}
                placeholder="Ej: 21.00"
                className="w-full px-4 py-2 rounded-base border border-line focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
              />
            </div>
            <span className="text-sm text-muted">
              IVA aplicado sobre el costo neto (con descuentos ya aplicados) para calcular el costo de inventario.
              Es el valor por defecto de la unidad: un producto puede tener su propio IVA y usarlo en su lugar.
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-line flex justify-end">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-base text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ${
              isSaved
                ? 'bg-ok text-paper hover:brightness-95'
                : 'bg-ink text-paper hover:brightness-95'
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
