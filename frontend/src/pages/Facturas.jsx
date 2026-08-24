import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, FileText, FileClock } from 'lucide-react';
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
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Facturación (Por Cliente)</h1>
        
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
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-semibold">Cliente</th>
              <th className="p-4 font-semibold text-right">Saldo en CC</th>
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
                  <td className="p-4 text-right">
                    <span title={saldo.etiqueta} className={`px-2.5 py-1 rounded-full text-sm font-medium ${saldo.tono.chip}`}>
                      $ {saldo.monto} · {saldo.etiqueta}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => navigate(`/facturas/${cliente.id}`)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer font-medium text-sm"
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
                <td colSpan="3" className="p-8 text-center text-gray-500">
                  No se encontraron clientes.
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
