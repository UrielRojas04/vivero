## MODIFIED Requirements

### Requirement: Registro de Variedades de Plantas
El sistema SHALL permitir al usuario (con permisos suficientes) registrar una nueva variedad de planta cultivable indicando los días de crecimiento para cada uno de los 12 meses del año.

#### Scenario: Creación exitosa
- **WHEN** el usuario ingresa nombre, descripción y los días de crecimiento para cada mes (Enero a Diciembre)
- **THEN** el sistema registra la nueva variedad de planta
- **AND** estará disponible para ser seleccionada al crear una nueva siembra

### Requirement: CRUD de Variedades de Plantas
El sistema SHALL permitir visualizar, editar y eliminar las variedades de plantas registradas.

#### Scenario: Edición de días de crecimiento
- **WHEN** el usuario edita una variedad de planta y cambia sus días de crecimiento para ciertos meses
- **THEN** las nuevas siembras que utilicen esta variedad calcularán su fecha estimada basándose en los nuevos valores para esos meses
