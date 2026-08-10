## Purpose
Define contratos, componentes y estructura base del frontend (SPA React + Vite + Tailwind, DashboardLayout, estado global de autenticación y feedback UI), de modo que todas las capacidades de UI hereden un conjunto mínimo de reglas verificables.
## Requirements
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

### Requirement: Diseño y UI
La interfaz gráfica MUST presentar un diseño moderno (ej. glassmorphism) sin depender fuertemente de librerías de componentes externas.

#### Scenario: Carga de la aplicación
- **WHEN** el usuario ingresa al root `/`
- **THEN** puede ver la interfaz con la paleta de colores y estilos base definidos en TailwindCSS v4

### Requirement: User Profile Indicator
The global UI layout SHALL display a visual indicator of the currently authenticated user at all times.

#### Scenario: User is logged in
- **WHEN** a user logs in successfully and views the dashboard or any other page
- **THEN** a profile component appears in the top right corner showing a circular avatar (with the first letter of their username), the username, and the primary role name (e.g. "JEFE")

### Requirement: Global Feedback Container
The main authenticated layout (`DashboardLayout`) SHALL mount a global feedback container that renders toasts and confirmation/permission dialogs on top of the page content, so feedback is visible in all authenticated pages without per-page wiring.

#### Scenario: Toast visible from any authenticated page
- **WHEN** a page triggers a toast through the UI store
- **THEN** the toast renders from the global container mounted in `DashboardLayout` without the page needing its own toast markup

#### Scenario: Dialog renders above page content
- **WHEN** a confirmation or permission denied dialog is triggered
- **THEN** it renders as a fixed overlay above the page content with the standard z-index stacking

