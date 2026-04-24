import React, { useState } from 'react';
import {
  Plus, Leaf, Home, Grid, Trash2,
  Layers, Clock, Boxes, Lock
} from 'lucide-react';
import api from '../api/config';
import { VariedadModal } from '../components/modals/VariedadModal';
import { UbicacionModal } from '../components/modals/UbicacionModal';
import { UbicacionCard } from '../components/ubicaciones/UbicacionCard';
import { ConfirmacionAccionModal } from '../components/modals/ConfirmacionAccionModal';

export const ConfiguracionPage = ({
  busqueda = '', variedades = [], tiposBandeja = [], ubicaciones = [], bandejas = [], fetchData, onError
}) => {
  const [seccion, setSeccion] = useState('variedades');

  // Estados para Control de Modales
  const [modalUbi, setModalUbi] = useState(false);
  const [modalVar, setModalVar] = useState(false);
  const [modalTipo, setModalTipo] = useState(false);

  // Estado para el modal de confirmación de eliminación
  const [confirmarEliminar, setConfirmarEliminar] = useState({
    isOpen: false, id: null, ruta: '', mensaje: '', titulo: ''
  });

  const [editId, setEditId] = useState(null);
  const [formUbi, setFormUbi] = useState({ nombre: '', tipo: 'INVERNADERO', capacidadMax: 100, bloqueada: false });
  const [formVar, setFormVar] = useState({ nombre: '', diasInvernaderoSugeridos: 20, diasTelasSugeridos: 7 });
  const [formTipo, setFormTipo] = useState({ descripcion: '', celdas: 128 });

  // --- LÓGICA DE ELIMINACIÓN ---
  const solicitarEliminacion = (ruta, item, titulo, mensaje) => {
    const id = typeof item === 'object' ? item.id : item;
    // RUTA RELATIVA: api/config ya tiene el /api
    setConfirmarEliminar({ isOpen: true, id, ruta, titulo, mensaje });
  };

  const ejecutarEliminacion = async () => {
    try {
      await api.delete(`${confirmarEliminar.ruta}/${confirmarEliminar.id}`);
      setConfirmarEliminar({ ...confirmarEliminar, isOpen: false });
      fetchData();
    } catch (e) {
      setConfirmarEliminar({ ...confirmarEliminar, isOpen: false });
      const msg = e.response?.data?.message || "Error al eliminar el registro.";
      onError(msg);
    }
  };

  // --- AGRUPACIÓN DE ZONAS ---
  const invernaderos = ubicaciones.filter(u => u.tipo === 'INVERNADERO' && !u.bloqueada);
  const telas = ubicaciones.filter(u => u.tipo === 'TELA' && !u.bloqueada);
  const bloqueados = ubicaciones.filter(u => u.bloqueada);

  const checkOcupada = (uId) => bandejas.some(b => b.ubicacion?.id === uId && !b.vendida && b.cantidad > 0);

  const renderHeader = (titulo, icono, color, onClickAdd) => (
    <div className="flex items-center justify-between mb-6 animate-in fade-in slide-in-from-left duration-500">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-2xl ${color} text-white shadow-lg`}>{icono}</div>
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{titulo}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión de Catálogo</p>
        </div>
      </div>
      <button
        onClick={onClickAdd}
        className="group relative flex items-center gap-2 bg-slate-900 text-white pl-4 pr-5 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-600 transition-all active:scale-90 shadow-xl overflow-hidden"
      >
        <Plus size={16} /> Nuevo
      </button>
    </div>
  );

  return (
    <div className="space-y-8 pb-24">
      {/* TABS DE NAVEGACIÓN */}
      <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-[28px] border border-slate-100 mx-2 shadow-inner">
        {[
          { id: 'variedades', label: 'Plantas', icon: <Leaf size={14}/> },
          { id: 'zonas', label: 'Zonas', icon: <Home size={14}/> },
          { id: 'tipos', label: 'Bandejas', icon: <Grid size={14}/> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSeccion(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[22px] text-[10px] font-black uppercase transition-all ${
              seccion === tab.id ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="px-2 space-y-4">
        {/* SECCIÓN VARIEDADES */}
        {seccion === 'variedades' && (
          <div className="animate-in fade-in duration-500">
            {renderHeader("Variedades", <Leaf size={20}/>, "bg-emerald-500", () => {
              setFormVar({ nombre: '', diasInvernaderoSugeridos: 20, diasTelasSugeridos: 7 });
              setEditId(null); setModalVar(true);
            })}
            <div className="grid gap-3">
              {variedades.filter(v => v.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(v => (
                <div key={v.id} className="bg-white p-5 rounded-[28px] border border-slate-100 flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Leaf size={20} /></div>
                    <div>
                      <h4 className="font-black text-slate-800 uppercase text-sm">{v.nombre}</h4>
                      <div className="flex items-center gap-3 mt-1 text-slate-400">
                        <span className="text-[9px] font-bold uppercase tracking-tighter"><Clock size={10} className="inline mr-1"/> {v.diasInvernaderoSugeridos}d Inv</span>
                        <span className="text-[9px] font-bold uppercase tracking-tighter"><Boxes size={10} className="inline mr-1"/> {v.diasTelasSugeridos}d Tela</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => solicitarEliminacion('variedades', v.id, "¿Eliminar Planta?", "No puedes borrar una planta con siembras activas.")} className="p-3 text-slate-200 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {seccion === 'zonas' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            {renderHeader("Zonas / Ubicaciones", <Home size={20}/>, "bg-blue-500", () => { setFormUbi({ nombre:'', tipo:'INVERNADERO', capacidadMax:100, bloqueada:false }); setEditId(null); setModalUbi(true); })}

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2"><Home size={12}/> Invernaderos ({invernaderos.length})</h3>
              {invernaderos.map(u => (
                <UbicacionCard key={u.id} ubicacion={u} estaOcupada={checkOcupada(u.id)} onEdit={(item) => { setFormUbi({...item}); setEditId(item.id); setModalUbi(true); }} onDelete={(uObj) => solicitarEliminacion('ubicaciones', uObj, "¿Eliminar Zona?", "No se puede borrar una zona con bandejas.")} />
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2"><Boxes size={12}/> Zonas de Tela ({telas.length})</h3>
              {telas.map(u => (
                <UbicacionCard key={u.id} ubicacion={u} estaOcupada={checkOcupada(u.id)} onEdit={(item) => { setFormUbi({...item}); setEditId(item.id); setModalUbi(true); }} onDelete={(uObj) => solicitarEliminacion('ubicaciones', uObj, "¿Eliminar Zona?", "No se puede borrar una zona con bandejas.")} />
              ))}
            </div>

            {bloqueados.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2"><Lock size={12}/> Zonas Bloqueadas</h3>
                {bloqueados.map(u => (
                  <UbicacionCard key={u.id} ubicacion={u} estaOcupada={checkOcupada(u.id)} onEdit={(item) => { setFormUbi({...item}); setEditId(item.id); setModalUbi(true); }} onDelete={(uObj) => solicitarEliminacion('ubicaciones', uObj, "¿Eliminar Zona?", "No se puede borrar una zona con bandejas.")} />
                ))}
              </div>
            )}
          </div>
        )}

        {seccion === 'tipos' && (
          <div className="animate-in fade-in duration-500">
            {renderHeader("Tipos de Bandeja", <Grid size={20}/>, "bg-orange-500", () => { setFormTipo({ descripcion: '', celdas: 128 }); setEditId(null); setModalTipo(true); })}
            <div className="grid gap-3">
              {tiposBandeja.map(t => (
                <div key={t.id} className="bg-white p-5 rounded-[28px] border border-slate-100 flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">{t.celdas}</div>
                    <h4 className="font-black text-slate-800 uppercase text-sm">{t.descripcion || 'Sin descripción'}</h4>
                  </div>
                  <button onClick={() => solicitarEliminacion('tipos-bandeja', t.id, "¿Eliminar Formato?", "No puedes borrar un formato en uso.")} className="p-3 text-slate-200 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmacionAccionModal isOpen={confirmarEliminar.isOpen} onClose={() => setConfirmarEliminar({ ...confirmarEliminar, isOpen: false })} onConfirm={ejecutarEliminacion} titulo={confirmarEliminar.titulo} mensaje={confirmarEliminar.mensaje} color="red" />

      <UbicacionModal
        isOpen={modalUbi} onClose={() => setModalUbi(false)} data={formUbi} setData={setFormUbi}
        estaOcupada={editId ? checkOcupada(editId) : false}
        onSave={async (e) => {
          e.preventDefault();
          try {
            const payload = {
              ...formUbi,
              capacidadMax: parseInt(formUbi.capacidadMax, 10) || 0
            };
            if (editId) {
              await api.put(`ubicaciones/${editId}`, payload);
            } else {
              // POST: Enviamos a la ruta relativa 'ubicaciones'
              await api.post('ubicaciones', payload);
            }
            setModalUbi(false); fetchData();
          } catch(err) { onError(err.response?.data?.message || "Error al procesar zona"); }
        }}
      />

      <VariedadModal
        isOpen={modalVar} onClose={() => setModalVar(false)} data={formVar} setData={setFormVar}
        onSave={async (e) => {
          e.preventDefault();
          try {
            await api.post('variedades', formVar);
            setModalVar(false); fetchData();
          } catch(err) { onError(err.response?.data?.message || "Error al guardar variedad"); }
        }}
      />

      {modalTipo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-800 uppercase mb-6 text-center">Nuevo Formato</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post('tipos-bandeja', formTipo);
                setModalTipo(false); fetchData();
              } catch(err) { onError("Error al guardar formato"); }
            }} className="space-y-4">
              <input required className="w-full p-4 rounded-xl bg-slate-50 border-none font-bold outline-none" placeholder="Descripción" value={formTipo.descripcion} onChange={e => setFormTipo({...formTipo, descripcion: e.target.value})} />
              <input required type="number" className="w-full p-4 rounded-xl bg-slate-50 border-none font-bold outline-none" placeholder="Celdas" value={formTipo.celdas} onChange={e => setFormTipo({...formTipo, celdas: e.target.value})} />
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase active:scale-95 transition-all">Guardar</button>
              <button type="button" onClick={() => setModalTipo(false)} className="w-full text-[10px] font-black uppercase text-slate-400 mt-2">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};