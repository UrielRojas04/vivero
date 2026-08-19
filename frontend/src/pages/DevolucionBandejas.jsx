import React, { useState, useEffect } from 'react';
import { Search, PackageMinus, History } from 'lucide-react';
import { bandejasApi } from '../api/bandejas.api';
import DevolucionBandejasModal from '../components/DevolucionBandejasModal';
import HistorialBandejasModal from '../components/HistorialBandejasModal';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';

// Pantalla dedicada a devolver/consultar bandejas, alcanzable con LEER_CLIENTES (jefe, como
// siempre) o con el permiso acotado LEER_BANDEJAS. A propósito NO usa GET /api/clientes: ese
// endpoint devuelve balanceDinero y teléfono, datos que alguien con sólo el permiso de bandejas
// no debe poder ver. Acá se usa GET /api/bandejas/clientes, que sólo trae id/nombre/balanceBandejas.
const DevolucionBandejas = () => {
  const { pushToast } = useUIStore();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busquedaCliente, setBusquedaCliente] = useState('');

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [isDevolucionOpen, setIsDevolucionOpen] = useState(false);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const data = await bandejasApi.getClientes();
      setClientes(data || []);
    } catch (error) {
      pushToast('error', getErrorMessage(error, 'Error al cargar los clientes.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientesFiltrados = busquedaCliente
    ? clientes.filter((c) => c.nombreRazonSocial.toLowerCase().includes(busquedaCliente.toLowerCase()))
    : clientes;

  const abrirDevolucion = (cliente) => {
    setClienteSeleccionado(cliente);
    setIsDevolucionOpen(true);
  };

  const abrirHistorial = (cliente) => {
    setClienteSeleccionado(cliente);
    setIsHistorialOpen(true);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <PackageMinus className="w-6 h-6 text-emerald-600" />
          Devolución de Bandejas
        </h1>
        <p className="mt-1 text-sm text-gray-500">Registrá devoluciones y consultá el historial de bandejas por cliente.</p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar cliente por nombre o razón social..."
            value={busquedaCliente}
            onChange={(e) => setBusquedaCliente(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
          {busquedaCliente ? 'No se encontraron clientes.' : 'No hay clientes para mostrar.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-900 truncate">{cliente.nombreRazonSocial}</p>
                <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                  cliente.balanceBandejas > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {cliente.balanceBandejas || 0} bandejas
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => abrirDevolucion(cliente)}
                  className="flex-1 sm:flex-none py-2 px-3 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PackageMinus className="w-4 h-4" /> Devolver Bandejas
                </button>
                <button
                  onClick={() => abrirHistorial(cliente)}
                  className="flex-1 sm:flex-none py-2 px-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <History className="w-4 h-4" /> Historial
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DevolucionBandejasModal
        isOpen={isDevolucionOpen}
        onClose={() => { setIsDevolucionOpen(false); setClienteSeleccionado(null); }}
        cliente={clienteSeleccionado}
        onSuccess={fetchClientes}
      />

      <HistorialBandejasModal
        isOpen={isHistorialOpen}
        onClose={() => { setIsHistorialOpen(false); setClienteSeleccionado(null); }}
        cliente={clienteSeleccionado}
      />
    </div>
  );
};

export default DevolucionBandejas;
