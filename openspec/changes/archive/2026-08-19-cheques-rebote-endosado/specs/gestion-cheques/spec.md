## MODIFIED Requirements

### Requirement: Registro de metadatos de cheques
El sistema SHALL permitir la captura, persistencia y gestión de metadatos de los cheques recibidos como medio de pago. Estos metadatos MUST incluir banco, número de serie, fecha de cobro, estado actual, y opcionalmente a quién fue entregado en caso de endoso.

Cuando el endoso se realiza a un cliente del sistema, el sistema SHALL además persistir la identidad de ese cliente endosatario como una relación al cliente, y no únicamente su nombre como texto. Esa relación SHALL sobrevivir a cambios de estado posteriores del cheque y SHALL ser el dato usado para cualquier operación contable sobre la cuenta corriente del endosatario. El nombre en texto SHALL seguir disponible para el caso en que el endoso se realice a un proveedor o tercero que no es cliente del sistema, en el que no existe relación a persistir.

#### Scenario: Visualización del listado de cheques
- **WHEN** el usuario navega a la sección de Gestión de Cheques
- **THEN** el sistema renderiza un listado con todos los cheques registrados y su estado actual.

#### Scenario: Cambio de estado de un cheque
- **WHEN** un usuario marca un cheque como ENTREGADO a un proveedor específico
- **THEN** el sistema registra el nuevo estado del cheque, la fecha de entrega y el destinatario, actualizando el listado.

#### Scenario: Endoso a un cliente del sistema
- **WHEN** un usuario marca un cheque como `ENTREGADO` seleccionando un cliente del sistema como endosatario
- **THEN** el sistema persiste la relación al cliente endosatario junto con el cheque, además del nombre del destinatario y la fecha de entrega
- **AND** el cheque queda consultable con la identidad de ese endosatario

#### Scenario: Endoso a un tercero que no es cliente
- **WHEN** un usuario marca un cheque como `ENTREGADO` indicando el nombre de un proveedor o tercero en texto libre
- **THEN** el sistema persiste el nombre del destinatario y la fecha de entrega, sin relación a ningún cliente
- **AND** la operación se completa con éxito

### Requirement: Bloqueo de estado post-rechazo
The system SHALL prevent state transitions originating from the `RECHAZADO` state.

El sistema SHALL además impedir cualquier modificación sobre un cheque en estado `COBRADO`, y SHALL impedir cualquier modificación sobre un cheque en estado `ENTREGADO` con una única excepción: la transición `ENTREGADO → RECHAZADO`, que MUST estar permitida para poder registrar el rebote de un cheque ya endosado.

En particular, desde el estado `ENTREGADO` el sistema SHALL seguir bloqueando las transiciones a `EN_CARTERA`, a `COBRADO` y a `ENTREGADO`, así como cualquier modificación del destinatario del endoso o de la fecha de entrega ya registrados.

#### Scenario: User views a rejected cheque
- **WHEN** a cheque is in the `RECHAZADO` state
- **THEN** the system MUST disable or hide the state transition actions in the user interface.

#### Scenario: Rechazo de un cheque endosado
- **WHEN** un usuario solicita cambiar a `RECHAZADO` un cheque que está en estado `ENTREGADO`
- **THEN** el sistema acepta la transición y registra el cheque como `RECHAZADO`

#### Scenario: Otras transiciones desde ENTREGADO siguen bloqueadas
- **WHEN** un usuario solicita cambiar un cheque en estado `ENTREGADO` a `COBRADO`, a `EN_CARTERA`, o modificar su destinatario o su fecha de entrega
- **THEN** el sistema rechaza la operación con el mismo error de inmutabilidad contable vigente, y ningún dato del cheque ni ninguna cuenta corriente resulta modificada

#### Scenario: Los estados COBRADO y RECHAZADO siguen siendo inmutables
- **WHEN** un usuario solicita cualquier cambio de estado sobre un cheque en estado `COBRADO` o en estado `RECHAZADO`
- **THEN** el sistema rechaza la operación con el error de inmutabilidad contable, sin excepción

## ADDED Requirements

### Requirement: Preservación de los datos del endoso al rechazar
El sistema SHALL conservar el destinatario del endoso, la fecha de entrega y la relación al cliente endosatario cuando un cheque en estado `ENTREGADO` pasa a `RECHAZADO`. Esos datos SHALL NOT ser borrados por la transición, dado que identifican a la persona a la que el vivero le sigue debiendo el dinero del cheque rebotado.

#### Scenario: Consulta de un cheque endosado que rebotó
- **WHEN** se consulta un cheque que pasó de `ENTREGADO` a `RECHAZADO`
- **THEN** el cheque conserva el nombre del destinatario del endoso, la fecha de entrega y, si el endosatario era un cliente del sistema, la relación a ese cliente

### Requirement: Registro del rebote de un cheque endosado desde la interfaz
El sistema SHALL ofrecer, para un cheque en estado `ENTREGADO`, una única acción de cambio de estado: marcarlo como rechazado. Las demás opciones de estado SHALL NOT estar disponibles para ese cheque. La interfaz SHALL solicitar confirmación explícita antes de ejecutar la operación, y esa confirmación MUST indicar el monto del cheque, el nombre del cliente al que se le aumenta la deuda y el nombre del endosatario al que se le acredita saldo a favor, y MUST advertir que la acción no se puede deshacer.

Cuando el endosatario no es un cliente del sistema, la confirmación SHALL mencionar una sola cuenta corriente afectada y SHALL aclarar que el destinatario del endoso no es un cliente con cuenta.

#### Scenario: Acción disponible sobre un cheque entregado
- **WHEN** el usuario visualiza un cheque en estado `ENTREGADO` en la gestión de cheques o en el panel de finanzas
- **THEN** el sistema ofrece la acción de actualizar su estado, y al abrirla la única transición seleccionable es `RECHAZADO`

#### Scenario: Confirmación con las dos cuentas afectadas
- **WHEN** el usuario confirma el rechazo de un cheque endosado a un cliente del sistema
- **THEN** antes de ejecutar, el sistema muestra un diálogo de confirmación que nombra el monto, el cliente al que se le aumenta la deuda y el endosatario al que se le acredita saldo a favor, y advierte que la acción es irreversible

#### Scenario: Cancelación de la confirmación
- **WHEN** el usuario cancela el diálogo de confirmación del rechazo
- **THEN** el cheque permanece en estado `ENTREGADO` y ninguna cuenta corriente resulta modificada

#### Scenario: Los cheques cobrados y rechazados no ofrecen acción
- **WHEN** el usuario visualiza un cheque en estado `COBRADO` o `RECHAZADO`
- **THEN** el sistema no ofrece ninguna acción de cambio de estado sobre ese cheque
