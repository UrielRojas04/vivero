import React, { useState, useEffect } from 'react';
import { Search, PackageMinus, History } from 'lucide-react';
import { bandejasApi } from '../api/bandejas.api';
import DevolucionBandejasModal from '../components/DevolucionBandejasModal';
import HistorialBandejasModal from '../components/HistorialBandejasModal';
import RegistrarDevolucionProductoModal from '../components/RegistrarDevolucionProductoModal';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';

// Pantalla dedicada a devolver/consultar bandejas, alcanzable con LEER_CLIENTES (jefe, como
// siempre) o con el permiso acotado LEER_BANDEJAS. A propósito NO usa GET /api/clientes: ese
// endpoint devuelve balanceDinero y teléfono, datos que alguien con sólo el permiso de bandejas
// no debe poder ver. Acá se usa GET /api/bandejas/clientes, que sólo trae id/nombre/balanceBandejas.
const Devoluciones = () => {
  const { pushToast } = useUIStore();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busquedaCliente, setBusquedaCliente] = useState('');

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [isDevolucionOpen, setIsDevolucionOpen] = useState(false);
  const [isDevolucionProductoOpen, setIsDevolucionProductoOpen] = useState(false);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('bandejas');

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

  const abrirDevolucionProducto = (cliente) => {
    setClienteSeleccionado(cliente);
    setIsDevolucionProductoOpen(true);
  };

  const abrirHistorial = (cliente) => {
    setClienteSeleccionado(cliente);
    setIsHistorialOpen(true);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <PackageMinus className="w-6 h-6 text-accent" />
          Devoluciones
        </h1>
        <p className="mt-1 text-sm text-muted">Registrá devoluciones de bandejas vacías o productos sobrantes por cliente.</p>
      </div>

      <div className="flex space-x-1 border-b border-line">
        <button
          onClick={() => setActiveTab('bandejas')}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'bandejas'
              ? 'border-accent text-accent-ink'
              : 'border-transparent text-muted hover:text-body hover:border-line-strong'
          }`}
        >
          Devolución de bandejas (vacías)
        </button>
        <button
          onClick={() => setActiveTab('productos')}
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'productos'
              ? 'border-accent text-accent-ink'
              : 'border-transparent text-muted hover:text-body hover:border-line-strong'
          }`}
        >
          Devolución de productos (sobrantes)
        </button>
      </div>

      <div className="bg-paper p-4 rounded-panel border border-line">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-faint" />
          </div>
          <input
            type="text"
            placeholder="Buscar cliente por nombre o razón social..."
            value={busquedaCliente}
            onChange={(e) => setBusquedaCliente(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-line-strong rounded-base focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-10 text-muted bg-paper rounded-panel border border-line">
          {busquedaCliente ? 'No se encontraron clientes.' : 'No hay clientes para mostrar.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-paper p-4 rounded-panel border border-line flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                <p className="font-semibold text-ink truncate">{cliente.nombreRazonSocial}</p>
                {activeTab === 'bandejas' && (
                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium font-mono tabular-nums ${
                    cliente.balanceBandejas > 0 ? 'bg-warn-bg text-warn-ink' : 'bg-thead text-body'
                  }`}>
                    {cliente.balanceBandejas || 0} bandejas
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {activeTab === 'bandejas' ? (
                  <>
                    <button
                      onClick={() => abrirDevolucion(cliente)}
                      className="flex-1 sm:flex-none py-2 px-3 text-sm font-medium text-accent-ink bg-accent-soft hover:brightness-95 rounded-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PackageMinus className="w-4 h-4" /> Devolver Bandejas
                    </button>
                    <button
                      onClick={() => abrirHistorial(cliente)}
                      className="flex-1 sm:flex-none py-2 px-3 text-sm font-medium text-body bg-thead hover:bg-canvas rounded-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <History className="w-4 h-4" /> Historial
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => abrirDevolucionProducto(cliente)}
                    className="flex-1 sm:flex-none py-2 px-3 text-sm font-medium text-accent-ink bg-accent-soft hover:brightness-95 rounded-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PackageMinus className="w-4 h-4" /> Devolver Producto
                  </button>
                )}
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
      
      {clienteSeleccionado && isDevolucionProductoOpen && (
        <RegistrarDevolucionProductoModal
          isOpen={isDevolucionProductoOpen}
          onClose={() => { setIsDevolucionProductoOpen(false); setClienteSeleccionado(null); }}
          clienteId={clienteSeleccionado.id}
        />
      )}
    </div>
  );
};

export default Devoluciones;
