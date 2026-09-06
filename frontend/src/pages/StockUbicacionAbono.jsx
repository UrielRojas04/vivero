import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { abonoApi } from '../api/abono.api';

export default function StockUbicacionAbono() {
  const [filtro, setFiltro] = useState('');

  const stockQuery = useQuery({
    queryKey: ['abono', 'stock', 'consolidado'],
    queryFn: () => abonoApi.getStockConsolidado().then(res => res.data),
  });

  const stockConsolidado = useMemo(() => {
    if (!stockQuery.data) return [];
    return [...stockQuery.data].sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
  }, [stockQuery.data]);

  const stockFiltrado = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return stockConsolidado;

    // Normaliza acentos para que la búsqueda sea tolerante (mismo criterio que HistorialVentas.jsx)
    const normalize = (text) =>
      String(text ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const nq = normalize(q);

    return stockConsolidado.filter((row) =>
      normalize(row.nombreProducto).includes(nq) || normalize(row.nombreCategoria).includes(nq)
    );
  }, [stockConsolidado, filtro]);

  if (stockQuery.isLoading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Stock por Ubicación</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por producto o categoría…"
          className="w-full pl-9 pr-4 py-2 rounded-base border border-line bg-paper text-sm text-body placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
        />
      </div>

      <div className="bg-paper rounded-panel border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-thead border-b border-line text-xs text-muted uppercase tracking-wider">
                <th className="px-3 sm:px-4 py-3 font-semibold">Producto</th>
                <th className="px-3 sm:px-4 py-3 font-semibold text-right">Invernadero</th>
                <th className="px-3 sm:px-4 py-3 font-semibold text-right">Depósito 2</th>
                <th className="px-3 sm:px-4 py-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stockFiltrado.map((row) => (
                <tr key={row.productoId} className="hover:bg-canvas transition-colors">
                  <td className="px-3 sm:px-4 py-3 font-medium text-ink text-xs sm:text-sm">
                    {row.nombreProducto}
                    {row.nombreCategoria && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-base text-[10px] font-semibold uppercase tracking-wide bg-accent-soft text-accent-ink align-middle">
                        {row.nombreCategoria}
                      </span>
                    )}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right font-mono tabular-nums text-xs sm:text-sm text-body">{row.stockInvernadero}</td>
                  <td className="px-3 sm:px-4 py-3 text-right font-mono tabular-nums text-xs sm:text-sm text-body">{row.stockColega}</td>
                  <td className="px-3 sm:px-4 py-3 text-right font-mono tabular-nums text-xs sm:text-sm font-bold text-ink">{row.stockTotal}</td>
                </tr>
              ))}
              {stockFiltrado.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-muted">
                    {filtro.trim() ? 'No se encontraron productos para la búsqueda.' : 'No hay stock registrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
