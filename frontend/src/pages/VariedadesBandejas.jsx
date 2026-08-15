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
  const { pushToast, askConfirm } = useUIStore();

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
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al eliminar bandeja';
      pushToast('error', msg);
    }
  });

  const handleEdit = (bandeja) => {
    setSelectedBandeja(bandeja);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    askConfirm({
      title: 'Eliminar Bandeja',
      message: '¿Está seguro que desea eliminar este tipo de bandeja? Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: () => deleteMutation.mutate(id)
    });
  };

  const handleCloseModal = () => {
    setSelectedBandeja(null);
    setIsModalOpen(false);
  };

  if (isLoading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm cursor-pointer font-medium"
        >
          <Plus size={20} />
          Nuevo Tipo
        </button>
      </div>

      {bandejas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
          <LayoutDashboard className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500">No hay tipos de bandejas registrados</p>
        </div>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {bandejas.map((bandeja) => (
              <div key={bandeja.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base">{bandeja.nombre}</h3>
                      <span className="text-sm text-gray-500">{bandeja.cantidadCeldas} celdas</span>
                    </div>
                  </div>
                  {bandeja.enUso && (
                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                      EN USO
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(bandeja)}
                    className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(bandeja.id)}
                    disabled={bandeja.enUso}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      bandeja.enUso
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: Table */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                      {bandeja.enUso && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title="No se puede eliminar porque está siendo utilizada en siembras">
                          EN USO
                        </span>
                      )}
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
                        disabled={bandeja.enUso}
                        className={`p-2 rounded-lg transition-colors ${
                          bandeja.enUso 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-red-600 hover:text-red-900 hover:bg-red-50 cursor-pointer'
                        }`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <VariedadBandejaForm
          bandeja={selectedBandeja}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

