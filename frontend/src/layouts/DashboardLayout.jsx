import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useStockEvents } from '../hooks/useStockEvents';
import ToastContainer from '../components/ToastContainer';
import ConfirmDialog from '../components/ConfirmDialog';
import PermissionDeniedModal from '../components/PermissionDeniedModal';
import ThemeToggle from '../components/ThemeToggle';
import { siembrasApi } from '../api/siembras.api';
import { registroSemillasApi } from '../api/registroSemillas.api';
import { LogOut, Leaf, LayoutDashboard, Package, Wrench, Users, Shield, ShoppingCart, ListChecks, PieChart, Briefcase, CreditCard, Sprout, Settings, ChevronDown, ChevronUp, X, Bell, Clock, Building2, Menu, PackageMinus, ClipboardList, TrendingUp, HandCoins, Truck, Factory, PackagePlus } from 'lucide-react';
import logoVivero from '../assets/logo-vivero.png';
import logoHerramientas from '../assets/logo-herramientas.png';

const identities = {
  vivero: {
    slug: 'vivero',
    logo: logoVivero,
    plateClass: null,
    logoClass: 'h-[100px] max-w-full object-contain transition-transform duration-300 hover:scale-105 -mx-2'
  },
  herramientas: {
    slug: 'herramientas',
    logo: logoHerramientas,
    plateClass: 'bg-[var(--accent-plate)] h-[82px] w-full flex items-center justify-center px-2.5',
    logoClass: 'h-full object-contain transition-transform duration-300 hover:scale-105'
  },
  abono: {
    slug: 'abono',
    logo: logoVivero,
    plateClass: null,
    logoClass: 'h-[100px] max-w-full object-contain transition-transform duration-300 hover:scale-105 -mx-2 opacity-80 sepia-[.3] hue-rotate-[-30deg]' // A visual distinction for Abono if we don't have a logo yet
  }
};

// Exportado (además de usarse acá abajo) para que DefaultRedirect.jsx pueda derivar de la MISMA
// lista la página de aterrizaje tras el login -- ver comentario en ese archivo.
export const navGroups = [
  {
    title: 'Principal',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, unidades: ['vivero', 'herramientas', 'abono'], onlyJefe: true },
    ]
  },
  {
    title: 'Ventas',
    items: [
      { to: '/ventas/nueva', label: 'Ventas', icon: ShoppingCart, permission: 'ESCRIBIR_VENTAS', unidades: ['vivero', 'herramientas', 'abono'] },
      { to: '/facturas', label: 'Facturación', icon: ListChecks, permission: 'LEER_FACTURACION', unidades: ['vivero', 'herramientas', 'abono'] },
    ]
  },
  {
    title: 'Catálogo',
    items: [
      { to: '/productos', label: 'Productos (Plantas)', icon: Package, permission: 'LEER_STOCK', unidades: ['vivero'] },
      { to: '/productos', label: 'Productos', icon: Package, permission: 'LEER_STOCK', unidades: ['herramientas'] },
      { to: '/pedidos', label: 'Pedidos', icon: ClipboardList, permission: 'LEER_PEDIDOS', unidades: ['herramientas'] },
      { to: '/productos', label: 'Productos', icon: Package, permission: 'LEER_STOCK', unidades: ['abono'] },
      { to: '/abono/produccion', label: 'Producción', icon: Factory, permission: 'ESCRIBIR_PRODUCCION', unidades: ['abono'] },
      { to: '/insumos', label: 'Insumos', icon: Wrench, permission: 'LEER_INSUMOS', unidades: ['vivero', 'abono'] },
      { to: '/siembras', label: 'Siembras', icon: Sprout, permission: 'LEER_SIEMBRAS', unidades: ['vivero'] },
      { to: '/registro-semillas', label: 'Registro de Semillas', icon: PackagePlus, permission: 'LEER_REGISTRO_SEMILLAS', unidades: ['vivero'] },
    ]
  },
  {
    title: 'Logística',
    items: [
      { to: '/abono/traslados', label: 'Traslados', icon: Truck, permission: 'ESCRIBIR_STOCK', unidades: ['abono'] },
      { to: '/abono/rendiciones', label: 'Rendiciones', icon: HandCoins, permission: 'ESCRIBIR_VENTAS', unidades: ['abono'] },
    ]
  },
  {
    title: 'Gestión',
    items: [
      { to: '/clientes', label: 'Clientes', icon: Users, permission: 'LEER_CLIENTES', unidades: ['vivero', 'herramientas', 'abono'] },
      { to: '/bandejas', label: 'Devolución de Bandejas', icon: PackageMinus, permission: ['LEER_CLIENTES', 'LEER_BANDEJAS'], unidades: ['vivero'] },
      { to: '/finanzas', label: 'Finanzas', icon: Briefcase, permission: 'LEER_FINANZAS', unidades: ['vivero', 'herramientas'] },
      // Misma pantalla que antes (/abono/liquidacion), renombrada "Finanzas" y movida a Gestión
      // (pedido del dueño 2026-09-04) -- es conceptualmente lo mismo que el ítem "Finanzas" de
      // arriba, sólo que Abono tiene su propia ruta/pantalla en vez de reusar /finanzas.
      { to: '/abono/liquidacion', label: 'Finanzas', icon: TrendingUp, permission: 'ESCRIBIR_VENTAS', unidades: ['abono'] },
      { to: '/cheques', label: 'Cheques', icon: CreditCard, permission: 'LEER_FINANZAS', unidades: ['vivero', 'herramientas', 'abono'] },
      { to: '/admin/usuarios', label: 'Usuarios (Admin)', icon: Shield, permission: 'ADMIN_DB', unidades: ['vivero', 'herramientas', 'abono'] },
    ]
  }
];

