import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, LayoutDashboard } from 'lucide-react';
import { variedadesBandejasApi } from '../api/variedades-bandejas.api';
import { useUIStore } from '../store/useUIStore';
import VariedadBandejaForm from '../components/VariedadBandejaForm';

export default function VariedadesBandejas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBandeja, setSelectedBandeja] = useState(null);
  
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();

  const { data: bandejas = [], isLoading } = useQuery({
    queryKey: ['variedades-bandejas'],
    queryFn: async () => {
      const res = await variedadesBandejasApi.getAll();
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => variedadesBandejasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variedades-bandejas'] });
      pushToast('success', 'Bandeja eliminada con éxito');
    },
    onError: () => pushToast('error', 'Error al eliminar bandeja')
  });

  const handleEdit = (bandeja) => {
    setSelectedBandeja(bandeja);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro que desea eliminar este tipo de bandeja?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setSelectedBandeja(null);
    setIsModalOpen(false);
  };

  if (isLoading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tipos de Bandejas</h1>
            <p className="text-gray-500 text-sm mt-1">Gestione los modelos y su capacidad</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm cursor-pointer font-medium"
        >
          <Plus size={20} />
          Nuevo Tipo
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad de Celdas</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {bandejas.map((bandeja) => (
              <tr key={bandeja.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {bandeja.nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {bandeja.cantidadCeldas} celdas
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(bandeja)}
                    className="text-blue-600 hover:text-blue-900 mx-2 p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(bandeja.id)}
                    className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {bandejas.length === 0 && (
              <tr>
                <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                  No hay tipos de bandejas registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <VariedadBandejaForm
          bandeja={selectedBandeja}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
