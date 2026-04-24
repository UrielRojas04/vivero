import React, { useState, useEffect, useCallback } from 'react';
import { Leaf, Plus, Sprout, Search, Loader2, BarChart3, Boxes, Home, LayoutGrid, User as UserIcon, LogOut, Settings, X, History, Lock } from 'lucide-react';
import api from './api/config';
import toast, { Toaster } from 'react-hot-toast';

// --- PÁGINAS ---
import { LoginPage } from './pages/LoginPage';
import { InicioPage } from './pages/InicioPage';
import { InvernaderosPage } from './pages/InvernaderosPage';
import { TelasPage } from './pages/TelasPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { StatsPage } from './pages/StatsPage';
import { MovimientosPage } from './pages/MovimientosPage';

// --- COMPONENTES Y MODALES ---
import { BandejaCard } from './components/bandejas/BandejaCard';
import { BandejaModal } from './components/modals/BandejaModal';
import { BandejaDetalleModal } from './components/modals/BandejaDetalleModal';
import { SeleccionCantidadModal } from './components/modals/SeleccionCantidadModal';
import { ConfirmarEliminarModal } from './components/modals/ConfirmarEliminarModal';
import { ConfirmarVentaModal } from './components/modals/ConfirmarVentaModal';
import { ConfirmacionAccionModal } from './components/modals/ConfirmacionAccionModal';

// --- APIS ---
import { getVariedades } from './api/variedadApi';
import { getBandejas, saveBandeja, deleteBandeja, sellBandeja, updateBandeja } from './api/bandejaApi';
import { getUbicaciones } from './api/ubicacionApi';
import { getTiposBandeja } from './api/tipoBandejaApi';

