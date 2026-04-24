import React from 'react';
import { Boxes, ArrowLeft, Lock } from 'lucide-react';
import { BandejaCard } from '../components/bandejas/BandejaCard';

export const TelasPage = ({
  ubicaciones = [], bandejasTotales = [], bandejasFiltradas = [],
  seleccionada, setSeleccionada, userRole, onDelete, onEdit, onSell, onOpenDetail, loteADestacar, onMove
}) => {

  const estaListaParaVenta = (bandeja) => {
    const hoy = new Date();
    const fechaListoParaTelas = new Date(bandeja.fechaEstimadaSalida);
    fechaListoParaTelas.setDate(fechaListoParaTelas.getDate() + (bandeja.variedad.diasTelasSugeridos || 7));
    return hoy >= fechaListoParaTelas;
  };

  if (seleccionada) {
    const ocupacionReal = bandejasTotales.filter(b => b.ubicacion?.id == seleccionada.id && !b.vendida).reduce((acc, b) => acc + (b.cantidad || 0), 0);
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-xl mb-6 relative">
          <button onClick={() => setSeleccionada(null)} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full"><ArrowLeft size={20}/></button>
          <p className="text-[9px] font-black uppercase opacity-80 mb-1">Zona de Telas</p>
          <div className="flex justify-between items-end">
            <h2 className="text-2xl font-black uppercase tracking-tighter">{seleccionada.nombre}</h2>
            <p className="text-[10px] font-black uppercase bg-white/20 px-3 py-1 rounded-lg">{ocupacionReal} / {seleccionada.capacidadMax} Bands</p>
          </div>
        </div>

        <div className="grid gap-3">
          {bandejasFiltradas.length > 0 ? (
            bandejasFiltradas.map(item => (
              <div key={item.id} id={`card-${item.codigoLote}`} className={loteADestacar === item.codigoLote ? 'highlight-card' : ''}>
                <BandejaCard
                  bandeja={item}
                  userRole={userRole}
                  onDelete={onDelete} // Corregido
                  onSell={() => onSell(item)}
                  onMoveToTelas={() => onMove(item)} // Permite mover entre telas
                  onEdit={onEdit} // Corregido
                  onOpenDetail={onOpenDetail}
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
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Zonas de Stock Final (Telas)</h3>
      <div className="space-y-4">
        {ubicaciones.filter(u => u.tipo === 'TELA').map(tela => {
          const isBlocked = tela.bloqueada;
          const bandejasDeZona = bandejasTotales.filter(b => b.ubicacion?.id == tela.id && !b.vendida);
          const ocupadas = bandejasDeZona.reduce((acc, b) => acc + (b.cantidad || 0), 0);
          const tieneBandejasListas = bandejasDeZona.some(estaListaParaVenta);

          return (
            <div key={tela.id} onClick={isBlocked ? null : () => setSeleccionada(tela)} className={`p-5 rounded-[28px] border transition-all ${isBlocked ? 'bg-red-50 border-red-200 opacity-75' : `bg-white cursor-pointer active:scale-95 border-slate-100 shadow-sm ${tieneBandejasListas ? 'border-blue-400 ring-2 ring-blue-400' : ''}`}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${isBlocked ? 'bg-red-600 text-white' : (tieneBandejasListas ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-600')}`}><Boxes size={20}/></div>
                  <div>
                    <p className="font-black uppercase text-slate-800">{tela.nombre}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">{isBlocked ? 'BLOQUEADO' : `${ocupadas} / ${tela.capacidadMax} Bands`}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};