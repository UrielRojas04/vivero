import React from 'react';
import { X, Save, Lock, Unlock, AlertCircle } from 'lucide-react';

export const UbicacionModal = ({ isOpen, onClose, onSave, data, setData, estaOcupada }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Configurar Zona</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        {estaOcupada && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={18} />
            <p className="text-[10px] font-black text-amber-700 uppercase leading-tight">
              Esta zona tiene bandejas activas. No puedes cambiar la capacidad ni bloquearla hasta que esté vacía.
            </p>
          </div>
        )}

        <form onSubmit={onSave} className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre</label>
            <input
              required type="text"
              className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              value={data.nombre || ''}
              onChange={(e) => setData({...data, nombre: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Capacidad</label>
              <input
                disabled={estaOcupada}
                required type="number"
                className={`w-full p-4 rounded-xl border font-bold outline-none ${estaOcupada ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 focus:ring-2 focus:ring-emerald-500'}`}
                value={data.capacidadMax || ''}
                onChange={(e) => setData({...data, capacidadMax: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo</label>
              <select
                disabled={estaOcupada}
                className={`w-full p-4 rounded-xl border font-bold outline-none ${estaOcupada ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 focus:ring-2 focus:ring-emerald-500'}`}
                value={data.tipo || 'INVERNADERO'}
                onChange={(e) => setData({...data, tipo: e.target.value})}
              >
                <option value="INVERNADERO">Invernadero</option>
                <option value="TELA">Tela</option>
              </select>
            </div>
          </div>

          <div
            onClick={() => !estaOcupada && setData({...data, bloqueada: !data.bloqueada})}
            className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${estaOcupada ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${data.bloqueada ? 'border-red-100 bg-red-50 text-red-600' : 'border-slate-50 bg-slate-50 text-slate-500'}`}
          >
            <span className="text-[10px] font-black uppercase">{data.bloqueada ? 'En Desuso (Bloqueada)' : 'Zona Activa'}</span>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${data.bloqueada ? 'bg-red-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${data.bloqueada ? 'left-5' : 'left-1'}`} />
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
            Guardar Cambios
          </button>
        </form>
      </div>
    </div>
  );
};