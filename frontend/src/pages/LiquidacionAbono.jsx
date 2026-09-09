import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, FileText, ArrowRightLeft } from 'lucide-react';
import { rendicionesApi } from '../api/rendiciones.api';
import { negociosApi } from '../api/negocios.api';
import { useAuthStore } from '../store/useAuthStore';
import GastosDrillDown from '../components/GastosDrillDown';

const formatMoney = (value) =>
  `$${(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const LiquidacionAbono = () => {
  const { hasPermission } = useAuthStore();
  const [showGastos, setShowGastos] = useState(false);

  // Pedido del dueño (sin doc previo, decidido en chat): esta pantalla dejó de depender de un
  // mes/año seleccionado -- Sergio y Pablo no cobran su ganancia mes a mes (a veces pasan 2-3
  // meses), así que "Finanzas" de Abono muestra el estado financiero acumulado de siempre, no un
  // recorte mensual. Backend: RendicionColegaServiceImpl.obtenerLiquidacionAcumulada() (mismo DTO
  // y misma fórmula que obtenerLiquidacion, sin acotar por fecha).
  const liquidacionQuery = useQuery({
    queryKey: ['abono', 'liquidacion-acumulada'],
    queryFn: () => rendicionesApi.getLiquidacionAcumulada().then(res => res.data),
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
  // Bug real corregido (2026-09-08, reportado por el dueño): antes salía de `config`, que sólo se
  // pide con permiso ADMIN_DB -- sin ese permiso, Pablo (o cualquiera sin ADMIN_DB) veía "50%"
  // aunque el reparto real configurado fuera otro. Ahora sale de la propia liquidación (`liq`),
  // que ya trae el % real sin depender de un permiso aparte.
  const porcentaje = liq?.porcentajeRepartoColega ?? config?.porcentajeRepartoColega ?? 50;
  const repartoSobreVentasColega = !!config?.repartoSobreVentasColega;

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Estado Financiero</h1>
          <p className="text-muted mt-1">Resumen acumulado de ventas y compensaciones del negocio Abono</p>
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
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Ventas de Sergio</h3>
              </div>
              <p className="text-3xl font-bold text-ink font-mono tabular-nums">{formatMoney(liq.ventasJefe)}</p>
              <div className="mt-4 pt-3 border-t border-line">
                <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Pagos cobrados</p>
                <p className="text-lg font-bold text-ok-ink font-mono tabular-nums">{formatMoney(liq.ingresosJefe)}</p>
              </div>
            </div>
            
            <div className="bg-paper border border-line rounded-panel p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Ventas de Pablo</h3>
              </div>
              <p className="text-3xl font-bold text-ink font-mono tabular-nums">{formatMoney(liq.ventasColega)}</p>
              <div className="mt-4 pt-3 border-t border-line">
                <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Pagos cobrados</p>
                <p className="text-lg font-bold text-ok-ink font-mono tabular-nums">{formatMoney(liq.ingresosColega)}</p>
              </div>
            </div>
            
            <div
              onClick={() => setShowGastos(!showGastos)}
              className={`bg-paper rounded-panel border p-6 flex flex-col justify-between transition-all cursor-pointer hover:border-line-strong ${showGastos ? 'border-ink ring-1 ring-ink' : 'border-line'}`}
            >
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Gastos (Insumos)</h3>
              <p className="text-3xl font-bold text-warn font-mono tabular-nums">{formatMoney(liq.gastosInsumos)}</p>
            </div>

            <div className="bg-paper border border-line rounded-panel p-6 flex flex-col justify-between">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Rendiciones (Pablo a Sergio)</h3>
              <p className="text-3xl font-bold text-ok font-mono tabular-nums">{formatMoney(liq.rendicionesEntregadas)}</p>
            </div>
          </div>

          {showGastos && (
            <GastosDrillDown onClose={() => setShowGastos(false)} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-paper border border-line rounded-panel p-6">
              <h2 className="text-lg font-semibold text-ink mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-accent" />
                Dinero en poder de cada parte
              </h2>
              <div className="space-y-4">
                <div className="py-3 border-b border-line">
                  <div className="flex justify-between items-center">
                    <span className="text-body font-medium">En poder de Sergio (Caja Vivero)</span>
                    <span className="font-mono tabular-nums font-bold text-ink text-lg">
                      {formatMoney((liq.ingresosJefe + liq.rendicionesEntregadas) - (liq.retirosAcumuladosJefe ?? 0))}
                    </span>
                  </div>
                  {liq.retirosAcumuladosJefe > 0 && (
                    <p className="text-xs text-muted mt-1">Ya descontado: {formatMoney(liq.retirosAcumuladosJefe)} que Sergio retiró como ganancia personal.</p>
                  )}
                </div>
                <div className="py-3">
                  <div className="flex justify-between items-center">
                    <span className="text-body font-medium">En poder de Pablo (Caja Pablo)</span>
                    <span className="font-mono tabular-nums font-bold text-ink text-lg">{formatMoney(liq.saldoCajaColega)}</span>
                  </div>
                  {liq.retirosAcumuladosColega > 0 && (
                    <p className="text-xs text-muted mt-1">Ya descontado: {formatMoney(liq.retirosAcumuladosColega)} que Pablo retiró como ganancia personal.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-paper border border-line rounded-panel p-6 border-l-4 border-l-accent">
              <h2 className="text-lg font-semibold text-ink mb-6 flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2 text-accent" />
                Ajuste de Cuentas
              </h2>
              {(() => {
                // Pedido del dueño 2026-09-08: el card mostraba sólo el resultado final ("Pablo
                // debe entregar $X") sin explicar de dónde salía -- confuso cuando el resultado da
                // negativo (pérdida) pero igual le "toca poner" al colega. Se agrega el paso a paso
                // completo: resultado del período (con etiqueta Ganancia/Pérdida) -> parte
                // proporcional de Pablo sobre ESE resultado (positiva o negativa) -> lo que Pablo
                // ya tiene en caja de sus propias ventas -> el ajuste final, con una frase en
                // lenguaje llano que conecta los tres números. La fórmula no cambia -- es
                // exactamente la misma que ya calculaba `ajusteFinal` antes, sólo que ahora se ve
                // el camino completo en vez de sólo el resultado.
                const resultado = repartoSobreVentasColega
                  ? liq.ingresosColega
                  : (liq.ingresosJefe + liq.ingresosColega) - liq.gastosInsumos;
                const esPerdida = !repartoSobreVentasColega && resultado < 0;
                const compensacion = liq.compensacionTeorica;
                // Bug real corregido (2026-09-09, reportado por el dueño): el ajuste comparaba la
                // caja de Pablo (que YA sale neta de sus retiros, ver `saldoCajaColega` en
                // RendicionColegaServiceImpl) contra su parte TOTAL sin descontar esos mismos
                // retiros -- eso restaba el retiro dos veces y hacía que Sergio pareciera deberle
                // a Pablo plata que Pablo ya se había llevado. Lo que le queda pendiente a Pablo es
                // su parte total MENOS lo que ya retiró; recién esa diferencia se compara contra lo
                // que tiene en caja.
                const retirosColega = liq.retirosAcumuladosColega ?? 0;
                const compensacionPendiente = compensacion - retirosColega;
                const saldoCaja = liq.saldoCajaColega;
                const ajusteFinal = saldoCaja - compensacionPendiente;

                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-canvas rounded-base border border-line space-y-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-body font-medium flex items-center gap-2">
                            {repartoSobreVentasColega ? 'Cobros de Pablo (sin restar gastos)' : 'Resultado del período (Cobros - Insumos)'}
                            {esPerdida && (
                              <span className="text-[11px] font-bold uppercase tracking-wider text-danger-ink bg-danger-bg px-2 py-0.5 rounded-full">Pérdida</span>
                            )}
                            {!repartoSobreVentasColega && !esPerdida && (
                              <span className="text-[11px] font-bold uppercase tracking-wider text-ok-ink bg-ok-bg px-2 py-0.5 rounded-full">Ganancia</span>
                            )}
                          </span>
                          <span className={`font-mono tabular-nums ${esPerdida ? 'text-danger-ink' : 'text-ink'}`}>
                            {formatMoney(resultado)}
                          </span>
                        </div>
                        {repartoSobreVentasColega && (
                          <p className="text-xs text-muted mt-1">
                            Modo "ventas del colega" activo: los gastos e insumos quedan a cargo de Sergio.
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-line">
                        <div className="flex justify-between items-center">
                          <span className="text-body font-bold text-accent-ink">Parte de Pablo ({porcentaje}%)</span>
                          <span className={`font-mono tabular-nums font-bold ${compensacion < 0 ? 'text-danger-ink' : 'text-accent-ink'}`}>
                            {formatMoney(compensacion)}
                          </span>
                        </div>
                        {esPerdida && (
                          <p className="text-xs text-muted mt-1">
                            Como el período dio pérdida, Pablo también cubre su {porcentaje}% de esa pérdida — no sólo deja de ganar, además aporta.
                          </p>
                        )}
                      </div>

                      {retirosColega > 0 && (
                        <div className="pt-3 border-t border-line">
                          <div className="flex justify-between items-center">
                            <span className="text-body font-medium">Ya retirado por Pablo como ganancia personal</span>
                            <span className="font-mono tabular-nums text-ink">−{formatMoney(retirosColega)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-body font-bold text-accent-ink">Parte pendiente de Pablo</span>
                            <span className={`font-mono tabular-nums font-bold ${compensacionPendiente < 0 ? 'text-danger-ink' : 'text-accent-ink'}`}>
                              {formatMoney(compensacionPendiente)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-line">
                        <div className="flex justify-between items-center">
                          <span className="text-body font-medium">Plata que Pablo ya tiene en su caja</span>
                          <span className="font-mono tabular-nums text-ink">{formatMoney(saldoCaja)}</span>
                        </div>
                        <p className="text-xs text-muted mt-1">
                          Lo que cobró de sus propias ventas, menos lo que ya le rindió a Sergio
                          {liq.retirosAcumuladosColega > 0 ? <> y los <strong className="font-mono tabular-nums">{formatMoney(liq.retirosAcumuladosColega)}</strong> que ya retiró como ganancia personal.</> : '.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-canvas rounded-base border border-line">
                      <p className="text-sm text-body leading-relaxed">
                        {ajusteFinal > 0 ? (
                          <>Pablo tiene <strong className="font-mono tabular-nums">{formatMoney(saldoCaja)}</strong> en caja, pero sólo le queda pendiente <strong className="font-mono tabular-nums">{formatMoney(compensacionPendiente)}</strong>{compensacionPendiente < 0 ? ' (negativo, porque comparte la pérdida)' : retirosColega > 0 ? ` (ya retiró ${formatMoney(retirosColega)} de su parte)` : ''}. La diferencia — <strong className="font-mono tabular-nums">{formatMoney(ajusteFinal)}</strong> — es lo que tiene que entregarle a Sergio.</>
                        ) : ajusteFinal < 0 ? (
                          <>Pablo tiene <strong className="font-mono tabular-nums">{formatMoney(saldoCaja)}</strong> en caja, y le queda pendiente <strong className="font-mono tabular-nums">{formatMoney(compensacionPendiente)}</strong>{retirosColega > 0 ? ` (ya retiró ${formatMoney(retirosColega)} de su parte)` : ''}, más de lo que tiene en la mano. La diferencia — <strong className="font-mono tabular-nums">{formatMoney(Math.abs(ajusteFinal))}</strong> — es lo que Sergio tiene que compensarle.</>
                        ) : (
                          <>Pablo tiene en caja exactamente lo que le corresponde. Las cuentas están saldadas.</>
                        )}
                      </p>
                    </div>

                    <div className="mt-2 flex flex-col items-center justify-center py-6">
                      {ajusteFinal > 0 ? (
                        <>
                          <p className="text-sm font-medium text-body mb-2 uppercase tracking-wider">Pablo debe entregar a Sergio</p>
                          <p className="text-4xl font-bold text-ink font-mono tabular-nums text-center">{formatMoney(ajusteFinal)}</p>
                        </>
                      ) : ajusteFinal < 0 ? (
                        <>
                          <p className="text-sm font-medium text-body mb-2 uppercase tracking-wider">Sergio debe compensar a Pablo</p>
                          <p className="text-4xl font-bold text-ink font-mono tabular-nums text-center">{formatMoney(Math.abs(ajusteFinal))}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-body mb-2 uppercase tracking-wider">Cuentas saldadas</p>
                          <p className="text-4xl font-bold text-ok font-mono tabular-nums text-center">$0,00</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
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
