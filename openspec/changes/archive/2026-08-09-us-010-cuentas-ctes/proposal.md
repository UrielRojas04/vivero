## Why

Los clientes operan recurrentemente con el sistema, dejando saldos pendientes (tanto monetarios como de bandejas de cultivo). Necesitamos centralizar esta información en "Cuentas Corrientes" globales para cada cliente, de manera que el negocio pueda hacer un seguimiento preciso de las deudas y saldos a favor, independientemente de en qué unidad de negocio se haya originado la operación inicial, permitiendo también una mejor trazabilidad financiera.

## What Changes

- Creación de la estructura financiera para saldos monetarios (`CuentaCorrienteDinero`) vinculada 1:1 con el `Cliente`.
- Creación de la estructura física para control de bandejas (`CuentaCorrienteBandejas`) vinculada 1:1 con el `Cliente`.
- Endpoints en el backend para consultar el estado de cuenta (balances) de un cliente específico.
- **Modificación en UI**: La pantalla de Clientes debe mostrar los saldos actuales de dinero y bandejas de cada cliente.

## Capabilities

### New Capabilities
- `backend-cuentas-ctes`: Define los modelos, repositorios, y servicios para `CuentaCorrienteDinero` y `CuentaCorrienteBandejas`, así como los endpoints para su consulta.
- `frontend-cuentas-ctes`: Define los componentes de la interfaz de usuario para visualizar los saldos dentro de la lista de clientes o en una vista detallada.

### Modified Capabilities
- `backend-clientes`: Se modifica para que al crear un `Cliente` se inicialicen automáticamente sus respectivas cuentas corrientes en cero.
- `frontend-clientes`: Se actualiza la grilla/tabla para exhibir las columnas de saldo (dinero y bandejas).

## Impact

- **Modelos BD**: Se agregan las entidades `CuentaCorrienteDinero` y `CuentaCorrienteBandejas`.
- **Servicios**: `ClienteService` sufrirá modificaciones en el método `create` para inicializar saldos.
- **Frontend**: La página `Clientes.jsx` requerirá mostrar esta nueva información del DTO.
