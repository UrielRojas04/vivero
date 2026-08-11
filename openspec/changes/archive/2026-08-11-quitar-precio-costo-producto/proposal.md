## Why

Actualmente el sistema permite cargar un `precioCosto` por cada producto. Sin embargo, los insumos para la producción (como tierra y semillas) ya se registran automáticamente como gastos (costos operativos) a través del módulo de insumos y finanzas. Mantener un `precioCosto` a nivel de producto duplica conceptualmente los costos y genera confusión y cálculos imprecisos en la rentabilidad. Removerlo simplificará el modelo y hará que las finanzas reflejen la realidad operativa del vivero.

## What Changes

- Eliminar la columna `precioCosto` de la entidad `Producto`.
- Eliminar el campo `precioCosto` de `ProductoDTO` y de cualquier validación en `ProductoController`/`ProductoService`.
- Eliminar la captura y visualización de "Precio Costo" en la UI del frontend (`ProductoForm.jsx` y tablas de productos).
- **BREAKING**: Modificar la lógica de `FinanzasService` para que el cálculo de los costos totales (`totalCostos`) provenga exclusivamente de los registros de `Gasto` (que ya incluyen gastos manuales y costos automáticos de insumos) y no intente sumar el `precioCosto` de los productos vendidos.

## Capabilities

### New Capabilities
*(Ninguna)*

### Modified Capabilities
- `catalogo-productos`: Se remueve el campo `precioCosto` del modelo de producto y de sus endpoints.
- `finanzas-ui`: Se ajusta la especificación del cálculo de rentabilidad para reflejar que los costos provienen exclusivamente de gastos/insumos y no del catálogo de productos.

## Impact

- **Base de datos**: Se requiere eliminar la columna `precio_costo` de la tabla `productos`. (Spring Boot DDL auto o migración manual si corresponde).
- **Backend**: `Producto`, `ProductoDTO`, `ProductoMapper` (si existe), `ProductoService`, `FinanzasService`.
- **Frontend**: Componentes de gestión de catálogo de productos (`Productos.jsx`, formularios de creación/edición).
