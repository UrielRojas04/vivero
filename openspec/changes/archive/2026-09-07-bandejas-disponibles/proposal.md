## Why

Actualmente, el sistema lleva el control del stock físico de las bandejas producidas y pasadas a stock en el módulo de Vivero. Sin embargo, no se tiene en cuenta que ciertas plantas (bandejas) provienen de semillas entregadas previamente por los clientes a través del módulo `RegistroSemilla` y, por lo tanto, ya están "encargadas" o reservadas para ellos. El Jefe necesita un reporte rápido que cruce el stock físico de las plantas con los compromisos pendientes de clientes para saber exactamente cuántas bandejas están *realmente disponibles* para la venta al público general.

## What Changes

- Se agregará una nueva vista o reporte en el módulo de Estadísticas/Vivero llamado "Bandejas Disponibles".
- Este reporte calculará el "Stock Disponible" tomando el stock actual de un producto (Variedad) y restándole la `cantidadBandejas` de los `RegistroSemilla` pendientes (que aún no han sido entregados al cliente) de esa misma variedad.
- Sólo aplicará a la Unidad de Negocio 1 (Vivero).

## Capabilities

### New Capabilities
- `vivero-bandejas-disponibles`: Capacidad de calcular y visualizar el stock real disponible de bandejas para la venta, deduciendo los compromisos de semillas traídas por clientes.

### Modified Capabilities

## Impact

- **Backend:** Se creará un nuevo endpoint `/api/vivero/bandejas-disponibles` (o en EstadisticasController) que realice el cálculo cruzando `Producto` (stock físico) con `RegistroSemilla` (bandejas comprometidas por variedad).
- **Frontend:** Se agregará una tabla/vista nueva en el Dashboard o menú de Vivero para visualizar este cálculo por variedad de planta.
