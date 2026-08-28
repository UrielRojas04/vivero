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
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">Clientes</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
            <input
              type="text"
              placeholder="Buscar cliente..."
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
            Nuevo Cliente
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-bg text-danger p-4 rounded-base">
          {error}
        </div>
      )}

      {/* Vista Mobile (Cards) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredClientes.map((cliente) => {
          const saldo = describirSaldo(cliente.balanceDinero);
          return (
          <div key={cliente.id} className="bg-paper p-4 rounded-panel border border-line flex flex-col gap-3">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center font-bold">
                  {cliente.nombreRazonSocial.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-ink truncate">{cliente.nombreRazonSocial}</h3>
                  <p className="text-xs text-faint truncate">{cliente.telefono || 'Sin teléfono'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-xs uppercase tracking-wide font-semibold text-faint">
                  {saldo.etiqueta}
                </span>
                <span className={`text-2xl font-bold font-mono tabular-nums ${saldo.tono.texto}`}>
                  $ {saldo.monto}
                </span>
                {unidadNegocioActiva !== '2' && (
                  <span className={`mt-1 px-2 py-0.5 rounded-full text-xs font-medium font-mono tabular-nums ${
                    cliente.balanceBandejas > 0 ? 'bg-warn-bg text-warn-ink' : 'bg-thead text-body'
                  }`}>
                    {cliente.balanceBandejas || 0} bandejas
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-line">
              <button
                onClick={() => handleOpenModal(cliente)}
                className="flex-1 py-2.5 text-sm font-medium text-body bg-canvas hover:bg-accent-soft hover:text-accent-ink rounded-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Pencil className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={() => handleOpenFactura(cliente)}
                title="Cuenta Corriente"
                className="flex-1 py-2.5 text-sm font-medium text-body bg-canvas hover:bg-accent-soft hover:text-accent-ink rounded-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
                className="flex-shrink-0 px-3 py-2.5 text-faint bg-canvas hover:bg-thead hover:text-body rounded-base transition-colors flex items-center justify-center cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleConfirmDelete(cliente.id, cliente.nombreRazonSocial)}
                className="flex-1 flex justify-center items-center py-2.5 text-danger-ink bg-danger-bg hover:brightness-95 rounded-base font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
              </button>
            </div>
          </div>
          );
        })}
        {filteredClientes.length === 0 && (
          <div className="text-center py-8 text-muted bg-paper rounded-panel border border-line">
            No se encontraron clientes.
          </div>
        )}
      </div>

      {/* Vista Desktop (Tabla) */}
      <div className="hidden md:block bg-paper rounded-panel border border-line overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-thead border-b border-line text-sm text-muted uppercase tracking-wider">
              <th className="p-4 font-semibold">Nombre / Razón Social</th>
              <th className="p-4 font-semibold">Teléfono</th>
              <th className="p-4 font-semibold text-right">Saldo Dinero</th>
              {unidadNegocioActiva !== '2' && <th className="p-4 font-semibold text-right">Saldo Bandejas</th>}
              <th className="p-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredClientes.map((cliente) => {
              const saldo = describirSaldo(cliente.balanceDinero);
              return (
              <tr key={cliente.id} className="hover:bg-canvas transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center font-bold text-sm">
                      {cliente.nombreRazonSocial.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-ink">{cliente.nombreRazonSocial}</span>
                  </div>
                </td>
                <td className="p-4 text-body">{cliente.telefono || '-'}</td>
                <td className="p-4 text-right">
                  <span
                    title={saldo.etiqueta}
                    className={`px-2.5 py-1 rounded-full text-sm font-medium font-mono tabular-nums ${saldo.tono.chip}`}
                  >
                    $ {saldo.monto} · {saldo.etiqueta}
                  </span>
                </td>
                {unidadNegocioActiva !== '2' && (
                  <td className="p-4 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-sm font-medium font-mono tabular-nums ${
                      cliente.balanceBandejas > 0 ? 'bg-warn-bg text-warn-ink' : 'bg-thead text-body'
                    }`}>
                      {cliente.balanceBandejas || 0}
                    </span>
                  </td>
                )}
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(cliente)}
                      className="p-2 text-faint hover:text-accent-ink hover:bg-accent-soft rounded-base transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(cliente.id, cliente.nombreRazonSocial)}
                      className="p-2 text-faint hover:text-danger hover:bg-danger-bg rounded-base transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-line mx-1 self-center"></div>
                    <button
                      onClick={() => handleOpenFactura(cliente)}
                      className="p-2 text-faint hover:text-accent-ink hover:bg-accent-soft rounded-base transition-colors cursor-pointer"
                      title="Cuenta Corriente"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleOpenAjusteSaldo(cliente)}
                      className="p-1.5 text-faint hover:text-body hover:bg-canvas rounded-base transition-colors cursor-pointer"
                      title="Ajuste manual de saldo (sin venta asociada) — para deuda o pago suelto que no corresponde a ninguna venta puntual. Para pagar una venta pendiente, usá Cuenta Corriente."
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {filteredClientes.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-muted">
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
