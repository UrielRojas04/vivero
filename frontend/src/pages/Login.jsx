import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data && response.data.token) {
        const user = {
          username: response.data.username,
          authorities: response.data.authorities,
          roles: response.data.roles
        };
        const negocios = response.data.negociosDisponibles || [];
        login(response.data.token, user, negocios);
        const isJefe = user.username === 'Sergio';
        navigate(isJefe ? '/dashboard' : '/productos');
      } else {
        setError('Respuesta inválida del servidor.');
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Credenciales incorrectas.');
      } else {
        setError('Ocurrió un error al intentar conectarse al servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Sin nombre del sistema (pedido del usuario en el CP1): la unidad todavía no se conoce
            acá, y ahora tampoco un nombre genérico. Heading fuera de pantalla sólo para que la
            página tenga un <h1> real de cara a lectores de pantalla. */}
        <h1 className="sr-only">Iniciar sesión</h1>
        <p className="text-center text-sm text-muted">
          Ingresá tus credenciales para continuar
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-paper py-8 px-4 border border-line rounded-panel sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-body">
                Usuario (Email)
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-line rounded-base placeholder-faint focus:outline-none focus:ring-accent focus:border-accent sm:text-sm bg-paper"
                  placeholder="ejemplo@vivero.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-body">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-line rounded-base placeholder-faint focus:outline-none focus:ring-accent focus:border-accent sm:text-sm bg-paper"
                  placeholder="••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-danger text-sm bg-danger-bg p-3 rounded-base border border-danger-line">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-base text-sm font-medium text-paper bg-ink hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
