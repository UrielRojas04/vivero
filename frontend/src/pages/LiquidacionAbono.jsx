import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Calendar, AlertTriangle, FileText, ArrowRightLeft } from 'lucide-react';
import { rendicionesApi } from '../api/rendiciones.api';
import { negociosApi } from '../api/negocios.api';
import { useAuthStore } from '../store/useAuthStore';

const formatMoney = (value) =>
  `$${(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

const LiquidacionAbono = () => {
  const { hasPermission } = useAuthStore();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const liquidacionQuery = useQuery({
    queryKey: ['abono', 'liquidacion', selectedMonth, selectedYear],
    queryFn: () => rendicionesApi.getLiquidacion(selectedMonth, selectedYear).then(res => res.data),
  });

  // Consultar configuración para ver el % de reparto si es admin
  const configQuery = useQuery({
    queryKey: ['configuracion', 'repartoAbono'],
    queryFn: () => negociosApi.getAll().then(data => data.find(n => n.id === 3)),
    enabled: hasPermission('ADMIN_DB')
  });

  const liq = liquidacionQuery.data;
  const config = configQuery.data;
  const hasConfig = config && config.porcentajeRepartoColega !== undefined && config.porcentajeRepartoColega !== null;
  const porcentaje = config?.porcentajeRepartoColega ?? 50;

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Liquidación Mensual</h1>
          <p className="text-muted mt-1">Resumen de ventas y compensaciones del negocio Abono</p>
        </div>
        
        <div className="flex items-center gap-2 bg-paper p-1 rounded-base border border-line">
          <Calendar className="w-5 h-5 text-muted ml-2" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-transparent border-none py-2 pl-2 pr-6 text-sm font-semibold text-ink focus:ring-0 cursor-pointer"
          >
            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-transparent border-none py-2 pl-2 pr-8 text-sm font-semibold text-ink focus:ring-0 cursor-pointer border-l border-line"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {!hasConfig && hasPermission('ADMIN_DB') && (
        <div className="mb-6 p-4 bg-warn-bg border border-warn-line rounded-panel flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-warn-ink">Porcentaje de reparto sin configurar</h3>
            <p className="text-sm text-warn-ink mt-1">
              Actualmente se está asumiendo un reparto del 50/50. Configura el porcentaje real desde la pantalla de Configuración.
            </p>
          </div>
        </div>
      )}

      {liquidacionQuery.isLoading ? (
        <div className="p-12 text-center text-muted">Calculando liquidación...</div>
      ) : liq ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-paper border border-line rounded-panel p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Ventas Jefe</h3>
              </div>
              <p className="text-3xl font-bold text-ink font-mono tabular-nums">{formatMoney(liq.ventasJefe)}</p>
              <div className="mt-4 pt-3 border-t border-line">
                <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Pagos cobrados</p>
                <p className="text-lg font-bold text-ok-ink font-mono tabular-nums">{formatMoney(liq.ingresosJefe)}</p>
              </div>
            </div>
            
            <div className="bg-paper border border-line rounded-panel p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Ventas Colega</h3>
              </div>
              <p className="text-3xl font-bold text-ink font-mono tabular-nums">{formatMoney(liq.ventasColega)}</p>
              <div className="mt-4 pt-3 border-t border-line">
                <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Pagos cobrados</p>
                <p className="text-lg font-bold text-ok-ink font-mono tabular-nums">{formatMoney(liq.ingresosColega)}</p>
              </div>
            </div>
            
            <div className="bg-paper border border-line rounded-panel p-6 flex flex-col justify-between">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Gastos (Insumos)</h3>
              <p className="text-3xl font-bold text-warn font-mono tabular-nums">{formatMoney(liq.gastosInsumos)}</p>
            </div>
            
            <div className="bg-paper border border-line rounded-panel p-6 flex flex-col justify-between">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Rendiciones (Colega a Jefe)</h3>
              <p className="text-3xl font-bold text-ok font-mono tabular-nums">{formatMoney(liq.rendicionesEntregadas)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-paper border border-line rounded-panel p-6">
              <h2 className="text-lg font-semibold text-ink mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-accent" />
                Dinero en poder de cada parte
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-line">
                  <span className="text-body font-medium">En poder del Jefe (Caja Vivero)</span>
                  <span className="font-mono tabular-nums font-bold text-ink text-lg">{formatMoney(liq.ingresosJefe + liq.rendicionesEntregadas)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-body font-medium">En poder del Colega (Caja Colega)</span>
                  <span className="font-mono tabular-nums font-bold text-ink text-lg">{formatMoney(liq.saldoCajaColega)}</span>
                </div>
              </div>
            </div>

            <div className="bg-paper border border-line rounded-panel p-6 border-l-4 border-l-accent">
              <h2 className="text-lg font-semibold text-ink mb-6 flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2 text-accent" />
                Ajuste de Cuentas
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-canvas rounded-base border border-line">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-body font-medium">Ingresos netos a repartir (Cobros - Insumos)</span>
                    <span className="font-mono tabular-nums text-ink">{formatMoney((liq.ingresosJefe + liq.ingresosColega) - liq.gastosInsumos)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-line mt-2">
                    <span className="text-body font-bold text-accent-ink">Parte correspondiente al Colega</span>
                    <span className="font-mono tabular-nums font-bold text-accent-ink">{formatMoney(liq.compensacionTeorica)}</span>
                  </div>
                </div>

                {(() => {
                  const ajusteFinal = liq.saldoCajaColega - liq.compensacionTeorica;
                  return (
                    <div className="mt-4 flex flex-col items-center justify-center py-6">
                      {ajusteFinal > 0 ? (
                        <>
                          <p className="text-sm font-medium text-body mb-2 uppercase tracking-wider">El Colega debe entregar al Jefe</p>
                          <p className="text-4xl font-bold text-ink font-mono tabular-nums text-center">{formatMoney(ajusteFinal)}</p>
                        </>
                      ) : ajusteFinal < 0 ? (
                        <>
                          <p className="text-sm font-medium text-body mb-2 uppercase tracking-wider">El Jefe debe compensar al Colega</p>
                          <p className="text-4xl font-bold text-ink font-mono tabular-nums text-center">{formatMoney(Math.abs(ajusteFinal))}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-body mb-2 uppercase tracking-wider">Cuentas saldadas</p>
                          <p className="text-4xl font-bold text-ok font-mono tabular-nums text-center">$0,00</p>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-muted">Error al cargar la liquidación.</div>
      )}
    </div>
  );
};

export default LiquidacionAbono;
