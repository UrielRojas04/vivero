import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Leaf } from 'lucide-react';
import { variedadesPlantasApi } from '../api/variedades-plantas.api';
import { useUIStore } from '../store/useUIStore';
import VariedadPlantaForm from '../components/VariedadPlantaForm';

export default function VariedadesPlantas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVariedad, setSelectedVariedad] = useState(null);
  
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();

  const { data: variedades = [], isLoading } = useQuery({
    queryKey: ['variedades-plantas'],
    queryFn: async () => {
      const res = await variedadesPlantasApi.getAll();
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => variedadesPlantasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variedades-plantas'] });
      pushToast('success', 'Variedad eliminada con éxito');
    },
    onError: () => pushToast('error', 'Error al eliminar variedad')
  });

  const handleEdit = (variedad) => {
    setSelectedVariedad(variedad);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro que desea eliminar esta variedad?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setSelectedVariedad(null);
    setIsModalOpen(false);
  };

  if (isLoading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <Leaf size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Variedades de Plantas</h1>
            <p className="text-gray-500 text-sm mt-1">Gestione las plantas que se cultivan</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm cursor-pointer font-medium"
        >
          <Plus size={20} />
          Nueva Variedad
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Días de Crecimiento</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {variedades.map((variedad) => (
              <tr key={variedad.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {variedad.nombre}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {variedad.descripcion || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {variedad.diasCrecimiento} días
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(variedad)}
                    className="text-blue-600 hover:text-blue-900 mx-2 p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(variedad.id)}
                    className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {variedades.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                  No hay variedades registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <VariedadPlantaForm
          variedad={selectedVariedad}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
