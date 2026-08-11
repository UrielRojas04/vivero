import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, Search } from 'lucide-react';
import { ventasApi } from '../api/ventas.api';
import { useUIStore } from '../store/useUIStore';
import ComprobanteVentaModal from '../components/ComprobanteVentaModal';

export default function HistorialVentas() {
  const { pushToast } = useUIStore();
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        const data = await ventasApi.listarVentas();
        setVentas(data);
      } catch (error) {
        pushToast('error', 'Error al cargar el historial de ventas.');
      } finally {
        setLoading(false);
      }
    };
    fetchVentas();
  }, []);

  const ventasFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return ventas;

    // Normaliza acentos para que "Lopez" encuentre "López"
    const normalize = (text) =>
      String(text ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nq = normalize(q);

    return ventas.filter((venta) => {
      return (
        normalize(venta.clienteNombre).includes(nq) ||
        normalize(venta.estadoPago).includes(nq) ||
        normalize(new Date(venta.fecha).toLocaleDateString('es-AR')).includes(nq)
      );
    });
  }, [ventas, filtro]);

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Historial de Ventas</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por cliente, estado o fecha…"
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-shadow"
        />
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-semibold">Fecha</th>
              <th className="p-4 font-semibold">Cliente</th>
              <th className="p-4 font-semibold text-right">Total Final</th>
              <th className="p-4 font-semibold text-right">Entregó</th>
              <th className="p-4 font-semibold text-center">Estado</th>
              <th className="p-4 font-semibold text-center">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ventasFiltradas.map((venta) => (
              <tr key={venta.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4 text-gray-600">{new Date(venta.fecha).toLocaleString('es-AR')}</td>
                <td className="p-4 font-medium text-gray-900">{venta.clienteNombre}</td>
                <td className="p-4 text-right font-bold text-emerald-700">
                  ${venta.totalFinal ? venta.totalFinal.toLocaleString('es-AR') : '0'}
                </td>
                <td className="p-4 text-right font-medium text-gray-700">
                  ${(venta.pagos ? venta.pagos.reduce((sum, p) => sum + p.monto, 0) : 0).toLocaleString('es-AR')}
                </td>
                <td className="p-4 text-center">
                  <span className="px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                    {venta.estadoPago}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => setVentaSeleccionada(venta)}
                    title={`Ver comprobante de la venta #${venta.id}`}
                    className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Receipt className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {ventasFiltradas.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500">
                  {filtro.trim()
                    ? 'No se encontraron ventas para la búsqueda.'
                    : 'No hay ventas registradas todavía.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ventaSeleccionada && (
        <ComprobanteVentaModal
          isOpen={!!ventaSeleccionada}
          onClose={() => setVentaSeleccionada(null)}
          venta={ventaSeleccionada}
        />
      )}
    </div>
  );
}
