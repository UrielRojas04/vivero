## Why

Actualmente el sistema permite gestionar el catálogo de productos y su stock disponible, pero no permite registrar ni planificar las siembras que se encuentran en proceso de cultivo. Llevar un registro de las siembras (con su variedad, fecha estimada de entrega, dueño y número de lote) es fundamental para anticipar la disponibilidad de stock, gestionar expectativas de clientes y organizar la producción del vivero. 

## What Changes

- Se agregará una nueva sección/módulo completo para la "Gestión de Siembras".
- Se permitirá registrar una siembra indicando: variedad sembrada, fecha aproximada de disponibilidad, dueño (jefe o cliente particular) y número de lote.
- Se implementará un mecanismo de transición donde una siembra, al marcarse como "Lista para entregar", se convierta o se vincule al catálogo de productos, impactando el stock y determinando su precio de venta final.
- Se modificará el catálogo de productos y stock para soportar la recepción de lotes de siembras finalizadas.

## Capabilities

### New Capabilities
- `gestion-siembras`: Módulo principal (Backend + Frontend) para ABM y seguimiento de siembras (lote, dueño, variedad, fecha estimada).

### Modified Capabilities
- `catalogo-productos`: Se actualizará para aceptar transiciones desde siembras terminadas y reflejarlas como stock disponible.

## Impact

- **Backend**: Creación de nueva entidad `Siembra`, su repositorio, servicio y controlador. Modificaciones en la lógica de `ProductoService` o `MovimientoStockService` para asimilar siembras finalizadas.
- **Frontend**: Nueva vista `Siembras.jsx` y su correspondiente ruta. Modificaciones en el Sidebar de navegación. Actualización en las vistas de productos/stock para indicar origen de siembra si es necesario.
- **Data Model**: Nueva tabla `siembras` y posible ajuste en `productos` o `movimientos_stock` para referenciar el lote de la siembra.
