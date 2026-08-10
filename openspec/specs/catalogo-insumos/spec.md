## ADDED Requirements

### Requirement: CRUD de Insumos
El sistema MUST permitir realizar operaciones CRUD sobre los Insumos, asociándolos siempre a una Unidad de Negocio.

#### Scenario: Creación de Insumo exitosa
- **WHEN** un cliente envía una petición POST válida con el ID de la unidad de negocio
- **THEN** el sistema crea el Insumo y lo asocia a la unidad de negocio especificada

#### Scenario: Rechazo por falta de unidad de negocio
- **WHEN** un cliente intenta crear un Insumo sin proporcionar `unidadNegocioId`
- **THEN** el sistema rechaza la petición con un error de validación

#### Scenario: Lectura de Insumos
- **WHEN** un usuario solicita la lista de insumos
- **THEN** el sistema devuelve todos los insumos disponibles, incluyendo a qué unidad de negocio pertenece cada uno
