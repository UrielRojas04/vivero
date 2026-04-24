import React from 'react';
import { Trash2, Edit3, ArrowRight, User, MapPin, Calendar } from 'lucide-react';

export const BandejaCard = ({
  bandeja, onDelete, onEdit, onSell, onMoveToTelas,
  onAssignLocation, onOpenDetail, userRole = 'ADMIN',
  showLocation = false,
  onLocationClick
}) => {
  const hoy = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const isAdmin = userRole === 'ADMIN';
  const isVendida = bandeja.vendida;
  const enTelas = bandeja.enTelas && !isVendida;

  // --- LÓGICA DE TIEMPOS Y PROGRESO ---
  const fechaSiembra = new Date(bandeja.fechaSiembra);
  const fechaListoParaTelas = new Date(bandeja.fechaEstimadaSalida);
  const diasInv = bandeja.variedad.diasInvernaderoSugeridos || 20;
  const diasTelas = bandeja.variedad.diasTelasSugeridos || 7;

  let progress = 0;
  let labelProgreso = "";
  let fechaMostrar = "";

  if (enTelas) {
    // Inicia desde que estuvo lista en invernadero, sin importar cuándo se movió realmente
    const diasDesdeListo = Math.max(0, Math.floor((hoy - fechaListoParaTelas) / msPerDay));
    progress = Math.min(100, Math.round((diasDesdeListo / diasTelas) * 100));
    labelProgreso = "Listo para Venta";

    // Cálculo de Fecha de Venta: Fecha Salida Inv + Días en Telas
    const fechaVenta = new Date(fechaListoParaTelas);
    fechaVenta.setDate(fechaVenta.getDate() + diasTelas);
    fechaMostrar = fechaVenta.toISOString().split('T')[0];
  } else {
    // Lógica estándar para Invernadero/Semillero
    const diasTranscurridos = Math.max(0, Math.floor((hoy - fechaSiembra) / msPerDay));
    progress = Math.min(100, Math.round((diasTranscurridos / diasInv) * 100));
    labelProgreso = "Salida Estimada";
    fechaMostrar = bandeja.fechaEstimadaSalida;
  }

  const status = isVendida ? 'sold' : (enTelas ? 'telas' : (bandeja.ubicacion ? 'invernadero' : 'semillero'));

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'S/D';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}`;
  };

  return (
    <div
      onClick={() => onOpenDetail(bandeja)}
      className={`p-5 rounded-[32px] border transition-all cursor-pointer active:scale-[0.97] shadow-sm ${
        status === 'semillero' ? 'bg-orange-50/40 border-orange-100' :
        status === 'telas' ? 'bg-blue-50/40 border-blue-100' :
        status === 'sold' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-100'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] font-black bg-slate-800 text-white px-3 py-1.5 rounded-xl uppercase truncate max-w-[110px] flex items-center gap-1">
              <User size={12} /> {bandeja.duenio || 'S/D'}
            </span>
            <span className="text-[11px] font-black bg-emerald-600 text-white px-3 py-1.5 rounded-xl uppercase">
              {bandeja.cantidad} Bands
            </span>
            {showLocation && bandeja.ubicacion && (
              <span onClick={(e) => { e.stopPropagation(); onLocationClick(bandeja.ubicacion); }} className="text-[11px] font-black bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl uppercase flex items-center gap-1">
                <MapPin size={12} /> {bandeja.ubicacion.nombre}
              </span>
            )}
            <span className="text-[11px] font-black bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl uppercase">
               #{bandeja.codigoLote}
            </span>
          </div>

          <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight truncate leading-tight">
            {bandeja.variedad.nombre}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {bandeja.tipoBandeja?.descripcion || 'Sin tipo'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-3 items-end ml-4" onClick={(e) => e.stopPropagation()}>
            {status === 'semillero' && (
              <button onClick={() => onAssignLocation(bandeja)} className="bg-orange-500 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase shadow-lg shadow-orange-200 active:scale-95 transition-transform">
                Ubicar <ArrowRight size={16}/>
              </button>
            )}
            {status === 'invernadero' && progress >= 100 && (
              <button onClick={() => onMoveToTelas(bandeja)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-200 active:scale-95 transition-transform">
                Trasladar
              </button>
            )}
            {status === 'telas' && progress >= 100 && (
              <button onClick={() => onSell(bandeja.id)} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                Vender
              </button>
            )}
            <div className="flex gap-4 mt-1 pr-1">
              <button onClick={() => onEdit(bandeja)} className="text-slate-300 hover:text-blue-500 p-1"><Edit3 size={20}/></button>
              <button onClick={() => onDelete(bandeja.id)} className="text-slate-200 hover:text-red-500 p-1"><Trash2 size={20}/></button>
            </div>
          </div>
        )}
      </div>

      {!isVendida && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner border border-slate-100/50">
              <div
                className={`h-full transition-all duration-1000 ${enTelas ? (progress >= 100 ? 'bg-blue-600' : 'bg-blue-400') : (progress >= 100 ? 'bg-emerald-500' : 'bg-orange-400')}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className={`text-xs font-black min-w-[35px] text-right ${progress >= 100 ? (enTelas ? 'text-blue-600' : 'text-emerald-600') : 'text-slate-400'}`}>
              {progress}%
            </span>
          </div>

          <div className="flex items-center justify-between px-1">
             <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar size={12} className={progress >= 100 ? (enTelas ? 'text-blue-500' : 'text-emerald-500') : 'text-slate-300'} />
                <span className="text-[10px] font-black uppercase tracking-widest">{labelProgreso}</span>
             </div>
             <span className={`text-[11px] font-black uppercase ${progress >= 100 ? (enTelas ? 'text-blue-600' : 'text-emerald-600') : 'text-slate-500'}`}>
                {formatearFecha(fechaMostrar)}
             </span>
          </div>
        </div>
      )}
    </div>
  );
};