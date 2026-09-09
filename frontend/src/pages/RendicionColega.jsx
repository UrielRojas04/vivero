import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HandCoins, Calendar, DollarSign, Wallet } from 'lucide-react';
import { rendicionesApi } from '../api/rendiciones.api';
import { useUIStore } from '../store/useUIStore';
import FormattedNumberInput from '../components/FormattedNumberInput';
import RetiroGananciaTab from '../components/RetiroGananciaTab';

const formatMoney = (value) =>
  `$${(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const RendicionColega = () => {
  const { pushToast } = useUIStore();
  const queryClient = useQueryClient();

  // Change retiro-ganancia-abono, Decisión 8 de design.md: pestaña nueva "Retiro de Ganancia"
  // dentro de esta misma pantalla, junto a "Rendiciones" (que sigue sin cambios de comportamiento).
  const [tab, setTab] = useState('rendiciones');

  const [page, setPage] = useState(0);
  const size = 10;
  
  const [formData, setFormData] = useState({
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    cuentaDestino: 'EFECTIVO'
  });

  // Bug real corregido (2026-09-09, reportado por el dueño): esta pestaña mostraba el "saldo en
  // caja" del mes actual, sin restar los retiros de ganancia (que no tienen fecha de corte) --
  // dos pantallas con la misma etiqueta ("saldo en caja") mostrando números completamente
  // distintos para la misma persona es la fuente exacta de la confusión que reportó. Ahora usa la
  // misma query acumulada que ya usa "Finanzas" (LiquidacionAbono.jsx) -- misma clave de caché
  // (`['abono', 'liquidacion-acumulada']`), así las dos pantallas SIEMPRE muestran el mismo
  // número, sin duplicar el fetch.
  const liquidacionQuery = useQuery({
    queryKey: ['abono', 'liquidacion-acumulada'],
    queryFn: () => rendicionesApi.getLiquidacionAcumulada().then(res => res.data),
  });

  const rendicionesQuery = useQuery({
    queryKey: ['abono', 'rendiciones', { page, size }],
    queryFn: () => rendicionesApi.getRendiciones(page, size).then(res => res.data),
  });

  const rendicionMutation = useMutation({
    mutationFn: (data) => rendicionesApi.registrarRendicion(data),
    onSuccess: () => {
      pushToast('success', 'Rendición registrada con éxito');
      setFormData({ ...formData, monto: '' });
      queryClient.invalidateQueries({ queryKey: ['abono', 'rendiciones'] });
      // Misma clave que usa esta pestaña y "Finanzas" (LiquidacionAbono.jsx) -- una rendición
      // cambia rendicionesEntregadas y saldoCajaColega en las dos pantallas por igual.
      queryClient.invalidateQueries({ queryKey: ['abono', 'liquidacion-acumulada'] });
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.response?.data || 'Error al registrar rendición';
      pushToast('error', typeof msg === 'string' ? msg : 'Error al registrar rendición');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.monto || formData.monto <= 0) {
      pushToast('warn', 'Ingrese un monto válido');
      return;
    }

    // Sin campo de dirección: se deriva sola en el backend según la cuenta (Jefe/Colega) del
    // usuario logueado (pedido del dueño 2026-09-04) -- si estoy logueado como Jefe, la rendición
    // es Jefe->Colega; si estoy logueado como Colega, es Colega->Jefe.
    rendicionMutation.mutate({
      monto: parseFloat(formData.monto),
      fecha: formData.fecha,
      medioPago: formData.cuentaDestino
    });
  };

  const isSaving = rendicionMutation.isPending;

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Rendiciones del Colega</h1>
        <p className="text-muted mt-1">Gestión de rendiciones entre el Colega y el Jefe</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-line">
        <button
          type="button"
          onClick={() => setTab('rendiciones')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            tab === 'rendiciones'
              ? 'border-accent text-accent-ink'
              : 'border-transparent text-muted hover:text-body'
          }`}
        >
          Rendiciones
        </button>
        <button
          type="button"
          onClick={() => setTab('retiro-ganancia')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            tab === 'retiro-ganancia'
              ? 'border-accent text-accent-ink'
              : 'border-transparent text-muted hover:text-body'
          }`}
        >
          Retiro de Ganancia
        </button>
      </div>

      {tab === 'rendiciones' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario y Tarjeta */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Tarjeta de Saldo (Colega) */}
          <div className="bg-paper border border-line rounded-panel p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Saldo en Caja (Pablo)</h3>
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            {liquidacionQuery.isLoading ? (
              <p className="text-2xl font-bold text-faint">Cargando...</p>
            ) : (
              <div>
                <p className="text-3xl font-bold text-ink font-mono tabular-nums">
                  {formatMoney(liquidacionQuery.data?.saldoCajaColega)}
                </p>
                <p className="text-xs text-muted mt-2">
                  Dinero recaudado por ventas del colega, neto de las rendiciones (en cualquier
                  dirección) y de lo que ya retiró como ganancia personal — acumulado histórico.
                </p>
              </div>
            )}
          </div>

          {/* Tarjeta de Saldo (Jefe) -- pedido del dueño 2026-09-04. Mismo cálculo que ya usa
              "En poder del Jefe" en LiquidacionAbono.jsx (ingresosJefe + rendicionesEntregadas,
              donde rendicionesEntregadas ya es el neto firmado por dirección): no hace falta un
              campo nuevo en el backend, el DTO de liquidación ya trae todo lo necesario. */}
          <div className="bg-paper border border-line rounded-panel p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Saldo en Caja (Sergio)</h3>
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            {liquidacionQuery.isLoading ? (
              <p className="text-2xl font-bold text-faint">Cargando...</p>
            ) : (
              <div>
                <p className="text-3xl font-bold text-ink font-mono tabular-nums">
                  {formatMoney(
                    (liquidacionQuery.data?.ingresosJefe ?? 0)
                    + (liquidacionQuery.data?.rendicionesEntregadas ?? 0)
                    - (liquidacionQuery.data?.retirosAcumuladosJefe ?? 0)
                  )}
                </p>
                <p className="text-xs text-muted mt-2">
                  Dinero recaudado por ventas del jefe, más lo que recibió (o menos lo que entregó)
                  por rendiciones, menos lo que ya retiró como ganancia personal — acumulado histórico.
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="bg-paper border border-line rounded-panel p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-ink mb-6 flex items-center">
              <HandCoins className="w-5 h-5 mr-2 text-accent" />
              Nueva Rendición
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-body mb-1">Monto a rendir</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                  <FormattedNumberInput
                    decimales={0}
                    id="monto-rendir"
                    value={formData.monto}
                    onChange={val => setFormData({ ...formData, monto: val })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-body mb-1">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent bg-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-body mb-1">Medio de Pago</label>
                <select
                  value={formData.cuentaDestino}
                  onChange={e => setFormData({ ...formData, cuentaDestino: e.target.value })}
                  className="w-full border border-line rounded-base px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent bg-transparent"
                  required
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSaving || !formData.monto}
                className="w-full py-2.5 mt-2 bg-accent text-paper font-semibold rounded-base hover:bg-accent-hi transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Registrando...' : 'Registrar Rendición'}
              </button>
            </div>
          </form>
        </div>

        {/* Historial */}
        <div className="lg:col-span-2">
          <div className="bg-paper border border-line rounded-panel overflow-hidden">
            <div className="p-4 border-b border-line bg-thead/50">
              <h2 className="text-lg font-semibold text-ink">Historial de Rendiciones</h2>
            </div>
            
            {rendicionesQuery.isLoading ? (
              <div className="p-8 text-center text-muted">Cargando historial...</div>
            ) : rendicionesQuery.data?.content?.length === 0 ? (
              <div className="p-12 text-center text-muted">No hay rendiciones registradas.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-thead border-b border-line">
                      <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Dirección</th>
                      <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Monto</th>
                      <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Medio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rendicionesQuery.data?.content?.map((ren) => {
                      const esJefeAColega = ren.direccion === 'JEFE_A_COLEGA';
                      return (
                        <tr key={ren.id} className="hover:bg-canvas transition-colors">
                          <td className="px-4 py-3 text-sm text-body">
                            {new Date(ren.fecha).toLocaleDateString('es-AR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-body">
                            {esJefeAColega ? 'Sergio → Pablo' : 'Pablo → Sergio'}
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium font-mono tabular-nums ${esJefeAColega ? 'text-warn' : 'text-ok'}`}>
                            {formatMoney(ren.monto)}
                          </td>
                          <td className="px-4 py-3 text-sm text-body">{ren.medioPago}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Paginador */}
            {rendicionesQuery.data?.totalPages > 1 && (
              <div className="p-4 border-t border-line flex items-center justify-between bg-thead/30">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas disabled:opacity-50 cursor-pointer"
                >
                  Anterior
                </button>
                <span className="text-sm font-medium text-muted">
                  Página {page + 1} de {rendicionesQuery.data.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= rendicionesQuery.data.totalPages - 1}
                  className="px-3 py-1.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas disabled:opacity-50 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {tab === 'retiro-ganancia' && <RetiroGananciaTab />}
    </div>
  );
};

export default RendicionColega;
