## MODIFIED Requirements

### Requirement: Registro de Siembras
El sistema SHALL permitir al usuario registrar una nueva siembra en proceso referenciando a las variedades parametrizadas en el sistema.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa el formulario de nueva siembra seleccionando una `VariedadPlanta`, una `VariedadBandeja`, ingresando la cantidad inicial, dueño y número de lote
- **THEN** el sistema calcula automáticamente la fecha estimada de entrega sumando los días de crecimiento de la planta a la fecha actual (pudiendo ser sobrescrita por el usuario)
- **AND** el sistema registra la siembra con estado `EN_PROCESO` referenciando a la planta y bandeja correspondientes
