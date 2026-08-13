## Why

El modelo actual de precios requiere que el usuario ingrese el precio de venta final de forma manual para cada producto. Esto es propenso a errores y dificulta la actualización masiva o el cálculo dinámico cuando los costos de catálogo (proveedor), envíos o descuentos cambian. Al introducir un modelo basado en porcentaje de ganancia (margen), el sistema podrá calcular automáticamente el precio de venta asegurando siempre la rentabilidad deseada sobre el costo real (Costo Final = Costo Base - Descuento + Envío).

## What Changes

- Se introduce un nuevo campo `porcentajeGanancia` en el modelo `Producto`.
- El campo existente de costo se renombra conceptualmente a "Costo Catálogo" (costo base del proveedor).
- El Precio de Venta ya no será un campo de ingreso manual obligatorio independiente, sino que será calculado (o sugerido/fijado) en base a: `Costo Final * (1 + porcentajeGanancia / 100)`.
- El Costo Final se calculará como: `Costo Catálogo - Descuento + Envío`.
- El modal de registro/edición de Productos en el frontend se actualizará para pedir el `porcentajeGanancia` deseado y mostrará en tiempo real el precio de venta resultante, bloqueando o ajustando el campo de precio manual según se defina la UX.

## Capabilities

### New Capabilities
*(Ninguna capacidad completamente nueva, es una mejora a la gestión de productos)*

### Modified Capabilities
- `catalogo-productos`: Se modifica la forma en que se calcula y almacena el precio de los productos, incorporando la lógica de margen de ganancia sobre el costo real integrado.

## Impact

- **Modelos de Datos**: La entidad `Producto` (backend) y la tabla `productos` (PostgreSQL) requieren la nueva columna `porcentaje_ganancia`.
- **API**: Los DTOs de Request y Response de Productos (`ProductoDTO`) deben incluir el nuevo campo.
- **Frontend**: El componente `ProductoForm` requerirá cambios en su estado y UI para el cálculo en tiempo real. La tabla de catálogo también podría mostrar el margen.
- **Servicios**: `ProductoServiceImpl` deberá calcular o validar el precio de venta si se define como un campo calculado, o al menos procesar el margen guardado.
