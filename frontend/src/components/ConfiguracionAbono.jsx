import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { negociosApi } from '../api/negocios.api';
import { useUIStore } from '../store/useUIStore';
import { Percent, CheckCircle2, Info } from 'lucide-react';

const formatMoney = (value) =>
  `$${value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Números redondos sólo para ilustrar la fórmula en el panel de ayuda -- no salen de datos reales.
const EJEMPLO_COBRADO = 100000;
const EJEMPLO_GASTOS = 20000;

const ConfiguracionAbono = ({ unidadId }) => {
  const { pushToast } = useUIStore();
  const queryClient = useQueryClient();
  const [porcentaje, setPorcentaje] = useState('');
  const [repartoSobreVentasColega, setRepartoSobreVentasColega] = useState(false);
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
    if (config) {
      setRepartoSobreVentasColega(!!config.repartoSobreVentasColega);
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
      porcentajeRepartoColega: val,
      repartoSobreVentasColega
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted">Cargando...</div>;

  return (
    <div className="bg-paper border border-line rounded-panel p-6">
      <h2 className="text-lg font-bold text-ink mb-6 flex items-center">
        <Percent className="w-5 h-5 mr-2 text-accent" />
        Reparto de Ingresos (Abono)
      </h2>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <form onSubmit={handleSubmit} className="w-full lg:max-w-md space-y-4 shrink-0">
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

          <div>
            <label className="block text-sm font-semibold text-body mb-1">Base de cálculo del porcentaje</label>
            <div className="flex rounded-base border border-line overflow-hidden">
              <button
                type="button"
                onClick={() => setRepartoSobreVentasColega(false)}
                className={`flex-1 py-2 px-3 text-sm font-semibold transition-colors cursor-pointer ${
                  !repartoSobreVentasColega ? 'bg-accent text-paper' : 'bg-paper text-muted hover:bg-canvas'
                }`}
              >
                Ventas globales
              </button>
              <button
                type="button"
                onClick={() => setRepartoSobreVentasColega(true)}
                className={`flex-1 py-2 px-3 text-sm font-semibold transition-colors cursor-pointer border-l border-line ${
                  repartoSobreVentasColega ? 'bg-accent text-paper' : 'bg-paper text-muted hover:bg-canvas'
                }`}
              >
                Ventas del colega
              </button>
            </div>
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

        <div className="flex-1 bg-canvas border border-line rounded-base p-5 lg:min-w-[280px]">
          <h3 className="text-sm font-bold text-ink mb-2 flex items-center">
            <Info className="w-4 h-4 mr-2 text-accent" />
            Cómo funciona el modo "{repartoSobreVentasColega ? 'Ventas del colega' : 'Ventas globales'}"
          </h3>
          {repartoSobreVentasColega ? (
            <>
              <p className="text-sm text-body">
                El porcentaje se aplica sólo sobre lo que <strong>cobró tu colega</strong> en el período, sin mezclarlo con
                tus propias ventas. Los gastos e insumos del negocio quedan enteramente a tu cargo (Jefe) en este modo.
              </p>
              <div className="mt-3 pt-3 border-t border-line text-xs text-muted space-y-1">
                <p className="font-semibold text-body">Ejemplo con {porcentaje || 0}%:</p>
                <p>Tu colega cobró {formatMoney(EJEMPLO_COBRADO)} y hubo {formatMoney(EJEMPLO_GASTOS)} de gastos/insumos.</p>
                <p>
                  Base = {formatMoney(EJEMPLO_COBRADO)} (los gastos no se restan) → le corresponde{' '}
                  <strong className="text-accent-ink">{formatMoney(EJEMPLO_COBRADO * ((parseInt(porcentaje) || 0) / 100))}</strong>.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-body">
                El porcentaje se aplica sobre el <strong>ingreso neto combinado</strong> del negocio: lo que cobraron entre
                vos y tu colega, menos los gastos e insumos del período. Los gastos se comparten entre ambos a través de esa base.
              </p>
              <div className="mt-3 pt-3 border-t border-line text-xs text-muted space-y-1">
                <p className="font-semibold text-body">Ejemplo con {porcentaje || 0}%:</p>
                <p>Entre los dos cobraron {formatMoney(EJEMPLO_COBRADO)} y hubo {formatMoney(EJEMPLO_GASTOS)} de gastos/insumos.</p>
                <p>
                  Base = {formatMoney(EJEMPLO_COBRADO - EJEMPLO_GASTOS)} (ya restados los gastos) → le corresponde{' '}
                  <strong className="text-accent-ink">{formatMoney((EJEMPLO_COBRADO - EJEMPLO_GASTOS) * ((parseInt(porcentaje) || 0) / 100))}</strong>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionAbono;