// Lista plana de todos los items de navegación, para el guard de unidad de más abajo (bug
// reportado por el usuario: cambiar de unidad de negocio estando parado en una sección propia de
// OTRA unidad, ej. Pedidos, dejaba verla igual, sólo repintada con el acento de la unidad nueva).
// Reutiliza literalmente `navGroups`, no duplica la lista de rutas/unidades permitidas.
const todosLosNavItems = navGroups.flatMap((grupo) => grupo.items);

const DashboardLayout = () => {
  const { logout, user, hasPermission, negociosDisponibles, unidadNegocioActiva, setNegociosDisponibles, setUnidadNegocioActiva } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Alertas state
  const [alertas, setAlertas] = useState([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  const activeBusinessId = parseInt(unidadNegocioActiva);
  const unidadSlug = negociosDisponibles.find(n => n.id === activeBusinessId)?.nombre?.toLowerCase() || 'vivero';
  const currentIdentity = identities[unidadSlug] || identities.vivero;
  const isAbono = unidadSlug === 'abono';

  // Proyecta la unidad activa al DOM para que el acento (--accent y derivadas, resueltas por
  // [data-unidad="vivero"|"herramientas"] en index.css) retiña todo el árbol sin componentes
  // duplicados ni props de tema (Decisión 1 de design.md).
  React.useEffect(() => {
    document.documentElement.dataset.unidad = currentIdentity.slug;
  }, [currentIdentity.slug]);

  // Guard de unidad de negocio (bug reportado por el usuario): busca, entre los items de
  // navegación cuyo `to` matchea el path actual (por prefijo, para cubrir subrutas como
  // /abono/traslados/registrar), si ALGUNO permite la unidad activa — hace falta "alguno" y no
  // "el primero" porque una misma ruta (ej. /productos) puede aparecer varias veces en
  // navGroups, una entrada por unidad, con label distinto pero mismo `to`. Si hay al menos un
  // item para este path y ninguno permite la unidad activa, la sección no es válida para la
  // unidad nueva → redirige. Rutas que no aparecen en navGroups (detalle de cliente, login, etc.)
  // no tienen ningún item que matchee y no se tocan.
  React.useEffect(() => {
    const itemsDeEstaRuta = todosLosNavItems.filter((item) => location.pathname.startsWith(item.to));
    if (itemsDeEstaRuta.length === 0) return;
    const permitidoEnEstaUnidad = itemsDeEstaRuta.some((item) => item.unidades.includes(unidadSlug));
    if (!permitidoEnEstaUnidad) {
      navigate('/dashboard', { replace: true });
    }
  }, [unidadSlug, location.pathname, navigate]);

  // Bug real (2026-09-04): las alertas de siembras sólo se pedían una vez, al iniciar sesión --
  // como DashboardLayout queda montado mientras navegás por toda la app, si una siembra entraba
  // en la ventana de alerta (o dejaba de estarlo) DESPUÉS del login, la campanita nunca se
  // enteraba. fetchAlertas ahora se llama también al abrir la campanita, no sólo al loguearse.
  // Notificaciones sólo en Vivero (pedido del dueño 2026-09-04): las alertas son de Siembras y
  // Registro de Semillas, dos secciones exclusivas de Vivero -- Herramientas y Abono no las usan
  // por ahora, así que ni se pide el dato ni se muestra la campanita en esas unidades. El botón
  // se oculta más abajo con la misma condición.
  //
  // Dos fuentes con permisos INDEPENDIENTES (pedido del dueño 2026-09-03, ver comentario de
  // RegistroSemillaController): un usuario puede tener LEER_SIEMBRAS sin LEER_REGISTRO_SEMILLAS, o
  // viceversa -- cada fetch se pide sólo si el usuario tiene el permiso correspondiente, nunca
  // los dos a ciegas, para no dispararle un 403 a alguien que legítimamente no tiene uno de los
  // dos accesos. Cada alerta se etiqueta con `__tipo` para que el render sepa cuál rama de
  // mensaje/ícono/navegación usar (pedido del dueño 2026-09-05: "notificación de sembrar
  // semilla").
  //
  // Bug real corregido (2026-09-05, reportado por el dueño): la fuente de Siembras chequeaba
  // LEER_STOCK en vez de LEER_SIEMBRAS -- el permiso real que protege la sección /siembras (ver
  // App.jsx y el sidebar más abajo). Un usuario con LEER_SIEMBRAS pero sin LEER_STOCK nunca pedía
  // el dato y no veía notificaciones de una sección a la que sí tenía acceso.
  const fetchAlertas = React.useCallback(() => {
    if (!user || unidadSlug !== 'vivero') return;

    const pedidos = [];
    if (hasPermission('LEER_SIEMBRAS')) {
      pedidos.push(
        siembrasApi.getAlertas()
          .then(res => (res.data || []).map(a => ({ ...a, __tipo: 'SIEMBRA' })))
          .catch(err => { console.error("Error fetching alertas de siembras", err); return []; })
      );
    }
    if (hasPermission('LEER_REGISTRO_SEMILLAS')) {
      pedidos.push(
        registroSemillasApi.getAlertas()
          .then(res => (res.data || []).map(a => ({ ...a, __tipo: 'SEMILLA' })))
          .catch(err => { console.error("Error fetching alertas de semillas", err); return []; })
      );
    }
    if (pedidos.length === 0) {
      setAlertas([]);
      return;
    }
    Promise.all(pedidos).then(listas => setAlertas(listas.flat()));
  }, [user, unidadSlug, hasPermission]);

  React.useEffect(() => {
    fetchAlertas();
  }, [user, unidadSlug]);

  // Inicializar conexión SSE globalmente
  useStockEvents();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    // Bug real corregido (2026-09-05, reportado por el dueño, visible al probar por túnel:
    // "3 barras de scroll, 2 verticales y 1 horizontal"): este contenedor usaba min-h-screen, que
    // deja crecer la altura más allá del viewport si algún hijo la empuja -- ahí el body termina
    // scrolleando la PÁGINA entera además de que <main> más abajo ya scrollea su propio
    // contenido con overflow-y-auto (scrollbar doble). h-screen la deja fija en el alto del
    // viewport, igual que max-h-screen en <main>, así el único scroll vertical es el de adentro.
    // Esa segunda barra de scroll de la página también le robaba ~15px de ancho al contenido,
    // lo que empujaba a las tablas anchas (como Registro de Semillas) a necesitar scroll
    // horizontal que antes no hacía falta.
    <div className="h-screen bg-canvas flex overflow-hidden">
      {/* Barra de identidad de la unidad activa (Decisión 3 P3: decoración de identidad → accent) */}
      <div className="w-1 bg-accent shrink-0" />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-paper border-r border-line flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-[104px] flex items-center justify-center px-6 border-b border-line bg-paper relative">
          {/* Placa de logo (Decisión 9-bis de design.md, CP1 — dos rondas de feedback del
              usuario). Vuelta al planteo original de la guía para Vivero ("directo sobre
              papel", sin placa de color) tras probar tanto la placa verde suave como la
              tarjeta blanca dentro de la placa: el usuario prefirió sacar el fondo del todo y
              agrandar el logo, en vez de enmarcarlo. Herramientas SÍ mantiene su placa oscura
              (`--accent-plate`) sin cambios — el usuario confirmó explícitamente que esa quedó
              bien, no se toca. */}
          {currentIdentity.plateClass ? (
            <div className={currentIdentity.plateClass}>
              <img
                src={currentIdentity.logo}
                alt={`Logo ${currentIdentity.slug}`}
                className={currentIdentity.logoClass}
              />
            </div>
          ) : (
            <img
              src={currentIdentity.logo}
              alt={`Logo ${currentIdentity.slug}`}
              className={currentIdentity.logoClass}
            />
          )}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden absolute right-4 p-2 text-faint hover:text-body rounded-base cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Placa de unidad de negocio (Decisión 10): envuelve al <select> real, no lo reemplaza */}
        {negociosDisponibles.length > 0 && user?.username === 'Sergio' && (
          <div className="px-4 py-3 bg-accent-soft border-b border-line">
            <p className="text-[10px] font-bold text-accent-ink uppercase tracking-wider mb-1">
              Unidad de Negocio
            </p>
            <select
              value={unidadNegocioActiva || ''}
              onChange={(e) => {
                // Bug real corregido (2026-09-05, reportado por el dueño): el carrito de Nueva
                // Venta vive en sessionStorage (useCartStore, persist), así que sobrevivía al
                // window.location.reload() de acá abajo -- cambiar de unidad podía dejar
                // productos de OTRO negocio cargados en el carrito de la unidad nueva. Se limpia
                // antes de recargar, mismo momento en que cambia la unidad activa.
                useCartStore.getState().clearCart();
                setUnidadNegocioActiva(e.target.value);
                window.location.reload();
              }}
              className="w-full bg-transparent border-none p-0 text-sm font-semibold text-ink focus:outline-none focus:ring-0 cursor-pointer"
            >
              {negociosDisponibles.map(n => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
          </div>
        )}

        {/* Placa de cuenta activa (Abono) REMOVED */}


        <nav className="flex-1 p-4 overflow-y-auto space-y-6 scrollbar-thin">
          {navGroups.map((group, idx) => {
            // Filtrar los items del grupo según permisos

            const visibleItems = group.items.filter((item) => {
              if (item.onlyJefe && user?.username !== 'Sergio') return false;

              if (item.permission) {
                const permisos = Array.isArray(item.permission) ? item.permission : [item.permission];
                if (!permisos.some(hasPermission)) return false;
              }
              
              if (item.unidades && !item.unidades.includes(unidadSlug)) {
                return false;
              }

              return true;
            });

            // Si ningún item del grupo es visible, no mostramos el grupo
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx}>
                <h3 className="px-4 text-xs font-bold text-faint uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setIsSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center px-4 py-2 text-sm font-medium border-l-[3px] transition-colors ${
                          isActive
                            ? 'bg-accent-soft text-accent-ink border-accent'
                            : 'text-body border-transparent hover:bg-canvas'
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

        <div className="p-4 border-t border-line relative">
          {user && (
            <>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center w-full p-2 hover:bg-canvas rounded-base transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-accent"
              >
                <div className="w-10 h-10 rounded-base bg-accent-soft flex items-center justify-center text-accent-ink font-bold text-lg mr-3 border border-line hover:brightness-95 transition-colors shrink-0">
                  {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="text-left overflow-hidden flex-1">
                  <p className="text-sm font-semibold text-ink truncate" title={user.username}>
                    {user.username}
                  </p>
                  <p className="text-xs text-accent-ink font-medium truncate" title={user.roles?.[0]}>
                    {user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'SIN ROL'}
                  </p>
                </div>
                <ChevronUp className={`w-4 h-4 text-faint transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Menu Popover */}
              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute bottom-16 left-4 right-4 bg-paper border border-line-strong rounded-panel py-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                    <p className="px-3 py-1 mb-1 text-[10px] font-bold text-faint uppercase tracking-wider">Opciones</p>

                    {/* Bug real corregido (2026-09-05, reportado por el dueño): este link no
                        chequeaba ningún permiso -- cualquier usuario logueado lo veía, aunque en
                        Vivero/Abono todas las secciones de adentro (Configuracion.jsx) requieren
                        LEER_CONFIGURACION y terminaba en una página vacía. Ahora sólo se muestra
                        con ese permiso (o ADMIN_DB, para no sacarle el acceso a nadie que ya lo
                        tuviera por ese permiso más amplio) en esas dos unidades. Herramientas
                        queda sin cambios (pedido explícito del dueño), sigue visible para
                        cualquiera -- sus subsecciones ya se filtran con sus propios permisos
                        (ESCRIBIR_STOCK/LEER_PEDIDOS/ADMIN_DB, ver Configuracion.jsx). */}
                    {(unidadSlug === 'herramientas' || hasPermission('LEER_CONFIGURACION') || hasPermission('ADMIN_DB')) && (
                      <NavLink
                        to="/configuracion"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className={({ isActive }) => `flex items-center px-4 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-accent-soft text-accent-ink' : 'text-body hover:bg-canvas hover:text-accent-ink'}`}
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        Configuración
                      </NavLink>
                    )}

                    <div className="h-px bg-line my-2"></div>

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm font-medium text-danger hover:bg-danger-bg transition-colors cursor-pointer"
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
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto scrollbar-thin">
        {/* Topbar for notifications */}
        <header className="h-16 flex items-center justify-between md:justify-end px-4 md:px-8 border-b border-line bg-paper sticky top-0 z-20">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 text-muted hover:text-accent hover:bg-accent-soft rounded-base transition-colors cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Contenedor derecho: agrupa el control de tema y las alertas, en ese orden
              (switch-tema-claro-oscuro, tarea 5.5 — ThemeToggle inmediatamente a la
              izquierda de la campana). */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {unidadSlug === 'vivero' && (
            <div className="relative">
              <button
                onClick={() => {
                  const abriendo = !isAlertsOpen;
                  setIsAlertsOpen(abriendo);
                  if (abriendo) fetchAlertas();
                }}
                className="relative p-2 text-muted hover:text-accent hover:bg-accent-soft rounded-full transition-colors outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {alertas.length > 0 && (
                  <span className="absolute top-1 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-paper animate-pulse"></span>
                )}
              </button>

              {isAlertsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsAlertsOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-paper rounded-panel border border-line-strong overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 bg-thead border-b border-line flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">Notificaciones</h3>
                    <span className="text-xs font-medium bg-paper text-muted border border-line px-2 py-0.5 rounded-full">{alertas.length}</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {alertas.length === 0 ? (
                      <div className="px-4 py-6 text-center text-muted text-sm">
                        No hay notificaciones nuevas
                      </div>
                    ) : (
                      <div className="divide-y divide-line">
                        {alertas.map(alerta => {
                          if (alerta.__tipo === 'SEMILLA') {
                            // "Hora de sembrar" (pedido del dueño 2026-09-05): mismo criterio de
                            // "todavía falta" vs "ya debería estar hecho" que ya usa la rama de
                            // Siembras de acá abajo, pero sobre fechaSiembraProgramada en vez de
                            // fechaEstimada -- el backend (RegistroSemillaServiceImpl.obtenerAlertas)
                            // ya filtra sólo SIN_SEMBRAR dentro de la ventana de 5 días.
                            const diffDays = alerta.fechaSiembraProgramada
                              ? Math.ceil((new Date(alerta.fechaSiembraProgramada) - new Date()) / (1000 * 60 * 60 * 24))
                              : null;
                            const yaVencida = diffDays !== null && diffDays <= 0;
                            let mensaje;
                            if (yaVencida) {
                              mensaje = diffDays === 0 ? 'Hoy toca sembrarla' : 'Ya pasó la fecha de siembra — revisar';
                            } else if (diffDays !== null) {
                              mensaje = `Hay que sembrarla en ${diffDays} d`;
                            } else {
                              mensaje = 'Próxima a sembrar';
                            }

                            return (
                              <div
                                key={`SEMILLA-${alerta.id}`}
                                onClick={() => {
                                  setIsAlertsOpen(false);
                                  // Resalta la tarjeta al llegar (pedido del dueño 2026-09-05):
                                  // mismo mecanismo de router state de un solo uso que ya usa el
                                  // botón "Sembrar".
                                  navigate('/registro-semillas', { state: { resaltarRegistroId: alerta.id } });
                                }}
                                className="p-4 hover:bg-accent-soft transition-colors cursor-pointer"
                              >
                                <div className="flex gap-3">
                                  <div className="mt-0.5">
                                    <Sprout className={`w-4 h-4 ${yaVencida ? 'text-danger' : 'text-warn'}`} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-ink">
                                      {alerta.descripcionSemilla} (Lote {alerta.lote || '-'})
                                    </p>
                                    <p className="text-xs text-muted mt-0.5">{mensaje}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Bug real corregido 2026-09-04: antes esta rama era un solo texto fijo
                          // ("Próxima a finalizar en 5 días o menos") para CUALQUIER alerta que no
                          // estuviera Finalizada -- pero el backend (SiembraServiceImpl.obtenerAlertas)
                          // mete en esa misma lista tanto las que están por vencer COMO las que ya
                          // vencieron y siguen En Proceso (fecha estimada en el pasado, sin marcar
                          // como lista). Había que distinguir "todavía falta" de "ya debería estar
                          // lista", que es justo lo que reportó el dueño.
                          const diffDays = alerta.fechaEstimada
                            ? Math.ceil((new Date(alerta.fechaEstimada) - new Date()) / (1000 * 60 * 60 * 24))
                            : null;
                          const yaVencida = alerta.estado !== 'FINALIZADA' && diffDays !== null && diffDays <= 0;

                          let mensaje;
                          if (alerta.estado === 'FINALIZADA') {
                            mensaje = 'Lista para pasar a stock';
                          } else if (yaVencida) {
                            mensaje = 'Ya venció la fecha estimada — revisar';
                          } else if (diffDays !== null) {
                            mensaje = diffDays === 0 ? 'Vence hoy' : `Próxima a finalizar (en ${diffDays} d)`;
                          } else {
                            mensaje = 'Próxima a finalizar';
                          }

                          return (
                            <div
                              key={`SIEMBRA-${alerta.id}`}
                              onClick={() => {
                                setIsAlertsOpen(false);
                                navigate('/siembras', { state: { resaltarSiembraId: alerta.id } });
                              }}
                              className="p-4 hover:bg-accent-soft transition-colors cursor-pointer"
                            >
                              <div className="flex gap-3">
                                <div className="mt-0.5">
                                  {alerta.estado === 'FINALIZADA' ? (
                                    <Package className="w-4 h-4 text-ok" />
                                  ) : yaVencida ? (
                                    <Clock className="w-4 h-4 text-danger" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-warn" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-ink">
                                    {alerta.variedadPlanta?.nombre} (Siembra {alerta.numeroSiembra || '-'})
                                  </p>
                                  <p className="text-xs text-muted mt-0.5">{mensaje}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-thead border-t border-line">
                    <button
                      onClick={() => {
                        setIsAlertsOpen(false);
                        // Con dos fuentes mezcladas, cada fila ya navega a su propia pantalla al
                        // hacer click -- este botón de abajo es sólo un atajo genérico, así que va
                        // a donde haya más alertas pendientes (empate a favor de Siembras).
                        const semillas = alertas.filter(a => a.__tipo === 'SEMILLA').length;
                        const siembras = alertas.length - semillas;
                        navigate(semillas > siembras ? '/registro-semillas' : '/siembras');
                      }}
                      className="w-full py-1.5 text-xs font-semibold text-accent hover:text-accent-ink hover:bg-accent-soft rounded-base transition-colors cursor-pointer"
                    >
                      Ver todas
                    </button>
                  </div>
                </div>
              </>
            )}
            </div>
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
