## Why

La pantalla de Finanzas actual concentra mucha información (ventas, costos, gastos) en un layout que puede resultar abrumador. Para mejorar la usabilidad y brindar una experiencia más profesional y entendible, se requiere un rediseño interactivo donde los detalles (listas de ventas y gastos) se revelen a demanda al interactuar con las tarjetas (KPIs), sumando capacidades de búsqueda y visualización gráfica.

## What Changes

- **Rediseño del Layout de Finanzas**: Transformar la vista estática en un dashboard interactivo.
- **Navegación por Tarjetas (Drill-down)**: Al hacer clic en la tarjeta de "Total Ventas", se debe desplegar u ocultar la sección/tabla de Ventas. Al hacer clic en "Total Costos", se debe desplegar u ocultar la sección de Gastos/Costos.
- **Buscadores Integrados**: Agregar barras de búsqueda en las tablas de ventas y costos/gastos para poder filtrar registros rápidamente dentro del período.
- **Gráficos Estadísticos**: Incorporar gráficos visuales, entendibles y profesionales (ej: usando librerías como Recharts o Chart.js) para mostrar la evolución o la distribución de ingresos vs egresos, en lugar de (o además de) las barras de progreso estáticas.

## Capabilities

### New Capabilities
<!-- Ninguna, todo corresponde al rediseño del módulo existente -->

### Modified Capabilities
- `finanzas-ui`: Cambia el requerimiento de presentación del tablero de finanzas para incorporar interacción en las tarjetas KPI (drill-down hacia las listas), búsqueda, y componentes gráficos estadísticos.

## Impact

- **Frontend**: Fuerte modificación del componente `Finanzas.jsx` y su estructura visual. Integración de posible nueva dependencia de gráficos (ej. `recharts`). Modificaciones en el estado local para manejar la visibilidad de las subsecciones y filtros de búsqueda.
- **Backend (potencial)**: La búsqueda de ventas y gastos podría requerir agregar parámetros de filtrado (`q` o similar) a `FinanzasController` y `GastoController`, o bien hacerse en el frontend si los datos están totalmente cargados (aunque dado que es paginado, debería ser en el backend).
