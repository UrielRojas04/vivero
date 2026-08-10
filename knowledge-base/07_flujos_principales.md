# Flujos Principales (End-to-End)

> **Estado real (2026-08-10):** El flujo de login está implementado (JWT + password). El flujo de ventas con SSE está **planificado** (`us-013`, `us-015`), no implementado aún.

## Flujo 1: Inicio de Sesión (✅ Implementado)
1. El usuario ingresa a la app e ingresa su `username` y `password`.
2. El frontend envía credenciales al endpoint `POST /api/auth/login`.
3. Backend valida password (BCrypt) y retorna un JWT. El JWT contiene el `user_id` y los roles/permisos.
4. El frontend guarda el JWT (useAuthStore) y redirige al dashboard. El `axios.js` interceptor adjunta el token y maneja refresh automático.

### Flujo protegido (Route Protection — `ui-rbac-profile`)
- `ProtectedRoute` verifica el permiso requerido por ruta; si el usuario navega por URL a una ruta sin permiso, se redirige o muestra "Acceso denegado".
- `DashboardLayout` oculta las secciones de navegación según los permisos (Section Rendering Based on Roles).

## Flujo 2: Venta y Sincronización en Tiempo Real (🚀 Planificado — `us-013`, `us-015`)
1. Un Operario en el invernadero agrega productos al carrito y finaliza la venta.
2. Backend valida stock (RN-01), genera la `Venta`, descuenta stock y guarda el detalle con precios históricos (RN-04).
3. Backend emite un evento SSE: `EVENT: STOCK_UPDATE, PAYLOAD: { producto_id, nuevo_stock }`.
4. El celular del Operario genera el PDF localmente en el browser y da opción a compartirlo.
5. El navegador del Jefe en la oficina recibe el evento SSE, invalida la caché de TanStack Query para ese producto, y el componente hace re-fetch silencioso mostrando el stock actualizado.

*(Actualmente NO hay SSE: el stock se actualiza con re-fetch manual / TanStack Query al volver a la página).*

## Flujo 3: Devolución de Bandejas (🚀 Planificado — `us-014`)
1. El Encargado de Logística busca a un `Cliente` en el sistema.
2. Selecciona "Ingresar Devolución" y pone cantidad (ej: 50).
3. Backend impacta un registro en `HistorialBandejas` (tipo DEVOLUCION).
4. Backend actualiza (resta 50) el `balanceBandejas` en la tabla `CuentaCorrienteBandejas` de ese cliente.

## Flujo 4: Feedback UX Global (✅ Implementado — `ui-feedback-modals`)
1. Una página dispara una acción (crear/editar/eliminar producto, insumo, cliente, usuario).
2. La página usa `useUIStore` → `pushToast` (éxito/error), `askConfirm` (confirmación destructiva) o `denyAccess` (permiso denegado 403).
3. Los componentes globales montados en `DashboardLayout` (`ToastContainer`, `ConfirmDialog`, `PermissionDeniedModal`) renderizan el feedback sobre el contenido, sin wiring por página.