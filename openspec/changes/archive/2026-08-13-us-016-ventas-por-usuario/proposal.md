## Why

El negocio necesita llevar un registro exacto de qué vendedor (usuario) realizó cada venta, especialmente en la unidad de "Herramientas". Esto permite evaluar el rendimiento del equipo, calcular posibles comisiones y brindar transparencia. Actualmente el sistema tiene el campo preparado en la base de datos, pero no registra al usuario que genera la venta ni ofrece una forma de visualizar las métricas de venta agrupadas por empleado a lo largo de la semana o el mes.

## What Changes

- **Registro de Vendedor**: El backend registrará automáticamente al usuario autenticado como el creador de la venta al momento de confirmarla.
- **Visualización en Listados**: Se incluirá el nombre del usuario (vendedor) en el listado histórico de ventas y en la grilla de Finanzas.
- **Filtros y Métricas por Usuario**: Se agregará la posibilidad de hacer click en un usuario/vendedor dentro de la sección de Finanzas para visualizar un resumen de las ventas realizadas por ese empleado, filtrado por "esta semana" o "este mes".

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. -->

### Modified Capabilities
- `ventas-core`: Se modifica el requisito de registro de venta para que vincule e informe el usuario (`vendedor`) que efectuó la operación.
- `finanzas-ui`: Se agregan requisitos para el filtrado de ventas por usuario y la visualización de métricas temporales (semana/mes) al seleccionar a un vendedor.

## Impact

- **Backend**: `VentaServiceImpl` será modificado para extraer el usuario del contexto de seguridad al crear la venta. `VentaLiteDTO` y `VentaDTO` incluirán `usuarioNombre`. `VentaRepository` podría requerir métodos adicionales de agregación/búsqueda por `usuario_id` y fecha.
- **Frontend**: Los listados de ventas en `Finanzas.jsx` se verán impactados. Se añadirán controles de UI para el filtrado de período (semana/mes) y botones/filtros para aislar las ventas de un usuario en particular.
