## Context

El frontend ya tiene una SPA funcional (Vite + React 19 + Tailwind v4 + Zustand) con login, Dashboard shell con sidebar, y un sistema de rutas protegidas. El backend expone `ProductoController` con CRUD completo en `/api/productos` protegido con `@PreAuthorize` dinámico (`VIVERO_LEER_STOCK`, `VIVERO_ESCRIBIR_STOCK`). El `ProductoDTO` tiene: `id`, `nombre`, `descripcion`, `precio` (BigDecimal), `stock` (Integer), `unidadNegocioId` (Long).

## Goals / Non-Goals

**Goals:**
- Crear una página funcional para listar productos en tabla con diseño profesional.
- Permitir crear, editar y eliminar productos desde la UI.
- Integrar con React Router (link desde sidebar) y la instancia de Axios con JWT.
- Feedback visual: loading states, notificaciones de éxito/error, modal de confirmación para eliminación.

**Non-Goals:**
- Paginación server-side (se implementará en un change de escalabilidad futuro).
- Filtro por Unidad de Negocio (el backend ya filtra por permisos del JWT).
- Upload de imágenes de productos.
- Reordenamiento drag-and-drop de la tabla.

## Decisions

### 1. Página única con modal para formulario (vs. página separada)
**Decisión**: Usar un modal/overlay para crear y editar productos en vez de una ruta `/productos/nuevo`.
**Razón**: Para un ABM simple con pocos campos, un modal es más fluido (el usuario no pierde contexto de la tabla). Si el formulario crece, se puede migrar a página separada después.
**Alternativa descartada**: Ruta separada `/productos/:id/editar` — demasiado overhead para 5 campos.

### 2. Componente `ProductoForm` reutilizable
**Decisión**: Extraer el formulario a `src/components/ProductoForm.jsx` que recibe `producto` (null para crear, objeto para editar) y `onSave`/`onCancel` callbacks.
**Razón**: Se usa tanto para crear como para editar, evita duplicación. Sigue el patrón container-presentational.

### 3. Estado local en la página (vs. Zustand store)
**Decisión**: Manejar la lista de productos con `useState`/`useEffect` local en la página, no en Zustand.
**Razón**: Los productos no son estado global de la app (solo se necesitan en esta página). Zustand se reserva para estado cross-cutting (auth, tema, etc). Si necesitamos compartir productos entre múltiples páginas en el futuro, se migra a un store.

### 4. Sidebar con React Router `NavLink`
**Decisión**: Migrar los `<a href="#">` del sidebar a `<NavLink>` de React Router con `activeClassName`.
**Razón**: Habilita navegación SPA real (sin recarga de página) y resalta visualmente la sección activa.

### 5. Layout compartido con `<Outlet />`
**Decisión**: Extraer el sidebar+header a un componente `DashboardLayout` que use `<Outlet />` de React Router para renderizar el contenido dinámico de cada ruta hija.
**Razón**: El sidebar es idéntico para todas las páginas protegidas. Sin esto, cada página tendría que duplicar el layout completo.

## Risks / Trade-offs

- **[Sin paginación]** → Si hay miles de productos, `GET /api/productos` devuelve todo. Mitigation: el volumen actual es bajo (<100 productos); se implementará paginación en un change futuro.
- **[Modal vs. página]** → Si el formulario crece mucho (ej. se agregan campos de imágenes, variantes), el modal se queda chico. Mitigation: diseño del componente permite migración fácil a ruta separada.
- **[Hardcoded `unidadNegocioId`]** → El frontend va a necesitar saber qué unidades de negocio tiene el usuario para enviar el `unidadNegocioId` correcto al crear productos. Mitigation: para este change, se hardcodea el ID de "Vivero" (1) ya que es la única unidad de negocio de productos. En el change del admin panel se expondrá un selector dinámico.
