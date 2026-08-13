## 1. Modelado de Datos (Backend)

- [x] 1.1 Crear entidad `MovimientoStock` (id, fecha, cantidad, tipo_movimiento, costo_unitario, producto_id, unidad_negocio_id).
- [x] 1.2 Crear entidades `Venta` (id, fecha, total, cliente_id, unidad_negocio_id) y `VentaDetalle` (id, venta_id, producto_id, cantidad, precio_unitario, costo_unitario).
- [x] 1.3 Crear repositorios `MovimientoStockRepository`, `VentaRepository` y `VentaDetalleRepository` con filtros por `unidad_negocio_id`.

## 2. Lógica de Negocio (Backend)

- [x] 2.1 Crear `MovimientoStockService` para registrar movimientos, encargándose de capturar y congelar el costo unitario real en el momento del movimiento.
- [x] 2.2 Crear `VentaService` para procesar ventas: insertar la `Venta`, insertar sus `VentaDetalle` congelando costos y precios, descontar stock en `Producto` y registrar los `MovimientoStock` tipo VENTA correspondientes.
- [x] 2.3 Refactorizar el cálculo de 'Costos de Inventario' en Finanzas para que lea el costo histórico (última adquisición o costo promedio) desde `MovimientoStock` en vez de usar el costo dinámico global.
- [x] 2.4 Actualizar `DataInitializer` (o script SQL) para insertar movimientos de tipo `AJUSTE_INICIAL` en todos los productos preexistentes que tengan `stock > 0`.

## 3. Integración y Frontend

- [x] 3.1 Exponer Endpoints REST en `VentaController` y `MovimientoStockController`.
- [x] 3.2 Frontend: Crear ruta de `Ventas` con un componente `NuevaVenta.jsx` básico (selección de productos, cliente opcional, total y botón de confirmar).
- [x] 3.3 Frontend: Actualizar `Finanzas.jsx` (Costos de Inventario) para consumir y mostrar la valoración histórica que ahora provee el backend, en vez de calcularla en el cliente.
