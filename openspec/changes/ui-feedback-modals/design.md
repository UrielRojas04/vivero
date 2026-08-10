## Context

El frontend (React 19 + Zustand 5 + Tailwind v4) mezcla tres paradigmas de feedback:

1. **Modales custom de eliminación** (ya implementados inline en `Productos.jsx` ~L254 y `Insumos.jsx` ~L307): overlay `fixed inset-0 z-50` con `backdrop-blur-sm`, panel `bg-white rounded-2xl`, animaciones `animate-fadeIn`/`animate-scaleIn`. Son la estética objetivo.
2. **`alert()` nativo** para errores de guardado/eliminación y 403 en acciones (18 usos en 4 páginas).
3. **`window.confirm()` nativo** para confirmaciones destructivas en `Clientes.jsx` y `UsuariosAdmin.jsx`.

Además: los mensajes 403 citan permisos obsoletos del RBAC con unidad de negocio (`VIVERO_ESCRIBIR_STOCK`), que ya no existen desde `us-012-flat-rbac`; el mensaje real del backend (`error.response?.data?.message`) solo se aprovecha en `UsuariosAdmin`.

## Goals / Non-Goals

**Goals:**
- Un único sistema de feedback de UI reutilizable, con la estética de los modales existentes (backdrop-blur, rounded-2xl, animaciones).
- Reemplazar los 18 usos de `alert`/`confirm` nativos.
- Consistentes con la paleta del proyecto: `emerald` (productos/acciones primarias), `sky` (insumos), `red` (danger), `amber` (warnings).
- Corregir de paso los textos stale de permisos y aprovechar los mensajes del backend.

**Non-Goals:**
- NO rediseñar las páginas (el estilo de `UsuariosAdmin.jsx` queda como está; solo cambia el feedback).
- NO tocar el interceptor de axios del 401 (ya resuelto: logout + redirect global).
- NO agregar dependencias nuevas.
- NO cambiar ninguna regla de permisos del backend.

## Decisions

### D1. Componentes custom con Tailwind (no librería externa)
**Decisión:** construir `ConfirmDialog`, `PermissionDeniedModal` y `ToastContainer` a mano con Tailwind v4.
**Alternativas consideradas:**
- *Sonner* (toasts): excelente, ~2kb, pero introduce API/estética externa y no cubre confirmación/permisos.
- *Radix UI (Dialog + Toast)*: accesibilidad (focus trap, Esc, aria) gratis, pero agrega dependencias y un wrapper de estilos.
- **Por qué custom:** los modales de Productos/Insumos ya definen la estética; extraerla a componentes reutilizables es el trabajo natural, con cero dependencias y control total del diseño. La accesibilidad básica (Esc para cerrar, click en overlay) se implementa manualmente.

### D2. Store de UI global con Zustand (`useUIStore`)
**Decisión:** un store Zustand centraliza todo el feedback para evitar prop-drilling y duplicación.

```
useUIStore
├── toasts: [{ id, type: 'success'|'error', message }]
├── confirmState: { open, title, message, variant: 'danger'|'warning',
│                   confirmLabel, cancelLabel, onConfirm } | null
├── permissionDenied: { open, message } | null
│
├── pushToast(type, message) / dismissToast(id)
├── askConfirm({...}) / closeConfirm()
├── denyAccess(message) / closePermissionDenied()
```

Estado derivado de la necesidad (no de la UI por página): una página que recibe 403 en un save llama `denyAccess('No tienes permisos...')` y el modal global se muestra. Nada de state local disperso.

### D3. `ConfirmDialog` — extraído de los modales existentes
**Decisión:** el componente reemplaza los bloques inline de Productos/Insumos y absorbe los `window.confirm` de Clientes/UsuariosAdmin.

Props por estado en store (no por props directas): lee `confirmState`. Variantes:
- `danger` (default): botón confirmar `bg-red-600` — eliminar.
- `warning`: botón `bg-amber-600` — acciones con consecuencias no destructivas.

Contrato del modal (mismo markup que el existente):
```
fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn
└─ bg-white rounded-2xl border border-gray-100 w-full max-w-md shadow-2xl p-6 animate-scaleIn
```

