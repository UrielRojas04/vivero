import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, ChevronLeft, ChevronRight, PackageCheck, XCircle, Eye } from 'lucide-react';
import { pedidosApi } from '../api/pedidos.api';
import { proveedoresApi } from '../api/proveedores.api';
import PedidoForm from '../components/PedidoForm';
import RecepcionPedidoModal from '../components/RecepcionPedidoModal';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';

const ESTADOS = ['PENDIENTE', 'COMPLETO', 'PARCIAL', 'CANCELADO'];

// Los estados PARCIAL y COMPLETO se distinguen visualmente (tarea 9.1 de tasks.md): PARCIAL en
// ámbar (hay faltantes por reclamar/reponer), COMPLETO en verde, PENDIENTE en azul, CANCELADO en gris.
const estiloEstado = (estado) => {
  switch (estado) {
    case 'PENDIENTE': return 'bg-blue-50 text-blue-700';
    case 'COMPLETO': return 'bg-emerald-50 text-emerald-700';
    case 'PARCIAL': return 'bg-amber-50 text-amber-700';
    case 'CANCELADO': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-600';
  }
};

export default function Pedidos() {
  const { pushToast, askConfirm, denyAccess } = useUIStore();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const size = 10;
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [proveedorFiltro, setProveedorFiltro] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
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
        if (err.response?.status === 403) denyAccess();
        throw err;
      }
    },
  });

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ['pedidos'] });

  const handleCrearPedido = async (payload) => {
    try {
      await pedidosApi.create(payload);
      pushToast('success', 'Pedido creado correctamente.');
      setIsFormOpen(false);
      refrescar();
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'No se pudo crear el pedido.'));
    }
  };

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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-emerald-600" />
          Pedidos a Proveedores
        </h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nuevo Pedido
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={estadoFiltro}
          onChange={(e) => { setEstadoFiltro(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          value={proveedorFiltro}
          onChange={(e) => { setProveedorFiltro(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Cargando pedidos...</p>
          </div>
        ) : (
          <>
            {/* Tarjetas mobile */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {data?.content?.map((pedido) => (
                <div key={pedido.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{pedido.proveedorNombre}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatFecha(pedido.fechaCreacion)}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${estiloEstado(pedido.estado)}`}>
                      {pedido.estado}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between items-center text-sm">
                    <span className="text-gray-500">{pedido.detalles?.length || 0} ítem(s)</span>
                    <span className="font-bold text-gray-900">{formatMonto(pedido.total)}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    {pedido.estado === 'PENDIENTE' ? (
                      <>
                        <button
                          onClick={() => handleAbrirRecepcion(pedido)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer font-semibold text-sm"
                        >
                          <PackageCheck className="w-4 h-4" /> Confirmar
                        </button>
                        <button
                          onClick={() => handleCancelar(pedido)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer font-semibold text-sm"
                        >
                          <XCircle className="w-4 h-4" /> Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleAbrirRecepcion(pedido)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer font-semibold text-sm"
                      >
                        <Eye className="w-4 h-4" /> Ver Detalle
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {data?.content?.length === 0 && (
                <div className="px-6 py-10 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
                  No se encontraron pedidos.
                </div>
              )}
            </div>

            {/* Tabla desktop */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ítems</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data?.content?.map((pedido) => (
                      <tr key={pedido.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{pedido.proveedorNombre}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatFecha(pedido.fechaCreacion)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">{pedido.detalles?.length || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{formatMonto(pedido.total)}</td>
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
                                className="text-emerald-600 hover:text-emerald-900 p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Confirmar recepción"
                              >
                                <PackageCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelar(pedido)}
                                className="text-red-600 hover:text-red-900 p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                title="Cancelar pedido"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAbrirRecepcion(pedido)}
                              className="text-gray-500 hover:text-gray-900 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
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
                        <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
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
              <div className="flex items-center justify-between mt-6 bg-white border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-500">
                  Página <span className="font-bold text-gray-900">{data.number + 1}</span> de <span className="font-bold text-gray-900">{data.totalPages}</span>
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={data.first}
                    className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={data.last}
                    className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <PedidoForm
        isOpen={isFormOpen}
        onSave={handleCrearPedido}
        onCancel={() => setIsFormOpen(false)}
      />

      <RecepcionPedidoModal
        pedido={pedidoSeleccionado}
        isOpen={isRecepcionOpen}
        onClose={() => { setIsRecepcionOpen(false); setPedidoSeleccionado(null); }}
        onConfirmed={refrescar}
      />
    </div>
  );
}
