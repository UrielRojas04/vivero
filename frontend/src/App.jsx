import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Insumos from './pages/Insumos';
import Clientes from './pages/Clientes';
import UsuariosAdmin from './pages/UsuariosAdmin';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas con layout compartido */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            
            <Route element={<ProtectedRoute requiredPermission="LEER_STOCK" />}>
              <Route path="/productos" element={<Productos />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="LEER_INSUMOS" />}>
              <Route path="/insumos" element={<Insumos />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="LEER_CLIENTES" />}>
              <Route path="/clientes" element={<Clientes />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="ADMIN_DB" />}>
              <Route path="/admin/usuarios" element={<UsuariosAdmin />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
