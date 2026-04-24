import React, { useState, useEffect } from 'react';
import {
  X, Sprout, Home, Boxes, ShoppingCart,
  ArrowRight, Loader2, User, Edit3, Trash2
} from 'lucide-react';
import api from '../../api/config';

export const HistorialLoteModal = ({ isOpen, onClose, codigoLote }) => {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen && codigoLote) {
      setCargando(true);
      api.get(`/bandejas/historial/${codigoLote}`)
        .then(res => {
          // El backend devuelve los más recientes primero, los invertimos para el flujo
          setHistorial(res.data.reverse());
        })
        .catch(err => console.error("Error al obtener historial:", err))
        .finally(() => setCargando(false));
    }
  }, [isOpen, codigoLote]);

  // --- LÓGICA DE ICONOS MEJORADA ---
  const getIcon = (step) => {
    if (step.tipo === 'EDICION') return <Edit3 size={18} />;
    if (step.tipo === 'BORRADO') return <Trash2 size={18} />;

    const destino = step.destino || '';
    if (destino === 'Semillero') return <Sprout size={18} />;
    if (destino.toLowerCase().includes('invernadero')) return <Home size={18} />;
    if (destino.toLowerCase().includes('tela') || destino === 'Telas') return <Boxes size={18} />;
    if (destino === 'CLIENTE') return <ShoppingCart size={18} />;
    return <ArrowRight size={18} />;
  };

  // --- LÓGICA DE ETIQUETAS MEJORADA ---
  const getLabelText = (step) => {
    if (step.tipo === 'EDICION') return 'Editado';
    if (step.tipo === 'BORRADO') return 'Eliminado';
    if (step.destino === 'Semillero') return 'Siembra';
    return step.destino;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">

        {/* HEADER */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <p className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] mb-1">Ruta de Vida del Lote</p>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">#{codigoLote}</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white hover:bg-slate-100 rounded-2xl text-slate-400 shadow-sm active:scale-90 transition-all">
            <X size={20}/>
          </button>
        </div>

        <div className="p-8">
          {cargando ? (
            <div className="py-20 text-center">
              <Loader2 className="animate-spin mx-auto text-purple-600" />
            </div>
          ) : (
            <div className="flex items-start gap-0 overflow-x-auto pb-8 pt-4 no-scrollbar">
              {historial.map((step, idx) => (
                <div key={step.id} className="flex items-start flex-shrink-0">

                  {/* NODO DE MOVIMIENTO */}
                  <div className="flex flex-col items-center w-32 text-center space-y-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                      idx === historial.length - 1
                        ? (step.tipo === 'BORRADO' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white')
                        : 'bg-white text-slate-400 border border-slate-100'
                    }`}>
                      {getIcon(step)}
                    </div>

                    <div className="px-2">
                      {/* ETIQUETA DINÁMICA: EDITADO / ELIMINADO / ZONA */}
                      <p className={`text-[10px] font-black uppercase tracking-tighter leading-tight ${
                        idx === historial.length - 1 ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        {getLabelText(step)}
                      </p>

                      {/* Muestra la cantidad original debajo de la etiqueta si no es borrado */}
                      {step.tipo !== 'BORRADO' && (
                        <p className="text-[9px] font-black text-slate-300 uppercase mt-0.5">
                          {step.cantidad} uds
                        </p>
                      )}

                      <p className="text-[8px] font-bold text-slate-300 mt-1 uppercase">
                        {new Date(step.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* FLECHA CONECTORA */}
                  {idx < historial.length - 1 && (
                    <div className="w-12 h-14 flex items-center justify-center">
                      <div className="h-0.5 w-full bg-slate-100 relative">
                        <ArrowRight size={10} className="absolute -right-1 -top-1 text-slate-200" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AUDITORÍA INFERIOR */}
          {!cargando && historial.length > 0 && (
            <div className={`mt-4 rounded-3xl p-6 border space-y-4 ${
              historial[historial.length-1].tipo === 'BORRADO'
                ? 'bg-red-50 border-red-100'
                : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Suceso</span>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                  historial[historial.length-1].tipo === 'BORRADO'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {historial[historial.length - 1].tipo}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400">
                  <User size={18}/>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Responsable de esta acción</p>
                  <p className="text-sm font-bold text-slate-700 uppercase">
                    {historial[historial.length - 1].usuario}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button onClick={onClose} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">
            Cerrar Historial
          </button>
        </div>
      </div>
    </div>
  );
};