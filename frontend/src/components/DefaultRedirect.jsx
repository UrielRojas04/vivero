import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const DefaultRedirect = () => {
  const { hasPermission, user, unidadNegocioActiva, negociosDisponibles } = useAuthStore();

  // 1. Dashboard is for jefe, admin2 (herramientas) and colega (abono).
  // Usually these roles have LEER_STOCK or ADMIN_DB.
  if (
    user?.username === 'jefe@vivero.com' || 
    user?.username === 'admin2@vivero.com' || 
    user?.username === 'colega@vivero.com' ||
    hasPermission('ADMIN_DB') ||
    hasPermission('LEER_STOCK')
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  // 2. Abono Producción (for Carlos)
  if (hasPermission('ESCRIBIR_PRODUCCION')) {
    return <Navigate to="/abono/produccion" replace />;
  }

  // 3. Ventas
  if (hasPermission('ESCRIBIR_VENTAS')) {
    return <Navigate to="/ventas/nueva" replace />;
  }

  // 4. Clientes
  if (hasPermission('LEER_CLIENTES')) {
    return <Navigate to="/clientes" replace />;
  }

  // 5. Insumos
  if (hasPermission('LEER_INSUMOS')) {
    return <Navigate to="/insumos" replace />;
  }

  // If nothing else matches, force a logout or just go back to login
  return <Navigate to="/login" replace />;
};

export default DefaultRedirect;
