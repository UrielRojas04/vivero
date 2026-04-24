import React from 'react';
import { Home, ArrowLeft, Lock } from 'lucide-react';
import { BandejaCard } from '../components/bandejas/BandejaCard';

export const InvernaderosPage = ({
  ubicaciones = [], bandejasTotales = [], bandejasFiltradas = [],
  seleccionado, setSeleccionado, userRole, onDelete, onMove, onEdit, onOpenDetail, loteADestacar, onSell
}) => {

  const estaLista = (bandeja) => {
    const totalDias = bandeja.variedad.diasInvernaderoSugeridos || 20;
    const hoy = new Date();
    const fechaSiembra = new Date(bandeja.fechaSiembra);
    return Math.floor((hoy - fechaSiembra) / (24 * 60 * 60 * 1000)) >= totalDias;
  };

  if (seleccionado) {
    const ocupadasTotal = bandejasTotales.filter(b => b.ubicacion?.id == seleccionado.id && !b.vendida).reduce((acc, b) => acc + (b.cantidad || 0), 0);
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="bg-emerald-600 p-6 rounded-[32px] text-white shadow-xl mb-6 relative">
          <button onClick={() => setSeleccionado(null)} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full"><ArrowLeft size={20}/></button>
          <p className="text-[9px] font-black uppercase opacity-80 mb-1">Invernadero</p>
          <div className="flex justify-between items-end">
            <h2 className="text-2xl font-black uppercase tracking-tighter">{seleccionado.nombre}</h2>
            <p className="text-[10px] font-black uppercase bg-white/20 px-3 py-1 rounded-lg">{ocupadasTotal} / {seleccionado.capacidadMax} Bands</p>
          </div>
        </div>

        <div className="grid gap-3">
          {bandejasFiltradas.length > 0 ? (
            bandejasFiltradas.map(item => (
              <div key={item.id} id={`card-${item.codigoLote}`} className={loteADestacar === item.codigoLote ? 'highlight-card' : ''}>
                <BandejaCard
                  bandeja={item}
                  userRole={userRole}
                  onDelete={onDelete}
                  onMoveToTelas={onMove}
                  onEdit={onEdit}
                  onOpenDetail={onOpenDetail}
                  onSell={() => onSell(item)}
                />
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin resultados en esta zona</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 animate-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Zonas de Invernadero</h3>
      <div className="space-y-4">
        {ubicaciones.filter(u => u.tipo === 'INVERNADERO').map(inv => {
          const isBlocked = inv.bloqueada;
          const bandejasDeZona = bandejasTotales.filter(b => b.ubicacion?.id == inv.id && !b.vendida);
          const ocupadas = bandejasDeZona.reduce((acc, b) => acc + (b.cantidad || 0), 0);
          const porcentaje = Math.min(100, Math.round((ocupadas / (inv.capacidadMax || 1)) * 100));
          const tieneBandejasListas = bandejasDeZona.some(estaLista);

          return (
            <div key={inv.id} onClick={isBlocked ? null : () => setSeleccionado(inv)} className={`p-5 rounded-[28px] border transition-all ${isBlocked ? 'bg-red-50 border-red-200 opacity-75' : `bg-white cursor-pointer active:scale-95 border-slate-100 shadow-sm ${tieneBandejasListas ? 'border-orange-400 ring-2 ring-orange-400' : ''}`}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${isBlocked ? 'bg-red-600 text-white' : (tieneBandejasListas ? 'bg-orange-100 text-orange-600' : 'bg-emerald-50 text-emerald-600')}`}><Home size={20}/></div>
                  <div>
                    <p className="font-black uppercase text-slate-800">{inv.nombre}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">{isBlocked ? 'BLOQUEADO' : `${ocupadas} / ${inv.capacidadMax} Bands`}</p>
                  </div>
                </div>
                {!isBlocked && <div className={`text-xs font-black ${porcentaje >= 90 ? 'text-red-500' : 'text-emerald-500'}`}>{porcentaje}%</div>}
              </div>
              {!isBlocked && <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${porcentaje >= 90 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${porcentaje}%` }} /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};