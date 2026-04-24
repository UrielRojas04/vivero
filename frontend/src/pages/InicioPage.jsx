import React from 'react';
import {
  Sprout, Home, Boxes, Search, Zap,
  Clock, Star, ArrowRight, LayoutGrid
} from 'lucide-react'; // LayoutGrid añadido aquí
import { BandejaCard } from '../components/bandejas/BandejaCard';

export const InicioPage = ({
  items, busqueda, userRole, onEdit, onDelete, onSell, onMove, onAssign, onOpenDetail, onLocationClick
}) => {

  // 1. LÓGICA DE FILTRADO PARA LOS CARRUSELES
  const nuevasSiembras = [...items].sort((a, b) => b.id - a.id).slice(0, 5);

  const prioridades = items.filter(b => {
    const totalDias = b.variedad?.diasInvernaderoSugeridos || 20;
    const fechaInicio = new Date(b.fechaSiembra);
    const hoy = new Date();
    const diasTranscurridos = Math.floor((hoy - fechaInicio) / (24 * 60 * 60 * 1000));
    return diasTranscurridos >= totalDias && !b.vendida;
  }).slice(0, 5);

  // --- VISTA DE BUSCADOR ACTIVO ---
  if (busqueda !== '') {
    const grupos = [
        { label: 'SEMILLERO', icon: <Sprout size={16}/>, color: 'text-orange-500', filter: (b) => !b.ubicacion && !b.enTelas },
        { label: 'INVERNADERO', icon: <Home size={16}/>, color: 'text-emerald-600', filter: (b) => b.ubicacion?.tipo === 'INVERNADERO' && !b.enTelas },
        { label: 'TELA', icon: <Boxes size={16}/>, color: 'text-blue-600', filter: (b) => b.enTelas }
    ];

    return (
      <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500 pb-20">
        {grupos.map(group => {
          const groupItems = items.filter(group.filter);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.label} className="space-y-4 px-2">
              <div className="flex items-center gap-2">
                <div className={`${group.color} bg-white p-2 rounded-xl shadow-sm border border-slate-100`}>{group.icon}</div>
                <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${group.color}`}>{group.label} ({groupItems.length})</h3>
              </div>
              <div className="grid gap-3">
                {groupItems.map(item => (
                  <BandejaCard
                    key={item.id}
                    bandeja={item}
                    userRole={userRole}
                    onDelete={onDelete}
                    onSell={() => onSell(item)}
                    onMoveToTelas={() => onMove(item)}
                    onAssignLocation={() => onAssign(item)}
                    onEdit={() => onEdit(item)}
                    onOpenDetail={onOpenDetail}
                    showLocation={true}
                    onLocationClick={(u) => onLocationClick(u, item.codigoLote)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // --- VISTA PRINCIPAL MODERNA (RESUMEN) ---
  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">

      {/* SECCIÓN 1: NOVEDADES (Carrusel horizontal) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
              <Zap size={16} fill="currentColor" />
            </div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Últimos Registros</h2>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-lg">Recientes</span>
        </div>

        <div className="flex gap-4 overflow-x-auto px-2 pb-4 no-scrollbar snap-x touch-pan-x">
          {nuevasSiembras.length > 0 ? (
            nuevasSiembras.map(item => (
              <div key={item.id} className="min-w-[300px] snap-center">
                <BandejaCard
                  bandeja={item}
                  userRole={userRole}
                  onDelete={onDelete}
                  onSell={() => onSell(item)}
                  onMoveToTelas={() => onMove(item)}
                  onAssignLocation={() => onAssign(item)}
                  onEdit={() => onEdit(item)}
                  onOpenDetail={onOpenDetail}
                />
              </div>
            ))
          ) : (
            <div className="w-full py-10 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
               <p className="text-[10px] font-black text-slate-300 uppercase">No hay siembras registradas</p>
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN 2: PRIORIDADES (Listas para salir) */}
      {prioridades.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600">
                <Star size={16} fill="currentColor" />
              </div>
              <h2 className="text-sm font-black text-emerald-600 uppercase tracking-tighter">Listas para Mover / Vender</h2>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto px-2 pb-6 no-scrollbar snap-x touch-pan-x">
            {prioridades.map(item => (
              <div key={item.id} className="min-w-[300px] snap-center relative">
                <div className="absolute -top-1 -right-1 z-10">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
                <BandejaCard
                  bandeja={item}
                  userRole={userRole}
                  onDelete={onDelete}
                  onSell={() => onSell(item)}
                  onMoveToTelas={() => onMove(item)}
                  onAssignLocation={() => onAssign(item)}
                  onEdit={() => onEdit(item)}
                  onOpenDetail={onOpenDetail}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PANEL DE CONSEJOS PARA EMPLEADOS (Alto Contraste) */}
      <div className="mx-2 bg-slate-900 rounded-[32px] p-6 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
         <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                <Sprout size={14} className="text-emerald-400" />
              </div>
              <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em]">Guía Operativa</p>
            </div>
            <p className="text-[13px] font-medium leading-relaxed text-slate-200">
              Las bandejas con <span className="text-emerald-400 font-black">borde esmeralda</span> están listas para su siguiente etapa. Deslizá los carruseles para ver qué tareas hay pendientes hoy.
            </p>
         </div>
         <div className="absolute -right-6 -bottom-6 opacity-10">
           <LayoutGrid size={140} className="rotate-12" />
         </div>
      </div>
    </div>
  );
};