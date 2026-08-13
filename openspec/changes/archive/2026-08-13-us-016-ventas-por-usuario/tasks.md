## 1. Backend: Registro de Usuario en Ventas

- [x] 1.1 En `VentaServiceImpl.crearVenta()`, extraer el usuario logueado mediante `SecurityContextHolder` y asignarlo al objeto `Venta` antes de persistir. (Lanzar excepción si no existe).
- [x] 1.2 En `VentaLiteDTO` y `VentaDTO`, agregar el campo `String usuarioNombre` (o `vendedorNombre`).
- [x] 1.3 Modificar los mapeos en `VentaServiceImpl` para popular el nuevo campo en los DTOs devolviendo el username del creador.

## 2. Backend: Soporte de Filtro por Usuario en Finanzas

- [x] 2.1 En `VentaRepository`, modificar la consulta de ventas paginadas y `finanzasService.obtenerResumen` para aceptar un filtro opcional por `usuarioId` o nombre de usuario (ej: pasar el id del usuario clickeado o null para todos).
- [x] 2.2 Asegurar que el endpoint `/api/finanzas/resumen` y `/api/ventas/finanzas` acepten este nuevo parámetro `vendedorId` de forma segura.

## 3. Frontend: Muestra del Vendedor en Historial y Finanzas

- [x] 3.1 Actualizar las definiciones y tipos (o asunciones) de los DTOs en el frontend para manejar el nuevo campo `vendedorNombre`.
- [x] 3.2 Modificar la grilla de Finanzas (`Finanzas.jsx`) para mostrar la columna o indicador de "Vendedor" (usuarioNombre) en cada fila de venta.

## 4. Frontend: Filtro interactivo de Vendedores en Finanzas

- [x] 4.1 En `Finanzas.jsx`, implementar UI (chips, select o tabs) que se pueble dinámicamente con los vendedores que han operado en ese período, más una opción "Todos".
- [x] 4.2 Ligar el evento onClick de esta UI o el click sobre el nombre en la grilla para actualizar un estado de `selectedVendedorId`.
- [x] 4.3 Actualizar los queries de React Query en `Finanzas.jsx` para pasar este parámetro y lograr que los KPIs y la tabla se recalculen al aislar un usuario.
