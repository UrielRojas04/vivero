import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { abonoApi } from '../api/abono.api';
import { X, Calendar, Settings2 } from 'lucide-react';

const HistorialAjustesAbono = () => {
  const [page, setPage] = useState(0);
  const size = 10;

  const historialQuery = useQuery({
    queryKey: ['abono', 'historial', { page, size, tipos: 'ajuste' }],
    queryFn: () => abonoApi.getHistorial(page, size, 'AJUSTE').then(res => res.data)
  });

  return (
    <div className="bg-paper rounded-panel border border-line overflow-hidden flex flex-col w-full h-[70vh]">
      <div className="flex items-center justify-between p-4 border-b border-line bg-canvas">
        <div className="flex items-center gap-2 text-ink">
          <Settings2 className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-bold">Historial de Ajustes</h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {historialQuery.isLoading ? (
          <div className="text-center text-muted py-8">Cargando historial...</div>
        ) : !historialQuery.data || historialQuery.data.content.length === 0 ? (
          <div className="text-center text-muted py-8">No hay ajustes registrados.</div>
        ) : (
          <>
            {/* MOBILE: Cards */}
            <div className="grid grid-cols-1 gap-3 sm:hidden">
              {historialQuery.data.content.map((mov) => (
                <div key={mov.id} className="bg-canvas border border-line rounded-panel p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink text-sm">{mov.productoNombre}</span>
                    <span className={`font-mono tabular-nums text-sm font-bold px-2.5 py-0.5 rounded-full ${
                      mov.cantidad > 0
                        ? 'bg-ok-bg text-ok-ink'
                        : 'bg-danger-bg text-danger-ink'
                    }`}>
                      {mov.cantidad > 0 ? '+' : ''}{mov.cantidad}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(mov.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                    <span className="text-body">
                      {mov.ubicacion === 'INVERNADERO' ? 'Invernadero' : 'Depósito 2'}
                    </span>
                  </div>
                  {mov.usuarioNombre && (
                    <div className="text-xs text-muted">
                      Por: <span className="font-medium text-body">{mov.usuarioNombre}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* DESKTOP: Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-thead border-b border-line">
                    <th className="px-4 py-3 font-semibold text-muted text-xs uppercase">Fecha</th>
                    <th className="px-4 py-3 font-semibold text-muted text-xs uppercase">Producto</th>
                    <th className="px-4 py-3 font-semibold text-muted text-xs uppercase">Ubicación</th>
                    <th className="px-4 py-3 font-semibold text-muted text-xs uppercase text-right">Cantidad</th>
                    <th className="px-4 py-3 font-semibold text-muted text-xs uppercase text-center">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {historialQuery.data.content.map((mov) => (
                    <tr key={mov.id} className="hover:bg-canvas transition-colors">
                      <td className="px-4 py-3 text-sm text-ink whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted" />
                          {new Date(mov.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-ink text-sm">
                        {mov.productoNombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-body">
                        {mov.ubicacion === 'INVERNADERO' ? 'Invernadero' : 'Depósito 2'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-sm font-semibold">
                        <span className={mov.cantidad > 0 ? "text-ok-ink" : "text-danger-ink"}>
                          {mov.cantidad > 0 ? '+' : ''}{mov.cantidad}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted font-medium">
                        {mov.usuarioNombre || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {historialQuery.data && historialQuery.data.totalPages > 1 && (
        <div className="p-4 border-t border-line bg-canvas flex items-center justify-between">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm font-medium text-body hover:text-ink disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-muted">
            Página {page + 1} de {historialQuery.data.totalPages}
          </span>
          <button
            disabled={page >= historialQuery.data.totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm font-medium text-body hover:text-ink disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default HistorialAjustesAbono;
