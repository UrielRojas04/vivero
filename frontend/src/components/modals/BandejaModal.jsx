import React from 'react';
import { X, Sprout, Grid, Hash, User } from 'lucide-react';

export const BandejaModal = ({ isOpen, onClose, onSave, data, setData, variedades, tipos, editando }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
            {editando ? 'Editar Registro' : 'Nueva Siembra'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={onSave} className="p-6 space-y-5">
          {/* DUEÑO DE LA SIEMBRA */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <User size={12}/> Dueño (Cliente / Jefe)
            </label>
            <input
              type="text" required placeholder="Ej: Juan Pérez o Mi Jefe"
              className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 transition-all"
              value={data.duenio || ''}
              onChange={(e) => setData({...data, duenio: e.target.value})}
            />
          </div>

          {/* SELECCIÓN DE PLANTA */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <Sprout size={12}/> Variedad de Planta
            </label>
            <select
              required
              className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 transition-all appearance-none"
              value={data.variedadId}
              onChange={(e) => setData({...data, variedadId: e.target.value})}
            >
              <option value="">Seleccionar variedad...</option>
              {variedades.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <Grid size={12}/> Tipo
              </label>
              <select
                required
                className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 transition-all appearance-none"
                value={data.tipoBandejaId}
                onChange={(e) => setData({...data, tipoBandejaId: e.target.value})}
              >
                <option value="">Celdas...</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.celdas} celdas</option>)}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <Hash size={12}/> Cantidad
              </label>
              <input
                type="number" required min="1"
                className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none font-bold text-slate-700 transition-all"
                value={data.cantidad}
                onChange={(e) => setData({...data, cantidad: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 uppercase text-xs tracking-[0.2em] hover:bg-emerald-700 active:scale-95 transition-all">
            {editando ? 'Actualizar' : 'Confirmar Siembra'}
          </button>
        </form>
      </div>
    </div>
  );
};