import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useStockEvents } from '../hooks/useStockEvents';
import ToastContainer from '../components/ToastContainer';
import ConfirmDialog from '../components/ConfirmDialog';
import PermissionDeniedModal from '../components/PermissionDeniedModal';
import { LogOut, Leaf, LayoutDashboard, Package, Wrench, Users, Shield, ShoppingCart, ListChecks } from 'lucide-react';

const navGroups = [
  {
    title: 'Principal',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Ventas',
    items: [
      { to: '/ventas/nueva', label: 'Ventas', icon: ShoppingCart, permission: 'ESCRIBIR_VENTAS' },
    ]
  },
  {
    title: 'Catálogo',
    items: [
      { to: '/productos', label: 'Productos (Plantas)', icon: Package, permission: 'LEER_STOCK' },
      { to: '/insumos', label: 'Insumos', icon: Wrench, permission: 'LEER_INSUMOS' },
    ]
  },
  {
    title: 'Gestión',
    items: [
      { to: '/clientes', label: 'Clientes', icon: Users, permission: 'LEER_CLIENTES' },
      { to: '/admin/usuarios', label: 'Usuarios (Admin)', icon: Shield, permission: 'ADMIN_DB' },
    ]
  }
];

const DashboardLayout = () => {
  const { logout, user, hasPermission } = useAuthStore();
  const navigate = useNavigate();

  // Inicializar conexión SSE globalmente
  useStockEvents();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Leaf className="w-6 h-6 text-emerald-600 mr-2" />
          <span className="font-bold text-lg text-gray-900">Vivero ERP</span>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-6">
          {navGroups.map((group, idx) => {
            // Filtrar los items del grupo según permisos
            const visibleItems = group.items.filter(
              (item) => !item.permission || hasPermission(item.permission)
            );

            // Si ningún item del grupo es visible, no mostramos el grupo
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx}>
                <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          {user && (
            <div className="flex items-center mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg mr-3 shadow-sm border border-emerald-200">
                {user.username ? user.username.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-gray-800 truncate" title={user.username}>
                  {user.username}
                </p>
                <p className="text-xs text-emerald-600 font-medium truncate" title={user.roles?.[0]}>
                  {user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'SIN ROL'}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>

      {/* Global UI Feedback */}
      <ToastContainer />
      <ConfirmDialog />
      <PermissionDeniedModal />
    </div>
  );
};

export default DashboardLayout;
