import React, { useState, useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Wallet,
  Coins,
  HandCoins,
  Percent,
  PieChart as PieChartIcon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ReceiptText,
  Search,
  ArrowLeft,
  CreditCard,
  X,
  Edit3
} from 'lucide-react';
import { finanzasApi } from '../api/finanzas.api';
import { chequesApi } from '../api/cheques.api';
import { productosApi } from '../api/productos.api';
import { negociosApi } from '../api/negocios.api';
import { usuariosApi } from '../api/usuarios.api';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { useStockStore } from '../store/useStockStore';
import { getErrorMessage } from '../utils/errorMessage';
import { describirEstadoCheque, describirVencimientoCheque, describirOrigenCheque } from '../utils/chequeDisplay';
import ChequeEstadoModal from '../components/ChequeEstadoModal';
import GastosDrillDown from '../components/GastosDrillDown';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const currentYear = new Date().getFullYear();
// El sistema arrancó en 2026 -- no hay datos de años anteriores, así que el selector no debe
// deslizar hacia atrás con el tiempo (pedido del dueño 2026-09-04: antes era "año actual - 3",
// así que en 2029 iba a ofrecer 2026, pero también 2025/2024/2023 con la app inexistente ese
// año). El piso queda fijo en 2026 y el techo sigue siendo currentYear + 1 (para poder planificar
// el año que viene), así que la lista crece un año por vez en vez de deslizar.
const PRIMER_ANIO_CON_DATOS = 2026;
const availableYears = Array.from(
  { length: currentYear + 1 - PRIMER_ANIO_CON_DATOS + 1 },
  (_, i) => PRIMER_ANIO_CON_DATOS + i
);

