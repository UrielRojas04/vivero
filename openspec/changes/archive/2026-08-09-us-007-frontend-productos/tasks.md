## 1. Refactor de Layout (DashboardLayout + Outlet)

- [x] 1.1 Crear `src/layouts/DashboardLayout.jsx` extrayendo el sidebar del `Dashboard.jsx` actual. Usar `<Outlet />` de React Router para renderizar contenido dinámico. Migrar links del sidebar de `<a href="#">` a `<NavLink>` con estilos activos.
- [x] 1.2 Actualizar `src/App.jsx` para usar `DashboardLayout` como layout wrapper de las rutas protegidas. Agregar ruta `/productos` dentro del layout. El Dashboard actual pasa a ser la ruta index `/dashboard`.
- [x] 1.3 Simplificar `src/pages/Dashboard.jsx` para que solo contenga el contenido principal (sin sidebar), ya que el layout lo provee `DashboardLayout`.

## 2. Página de Productos (Listado)

- [x] 2.1 Crear `src/pages/Productos.jsx` con la lógica de carga de datos (`useEffect` + `useState`). Llamar a `GET /api/productos` usando la instancia de Axios con JWT. Implementar estados: loading (spinner), empty state, y tabla de datos.
- [x] 2.2 Diseñar la tabla de productos con columnas: Nombre, Descripción, Precio, Stock, Acciones. Usar Tailwind para un diseño limpio con hover effects y bordes sutiles.
- [x] 2.3 Agregar botón "Nuevo Producto" en el header de la página que abre el modal de creación.

## 3. Formulario Modal (ProductoForm)

- [x] 3.1 Crear `src/components/ProductoForm.jsx` como componente reutilizable. Props: `producto` (null=crear, objeto=editar), `onSave`, `onCancel`, `isOpen`. Campos: nombre (text, requerido), descripción (textarea, opcional), precio (number, requerido), stock (number, requerido).
- [x] 3.2 Implementar validación client-side: campos requeridos no vacíos, precio > 0, stock >= 0. Mostrar mensajes de error inline en cada campo.
- [x] 3.3 Implementar el overlay/modal con backdrop, animación de entrada y cierre al hacer click fuera o presionar Escape.

## 4. Operaciones CRUD

- [x] 4.1 Implementar la creación: `POST /api/productos` con el DTO (`nombre`, `descripcion`, `precio`, `stock`, `unidadNegocioId: 1`). Al éxito, cerrar modal, refrescar lista, mostrar toast de éxito.
- [x] 4.2 Implementar la edición: al hacer click en "Editar" de un producto, abrir el modal con los datos pre-cargados. Enviar `PUT /api/productos/{id}`. Al éxito, cerrar modal, refrescar lista.
- [x] 4.3 Implementar la eliminación: al hacer click en "Eliminar", mostrar diálogo de confirmación. Al confirmar, enviar `DELETE /api/productos/{id}`. Al éxito, refrescar lista.
- [x] 4.4 Implementar manejo de errores: capturar respuestas 403 y mostrar mensaje de permisos insuficientes. Capturar errores genéricos y mostrar mensaje amigable.

## 5. Verificación

- [x] 5.1 Levantar todo el stack con `docker-compose up -d --build`. Verificar que la navegación sidebar→Productos funciona.
- [x] 5.2 Verificar el CRUD completo: crear un producto, editarlo, listar, y eliminar. Confirmar que los datos persisten en la base de datos.
