import React from 'react';
import { Home, Boxes, Lock, Settings, Trash2, AlertCircle } from 'lucide-react';

export const UbicacionCard = ({ ubicacion, onDelete, onEdit, estaOcupada }) => {
  const isBlocked = ubicacion.bloqueada;
  const isGreenhouse = ubicacion.tipo === 'INVERNADERO';

  return (
    <div className={`p-5 rounded-[28px] border transition-all duration-300 ${
      isBlocked
        ? 'bg-red-50/50 border-red-100 shadow-inner'
        : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
    }`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
            isBlocked
              ? 'bg-red-600 text-white shadow-lg shadow-red-100'
              : (isGreenhouse ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')
          }`}>
            {isBlocked ? <Lock size={24} /> : (isGreenhouse ? <Home size={24} /> : <Boxes size={24} />)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className={`font-black uppercase tracking-tighter text-lg ${isBlocked ? 'text-red-700' : 'text-slate-800'}`}>
                {ubicacion.nombre}
              </h4>
              {estaOcupada && (
                <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded-md uppercase">Ocupado</span>
              )}
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isBlocked ? 'text-red-300' : 'text-slate-400'}`}>
              {isBlocked ? 'ZONA FUERA DE SERVICIO' : `${ubicacion.tipo} • CAP: ${ubicacion.capacidadMax}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(ubicacion)}
            className={`p-3 rounded-2xl transition-all ${isBlocked ? 'text-red-300 hover:bg-red-100' : 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50'}`}
          >
            <Settings size={20} />
          </button>

          <button
            disabled={estaOcupada}
            onClick={() => onDelete(ubicacion)}
            className={`p-3 rounded-2xl transition-all ${
              estaOcupada
                ? 'text-slate-100 cursor-not-allowed'
                : 'text-slate-300 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            {estaOcupada ? <AlertCircle size={20} /> : <Trash2 size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};