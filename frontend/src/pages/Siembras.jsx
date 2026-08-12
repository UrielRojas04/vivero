import React, { useState, useEffect } from 'react';
import { siembrasApi } from '../api/siembras.api';
import SiembraForm from '../components/SiembraForm';
import FinalizarSiembraModal from '../components/FinalizarSiembraModal';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import { Plus, Edit2, Trash2, Search, Loader2, AlertCircle, Inbox, Sprout, CheckCircle2 } from 'lucide-react';

const Siembras = () => {
  const { pushToast, denyAccess, askConfirm } = useUIStore();
  const [siembras, setSiembras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSiembra, setSelectedSiembra] = useState(null);
  
  // Finalizar Modal states
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false);
  const [siembraToFinalizar, setSiembraToFinalizar] = useState(null);

  const fetchSiembras = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await siembrasApi.getAll();
      setSiembras(response.data || []);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        setError('No tienes permisos suficientes para ver las siembras.');
      } else {
        setError('Ocurrió un error al cargar las siembras.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiembras();
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (selectedSiembra) {
        await siembrasApi.update(selectedSiembra.id, formData);
      } else {
        await siembrasApi.create(formData);
      }
      setIsFormOpen(false);
      setSelectedSiembra(null);
      fetchSiembras();
      pushToast('success', 'Siembra guardada correctamente.');
    } catch (err) {
      console.error(err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al guardar la siembra.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await siembrasApi.delete(id);
      fetchSiembras();
      pushToast('success', 'Siembra eliminada.');
    } catch (err) {
      console.error(err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al eliminar la siembra.'));
    }
  };

  const handleFinalizar = async (idProducto, cantidad) => {
    if (!siembraToFinalizar) return;
    try {
      await siembrasApi.finalizar(siembraToFinalizar.id, idProducto, cantidad);
      setIsFinalizarOpen(false);
      setSiembraToFinalizar(null);
      fetchSiembras();
      pushToast('success', 'Siembra finalizada y stock ingresado al catálogo.');
    } catch (err) {
      console.error(err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al finalizar la siembra.'));
    }
  };

  const filteredSiembras = siembras.filter((s) =>
    (s.variedadPlanta?.nombre && s.variedadPlanta.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.dueno && s.dueno.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.numeroLote && s.numeroLote.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'FINALIZADA':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Finalizada</span>;
      case 'EN_PROCESO':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">En Proceso</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Siembras</h1>
            <Sprout className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="mt-1 text-sm text-gray-500">Administra los lotes en cultivo y su traspaso al catálogo.</p>
        </div>
        
        <button
          onClick={() => {
            setSelectedSiembra(null);
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nueva Siembra
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 h-5 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar por variedad, lote o dueño..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/50 transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center gap-3 shadow-sm">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        </div>
      ) : filteredSiembras.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <Inbox className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No hay siembras</h3>
          <p className="mt-2 text-sm text-gray-500">Comienza registrando un nuevo lote en cultivo.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Variedad / Lote</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dueño</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cant. Inicial</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entrega Est.</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSiembras.map((siembra) => (
                  <tr key={siembra.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{siembra.variedadPlanta?.nombre || '-'}</div>
                      <div className="text-xs text-gray-500">Lote: {siembra.numeroLote} | Bandeja: {siembra.variedadBandeja?.nombre || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {siembra.dueno}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {siembra.cantidad} u.
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {siembra.fechaEstimada ? new Date(siembra.fechaEstimada).toLocaleDateString('es-AR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(siembra.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {siembra.estado === 'EN_PROCESO' && (
                          <button
                            onClick={() => {
                              setSiembraToFinalizar(siembra);
                              setIsFinalizarOpen(true);
                            }}
                            className="p-1.5 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                            title="Lista para entregar"
                          >
                            <CheckCircle2 className="w-4.5 h-4.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSiembra(siembra);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 text-gray-600 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() =>
                            askConfirm({
                              title: '¿Eliminar siembra?',
                              message: 'Esta acción no se puede deshacer.',
                              variant: 'danger',
                              confirmLabel: 'Eliminar',
                              onConfirm: () => handleDelete(siembra.id),
                            })
                          }
                          className="p-1.5 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isFormOpen && (
        <SiembraForm
          isOpen={isFormOpen}
          siembra={selectedSiembra}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setIsFormOpen(false);
            setSelectedSiembra(null);
          }}
        />
      )}

      {isFinalizarOpen && (
        <FinalizarSiembraModal
          isOpen={isFinalizarOpen}
          siembra={siembraToFinalizar}
          onFinalizar={handleFinalizar}
          onCancel={() => {
            setIsFinalizarOpen(false);
            setSiembraToFinalizar(null);
          }}
        />
      )}
    </div>
  );
};

export default Siembras;
