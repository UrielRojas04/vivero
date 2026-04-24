import React from 'react';
import { Sprout, Home, Boxes, Search } from 'lucide-react';
import { BandejaCard } from '../components/bandejas/BandejaCard';

export const InicioPage = ({ items, busqueda, userRole, onEdit, onDelete, onSell, onMove, onAssign, onOpenDetail, onLocationClick }) => {
  if (busqueda === '') {
    return (
      <div className="bg-emerald-50 rounded-[32px] p-10 text-center border-2 border-dashed border-emerald-100 animate-in fade-in zoom-in duration-300">
        <Search size={40} className="mx-auto text-emerald-300 mb-4" />
        <h2 className="text-emerald-800 font-black uppercase tracking-tight">Buscador Global</h2>
        <p className="text-emerald-600 text-xs mt-2 font-medium tracking-tight">Escribí planta + dueño para buscar (ej: "Lechuga Juan")</p>
      </div>
    );
  }

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
          <div key={group.label} className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <div className={`${group.color} bg-white p-1.5 rounded-lg shadow-sm border border-slate-100`}>{group.icon}</div>
              <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${group.color}`}>{group.label} ({groupItems.length})</h3>
            </div>
            <div className="grid gap-3">
              {groupItems.map(item => (
                <BandejaCard
                  key={item.id}
                  bandeja={item}
                  userRole={userRole}
                  onDelete={onDelete}
                  onSell={onSell}
                  onMoveToTelas={onMove}
                  onAssignLocation={onAssign}
                  onEdit={onEdit}
                  onOpenDetail={onOpenDetail}
                  showLocation={true}
                  // CAMBIO: Ahora pasamos el código de lote junto a la ubicación
                  onLocationClick={(ubicacion) => onLocationClick(ubicacion, item.codigoLote)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};