## Why

El historial de ventas actual muestra los registros en un orden que no es óptimo para el usuario (posiblemente de más antiguo a más nuevo, o sin orden explícito) y contiene una columna de "IDs" internos de la base de datos que no aportan valor de negocio al usuario final. Este change busca mejorar la experiencia de usuario (UX) mostrando las ventas más recientes primero y limpiando la tabla de información irrelevante.

## What Changes

- Modificar el ordenamiento de la consulta de ventas para que devuelva los registros ordenados por fecha de forma descendente (los más nuevos primero).
- Eliminar la columna "ID" de la tabla del historial de ventas en el frontend.

## Capabilities

### New Capabilities
*(Ninguna)*

### Modified Capabilities
- `historial-ventas`: Se modifica el criterio de ordenamiento por defecto y las columnas visibles en la interfaz.

## Impact

- **Backend:** `VentaRepository` o `VentaServiceImpl` para ajustar el sort en la consulta paginada (`findAllByOrderByFechaDesc` o equivalente).
- **Frontend:** Componente `HistorialVentas.jsx` (y posiblemente componentes hijos de la tabla) para remover el renderizado de la columna ID.
