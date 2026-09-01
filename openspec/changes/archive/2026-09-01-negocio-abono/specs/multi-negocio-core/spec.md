## MODIFIED Requirements

### Requirement: Propagación de Unidad de Negocio Activa
El sistema SHALL permitir que el frontend seleccione una unidad de negocio activa entre las N unidades disponibles para el usuario y envíe este contexto al backend en cada petición relevante (ej. mediante un header HTTP `X-Unidad-Negocio`). El mecanismo MUST ser genérico respecto de la cantidad de unidades: agregar una unidad nueva MUST NOT requerir cambios en la propagación del contexto.

#### Scenario: Cambio de negocio en frontend
- **WHEN** el usuario selecciona una unidad de negocio diferente desde la UI
- **THEN** el estado global de auth/negocio se actualiza y las peticiones subsiguientes incluyen el identificador del nuevo negocio.

#### Scenario: Selección de una tercera unidad
- **WHEN** el usuario selecciona la unidad "Abono" desde el selector del sidebar
- **THEN** las peticiones subsiguientes viajan con el identificador de la unidad "Abono" sin ningún tratamiento especial por identificador

### Requirement: Filtrado de Datos por Unidad de Negocio
El sistema SHALL limitar la visibilidad de los catálogos y transacciones (ej. Productos, Ventas, Clientes, Insumos) a la unidad de negocio activa. Si no se envía el contexto, se debe rechazar la solicitud o usar un contexto por defecto según el rol. El filtrado MUST resolverse por el identificador recibido en el contexto y MUST NOT depender de identificadores de unidad escritos literalmente en el código.

#### Scenario: Consulta de productos
- **WHEN** se consulta el catálogo de productos enviando el contexto "Herramientas"
- **THEN** el backend retorna solo los productos que pertenecen a la unidad "Herramientas".

#### Scenario: Consulta de productos de la unidad Abono
- **WHEN** se consulta el catálogo de productos enviando el contexto "Abono"
- **THEN** el backend retorna únicamente las categorías de bolsa de esa unidad, sin productos de Vivero ni de Herramientas

#### Scenario: Sin identificadores de unidad literales en la lógica de negocio
- **WHEN** se agrega una unidad de negocio nueva al sistema
- **THEN** las decisiones de comportamiento se resuelven por atributos declarados en la propia `UnidadNegocio` y no por comparaciones contra identificadores literales

## ADDED Requirements

### Requirement: Capacidades Declaradas por Unidad de Negocio
El sistema SHALL declarar en la entidad `UnidadNegocio` los atributos que gobiernan su comportamiento diferencial (modelo de costeo, porcentajes por defecto, porcentaje de reparto), de modo que sumar una unidad nueva se resuelva configurando datos y no ramificando código por identificador.

#### Scenario: Alta de una unidad con modelo de costos por insumos
- **WHEN** se crea la unidad "Abono" declarando el modelo de costos basado en insumos
- **THEN** los cálculos financieros de esa unidad usan gastos de insumos contra ventas, sin que ningún servicio compare su identificador contra un literal

#### Scenario: Unidades existentes sin cambio de comportamiento
- **WHEN** el sistema arranca tras declarar las capacidades de las unidades ya existentes
- **THEN** Vivero y Herramientas producen exactamente los mismos resultados financieros y de stock que antes del change
