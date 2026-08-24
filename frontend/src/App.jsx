import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Insumos from './pages/Insumos';
import Clientes from './pages/Clientes';
import CuentaCorrienteCliente from './pages/CuentaCorrienteCliente';
import DevolucionBandejas from './pages/DevolucionBandejas';
import UsuariosAdmin from './pages/UsuariosAdmin';
import Finanzas from './pages/Finanzas';
import Cheques from './pages/Cheques';
import Siembras from './pages/Siembras';
import VariedadesPlantas from './pages/VariedadesPlantas';
import VariedadesBandejas from './pages/VariedadesBandejas';
import Configuracion from './pages/Configuracion';
import NuevaVenta from './pages/NuevaVenta';
import HistorialVentas from './pages/HistorialVentas';
import VentasLayout from './pages/VentasLayout';
import Pedidos from './pages/Pedidos';
import PedidoNuevo from './pages/PedidoNuevo';
import Facturas from './pages/Facturas';
import FacturaCliente from './pages/FacturaCliente';
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
              <Route path="/siembras" element={<Siembras />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="LEER_INSUMOS" />}>
              <Route path="/insumos" element={<Insumos />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="LEER_CLIENTES" />}>
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id/cuenta-corriente" element={<CuentaCorrienteCliente />} />
            </Route>

            {/* Devolución de Bandejas: alcanzable con LEER_CLIENTES (jefe, como siempre) O con el
                permiso acotado LEER_BANDEJAS (empleado al que se le otorgó sólo esto). No va dentro
                del grupo de arriba porque ese exige LEER_CLIENTES a secas y dejaría afuera al
                empleado con el permiso acotado — es justamente el caso que resuelve este change. */}
            <Route element={<ProtectedRoute requiredPermission={['LEER_CLIENTES', 'LEER_BANDEJAS']} />}>
              <Route path="/bandejas" element={<DevolucionBandejas />} />
            </Route>

            {/* Módulo de Ventas con sus subsecciones */}
            <Route path="/ventas" element={<ProtectedRoute requiredPermission="ESCRIBIR_VENTAS" />}>
              <Route element={<VentasLayout />}>
                <Route path="nueva" element={<NuevaVenta />} />
                <Route path="historial" element={<HistorialVentas />} />
                {/* Redirección por defecto */}
                <Route index element={<Navigate to="nueva" replace />} />
              </Route>
            </Route>

            {/* Facturas */}
            <Route element={<ProtectedRoute requiredPermission={['ESCRIBIR_VENTAS', 'LEER_CLIENTES']} />}>
              <Route path="/facturas" element={<Facturas />} />
              <Route path="/facturas/:clienteId" element={<FacturaCliente />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="LEER_FINANZAS" />}>
              <Route path="/finanzas" element={<Finanzas />} />
              <Route path="/cheques" element={<Cheques />} />
            </Route>

            {/* Circuito de pedidos a proveedores: exclusivo del negocio Herramientas (el menú lo
                oculta con isHerramientas en DashboardLayout.jsx), protegido acá por permiso como
                el resto de las secciones. Proveedores como página standalone (/proveedores) fue
                retirada (pedido puntual 2026-08-21): la sección ya vive embebida dentro de
                Configuración (Configuracion.jsx -> activeSection === 'proveedores'), único punto
                de acceso ahora — evita la redundancia de tenerla también como ítem de menú
                separado. */}
            <Route element={<ProtectedRoute requiredPermission="LEER_PEDIDOS" />}>
              <Route path="/pedidos" element={<Pedidos />} />
            </Route>

            {/* Alta de pedido: página propia (reemplaza el modal), gateada con ESCRIBIR_PEDIDOS
                (permiso de escritura real del circuito, ver PedidoController) en vez de
                LEER_PEDIDOS — un usuario sólo-lectura no debería ni llegar al formulario. */}
            <Route element={<ProtectedRoute requiredPermission="ESCRIBIR_PEDIDOS" />}>
              <Route path="/pedidos/nuevo" element={<PedidoNuevo />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="ADMIN_DB" />}>
              <Route path="/admin/usuarios" element={<UsuariosAdmin />} />
              <Route path="/variedades-plantas" element={<VariedadesPlantas />} />
              <Route path="/variedades-bandejas" element={<VariedadesBandejas />} />
            </Route>

            {/* Configuración es accesible, pero dentro valida los permisos por sección */}
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
