import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Truck, Phone, User, DollarSign, Percent, Tag } from 'lucide-react';
import { proveedoresApi } from '../api/proveedores.api';
import ProveedorForm from '../components/ProveedorForm';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';

const Proveedores = () => {
  const { pushToast, askConfirm, denyAccess } = useUIStore();
  // Este componente maneja su propia lista con fetch + useState (no useQuery) por razones
  // históricas, pero PedidoNuevo.jsx/Pedidos.jsx/ProductoForm.jsx SÍ leen proveedores vía
  // useQuery(['proveedores']) con staleTime 30s y refetchOnWindowFocus:false (main.jsx). Bug real
  // encontrado 2026-08-21 ("los descuentos configurados en un proveedor no aparecen precargados
  // en el pedido"): sin invalidar esa cache compartida, un alta/edición/baja hecha acá quedaba
  // invisible para esas otras páginas hasta que pasaran los 30s Y remontaran el componente — en
  // la práctica, casi nunca a tiempo. queryClient.invalidateQueries fuerza el refetch inmediato
  // en cualquier useQuery(['proveedores']) montado en ese momento, y descarta el caché para el
  // próximo mount.
  const queryClient = useQueryClient();
  const [proveedores, setProveedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const data = await proveedoresApi.getAll();
      setProveedores(data);
    } catch (err) {
      if (err.response?.status === 403) denyAccess();
      else pushToast('error', getErrorMessage(err, 'No se pudieron cargar los proveedores.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  const filtrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.contacto && p.contacto.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (proveedor = null) => {
    setEditingProveedor(proveedor);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProveedor(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingProveedor) {
        await proveedoresApi.update(editingProveedor.id, formData);
        pushToast('success', 'Proveedor actualizado correctamente.');
      } else {
        await proveedoresApi.create(formData);
        pushToast('success', 'Proveedor creado correctamente.');
      }
      handleCloseModal();
      fetchProveedores();
      // Invalida el caché compartido ['proveedores'] (ver comentario junto a useQueryClient más
      // arriba): sin esto, PedidoNuevo/Pedidos/ProductoForm seguían mostrando el perfil de costeo
      // viejo del proveedor (IVA, envío, descuentos) hasta 30s después de guardar acá.
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al guardar el proveedor.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await proveedoresApi.delete(id);
      pushToast('success', 'Proveedor eliminado.');
      fetchProveedores();
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al eliminar el proveedor.'));
    }
  };

  const handleConfirmDelete = (proveedor) => {
    askConfirm({
      title: 'Eliminar Proveedor',
      message: `¿Estás seguro que deseas eliminar al proveedor "${proveedor.nombre}"?`,
      variant: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: () => handleDelete(proveedor.id),
    });
  };

  // Badges del perfil de costeo, reconocibles de un vistazo (tarea 4.6): tratamiento de IVA,
  // dólares, envío por defecto y cantidad de descuentos cargados.
  const PerfilBadges = ({ proveedor }) => (
    <div className="flex flex-wrap gap-1.5 mt-1">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-thead text-body border border-line text-[11px] font-medium">
        <Percent className="w-3 h-3" />
        {proveedor.ivaIncluidoEnPrecio ? 'IVA incluido' : `IVA aparte${proveedor.ivaPorDefectoPorcentaje != null ? ` (${proveedor.ivaPorDefectoPorcentaje}%)` : ''}`}
      </span>
      {proveedor.manejaDolares && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-thead text-body border border-line text-[11px] font-medium">
          <DollarSign className="w-3 h-3" />
          USD
        </span>
      )}
      {proveedor.costoEnvioPorDefectoPorcentaje != null && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-thead text-body border border-line text-[11px] font-medium">
          Envío {proveedor.costoEnvioPorDefectoPorcentaje}%
        </span>
      )}
      {proveedor.descuentosPorDefecto && proveedor.descuentosPorDefecto.length > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-thead text-body border border-line text-[11px] font-medium">
          <Tag className="w-3 h-3" />
          {proveedor.descuentosPorDefecto.length} desc.
        </span>
      )}
    </div>
  );

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink flex items-center gap-3">
          <Truck className="w-7 h-7 text-accent" />
          Proveedores
        </h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
            <input
              type="text"
              placeholder="Buscar proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none w-full sm:w-64 bg-paper"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center px-4 py-2 bg-accent text-paper rounded-base hover:brightness-95 transition-colors font-medium cursor-pointer"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Vista Mobile (Tarjetas) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filtrados.map((proveedor) => (
          <div key={proveedor.id} className="bg-paper p-4 rounded-panel border border-line flex flex-col gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 flex-shrink-0 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center font-bold">
                {proveedor.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-ink truncate">{proveedor.nombre}</h3>
                {proveedor.contacto && (
                  <p className="text-xs text-muted truncate flex items-center gap-1">
                    <User className="w-3 h-3" /> {proveedor.contacto}
                  </p>
                )}
                {proveedor.telefono && (
                  <p className="text-xs text-faint truncate flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {proveedor.telefono}
                  </p>
                )}
                <PerfilBadges proveedor={proveedor} />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-line">
              <button
                onClick={() => handleOpenModal(proveedor)}
                className="flex-1 py-2.5 text-sm font-medium text-body bg-canvas hover:bg-thead rounded-base transition-colors flex items-center justify-center gap-2 cursor-pointer border border-line"
              >
                <Pencil className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={() => handleConfirmDelete(proveedor)}
                className="flex-1 flex justify-center items-center py-2.5 text-danger-ink bg-danger-bg hover:brightness-95 rounded-base font-medium transition-colors cursor-pointer border border-danger-line"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
              </button>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div className="text-center py-8 text-muted bg-paper rounded-panel border border-line">
            No se encontraron proveedores.
          </div>
        )}
      </div>

      {/* Vista Desktop (Tabla) */}
      <div className="hidden md:block bg-paper rounded-panel border border-line overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-thead border-b border-line text-sm text-muted uppercase tracking-wider">
              <th className="p-4 font-semibold">Nombre</th>
              <th className="p-4 font-semibold">Perfil de costeo</th>
              <th className="p-4 font-semibold">Contacto</th>
              <th className="p-4 font-semibold">Teléfono</th>
              <th className="p-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtrados.map((proveedor) => (
              <tr key={proveedor.id} className="hover:bg-canvas transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center font-bold text-sm">
                      {proveedor.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-ink">{proveedor.nombre}</span>
                  </div>
                </td>
                <td className="p-4"><PerfilBadges proveedor={proveedor} /></td>
                <td className="p-4 text-body">{proveedor.contacto || '-'}</td>
                <td className="p-4 text-body">{proveedor.telefono || '-'}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(proveedor)}
                      className="p-2 text-body hover:text-accent-ink hover:bg-canvas rounded-base transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(proveedor)}
                      className="p-2 text-body hover:text-danger hover:bg-danger-bg rounded-base transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-muted">
                  No se encontraron proveedores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProveedorForm
        proveedor={editingProveedor}
        isOpen={isModalOpen}
        onSave={handleSubmit}
        onCancel={handleCloseModal}
      />
    </div>
  );
};

export default Proveedores;
