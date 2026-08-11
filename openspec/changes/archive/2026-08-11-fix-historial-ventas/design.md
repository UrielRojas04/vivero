## Context

El componente `HistorialVentas.jsx` presenta los registros de ventas a los usuarios, pero el orden actual dificulta encontrar las ventas más recientes. Además, la tabla muestra los IDs internos generados por la base de datos (PostgreSQL), los cuales carecen de significado para el negocio y ocupan espacio valioso en la interfaz.

## Goals / Non-Goals

**Goals:**
- Mostrar las ventas ordenadas desde la más reciente hasta la más antigua por defecto (usando la fecha).
- Ocultar/eliminar la columna de ID interno en el frontend para dar más limpieza visual.

**Non-Goals:**
- Refactorizar el backend de filtrado o la capa de servicios más allá del ordenamiento en la petición `findAll`.
- Modificar el DTO de la API (el ID puede seguir viajando ya que es útil para edición u otros flujos internos, solo no se mostrará).

## Decisions

- **Ordenamiento (Backend vs Frontend):** Se decide aplicar el ordenamiento a nivel de base de datos en el `VentaRepository` usando `OrderByFechaDesc`. Esto asegura que en un entorno paginado, la primera página realmente traiga los registros globalmente más recientes, en lugar de ordenar localmente solo la página actual.
- **Eliminación de la Columna ID:** Se mantendrá el `venta.id` en el objeto que llega al frontend como `key` para React y para futuras acciones (como "ver detalle"), pero simplemente se removerá el `<th/>` y `<td/>` de la tabla en el JSX.

## Risks / Trade-offs

- Ninguno relevante; es una modificación menor puramente de visualización UX y ordenamiento estándar.
