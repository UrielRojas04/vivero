import React, { useState, useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Wallet,
  Coins,
  HandCoins,
  Percent,
  PieChart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ReceiptText,
} from 'lucide-react';
import { finanzasApi } from '../api/finanzas.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

const formatMoney = (value) =>
  `$${(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Finanzas = () => {
  const { pushToast, denyAccess } = useUIStore();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [page, setPage] = useState(0);
  const [size] = useState(10);

  const desde = `${selectedYear}-01-01`;
  const hasta = `${selectedYear}-12-31`;

  // Al cambiar de año, volvemos a la primera página
  useEffect(() => {
    setPage(0);
  }, [selectedYear]);

  const resumenQuery = useQuery({
    queryKey: ['finanzas', 'resumen', { desde, hasta }],
    queryFn: () => finanzasApi.fetchResumenFinanzas(desde, hasta),
  });

  const ventasQuery = useQuery({
    queryKey: ['finanzas', 'ventas', { desde, hasta, page, size }],
    queryFn: () => finanzasApi.fetchVentasFinanzas(desde, hasta, page, size),
    placeholderData: keepPreviousData,
  });

  // Feedback de errores exclusivamente vía useUIStore (nunca alert/confirm)
  useEffect(() => {
    if (!resumenQuery.isError) return;
    if (resumenQuery.error?.response?.status === 403) {
      denyAccess('No tienes permisos de finanzas (requiere ADMIN_DB).');
    } else {
      pushToast('error', getErrorMessage(resumenQuery.error, 'Ocurrió un error al cargar el resumen de finanzas. Intente nuevamente.'));
    }
  }, [resumenQuery.isError, resumenQuery.error, pushToast, denyAccess]);

  useEffect(() => {
    if (!ventasQuery.isError) return;
    if (ventasQuery.error?.response?.status === 403) {
      denyAccess('No tienes permisos de finanzas (requiere ADMIN_DB).');
    } else {
      pushToast('error', getErrorMessage(ventasQuery.error, 'Ocurrió un error al cargar el listado de ventas.'));
    }
  }, [ventasQuery.isError, ventasQuery.error, pushToast, denyAccess]);

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };

  const resumen = resumenQuery.data;
  const ventas = ventasQuery.data?.content || [];
  const totalPages = ventasQuery.data?.totalPages || 0;
  const totalElements = ventasQuery.data?.totalElements || 0;
  const loadingResumen = resumenQuery.isPending;
  const loadingVentas = ventasQuery.isPending;
  const fetchingVentas = ventasQuery.isFetching;

  const totalVentas = resumen?.totalVentas ?? 0;
  const totalCostos = resumen?.totalCostos ?? 0;
  const gananciaNeta = resumen?.gananciaNeta ?? 0;
  const margen = resumen?.margen ?? 0;
  const barMax = Math.max(totalVentas, totalCostos, 1);

  const kpis = [
    { label: 'Total Ventas', value: formatMoney(totalVentas), icon: Wallet, iconClass: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Costos', value: formatMoney(totalCostos), icon: Coins, iconClass: 'bg-red-50 text-red-500' },
    { label: 'Ganancia Neta', value: formatMoney(gananciaNeta), icon: HandCoins, iconClass: 'bg-blue-50 text-blue-600' },
    { label: 'Margen de Ganancia', value: `${margen.toLocaleString('es-AR')} %`, icon: Percent, iconClass: 'bg-violet-50 text-violet-600' },
  ];

  const estadoBadgeClass = (estado) => {
    if (estado === 'PAGADO') return 'bg-emerald-50 text-emerald-700';
    if (estado === 'PARCIAL') return 'bg-yellow-50 text-yellow-700';
    return 'bg-red-50 text-red-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
          <PieChart className="w-5 h-5 text-emerald-500" />
        </div>

        {/* Selector de Año */}
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Año Fiscal</label>
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer bg-white"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Nota informativa de cálculo */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-800">
        Los costos de productos se calculan al precio de costo registrado al momento de cada venta (costo histórico).
        Los gastos en insumos corresponden a las compras del período seleccionado.
      </div>

      {loadingResumen ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center gap-3 shadow-sm">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Cargando resumen de finanzas...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-500">{kpi.label}</p>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconClass}`}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-900">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Cruce Ventas vs Costos */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4">Ventas vs Costos del período</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-emerald-700">Ventas</span>
                  <span className="text-sm font-bold text-emerald-700">{formatMoney(totalVentas)}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(totalVentas / barMax) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-red-600">Costos</span>
                  <span className="text-sm font-bold text-red-600">{formatMoney(totalCostos)}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${(totalCostos / barMax) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Ganancia neta del período: <span className="font-semibold text-gray-600">{formatMoney(gananciaNeta)}</span>
            </p>
          </div>
        </>
      )}

      {/* Listado de ventas paginado */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Ventas del período</h2>
          <span className="text-sm text-gray-500 font-medium">{totalElements} ventas</span>
        </div>

        {loadingVentas ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <p className="text-sm font-medium text-gray-500">Cargando ventas...</p>
          </div>
        ) : ventas.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <ReceiptText className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No hay ventas en el rango seleccionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">N° Venta</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Estado de Pago</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Método de Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ventas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 font-medium">#{venta.nroVenta ?? venta.id}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(venta.fecha).toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{venta.clienteNombre}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-700">
                      {formatMoney(venta.totalFinal)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${estadoBadgeClass(venta.estadoDePago)}`}>
                        {venta.estadoDePago}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {venta.metodoPago || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              {fetchingVentas && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
              Página <span className="font-semibold text-gray-900">{page + 1}</span> de{' '}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Finanzas;