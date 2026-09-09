import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBandejasDisponibles } from '../api/estadisticas';
import { Sprout, AlertCircle, Loader2, Search } from 'lucide-react';

const BandejasDisponiblesList = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: bandejas, isLoading, isError } = useQuery({
    queryKey: ['bandejas-disponibles'],
    queryFn: getBandejasDisponibles
  });

  if (isLoading) {
    return (
      <div className="bg-paper rounded-panel border border-line p-6 flex items-center justify-center h-[300px]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-paper rounded-panel border border-line p-6 flex flex-col items-center justify-center h-[300px] text-center">
        <AlertCircle className="w-12 h-12 text-error mb-4 opacity-80" />
        <h3 className="text-lg font-medium text-ink">Error al cargar datos</h3>
        <p className="text-sm text-muted">No se pudo cargar la disponibilidad de productos.</p>
      </div>
    );
  }

  if (!bandejas || bandejas.length === 0) {
    return (
      <div className="bg-paper rounded-panel border border-line p-6 flex flex-col items-center justify-center h-[300px] text-center">
        <Sprout className="w-12 h-12 text-muted mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-ink">Sin productos</h3>
        <p className="text-sm text-muted">No hay stock de productos registrado.</p>
      </div>
    );
  }

  const filteredBandejas = bandejas.filter(item => 
    item.variedad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-paper rounded-panel border border-line p-6 flex flex-col h-[400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5 text-accent-ink" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">Productos Disponibles</h2>
            <p className="text-xs text-muted">Stock real deducido de encargos</p>
          </div>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-line rounded-input text-base text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
        {filteredBandejas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-muted">No se encontraron productos que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 bg-paper z-10">
                <th className="pb-3 text-xs font-semibold text-muted border-b border-line">Variedad</th>
                <th className="pb-3 text-xs font-semibold text-success border-b border-line text-right">Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {filteredBandejas.map((item, idx) => (
                <tr key={idx} className="group hover:bg-surface/50 transition-colors">
                  <td className="py-3 pr-8">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-ink truncate max-w-[250px]" title={item.variedad}>
                        {item.variedad} {item.esDevolucion && <span title={`Devolución de ${item.duenoAnterior}`} className="text-primary ml-1 cursor-help">♻️</span>}
                      </p>
                      {item.esDevolucion && item.duenoAnterior && (
                        <span className="text-xs text-primary/80 font-medium">
                          De: {item.duenoAnterior}
                        </span>
                      )}
                      {item.diasParaCosecha !== undefined && item.diasParaCosecha !== null && (
                        <span className="text-xs text-muted">
                          En siembra (Faltan {item.diasParaCosecha} día{item.diasParaCosecha !== 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`text-sm font-bold ${item.disponible <= 0 ? 'text-error' : 'text-success'}`}>
                      {item.disponible}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BandejasDisponiblesList;
