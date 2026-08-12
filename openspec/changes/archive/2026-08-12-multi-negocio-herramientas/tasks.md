## 1. Backend: Unidad de Negocio Core

- [x] 1.1 Revisar y habilitar la entidad `UnidadNegocio` (y crear registros base como "Vivero" y "Herramientas" vía inicialización de datos si es necesario).
- [x] 1.2 Crear o habilitar `UnidadNegocioController` y `UnidadNegocioService` para devolver la lista de negocios disponibles (ej. `GET /api/negocios`).
- [x] 1.3 Agregar filtro global o interceptor que lea el header `X-Unidad-Negocio` y lo inyecte en el contexto (o pasarlo explícitamente en los queries de los repositorios).

## 2. Backend: Filtrado de Entidades Core

- [x] 2.1 Agregar relación `unidadNegocio` a la entidad `Producto`.
- [x] 2.2 Agregar relación `unidadNegocio` a la entidad `Venta` y `MovimientoStock`.
- [x] 2.3 Modificar `ProductoRepository` para filtrar por `unidad_negocio_id` en `findAll`, y en búsquedas de stock.
- [x] 2.4 Modificar `VentaRepository` para filtrar por `unidad_negocio_id`.

## 3. Frontend: Contexto Global y Autenticación

- [x] 3.1 Actualizar estado global (`useAuthStore` o crear `useBusinessStore`) para guardar y exponer `unidadNegocioActiva` y la lista de negocios disponibles.
- [x] 3.2 Modificar el interceptor de Axios (`api/axios.js`) para inyectar automáticamente el header `X-Unidad-Negocio` con el ID del negocio activo.
- [x] 3.3 Al loguearse, inicializar la lista de negocios y seleccionar por defecto "Vivero" o el primer negocio disponible.

## 4. Frontend: Selector Global y UI

- [x] 4.1 En `DashboardLayout.jsx`, agregar un `<select>` o menú dropdown en el Header o Sidebar para poder cambiar de negocio rápidamente.
- [x] 4.2 Restringir menú lateral (Sidebar): Dependiendo de la unidad de negocio activa, ocultar vistas que no apliquen (ej. si estoy en "Herramientas", ocultar "Siembras" e "Insumos").

## 5. Frontend: Negocio de Herramientas

- [x] 5.1 Crear/modificar vista de "Productos (Herramientas)". Las vistas `ProductoList.jsx` y `ProductoForm.jsx` ya soportan esto ya que el Backend ahora filtra por el header `X-Unidad-Negocio`. Validar que si `unidadNegocioActiva === 2`, el listado traiga solo herramientas.
- [x] 5.2 Permitir en el formulario de ventas vender herramientas, ya que la lógica de backend ya está cableada, debería funcionar automáticamente.) o dejarlo genérico.
