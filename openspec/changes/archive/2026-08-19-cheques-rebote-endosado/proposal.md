## Why

Un cheque que el vivero recibe de un cliente y después endosa a un tercero puede rebotar **después** del endoso. Cuando eso pasa hay dos deudas simultáneas: el cliente que entregó el cheque le debe ese dinero al vivero, y el vivero le sigue debiendo ese mismo dinero a la persona a quien se lo endosó, porque el pago que le hizo con ese cheque quedó sin efecto.

Hoy el sistema **no puede registrar ese caso en absoluto**. `ChequeServiceImpl.actualizarEstado()` corta de entrada cualquier modificación sobre un cheque cuyo estado sea `ENTREGADO`, `COBRADO` o `RECHAZADO`:

```java
if (cheque.getEstado() == EstadoCheque.RECHAZADO || cheque.getEstado() == EstadoCheque.ENTREGADO || cheque.getEstado() == EstadoCheque.COBRADO) {
    throw new RuntimeException("Un cheque en estado " + cheque.getEstado() + " no puede ser modificado por razones de seguridad contable.");
}
```

El único camino a `RECHAZADO` que existe parte de `EN_CARTERA`, es decir, antes de endosar. Y ese camino sólo toca la cuenta corriente de `cheque.getCliente()`: no sabe nada del endosatario. Peor todavía, la entidad `Cheque` **no persiste al endosatario**: `endosadoAClienteId` viaja únicamente en el `ChequeDTO` en el momento del endoso, se usa para impactar su cuenta corriente y se descarta; lo único que queda guardado es `entregadoA`, un `String` con el nombre para mostrar. Sin esa relación persistida es imposible revertir el efecto sobre el endosatario más tarde.

El resultado práctico es que hoy el jefe tiene que llevar este caso a mano, fuera del sistema, y las dos cuentas corrientes quedan mal.

## What Changes

- **La entidad `Cheque` pasa a persistir al cliente endosatario** como una relación real (`@ManyToOne` a `Cliente`), y no sólo su nombre en el campo de texto `entregadoA`. Es la pieza que habilita todo lo demás: sin ella no hay a quién devolverle el saldo cuando el cheque rebota.
- **Se relaja el bloqueo de transiciones para admitir exactamente un caso nuevo: `ENTREGADO → RECHAZADO`.** Cualquier otra modificación sobre un cheque `ENTREGADO` sigue bloqueada, y un cheque `RECHAZADO` o `COBRADO` sigue siendo inmutable como hasta ahora.
- **Rechazar un cheque endosado genera dos movimientos de cuenta corriente, simultáneos y atómicos**, en la misma transacción:
  - al **cliente original** (quien le dio el cheque al vivero) se le **aumenta la deuda** por el monto del cheque;
  - al **cliente endosatario** se le **acredita ese mismo monto a favor**, porque el pago que se le hizo con ese cheque quedó sin efecto y el vivero le sigue debiendo esa plata.
- **Los datos del endoso se preservan al rechazar.** Hoy la rama `else` del método borra `entregadoA` y `fechaEntrega` cuando el estado nuevo no es `ENTREGADO`; al rechazar un cheque endosado eso destruiría el rastro de a quién se lo habíamos dado, justo cuando más falta hace. La transición `ENTREGADO → RECHAZADO` conserva los tres datos del endoso.
- **En el frontend, un cheque `ENTREGADO` deja de ser completamente inmutable**: pasa a ofrecer una única acción, marcarlo como rechazado, con una confirmación que explica el impacto sobre **las dos** cuentas corrientes por nombre y monto.
- **Fuera de alcance, de forma explícita:** no se construye ningún registro nuevo del tipo "cheque cubierto por el jefe". Cuando el jefe le paga al endosatario en efectivo o por transferencia para cubrir el cheque rebotado, usa el flujo de ajuste de saldo que **ya existe** y que afecta sólo la cuenta corriente del endosatario. La deuda del cliente original queda intacta y sólo baja cuando ese cliente efectivamente le paga al vivero. Las dos cuentas corrientes son independientes y el flujo existente ya alcanza.

## Capabilities

### New Capabilities

Ninguna. El change extiende dos capacidades ya especificadas del dominio de cheques; no introduce un dominio nuevo.

### Modified Capabilities

