// src/components/modals/ConfirmacionAccionModal.jsx
import React from 'react';
import { AlertCircle, X, Check } from 'lucide-react';

export const ConfirmacionAccionModal = ({ isOpen, onClose, onConfirm, titulo, mensaje, color = "red" }) => {
  if (!isOpen) return null;

  const colorClass = color === "red" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600";
  const btnClass = color === "red" ? "bg-red-600 shadow-red-100" : "bg-slate-900 shadow-slate-100";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xs rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-200 text-center">
        <div className={`w-16 h-16 ${colorClass} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">{titulo}</h2>
        <p className="text-[10px] font-bold text-slate-400 leading-relaxed mb-8 px-2 uppercase tracking-widest">{mensaje}</p>
        <div className="space-y-3">
          <button onClick={onConfirm} className={`w-full ${btnClass} text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-lg`}>
            Confirmar
          </button>
          <button onClick={onClose} className="w-full py-2 text-slate-300 font-black uppercase text-[10px] tracking-widest">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};