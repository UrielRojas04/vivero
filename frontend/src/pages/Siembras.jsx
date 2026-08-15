import React, { useState, useEffect } from 'react';
import { siembrasApi } from '../api/siembras.api';
import SiembraForm from '../components/SiembraForm';
import FinalizarSiembraModal from '../components/FinalizarSiembraModal';
import PaseStockModal from '../components/PaseStockModal';
import ConversorBandejas from '../components/ConversorBandejas';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import { Plus, Edit2, Trash2, Search, Loader2, AlertCircle, Inbox, Sprout, CheckCircle2, PackagePlus } from 'lucide-react';

const Siembras = () => {
  const { pushToast, denyAccess, askConfirm } = useUIStore();
  const [siembras, setSiembras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConversor, setShowConversor] = useState(false);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSiembra, setSelectedSiembra] = useState(null);
  
  // Finalizar Modal states (Old workflow)
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false);
  const [siembraToFinalizar, setSiembraToFinalizar] = useState(null);

  // Pasar a Stock Modal states (New workflow)
  const [isPaseStockOpen, setIsPaseStockOpen] = useState(false);
  const [siembraToPaseStock, setSiembraToPaseStock] = useState(null);

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
      pushToast('success', 'Siembra finalizada y stock agregado al catálogo.');
    } catch (err) {
      console.error(err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al finalizar la siembra.'));
    }
  };

  const handlePaseStock = async (requestData) => {
    if (!siembraToPaseStock) return;
    try {
      await siembrasApi.pasarAStock(siembraToPaseStock.id, requestData);
      setIsPaseStockOpen(false);
      setSiembraToPaseStock(null);
      fetchSiembras();
      pushToast('success', 'Siembra convertida en producto e ingresada al stock.');
    } catch (err) {
      console.error(err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al pasar la siembra a stock.'));
    }
  };

  const filteredSiembras = siembras.filter((s) => {
    if (s.estado === 'EN_STOCK') return false; // Ocultar las que ya pasaron a stock
    const matchSearch = (s.variedadPlanta?.nombre && s.variedadPlanta.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.dueno && s.dueno.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.numeroLote && s.numeroLote.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSearch;
  });

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'EN_STOCK':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">En Stock</span>;
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
        
        <div className="flex flex-row items-center gap-2 sm:gap-3 relative w-full sm:w-auto">
          <button
            onClick={() => setShowConversor(!showConversor)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer text-sm sm:text-base"
          >
            Conversor
          </button>
          
          {showConversor && (
            <div className="absolute top-full right-0 left-0 sm:left-auto mt-2 z-20">
              <ConversorBandejas />
            </div>
          )}

          <button
            onClick={() => {
              setSelectedSiembra(null);
              setIsFormOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 sm:px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all cursor-pointer text-sm sm:text-base whitespace-nowrap"
          >
            <Plus className="w-5 h-5 hidden sm:block" />
            Nueva Siembra
          </button>
        </div>
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
        <>
          {/* MOBILE VIEW: Cards Layout */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {filteredSiembras.map((siembra) => {
              let progress = 0;
              let diffDays = 0;
              let est = null;
              if (siembra.fechaEstimada) {
                est = new Date(siembra.fechaEstimada);
                const now = new Date();
                const diffTime = est - now;
                diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 0) progress = 100;
                else if (diffDays > 30) progress = 10;
                else progress = Math.max(10, 100 - (diffDays * 3));
              }

              return (
                <div key={siembra.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-semibold shrink-0">
                        <Sprout className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base leading-tight">
                          {siembra.variedadPlanta?.nombre || '-'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Lote: {siembra.numeroLote} • Bandeja: {siembra.variedadBandeja?.nombre || '-'}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(siembra.estado)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 rounded-xl p-3 border border-gray-100 mt-1">
                    <div>
                      <span className="text-gray-500 block text-xs mb-0.5">Dueño</span>
                      <span className="font-medium text-gray-900">{siembra.dueno}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs mb-0.5">Cant. Inicial</span>
                      <span className="font-medium text-gray-900">{siembra.cantidad} u.</span>
                    </div>
                  </div>

                  {est && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-medium text-gray-500">Progreso Estimado</span>
                        <span className="text-xs font-semibold text-gray-700">
                          {est.toLocaleDateString('es-AR')} {diffDays > 0 ? `(${diffDays}d)` : '(Lista)'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 mt-1">
                    {(siembra.estado === 'FINALIZADA' || siembra.estado === 'EN_PROCESO') && (
                      <button
                        onClick={() => {
                          setSiembraToPaseStock(siembra);
                          setIsPaseStockOpen(true);
                        }}
                        className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <PackagePlus className="w-4 h-4" /> Stock
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedSiembra(siembra);
                        setIsFormOpen(true);
                      }}
                      className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" /> Editar
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
                      className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Table Layout */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                      {(() => {
                        if (!siembra.fechaEstimada) return '-';
                        const est = new Date(siembra.fechaEstimada);
                        const now = new Date();
                        const diffTime = est - now;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        let progress = 0;
                        if (diffDays <= 0) progress = 100;
                        else if (diffDays > 30) progress = 10;
                        else progress = Math.max(10, 100 - (diffDays * 3));

                        return (
                          <div className="flex flex-col gap-1 w-32">
                            <span className="text-xs text-gray-600">
                              {est.toLocaleDateString('es-AR')} 
                              {diffDays > 0 ? ` (en ${diffDays} d)` : ' (Lista)'}
                            </span>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-1.5 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(siembra.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {(siembra.estado === 'FINALIZADA' || siembra.estado === 'EN_PROCESO') && (
                          <button
                            onClick={() => {
                              setSiembraToPaseStock(siembra);
                              setIsPaseStockOpen(true);
                            }}
                            className="p-1.5 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="Pasar a Stock"
                          >
                            <PackagePlus className="w-4.5 h-4.5" />
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
        </>
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

      {isPaseStockOpen && (
        <PaseStockModal
          isOpen={isPaseStockOpen}
          siembra={siembraToPaseStock}
          onClose={() => {
            setIsPaseStockOpen(false);
            setSiembraToPaseStock(null);
          }}
          onConfirm={handlePaseStock}
        />
      )}
    </div>
  );
};

export default Siembras;
