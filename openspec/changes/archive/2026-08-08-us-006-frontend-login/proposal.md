## Why

El frontend actual quedó obsoleto debido al cambio arquitectónico en el backend (Sesión Unificada Global). Anteriormente, el usuario debía seleccionar la Unidad de Negocio al momento del login. Ahora, la sesión engloba todos los permisos y el backend maneja dinámicamente la seguridad por recursos. Es necesario actualizar la UI base y el flujo de login para poder testear todo el sistema visualmente.

## What Changes

- **BREAKING**: Se eliminará el proyecto frontend actual.
- Se inicializará un nuevo proyecto React 19 usando Vite y Tailwind CSS v4.
- Se instalará Zustand para manejo del estado global (Token JWT, Datos de Usuario) y React Router para la navegación.
- Se implementará la nueva pantalla de Login simplificada (solo Email/Username y PIN).
- Se implementará un Dashboard básico como punto de aterrizaje post-login.

## Capabilities

### New Capabilities
- `frontend-core`: Andamiaje base de la aplicación React (Vite, Tailwind, Zustand, Router).

### Modified Capabilities
- `user-rbac`: El frontend ya no debe enviar el `unidadNegocioId` durante el proceso de autenticación. El token JWT resultante será de alcance global.

## Impact

- **Frontend**: Nuevo repositorio o reescritura de la carpeta `frontend`.
- **Experiencia de Usuario**: Proceso de login más rápido y centralizado.
