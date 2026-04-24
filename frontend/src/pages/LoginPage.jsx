import React, { useState } from 'react';
import { Leaf, User, Lock, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast'; //
import { login, register } from '../api/usuarioApi'; //

export const LoginPage = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'ADMIN' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = isRegister
        ? await register(formData) //
        : await login(formData); //

      if (isRegister) {
        setIsRegister(false);
        toast.success("¡Cuenta creada con éxito! Ya puedes ingresar."); //
      } else {
        onLoginSuccess(res.data); //
      }
    } catch (err) {
      console.error("Detalle del error:", err.response);
      const rawError = err.response?.data;
      const mensajeFinal = (typeof rawError === 'object' && rawError !== null)
        ? (rawError.message || "Error en el servidor")
        : (rawError || "Usuario o contraseña incorrectos");

      toast.error(mensajeFinal); //
      setError(mensajeFinal); //
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="bg-emerald-600 w-16 h-16 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-emerald-200 mx-auto mb-4">
            <Leaf size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">ViveroPro</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Acceso al Sistema</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">
            {isRegister ? 'Crear Usuario' : 'Bienvenido'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Usuario</label>
              <div className="relative mt-1">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  required
                  type="text"
                  className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Contraseña</label>
              <div className="relative mt-1">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            {isRegister && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Rol asignado</label>
                <div className="relative mt-1">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select
                    className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-700 appearance-none"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="ADMIN">Administrador (Staff)</option>
                    <option value="OWNER">Dueño (Visualización)</option>
                  </select>
                </div>
              </div>
            )}

            <button
              disabled={cargando}
              type="submit"
              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {cargando ? 'Procesando...' : (isRegister ? 'Registrarme' : 'Ingresar')}
              {!cargando && <ArrowRight size={18} />}
            </button>
          </form>

          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="w-full mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors text-center"
          >
            {isRegister ? '¿Ya tenés cuenta? Entrar' : '¿No tenés cuenta? Registrate'}
          </button>
        </div>
      </div>
    </div>
  );
};