function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('inicio');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);

  const [variedades, setVariedades] = useState([]);
  const [bandejas, setBandejas] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [tiposBandeja, setTiposBandeja] = useState([]);

  const [loteADividir, setLoteADividir] = useState(null);
  const [cantidadElegida, setCantidadElegida] = useState(0);
  const [procesoActual, setProcesoActual] = useState(null);

  const [bandejaDetalle, setBandejaDetalle] = useState(null);
  const [trasladandoBandeja, setTrasladandoBandeja] = useState(null);
  const [asignandoLote, setAsignandoLote] = useState(null);
  const [loteADestacar, setLoteADestacar] = useState(null);
  const [loteAEliminar, setLoteAEliminar] = useState(null);
  const [loteAVender, setLoteAVender] = useState(null);

  // Estado para el modal de error de capacidad
  const [errorCapacidad, setErrorCapacidad] = useState({ isOpen: false, mensaje: '' });

  const [mostrarModalBandeja, setMostrarModalBandeja] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formBandeja, setFormBandeja] = useState({ variedadId: '', tipoBandejaId: '', cantidad: 1, duenio: '', observaciones: '' });

  const [invernaderoSeleccionado, setInvernaderoSeleccionado] = useState(null);
  const [telaSeleccionada, setTelaSeleccionada] = useState(null);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('vivero_user');
    localStorage.removeItem('vivero_token');
    setMostrarPerfil(false);
    setTab('inicio');
    toast.success("Sesión cerrada");
  }, []);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('vivero_token');
    if (!token) return;
    setCargando(true);
    try {
      const [v, b, u, t] = await Promise.all([getVariedades(), getBandejas(), getUbicaciones(), getTiposBandeja()]);
      setVariedades(v.data);
      setBandejas(b.data);
      setUbicaciones(u.data);
      setTiposBandeja(t.data);
    } catch (e) {
      if (e.response?.status === 403) handleLogout();
      else toast.error("Error de sincronización");
    } finally { setCargando(false); }
  }, [handleLogout]);

  useEffect(() => {
    const loggedUser = localStorage.getItem('vivero_user');
    if (loggedUser) { setUser(JSON.parse(loggedUser)); fetchData(); }
  }, [fetchData]);

  const handleLoginSuccess = (data) => {
    setUser(data.usuario);
    localStorage.setItem('vivero_user', JSON.stringify(data.usuario));
    localStorage.setItem('vivero_token', data.token);
    fetchData();
  };

  const obtenerRecomendacion = (ubi, lote) => {
    if (!lote || ubi.bloqueada) return null;
    const ocupadas = bandejas.filter(b => b.ubicacion?.id === ubi.id && !b.vendida).reduce((acc, b) => acc + (b.cantidad || 0), 0);
    const espacio = ubi.capacidadMax - ocupadas;

    const yaTieneLote = bandejas.some(b => b.codigoLote === lote.codigoLote && b.ubicacion?.id === ubi.id && !b.vendida);
    if (yaTieneLote && espacio >= cantidadElegida) return { label: "Ideal (Mismo Lote)", ideal: true };

    if (ocupadas === 0 && espacio >= cantidadElegida) return { label: "Zona Vacía", ideal: false };

    if (espacio >= cantidadElegida) return { label: "Espacio Disponible", ideal: false };

    return null;
  };

  const filtrarBandejas = (lista) => {
    return lista.filter(b =>
      !b.vendida &&
      `${b.variedad.nombre} ${b.duenio || ''} ${b.codigoLote}`.toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  // --- ACTUALIZAR CON USERNAME ---
    const handleSaveBandeja = async (e) => {
      e.preventDefault();
      const payload = { ...formBandeja, variedad: { id: formBandeja.variedadId }, tipoBandeja: { id: formBandeja.tipoBandejaId } };
      try {
        if (editandoId) {
          // CORRECCIÓN: Agregamos username a la edición
          await api.put(`/bandejas/${editandoId}`, payload, { params: { username: user.username } });
          toast.success("Actualizado");
        } else {
          await saveBandeja(payload, user.username);
          toast.success("Registrado");
        }
        setMostrarModalBandeja(false); fetchData();
      } catch (e) {
        setErrorCapacidad({ isOpen: true, mensaje: e.response?.data?.message || "Error" });
      }
    };

    // --- ELIMINAR CON USERNAME ---
    const ejecutarEliminacion = async () => {
      try {
        // CORRECCIÓN: Enviamos el username al borrar
        await api.delete(`/bandejas/${loteAEliminar.id}`, { params: { username: user.username } });
        toast.success("Eliminado");
        setLoteAEliminar(null); fetchData();
      } catch (e) { toast.error("Error al eliminar"); }
    };

  const ejecutarVenta = async () => {
    try {
      await api.patch(`/bandejas/${loteAVender.id}/vender`, null, {
        params: { username: user.username, cantidadAVender: cantidadElegida }
      });
      toast.success("Venta realizada");
      setLoteAVender(null);
      setCantidadElegida(0);
      fetchData();
    } catch (e) { toast.error("Error en la venta"); }
  };

  const renderContent = () => {
    if (!user) return null;
    if (cargando) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600" /></div>;

    const propsComunes = {
      userRole: user.role,
      onOpenDetail: (b) => setBandejaDetalle(b),
      onDelete: (id) => setLoteAEliminar(bandejas.find(b => b.id === id)),
      onDeleteBandeja: (id) => setLoteAEliminar(bandejas.find(b => b.id === id)),
      onEdit: (b) => {
        setFormBandeja({...b, variedadId: b.variedad.id, tipoBandejaId: b.tipoBandeja?.id});
        setEditandoId(b.id);
        setMostrarModalBandeja(true);
      },
      onEditBandeja: (b) => {
        setFormBandeja({...b, variedadId: b.variedad.id, tipoBandejaId: b.tipoBandeja?.id});
        setEditandoId(b.id);
        setMostrarModalBandeja(true);
      },
      onSell: (b) => { setProcesoActual('VENDER'); setLoteADividir(b); }
    };

    switch(tab) {
      case 'stats': return <StatsPage bandejas={bandejas} variedades={variedades} />;
      case 'movimientos': return <MovimientosPage />;
      case 'catalogo': return user.role === 'ADMIN' ? <ConfiguracionPage busqueda={busqueda} variedades={variedades} tiposBandeja={tiposBandeja} ubicaciones={ubicaciones} bandejas={bandejas} fetchData={fetchData} onError={toast.error} /> : null;
      case 'inicio': return <InicioPage items={filtrarBandejas(bandejas)} busqueda={busqueda} {...propsComunes} onLocationClick={(u, code) => { setLoteADestacar(code); if (u.tipo === 'INVERNADERO') { setTab('siembras'); setInvernaderoSeleccionado(u); } else { setTab('telas'); setTelaSeleccionada(u); } }} onAssign={(b) => { setProcesoActual('MOVER'); setLoteADividir(b); }} onMove={(b) => { setProcesoActual('MOVER'); setLoteADividir(b); }} />;
      case 'semillero': return <div className="grid gap-3 px-2">{filtrarBandejas(bandejas.filter(b => !b.ubicacion)).map(item => <BandejaCard key={item.id} bandeja={item} {...propsComunes} onAssignLocation={(b) => { setProcesoActual('MOVER'); setLoteADividir(b); }} />)}</div>;
      case 'siembras': return <InvernaderosPage ubicaciones={ubicaciones} bandejasTotales={bandejas} bandejasFiltradas={invernaderoSeleccionado ? filtrarBandejas(bandejas.filter(b => b.ubicacion?.id == invernaderoSeleccionado.id)) : []} seleccionado={invernaderoSeleccionado} setSeleccionado={setInvernaderoSeleccionado} {...propsComunes} onMove={(b) => { setProcesoActual('MOVER'); setLoteADividir(b); }} loteADestacar={loteADestacar} />;
      case 'telas': return <TelasPage ubicaciones={ubicaciones} bandejasTotales={bandejas} bandejasFiltradas={telaSeleccionada ? filtrarBandejas(bandejas.filter(b => b.ubicacion?.id == telaSeleccionada.id)) : []} seleccionada={telaSeleccionada} setSeleccionada={setTelaSeleccionada} {...propsComunes} onMove={(b) => { setProcesoActual('MOVER'); setLoteADividir(b); }} loteADestacar={loteADestacar} />;
      default: return null;
    }
  };

  if (!user) return <LoginPage onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-900">
      <Toaster position="top-center" />
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-black text-emerald-800 flex items-center gap-2 uppercase tracking-tighter"><div className="bg-emerald-600 p-1.5 rounded-xl text-white shadow-lg"><Leaf size={18}/></div>ViveroPro</h1>
        <button onClick={() => setMostrarPerfil(!mostrarPerfil)} className="w-10 h-10 rounded-full flex items-center justify-center border bg-slate-100"><UserIcon size={20} /></button>
      </header>

      {mostrarPerfil && (
        <>
          <div className="fixed top-20 right-6 w-60 bg-white rounded-[32px] shadow-2xl z-50 border border-slate-100 p-3 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="p-4 border-b border-slate-50 mb-2 text-center">
              <p className="font-bold text-slate-800 truncate uppercase tracking-tighter">{user.username}</p>
              <span className="text-[8px] bg-slate-100 px-2 py-0.5 rounded-md font-black text-slate-500 uppercase">{user.role}</span>
            </div>
            <div className="space-y-1">
              <button onClick={() => { setTab('stats'); setMostrarPerfil(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl text-xs font-bold uppercase"><BarChart3 size={18}/> Estadísticas</button>
              <button onClick={() => { setTab('movimientos'); setMostrarPerfil(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 text-purple-600 rounded-2xl text-xs font-bold uppercase"><History size={18}/> Historial</button>
              {user.role === 'ADMIN' && <button onClick={() => { setTab('catalogo'); setMostrarPerfil(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl text-xs font-bold uppercase"><Settings size={18}/> Configuración</button>}
            </div>
            <div className="h-px bg-slate-100 my-2 mx-2" />
            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 hover:bg-red-50 text-red-600 rounded-2xl text-xs font-bold uppercase"><LogOut size={18}/> Cerrar Sesión</button>
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setMostrarPerfil(false)}></div>
        </>
      )}

      <main className="p-4 max-w-xl mx-auto space-y-6">
        {tab !== 'stats' && tab !== 'movimientos' && tab !== 'catalogo' && (
          <div className="relative animate-in slide-in-from-top-2 duration-300">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar variedad, lote o dueño..." className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white shadow-sm border-none outline-none focus:ring-2 focus:ring-emerald-500 font-medium" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        )}
        {renderContent()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t flex justify-around p-4 pb-8 z-40 shadow-lg">
        <button onClick={() => {setTab('inicio'); setBusqueda('');}} className={`flex flex-col items-center gap-1 ${tab === 'inicio' ? 'text-emerald-600 font-bold' : 'text-slate-300'}`}><LayoutGrid size={24}/><span className="text-[9px] font-black uppercase">Inicio</span></button>
        <button onClick={() => {setTab('semillero'); setBusqueda('');}} className={`flex flex-col items-center gap-1 ${tab === 'semillero' ? 'text-orange-500 font-bold' : 'text-slate-300'}`}><Sprout size={24}/><span className="text-[9px] font-black uppercase">Semillero</span></button>
        <button onClick={() => {setTab('siembras'); setInvernaderoSeleccionado(null); setBusqueda('');}} className={`flex flex-col items-center gap-1 ${tab === 'siembras' ? 'text-emerald-600 font-bold' : 'text-slate-300'}`}><Home size={24}/><span className="text-[9px] font-black uppercase">Inv.</span></button>
        <button onClick={() => {setTab('telas'); setTelaSeleccionada(null); setBusqueda('');}} className={`flex flex-col items-center gap-1 ${tab === 'telas' ? 'text-blue-600 font-bold' : 'text-slate-300'}`}><Boxes size={24}/><span className="text-[9px] font-black uppercase">Telas</span></button>
      </nav>

      {user.role === 'ADMIN' && (tab === 'inicio' || tab === 'semillero') && (
        <button onClick={() => { setEditandoId(null); setFormBandeja({ variedadId: '', tipoBandejaId: '', cantidad: 1, duenio: '', observaciones: '' }); setMostrarModalBandeja(true); }} className="fixed bottom-24 right-6 bg-emerald-600 text-white w-14 h-14 rounded-2xl flex items-center shadow-xl z-50 active:scale-95 transition-all"><Plus className="mx-auto" size={28}/></button>
      )}

      {/* MODAL DESTINO CON RECOMENDACIONES Y VALIDACIÓN DE CAPACIDAD LOCAL */}
      {(trasladandoBandeja || asignandoLote) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-xl font-black mb-6 uppercase text-slate-800 text-center tracking-tighter">Elegir Destino</h2>
            <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {ubicaciones.filter(u => u.tipo === (trasladandoBandeja ? 'TELA' : 'INVERNADERO')).map(u => {
                const reco = obtenerRecomendacion(u, trasladandoBandeja || asignandoLote);
                return (
                  <button
                    key={u.id}
                    disabled={u.bloqueada}
                    onClick={async () => {
                      // VALIDACIÓN LOCAL DE ESPACIO
                      const ocupadas = bandejas.filter(b => b.ubicacion?.id === u.id && !b.vendida).reduce((acc, b) => acc + (b.cantidad || 0), 0);
                      if (ocupadas + cantidadElegida > u.capacidadMax) {
                        setErrorCapacidad({
                          isOpen: true,
                          mensaje: `No es posible la acción: No hay espacio suficiente en ${u.nombre}. Disponible: ${u.capacidadMax - ocupadas} bandejas.`
                        });
                        return;
                      }

                      const ruta = trasladandoBandeja ? `/bandejas/${trasladandoBandeja.id}/mover-a-telas` : `/bandejas/${asignandoLote.id}/asignar-ubicacion`;
                      const params = trasladandoBandeja ? { nuevaUbicacionId: u.id, cantidadAMover: cantidadElegida, username: user.username } : { ubicacionId: u.id, cantidadAMover: cantidadElegida, username: user.username };
                      await api.put(ruta, null, { params });
                      setTrasladandoBandeja(null); setAsignandoLote(null); fetchData(); toast.success("Movimiento exitoso");
                    }}
                    className={`w-full p-4 rounded-2xl text-left border-2 transition-all ${
                      u.bloqueada
                        ? 'bg-slate-100 opacity-50 cursor-not-allowed border-dashed border-slate-200'
                        : reco?.ideal
                          ? 'border-purple-500 bg-purple-50 shadow-sm shadow-purple-100'
                          : reco
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'bg-slate-50 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold uppercase text-xs ${reco?.ideal ? 'text-purple-700' : 'text-slate-700'}`}>
                        {u.nombre}
                      </span>
                      {u.bloqueada ? (
                        <Lock size={14} className="text-red-400"/>
                      ) : reco && (
                        <span className={`text-[7px] font-black text-white px-2 py-0.5 rounded-full uppercase animate-pulse ${reco.ideal ? 'bg-purple-600' : 'bg-emerald-600'}`}>
                          ★ {reco.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">{u.bloqueada ? 'ZONA FUERA DE SERVICIO' : 'Confirmar traslado'}</p>
                  </button>
                );
              })}
            </div>
            <button onClick={() => { setTrasladandoBandeja(null); setAsignandoLote(null); }} className="mt-6 w-full text-xs font-black uppercase text-slate-300 text-center">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL DE ERROR DE CAPACIDAD */}
      <ConfirmacionAccionModal
        isOpen={errorCapacidad.isOpen}
        onClose={() => setErrorCapacidad({ isOpen: false, mensaje: '' })}
        onConfirm={() => setErrorCapacidad({ isOpen: false, mensaje: '' })}
        titulo="Acción no posible"
        mensaje={errorCapacidad.mensaje}
        color="red"
      />

      <SeleccionCantidadModal
        isOpen={!!loteADividir} onClose={() => { setLoteADividir(null); setProcesoActual(null); }}
        totalMax={loteADividir?.cantidad}
        onConfirm={(cant) => {
          setCantidadElegida(cant);
          setLoteADividir(null);
          if (procesoActual === 'VENDER') setLoteAVender(loteADividir);
          else if (!loteADividir.ubicacion) setAsignandoLote(loteADividir);
          else setTrasladandoBandeja(loteADividir);
        }}
      />
      <BandejaDetalleModal isOpen={!!bandejaDetalle} onClose={() => setBandejaDetalle(null)} bandeja={bandejaDetalle} bandejas={bandejas} />
      <BandejaModal isOpen={mostrarModalBandeja} onClose={() => setMostrarModalBandeja(false)} onSave={handleSaveBandeja} data={formBandeja} setData={setFormBandeja} variedades={variedades} tipos={tiposBandeja} editando={!!editandoId} />
      <ConfirmarEliminarModal isOpen={!!loteAEliminar} onClose={() => setLoteAEliminar(null)} onConfirm={ejecutarEliminacion} nombreItem={loteAEliminar ? `${loteAEliminar.variedad.nombre}` : ''} />
      <ConfirmarVentaModal isOpen={!!loteAVender} onClose={() => { setLoteAVender(null); setProcesoActual(null); }} lote={{...loteAVender, cantidad: cantidadElegida}} onConfirm={ejecutarVenta} />
    </div>
  );
}

export default App;