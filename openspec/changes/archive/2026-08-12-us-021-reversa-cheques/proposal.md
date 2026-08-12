## Why

Actualmente, cuando un cheque se marca como `RECHAZADO`, el cambio de estado es puramente visual en la interfaz (se pinta la etiqueta de rojo). Sin embargo, a nivel contable, la cuenta corriente del cliente no sufre ninguna reversa. Si un cheque de un cliente es rechazado (sin fondos), el cliente debería volver a tener la deuda correspondiente. Por el contrario, si un cheque emitido por el vivero es rechazado, el vivero no pagó realmente, por lo tanto la deuda que había saldado con el cliente/proveedor debería volver a incrementarse. Esta funcionalidad es clave para mantener la consistencia contable del sistema sin requerir ajustes manuales.

## What Changes

- Implementar lógica en el backend para revertir saldos en la cuenta corriente del cliente cuando un cheque pasa a estado `RECHAZADO`.
- Si el cheque es `PARA CLIENTE` (emisión propia = `true`): El cliente recupera su saldo a favor (se revierte la "deuda" que le habíamos cobrado).
- Si el cheque es `PROPIO` (de un cliente hacia nosotros, emisión propia = `false`): El cliente vuelve a tener deuda por ese monto, ya que su pago con cheque no fue exitoso.
- Impedir que un cheque `RECHAZADO` pueda cambiar de estado a otro diferente que no sea revertirlo nuevamente a `EN_CARTERA` (o manejar el ajuste de saldos en caso de deshacer el rechazo). Para simplificar, una vez rechazado, puede considerarse estado terminal, y si se soluciona, se crea un cheque nuevo, pero se debe evaluar el flujo.

## Capabilities

### New Capabilities
- `cheques-reversa`: Lógica contable de reversa automática de saldos de cuenta corriente ante el rechazo de cheques.

### Modified Capabilities
- `gestion-cheques`: Modificación de la máquina de estados de cheques para ejecutar reglas de negocio (reversas) al transicionar al estado RECHAZADO.

## Impact

- `ChequeServiceImpl.java`: Método `actualizarEstado`.
- `CuentaCorrienteDinero.java` / `Cliente.java`: Métodos para ajustar deuda/saldo a favor.
- Interfaz de usuario (`Cheques.jsx`): Posible deshabilitación de cambio de estado posterior a RECHAZADO, o mensaje de confirmación advirtiendo sobre el impacto en cuenta corriente.
