import React, { useState, useEffect } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Plus,
  TrendingDown,
  Search,
  ArrowLeft,
  Trash2,
  CreditCard,
  X,
  Edit3
} from 'lucide-react';
import { finanzasApi } from '../api/finanzas.api';
import { chequesApi } from '../api/cheques.api';
import { getGastos, createGasto, deleteGasto } from '../api/gastos.api';
import { productosApi } from '../api/productos.api';
import { negociosApi } from '../api/negocios.api';
import { usuariosApi } from '../api/usuarios.api';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { useStockStore } from '../store/useStockStore';
import { getErrorMessage } from '../utils/errorMessage';
import FormattedNumberInput from '../components/FormattedNumberInput';
import ChequeEstadoModal from '../components/ChequeEstadoModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

const formatMoney = (value) =>
  `$${(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Finanzas = () => {
  const { pushToast, denyAccess, askConfirm } = useUIStore();
  const { unidadNegocioActiva } = useAuthStore();
  const liveStocks = useStockStore(state => state.liveStocks);
  const queryClient = useQueryClient();
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
  const [gastosPage, setGastosPage] = useState(0);
  const [searchVentas, setSearchVentas] = useState('');
  const [debouncedSearchVentas, setDebouncedSearchVentas] = useState('');
  const [searchGastos, setSearchGastos] = useState('');
  const [debouncedSearchGastos, setDebouncedSearchGastos] = useState('');

  const [nuevoGasto, setNuevoGasto] = useState({ concepto: '', monto: '' });
  const [selectedCheque, setSelectedCheque] = useState(null);
  const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);

  const desde = `${selectedYear}-01-01`;
  const hasta = `${selectedYear}-12-31`;

  // Al cambiar de año o búsqueda, volvemos a la primera página
  useEffect(() => {
    setPage(0);
  }, [selectedYear, debouncedSearchVentas]);

  useEffect(() => {
    setGastosPage(0);
  }, [selectedYear, debouncedSearchGastos]);

  // Debounce para búsquedas
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchVentas(searchVentas), 500);
    return () => clearTimeout(handler);
  }, [searchVentas]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchGastos(searchGastos), 500);
    return () => clearTimeout(handler);
  }, [searchGastos]);

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

  const gastosQuery = useQuery({
    queryKey: ['finanzas', 'gastos', { q: debouncedSearchGastos, page: gastosPage, size: 5 }],
    queryFn: () => getGastos({ q: debouncedSearchGastos, page: gastosPage, size: 5 }),
    placeholderData: keepPreviousData,
    enabled: showGastos,
  });

  const cogsDetalleQuery = useQuery({
    queryKey: ['finanzas', 'cogs', { desde, hasta }],
    queryFn: () => finanzasApi.fetchCogsDetalle(desde, hasta),
    enabled: showGastos && unidadNegocioActiva === '2',
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

  const createGastoMutation = useMutation({
    mutationFn: createGasto,
    onSuccess: () => {
      queryClient.invalidateQueries(['finanzas', 'gastos']);
      queryClient.invalidateQueries(['finanzas', 'resumen']);
      pushToast('success', 'Gasto registrado correctamente');
      setNuevoGasto({ concepto: '', monto: '' });
    },
    onError: (error) => {
      pushToast('error', getErrorMessage(error, 'Error al registrar el gasto'));
    }
  });

  const deleteGastoMutation = useMutation({
    mutationFn: (id) => deleteGasto(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['finanzas', 'gastos']);
      queryClient.invalidateQueries(['finanzas', 'resumen']);
      pushToast('success', 'Gasto eliminado correctamente');
    },
    onError: (error) => {
      pushToast('error', getErrorMessage(error, 'Error al eliminar el gasto'));
    }
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

  const handleCrearGasto = (e) => {
    e.preventDefault();
    if (!nuevoGasto.concepto || !nuevoGasto.monto) return;
    createGastoMutation.mutate({
      concepto: nuevoGasto.concepto,
      monto: parseFloat(nuevoGasto.monto)
    });
  };

  const resumen = resumenQuery.data;
  const ventas = ventasQuery.data?.content || [];
  const gastos = gastosQuery.data?.content || [];
  const totalPages = ventasQuery.data?.totalPages || 0;
  const totalElements = ventasQuery.data?.totalElements || 0;
  const gastosTotalPages = gastosQuery.data?.totalPages || 0;
  const chequesEnCarteraList = chequesCarteraQuery.data?.content?.filter(c => c.estado === 'EN_CARTERA') || [];

  const filteredCogs = (cogsDetalleQuery.data || []).filter(d => 
    !searchGastos || 
    (d.productoNombre && d.productoNombre.toLowerCase().includes(searchGastos.toLowerCase()))
  );

  const hasGastosToShow = gastos.length > 0 || 
    (unidadNegocioActiva === '2' && gastosPage === 0 && filteredCogs.length > 0) ||
    (unidadNegocioActiva === '1' && gastosPage === 0 && !searchGastos && resumen?.costoMercaderiaVendida > 0);

  const loadingResumen = resumenQuery.isPending;
  const loadingVentas = ventasQuery.isFetching;
  const fetchingVentas = ventasQuery.isFetching;
  const loadingGastos = gastosQuery.isFetching;
  const fetchingGastos = gastosQuery.isFetching;

  const totalVentas = resumen?.totalVentas ?? 0;
  const totalCostos = resumen?.totalCostos ?? 0;
  const gananciaNeta = resumen?.gananciaNeta ?? 0;
  const margen = resumen?.margen ?? 0;
  const chequesEnCartera = resumen?.chequesEnCartera ?? 0;

  const kpis = [
    { 
      label: 'Total Ventas', 
      value: formatMoney(totalVentas), 
      icon: Wallet, 
      iconClass: 'bg-emerald-50 text-emerald-600',
      active: showVentas,
      onClick: () => { setShowVentas(!showVentas); setShowGastos(false); setShowCheques(false); }
    },
    { 
      label: 'Total Costos', 
      value: formatMoney(totalCostos), 
      icon: Coins, 
      iconClass: 'bg-red-50 text-red-500',
      active: showGastos,
      onClick: () => { setShowGastos(!showGastos); setShowVentas(false); setShowCheques(false); }
    },
    { label: 'Ganancia Neta', value: formatMoney(gananciaNeta), icon: HandCoins, iconClass: 'bg-blue-50 text-blue-600' },
    { label: 'Margen de Ganancia', value: `${margen.toLocaleString('es-AR')} %`, icon: Percent, iconClass: 'bg-violet-50 text-violet-600' },
    { 
      label: 'Valores a Depositar (Cheques)', 
      value: formatMoney(chequesEnCartera), 
      icon: CreditCard, 
      iconClass: 'bg-amber-50 text-amber-600',
      active: showCheques,
      onClick: () => { setShowCheques(!showCheques); setShowVentas(false); setShowGastos(false); }
    },
  ];

  const estadoBadgeClass = (estado) => {
    if (estado === 'PAGADO') return 'bg-emerald-50 text-emerald-700';
    if (estado === 'PARCIAL') return 'bg-yellow-50 text-yellow-700';
    return 'bg-red-50 text-red-700';
  };

  const chartData = [
    { name: 'Ventas', value: totalVentas, color: '#10b981' },
    { name: 'Costos/Gastos', value: totalCostos, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const productos = (productosQuery.data || []).map(p => ({
    ...p,
    stock: liveStocks[p.id] !== undefined ? liveStocks[p.id] : p.stock
  }));
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
          <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
          <PieChartIcon className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
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
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-800">
        Haz clic en las tarjetas de <strong>Total Ventas</strong> o <strong>Total Costos</strong> para explorar el detalle.
      </div>

      {loadingResumen ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center gap-3 shadow-sm">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Cargando resumen de finanzas...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {kpis.map((kpi) => (
              <div 
                key={kpi.label} 
                onClick={kpi.onClick}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${kpi.onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-md' : ''} ${kpi.active ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'}`}
              >
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

          {/* Gráficos Estadísticos */}
          {!showVentas && !showGastos && !showCheques && chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col items-center">
                <h2 className="text-base font-bold text-gray-900 w-full mb-2">Distribución Financiera</h2>
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

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col items-center">
                <h2 className="text-base font-bold text-gray-900 w-full mb-2">Top 5 Productos en Stock</h2>
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
            <div className="bg-white rounded-2xl border border-gray-900 p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowGastos(false)} 
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                    title="Volver"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 whitespace-nowrap">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    Costos y Gastos
                  </h2>
                </div>
                
                <div className="relative w-full xl:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={unidadNegocioActiva === '2' ? "Buscar por concepto o producto..." : "Buscar por concepto o insumo..."}
                    value={searchGastos}
                    onChange={(e) => setSearchGastos(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
                
                <form onSubmit={handleCrearGasto} className="flex flex-row items-center gap-2 w-full xl:w-auto bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                  <input
                    type="text"
                    placeholder="Nuevo Gasto..."
                    className="flex-1 w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    value={nuevoGasto.concepto}
                    onChange={e => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })}
                    required
                  />
                  <div className="relative w-32 sm:w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-base">$</span>
                    <FormattedNumberInput
                      id="monto"
                      placeholder="Monto"
                      className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      value={nuevoGasto.monto}
                      onChange={val => setNuevoGasto({ ...nuevoGasto, monto: val })}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createGastoMutation.isPending}
                    title="Registrar Gasto"
                    className="flex items-center justify-center bg-gray-900 text-white rounded-lg p-1.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {createGastoMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </button>
                </form>
              </div>

              <div className="min-h-[200px]">
                {loadingGastos ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                  </div>
                ) : !hasGastosToShow ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    No hay gastos o costos que coincidan con la búsqueda.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {/* Costos de Mercadería individuales (en la primera página de gastos) */}
                    {unidadNegocioActiva === '2' && gastosPage === 0 && filteredCogs.map(d => (
                      <li key={`cogs-${d.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/30 hover:bg-blue-50 transition-colors shadow-sm gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            {d.cantidad}x {d.productoNombre}
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full border border-blue-200">AUTOMÁTICO</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Base: {formatMoney(d.costoBaseHistorico)} 
                            {d.descuentoPorcentajeHistorico > 0 ? ` - Desc: ${d.descuentoPorcentajeHistorico}%` : ''} 
                            {d.envioPorcentajeHistorico > 0 ? ` + Envío: ${d.envioPorcentajeHistorico}%` : ''} 
                            = {formatMoney(d.costoUnitarioHistorico)} c/u
                          </p>
                        </div>
                        <div className="flex items-center sm:justify-end">
                          <span className="font-bold text-red-600">{formatMoney(d.costoUnitarioHistorico * d.cantidad)}</span>
                        </div>
                      </li>
                    ))}
                    
                    {/* Fila sintética para Costo de Producción en Vivero */}
                    {unidadNegocioActiva === '1' && resumen?.costoMercaderiaVendida > 0 && gastosPage === 0 && searchGastos === '' && (
                      <li className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/50 hover:border-blue-200 transition-colors shadow-sm">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 flex items-center">
                            Costo de Producción (Insumos)
                            <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full border border-blue-200">AUTOMÁTICO</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Costo total de insumos registrados en este período.
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-red-600">{formatMoney(resumen.costoMercaderiaVendida)}</span>
                        </div>
                      </li>
                    )}
                    {gastos.map(gasto => (
                      <li key={gasto.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors shadow-sm">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 flex items-center">
                            {gasto.concepto}
                            {gasto.tipo === 'INSUMO' && (
                              <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full border border-blue-100">INSUMO</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{new Date(gasto.fecha).toLocaleDateString('es-AR')}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-red-600">{formatMoney(gasto.monto)}</span>
                          {gasto.tipo === 'MANUAL' && (
                            <button
                              onClick={() => {
                                askConfirm({
                                  title: 'Eliminar Gasto',
                                  message: '¿Está seguro de eliminar este gasto?',
                                  onConfirm: () => {
                                    const rawId = gasto.id.toString().replace('G-', '');
                                    deleteGastoMutation.mutate(rawId);
                                  }
                                });
                              }}
                              disabled={deleteGastoMutation.isPending}
                              title="Eliminar"
                              className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {deleteGastoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/* Costo de Mercadería Vendida (Info) */}
              {unidadNegocioActiva === '2' && (
                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> En el negocio de Herramientas, el indicador de <strong>Total Costos</strong> incluye el <strong>Costo de Mercadería Vendida</strong> de las ventas realizadas en este período, calculado en base al costo histórico al momento de cada venta.
                  </p>
                </div>
              )}
              
              {/* Paginación Gastos */}
              {gastosTotalPages > 0 && (
                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    {fetchingGastos && <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />}
                    Página {gastosPage + 1} de {gastosTotalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setGastosPage(Math.max(0, gastosPage - 1))}
                      disabled={gastosPage === 0}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setGastosPage(Math.min(gastosTotalPages - 1, gastosPage + 1))}
                      disabled={gastosPage >= gastosTotalPages - 1}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Sección de Ventas (Drill-down) */}
      {!loadingResumen && showVentas && (
        <div className="bg-white rounded-2xl border border-gray-900 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowVentas(false)} 
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold text-gray-900">Detalle de Ventas</h2>
                <span className="text-sm text-gray-500 font-medium">{totalElements} ventas en total</span>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
              {/* Selector de Vendedor (Solo Herramientas) dentro del detalle */}
              {unidadNegocioActiva === '2' && (
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-1.5 shadow-sm">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:block">Vendedor</label>
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
                    <div className="flex items-center gap-1.5 ml-2 border-l border-gray-200 pl-2">
                      <span className="text-xs text-gray-500 hidden md:block">Total:</span>
                      <span className="text-sm font-bold text-emerald-600">{formatMoney(totalVentas)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="relative w-full sm:w-64 xl:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchVentas}
                  onChange={(e) => setSearchVentas(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {loadingVentas ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
              <p className="text-sm font-medium text-gray-500">Cargando ventas...</p>
            </div>
          ) : ventas.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <ReceiptText className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No hay ventas que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">N°</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Productos</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendedor</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</th>
                    {unidadNegocioActiva === '2' && (
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">G. Neta</th>
                    )}
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Método</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ventas.map((venta) => (
                    <tr key={venta.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-900 font-medium">#{venta.nroVenta ?? venta.id}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(venta.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{venta.clienteNombre}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={venta.resumenProductos}>
                        {venta.resumenProductos}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 cursor-pointer hover:text-emerald-600 transition-colors" 
                          onClick={() => {
                            if (venta.vendedorId) setSelectedVendedorId(venta.vendedorId);
                          }}
                          title="Filtrar por este vendedor"
                      >
                        {venta.vendedorNombre}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {formatMoney(venta.totalFinal)}
                      </td>
                      {unidadNegocioActiva === '2' && (
                        <td className="px-4 py-3 text-right font-bold text-blue-600">
                          {formatMoney(venta.gananciaNeta)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadgeClass(venta.estadoDePago)}`}>
                          {venta.estadoDePago}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">
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
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <p className="text-sm text-gray-500 flex items-center gap-2">
                {fetchingVentas && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
                Página <span className="font-semibold text-gray-900">{page + 1}</span> de{' '}
                <span className="font-semibold text-gray-900">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors bg-white"
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
        <div className="bg-white rounded-2xl border border-gray-900 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowCheques(false)} 
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Cheques en Cartera
              </h2>
            </div>
          </div>
            
          <div className="p-0">
            {chequesCarteraQuery.isFetching ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                <p className="text-sm font-medium text-gray-500">Cargando cheques...</p>
              </div>
            ) : chequesEnCarteraList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ReceiptText className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No hay cheques en cartera.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-200">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">F. Recepción</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">F. Cobro</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Banco</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Emisor</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Monto</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Tipo</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {chequesEnCarteraList.map((cheque) => (
                      <tr key={cheque.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(cheque.fechaRecepcion).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(cheque.fechaCobro).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{cheque.banco}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{cheque.emisor}</td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-700 text-right">
                          {formatMoney(cheque.monto)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {cheque.esEmisionPropia ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                              Propio
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              Tercero
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedCheque(cheque);
                              setIsChequeModalOpen(true);
                            }}
                            className="text-emerald-600 hover:text-emerald-900 p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
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