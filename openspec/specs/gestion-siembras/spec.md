## Requirements

### Requirement: Registro de Siembras
El sistema SHALL permitir al usuario registrar una nueva siembra en proceso referenciando a las variedades parametrizadas en el sistema.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa el formulario de nueva siembra seleccionando una `VariedadPlanta`, una `VariedadBandeja`, ingresando la cantidad inicial, dueño, número de lote y una `fechaSiembra`
- **THEN** el sistema calcula automáticamente la fecha estimada de entrega obteniendo los días de crecimiento correspondientes al mes de la `fechaSiembra` y sumándolos a dicha fecha (pudiendo ser sobrescrita por el usuario)
- **AND** el sistema registra la siembra con estado `EN_PROCESO` referenciando a la planta y bandeja correspondientes

### Requirement: Finalización de Siembra (Ingreso a Stock)
El sistema SHALL permitir al usuario marcar una siembra como finalizada y transferir las plantas resultantes al stock de un producto.

#### Scenario: Transición a catálogo
- **WHEN** el usuario marca una siembra como "Lista para entregar"
- **THEN** el sistema solicita seleccionar un Producto existente del catálogo y confirmar la cantidad final lograda
- **AND** el sistema suma esa cantidad al stock del producto seleccionado
- **AND** la siembra cambia su estado a `FINALIZADA`
