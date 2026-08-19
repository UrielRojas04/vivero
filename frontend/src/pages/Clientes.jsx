import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Plus, Pencil, Trash2, Search, DollarSign, FileText } from 'lucide-react';
import ClienteForm from '../components/ClienteForm';
import DevolucionBandejasModal from '../components/DevolucionBandejasModal';
import HistorialBandejasModal from '../components/HistorialBandejasModal';
import AjusteSaldoModal from '../components/AjusteSaldoModal';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { getErrorMessage } from '../utils/errorMessage';
import { describirSaldo } from '../utils/saldoDisplay';

const Clientes = () => {
  const navigate = useNavigate();
  const { pushToast, askConfirm } = useUIStore();
  const { unidadNegocioActiva } = useAuthStore();
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDevolucionModalOpen, setIsDevolucionModalOpen] = useState(false);
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
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

  const handleOpenDevolucion = (cliente) => {
    setEditingCliente(cliente);
    setIsDevolucionModalOpen(true);
  };

  const handleOpenHistorial = (cliente) => {
    setEditingCliente(cliente);
    setIsHistorialModalOpen(true);
  };

  const handleOpenAjusteSaldo = (cliente) => {
    setEditingCliente(cliente);
    setIsAjusteModalOpen(true);
  };

  const handleOpenFactura = (cliente) => {
    // Antes abría un modal; ahora es una página propia (más lugar para leer el documento,
    // en computadora y en celular).
    navigate(`/clientes/${cliente.id}/cuenta-corriente`);
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
        {filteredClientes.map((cliente) => {
          const saldo = describirSaldo(cliente.balanceDinero);
          return (
          <div key={cliente.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  {cliente.nombreRazonSocial.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{cliente.nombreRazonSocial}</h3>
                  <p className="text-xs text-gray-400 truncate">{cliente.telefono || 'Sin teléfono'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-xs uppercase tracking-wide font-semibold text-gray-400">
                  {saldo.etiqueta}
                </span>
                <span className={`text-2xl font-bold ${saldo.tono.texto}`}>
                  $ {saldo.monto}
                </span>
                {unidadNegocioActiva !== '2' && (
                  <span className={`mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    cliente.balanceBandejas > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {cliente.balanceBandejas || 0} bandejas
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-50">
              <button
                onClick={() => handleOpenModal(cliente)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Pencil className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={() => handleOpenFactura(cliente)}
                title="Cuenta Corriente"
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {/* Rótulo corto ("Cuenta") en vez de "Cuenta Corriente" completo: con varios botones
                    en esta fila a 320px el texto completo desborda; el título completo queda en el
                    atributo title y en el modal. Es la acción principal: desde ahí se ve la deuda
                    por venta y se registra el pago asociado. */}
                <FileText className="w-4 h-4" /> Cuenta
              </button>
              <button
                onClick={() => handleOpenAjusteSaldo(cliente)}
                title="Ajuste manual de saldo (sin venta asociada) — para deuda o pago suelto que no corresponde a ninguna venta puntual. Para pagar una venta pendiente, usá Cuenta Corriente."
                className="flex-shrink-0 px-3 py-2.5 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleConfirmDelete(cliente.id, cliente.nombreRazonSocial)}
                className="flex-1 flex justify-center items-center py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
              </button>
            </div>
            {unidadNegocioActiva !== '2' && (
              <div className="flex gap-2 pt-2 border-t border-gray-50">
                <button
                  onClick={() => handleOpenDevolucion(cliente)}
                  className="flex-1 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
                >
                  Devolver Bandejas
                </button>
                <button
                  onClick={() => handleOpenHistorial(cliente)}
                  className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  Historial Bandejas
                </button>
              </div>
            )}
          </div>
          );
        })}
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
              {unidadNegocioActiva !== '2' && <th className="p-4 font-semibold text-right">Saldo Bandejas</th>}
              <th className="p-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredClientes.map((cliente) => {
              const saldo = describirSaldo(cliente.balanceDinero);
              return (
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
                  <span
                    title={saldo.etiqueta}
                    className={`px-2.5 py-1 rounded-full text-sm font-medium ${saldo.tono.chip}`}
                  >
                    $ {saldo.monto} · {saldo.etiqueta}
                  </span>
                </td>
                {unidadNegocioActiva !== '2' && (
                  <td className="p-4 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${
                      cliente.balanceBandejas > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {cliente.balanceBandejas || 0}
                    </span>
                  </td>
                )}
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
                    <div className="w-px h-6 bg-gray-200 mx-1 self-center"></div>
                    <button
                      onClick={() => handleOpenFactura(cliente)}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Cuenta Corriente"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleOpenAjusteSaldo(cliente)}
                      className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      title="Ajuste manual de saldo (sin venta asociada) — para deuda o pago suelto que no corresponde a ninguna venta puntual. Para pagar una venta pendiente, usá Cuenta Corriente."
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>
                    {unidadNegocioActiva !== '2' && (
                      <>
                        <button
                          onClick={() => handleOpenDevolucion(cliente)}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                          title="Devolver Bandejas"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line><line x1="8" y1="14.5" x2="12" y2="12"></line></svg>
                        </button>
                        <button
                          onClick={() => handleOpenHistorial(cliente)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Historial de Bandejas"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
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

      <DevolucionBandejasModal
        isOpen={isDevolucionModalOpen}
        onClose={() => { setIsDevolucionModalOpen(false); setEditingCliente(null); }}
        cliente={editingCliente}
        onSuccess={fetchClientes}
      />

      <HistorialBandejasModal
        isOpen={isHistorialModalOpen}
        onClose={() => setIsHistorialModalOpen(false)}
        cliente={editingCliente}
      />

      <AjusteSaldoModal
        isOpen={isAjusteModalOpen}
        onClose={() => {
          setIsAjusteModalOpen(false);
          fetchClientes();
        }}
        cliente={editingCliente}
      />
    </div>
  );
};

export default Clientes;
