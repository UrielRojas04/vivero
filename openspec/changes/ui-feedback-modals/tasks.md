## 1. Infraestructura de feedback

- [x] 1.1 Crear `frontend/src/store/useUIStore.js` (Zustand): estado `toasts`, `confirmState`, `permissionDenied` + acciones `pushToast`, `dismissToast`, `askConfirm`, `closeConfirm`, `denyAccess`, `closePermissionDenied`. Límite de 4 toasts simultáneos.
- [x] 1.2 Crear `frontend/src/utils/errorMessage.js` con `getErrorMessage(err, fallback)` que devuelve `error.response?.data?.message` cuando existe.

## 2. Componentes reutilizables

- [x] 2.1 Crear `frontend/src/components/ConfirmDialog.jsx`: lee `confirmState` del store; variantes `danger` (rojo) y `warning` (ámbar); cierra con Cancelar, Escape y click en overlay; markup idéntico al modal existente de Productos/Insumos (backdrop-blur, rounded-2xl, animate-fadeIn/scaleIn).
- [x] 2.2 Crear `frontend/src/components/PermissionDeniedModal.jsx`: lee `permissionDenied` del store; título "Acceso Denegado", icono de permisos y botón único de cierre.
- [x] 2.3 Crear `frontend/src/components/ToastContainer.jsx`: renderiza `toasts` del store en posición fixed (top-right); auto-dismiss con setTimeout (4s error, 3s éxito); iconos `AlertCircle` (error) / `CheckCircle2` (éxito).

## 3. Montaje global en layout

- [x] 3.1 Montar `ToastContainer`, `ConfirmDialog` y `PermissionDeniedModal` en `frontend/src/layouts/DashboardLayout.jsx` para que estén disponibles en todas las páginas autenticadas.
- [x] 3.2 Verificar que los overlays usan z-index superior al contenido (`z-50` modales, `z-[60]` toasts) y no rompen el layout.

## 4. Migración Productos

- [x] 4.1 Reemplazar el `alert` de permisos en `handleCreateOrUpdate` (L56) por `denyAccess` con texto de permiso plano `ESCRIBIR_STOCK`.
- [x] 4.2 Reemplazar el `alert` de error genérico al guardar (L58) por `pushToast('error', getErrorMessage(err, fallback))`.
- [x] 4.3 Reemplazar los `alert` de permisos y error al eliminar (L71, L73) por `denyAccess` y `pushToast` respectivamente.
- [x] 4.4 Eliminar el bloque inline de confirmación de eliminación (L254-277) y usar `askConfirm({title, message, variant:'danger', onConfirm})`.
- [x] 4.5 Opcional: emitir `pushToast('success', ...)` tras crear/editar/eliminar correctamente.

## 5. Migración Insumos

- [x] 5.1 Reemplazar el `alert` de permisos en `handleCreateOrUpdate` (L52) por `denyAccess` con `ESCRIBIR_INSUMOS`.
- [x] 5.2 Reemplazar el `alert` de error genérico al guardar (L54) por `pushToast`.
- [x] 5.3 Reemplazar los `alert` de permisos y error al eliminar (L67, L69) por `denyAccess` y `pushToast`.
- [x] 5.4 Eliminar el bloque inline de confirmación de eliminación (L307-330) y usar `askConfirm` (conservando el comportamiento bottom-sheet en mobile).
- [x] 5.5 Opcional: `pushToast('success', ...)` tras operaciones correctas.

## 6. Migración Clientes

- [x] 6.1 Reemplazar `window.confirm` de eliminación (L69) por `askConfirm` con el nombre del cliente en el mensaje.
- [x] 6.2 Reemplazar el `alert` de error al guardar (L64) por `pushToast` con `getErrorMessage`.
- [x] 6.3 Reemplazar el `alert` de error al eliminar (L75) por `pushToast` (manteniendo la pista de ventas asociadas si el backend la provee).
- [x] 6.4 Opcional: `pushToast('success', ...)` tras operaciones correctas.

## 7. Migración UsuariosAdmin

- [x] 7.1 Reemplazar el `alert` de error al cargar datos (L58) por un banner o `pushToast` con mensaje de permisos.
- [x] 7.2 Reemplazar los `alert` de guardado de usuario y rol (L95, L161) por `pushToast` con `getErrorMessage(error, fallback)` (ya usan `error.response?.data?.message` — estandarizar).
- [x] 7.3 Reemplazar los `alert` de error al eliminar (L106, L172) por `pushToast`.
- [x] 7.4 Reemplazar los `confirm()` nativos de eliminación de usuario y rol (L100, L166) por `askConfirm`.
- [x] 7.5 Opcional: `pushToast('success', ...)` tras operaciones correctas.

## 8. Corrección de textos stale y verificación

- [x] 8.1 Corregir en `Productos.jsx` y `Insumos.jsx` los mensajes de fetch (L28, L26) que citan `VIVERO_LEER_STOCK` → `LEER_STOCK` / `LEER_INSUMOS` (verificar también en el banner inline).
- [x] 8.2 Eliminar toda referencia remanente a `alert(`, `confirm(` o `window.confirm(` en `frontend/src` (grep de verificación).
- [x] 8.3 Correr `npm run lint` (oxlint) y `npm run build` en `frontend/` y resolver cualquier error.
- [x] 8.4 Verificación manual (mobile + desktop): confirmaciones, toasts de error/success y modal de acceso denegado en las 4 páginas.