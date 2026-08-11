## ADDED Requirements

### Requirement: Registro de metadatos de cheques
El sistema SHALL permitir la captura, persistencia y gestión de metadatos de los cheques recibidos como medio de pago. Estos metadatos MUST incluir banco, número de serie, fecha de cobro, estado actual, y opcionalmente a quién fue entregado en caso de endoso.

#### Scenario: Visualización del listado de cheques
- **WHEN** el usuario navega a la sección de Gestión de Cheques
- **THEN** el sistema renderiza un listado con todos los cheques registrados y su estado actual.

#### Scenario: Cambio de estado de un cheque
- **WHEN** un usuario marca un cheque como ENTREGADO a un proveedor específico
- **THEN** el sistema registra el nuevo estado del cheque, la fecha de entrega y el destinatario, actualizando el listado.
