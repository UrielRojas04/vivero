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
  const { pushToast, pushConfirm } = useUIStore();

  const getRangoDias = (variedad) => {
    const values = [
      variedad.diasEnero, variedad.diasFebrero, variedad.diasMarzo, variedad.diasAbril,
      variedad.diasMayo, variedad.diasJunio, variedad.diasJulio, variedad.diasAgosto,
      variedad.diasSeptiembre, variedad.diasOctubre, variedad.diasNoviembre, variedad.diasDiciembre
    ].filter(v => v != null);
    
    if (values.length === 0) return '-';
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? `${min} días` : `${min}-${max} días`;
  };

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
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al eliminar variedad';
      pushToast('error', msg);
    }
  });

  const handleEdit = (variedad) => {
    setSelectedVariedad(variedad);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    pushConfirm({
      title: 'Eliminar Variedad',
      message: '¿Está seguro que desea eliminar esta variedad de planta? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      onConfirm: () => deleteMutation.mutate(id)
    });
  };

  const handleCloseModal = () => {
    setSelectedVariedad(null);
    setIsModalOpen(false);
  };

  if (isLoading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-end mb-2">
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
                    {getRangoDias(variedad)}
                  </span>
                  {variedad.enUso && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title="No se puede eliminar porque está siendo utilizada en siembras">
                      EN USO
                    </span>
                  )}
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
                    disabled={variedad.enUso}
                    className={`p-2 rounded-lg transition-colors ${
                      variedad.enUso 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-red-600 hover:text-red-900 hover:bg-red-50 cursor-pointer'
                    }`}
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
