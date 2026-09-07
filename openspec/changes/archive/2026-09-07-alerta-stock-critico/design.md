## Context

Actualmente el Dashboard cuenta con un gráfico de torta de stock (`grafico-stock-unidades`), pero carece de visibilidad inmediata para los productos que están próximos a agotarse o que ya se quedaron sin stock. Los usuarios (especialmente los jefes o encargados de compras) deben navegar al catálogo completo y ordenar las columnas para encontrar esta información.

## Goals / Non-Goals

**Goals:**
- Proveer una vista rápida (tarjeta/widget) en el Dashboard con los productos con menor stock (incluyendo stock cero) de la unidad de negocio activa.
- Mostrar una lista clara tipo "semáforo" (ej. en rojo los que están en 0, en naranja los que tienen poco).

**Non-Goals:**
- No se implementarán alertas por correo electrónico, SMS o notificaciones push en esta iteración.
- No se manejará un "punto de reorden" (stock mínimo) personalizado por producto por ahora; simplemente se ordenarán los productos de menor a mayor cantidad absoluta.

## Decisions

1. **Nuevo Endpoint vs Reutilización:** El endpoint actual de estadísticas (`GET /api/estadisticas/stock`) filtra productos con `stock > 0` (porque al gráfico de torta no le sirven los ceros). Para las alertas, el stock `0` es el más crítico. 
   - *Decisión:* Se agregará un nuevo método en `EstadisticasService` (`obtenerStockCritico`) que consulte el `ProductoRepository` ordenando por `stock ASC` y tomando los primeros 10 resultados (independientemente de si es cero o mayor).
2. **Ubicación en UI:** Se colocará una nueva tarjeta en la grilla del `Dashboard.jsx`. La grilla actual tiene 2 columnas, se puede ajustar a 3 o colocar debajo del gráfico de torta.

## Risks / Trade-offs

- **Riesgo:** Si un negocio tiene 500 productos con stock 0, la lista solo mostrará 10 y ocultará los otros 490.
  - **Mitigación:** La tarjeta debe tener un botón o enlace "Ver todos en el catálogo" para redirigir al usuario a la vista completa de productos si necesita ver más allá del top 10 crítico.
