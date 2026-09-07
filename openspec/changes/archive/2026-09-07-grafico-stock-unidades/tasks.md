## 1. Backend

- [x] 1.1 Crear `StockPorNegocioDTO` en `com.vivero.gestion.models.dto` (campos: `productoNombre`, `cantidad`).
- [x] 1.2 Agregar query custom en `ProductoRepository` (ej. `@Query("SELECT new com.vivero.gestion.models.dto.StockPorNegocioDTO(p.nombre, p.stockActual) FROM Producto p WHERE p.unidadNegocio.id = :unidadId AND p.stockActual > 0")`).
- [x] 1.3 Crear método en `EstadisticasService` (o agregarlo a `ProductoService` si no existe el de estadísticas) para invocar al repositorio.
- [x] 1.4 Crear `EstadisticasController` con endpoint `GET /api/estadisticas/stock?unidadId={id}` (asegurando validación de permisos si aplica).

## 2. Frontend - Setup y UI

- [x] 2.1 Instalar dependencia `recharts` en el frontend (`npm install recharts` dentro de la carpeta `frontend`).
- [x] 2.2 Crear servicio en `frontend/src/api/estadisticas.js` para llamar al nuevo endpoint.
- [x] 2.3 Crear componente `StockPieChart.jsx` en `frontend/src/components/` (o subcarpeta de finanzas/dashboard).
- [x] 2.4 Implementar lógica en `StockPieChart.jsx` para agrupar ítems menores en "Otros" si hay más de 9 productos.
- [x] 2.5 Renderizar el `<PieChart>` de Recharts con Tooltip, Legend y colores de Tailwind.
- [x] 2.6 Integrar `StockPieChart` en la vista de Dashboard/Inicio, pasándole el ID de la unidad de negocio activa (obtenida del estado global de auth o UI).
