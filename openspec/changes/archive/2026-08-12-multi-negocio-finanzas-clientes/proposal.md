## Why

El change anterior introdujo la arquitectura base de multi-negocio, aislando Productos, Ventas y Stock. Sin embargo, para que el negocio de Herramientas funcione como un módulo independiente del Vivero pero bajo el mismo sistema, es necesario aislar también el flujo de clientes, las operaciones financieras (cheques, gastos, cuentas corrientes) y el acceso de los usuarios a cada unidad de negocio. 

## What Changes

- **Usuarios Multi-Negocio**: Relación Muchos-a-Muchos entre `Usuario` y `UnidadNegocio`, permitiendo que un usuario tenga acceso a uno o más negocios (ej. un jefe a ambos, un empleado de mostrador a uno solo).
- **Clientes Aislados**: Agregar `unidad_negocio_id` a `Cliente`, para que el listado de clientes de "Herramientas" sea independiente del de "Vivero".
- **Finanzas Aisladas**: Agregar `unidad_negocio_id` a entidades financieras como `Cheque` y `Gasto`, y filtrar las vistas del dashboard y reportes financieros según el contexto activo.
- **Cuentas Corrientes**: Asociar implícitamente las cuentas corrientes de los clientes al negocio correspondiente (al aislar clientes).

## Capabilities

### New Capabilities
- `multi-negocio-finanzas`: Extensión del aislamiento de unidad de negocio a entidades financieras y clientes.
- `multi-negocio-usuarios`: Gestión de acceso y visibilidad de usuarios por unidad de negocio.

### Modified Capabilities
- `user-rbac`: Ajuste para evaluar acceso a unidades de negocio al momento del login y carga de permisos.

## Impact

- Entidades: `Usuario`, `Cliente`, `Cheque`, `Gasto`.
- Servicios y Repositorios correspondientes (agregado de filtros y relaciones JPA).
- Respuestas del login (retornar lista de negocios asignados al usuario).
- UI: Listados de Clientes y Finanzas filtrados automáticamente por el backend.
