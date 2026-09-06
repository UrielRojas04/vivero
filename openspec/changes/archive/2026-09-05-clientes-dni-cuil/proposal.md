## Why

Hoy `Cliente` sólo guarda nombre y teléfono. El dueño necesita poder identificar formalmente a un cliente con DNI o CUIL en los 3 negocios — incluido Herramientas, donde la mayoría de las ventas son a un "cliente Express" de un solo uso, pero igual quiere ese dato anotado en el remito de esa venta puntual. Además, cargar un cliente nuevo hoy exige salir de la pantalla donde se lo necesita (Ventas) e ir a la sección Clientes aparte — un paso de más que ya se resolvió para Registro de Semillas y Siembra con un patrón de "crear cliente al vuelo" desde el mismo buscador, y ahora se extiende a Ventas.

## What Changes

- `Cliente` (los 3 negocios) gana dos campos nuevos, ambos opcionales: `dni` y `cuil`.
- El buscador de cliente en Nueva Venta (`NuevaVenta.jsx`) pasa a aceptar crear un cliente al vuelo cuando no hay coincidencias, mismo patrón ya usado en `RegistroSemillaForm.jsx`/`SiembraForm.jsx`: botón "Crear cliente 'X'" con teléfono (opcional) y un selector DNI/CUIL (opcional) + su valor.
- En Herramientas, la venta a "cliente Express" (sin cliente real vinculado) también ofrece cargar DNI o CUIL para esa venta puntual — el dato queda anotado en el remito de esa venta aunque no se cree un `Cliente` real.
- El buscador de Historial de Ventas, en los 3 negocios, permite buscar además por DNI o CUIL (no sólo por nombre).

## Capabilities

### New Capabilities
(ninguna — todo esto extiende comportamiento de capacidades ya existentes)

### Modified Capabilities
- `backend-clientes`: el modelo/DTO de Cliente gana `dni` y `cuil` (opcionales); el endpoint de creación los acepta.
- `frontend-clientes`: el componente/patrón de "crear cliente rápido" (ya usado en Registro de Semillas/Siembra) se extiende con los campos teléfono + selector DNI/CUIL, para reusarlo tal cual desde Ventas.
- `ventas-core`: el buscador de cliente de Nueva Venta permite crear un cliente al vuelo (antes sólo buscaba entre clientes existentes).
- `ventas-cliente-express`: la venta Express de Herramientas admite cargar DNI/CUIL puntual para esa venta, sin necesidad de un `Cliente` real.
- `historial-ventas`: el buscador acepta DNI/CUIL como criterio de búsqueda, en los 3 negocios.
- `remitos-pdf`: el remito de una venta Express de Herramientas muestra el DNI/CUIL cargado para esa venta, si se cargó alguno.

## Impact

- Backend: `Cliente` (modelo, DTO, migración de columnas nuevas), `ClienteController`/`ClienteService` (aceptar los campos nuevos al crear/editar), `VentaController`/`VentaService` o el DTO de venta Express (persistir DNI/CUIL de la venta puntual si no hay cliente real), `VentaRepository`/búsqueda de historial (filtrar por DNI/CUIL), generación de remito (incluir el dato si existe).
- Frontend: `NuevaVenta.jsx` (buscador de cliente con creación al vuelo + campos de venta Express), `HistorialVentas.jsx` (barra de búsqueda), el componente de creación rápida de cliente ya usado en `RegistroSemillaForm.jsx`/`SiembraForm.jsx` (generalizarlo o replicar el patrón con los campos nuevos), `ComprobanteVentaModal.jsx` (mostrar DNI/CUIL en el remito de Herramientas Express).
- Los 3 negocios (Vivero, Herramientas, Abono) comparten el modelo `Cliente`, así que el cambio de modelo/DTO es único; el flujo de creación al vuelo desde Ventas y la búsqueda por DNI/CUIL en historial aplican a los 3.
