import React, { useState, useEffect } from 'react';
import { X, History } from 'lucide-react';
import api from '../api/axios';
import { useUIStore } from '../store/useUIStore';
import { describirTipoMovimiento, describirDetalleMovimiento } from '../utils/bandejasDisplay';

const HistorialBandejasModal = ({ isOpen, onClose, cliente }) => {
  const { pushToast } = useUIStore();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && cliente) {
      const fetchHistorial = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/clientes/${cliente.id}/bandejas/historial`);
          setHistorial(response.data);
        } catch (error) {
          pushToast('error', 'Error al cargar el historial de bandejas');
        } finally {
          setLoading(false);
        }
      };
      fetchHistorial();
    }
  }, [isOpen, cliente, pushToast]);

  if (!isOpen || !cliente) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full h-full sm:h-auto max-w-4xl rounded-none sm:rounded-2xl overflow-hidden shadow-xl animate-fade-in-up max-h-screen sm:max-h-[90vh] flex flex-col">
        <div className="flex-none flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Historial de Bandejas</h2>
              <p className="text-sm text-gray-500">{cliente.nombreRazonSocial}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-0 overflow-y-auto flex-1 bg-gray-50/50">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
          ) : historial.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No hay movimientos registrados para este cliente.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
                {historial.map((mov) => {
                  const tipoInfo = describirTipoMovimiento(mov.tipo);
                  const detalleInfo = describirDetalleMovimiento(mov);
                  return (
                    <div key={mov.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${tipoInfo.tono.chip}`}>
                          {tipoInfo.etiqueta}
                        </span>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{mov.cantidad}</p>
                          <p className="text-xs text-gray-500">bandejas</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        <p>
                          {new Date(mov.fecha).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p>{detalleInfo.etiqueta}</p>
                        <p>por: {mov.usuarioNombre || '-'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider sticky top-0">
                      <th className="p-4 font-semibold">Fecha</th>
                      <th className="p-4 font-semibold">Tipo</th>
                      <th className="p-4 font-semibold text-right">Cantidad</th>
                      <th className="p-4 font-semibold text-center">Detalle</th>
                      <th className="p-4 font-semibold text-right">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {historial.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(mov.fecha).toLocaleString('es-AR')}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${describirTipoMovimiento(mov.tipo).tono.chip}`}>
                            {describirTipoMovimiento(mov.tipo).etiqueta}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-gray-900">
                          {mov.cantidad}
                        </td>
                        <td className="p-4 text-center text-sm text-gray-500 whitespace-nowrap">
                          {describirDetalleMovimiento(mov).etiqueta}
                        </td>
                        <td className="p-4 text-right text-sm text-gray-500 whitespace-nowrap">
                          {mov.usuarioNombre}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorialBandejasModal;
