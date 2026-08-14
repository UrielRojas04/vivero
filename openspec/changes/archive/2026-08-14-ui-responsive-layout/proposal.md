## Why

El sistema fue diseñado inicialmente con una interfaz optimizada para escritorio. Al intentar usarlo desde dispositivos móviles (celulares o tablets), la navegación, el menú lateral (Sidebar) y el panel superior (Navbar) se desbordan o se superponen, lo que dificulta su uso operativo en terreno (ej. dentro de los viveros o invernaderos donde los empleados registran datos con sus teléfonos). Es fundamental tener un layout principal 100% responsivo para iniciar la adaptación mobile-first de toda la app.

## What Changes

- Ocultar por defecto el `Sidebar` en pantallas pequeñas (mobile/tablet).
- Agregar un botón "Hamburguesa" en el `Navbar` visible solo en pantallas pequeñas para abrir el `Sidebar` como un menú desplegable (Drawer) o Sidebar temporal.
- Adaptar el contenedor principal de contenido para que ajuste sus márgenes y paddings dependiendo de si el Sidebar está abierto o cerrado en escritorio, y que use el 100% del ancho en mobile.
- Asegurar que los componentes del `Navbar` (perfil, selector de unidad) no se desborden ni se superpongan en pantallas angostas.

## Capabilities

### New Capabilities
- `ui-responsive`: Capacidad del frontend para adaptarse fluida y automáticamente a múltiples resoluciones y orientaciones de dispositivos.

### Modified Capabilities
- Ninguna. No cambian las reglas de negocio, solo la presentación visual del layout general.

## Impact

- `DashboardLayout.jsx`: Cambios estructurales mayores para incorporar estados de visibilidad del Sidebar.
- `Sidebar.jsx`: Cambios en clases de Tailwind (`sm:`, `md:`, `lg:`) y adición de overlay/backdrop para cerrar al hacer click afuera en mobile.
- `Navbar.jsx`: Inclusión de botón de menú para controlar el Sidebar, ajustes de flex y grid para evitar desbordes.
