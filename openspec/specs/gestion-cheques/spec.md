# gestion-cheques Specification

## Purpose
Registro de metadatos de cheques para su control, seguimiento y conciliación contable.
## Requirements
### Requirement: Registro de metadatos de cheques
El sistema SHALL permitir la captura, persistencia y gestión de metadatos de los cheques recibidos como medio de pago. Estos metadatos MUST incluir banco, número de serie, fecha de cobro, estado actual, y opcionalmente a quién fue entregado en caso de endoso.

#### Scenario: Visualización del listado de cheques
- **WHEN** el usuario navega a la sección de Gestión de Cheques
- **THEN** el sistema renderiza un listado con todos los cheques registrados y su estado actual.

#### Scenario: Cambio de estado de un cheque
- **WHEN** un usuario marca un cheque como ENTREGADO a un proveedor específico
- **THEN** el sistema registra el nuevo estado del cheque, la fecha de entrega y el destinatario, actualizando el listado.

### Requirement: Bloqueo de estado post-rechazo
The system SHALL prevent state transitions originating from the `RECHAZADO` state.

#### Scenario: User views a rejected cheque
- **WHEN** a cheque is in the `RECHAZADO` state
- **THEN** the system MUST disable or hide the state transition actions in the user interface.

### Requirement: Registro manual de cheques
El sistema SHALL permitir a los usuarios registrar cheques manualmente desde el módulo de Cheques, independientemente de una liquidación de venta.

#### Scenario: Registro exitoso con impacto en cuenta corriente
- **WHEN** el usuario completa el formulario de nuevo cheque seleccionando un cliente y un monto
- **THEN** el sistema persiste el cheque con estado `EN_CARTERA`
- **AND** el saldo (`balanceDinero`) del cliente seleccionado se incrementa por el monto del cheque (se abona a su cuenta)

#### Scenario: Registro sin cliente asociado
- **WHEN** el usuario completa el formulario pero no especifica un cliente (si se permite cheques anónimos)
- **THEN** el sistema persiste el cheque con estado `EN_CARTERA` sin afectar saldos de clientes

