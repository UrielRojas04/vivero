## Why

El Jefe necesita una forma de restringir el acceso a ciertas secciones del sistema para diferentes empleados (ej. que alguien solo vea Insumos y no Productos) para simplificar la interfaz y mejorar la seguridad. Además, al probar el sistema, es difícil saber qué usuario está activo, por lo que se requiere un indicador visual en pantalla.

## What Changes

- Modificación de la barra de navegación/menú lateral para ocultar o mostrar enlaces basándose en los permisos del usuario logueado.
- Adición de un componente de "Perfil de Usuario" en la esquina superior de la interfaz, que muestre un círculo con la inicial, el nombre de usuario y el rol actual.
- Actualización de las rutas de React para proteger el acceso directo por URL a secciones no autorizadas.

## Capabilities

### New Capabilities
*(Ninguna)*

### Modified Capabilities
- `user-rbac`: Se añaden requerimientos de protección de rutas y renderizado condicional de componentes en la UI basados en permisos.
- `frontend-core`: Se actualiza el layout principal para incluir el componente de perfil (username y rol) en la esquina superior.

## Impact

- `App.jsx` o el componente de Layout (Navbar/Sidebar) en el frontend.
- `useAuthStore` (para exponer de manera fácil los permisos del usuario).
- Rutas del frontend (para aplicar el guard de seguridad).
