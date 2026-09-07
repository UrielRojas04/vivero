## Why

El usuario necesita visualizar de forma rápida e intuitiva la distribución del stock actual de los productos. Al separar el gráfico por unidad de negocio (negocio activo en la UI), se evita mezclar datos heterogéneos (ej. plantas vs herramientas vs insumos de otros negocios) y se provee contexto útil y enfocado para la toma de decisiones.

## What Changes

- Se agregará un componente visual (Gráfico de Torta / Pie Chart) en el Dashboard o pantalla principal.
- El gráfico mostrará el porcentaje/cantidad de stock por producto o categoría de producto.
- El gráfico reaccionará al negocio activo en el que se encuentre el usuario, filtrando los datos para mostrar únicamente el stock correspondiente a ese negocio.
- Se agregará un endpoint en el backend (o se reutilizará/modificará uno existente) para agrupar y totalizar el stock por negocio.

## Capabilities

### New Capabilities
- `dashboard-graficos-stock`: Visualización de métricas de stock mediante gráficos integrados en la UI, filtrados por unidad de negocio.

### Modified Capabilities
- 

## Impact

- **Frontend**: Nuevo componente de gráfico (ej. usando Recharts o Chart.js). Modificación de la pantalla de Dashboard/Inicio.
- **Backend**: Nuevo endpoint o query para obtener los datos agrupados de stock por unidad de negocio.
- **Dependencias**: Posible agregado de librería de gráficos en React si no existe aún (ej. `recharts`).
