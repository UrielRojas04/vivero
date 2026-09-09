import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, Calendar, DollarSign, Wallet } from 'lucide-react';
import { rendicionesApi } from '../api/rendiciones.api';
import { useUIStore } from '../store/useUIStore';
import FormattedNumberInput from './FormattedNumberInput';

const formatMoney = (value) =>
  `$${(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Change retiro-ganancia-abono: subsección aparte dentro de la pantalla de Rendiciones (Decisión
// 8 de design.md) -- el jefe o el colega registran que sacaron plata de SU PROPIA ganancia ya
// generada, para uso personal. Es un concepto distinto de una rendición (esa es plata operativa
// moviéndose entre las dos cuentas) y por eso tiene su propio formulario, historial y saldo.
const RetiroGananciaTab = () => {
  const { pushToast } = useUIStore();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const size = 10;

  const [formData, setFormData] = useState({
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    observacion: '',
    medioPago: 'EFECTIVO',
  });

  const gananciaDisponibleQuery = useQuery({
    queryKey: ['abono', 'ganancia-disponible'],
    queryFn: () => rendicionesApi.getGananciaDisponible().then((res) => res.data),
  });

  const retirosQuery = useQuery({
    queryKey: ['abono', 'retiros-ganancia', { page, size }],
    queryFn: () => rendicionesApi.getRetirosGanancia(page, size).then((res) => res.data),
  });

  const retiroMutation = useMutation({
    mutationFn: (data) => rendicionesApi.registrarRetiroGanancia(data),
    onSuccess: () => {
      pushToast('success', 'Retiro de ganancia registrado con éxito');
      setFormData({ ...formData, monto: '', observacion: '' });
      queryClient.invalidateQueries({ queryKey: ['abono', 'retiros-ganancia'] });
      queryClient.invalidateQueries({ queryKey: ['abono', 'ganancia-disponible'] });
      // Bug real corregido (2026-09-08, reportado por el dueño): un retiro de ganancia también
      // baja el "saldo en caja" de Estado Financiero (LiquidacionAbono.jsx) -- sin esto, esa
      // pantalla quedaba con el número viejo hasta que alguien la recargara a mano.
      queryClient.invalidateQueries({ queryKey: ['abono', 'liquidacion-acumulada'] });
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.response?.data || 'Error al registrar el retiro de ganancia';
      pushToast('error', typeof msg === 'string' ? msg : 'Error al registrar el retiro de ganancia');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.monto || formData.monto <= 0) {
      pushToast('warn', 'Ingrese un monto válido');
      return;
    }

    retiroMutation.mutate({
      monto: parseFloat(formData.monto),
      fecha: formData.fecha,
      observacion: formData.observacion || undefined,
      medioPago: formData.medioPago,
    });
  };

  const isSaving = retiroMutation.isPending;
  const disponible = gananciaDisponibleQuery.data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulario y Tarjetas */}
      <div className="lg:col-span-1 space-y-6">
        {/* Tarjeta de Ganancia Disponible (Sergio) */}
        <div className="bg-paper border border-line rounded-panel p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Ganancia Disponible (Sergio)</h3>
            <Wallet className="w-5 h-5 text-accent" />
          </div>
          {gananciaDisponibleQuery.isLoading ? (
            <p className="text-2xl font-bold text-faint">Cargando...</p>
          ) : (
            <div>
              <p className={`text-3xl font-bold font-mono tabular-nums ${
                (disponible?.gananciaDisponibleJefe ?? 0) < 0 ? 'text-danger' : 'text-ink'
              }`}>
                {formatMoney(disponible?.gananciaDisponibleJefe)}
              </p>
              <p className="text-xs text-muted mt-2">
                Ganancia acumulada de la cuenta Jefe, menos lo que ya retiró.
              </p>
            </div>
          )}
        </div>

        {/* Tarjeta de Ganancia Disponible (Pablo) */}
        <div className="bg-paper border border-line rounded-panel p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Ganancia Disponible (Pablo)</h3>
            <Wallet className="w-5 h-5 text-accent" />
          </div>
          {gananciaDisponibleQuery.isLoading ? (
            <p className="text-2xl font-bold text-faint">Cargando...</p>
          ) : (
            <div>
              <p className={`text-3xl font-bold font-mono tabular-nums ${
                (disponible?.gananciaDisponibleColega ?? 0) < 0 ? 'text-danger' : 'text-ink'
              }`}>
                {formatMoney(disponible?.gananciaDisponibleColega)}
              </p>
              <p className="text-xs text-muted mt-2">
                Ganancia acumulada de la cuenta Colega, menos lo que ya retiró.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-paper border border-line rounded-panel p-6 sticky top-24">
          <h2 className="text-lg font-semibold text-ink mb-6 flex items-center">
            <Banknote className="w-5 h-5 mr-2 text-accent" />
            Nuevo Retiro de Ganancia
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-body mb-1">Monto a retirar</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                <FormattedNumberInput
                  decimales={0}
                  id="monto-retiro-ganancia"
                  value={formData.monto}
                  onChange={(val) => setFormData({ ...formData, monto: val })}
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
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent bg-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-body mb-1">Observación (opcional)</label>
              <input
                type="text"
                value={formData.observacion}
                onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                placeholder="Ej: para gastos familiares"
                className="w-full px-3 py-2 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent bg-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-body mb-1">Medio de Pago</label>
              <select
                value={formData.medioPago}
                onChange={(e) => setFormData({ ...formData, medioPago: e.target.value })}
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
              {isSaving ? 'Registrando...' : 'Registrar Retiro'}
            </button>
          </div>
        </form>
      </div>

      {/* Historial */}
      <div className="lg:col-span-2">
        <div className="bg-paper border border-line rounded-panel overflow-hidden">
          <div className="p-4 border-b border-line bg-thead/50">
            <h2 className="text-lg font-semibold text-ink">Historial de Retiros de Ganancia</h2>
          </div>

          {retirosQuery.isLoading ? (
            <div className="p-8 text-center text-muted">Cargando historial...</div>
          ) : retirosQuery.data?.content?.length === 0 ? (
            <div className="p-12 text-center text-muted">No hay retiros de ganancia registrados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-thead border-b border-line">
                    <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Retiró</th>
                    <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Observación</th>
                    <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Medio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {retirosQuery.data?.content?.map((r) => (
                    <tr key={r.id} className="hover:bg-canvas transition-colors">
                      <td className="px-4 py-3 text-sm text-body">
                        {new Date(r.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-ink">{r.retiradoPor}</td>
                      <td className="px-4 py-3 text-sm font-medium font-mono tabular-nums text-body">
                        {formatMoney(r.monto)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{r.observacion || '-'}</td>
                      <td className="px-4 py-3 text-sm text-body">{r.medioPago || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginador */}
          {retirosQuery.data?.totalPages > 1 && (
            <div className="p-4 border-t border-line flex items-center justify-between bg-thead/30">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas disabled:opacity-50 cursor-pointer"
              >
                Anterior
              </button>
              <span className="text-sm font-medium text-muted">
                Página {page + 1} de {retirosQuery.data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= retirosQuery.data.totalPages - 1}
                className="px-3 py-1.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas disabled:opacity-50 cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RetiroGananciaTab;
