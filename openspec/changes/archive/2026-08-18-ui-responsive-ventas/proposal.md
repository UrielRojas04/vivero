## Why

El módulo de Punto de Venta (Core) actualmente no es cómodo de usar en dispositivos móviles debido a su layout de pantalla dividida (split-screen) que requiere mucho espacio horizontal. Es necesario adaptar esta vista crítica para que los vendedores puedan registrar ventas directamente desde sus celulares de forma ágil y cómoda, completando así la Etapa 3 del roadmap de UI Responsiva.

## What Changes

- **Pantalla Nueva Venta:** Reorganización completa del layout en mobile. Se prioriza la búsqueda de clientes y productos, moviendo el carrito a un panel colapsable o botón flotante que abre un modal a pantalla completa.
- **Modal de Liquidación:** Los métodos de pago se apilan verticalmente. Se implementarán inputs nativos numéricos (`type="number"` y `inputMode="numeric"`) en todos los campos de descuentos y pagos para facilitar el uso del pad numérico del celular.
- **Historial de Ventas:** La tabla de ventas históricas pasará al formato *Mobile Card*, y el modal de detalle/remito se ajustará para su lectura en formato vertical.

## Capabilities

### New Capabilities
- Ninguna.

### Modified Capabilities
- `ui-responsive`: Extiende los requerimientos responsivos para cubrir flujos complejos de pantalla dividida y modales de liquidación en el punto de venta.

## Impact

- `NuevaVenta.jsx` y sus subcomponentes (buscador de productos, carrito, totales).
- Modales asociados a la venta (`LiquidacionModal`, selección de cliente).
- `HistorialVentas.jsx` y su tabla de ventas.
- Comprobantes y remitos generados desde el historial de ventas.
