import React from 'react';
import { Grid, Trash2 } from 'lucide-react';

export const TipoBandejaCard = ({ tipo, onDelete }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
    <div className="flex items-center gap-4">
      <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
        <Grid size={20} />
      </div>
      <div>
        <p className="font-black text-slate-700">{tipo.celdas} Celdas</p>
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{tipo.descripcion || 'Sin descripción'}</p>
      </div>
    </div>
    <button onClick={() => onDelete(tipo.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
      <Trash2 size={18} />
    </button>
  </div>
);