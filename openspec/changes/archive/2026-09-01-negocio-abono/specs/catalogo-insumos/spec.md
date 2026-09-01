## MODIFIED Requirements

### Requirement: CRUD de Insumos
El sistema MUST permitir realizar operaciones CRUD sobre los Insumos, alcanzados por Unidad de Negocio. Cada Insumo MUST pertenecer a exactamente una `UnidadNegocio`, asignada automáticamente a partir de la unidad activa de la petición. Los listados, búsquedas y agregaciones de insumos MUST devolver únicamente los insumos de la unidad activa. Los insumos existentes al momento de introducir esta relación MUST quedar asignados a la unidad "Vivero", que era su única consumidora.

#### Scenario: Creación de Insumo exitosa
- **WHEN** un cliente envía una petición POST válida con una unidad de negocio activa
- **THEN** el sistema crea el Insumo asociándolo automáticamente a esa unidad de negocio

#### Scenario: Rechazo por validaciones
- **WHEN** un cliente intenta crear un Insumo sin proporcionar campos requeridos (nombre, stock, etc)
- **THEN** el sistema rechaza la petición con un error de validación

#### Scenario: Lectura de Insumos
- **WHEN** un usuario solicita la lista de insumos con la unidad activa "Vivero"
- **THEN** el sistema devuelve únicamente los insumos de la unidad "Vivero"

#### Scenario: Insumos de la unidad Abono
- **WHEN** el jefe registra la compra de una camionada de abono con la unidad activa "Abono"
- **THEN** el insumo queda asociado a la unidad "Abono" y no aparece en el listado de insumos de Vivero ni en sus finanzas

#### Scenario: Retrofit de insumos históricos
- **WHEN** el sistema arranca contra una base cuyos insumos todavía no tienen unidad de negocio asignada
- **THEN** todos esos insumos quedan asignados a la unidad "Vivero", y el total de gastos de insumos de Vivero es idéntico al previo al change

#### Scenario: Alta de insumo sin unidad activa
- **WHEN** llega una petición de alta de insumo sin contexto de unidad de negocio
- **THEN** el sistema rechaza la petición en lugar de crear un insumo huérfano
