## MODIFIED Requirements

### Requirement: CRUD de Insumos
El sistema MUST permitir realizar operaciones CRUD sobre los Insumos de forma global. Ya no se asocian a una Unidad de Negocio.

#### Scenario: Creación de Insumo exitosa
- **WHEN** un cliente envía una petición POST válida
- **THEN** el sistema crea el Insumo de forma global

#### Scenario: Rechazo por validaciones
- **WHEN** un cliente intenta crear un Insumo sin proporcionar campos requeridos (nombre, stock, etc)
- **THEN** el sistema rechaza la petición con un error de validación

#### Scenario: Lectura de Insumos
- **WHEN** un usuario solicita la lista de insumos
- **THEN** el sistema devuelve todos los insumos disponibles sin segmentación por unidad de negocio
