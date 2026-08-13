import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marcasApi } from '../api/marcas.api';
import { useUIStore } from '../store/useUIStore';
import { Tag, Plus, Edit2, Trash2, Loader2, Save, X } from 'lucide-react';

const ConfiguracionMarcas = () => {
  const { pushToast, askConfirm } = useUIStore();
  const queryClient = useQueryClient();
  
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState('');

  const { data: marcas = [], isLoading } = useQuery({
    queryKey: ['marcas'],
    queryFn: marcasApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (nombre) => marcasApi.create({ nombre }),
    onSuccess: () => {
      queryClient.invalidateQueries(['marcas']);
      setNuevaMarca('');
      pushToast('success', 'Marca creada exitosamente');
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al crear marca';
      pushToast('error', msg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, nombre }) => marcasApi.update(id, { nombre }),
    onSuccess: () => {
      queryClient.invalidateQueries(['marcas']);
      setEditingId(null);
      pushToast('success', 'Marca actualizada');
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al actualizar marca';
      pushToast('error', msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => marcasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['marcas']);
      pushToast('success', 'Marca eliminada');
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al eliminar marca';
      pushToast('error', msg);
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!nuevaMarca.trim()) return;
    createMutation.mutate(nuevaMarca.trim());
  };

  const handleUpdate = (e, id) => {
    e.preventDefault();
    if (!editNombre.trim()) return;
    updateMutation.mutate({ id, nombre: editNombre.trim() });
  };

  const handleDelete = (id) => {
    askConfirm({
      title: 'Eliminar Marca',
      message: '¿Estás seguro de eliminar esta marca? No se borrarán los productos existentes, pero ya no podrán seleccionarla.',
      variant: 'danger',
      onConfirm: () => deleteMutation.mutate(id)
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-gray-500 font-medium">Cargando marcas...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Tag className="w-5 h-5 text-emerald-600" />
          Marcas Disponibles
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona las marcas que aparecerán en los filtros y en la creación de herramientas.
        </p>
      </div>

      <div className="p-6">
        <form onSubmit={handleCreate} className="flex gap-3 mb-6">
          <input
            type="text"
            value={nuevaMarca}
            onChange={(e) => setNuevaMarca(e.target.value)}
            placeholder="Nueva marca (ej. Total, Ingco)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!nuevaMarca.trim() || createMutation.isPending}
            className="px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </form>

        <div className="space-y-3">
          {marcas.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No hay marcas cargadas. Agrega tu primera marca arriba.
            </div>
          ) : (
            marcas.map(marca => (
              <div key={marca.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all group">
                {editingId === marca.id ? (
                  <form onSubmit={(e) => handleUpdate(e, marca.id)} className="flex items-center gap-3 w-full">
                    <input
                      type="text"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                      </button>
                      <button type="submit" disabled={!editNombre.trim()} className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg">
                        <Save className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className="font-medium text-gray-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-500" />
                      {marca.nombre}
                      {marca.enUso && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-bold uppercase tracking-wider ml-2">
                          En Uso
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(marca.id);
                          setEditNombre(marca.nombre);
                        }}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(marca.id)}
                        disabled={marca.enUso}
                        className={`p-2 rounded-lg transition-colors ${
                          marca.enUso 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={marca.enUso ? "No se puede eliminar una marca en uso" : "Eliminar"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionMarcas;
