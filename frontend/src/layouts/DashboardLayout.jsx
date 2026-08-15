import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useStockEvents } from '../hooks/useStockEvents';
import ToastContainer from '../components/ToastContainer';
import ConfirmDialog from '../components/ConfirmDialog';
import PermissionDeniedModal from '../components/PermissionDeniedModal';
import { siembrasApi } from '../api/siembras.api';
import { LogOut, Leaf, LayoutDashboard, Package, Wrench, Users, Shield, ShoppingCart, ListChecks, PieChart, Briefcase, CreditCard, Sprout, Settings, ChevronDown, ChevronUp, X, Bell, Clock, Building2, Menu } from 'lucide-react';

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
      { to: '/siembras', label: 'Siembras', icon: Sprout, permission: 'LEER_STOCK' },
    ]
  },
  {
    title: 'Gestión',
    items: [
      { to: '/clientes', label: 'Clientes', icon: Users, permission: 'LEER_CLIENTES' },
      { to: '/finanzas', label: 'Finanzas', icon: Briefcase, permission: 'LEER_FINANZAS' },
      { to: '/cheques', label: 'Cheques', icon: CreditCard, permission: 'LEER_FINANZAS' },
      { to: '/admin/usuarios', label: 'Usuarios (Admin)', icon: Shield, permission: 'ADMIN_DB' },
    ]
  }
];

const DashboardLayout = () => {
  const { logout, user, hasPermission, negociosDisponibles, unidadNegocioActiva, setNegociosDisponibles, setUnidadNegocioActiva } = useAuthStore();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Alertas state
  const [alertas, setAlertas] = useState([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  React.useEffect(() => {
    if (user) {
      if (hasPermission('LEER_STOCK')) {
        siembrasApi.getAlertas()
          .then(res => setAlertas(res.data || []))
          .catch(err => console.error("Error fetching alertas", err));
      }
    }
  }, [user]);

  // Inicializar conexión SSE globalmente
  useStockEvents();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center">
            <Leaf className="w-6 h-6 text-emerald-600 mr-2" />
            <span className="font-bold text-lg text-gray-900">Vivero ERP</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-6">
          {navGroups.map((group, idx) => {
            // Filtrar los items del grupo según permisos
            const activeBusinessId = parseInt(unidadNegocioActiva);
            const isHerramientas = activeBusinessId === 2; // Assuming ID 2 is Herramientas

            const visibleItems = group.items.filter((item) => {
              if (item.permission && !hasPermission(item.permission)) return false;
              if (isHerramientas && (item.label === 'Siembras' || item.label === 'Insumos' || item.label === 'Productos (Plantas)')) {
                // Rename Productos to just Productos for Herramientas, or hide Siembras/Insumos
                if (item.label === 'Siembras' || item.label === 'Insumos') return false;
              }
              return true;
            }).map(item => {
              if (isHerramientas && item.label === 'Productos (Plantas)') {
                return { ...item, label: 'Productos' };
              }
              return item;
            });

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
                      onClick={() => setIsSidebarOpen(false)}
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

        <div className="p-4 border-t border-gray-200 relative">
          {user && (
            <>
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center w-full p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg mr-3 shadow-sm border border-emerald-200 hover:bg-emerald-200 transition-colors shrink-0">
                  {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="text-left overflow-hidden flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate" title={user.username}>
                    {user.username}
                  </p>
                  <p className="text-xs text-emerald-600 font-medium truncate" title={user.roles?.[0]}>
                    {user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'SIN ROL'}
                  </p>
                </div>
                <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Menu Popover */}
              {isProfileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute bottom-16 left-4 right-4 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                    <p className="px-3 py-1 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Opciones</p>
                    
                    <NavLink
                      to="/configuracion"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className={({ isActive }) => `flex items-center px-4 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50 hover:text-emerald-600'}`}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Configuración
                    </NavLink>

                    {negociosDisponibles.length > 0 && user?.username === 'jefe@vivero.com' && (
                      <div className="px-4 py-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Negocio Activo</p>
                        <select 
                          value={unidadNegocioActiva || ''} 
                          onChange={(e) => {
                            setUnidadNegocioActiva(e.target.value);
                            setIsProfileMenuOpen(false);
                            window.location.reload(); 
                          }}
                          className="w-full bg-gray-50 border border-gray-200 text-sm font-medium text-gray-800 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          {negociosDisponibles.map(n => (
                            <option key={n.id} value={n.id}>{n.nombre}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div className="h-px bg-gray-100 my-2"></div>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto">
        {/* Topbar for notifications */}
        <header className="h-16 flex items-center justify-between md:justify-end px-4 md:px-8 border-b border-gray-200 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              className="relative p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <Bell className="w-5 h-5" />
              {alertas.length > 0 && (
                <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
              )}
            </button>

            {isAlertsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsAlertsOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Notificaciones</h3>
                    <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{alertas.length}</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {alertas.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-500 text-sm">
                        No hay notificaciones nuevas
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {alertas.map(alerta => (
                          <div key={alerta.id} className="p-4 hover:bg-emerald-50/50 transition-colors">
                            <div className="flex gap-3">
                              <div className="mt-0.5">
                                {alerta.estado === 'FINALIZADA' ? (
                                  <Package className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Clock className="w-4 h-4 text-amber-500" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {alerta.variedadPlanta?.nombre} (Lote {alerta.numeroLote})
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {alerta.estado === 'FINALIZADA' 
                                    ? 'Lista para pasar a stock' 
                                    : 'Próxima a finalizar (en 5 días o menos)'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setIsAlertsOpen(false);
                        navigate('/siembras');
                      }}
                      className="w-full py-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      Ver todas las siembras
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      {/* Global UI Feedback */}
      <ToastContainer />
      <ConfirmDialog />
      <PermissionDeniedModal />
    </div>
  );
};

export default DashboardLayout;
