## Why

El backend ya expone un CRUD completo de Productos (`/api/productos`) con seguridad dinámica por Unidad de Negocio, pero no existe interfaz gráfica para consumirlo. El jefe necesita poder listar, crear, editar y eliminar productos (plantas) directamente desde el navegador sin depender de herramientas como Postman.

## What Changes

- **Nueva página `Productos`** con tabla de listado, búsqueda y acciones CRUD (crear, editar, eliminar).
- **Modal/formulario reutilizable** para la creación y edición de productos.
- **Integración con el sidebar** existente del Dashboard para navegar a `/productos`.
- **Actualización del ruteo** en `App.jsx` para incluir la ruta protegida `/productos`.
- **Feedback visual** con estados de carga, mensajes de éxito/error y confirmación antes de eliminar.

## Capabilities

### New Capabilities
- `frontend-productos`: Pantalla de gestión de productos con CRUD completo conectado al backend, incluyendo tabla de datos, formulario modal y feedback visual.

### Modified Capabilities
- `frontend-core`: Agrega la ruta `/productos` al sistema de navegación y actualiza el sidebar del Dashboard para linkear a la nueva página.

## Impact

- **Frontend**: Nuevos archivos en `src/pages/Productos.jsx`, `src/components/ProductoForm.jsx`. Modificación de `App.jsx` (ruta) y `Dashboard.jsx` (sidebar links con React Router).
- **API consumida**: `GET /api/productos`, `POST /api/productos`, `PUT /api/productos/{id}`, `DELETE /api/productos/{id}`.
- **Dependencias**: Ninguna nueva — se usa la instancia de Axios ya configurada con interceptors JWT.