- `gestion-cheques`: hoy el requisito de metadatos habla de "a quién fue entregado en caso de endoso" como un dato de presentación, y el requisito de bloqueo de estados es incondicional a partir de `RECHAZADO`/`ENTREGADO`/`COBRADO`. Cambia a: el endosatario se persiste como relación al cliente cuando el endoso es a un cliente del sistema, y el bloqueo de transiciones admite explícitamente `ENTREGADO → RECHAZADO` como única excepción, preservando los datos del endoso.
- `cheques-reversa`: hoy la reversa por rechazo contempla un único movimiento, sobre la cuenta del cliente asociado al cheque. Se agrega el caso del cheque endosado, donde el rechazo produce dos movimientos atómicos y de signo opuesto, uno sobre el cliente original y otro sobre el endosatario.

## Impact

**Nivel de gobernanza: CRÍTICO.** Este change modifica lógica de deuda y saldos de clientes (`CuentaCorrienteDinero`, `balancePesos`). Según la política de gobernanza del proyecto, Billing/Finanzas es dominio crítico: el análisis y el diseño avanzan, pero **la implementación requiere checkpoint explícito del usuario antes de escribir cada pieza de lógica que mueva plata** — en concreto, antes de cerrar cualquier grupo de tareas que toque `agregarDeuda`/`agregarSaldoAFavor` o el guard de transición de estados del cheque. Un error de signo acá no rompe una pantalla: falsea la deuda de dos clientes a la vez y no deja rastro evidente.

**Backend**

- `backend/src/main/java/com/vivero/gestion/models/Cheque.java`: relación nueva `@ManyToOne` a `Cliente` para el endosatario, nullable. Es el gap de modelo que habilita el change.
- `backend/src/main/java/com/vivero/gestion/services/impl/ChequeServiceImpl.java`: corazón del change. Guard de transición y la doble operación de cuenta corriente en `actualizarEstado()`. También la preservación de los datos del endoso en la rama `else`.
- `backend/src/main/java/com/vivero/gestion/dto/ChequeDTO.java`: el campo `endosadoAClienteId` ya existe pero hoy es sólo de entrada; pasa a llenarse también en `toDTO()`, junto con el nombre del endosatario, para que el frontend pueda nombrarlo en la confirmación.
- `backend/src/main/java/com/vivero/gestion/controllers/ChequeController.java`: sin cambios de firma. `PUT /api/cheques/{id}` con `LEER_FINANZAS` sigue siendo la única puerta.

**Base de datos**

- Tabla `cheques`: columna nueva `endosado_a_cliente_id` con FK a `clientes`, nullable. El proyecto corre con `spring.jpa.hibernate.ddl-auto=update`, así que Hibernate la agrega sola al arrancar; no hace falta migración manual. Los cheques ya `ENTREGADO` quedan con la columna en `NULL` — ver Open Questions de `design.md`.

**Frontend**

- `frontend/src/utils/chequeDisplay.js`: hoy `describirEstadoCheque()` devuelve `editable = !['RECHAZADO','ENTREGADO','COBRADO'].includes(estado)`, que es lo que hace que un cheque entregado no muestre ninguna acción. Se agrega un indicador separado para "se puede marcar como rechazado".
- `frontend/src/components/ChequeEstadoModal.jsx`: para un cheque `ENTREGADO` el selector se restringe a la única transición admitida, y la confirmación pasa a nombrar las dos cuentas corrientes afectadas.
- `frontend/src/pages/Cheques.jsx` y `frontend/src/pages/Finanzas.jsx`: ambas renderizan el botón de acción condicionado por `editable`; pasan a contemplar también el caso del cheque entregado.

**Sin impacto**

- El flujo de endoso (`EN_CARTERA → ENTREGADO`) no cambia de comportamiento contable: sigue haciendo `agregarDeuda` sobre el endosatario. Lo único que se agrega es que ahora además guarda la relación.
- El flujo de rechazo desde `EN_CARTERA` no cambia. El cheque nunca se endosó, no hay segunda cuenta que tocar.
- El ajuste manual de saldo (`POST /api/clientes/{id}/saldo/ajuste`) y el registro de pagos de venta (`POST /api/ventas/{id}/pagos`) **no se tocan**. Son el mecanismo con el que el jefe le paga al endosatario y ya funcionan.
- `Pago.java` y `VentaServiceImpl.registrarPago()` quedan fuera de alcance: ese flujo exige una `Venta` asociada y el pago al endosatario no la tiene.
