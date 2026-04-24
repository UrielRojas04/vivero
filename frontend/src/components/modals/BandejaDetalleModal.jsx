import React from 'react';
import { X, Calendar, User, ClipboardCheck, Truck, FileText, Grid, MapPin, ShieldCheck } from 'lucide-react';

export const BandejaDetalleModal = ({ isOpen, onClose, bandeja, bandejas = [] }) => {
  if (!isOpen || !bandeja) return null;

  const totalPlantas = bandeja.cantidad * (bandeja.tipoBandeja?.celdas || 0);
  const otrasUbicaciones = bandejas.filter(b => b.codigoLote === bandeja.codigoLote && b.id !== bandeja.id && !b.vendida);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">

        {/* HEADER */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-start bg-slate-50/50">
          <div>
            <span className="text-[10px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md uppercase mb-2 inline-block">
              Lote #{bandeja.codigoLote}
            </span>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">
              {bandeja.variedad.nombre}
            </h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white hover:bg-slate-100 rounded-2xl text-slate-400 shadow-sm active:scale-90 transition-transform"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">

          {/* DISTRIBUCIÓN (Si el lote está separado) */}
          {otrasUbicaciones.length > 0 && (
            <div className="bg-purple-50 border border-purple-100 rounded-[32px] p-5">
              <h3 className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <MapPin size={12}/> El resto de la siembra está en:
              </h3>
              <div className="space-y-2">
                {otrasUbicaciones.map(p => (
                  <div key={p.id} className="flex justify-between items-center text-xs font-bold text-purple-700 bg-white/60 px-4 py-2 rounded-xl">
                    <span className="uppercase">{p.ubicacion?.nombre || 'Semillero'}</span>
                    <span>{p.cantidad} bands</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DATOS TÉCNICOS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-5 rounded-[32px] border border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Grid size={14}/> <span className="text-[9px] font-black uppercase">En esta zona</span>
              </div>
              <p className="font-black text-slate-700 text-xl">{bandeja.cantidad} uds.</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{bandeja.tipoBandeja?.celdas} celdas</p>
            </div>

            <div className="bg-emerald-50 p-5 rounded-[32px] border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <FileText size={14}/> <span className="text-[9px] font-black uppercase">Plantas</span>
              </div>
              <p className="font-black text-emerald-700 text-xl">{totalPlantas.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-emerald-400 mt-1 uppercase">Estimadas</p>
            </div>
          </div>

          {/* FECHAS */}
          <div className="flex items-center gap-4 bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm">
            <div className="bg-orange-50 p-3 rounded-2xl text-orange-500"><Calendar size={24}/></div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Siembra original</p>
              <p className="font-bold text-slate-700">{bandeja.fechaSiembra}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Salida Est.</p>
              <p className="font-bold text-emerald-600">{bandeja.fechaEstimadaSalida}</p>
            </div>
          </div>

          {/* RESPONSABLES (AUDITORÍA ACUMULATIVA) */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
              <ShieldCheck size={14}/> Historial de Responsables
            </h3>
            <div className="bg-slate-50 rounded-[32px] p-6 space-y-4 border border-slate-100 shadow-inner">

              {/* CREADOR */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm"><FileText size={18}/></div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Siembra registrada por</p>
                  <p className="text-sm font-bold text-slate-700 uppercase">{bandeja.usuarioCreador || 'S/D'}</p>
                </div>
              </div>

              {/* ASIGNADORES (INVERNADERO) */}
              {bandeja.usuarioAsignador && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-sm"><ClipboardCheck size={18}/></div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">
                      {bandeja.usuarioAsignador.includes(',') ? 'Responsables de Ubicación' : 'Ubicado por'}
                    </p>
                    <p className="text-sm font-bold text-slate-700 uppercase">{bandeja.usuarioAsignador}</p>
                  </div>
                </div>
              )}

              {/* TRASLADADORES (TELAS) */}
              {bandeja.usuarioTrasladador && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm"><Truck size={18}/></div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">
                      {bandeja.usuarioTrasladador.includes(',') ? 'Responsables de Traslado' : 'Trasladado a tela por'}
                    </p>
                    <p className="text-sm font-bold text-slate-700 uppercase">{bandeja.usuarioTrasladador}</p>
                  </div>
                </div>
              )}

              {/* DUEÑO */}
              <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white shadow-sm"><User size={18}/></div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Dueño de la planta</p>
                  <p className="text-sm font-bold text-slate-800 uppercase">{bandeja.duenio || 'Sin asignar'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* OBSERVACIONES */}
          {bandeja.observaciones && (
            <div className="bg-yellow-50/50 border border-yellow-100 p-6 rounded-[32px]">
              <p className="text-xs font-medium text-slate-600 italic">"{bandeja.observaciones}"</p>
            </div>
          )}

          <button onClick={onClose} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs active:scale-95 transition-all">Cerrar</button>
        </div>
      </div>
    </div>
  );
};