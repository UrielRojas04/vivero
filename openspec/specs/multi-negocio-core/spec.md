## ADDED Requirements

### Requirement: Propagación de Unidad de Negocio Activa
El sistema SHALL permitir que el frontend seleccione una unidad de negocio activa y envíe este contexto al backend en cada petición relevante (ej. mediante un header HTTP `X-Unidad-Negocio`).

#### Scenario: Cambio de negocio en frontend
- **WHEN** el usuario selecciona una unidad de negocio diferente desde la UI
- **THEN** el estado global de auth/negocio se actualiza y las peticiones subsiguientes incluyen el identificador del nuevo negocio.

### Requirement: Filtrado de Datos por Unidad de Negocio
El sistema SHALL limitar la visibilidad de los catálogos y transacciones (ej. Productos, Ventas) a la unidad de negocio activa. Si no se envía el contexto, se debe rechazar la solicitud o usar un contexto por defecto según el rol.

#### Scenario: Consulta de productos
- **WHEN** se consulta el catálogo de productos enviando el contexto "Herramientas"
- **THEN** el backend retorna solo los productos que pertenecen a la unidad "Herramientas".
