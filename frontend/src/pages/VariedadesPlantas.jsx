import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Leaf, Search } from 'lucide-react';
import { variedadesPlantasApi } from '../api/variedades-plantas.api';
import { useUIStore } from '../store/useUIStore';
import VariedadPlantaForm from '../components/VariedadPlantaForm';

export default function VariedadesPlantas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVariedad, setSelectedVariedad] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();
  const { pushToast, askConfirm } = useUIStore();

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
    askConfirm({
      title: 'Eliminar Variedad',
      message: '¿Está seguro que desea eliminar esta variedad de planta? Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: () => deleteMutation.mutate(id)
    });
  };

  const handleCloseModal = () => {
    setSelectedVariedad(null);
    setIsModalOpen(false);
  };

  if (isLoading) return <div className="p-6 text-muted">Cargando...</div>;

  const variedadesFiltradas = searchTerm
    ? variedades.filter((v) =>
        (v.nombre && v.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.descripcion && v.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : variedades;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-paper rounded-panel border border-line p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 h-5 text-faint" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-line rounded-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-canvas/50 transition-all"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-paper rounded-base hover:brightness-95 transition-colors cursor-pointer font-medium sm:ml-auto"
        >
          <Plus size={20} />
          Nueva Variedad
        </button>
      </div>

      {variedadesFiltradas.length === 0 ? (
        <div className="bg-paper rounded-panel border border-line p-12 flex flex-col items-center justify-center text-center">
          <Leaf className="w-12 h-12 text-faint mb-4" />
          <p className="text-muted">
            {searchTerm ? 'Ninguna variedad coincide con la búsqueda' : 'No hay variedades registradas'}
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {variedadesFiltradas.map((variedad) => (
              <div key={variedad.id} className="bg-paper border border-line rounded-panel p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-soft text-accent-ink rounded-base flex items-center justify-center shrink-0">
                      <Leaf className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink text-base">{variedad.nombre}</h3>
                      {variedad.descripcion && (
                        <p className="text-sm text-muted mt-0.5 line-clamp-1">{variedad.descripcion}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="inline-flex items-center px-2 py-1 rounded-base text-xs font-medium bg-thead text-body">
                      {getRangoDias(variedad)}
                    </span>
                    {variedad.enUso && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-base text-xs font-medium bg-warn-bg text-warn-ink border border-warn-line">
                        EN USO
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-line">
                  <button
                    onClick={() => handleEdit(variedad)}
                    className="flex-1 py-2 bg-canvas hover:bg-thead text-body font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(variedad.id)}
                    disabled={variedad.enUso}
                    className={`flex-1 py-2 rounded-base text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      variedad.enUso
                        ? 'bg-canvas text-faint cursor-not-allowed'
                        : 'bg-danger-bg hover:brightness-95 text-danger-ink cursor-pointer'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: Table */}
          <div className="hidden sm:block bg-paper rounded-panel border border-line overflow-hidden">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-thead">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Días de Crecimiento</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-paper">
                {variedadesFiltradas.map((variedad) => (
                  <tr key={variedad.id} className="hover:bg-canvas transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink">
                      {variedad.nombre}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted max-w-xs truncate">
                      {variedad.descripcion || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-body">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-thead text-body">
                        {getRangoDias(variedad)}
                      </span>
                      {variedad.enUso && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warn-bg text-warn-ink" title="No se puede eliminar porque está siendo utilizada en siembras">
                          EN USO
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(variedad)}
                        className="text-accent-ink hover:brightness-90 mx-2 p-2 rounded-base hover:bg-accent-soft cursor-pointer transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(variedad.id)}
                        disabled={variedad.enUso}
                        className={`p-2 rounded-base transition-colors ${
                          variedad.enUso
                            ? 'text-faint cursor-not-allowed'
                            : 'text-danger hover:brightness-90 hover:bg-danger-bg cursor-pointer'
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
        <VariedadPlantaForm
          variedad={selectedVariedad}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
