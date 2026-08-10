## MODIFIED Requirements

### Requirement: Frontend Base SPA
El sistema MUST tener una SPA construida con Vite, React 19 y TailwindCSS v4 que maneje el estado de autenticación de forma global usando Zustand. El layout principal MUST usar un componente `DashboardLayout` con sidebar de navegación (usando `NavLink` de React Router) y `<Outlet />` para renderizar el contenido de cada ruta hija.

#### Scenario: Acceso restringido sin autenticación
- **WHEN** un usuario no autenticado intenta acceder a la ruta `/dashboard`
- **THEN** el sistema lo redirige a la pantalla de `/login`

#### Scenario: Acceso permitido con autenticación
- **WHEN** un usuario autenticado y con JWT en el store global accede a `/dashboard`
- **THEN** el sistema le permite visualizar la página

#### Scenario: Navegación entre secciones
- **WHEN** un usuario autenticado hace click en "Productos", "Insumos" o "Clientes" del sidebar
- **THEN** el sistema navega a `/productos`, `/insumos` o `/clientes` respectivamente, sin recargar la página y resalta visualmente la opción activa en el sidebar
