## 1. Backend

- [x] 1.1 Agregar query `findStockCritico` en `ProductoRepository` (`@Query` que ordene por `stock ASC` con parámetro `unidadId`). O usar Pageable para hacer el LIMIT a 10.
- [x] 1.2 Agregar método `obtenerStockCritico(Long unidadId, int limite)` en `EstadisticasService` e implementación.
- [x] 1.3 Agregar endpoint `GET /api/estadisticas/stock-critico?unidadId={id}&limit=10` en `EstadisticasController` (requiere permisos `LEER_STOCK`).

## 2. Frontend - Setup y UI

- [x] 2.1 Agregar función `getStockCritico` en `frontend/src/api/estadisticas.js` apuntando al nuevo endpoint.
- [x] 2.2 Crear componente `AlertaStock.jsx` en `frontend/src/components/` (o subcarpeta de finanzas/dashboard) usando Tailwind (`bg-paper`, `border-line`, texto rojo/naranja según el nivel de stock).
- [x] 2.3 Implementar lógica en `AlertaStock.jsx` para mostrar un skeleton loader mientras carga y un mensaje si no hay productos (aunque siempre debería haber).
- [x] 2.4 Renderizar la lista de productos en `AlertaStock.jsx` con el stock alineado a la derecha, resaltando en rojo (text-red-500) los que tengan stock 0.

## 3. Frontend - Integración

- [x] 3.1 Integrar `AlertaStock` en la vista `Dashboard.jsx`, pasándole el ID de la unidad de negocio activa.
- [x] 3.2 Ajustar el layout CSS/Grid de `Dashboard.jsx` si es necesario para que el gráfico de torta y la lista de alertas convivan bien en la misma pantalla (ej: 3 columnas o flex-col en mobile).
