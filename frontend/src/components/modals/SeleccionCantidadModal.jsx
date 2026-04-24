import React, { useState, useEffect, useCallback, memo } from 'react';
import { Hash, ArrowRight, X } from 'lucide-react';

// Usamos memo para que el modal no se re-renderice si App.jsx cambia por otra razón
export const SeleccionCantidadModal = memo(({ isOpen, onClose, totalMax, onConfirm }) => {
  const [cantidad, setCantidad] = useState(1);

  // Sincronización inicial al abrir
  useEffect(() => {
    if (isOpen && totalMax) {
      setCantidad(totalMax);
    }
  }, [isOpen, totalMax]);

  // Manejador optimizado para el slider
  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setCantidad(val);
  };

  // Manejador para el input numérico
  const handleInputChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) setCantidad('');
    else setCantidad(Math.min(totalMax, Math.max(1, val)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 shadow-2xl">
      <div className="bg-white w-full max-w-xs rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">¿Cuánto mover?</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X size={20}/></button>
        </div>

        <p className="text-[10px] text-slate-400 font-bold uppercase text-center mb-8">
          Disponible: <span className="text-emerald-600">{totalMax || 0} bandejas</span>
        </p>

        <div className="space-y-8">
          {/* Slider Optimizado */}
          <div className="px-2">
            <input
              type="range"
              min="1"
              max={totalMax || 1}
              value={cantidad || 1}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between mt-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              <span>1 u.</span>
              <span>{totalMax} u.</span>
            </div>
          </div>

          {/* Input Numérico */}
          <div className="bg-slate-50 p-6 rounded-[24px] flex items-center justify-between border border-slate-100">
            <Hash size={20} className="text-slate-300" />
            <div className="flex flex-col items-end">
              <input
                type="number"
                className="bg-transparent border-none text-right font-black text-4xl text-slate-700 w-24 outline-none"
                value={cantidad}
                onChange={handleInputChange}
              />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Bandejas</span>
            </div>
          </div>

          <button
            onClick={() => onConfirm(cantidad)}
            disabled={!cantidad || cantidad < 1}
            className="w-full bg-emerald-600 text-white py-5 rounded-[20px] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50"
          >
            Confirmar <ArrowRight size={18}/>
          </button>
        </div>
      </div>
    </div>
  );
});