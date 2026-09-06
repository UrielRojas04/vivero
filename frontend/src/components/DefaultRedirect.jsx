import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { navGroups } from '../layouts/DashboardLayout';

const todosLosNavItems = navGroups.flatMap((grupo) => grupo.items);

const DefaultRedirect = () => {
  const { hasPermission, user, unidadNegocioActiva, negociosDisponibles } = useAuthStore();

  // 1. Dashboard is for jefe, admin2 (herramientas) and colega (abono).
  // Usually these roles have LEER_STOCK or ADMIN_DB.
  if (
    user?.username === 'Sergio' ||
    user?.username === 'admin2@vivero.com' ||
    user?.username === 'Pablo' ||
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

  // 6. Bug real (2026-09-03, "no me permite ingresar a la cuenta" con un usuario recién creado):
  // antes, si ningún caso de arriba coincidía, se mandaba directo a /login sin más -- un usuario
  // con un permiso más nuevo o acotado (ej. sólo LEER_REGISTRO_SEMILLAS, sólo LEER_BANDEJAS, sólo
  // LEER_PEDIDOS, sólo LEER_FACTURACION) hacía login con éxito (token válido, backend lo autentica
  // bien) pero esta cadena hardcodeada nunca se actualizó al agregar esos permisos, así que
  // rebotaba de vuelta al login -- daba la sensación de que el login "no funcionaba", cuando en
  // realidad sí funcionaba y el problema era de ruteo. En vez de mantener una lista a mano que hay
  // que recordar actualizar cada vez que se agrega un permiso, se busca acá el primer ítem de
  // navGroups (la MISMA fuente de verdad que ya arma el menú lateral en DashboardLayout.jsx) al
  // que el usuario tenga acceso en su unidad de negocio activa.
  const activeBusinessId = parseInt(unidadNegocioActiva);
  const unidadSlug = negociosDisponibles.find(n => n.id === activeBusinessId)?.nombre?.toLowerCase() || 'vivero';
  const primerItemAccesible = todosLosNavItems.find((item) => {
    if (item.unidades && !item.unidades.includes(unidadSlug)) return false;
    if (!item.permission) return true;
    const permisos = Array.isArray(item.permission) ? item.permission : [item.permission];
    return permisos.some(hasPermission);
  });
  if (primerItemAccesible) {
    return <Navigate to={primerItemAccesible.to} replace />;
  }

  // Ni siquiera navGroups tiene algo accesible para este usuario en esta unidad: no hay a dónde
  // mandarlo (rol sin ningún permiso real asignado).
  return <Navigate to="/login" replace />;
};

export default DefaultRedirect;
