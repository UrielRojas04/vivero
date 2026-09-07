## Context

Actualmente el sistema cuenta con ABM de productos y gestión de stock mediante movimientos de inventario (`us-013-ventas-core`). Sin embargo, no existe una visualización gráfica rápida para entender la distribución del stock. Al haber múltiples negocios ("Vivero", "Herramientas", etc.), es vital que la información visual no mezcle peras con manzanas; el gráfico debe ser contextual al negocio activo.

## Goals / Non-Goals

**Goals:**
- Proveer un gráfico de torta (Pie Chart) interactivo en el frontend.
- Asegurar que los datos mostrados correspondan únicamente al negocio actualmente seleccionado.
- Mantener la legibilidad visual agrupando productos menores si el catálogo es muy extenso.

**Non-Goals:**
- No se incluirán gráficos históricos (evolución del stock en el tiempo) en este change.
- No se mezclarán métricas financieras (valor monetario del stock), sólo cantidades físicas.

## Decisions

1. **Librería de gráficos en Frontend**: Se utilizará `recharts` (basada en D3) por su fácil integración con React y diseño responsive.
2. **Origen de datos (Backend vs Frontend)**: Aunque el frontend ya consume productos, la paginación impediría calcular un total real de stock sin descargar toda la tabla. **Decisión:** Crear un nuevo endpoint en el backend (ej. `GET /api/estadisticas/stock-por-negocio?unidadId=X`) que devuelva los datos ya agregados (`productoNombre`, `cantidad`).
3. **Agrupación "Otros"**: Para evitar gráficos ilegibles con 50 porciones, el backend (o el frontend) ordenará de mayor a menor cantidad y agrupará a partir del 10mo ítem en una categoría "Otros". **Decisión:** Esta agrupación se hará en el frontend, así se aprovecha mejor si en un futuro se quiere mostrar el detalle en una tabla anexa.

## Risks / Trade-offs

- **Risk:** `recharts` agrega algo de peso al bundle final de Vite.
  - **Mitigation:** El gráfico se usará sólo en el Dashboard/Finanzas, se puede cargar de forma perezosa (`React.lazy`) si el impacto es notable.
- **Risk:** Carga de base de datos para calcular stock.
  - **Mitigation:** El `stockActual` ya está desnormalizado y cacheado en la tabla `Producto`, por lo que la query es un simple `SELECT nombre, stock_actual FROM productos WHERE unidad_negocio_id = X AND stock_actual > 0`. Es ultrarrápida.
