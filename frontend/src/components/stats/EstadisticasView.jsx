import React from 'react';
import { BarChart3, Package, CheckCircle2, AlertTriangle, Sprout, Home, Boxes, Hash } from 'lucide-react';

export const EstadisticasView = ({ bandejas, variedades }) => {
  // 1. Filtrar solo el stock activo (lo que no se vendió aún)
  const stockActivo = bandejas.filter(b => !b.vendida);

  // 2. Cálculos Globales de Doble Métrica
  const totalBandejas = stockActivo.reduce((acc, b) => acc + (b.cantidad || 0), 0);
  const totalPlantasReales = stockActivo.reduce((acc, b) =>
    acc + ((b.cantidad || 0) * (b.tipoBandeja?.celdas || 0)), 0);

  // 3. Desglose de Plantas por Etapa
  const plantasSemillero = stockActivo
    .filter(b => !b.ubicacion && !b.enTelas)
    .reduce((acc, b) => acc + (b.cantidad * (b.tipoBandeja?.celdas || 0)), 0);

  const plantasInvernadero = stockActivo
    .filter(b => b.ubicacion?.tipo === 'INVERNADERO' && !b.enTelas)
    .reduce((acc, b) => acc + (b.cantidad * (b.tipoBandeja?.celdas || 0)), 0);

  const plantasTelas = stockActivo
    .filter(b => b.enTelas)
    .reduce((acc, b) => acc + (b.cantidad * (b.tipoBandeja?.celdas || 0)), 0);

  // 4. Alerta: Bandejas listas para trasplante (Invernadero -> Telas)
  const listasParaSalir = stockActivo.filter(b => {
    if (!b.ubicacion || b.enTelas) return false;
    const fechaInicio = new Date(b.fechaSiembra);
    const hoy = new Date();
    const diasTranscurridos = Math.floor((hoy - fechaInicio) / (1000 * 60 * 60 * 24));
    return diasTranscurridos >= (b.variedad?.diasInvernaderoSugeridos || 20);
  }).reduce((acc, b) => acc + (b.cantidad || 0), 0);

  // 5. Ranking de Variedades (en Plantas Reales)
  const resumenPorVariedad = variedades.map(v => {
    const cantidadPlantas = stockActivo
      .filter(b => b.variedad.id === v.id)
      .reduce((acc, b) => acc + (b.cantidad * (b.tipoBandeja?.celdas || 0)), 0);
    return { nombre: v.nombre, cantidad: cantidadPlantas };
  }).filter(item => item.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Inventario General</h2>
          <p className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Estadísticas de Producción</p>
        </div>
        <BarChart3 size={32} className="text-emerald-600 opacity-20 mb-1" />
      </div>

      {/* BLOQUE DE MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Plantas */}
        <div className="bg-emerald-600 rounded-[32px] p-6 shadow-xl shadow-emerald-100 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 text-[9px] font-black uppercase tracking-widest mb-1">Stock de Semillas</p>
            <h3 className="text-3xl font-black text-white tracking-tighter">
              {totalPlantasReales.toLocaleString()}
            </h3>
            <p className="text-emerald-200 text-[9px] font-bold mt-1 uppercase">Plantas totales</p>
          </div>
          <Sprout size={80} className="absolute -right-4 -bottom-4 text-white/10 rotate-12" />
        </div>

        {/* Total Bandejas */}
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Capacidad Física</p>
          <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
            {totalBandejas.toLocaleString()}
          </h3>
          <p className="text-slate-400 text-[9px] font-bold mt-1 uppercase">Bandejas en uso</p>
          <Hash size={70} className="absolute -right-2 -bottom-2 text-slate-50 rotate-12" />
        </div>
      </div>

      {/* DISTRIBUCIÓN POR ETAPA (En Plantas Reales) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-[24px] border border-slate-50 shadow-sm text-center">
          <div className="bg-orange-50 w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 text-orange-500">
            <Sprout size={16} />
          </div>
          <p className="text-sm font-black text-slate-800">{plantasSemillero.toLocaleString()}</p>
          <p className="text-[8px] font-black text-slate-400 uppercase">Semillero</p>
        </div>
        <div className="bg-white p-4 rounded-[24px] border border-slate-50 shadow-sm text-center">
          <div className="bg-emerald-50 w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 text-emerald-500">
            <Home size={16} />
          </div>
          <p className="text-sm font-black text-slate-800">{plantasInvernadero.toLocaleString()}</p>
          <p className="text-[8px] font-black text-slate-400 uppercase">Invernadero</p>
        </div>
        <div className="bg-white p-4 rounded-[24px] border border-slate-50 shadow-sm text-center">
          <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 text-blue-500">
            <Boxes size={16} />
          </div>
          <p className="text-sm font-black text-slate-800">{plantasTelas.toLocaleString()}</p>
          <p className="text-[8px] font-black text-slate-400 uppercase">Telas</p>
        </div>
      </div>

      {/* STOCK POR VARIEDAD */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Volumen por Variedad (Plantas)</h3>
        <div className="space-y-5">
          {resumenPorVariedad.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-4 uppercase">Sin siembras activas</p>
          ) : (
            resumenPorVariedad.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{item.nombre}</span>
                  <span className="text-xs font-black text-emerald-600">{item.cantidad.toLocaleString()} u.</span>
                </div>
                <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${(item.cantidad / totalPlantasReales) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AVISO DE TRASPLANTE */}
      {listasParaSalir > 0 && (
        <div className="bg-orange-500 rounded-[24px] p-5 flex items-center gap-4 shadow-lg shadow-orange-100 animate-pulse">
          <div className="bg-white/20 p-2 rounded-xl text-white">
            <AlertTriangle size={20} />
          </div>
          <p className="text-xs text-white font-black uppercase tracking-tight leading-tight">
            Atención: Hay {listasParaSalir} bandejas listas para mover del invernadero a las telas.
          </p>
        </div>
      )}
    </div>
  );
};