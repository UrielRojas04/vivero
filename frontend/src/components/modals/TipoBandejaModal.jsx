import React from 'react';
import { X } from 'lucide-react';

export const TipoBandejaModal = ({ isOpen, onClose, onSave, data, setData }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Nuevo Tipo de Bandeja</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cantidad de Celdas</label>
            <input
              required type="number" placeholder="Ej: 325"
              className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              value={data.celdas} onChange={(e) => setData({...data, celdas: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Descripción corta</label>
            <input
              type="text" placeholder="Ej: Estándar Plástico"
              className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              value={data.descripcion} onChange={(e) => setData({...data, descripcion: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 uppercase text-xs tracking-widest">Guardar Tipo</button>
        </form>
      </div>
    </div>
  );
};