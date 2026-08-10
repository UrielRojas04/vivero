import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import InsumoForm from '../components/InsumoForm';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import { Plus, Edit2, Trash2, Search, Loader2, AlertCircle, Wrench, PackageSearch } from 'lucide-react';

const Insumos = () => {
  const { pushToast, denyAccess, askConfirm } = useUIStore();
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState(null);

  const fetchInsumos = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/insumos');
      setInsumos(response.data || []);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        setError('No tienes permisos suficientes para ver el catálogo de insumos (requiere LEER_INSUMOS).');
      } else {
        setError('Ocurrió un error al cargar los insumos. Por favor, reintente.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsumos();
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (selectedInsumo) {
        await api.put(`/insumos/${selectedInsumo.id}`, formData);
      } else {
        await api.post('/insumos', formData);
      }
      setIsFormOpen(false);
      setSelectedInsumo(null);
      fetchInsumos();
      pushToast('success', 'Insumo guardado correctamente.');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        denyAccess('No tienes permisos para modificar el stock de insumos (requiere ESCRIBIR_INSUMOS).');
      } else {
        pushToast('error', getErrorMessage(err, 'Ocurrió un error al guardar el insumo. Verifica los datos.'));
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/insumos/${id}`);
      fetchInsumos();
      pushToast('success', 'Insumo eliminado.');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        denyAccess('No tienes permisos para eliminar insumos (requiere ESCRIBIR_INSUMOS).');
      } else {
        pushToast('error', getErrorMessage(err, 'Ocurrió un error al eliminar el insumo.'));
      }
    }
  };

  const filteredInsumos = insumos.filter((i) =>
    i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.descripcion && i.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Catálogo de Insumos</h1>
            <Wrench className="w-5 h-5 text-sky-500 animate-pulse hidden sm:block" />
          </div>
          <p className="mt-1 text-sm text-gray-500">Gestión de sustratos, herramientas y macetas.</p>
        </div>
        
        <button
          onClick={() => {
            setSelectedInsumo(null);
            setIsFormOpen(true);
          }}
          className="flex w-full sm:w-auto items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-5 py-3 sm:py-2.5 rounded-xl shadow-lg shadow-sky-600/10 hover:shadow-sky-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nuevo Insumo
        </button>
      </div>

      {/* Search and Feedback Area */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 h-5 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-gray-50/50 transition-all text-base sm:text-sm"
          />
        </div>

        <div className="text-sm text-gray-500 font-medium hidden sm:block">
          Total: <span className="text-gray-900 font-semibold">{filteredInsumos.length}</span> insumos
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800">Error de Acceso</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 sm:p-16 flex flex-col items-center justify-center gap-3 shadow-sm">
          <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Cargando inventario de insumos...</p>
        </div>
      ) : filteredInsumos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 sm:p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
            {searchTerm ? <Search className="w-8 h-8 text-gray-400" /> : <PackageSearch className="w-8 h-8 text-gray-400" />}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {searchTerm ? 'No se encontraron resultados' : 'El catálogo está vacío'}
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            {searchTerm 
              ? 'Prueba modificando los términos de búsqueda.'
              : 'Comienza agregando tu primer insumo al vivero.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setSelectedInsumo(null);
                setIsFormOpen(true);
              }}
              className="mt-6 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold rounded-xl text-sm transition-colors border border-sky-100 cursor-pointer"
            >
              Crear primer insumo
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Cards Layout */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {filteredInsumos.map((insumo) => (
              <div key={insumo.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-semibold shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base leading-tight">{insumo.nombre}</h3>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        ${insumo.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold shrink-0 ${
                    insumo.stock === 0 
                      ? 'bg-red-50 text-red-700 border border-red-100' 
                      : insumo.stock <= 5 
                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    Stock: {insumo.stock}
                  </span>
                </div>
                
                {insumo.descripcion && (
                  <p className="text-sm text-gray-500 line-clamp-2 leading-snug">
                    {insumo.descripcion}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 mt-1">
                  <button
                    onClick={() => {
                      setSelectedInsumo(insumo);
                      setIsFormOpen(true);
                    }}
                    className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() =>
                      askConfirm({
                        title: '¿Confirmar Eliminación?',
                        message: 'Esta acción no se puede deshacer. Se removerá el insumo permanentemente.',
                        variant: 'danger',
                        confirmLabel: 'Eliminar Insumo',
                        onConfirm: () => handleDelete(insumo.id),
                      })
                    }
                    className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW: Table Layout */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Insumo</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInsumos.map((insumo) => (
                    <tr key={insumo.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center font-semibold">
                            <Wrench className="w-4.5 h-4.5" />
                          </div>
                          <span className="font-semibold text-gray-900 text-sm">{insumo.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500 max-w-md truncate" title={insumo.descripcion}>
                          {insumo.descripcion || <span className="text-gray-300 italic">Sin descripción</span>}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          ${insumo.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          insumo.stock === 0 
                            ? 'bg-red-50 text-red-700' 
                            : insumo.stock <= 5 
                              ? 'bg-yellow-50 text-yellow-700' 
                              : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {insumo.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedInsumo(insumo);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 text-gray-600 hover:text-sky-600 rounded-lg transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() =>
                              askConfirm({
                                title: '¿Confirmar Eliminación?',
                                message: 'Esta acción no se puede deshacer. Se removerá el insumo permanentemente.',
                                variant: 'danger',
                                confirmLabel: 'Eliminar Insumo',
                                onConfirm: () => handleDelete(insumo.id),
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

      {/* Reuse Form Modal Component */}
      <InsumoForm
        isOpen={isFormOpen}
        insumo={selectedInsumo}
        onSave={handleCreateOrUpdate}
        onCancel={() => {
          setIsFormOpen(false);
          setSelectedInsumo(null);
        }}
      />
    </div>
  );
};

export default Insumos;
