import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStockCritico } from '../api/estadisticas';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const AlertaStock = ({ unidadNegocioId }) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['stock-critico', unidadNegocioId],
        queryFn: () => getStockCritico(unidadNegocioId, 10),
        enabled: !!unidadNegocioId,
    });

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center bg-paper rounded-panel border border-line p-8">
                <Loader2 className="h-8 w-8 animate-spin text-accent-ink" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-[400px] items-center justify-center bg-paper rounded-panel border border-red-500 p-8">
                <p className="text-red-500 font-medium">Error al cargar alertas de stock</p>
            </div>
        );
    }

    const hasProducts = data && data.length > 0;

    return (
        <div className="bg-paper rounded-panel border border-line p-4 lg:p-8 flex flex-col h-[400px]">
            <div className="flex items-center justify-center gap-2 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-medium text-ink">Alerta de Stock Crítico</h3>
            </div>
            
            <div className="flex-1 w-full overflow-y-auto pr-2">
                {!hasProducts ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-muted font-medium">No hay productos en esta unidad</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {data.map((item, index) => {
                            const isZero = item.cantidad === 0;
                            const isVeryLow = item.cantidad > 0 && item.cantidad <= 5;
                            
                            return (
                                <li key={index} className="flex justify-between items-center p-3 bg-surface rounded-md border border-line">
                                    <span className="text-ink font-medium truncate pr-4" title={item.productoNombre}>
                                        {item.productoNombre}
                                    </span>
                                    <span className={`font-bold whitespace-nowrap ${isZero ? 'text-red-500' : isVeryLow ? 'text-orange-500' : 'text-emerald-500'}`}>
                                        {new Intl.NumberFormat('es-AR').format(item.cantidad)} un.
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            
            <div className="mt-4 text-center border-t border-line pt-4">
                <Link to="/productos" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                    Ver catálogo completo →
                </Link>
            </div>
        </div>
    );
};

export default AlertaStock;
