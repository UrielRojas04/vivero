import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, ChevronLeft, ChevronRight, PackageCheck, XCircle, Eye } from 'lucide-react';
import { pedidosApi } from '../api/pedidos.api';
import { proveedoresApi } from '../api/proveedores.api';
import RecepcionPedidoModal from '../components/RecepcionPedidoModal';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';

const ESTADOS = ['PENDIENTE', 'COMPLETO', 'PARCIAL', 'CANCELADO'];

// PARCIAL (hay faltantes por reclamar/reponer) -> warn; COMPLETO -> ok; PENDIENTE y CANCELADO
// no tienen par semántico en la paleta de 3 tonos (ni son un progreso positivo/negativo en sí
// mismos) -> neutral de token, mismo criterio que el azul informativo colapsado en
// chequeDisplay.js (Decisión 4 de design.md).
const estiloEstado = (estado) => {
  switch (estado) {
    case 'PENDIENTE': return 'bg-thead text-body border border-line';
    case 'COMPLETO': return 'bg-ok-bg text-ok-ink';
    case 'PARCIAL': return 'bg-warn-bg text-warn-ink';
    case 'CANCELADO': return 'bg-thead text-body border border-line';
    default: return 'bg-thead text-body border border-line';
  }
};

export default function Pedidos() {
  const { pushToast, askConfirm, denyAccess } = useUIStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const size = 10;
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [proveedorFiltro, setProveedorFiltro] = useState('');

  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [isRecepcionOpen, setIsRecepcionOpen] = useState(false);

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => proveedoresApi.getAll(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['pedidos', { page, size, estadoFiltro, proveedorFiltro }],
    queryFn: async () => {
      try {
        return await pedidosApi.getAll({
          page,
          size,
          estado: estadoFiltro || undefined,
          proveedorId: proveedorFiltro || undefined,
        });
      } catch (err) {
        if (err.response?.status === 403) {
          denyAccess();
        } else {
          // Antes, un error no-403 acá (ej. el 500 real encontrado en este change, un pedido con
          // proveedor/producto dado de baja tumbando el listado) quedaba mudo: la tabla se veía
          // simplemente "sin pedidos" sin ninguna pista de que en realidad había fallado la
          // consulta. Avisamos siempre que no sea un 403 (que ya tiene su propio modal dedicado).
          pushToast('error', getErrorMessage(err, 'No se pudo cargar el listado de pedidos.'));
        }
        throw err;
      }
    },
  });

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['pedidos'] });

  const handleAbrirRecepcion = async (pedidoResumen) => {
    try {
      const pedidoCompleto = await pedidosApi.getById(pedidoResumen.id);
      setPedidoSeleccionado(pedidoCompleto);
      setIsRecepcionOpen(true);
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'No se pudo cargar el detalle del pedido.'));
    }
  };

  const handleCancelar = (pedido) => {
    askConfirm({
      title: 'Cancelar Pedido',
      message: `¿Cancelar el pedido a "${pedido.proveedorNombre}"? No se generará ningún movimiento de stock.`,
      variant: 'danger',
      confirmLabel: 'Cancelar Pedido',
      onConfirm: async () => {
        try {
          await pedidosApi.cancelar(pedido.id);
          pushToast('success', 'Pedido cancelado.');
          refrescar();
        } catch (err) {
          pushToast('error', getErrorMessage(err, 'No se pudo cancelar el pedido.'));
        }
      },
    });
  };

  const formatFecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-AR') : '-');
  const formatMonto = (n) => (n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-accent" />
          Pedidos a Proveedores
        </h1>
        <button
          onClick={() => navigate('/pedidos/nuevo')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-accent text-paper rounded-base font-medium hover:brightness-95 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nuevo Pedido
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={estadoFiltro}
          onChange={(e) => { setEstadoFiltro(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-line rounded-base bg-paper focus:ring-2 focus:ring-accent outline-none text-sm"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          value={proveedorFiltro}
          onChange={(e) => { setProveedorFiltro(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-line rounded-base bg-paper focus:ring-2 focus:ring-accent outline-none text-sm"
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      <div className="bg-paper p-6 rounded-panel border border-line">
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted font-medium">Cargando pedidos...</p>
          </div>
        ) : (
          <>
            {/* Tarjetas mobile */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {data?.content?.map((pedido) => (
                <div key={pedido.id} className="bg-paper border border-line rounded-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{pedido.proveedorNombre}</p>
                      <p className="text-xs text-muted mt-1">{formatFecha(pedido.fechaCreacion)}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${estiloEstado(pedido.estado)}`}>
                      {pedido.estado}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between items-center text-sm">
                    <span className="text-muted">{pedido.detalles?.length || 0} ítem(s)</span>
                    <span className="font-bold text-ink font-mono tabular-nums">{formatMonto(pedido.total)}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-line flex gap-2">
                    {pedido.estado === 'PENDIENTE' ? (
                      <>
                        <button
                          onClick={() => handleAbrirRecepcion(pedido)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-accent-ink bg-accent-soft rounded-base hover:brightness-95 transition-colors cursor-pointer font-semibold text-sm"
                        >
                          <PackageCheck className="w-4 h-4" /> Confirmar
                        </button>
                        <button
                          onClick={() => handleCancelar(pedido)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-danger bg-danger-bg rounded-base hover:brightness-95 transition-colors cursor-pointer font-semibold text-sm"
                        >
                          <XCircle className="w-4 h-4" /> Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleAbrirRecepcion(pedido)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-muted bg-canvas rounded-base hover:bg-thead transition-colors cursor-pointer font-semibold text-sm"
                      >
                        <Eye className="w-4 h-4" /> Ver Detalle
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {data?.content?.length === 0 && (
                <div className="px-6 py-10 text-center text-muted bg-paper border border-line rounded-panel">
                  No se encontraron pedidos.
                </div>
              )}
            </div>

            {/* Tabla desktop */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line">
                  <thead className="bg-thead">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Proveedor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider">Ítems</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-paper divide-y divide-line">
                    {data?.content?.map((pedido) => (
                      <tr key={pedido.id} className="hover:bg-canvas">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ink">{pedido.proveedorNombre}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-body">{formatFecha(pedido.fechaCreacion)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-body">{pedido.detalles?.length || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-ink text-right font-mono tabular-nums">{formatMonto(pedido.total)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase ${estiloEstado(pedido.estado)}`}>
                            {pedido.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          {pedido.estado === 'PENDIENTE' ? (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleAbrirRecepcion(pedido)}
                                className="text-accent-ink hover:brightness-90 p-2 bg-accent-soft rounded-base hover:brightness-95 transition-colors cursor-pointer"
                                title="Confirmar recepción"
                              >
                                <PackageCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelar(pedido)}
                                className="text-danger hover:brightness-90 p-2 bg-danger-bg rounded-base hover:brightness-95 transition-colors cursor-pointer"
                                title="Cancelar pedido"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAbrirRecepcion(pedido)}
                              className="text-muted hover:text-body p-2 bg-canvas rounded-base hover:bg-thead transition-colors cursor-pointer"
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {data?.content?.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-muted">
                          No se encontraron pedidos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación */}
            {data?.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 bg-paper border-t border-line pt-4">
                <p className="text-sm text-muted">
                  Página <span className="font-bold text-ink">{data.number + 1}</span> de <span className="font-bold text-ink">{data.totalPages}</span>
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={data.first}
                    className="px-3 py-1 border border-line-strong rounded-base bg-paper text-body hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={data.last}
                    className="px-3 py-1 border border-line-strong rounded-base bg-paper text-body hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <RecepcionPedidoModal
        pedido={pedidoSeleccionado}
        isOpen={isRecepcionOpen}
        onClose={() => { setIsRecepcionOpen(false); setPedidoSeleccionado(null); }}
        onConfirmed={refrescar}
      />
    </div>
  );
}
