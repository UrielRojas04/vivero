## ADDED Requirements

### Requirement: Registro de Variedades de Plantas
El sistema SHALL permitir al usuario (con permisos suficientes) registrar una nueva variedad de planta cultivable.

#### Scenario: Creación exitosa
- **WHEN** el usuario ingresa nombre, descripción y días de crecimiento estimado
- **THEN** el sistema registra la nueva variedad de planta
- **AND** estará disponible para ser seleccionada al crear una nueva siembra

### Requirement: CRUD de Variedades de Plantas
El sistema SHALL permitir visualizar, editar y eliminar las variedades de plantas registradas.

#### Scenario: Edición de días de crecimiento
- **WHEN** el usuario edita una variedad de planta y cambia sus días de crecimiento
- **THEN** las nuevas siembras que utilicen esta variedad calcularán su fecha estimada base en este nuevo valor
