import React from 'react';
import { Sprout, Truck, FileText, ShoppingCart, User, Hash, ArrowRight } from 'lucide-react';

export const MovimientoCard = ({ mov, getLabelTipo, onOpenDetail }) => {

  const getConfig = (tipo) => {
    switch(tipo) {
      case 'REGISTRO': return { icon: Sprout, color: 'text-emerald-600', bgColor: 'bg-emerald-50', border: 'border-emerald-100', bgIcon: 'text-emerald-100' };
      case 'UBICACION': return { icon: FileText, color: 'text-orange-600', bgColor: 'bg-orange-50', border: 'border-orange-100', bgIcon: 'text-orange-100' };
      case 'TRASLADO': return { icon: Truck, color: 'text-purple-600', bgColor: 'bg-purple-50', border: 'border-purple-100', bgIcon: 'text-purple-100' };
      case 'VENTA': return { icon: ShoppingCart, color: 'text-blue-600', bgColor: 'bg-blue-50', border: 'border-blue-100', bgIcon: 'text-blue-100' };
      default: return { icon: Hash, color: 'text-slate-600', bgColor: 'bg-slate-50', border: 'border-slate-100', bgIcon: 'text-slate-100'};
    }
  };

  const config = getConfig(mov.tipo);
  const IconoPrincipal = config.icon;
  const fechaObj = new Date(mov.fecha);

  return (
    <div className={`relative group bg-white rounded-[30px] p-6 border ${config.border} shadow-sm active:scale-[0.98] transition-all overflow-hidden`}>
      <IconoPrincipal size={120} className={`absolute -right-8 -bottom-8 ${config.bgIcon} opacity-60 group-hover:scale-110 transition-transform duration-500`} strokeWidth={1} />

      <div className="relative z-10 space-y-5">
        <div className="flex justify-between items-center gap-4">
          <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${config.border} ${config.bgColor}`}>
            <IconoPrincipal size={16} className={config.color} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
              {getLabelTipo(mov.tipo)}
            </span>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold text-slate-700 uppercase">{fechaObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</p>
            <p className="text-[10px] font-medium text-slate-400">{fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1.5">
            {mov.variedadNombre || 'Siembra General'}
          </h3>
          <div className="flex items-center gap-3 text-slate-500">
            <div className="flex items-center gap-1">
              <Hash size={12} className="text-purple-400" />
              <span className="text-[11px] font-bold uppercase tracking-tight text-purple-700">{mov.codigoLote}</span>
            </div>
            <span className="text-slate-300">|</span>
            <p className="text-[11px] font-bold uppercase text-slate-600">
              <span className="text-sm font-black text-slate-800">{mov.cantidad}</span> Bandejas
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-dashed border-slate-100">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full border bg-white text-slate-500 border-slate-200 text-[10px] font-black uppercase tracking-tight">{mov.origen}</div>
            <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
            <div className="px-3 py-1 rounded-full border bg-slate-900 text-white border-slate-900 text-[10px] font-black uppercase tracking-tight">{mov.destino}</div>
          </div>
        </div>

        <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-black text-xs uppercase border-2 border-white ring-1 ring-slate-100">
              {mov.usuario.substring(0, 2)}
            </div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{mov.usuario}</p>
          </div>
          {/* BOTÓN AHORA FUNCIONAL */}
          <button
            onClick={() => onOpenDetail(mov.codigoLote)}
            className="text-[10px] font-black text-purple-600 uppercase tracking-tight bg-purple-50 px-4 py-2 rounded-xl border border-purple-100 active:scale-90 transition-transform"
          >
            Ver Historial
          </button>
        </div>
      </div>
    </div>
  );
};