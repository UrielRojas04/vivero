import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { isTokenExpired } from '../utils/jwt';
import DefaultRedirect from './DefaultRedirect';

const ProtectedRoute = ({ requiredPermission }) => {
  const { token, hasPermission, logout } = useAuthStore();

  // Antes esto sólo chequeaba que el token existiera -- un token vencido (dura 24hs,
  // JWT_EXPIRATION_MS) igual "abría" la pantalla hasta que el primer pedido a la API fallara con
  // 401 y recién ahí el interceptor de axios.js redirigiera. Ahora se chequea la expiración acá
  // mismo, sin esperar a esa primera llamada.
  if (!token || isTokenExpired(token)) {
    if (token) logout();
    return <Navigate to="/login" replace />;
  }

  // requiredPermission acepta un string (como antes) o un arreglo de permisos "cualquiera de estos"
  // (ej. ['LEER_CLIENTES', 'LEER_BANDEJAS']), para pantallas alcanzables por más de un permiso.
  if (requiredPermission) {
    const permisos = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    if (!permisos.some(hasPermission)) {
      return <DefaultRedirect />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
