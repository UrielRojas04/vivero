## Why

Actualmente, el sistema cuenta con un gráfico de torta en el Dashboard que muestra la distribución general del stock por unidad de negocio. Sin embargo, este gráfico no es útil para identificar productos con stock bajo o nulo (ya que representan porciones microscópicas o no aparecen). El usuario (el Jefe) necesita una forma rápida y directa de visualizar los productos que están por agotarse ni bien entra al sistema, sin tener que navegar al catálogo y filtrar manualmente.

## What Changes

- Se agregará una nueva tarjeta en el Dashboard junto al gráfico de torta actual.
- La tarjeta mostrará una lista de alertas con los productos con menor stock de la unidad de negocio activa (por ejemplo, los 5 o 10 con menos stock, o los que tienen menos de X unidades).
- Se agregará un nuevo endpoint o query en el backend para obtener los productos ordenados de menor a mayor stock, limitando los resultados.

## Capabilities

### New Capabilities
- `dashboard-alertas-stock`: Capacidad de mostrar de forma resumida en la pantalla de inicio los productos que requieren reposición urgente (stock crítico o bajo).

### Modified Capabilities

## Impact

- **Frontend:** Modificación de `Dashboard.jsx` para incluir la nueva vista. Creación de un nuevo componente `AlertaStock.jsx` o similar. Modificación del servicio `api/estadisticas.js`.
- **Backend:** Modificación de `ProductoRepository` (nueva query), `EstadisticasService` y `EstadisticasController` para proveer la información de stock bajo.