const formatMoney = (value) =>
  `$${(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const Finanzas = () => {
  const { pushToast, denyAccess } = useUIStore();
  const { unidadNegocioActiva, negociosDisponibles } = useAuthStore();
  
  const unidadActivaData = negociosDisponibles?.find(n => n.id.toString() === unidadNegocioActiva?.toString());
  const isModeloInsumos = unidadActivaData?.modeloCosto === 'INSUMOS';
  const liveStocks = useStockStore(state => state.liveStocks);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedVendedorId, setSelectedVendedorId] = useState(null);

  // Drill-down states
  const [showVentas, setShowVentas] = useState(false);
  const [showGastos, setShowGastos] = useState(false);
  const [showCheques, setShowCheques] = useState(false);
  const [showCogsDetalle, setShowCogsDetalle] = useState(false);

  // Search and Pagination
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [searchVentas, setSearchVentas] = useState('');
  const [debouncedSearchVentas, setDebouncedSearchVentas] = useState('');

  const [selectedCheque, setSelectedCheque] = useState(null);
  const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);

  const desde = `${selectedYear}-01-01`;
  const hasta = `${selectedYear}-12-31`;

  // Al cambiar de año o búsqueda, volvemos a la primera página
  useEffect(() => {
    setPage(0);
  }, [selectedYear, debouncedSearchVentas]);

  // Debounce para búsquedas
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchVentas(searchVentas), 500);
    return () => clearTimeout(handler);
  }, [searchVentas]);

  const resumenQuery = useQuery({
    queryKey: ['finanzas', 'resumen', { desde, hasta, selectedVendedorId }],
    queryFn: () => finanzasApi.fetchResumenFinanzas(desde, hasta, selectedVendedorId),
  });

  const ventasQuery = useQuery({
    queryKey: ['finanzas', 'ventas', { desde, hasta, q: debouncedSearchVentas, selectedVendedorId, page, size }],
    queryFn: () => finanzasApi.fetchVentasFinanzas(desde, hasta, debouncedSearchVentas, selectedVendedorId, page, size),
    placeholderData: keepPreviousData,
    enabled: showVentas,
  });

  const productosQuery = useQuery({
    queryKey: ['productos', 'all'],
    queryFn: () => productosApi.getAll(),
  });

  const negociosQuery = useQuery({
    queryKey: ['negocios'],
    queryFn: () => negociosApi.getAll(),
  });

  const usuariosQuery = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => usuariosApi.getAll(),
  });

  const chequesCarteraQuery = useQuery({
    queryKey: ['cheques', 'cartera'],
    queryFn: () => chequesApi.getAll(0, 1000),
    enabled: showCheques,
  });

  useEffect(() => {
    if (!resumenQuery.isError) return;
    if (resumenQuery.error?.response?.status === 403) {
      denyAccess('No tienes permisos de finanzas (requiere ADMIN_DB).');
    } else {
      pushToast('error', getErrorMessage(resumenQuery.error, 'Ocurrió un error al cargar el resumen de finanzas.'));
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
  const chequesEnCarteraList = chequesCarteraQuery.data?.content?.filter(c => c.estado === 'EN_CARTERA') || [];

  const loadingResumen = resumenQuery.isPending;
  const loadingVentas = ventasQuery.isFetching;
  const fetchingVentas = ventasQuery.isFetching;

  const totalVentas = resumen?.totalVentas ?? 0;
  const totalCostos = resumen?.totalCostos ?? 0;
  const gananciaNeta = resumen?.gananciaNeta ?? 0;
  const margen = resumen?.margen ?? 0;
  const chequesEnCartera = resumen?.chequesEnCartera ?? 0;

  // Ganancia Neta y Margen son semánticos (Decisión 3, P1): dependen de si el resultado del
  // período es positivo o negativo, no son una medición fija como Total Ventas/Total Costos.
  const gananciaEsNegativa = gananciaNeta < 0;

  const kpis = [
    {
      label: 'Total Ventas',
      value: formatMoney(totalVentas),
      icon: Wallet,
      iconClass: 'bg-accent-soft text-accent-ink',
      active: showVentas,
      onClick: () => { setShowVentas(!showVentas); setShowGastos(false); setShowCheques(false); }
    },
    {
      label: 'Total Costos',
      value: formatMoney(totalCostos),
      icon: Coins,
      iconClass: 'bg-thead text-muted',
      active: showGastos,
      onClick: () => { setShowGastos(!showGastos); setShowVentas(false); setShowCheques(false); }
    },
    {
      label: 'Ganancia Neta',
      value: formatMoney(gananciaNeta),
      icon: HandCoins,
      iconClass: gananciaEsNegativa ? 'bg-danger-bg text-danger-ink' : 'bg-ok-bg text-ok-ink',
    },
    {
      label: 'Margen de Ganancia',
      value: `${margen.toLocaleString('es-AR')} %`,
      icon: Percent,
      iconClass: gananciaEsNegativa ? 'bg-danger-bg text-danger-ink' : 'bg-ok-bg text-ok-ink',
    },
    {
      label: 'Valores a Depositar (Cheques)',
      value: formatMoney(chequesEnCartera),
      icon: CreditCard,
      iconClass: 'bg-warn-bg text-warn-ink',
      active: showCheques,
      onClick: () => { setShowCheques(!showCheques); setShowVentas(false); setShowGastos(false); }
    },
  ];

  const estadoBadgeClass = (estado) => {
    if (estado === 'PAGADO') return 'bg-ok-bg text-ok-ink';
    if (estado === 'PARCIAL') return 'bg-warn-bg text-warn-ink';
    return 'bg-danger-bg text-danger-ink';
  };

  // Hex directos (no className) para el gráfico de torta: recharts pinta con el atributo SVG
  // `fill`, que no resuelve var() de forma confiable entre navegadores, así que se usan los
  // valores concretos de --color-ok / --color-danger en vez de la paleta vieja (emerald/red).
  const chartData = [
    { name: 'Ventas', value: totalVentas, color: '#1F7A4C' },
    { name: 'Costos/Gastos', value: totalCostos, color: '#B3261E' }
  ].filter(d => d.value > 0);

  const productos = (productosQuery.data || []).map(p => ({
    ...p,
    stock: liveStocks[p.id] !== undefined ? liveStocks[p.id] : p.stock
  }));
  // Paleta categórica (no semántica): distingue 5 productos entre sí en el gráfico de barras,
  // no representa un estado de negocio — queda fuera de la distinción marca/semántica de
  // design.md (Decisión 3 no cubre paletas cualitativas de gráficos). Sin cambios.
  const topStockData = [...productos]
    .sort((a, b) => (b.stock || 0) - (a.stock || 0))
    .slice(0, 5)
    .map((p, index) => {
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
      return {
        name: p.nombre.length > 15 ? p.nombre.substring(0, 15) + '...' : p.nombre,
        stock: p.stock,
        color: colors[index % colors.length]
      };
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-ink">Finanzas</h1>
          <PieChartIcon className="w-5 h-5 text-accent" />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Selector de Año */}
          <div className="flex flex-wrap items-center gap-3 bg-paper rounded-panel border border-line px-4 py-2.5">
            <Calendar className="w-5 h-5 text-faint" />
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Año Fiscal</label>
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="border border-line rounded-base px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent cursor-pointer bg-paper"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        </div>
      </div>

      <div className="bg-accent-soft border border-accent rounded-panel px-4 py-3 text-sm text-accent-ink">
        Haz clic en las tarjetas de <strong>Total Ventas</strong> o <strong>Total Costos</strong> para explorar el detalle.
      </div>

      {loadingResumen ? (
        <div className="bg-paper rounded-panel border border-line p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
          <p className="text-sm font-medium text-muted">Cargando resumen de finanzas...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                onClick={kpi.onClick}
                className={`bg-paper rounded-panel border p-5 transition-all ${kpi.onClick ? 'cursor-pointer hover:border-line-strong' : ''} ${kpi.active ? 'border-ink ring-1 ring-ink' : 'border-line'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted">{kpi.label}</p>
                  <div className={`w-10 h-10 rounded-base flex items-center justify-center ${kpi.iconClass}`}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-ink font-mono tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Gráficos Estadísticos */}
          {!showVentas && !showGastos && !showCheques && chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-paper rounded-panel border border-line p-6 flex flex-col items-center">
                <h2 className="text-base font-bold text-ink w-full mb-2">Distribución Financiera</h2>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatMoney(value)} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-paper rounded-panel border border-line p-6 flex flex-col items-center">
                <h2 className="text-base font-bold text-ink w-full mb-2">Top 5 Productos en Stock</h2>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topStockData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                      <YAxis allowDecimals={false} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="stock" radius={[4, 4, 0, 0]} maxBarSize={60}>
                        {topStockData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Gastos (Drill-down) */}
          {showGastos && (
            <GastosDrillDown
              isModeloInsumos={isModeloInsumos}
              desde={desde}
              hasta={hasta}
              onClose={() => setShowGastos(false)}
            />
          )}
        </>
      )}

      {/* Sección de Ventas (Drill-down) */}
      {!loadingResumen && showVentas && (
        <div className="bg-paper rounded-panel border border-ink overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-6 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowVentas(false)}
                className="p-1.5 hover:bg-canvas rounded-base text-faint hover:text-ink transition-colors cursor-pointer"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold text-ink">Detalle de Ventas</h2>
                <span className="text-sm text-muted font-medium">{totalElements} ventas en total</span>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
              {/* Selector de Vendedor (Solo Herramientas) dentro del detalle */}
              {isModeloInsumos && (
                <div className="flex items-center gap-2 bg-paper rounded-base border border-line px-3 py-1.5">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider hidden md:block">Vendedor</label>
                  <select
                    value={selectedVendedorId || ''}
                    onChange={(e) => setSelectedVendedorId(e.target.value ? parseInt(e.target.value) : null)}
                    className="text-sm focus:outline-none focus:ring-0 cursor-pointer bg-transparent w-full md:min-w-[120px]"
                  >
                    <option value="">Todos</option>
                    {(usuariosQuery.data || []).map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                  {selectedVendedorId && (
                    <div className="flex items-center gap-1.5 ml-2 border-l border-line pl-2">
                      <span className="text-xs text-muted hidden md:block">Total:</span>
                      <span className="text-sm font-bold text-accent-ink font-mono tabular-nums">{formatMoney(totalVentas)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="relative w-full sm:w-64 xl:w-72">
                <Search className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchVentas}
                  onChange={(e) => setSearchVentas(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>
            </div>
          </div>

          {loadingVentas ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
              <p className="text-sm font-medium text-muted">Cargando ventas...</p>
            </div>
          ) : ventas.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <ReceiptText className="w-10 h-10 text-faint mb-3" />
              <p className="text-sm text-muted">No hay ventas que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <>
              {/* Tarjetas mobile */}
              <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
                {ventas.map((venta) => (
                  <div key={venta.id} className="bg-paper border border-line rounded-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-muted">#{venta.nroVenta ?? venta.id}</p>
                        <p className="text-xs text-muted">{new Date(venta.fecha).toLocaleDateString('es-AR')}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadgeClass(venta.estadoDePago)}`}>
                        {venta.estadoDePago}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-ink">{venta.clienteNombre}</p>
                    <p className="mt-3 text-xl font-bold text-ink font-mono tabular-nums">{formatMoney(venta.totalFinal)}</p>
                    {isModeloInsumos && (
                      <p className="text-sm font-semibold text-body font-mono tabular-nums">G. Neta: {formatMoney(venta.gananciaNeta)}</p>
                    )}
                    <div className="mt-3 pt-3 border-t border-line space-y-1 text-xs text-muted">
                      <p>Método: {venta.metodoPago || '—'}</p>
                      <p
                        className="cursor-pointer hover:text-accent-ink transition-colors"
                        onClick={() => {
                          if (venta.vendedorId) setSelectedVendedorId(venta.vendedorId);
                        }}
                        title="Filtrar por este vendedor"
                      >
                        Vendedor: {venta.vendedorNombre}
                      </p>
                      <p className="truncate" title={venta.resumenProductos}>{venta.resumenProductos}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabla desktop */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-thead/75 border-b border-line">
                        <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">N°</th>
                        <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Cliente</th>
                        <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Productos</th>
                        <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Vendedor</th>
                        <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-right">Total</th>
                        {isModeloInsumos && (
                          <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-right">G. Neta</th>
                        )}
                        <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-center">Estado</th>
                        <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-center">Método</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {ventas.map((venta) => (
                        <tr key={venta.id} className="hover:bg-canvas transition-colors">
                          <td className="px-4 py-3 text-ink font-medium">#{venta.nroVenta ?? venta.id}</td>
                          <td className="px-4 py-3 text-body">
                            {new Date(venta.fecha).toLocaleDateString('es-AR')}
                          </td>
                          <td className="px-4 py-3 font-medium text-ink">{venta.clienteNombre}</td>
                          <td className="px-4 py-3 text-xs text-muted max-w-[200px] truncate" title={venta.resumenProductos}>
                            {venta.resumenProductos}
                          </td>
                          <td className="px-4 py-3 text-sm text-body cursor-pointer hover:text-accent-ink transition-colors"
                              onClick={() => {
                                if (venta.vendedorId) setSelectedVendedorId(venta.vendedorId);
                              }}
                              title="Filtrar por este vendedor"
                          >
                            {venta.vendedorNombre}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-ink font-mono tabular-nums">
                            {formatMoney(venta.totalFinal)}
                          </td>
                          {isModeloInsumos && (
                            <td className="px-4 py-3 text-right font-bold text-body font-mono tabular-nums">
                              {formatMoney(venta.gananciaNeta)}
                            </td>
                          )}
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadgeClass(venta.estadoDePago)}`}>
                              {venta.estadoDePago}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-body">
                            {venta.metodoPago || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Paginación */}
          {totalPages > 0 && (
            <div className="px-6 py-4 border-t border-line flex items-center justify-between bg-thead/50">
              <p className="text-sm text-muted flex items-center gap-2">
                {fetchingVentas && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                Página <span className="font-semibold text-ink">{page + 1}</span> de{' '}
                <span className="font-semibold text-ink">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-base border border-line text-muted hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors bg-paper"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-base border border-line text-muted hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors bg-paper"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detalle de Cheques en Cartera */}
      {!loadingResumen && showCheques && (
        <div className="bg-paper rounded-panel border border-ink overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCheques(false)}
                className="p-1.5 hover:bg-canvas rounded-base text-faint hover:text-ink transition-colors cursor-pointer"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                Cheques en Cartera
              </h2>
            </div>
          </div>

          <div className="p-0">
            {chequesCarteraQuery.isFetching ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
                <p className="text-sm font-medium text-muted">Cargando cheques...</p>
              </div>
            ) : chequesEnCarteraList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ReceiptText className="w-12 h-12 text-faint mb-3" />
                <p className="text-sm text-muted">No hay cheques en cartera.</p>
              </div>
            ) : (
              <>
                {/* Tarjetas mobile */}
                <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
                  {chequesEnCarteraList.map((cheque) => {
                    const vencimiento = describirVencimientoCheque(cheque.fechaCobro);
                    const { editable, rechazable } = describirEstadoCheque(cheque);
                    return (
                      <div key={cheque.id} className="bg-paper border border-line rounded-panel p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-2xl font-bold text-ink font-mono tabular-nums">{formatMoney(cheque.monto)}</p>
                            <p className={`text-xs font-semibold mt-1 ${vencimiento.tono.texto}`}>{vencimiento.etiqueta}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold ${describirOrigenCheque(cheque).tono.chip}`}>
                            {describirOrigenCheque(cheque).etiqueta}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-muted">
                          <p>Origen: {cheque.clienteNombre || 'Suelto'}</p>
                          <p>Banco: {cheque.banco || '-'}</p>
                          <p>Recibido: {new Date(cheque.fechaRecepcion).toLocaleDateString('es-AR')}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-line">
                          {editable || rechazable ? (
                            <button
                              onClick={() => {
                                setSelectedCheque(cheque);
                                setIsChequeModalOpen(true);
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2.5 text-accent-ink bg-accent-soft rounded-base hover:brightness-95 transition-colors cursor-pointer font-semibold text-sm"
                            >
                              <Edit3 className="w-4 h-4" />
                              Actualizar Estado
                            </button>
                          ) : (
                            <p className="text-center text-faint text-[10px] uppercase font-bold tracking-wide py-2">Bloqueado</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tabla desktop */}
                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-thead/75 border-b border-line">
                          <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">F. Recepción</th>
                          <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">F. Cobro</th>
                          <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Banco</th>
                          <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Origen</th>
                          <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Monto</th>
                          <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Tipo</th>
                          <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {chequesEnCarteraList.map((cheque) => (
                          <tr key={cheque.id} className="hover:bg-canvas transition-colors">
                            <td className="px-6 py-4 text-sm text-body">
                              {new Date(cheque.fechaRecepcion).toLocaleDateString('es-AR')}
                            </td>
                            <td className="px-6 py-4 text-sm text-body">
                              {new Date(cheque.fechaCobro).toLocaleDateString('es-AR')}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-ink">{cheque.banco}</td>
                            <td className="px-6 py-4 text-sm text-ink">{cheque.clienteNombre || 'Suelto'}</td>
                            <td className="px-6 py-4 text-sm font-bold text-ink text-right font-mono tabular-nums">
                              {formatMoney(cheque.monto)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold ${describirOrigenCheque(cheque).tono.chip}`}>
                                {describirOrigenCheque(cheque).etiqueta}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => {
                                  setSelectedCheque(cheque);
                                  setIsChequeModalOpen(true);
                                }}
                                className="text-accent-ink hover:brightness-90 p-2 bg-accent-soft rounded-base hover:brightness-95 transition-colors cursor-pointer"
                                title="Editar estado"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Edición de Cheque */}
      <ChequeEstadoModal
        isOpen={isChequeModalOpen}
        onClose={() => setIsChequeModalOpen(false)}
        cheque={selectedCheque}
      />
    </div>
  );
};

export default Finanzas;
