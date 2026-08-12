## Why

El usuario necesita poder eliminar gastos registrados por error, ya que actualmente no existe una interfaz para hacerlo. Además, es necesario contar con un mecanismo para ajustar manualmente el saldo (deuda o favor) de un cliente, lo cual es fundamental para registrar pagos de deudas pasadas o corregir desvíos en la cuenta corriente.

## What Changes

- Se agregará un botón "Eliminar" en cada fila del listado de gastos (sección Finanzas) que realizará un soft-delete del gasto.
- Se agregará una interfaz en la vista del Cliente (o en el modal de Cuenta Corriente) para registrar ajustes manuales (pagos o incrementos de deuda) sobre el saldo en pesos.
- Se creará un endpoint en el backend para procesar los ajustes manuales de saldo, registrando posiblemente el motivo del ajuste y actualizando el `balancePesos` del cliente.

## Capabilities

### New Capabilities
- `ajustes-cuenta-cte`: Permite registrar pagos o ajustes manuales sobre el saldo de la cuenta corriente de un cliente.

### Modified Capabilities
- `finanzas-gastos`: Se agrega la capacidad de eliminar gastos existentes (soft delete).

## Impact

- Modificación en el componente de UI de Gastos.
- Nuevos endpoints en el backend para eliminación de gastos y ajustes de cuenta corriente.
- Posible creación de una nueva entidad o tabla de log para `AjusteCuentaCorriente` si se requiere historial, o simplemente actualización directa en `CuentaCorrienteDinero`.
