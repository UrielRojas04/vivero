import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import * as api from '../api/categoriaAbono.api';
import { useUIStore } from '../store/useUIStore';
import CategoriaAbonoConfigForm from '../components/CategoriaAbonoConfigForm';

export default function ConfiguracionAbonoCategorias() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  
  const queryClient = useQueryClient();
  const { pushToast, askConfirm } = useUIStore();

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias-abono'],
    queryFn: async () => {
      const res = await api.getAllCategoriasAbono();
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteCategoriaAbono(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-abono'] });
      pushToast('success', 'Categoría eliminada con éxito');
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al eliminar categoría';
      pushToast('error', msg);
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createCategoriaAbono(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-abono'] });
      pushToast('success', 'Categoría creada');
      setIsModalOpen(false);
    },
    onError: () => pushToast('error', 'Error al crear la categoría')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateCategoriaAbono(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-abono'] });
      pushToast('success', 'Categoría actualizada');
      setIsModalOpen(false);
    },
    onError: () => pushToast('error', 'Error al actualizar la categoría')
  });

  const handleEdit = (categoria) => {
    setSelectedCategoria(categoria);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    askConfirm({
      title: 'Eliminar Categoría',
      message: '¿Está seguro que desea eliminar esta categoría? Si hay productos usándola, podría fallar.',
      variant: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: () => deleteMutation.mutate(id)
    });
  };

  const handleSubmit = (formData) => {
    if (selectedCategoria) {
      updateMutation.mutate({ id: selectedCategoria.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) return <div className="p-6 text-muted">Cargando...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => { setSelectedCategoria(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-paper rounded-base hover:brightness-95 transition-colors cursor-pointer font-medium"
        >
          <Plus size={20} />
          Nueva Categoría
        </button>
      </div>

      {categorias.length === 0 ? (
        <div className="bg-paper rounded-panel border border-line p-12 flex flex-col items-center justify-center text-center">
          <Package className="w-12 h-12 text-faint mb-4" />
          <p className="text-muted">No hay categorías de abono registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categorias.map((categoria) => (
            <div key={categoria.id} className="bg-paper border border-line rounded-panel p-5 flex flex-col justify-between hover:border-accent/50 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-ink text-lg">{categoria.nombre}</h3>
                  <div className="w-8 h-8 bg-accent-soft text-accent-ink rounded-full flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                {categoria.descripcion && (
                  <p className="text-sm text-muted line-clamp-2">{categoria.descripcion}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line">
                <button
                  onClick={() => handleEdit(categoria)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-canvas text-ink hover:text-accent font-medium rounded-lg transition-colors tooltip-trigger"
                  title="Editar"
                >
                  <Edit2 size={16} />
                  <span className="text-sm">Editar</span>
                </button>
                <button
                  onClick={() => handleDelete(categoria.id)}
                  className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors tooltip-trigger"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <CategoriaAbonoConfigForm
          categoria={selectedCategoria}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
