import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import InsumoForm from '../components/InsumoForm';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { getErrorMessage } from '../utils/errorMessage';
import { Plus, Edit2, Trash2, Search, Loader2, AlertCircle, Wrench, PackageSearch } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const Insumos = () => {
  const { pushToast, denyAccess, askConfirm } = useUIStore();
  const { unidadNegocioActiva } = useAuthStore();
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  
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
      queryClient.invalidateQueries({ queryKey: ['abono', 'liquidacion'] });
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
      queryClient.invalidateQueries({ queryKey: ['abono', 'liquidacion'] });
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
            <h1 className="text-xl sm:text-2xl font-bold text-ink">Catálogo de Insumos</h1>
            <Wrench className="w-5 h-5 text-accent animate-pulse hidden sm:block" />
          </div>
          {unidadNegocioActiva !== '3' && (
            <p className="mt-1 text-sm text-muted">Gestión de sustratos, herramientas y macetas.</p>
          )}
        </div>

        <button
          onClick={() => {
            setSelectedInsumo(null);
            setIsFormOpen(true);
          }}
          className="flex w-full sm:w-auto items-center justify-center gap-2 bg-accent hover:brightness-95 text-paper font-semibold px-5 py-3 sm:py-2.5 rounded-base transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nuevo Insumo
        </button>
      </div>

      {/* Search and Feedback Area */}
      <div className="bg-paper rounded-panel border border-line p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 h-5 text-faint" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-2 border border-line rounded-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-canvas/50 transition-all text-base sm:text-sm"
          />
        </div>

        <div className="text-sm text-muted font-medium hidden sm:block">
          Total: <span className="text-ink font-semibold font-mono tabular-nums">{filteredInsumos.length}</span> insumos
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="bg-danger-bg border border-danger-line rounded-panel p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-danger-ink">Error de Acceso</h3>
            <p className="mt-1 text-sm text-danger">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-paper rounded-panel border border-line p-12 sm:p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
          <p className="text-sm font-medium text-muted">Cargando inventario de insumos...</p>
        </div>
      ) : filteredInsumos.length === 0 ? (
        <div className="bg-paper rounded-panel border border-line p-12 sm:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-canvas rounded-full flex items-center justify-center mb-4 border border-line">
            {searchTerm ? <Search className="w-8 h-8 text-faint" /> : <PackageSearch className="w-8 h-8 text-faint" />}
          </div>
          <h3 className="text-lg font-semibold text-ink">
            {searchTerm ? 'No se encontraron resultados' : 'El catálogo está vacío'}
          </h3>
          <p className="mt-2 text-sm text-muted max-w-sm">
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
              className="mt-6 px-4 py-2 bg-accent-soft hover:brightness-95 text-accent-ink font-semibold rounded-base text-sm transition-colors cursor-pointer"
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
              <div key={insumo.id} className="bg-paper border border-line rounded-panel p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-soft text-accent-ink rounded-base flex items-center justify-center font-semibold shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink text-base leading-tight">{insumo.nombre}</h3>
                      <p className="text-sm font-semibold text-ink mt-0.5 font-mono tabular-nums">
                        ${insumo.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-base text-xs font-semibold shrink-0 font-mono tabular-nums ${
                    insumo.stock === 0
                      ? 'bg-danger-bg text-danger-ink border border-danger-line'
                      : insumo.stock <= 5
                        ? 'bg-warn-bg text-warn-ink border border-warn-line'
                        : 'bg-ok-bg text-ok-ink border border-ok-line'
                  }`}>
                    Stock: {insumo.stock}
                  </span>
                </div>

                {insumo.descripcion && (
                  <p className="text-sm text-muted line-clamp-2 leading-snug">
                    {insumo.descripcion}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line mt-1">
                  <button
                    onClick={() => {
                      setSelectedInsumo(insumo);
                      setIsFormOpen(true);
                    }}
                    className="flex-1 py-2 bg-canvas hover:bg-thead text-body font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 border border-line"
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
                    className="flex-1 py-2 bg-danger-bg hover:brightness-95 text-danger-ink font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 border border-danger-line"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW: Table Layout */}
          <div className="hidden sm:block bg-paper rounded-panel border border-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-thead border-b border-line">
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Insumo</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Descripción</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredInsumos.map((insumo) => (
                    <tr key={insumo.id} className="hover:bg-canvas transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-accent-soft text-accent-ink rounded-base flex items-center justify-center font-semibold">
                            <Wrench className="w-4.5 h-4.5" />
                          </div>
                          <span className="font-semibold text-ink text-sm">{insumo.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted max-w-md truncate" title={insumo.descripcion}>
                          {insumo.descripcion || <span className="text-faint italic">Sin descripción</span>}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-ink font-mono tabular-nums">
                          ${insumo.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono tabular-nums ${
                          insumo.stock === 0
                            ? 'bg-danger-bg text-danger-ink'
                            : insumo.stock <= 5
                              ? 'bg-warn-bg text-warn-ink'
                              : 'bg-ok-bg text-ok-ink'
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
                            className="p-1.5 hover:bg-canvas text-body hover:text-accent-ink rounded-base transition-colors cursor-pointer"
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
                            className="p-1.5 hover:bg-danger-bg text-body hover:text-danger rounded-base transition-colors cursor-pointer"
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
