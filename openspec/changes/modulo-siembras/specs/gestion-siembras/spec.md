## ADDED Requirements

### Requirement: Registro de Siembras
El sistema SHALL permitir al usuario registrar una nueva siembra en proceso.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa el formulario de nueva siembra con variedad, fecha estimada de entrega, dueño, número de lote y cantidad inicial
- **THEN** el sistema registra la siembra con estado `EN_PROCESO`
- **AND** la muestra en el listado de siembras activas

### Requirement: Finalización de Siembra (Ingreso a Stock)
El sistema SHALL permitir al usuario marcar una siembra como finalizada y transferir las plantas resultantes al stock de un producto.

#### Scenario: Transición a catálogo
- **WHEN** el usuario marca una siembra como "Lista para entregar"
- **THEN** el sistema solicita seleccionar un Producto existente del catálogo y confirmar la cantidad final lograda
- **AND** el sistema suma esa cantidad al stock del producto seleccionado
- **AND** la siembra cambia su estado a `FINALIZADA`
