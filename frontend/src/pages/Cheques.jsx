import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../store/useUIStore';
import { chequesApi } from '../api/cheques.api';
import { clientesApi } from '../api/clientes.api';
import { Briefcase, CreditCard, ChevronLeft, ChevronRight, Edit3, X, Check, Plus, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NuevoChequeModal from '../components/NuevoChequeModal';
import ChequeEstadoModal from '../components/ChequeEstadoModal';
import { describirEstadoCheque, describirVencimientoCheque, describirOrigenCheque } from '../utils/chequeDisplay';

export default function Cheques() {
  const { pushToast, denyAccess, askConfirm } = useUIStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const size = 10;
  
  // Modal state
  const [selectedCheque, setSelectedCheque] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNuevoModalOpen, setIsNuevoModalOpen] = useState(false);

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


  const openModal = (cheque) => {
    setSelectedCheque(cheque);
    setIsModalOpen(true);
  };

  if (error && !data) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-emerald-600" />
          Cartera de Cheques
        </h1>
        <button
          onClick={() => setIsNuevoModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cheque
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Cargando cartera de cheques...</p>
          </div>
        ) : (
          <>
            {/* Tarjetas mobile */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {data?.content?.map((cheque) => {
                const { etiqueta, tono, editable } = describirEstadoCheque(cheque);
                const vencimiento = cheque.estado === 'EN_CARTERA' ? describirVencimientoCheque(cheque.fechaCobro) : null;
                return (
                  <div key={cheque.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">
                          {cheque.monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                        </p>
                        {vencimiento ? (
                          <p className={`text-xs font-semibold mt-1 ${vencimiento.tono.texto}`}>{vencimiento.etiqueta}</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">
                            {cheque.fechaCobro ? new Date(cheque.fechaCobro).toLocaleDateString() : '-'}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${tono.chip}`}>
                        {etiqueta}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">{cheque.clienteNombre || 'Suelto'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold ${describirOrigenCheque(cheque).tono.chip}`}>
                          {describirOrigenCheque(cheque).etiqueta}
                        </span>
                      </div>
                      <div>Banco: {cheque.banco || '-'}</div>
                      <div>{cheque.numeroSerie ? `N° ${cheque.numeroSerie}` : 'N° -'}</div>
                      <div>Recibido: {new Date(cheque.fechaRecepcion).toLocaleDateString()}</div>
                      {cheque.estado === 'ENTREGADO' && cheque.entregadoA && (
                        <div className="uppercase font-medium truncate" title={cheque.entregadoA}>a: {cheque.entregadoA}</div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100">
                      {editable ? (
                        <button
                          onClick={() => openModal(cheque)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer font-semibold text-sm"
                        >
                          <Edit3 className="w-4 h-4" />
                          Actualizar Estado
                        </button>
                      ) : (
                        <p className="text-center text-gray-400 text-[10px] uppercase font-bold tracking-wide py-2">Bloqueado</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {data?.content?.length === 0 && (
                <div className="px-6 py-10 text-center text-gray-500 bg-white border border-gray-200 rounded-2xl">
                  No se encontraron cheques.
                </div>
              )}
            </div>

            {/* Tabla desktop */}
            <div className="hidden md:block">
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
                    {data?.content?.map((cheque) => {
                      const { etiqueta, tono, editable } = describirEstadoCheque(cheque);
                      return (
                        <tr key={cheque.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-semibold flex items-center gap-2">
                              {cheque.clienteNombre || 'Suelto'}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold ${describirOrigenCheque(cheque).tono.chip}`}>
                                {describirOrigenCheque(cheque).etiqueta}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{new Date(cheque.fechaRecepcion).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{cheque.banco || '-'}</div>
                            <div className="text-xs text-gray-500">{cheque.numeroSerie ? `N° ${cheque.numeroSerie}` : '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {cheque.fechaCobro ? new Date(cheque.fechaCobro).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 text-right">
                            {cheque.monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase ${tono.chip}`}>
                              {etiqueta}
                            </span>
                            {cheque.estado === 'ENTREGADO' && cheque.entregadoA && (
                              <div className="text-[10px] text-gray-500 mt-1 uppercase truncate max-w-[150px] mx-auto font-medium" title={cheque.entregadoA}>
                                a: {cheque.entregadoA}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            {editable ? (
                              <button
                                onClick={() => openModal(cheque)}
                                className="text-emerald-600 hover:text-emerald-900 p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Editar estado"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wide">Bloqueado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
      <ChequeEstadoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cheque={selectedCheque}
      />

      {/* Modal Nuevo Cheque */}
      <NuevoChequeModal
        isOpen={isNuevoModalOpen}
        onClose={() => setIsNuevoModalOpen(false)}
      />

    </div>
  );
}
