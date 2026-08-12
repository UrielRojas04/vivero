## ADDED Requirements

### Requirement: Registro de Variedades de Bandejas
El sistema SHALL permitir al usuario (con permisos suficientes) registrar un nuevo tipo/modelo de bandeja de siembra.

#### Scenario: Creación exitosa
- **WHEN** el usuario ingresa nombre (ej: "Bandeja Forestal") y cantidad de celdas (ej: 40)
- **THEN** el sistema registra el nuevo modelo de bandeja
- **AND** estará disponible para ser seleccionada al crear una nueva siembra

### Requirement: CRUD de Variedades de Bandejas
El sistema SHALL permitir visualizar, editar y eliminar los tipos de bandejas registradas.

#### Scenario: Visualización del listado
- **WHEN** el usuario accede al catálogo de bandejas
- **THEN** el sistema muestra el listado con nombre y la capacidad (cantidad de celdas) de cada una
