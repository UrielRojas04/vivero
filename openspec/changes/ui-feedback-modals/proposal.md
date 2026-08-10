## Why

El frontend tiene **18 usos de `alert()`/`window.confirm()`** repartidos en 4 páginas (Productos, Insumos, Clientes, UsuariosAdmin), mientras que la confirmación de eliminación de Productos/Insumos ya usa un modal custom con backdrop-blur y animaciones. Esta inconsistencia degrada la experiencia (native `window.confirm` bloquea y se ve fuera de lugar), duplica lógica de confirmación casi idéntica, esconde los mensajes reales del backend y arrastra textos de permisos obsoletos (`VIVERO_ESCRIBIR_STOCK`) que ya no existen desde el RBAC plano.

## What Changes

- **Extraer `ConfirmDialog`**: componente reutilizable de confirmación de acciones destructivas, derivado de los modales ya existentes en `Productos.jsx` e `Insumos.jsx`, con variante danger/warning.
- **Sistema de toasts global**: store de UI (Zustand) + contenedor global para feedback transitorio (éxito/error), con auto-dismiss. Reemplaza los `alert()` de error al guardar/eliminar.
- **Modal `PermissionDeniedModal`**: feedback visual consistente cuando una acción devuelve 403 (Acceso Denegado), en lugar de `alert` de permisos.
- **Reemplazar los 18 usos** de `alert`/`confirm` nativos en las 4 páginas por los componentes nuevos, manteniendo la estética existente (glassmorphism, backdrop-blur, `animate-scaleIn`).
- **Corregir textos stale de permisos**: `VIVERO_LEER_STOCK`/`VIVERO_ESCRIBIR_STOCK` → permisos planos reales (`LEER_STOCK`, `ESCRIBIR_STOCK`, `LEER_INSUMOS`, etc.).
- **Mostrar mensajes del backend** (`error.response?.data?.message`) cuando existan, con fallback genérico — estandarizando el patrón que ya usa `UsuariosAdmin.jsx`.

## Capabilities

### New Capabilities
- `ui-feedback`: Sistema de feedback de UI reutilizable para el frontend — ConfirmDialog (confirmación destructiva), PermissionDeniedModal (403 en acciones) y toasts globales (errores transitorios de guardado/eliminación) con la estética visual existente.

### Modified Capabilities
- `frontend-core`: El layout principal pasa a incluir un contenedor global de feedback (toasts) montado en `DashboardLayout`, visible en todas las páginas autenticadas.

## Impact

- `frontend/src/components/ConfirmDialog.jsx` (nuevo)
- `frontend/src/components/PermissionDeniedModal.jsx` (nuevo)
- `frontend/src/components/ToastContainer.jsx` (nuevo) + `frontend/src/store/useUIStore.js` (nuevo)
- `frontend/src/pages/Productos.jsx`, `Insumos.jsx`, `Clientes.jsx`, `UsuariosAdmin.jsx` — reemplazo de `alert`/`confirm`
- `frontend/src/layouts/DashboardLayout.jsx` — montaje del contenedor de toasts
- Sin cambios en backend. Sin dependencias nuevas (componentes custom con Tailwind v4, igual que los modales existentes).