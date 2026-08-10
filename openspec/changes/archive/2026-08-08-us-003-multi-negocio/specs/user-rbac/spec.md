## MODIFIED Requirements

### Requirement: Asignación Usuario-Rol (Modificado)
El sistema SHALL permitir que un usuario tenga uno o más roles **para cada Unidad de Negocio**. Ya no es una relación directa global, sino que depende de en qué negocio esté operando.

#### Scenario: Usuario con roles distintos por negocio
- **WHEN** un usuario es EMPLEADO en la unidad "Vivero" y JEFE en la unidad "Sustratos"
- **THEN** al ingresar a "Vivero", debe obtener permisos de empleado, pero al ingresar a "Sustratos", debe obtener permisos de jefe.
