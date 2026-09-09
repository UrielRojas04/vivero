## Why

El precio de venta acordado con un cliente a veces no coincide exactamente con el precio de lista del producto (un descuento puntual, un redondeo, un ajuste de último momento). Hoy el modal de confirmación de venta ("Liquidar Venta") muestra el precio por unidad como un dato fijo, tomado del producto — no se puede ajustar ahí sin salir a editar el producto entero (lo que además cambiaría el precio de lista para TODAS las próximas ventas, no sólo esta). El dueño necesita poder tocar el precio por unidad de una línea puntual al momento de cerrar la venta, y que el total de esa venta refleje ese ajuste — en la venta misma y después en Finanzas, que tiene que mostrar lo que realmente se cobró, no el precio de lista.

## What Changes

- En el modal "Liquidar Venta" (`NuevaVenta.jsx`), el precio por unidad de cada línea pasa a ser editable.
- Cambiar el precio por unidad de una línea recalcula automáticamente el subtotal de esa línea y el total de la venta, tanto si el precio nuevo es menor como si es mayor al de lista — en vivo, sin tener que guardar para ver el número actualizado.
- El precio ajustado (no el de lista) es el que se persiste como `VentaDetalle.precioUnitarioHistorico`/`subtotal` de esa línea — exactamente el mismo campo que ya usa la venta para historizar precio y costo por línea.
- Aplica a los 3 negocios (Vivero, Herramientas, Abono): los tres arman la venta desde el mismo modal.
- La sección Ventas de Finanzas debe reflejar el total realmente cobrado (con el ajuste), no el que hubiera dado el precio de lista.

## Capabilities

### New Capabilities
(ninguna — extiende comportamiento existente)

### Modified Capabilities
- `ventas-core`: el detalle de venta acepta un precio por unidad ajustable por línea al confirmar la venta (hoy sólo acepta `productoId` + `cantidad`, el precio siempre se copia del producto).
- `finanzas-ui`: confirmar (documentar, no necesariamente cambiar código) que la sección Ventas de Finanzas ya lee el precio/subtotal histórico de cada línea y no recalcula desde el precio de lista del producto — si en algún punto sí recalculara desde el producto, corregirlo para que use el histórico.

## Impact

- Backend: `VentaDetalleRequestDTO` (nuevo campo opcional de precio unitario ajustado), `VentaServiceImpl` (usar ese valor si viene, en vez de `producto.getPrecio()` siempre, tanto para Vivero/Herramientas como para Abono — dos ramas de código separadas hoy). Ya investigado: `VentaDetalle.precioUnitarioHistorico`/`subtotal` YA es el campo pensado para esto (snapshot por línea, no una referencia viva al producto) — no hace falta un campo nuevo en el modelo, sólo dejar de forzarlo siempre al precio de lista. `FinanzasServiceImpl` ya lee `subtotal` del detalle (`dDto.setSubtotal(d.getSubtotal())`), no recalcula desde el producto — a confirmar con más detalle en design.md si hay algún otro punto de Finanzas que si lo haga.
- Frontend: `NuevaVenta.jsx` (modal "Liquidar Venta" — input de precio por unidad editable por línea, recálculo en vivo del subtotal de línea y el total de la venta).
- No afecta el precio de lista del producto (`Producto.precio`) — el ajuste es puntual a esa venta, nunca se escribe de vuelta al catálogo.
