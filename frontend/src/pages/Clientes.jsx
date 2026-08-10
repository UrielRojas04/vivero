import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import ClienteForm from '../components/ClienteForm';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';

const Clientes = () => {
  const { pushToast, askConfirm } = useUIStore();
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clientes');
      setClientes(response.data);
      setFilteredClientes(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching clientes:', err);
      setError('No se pudieron cargar los clientes. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    const results = clientes.filter(c =>
      c.nombreRazonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.telefono && c.telefono.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredClientes(results);
  }, [searchTerm, clientes]);

  const handleOpenModal = (cliente = null) => {
    setEditingCliente(cliente);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingCliente(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingCliente) {
        await api.put(`/clientes/${editingCliente.id}`, formData);
      } else {
        await api.post('/clientes', formData);
      }
      
      handleCloseModal();
      fetchClientes();
      pushToast('success', editingCliente ? 'Cliente actualizado correctamente.' : 'Cliente guardado correctamente.');
    } catch (err) {
      console.error('Error guardando cliente:', err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al guardar el cliente.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/clientes/${id}`);
      fetchClientes();
      pushToast('success', 'Cliente eliminado.');
    } catch (err) {
      console.error('Error eliminando cliente:', err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al eliminar el cliente. Es posible que tenga ventas asociadas.'));
    }
  };

  const handleConfirmDelete = (id, nombre) => {
    askConfirm({
      title: 'Eliminar Cliente',
      message: `¿Estás seguro que deseas eliminar el cliente "${nombre}"?`,
      variant: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: () => handleDelete(id),
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-64 bg-white"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium cursor-pointer shadow-sm shadow-emerald-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Vista Mobile (Cards) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredClientes.map((cliente) => (
          <div key={cliente.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  {cliente.nombreRazonSocial.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{cliente.nombreRazonSocial}</h3>
                  <p className="text-sm text-gray-500">{cliente.telefono || 'Sin teléfono'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  cliente.balanceDinero > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  $ {cliente.balanceDinero ? cliente.balanceDinero.toLocaleString('es-AR') : '0'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  cliente.balanceBandejas > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {cliente.balanceBandejas || 0} bandejas
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-50">
              <button
                onClick={() => handleOpenModal(cliente)}
                className="flex-1 flex justify-center items-center py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </button>
              <button
                onClick={() => handleConfirmDelete(cliente.id, cliente.nombreRazonSocial)}
                className="flex-1 flex justify-center items-center py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
              </button>
            </div>
          </div>
        ))}
        {filteredClientes.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
            No se encontraron clientes.
          </div>
        )}
      </div>

      {/* Vista Desktop (Tabla) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-semibold">Nombre / Razón Social</th>
              <th className="p-4 font-semibold">Teléfono</th>
              <th className="p-4 font-semibold text-right">Saldo Dinero</th>
              <th className="p-4 font-semibold text-right">Saldo Bandejas</th>
              <th className="p-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredClientes.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                      {cliente.nombreRazonSocial.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{cliente.nombreRazonSocial}</span>
                  </div>
                </td>
                <td className="p-4 text-gray-600">{cliente.telefono || '-'}</td>
                <td className="p-4 text-right">
                  <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${
                    cliente.balanceDinero > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    $ {cliente.balanceDinero ? cliente.balanceDinero.toLocaleString('es-AR') : '0'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${
                    cliente.balanceBandejas > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {cliente.balanceBandejas || 0}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(cliente)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(cliente.id, cliente.nombreRazonSocial)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredClientes.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  No se encontraron clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ClienteForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingCliente}
      />
    </div>
  );
};

export default Clientes;
