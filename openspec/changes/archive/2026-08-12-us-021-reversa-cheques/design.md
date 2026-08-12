## Context

Actualmente en el sistema Vivero, la gestión de cheques y sus estados (`EN_CARTERA`, `ENTREGADO`, `COBRADO`, `RECHAZADO`) carece de reversión contable para el estado `RECHAZADO`. Si bien la creación de un cheque afecta inmediatamente la cuenta corriente del cliente (aumentando deuda si es cheque emitido a cliente, o aumentando saldo a favor si es cheque recibido de cliente), el cambio a estado `RECHAZADO` solo modifica la UI, dejando un descuadre en los saldos reales.

## Goals / Non-Goals

**Goals:**
- Implementar la reversa contable al transicionar un cheque al estado `RECHAZADO`.
- Restaurar correctamente la deuda o el saldo a favor del cliente según si el cheque fue de emisión propia o de un tercero.
- Prevenir inconsistencias contables si el usuario intenta cambiar de estado un cheque que ya fue rechazado, bloqueando transiciones posteriores o revirtiendo la reversa (se optará por bloquear transiciones).

**Non-Goals:**
- No se implementará un historial de estados con montos transaccionales por ahora. La cuenta corriente seguirá mutando sus totales directamente mediante los métodos `agregarDeuda` y `agregarSaldoAFavor` / `restarSaldoAFavor`.
- No se manejarán gastos bancarios por rechazo en esta iteración. El usuario debe cargar los gastos bancarios manualmente si existen.

## Decisions

- **Bloqueo de Transiciones:** Una vez que un cheque se marca como `RECHAZADO`, se considerará un estado terminal. En el frontend se ocultarán los botones de acción para cambiarlo a otro estado. Esto simplifica enormemente la lógica contable, ya que no necesitamos implementar "deshacer reversas". Si el cheque se vuelve a presentar y se cobra, el usuario deberá registrar un cheque nuevo.
- **Lógica en el Backend:** En `ChequeServiceImpl.actualizarEstado`, se detectará si el nuevo estado es `RECHAZADO`. Si lo es, y el estado anterior no lo era, se aplicará la lógica:
  - Si `esEmisionPropia == true`: El cheque era nuestro para el cliente. Habíamos incrementado su deuda al crearlo. Ahora que rebotó, el pago fracasó, por lo tanto **se debe restar la deuda (o sumar saldo a favor)**. Wait, no. Al emitirlo, le estábamos "pagando" al cliente (disminuye su saldo a favor o aumenta la deuda que tenemos con él). Al crear un cheque de emisión propia, el backend hace `agregarDeuda(monto)`. Si se rechaza, debemos revertir eso: `restarDeuda(monto)` (o agregarSaldoAFavor).
  - Si `esEmisionPropia == false`: El cheque era del cliente hacia nosotros. Habíamos incrementado su saldo a favor (le perdonamos deuda). Como rebotó, debemos deshacer ese pago: `agregarDeuda(monto)`.
- **Manejo de Cuenta Corriente:** En la entidad `CuentaCorrienteDinero`, se usarán los métodos existentes `agregarDeuda` y `agregarSaldoAFavor` para aplicar estas reversas (siendo matemáticamente idéntico a restar).

## Risks / Trade-offs

- **Riesgo:** Si un usuario por error marca "Rechazado", no podrá volver atrás fácilmente.
  - **Mitigación:** En la interfaz de usuario, se agregará un cuadro de diálogo de confirmación (SweetAlert/modal) antes de confirmar el estado RECHAZADO, advirtiendo que esta acción afectará la cuenta corriente y no se puede deshacer.
- **Trade-off:** No tener un log transaccional hace que la reversa mute el estado de la cuenta corriente en silencio.
  - **Mitigación:** Es aceptable por la arquitectura actual (RBAC plano, saldos directos). En el futuro se planea un mayor trackeo de movimientos de cuenta corriente.
