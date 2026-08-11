import React, { useState, useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';
import { chequesApi } from '../api/cheques.api';
import { Briefcase, CreditCard, ChevronLeft, ChevronRight, Edit3, X, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function Cheques() {
  const { pushToast, denyAccess } = useUIStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const size = 10;
  
  // Modal state
  const [selectedCheque, setSelectedCheque] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [estadoEdit, setEstadoEdit] = useState('');
  const [entregadoAEdit, setEntregadoAEdit] = useState('');
  const [fechaEntregaEdit, setFechaEntregaEdit] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['cheques', { page, size }],
    queryFn: async () => {
      try {
        return await chequesApi.getAll(page, size);
      } catch (err) {
        if (err.response?.status === 403) denyAccess();
        throw err;
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => chequesApi.update(id, payload),
    onSuccess: () => {
      pushToast('success', 'Cheque actualizado exitosamente');
      queryClient.invalidateQueries(['cheques']);
      setIsModalOpen(false);
    },
    onError: () => {
      pushToast('error', 'Error al actualizar el cheque');
    }
  });

  const openModal = (cheque) => {
    setSelectedCheque(cheque);
    setEstadoEdit(cheque.estado);
    setEntregadoAEdit(cheque.entregadoA || '');
    setFechaEntregaEdit(cheque.fechaEntrega || '');
    setIsModalOpen(true);
  };

  const handleUpdate = () => {
    if (estadoEdit === 'ENTREGADO' && !entregadoAEdit) {
      return pushToast('error', 'Debe indicar a quién fue entregado el cheque.');
    }

    const payload = {
      estado: estadoEdit,
      entregadoA: estadoEdit === 'ENTREGADO' ? entregadoAEdit : null,
      fechaEntrega: estadoEdit === 'ENTREGADO' ? fechaEntregaEdit : null
    };

    updateMutation.mutate({ id: selectedCheque.id, payload });
  };

  if (error && !data) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-emerald-600" />
          Cartera de Cheques
        </h1>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Cargando cartera de cheques...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha / Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banco / N° Serie</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cobro</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.content?.map((cheque) => (
                    <tr key={cheque.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-semibold">{cheque.clienteNombre || 'Suelto'}</div>
                        <div className="text-xs text-gray-500">{new Date(cheque.fechaRecepcion).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{cheque.banco || '-'}</div>
                        <div className="text-xs text-gray-500">{cheque.numeroSerie ? `N° ${cheque.numeroSerie}` : '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cheque.fechaCobro ? new Date(cheque.fechaCobro).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">
                        ${cheque.monto.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          cheque.estado === 'EN_CARTERA' ? 'bg-amber-100 text-amber-800' : 
                          cheque.estado === 'COBRADO' ? 'bg-blue-100 text-blue-800' :
                          cheque.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cheque.estado.replace('_', ' ')}
                        </span>
                        {cheque.estado === 'ENTREGADO' && cheque.entregadoA && (
                          <div className="text-[10px] text-gray-500 mt-1 uppercase truncate max-w-[100px] mx-auto">
                            a: {cheque.entregadoA}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => openModal(cheque)}
                          className="text-emerald-600 hover:text-emerald-900 p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data?.content?.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                        No se encontraron cheques.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {data?.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 bg-white border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-500">
                  Mostrando página <span className="font-bold text-gray-900">{data.number + 1}</span> de <span className="font-bold text-gray-900">{data.totalPages}</span>
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={data.first}
                    className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={data.last}
                    className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Edición de Cheque */}
      {isModalOpen && selectedCheque && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Actualizar Cheque</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-2 text-sm">
              <p><span className="text-gray-500">Banco:</span> <span className="font-semibold text-gray-900">{selectedCheque.banco || '-'}</span></p>
              <p><span className="text-gray-500">Monto:</span> <span className="font-bold text-emerald-700">${selectedCheque.monto.toFixed(2)}</span></p>
              <p><span className="text-gray-500">Cliente:</span> <span className="font-semibold text-gray-900">{selectedCheque.clienteNombre}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                <select
                  value={estadoEdit}
                  onChange={(e) => setEstadoEdit(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                >
                  <option value="EN_CARTERA">EN CARTERA</option>
                  <option value="COBRADO">COBRADO</option>
                  <option value="ENTREGADO">ENTREGADO (Endosado)</option>
                  <option value="RECHAZADO">RECHAZADO</option>
                </select>
              </div>

              {estadoEdit === 'ENTREGADO' && (
                <div className="space-y-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Entregado A (Proveedor/Tercero)</label>
                    <input
                      type="text"
                      value={entregadoAEdit}
                      onChange={(e) => setEntregadoAEdit(e.target.value)}
                      placeholder="Ej: Macetas Plásticas S.A."
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Entrega</label>
                    <input
                      type="date"
                      value={fechaEntregaEdit}
                      onChange={(e) => setFechaEntregaEdit(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl border border-transparent transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
