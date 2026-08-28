import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, FileText, Phone } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { describirSaldo } from '../utils/saldoDisplay';

const Facturas = () => {
  const navigate = useNavigate();
  const { unidadNegocioActiva } = useAuthStore();
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await api.get('/clientes');
        setClientes(response.data);
        setFilteredClientes(response.data);
      } catch (err) {
        console.error('Error fetching clientes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, []);

  useEffect(() => {
    const results = clientes.filter(c =>
      c.nombreRazonSocial.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClientes(results);
  }, [searchTerm, clientes]);

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">Facturación (Por Cliente)</h1>

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
      </div>

      {/* Tarjetas apiladas en mobile: la tabla exige scroll horizontal por debajo de md y la
          acción principal ("Factura Activa") queda fuera de pantalla. Mismo patrón que Clientes
          y Cheques. Mapea sobre el mismo filteredClientes que la tabla para que no puedan divergir. */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredClientes.map((cliente) => {
          const saldo = describirSaldo(cliente.balanceDinero);
          return (
            <div key={cliente.id} className="bg-paper rounded-panel border border-line p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center font-bold text-sm shrink-0">
                  {cliente.nombreRazonSocial.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink truncate">{cliente.nombreRazonSocial}</p>
                  {cliente.telefono && (
                    <p className="text-sm text-muted flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {cliente.telefono}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted">Saldo en CC</span>
                <span title={saldo.etiqueta} className={`px-2.5 py-1 rounded-full text-sm font-medium font-mono tabular-nums ${saldo.tono.chip}`}>
                  $ {saldo.monto} · {saldo.etiqueta}
                </span>
              </div>
              <button
                onClick={() => navigate(`/facturas/${cliente.id}`)}
                className="mt-3 w-full py-2.5 bg-accent-soft text-accent-ink rounded-base hover:brightness-95 transition-colors flex items-center justify-center gap-2 cursor-pointer font-medium text-sm"
              >
                <FileText className="w-4 h-4" /> Factura Activa
              </button>
            </div>
          );
        })}
        {filteredClientes.length === 0 && (
          <div className="bg-paper rounded-panel border border-line p-8 text-center text-muted">
            No se encontraron clientes
          </div>
        )}
      </div>

      <div className="hidden md:block bg-paper rounded-panel border border-line overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-thead border-b border-line text-sm text-muted uppercase tracking-wider">
              <th className="p-4 font-semibold">Cliente</th>
              <th className="p-4 font-semibold text-right">Saldo en CC</th>
              <th className="p-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredClientes.map((cliente) => {
              const saldo = describirSaldo(cliente.balanceDinero);
              return (
                <tr key={cliente.id} className="hover:bg-canvas transition-colors">
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center font-bold text-sm shrink-0">
                        {cliente.nombreRazonSocial.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-ink">{cliente.nombreRazonSocial}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <span title={saldo.etiqueta} className={`px-2.5 py-1 rounded-full text-sm font-medium ${saldo.tono.chip}`}>
                      $ {saldo.monto} · {saldo.etiqueta}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => navigate(`/facturas/${cliente.id}`)}
                        className="p-2 text-accent-ink hover:bg-accent-soft rounded-base transition-colors flex items-center gap-2 cursor-pointer font-medium text-sm"
                      >
                        <FileText className="w-4 h-4" /> Factura Activa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredClientes.length === 0 && (
              <tr>
                <td colSpan="3" className="p-8 text-center text-muted">
                  No se encontraron clientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Facturas;
