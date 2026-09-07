import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStockPorNegocio } from '../api/estadisticas';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

const COLORS = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#14b8a6', // teal-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#64748b'  // slate-500 (used for 'Otros')
];

const StockPieChart = ({ unidadNegocioId }) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['stock-pie', unidadNegocioId],
        queryFn: () => getStockPorNegocio(unidadNegocioId),
        enabled: !!unidadNegocioId,
    });

    const processData = (rawData) => {
        if (!rawData || rawData.length === 0) return [];
        
        // Sort descending by cantidad
        const sorted = [...rawData].sort((a, b) => b.cantidad - a.cantidad);
        
        if (sorted.length <= 10) {
            return sorted;
        }

        const top9 = sorted.slice(0, 9);
        const others = sorted.slice(9);
        const othersSum = others.reduce((acc, curr) => acc + curr.cantidad, 0);

        return [...top9, { productoNombre: 'Otros', cantidad: othersSum }];
    };

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
                <p className="text-red-500 font-medium">Error al cargar datos del stock</p>
            </div>
        );
    }

    const chartData = processData(data);

    if (chartData.length === 0) {
        return (
            <div className="flex h-[400px] items-center justify-center bg-paper rounded-panel border border-line p-8">
                <p className="text-muted font-medium">No hay stock disponible en esta unidad</p>
            </div>
        );
    }

    return (
        <div className="bg-paper rounded-panel border border-line p-4 lg:p-8 flex flex-col h-[400px]">
            <h3 className="text-lg font-medium text-ink mb-4 text-center">Distribución de Stock Físico</h3>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                        <Pie
                            data={chartData}
                            dataKey="cantidad"
                            nameKey="productoNombre"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={true}
                        >
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.productoNombre === 'Otros' ? COLORS[9] : COLORS[index % (COLORS.length - 1)]} 
                                />
                            ))}
                        </Pie>
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-paper border border-line p-3 rounded-panel shadow-md">
                                            <p className="text-ink font-medium">
                                                {`${payload[0].name} : ${new Intl.NumberFormat('es-AR').format(payload[0].value)} Unidades`}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default StockPieChart;
