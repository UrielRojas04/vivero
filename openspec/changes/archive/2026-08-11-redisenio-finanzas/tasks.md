## 1. Backend: Soporte de Búsqueda

- [x] 1.1 Modificar `VentaRepository` para incluir un parámetro opcional de búsqueda (`q`) en la query paginada de ventas del período (ej. `LOWER(v.cliente.nombre) LIKE LOWER(CONCAT('%', :q, '%'))`).
- [x] 1.2 Actualizar `FinanzasService.listarVentas` y `FinanzasController.obtenerVentasPorRango` para aceptar el nuevo parámetro `q`.
- [x] 1.3 Modificar `GastoRepository.listarGastosUnificados` para incluir un parámetro opcional de búsqueda en el concepto / nombre de insumo.
- [x] 1.4 Actualizar `GastoService.listarGastos` y `GastoController.listarGastos` para aceptar el nuevo parámetro `q`.

## 2. Frontend: Dependencias y API

- [x] 2.1 Instalar dependencia `recharts` (u otra librería de gráficos acordada) en el contenedor frontend.
- [x] 2.2 Actualizar `finanzas.api.js` y `gastos.api.js` para enviar el parámetro `q` en las peticiones GET si está presente.

## 3. Frontend: Rediseño de Finanzas.jsx

- [x] 3.1 Agregar estado local en `Finanzas.jsx` para el manejo del drill-down (`showVentas`, `showGastos`) y los textos de búsqueda (`searchVentas`, `searchGastos`).
- [x] 3.2 Implementar el onClick en las tarjetas KPI de "Total Ventas" y "Costos" para conmutar la visibilidad de los listados de detalle.
- [x] 3.3 Diseñar e integrar un componente de Gráfico Estadístico (ej. un gráfico de dona mostrando Ingresos vs Egresos, o distribución de costos) usando `recharts` o equivalente.
- [x] 3.4 Agregar barras de búsqueda (inputs) encima de las tablas de Ventas y Gastos con debounce o disparador manual para actualizar las queries de TanStack.
- [x] 3.5 Refinar el layout general para que el gráfico y las tarjetas KPI ocupen el primer plano, y las listas paginadas se muestren de forma condicional, logrando un aspecto más limpio y profesional.