### D4. `ToastContainer` montado en `DashboardLayout`
**Decisión:** un contenedor fijo (top-right, `fixed z-[60]`) renderiza los toasts del store. Auto-dismiss a los 4s (3s para éxito). Con `setTimeout` en el propio componente y animación de entrada/salida.

- `success`: icono `CheckCircle2` emerald.
- `error`: icono `AlertCircle` red.
- Mensaje usa el texto que la página pase (ver D5).

### D5. Helper de mensajes de error + permisos reales
**Decisión:** crear `frontend/src/utils/errorMessage.js` con:

```
getErrorMessage(err, fallback)
  → err.response?.data?.message || fallback
```

Y un mapa de mensajes de permisos con los nombres **planos** actuales:
- Catálogo productos: `LEER_STOCK` / `ESCRIBIR_STOCK`
- Insumos: `LEER_INSUMOS` / `ESCRIBIR_INSUMOS`
- Clientes: `LEER_CLIENTES` / `ESCRIBIR_CLIENTES`
- Admin: `ADMIN_DB`

Cada página pasa a usar `getErrorMessage(err, 'Ocurrió un error al...')` y `denyAccess('No tienes permisos (requiere ESCRIBIR_STOCK).')` para 403.

### D6. Reemplazo incremental página por página
**Decisión:** migración sin fases de corte: primero infraestructura (D1-D3), luego reemplazo por página, validando con `npm run dev`/build al final. Orden: Productos → Insumos → Clientes → UsuariosAdmin (de menor a mayor deuda).

## Risks / Trade-offs

- **[Focus trap / accesibilidad básica]** → Implementar al menos: Esc cierra, click en overlay cierra, botones con `cursor-pointer` y estilos hover consistentes. Aceptamos no tener focus trap completo (non-goal de accesibilidad avanzada sin Radix).
- **[Toasts sin manejo de pila infinita]** → Límite de toasts simultáneos (p.ej. máx 4, descartando los más viejos) para evitar saturación en errores en ráfaga.
- **[Mensaje genérico pierde detalle backend]** → D5 mantiene el mensaje del backend cuando existe; el fallback es solo para respuestas sin body.
- **[Refactor amplio en 4 páginas → regresiones visuales]** → Los componentes reutilizan exactamente el markup existing (D3), minimizando diferencias visuales. Verificación manual en mobile (bottom-sheet en Insumos) y desktop.
- **[Animaciones de cierre no implementadas]** → Sin librería de transiciones, el desmontaje es inmediato; aceptable para esta iteración (puede refinarse luego con CSS transitions).

## Migration Plan

1. Crear `useUIStore` y `utils/errorMessage.js` (infraestructura pura, sin tocar páginas).
2. Crear `ConfirmDialog`, `PermissionDeniedModal`, `ToastContainer`.
3. Montar `ToastContainer` + modales globales en `DashboardLayout`.
4. Reemplazar en `Productos.jsx` y `Insumos.jsx` (4 alerts c/u → toasts/denyAccess; borrar bloques inline de confirmación).
5. Reemplazar en `Clientes.jsx` (`window.confirm` → `askConfirm`, alerts → toasts).
6. Reemplazar en `UsuariosAdmin.jsx` (2 `confirm` → `askConfirm`, 5 alerts → toasts/denyAccess, mensajes backend).
7. Corregir textos stale `VIVERO_*` en todos los mensajes.
8. `npm run build` + `npm run lint` para validar.

Rollback: los cambios son 100% frontend y por commit incrementales; revertir el commit de una página no afecta a las demás.

## Open Questions

- ¿Los toasts de **éxito** (guardado correcto) se agregan en este change o solo errores? El sistema lo soporta (D2), pero agregar feedback de éxito en todas las páginas expande el alcance. Default propuesto: incluir éxito al menos en crear/editar (reforzar confirmación visual).
- ¿`UsuariosAdmin.jsx` merece un restyling de paleta (`green-600` → `emerald`) en este change o queda para un cambio de UI aparte? Default: quedará igual, este change solo toca el feedback.