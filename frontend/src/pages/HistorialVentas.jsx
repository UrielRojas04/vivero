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
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Historial de Ventas</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por cliente, estado o fecha…"
          className="w-full pl-9 pr-4 py-2 rounded-base border border-line bg-paper text-sm text-body placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="bg-paper rounded-panel border border-line overflow-hidden">
        {/* Vista Mobile (Tarjetas) */}
        <div className="grid grid-cols-1 sm:hidden divide-y divide-line">
          {ventasFiltradas.map((venta) => (
            <div key={venta.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-ink leading-tight">{venta.clienteNombre}</h3>
                  <p className="text-sm text-muted">{new Date(venta.fecha).toLocaleString('es-AR')}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-thead text-body">
                  {venta.estadoPago}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="text-muted">
                  <span className="block">Total: <span className="font-bold text-ink font-mono tabular-nums">${venta.totalFinal ? venta.totalFinal.toLocaleString('es-AR') : '0'}</span></span>
                  <span className="block font-mono tabular-nums">Pagado: ${(venta.pagos ? venta.pagos.reduce((sum, p) => sum + p.monto, 0) : 0).toLocaleString('es-AR')}</span>
                </div>
                <button
                  onClick={() => setVentaSeleccionada(venta)}
                  className="bg-accent-soft text-accent-ink p-2 rounded-base flex items-center gap-1 text-sm font-semibold hover:brightness-95 transition-colors cursor-pointer"
                >
                  <Receipt className="w-4 h-4" /> Ver
                </button>
              </div>
            </div>
          ))}
          {ventasFiltradas.length === 0 && (
            <div className="p-6 text-center text-muted">
              {filtro.trim() ? 'No se encontraron ventas para la búsqueda.' : 'No hay ventas registradas todavía.'}
            </div>
          )}
        </div>

        {/* Vista Desktop (Tabla) */}
        <div className="hidden sm:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-thead border-b border-line text-sm text-muted uppercase tracking-wider">
                <th className="p-4 font-semibold">Fecha</th>
                <th className="p-4 font-semibold">Cliente</th>
                <th className="p-4 font-semibold text-right">Total Final</th>
                <th className="p-4 font-semibold text-right">Entregó</th>
                <th className="p-4 font-semibold text-center">Estado</th>
                <th className="p-4 font-semibold text-center">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ventasFiltradas.map((venta) => (
                <tr key={venta.id} className="hover:bg-canvas transition-colors">
                  <td className="p-4 text-muted">{new Date(venta.fecha).toLocaleString('es-AR')}</td>
                  <td className="p-4 font-medium text-ink">{venta.clienteNombre}</td>
                  <td className="p-4 text-right font-bold text-ink font-mono tabular-nums">
                    ${venta.totalFinal ? venta.totalFinal.toLocaleString('es-AR') : '0'}
                  </td>
                  <td className="p-4 text-right font-medium text-body font-mono tabular-nums">
                    ${(venta.pagos ? venta.pagos.reduce((sum, p) => sum + p.monto, 0) : 0).toLocaleString('es-AR')}
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-sm font-medium bg-thead text-body">
                      {venta.estadoPago}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => setVentaSeleccionada(venta)}
                      title={`Ver comprobante de la venta #${venta.id}`}
                      className="p-2 text-muted hover:text-accent hover:bg-accent-soft rounded-base transition-colors cursor-pointer"
                    >
                      <Receipt className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {ventasFiltradas.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-muted">
                    {filtro.trim()
                      ? 'No se encontraron ventas para la búsqueda.'
                      : 'No hay ventas registradas todavía.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
