import React, { useState, useEffect } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  TrendingDown,
  Search,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { finanzasApi } from '../api/finanzas.api';
import { getGastos, createGasto, deleteGasto } from '../api/gastos.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import FormattedNumberInput from '../components/FormattedNumberInput';

const formatMoney = (value) =>
  `$${(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const GastosDrillDown = ({ isModeloInsumos = false, onClose, desde, hasta }) => {
  const { pushToast, askConfirm } = useUIStore();
  const queryClient = useQueryClient();

  const [gastosPage, setGastosPage] = useState(0);
  const [searchGastos, setSearchGastos] = useState('');
  const [debouncedSearchGastos, setDebouncedSearchGastos] = useState('');
  const [nuevoGasto, setNuevoGasto] = useState({ concepto: '', monto: '' });

  useEffect(() => {
    setGastosPage(0);
  }, [debouncedSearchGastos]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchGastos(searchGastos), 500);
    return () => clearTimeout(handler);
  }, [searchGastos]);

  const gastosQuery = useQuery({
    queryKey: ['finanzas', 'gastos', { q: debouncedSearchGastos, page: gastosPage, size: 5 }],
    queryFn: () => getGastos({ q: debouncedSearchGastos, page: gastosPage, size: 5 }),
    placeholderData: keepPreviousData,
  });

  const cogsDetalleQuery = useQuery({
    queryKey: ['finanzas', 'cogs', { desde, hasta }],
    queryFn: () => finanzasApi.fetchCogsDetalle(desde, hasta),
    enabled: isModeloInsumos,
  });

  // Invalida las dos claves de resumen posibles: 'finanzas/resumen' (Finanzas.jsx, Vivero/
  // Herramientas) y 'abono/liquidacion' (LiquidacionAbono.jsx) -- este componente se reusa en
  // ambas pantallas (bug real 2026-09-04: al reciclar el componente en Abono, sólo invalidaba la
  // clave de Finanzas.jsx, así que el número de "Gastos" de la Liquidación de Abono quedaba
  // desactualizado después de cargar/borrar un gasto manual). invalidateQueries matchea por
  // prefijo, así que ['abono','liquidacion'] alcanza a la query real
  // ['abono','liquidacion',selectedMonth,selectedYear] sin que este componente necesite conocer
  // el mes/año seleccionados. Invalidar una clave que no existe en la pantalla actual es un no-op,
  // así que no hay costo en pedir las dos siempre.
  const invalidarResumenes = () => {
    queryClient.invalidateQueries(['finanzas', 'gastos']);
    queryClient.invalidateQueries(['finanzas', 'resumen']);
    queryClient.invalidateQueries(['abono', 'liquidacion']);
  };

  const createGastoMutation = useMutation({
    mutationFn: createGasto,
    onSuccess: () => {
      invalidarResumenes();
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
      invalidarResumenes();
      pushToast('success', 'Gasto eliminado correctamente');
    },
    onError: (error) => {
      pushToast('error', getErrorMessage(error, 'Error al eliminar el gasto'));
    }
  });

  const handleCrearGasto = (e) => {
    e.preventDefault();
    if (!nuevoGasto.concepto || !nuevoGasto.monto) return;
    createGastoMutation.mutate({
      concepto: nuevoGasto.concepto,
      monto: parseFloat(nuevoGasto.monto)
    });
  };

  const gastos = gastosQuery.data?.content || [];
  const gastosTotalPages = gastosQuery.data?.totalPages || 0;

  const filteredCogs = (cogsDetalleQuery.data || []).filter(d =>
    !searchGastos ||
    (d.productoNombre && d.productoNombre.toLowerCase().includes(searchGastos.toLowerCase()))
  );

  const hasGastosToShow = gastos.length > 0 ||
    (isModeloInsumos && gastosPage === 0 && filteredCogs.length > 0);

  const loadingGastos = gastosQuery.isFetching;
  const fetchingGastos = gastosQuery.isFetching;

  return (
    <div className="bg-paper rounded-panel border border-ink p-6 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-canvas rounded-base text-faint hover:text-ink transition-colors cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-ink flex items-center gap-2 whitespace-nowrap">
            <TrendingDown className="w-5 h-5 text-muted" />
            Costos y Gastos
          </h2>
        </div>

        <div className="relative w-full xl:w-80">
          <Search className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isModeloInsumos ? "Buscar por concepto o producto..." : "Buscar por concepto o insumo..."}
            value={searchGastos}
            onChange={(e) => setSearchGastos(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
          />
        </div>

        <form onSubmit={handleCrearGasto} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto bg-canvas/80 p-2 rounded-panel border border-line">
          <input
            type="text"
            placeholder="Nuevo Gasto..."
            className="flex-1 w-full sm:w-auto border border-line rounded-base px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-paper"
            value={nuevoGasto.concepto}
            onChange={e => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })}
            required
          />
          <div className="relative w-full sm:w-40">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium text-base">$</span>
            <FormattedNumberInput
              id="monto"
              placeholder="Monto"
              className="w-full border border-line rounded-base pl-7 pr-3 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-paper"
              value={nuevoGasto.monto}
              onChange={val => setNuevoGasto({ ...nuevoGasto, monto: val })}
              required
            />
          </div>
          <button
            type="submit"
            disabled={createGastoMutation.isPending}
            title="Registrar Gasto"
            className="w-full sm:w-auto flex items-center justify-center bg-ink text-paper rounded-base p-1.5 text-sm font-medium hover:brightness-110 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {createGastoMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </form>
      </div>

      <div className="min-h-[200px]">
        {loadingGastos ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : !hasGastosToShow ? (
          <div className="py-8 text-center text-sm text-muted">
            No hay gastos o costos que coincidan con la búsqueda.
          </div>
        ) : (
          <ul className="space-y-3">
            {/* Costos de Mercadería individuales (en la primera página de gastos) */}
            {isModeloInsumos && gastosPage === 0 && filteredCogs.map(d => (
              <li key={`cogs-${d.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-panel border border-line bg-thead/30 hover:bg-thead transition-colors gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink flex items-center gap-2">
                    {d.cantidad}x {d.productoNombre}
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-thead text-body rounded-full border border-line">AUTOMÁTICO</span>
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Base: {formatMoney(d.costoBaseHistorico)}
                    {d.descuentoPorcentajeHistorico > 0 ? ` - Desc: ${d.descuentoPorcentajeHistorico}%` : ''}
                    {d.envioPorcentajeHistorico > 0 ? ` + Envío: ${d.envioPorcentajeHistorico}%` : ''}
                    = {formatMoney(d.costoUnitarioHistorico)} c/u
                  </p>
                </div>
                <div className="flex items-center sm:justify-end">
                  <span className="font-bold text-body font-mono tabular-nums">{formatMoney(d.costoUnitarioHistorico * d.cantidad)}</span>
                </div>
              </li>
            ))}

            {/* Fila sintética para Costo de Producción en Vivero eliminada por redundancia con insumos individuales */}
            {gastos.map(gasto => (
              <li key={gasto.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-panel border border-line bg-paper hover:border-line-strong transition-colors gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink flex items-center">
                    {gasto.concepto}
                    {gasto.tipo === 'INSUMO' && (
                      <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-thead text-body rounded-full border border-line">INSUMO</span>
                    )}
                  </p>
                  <p className="text-xs text-muted">{new Date(gasto.fecha).toLocaleDateString('es-AR')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-body font-mono tabular-nums">{formatMoney(gasto.monto)}</span>
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
                      className="text-faint hover:text-danger hover:bg-danger-bg p-1.5 rounded-base transition-colors disabled:opacity-50 cursor-pointer"
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
      {isModeloInsumos && (
        <div className="mt-8 bg-thead border border-line rounded-base p-4">
          <p className="text-sm text-body">
            <strong>Nota:</strong> En el negocio de Herramientas, el indicador de <strong>Total Costos</strong> incluye el <strong>Costo de Mercadería Vendida</strong> de las ventas realizadas en este período, calculado en base al costo histórico al momento de cada venta.
          </p>
        </div>
      )}

      {/* Paginación Gastos */}
      {gastosTotalPages > 0 && (
        <div className="pt-4 mt-4 border-t border-line flex items-center justify-between">
          <span className="text-xs text-muted flex items-center gap-1">
            {fetchingGastos && <Loader2 className="w-3 h-3 text-accent animate-spin" />}
            Página {gastosPage + 1} de {gastosTotalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setGastosPage(Math.max(0, gastosPage - 1))}
              disabled={gastosPage === 0}
              className="p-1 rounded-base text-faint hover:text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGastosPage(Math.min(gastosTotalPages - 1, gastosPage + 1))}
              disabled={gastosPage >= gastosTotalPages - 1}
              className="p-1 rounded-base text-faint hover:text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GastosDrillDown;
