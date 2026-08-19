import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const ProtectedRoute = ({ requiredPermission }) => {
  const { token, hasPermission } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // requiredPermission acepta un string (como antes) o un arreglo de permisos "cualquiera de estos"
  // (ej. ['LEER_CLIENTES', 'LEER_BANDEJAS']), para pantallas alcanzables por más de un permiso.
  if (requiredPermission) {
    const permisos = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    if (!permisos.some(hasPermission)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
