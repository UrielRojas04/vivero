import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export const ConfirmarEliminarModal = ({ isOpen, onClose, onConfirm, nombreItem }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xs rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-200 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
          <AlertTriangle size={40} />
        </div>

        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">¿Estás seguro?</h2>
        <p className="text-xs font-medium text-slate-500 leading-relaxed mb-8 px-2">
          Vas a eliminar la siembra de <span className="font-black text-slate-800">{nombreItem}</span>. Esta acción no se puede deshacer.
        </p>

        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-100 active:scale-95 transition-all"
          >
            <Trash2 size={18} /> Sí, Eliminar
          </button>

          <button
            onClick={onClose}
            className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};