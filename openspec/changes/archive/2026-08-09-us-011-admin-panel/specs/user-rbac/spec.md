## ADDED Requirements

### Requirement: Dinamismo de Roles y Permisos
El sistema MUST permitir la gestión dinámica de `UsuarioUnidadRol` a través de la API, sin requerir acceso directo a la base de datos o reinicios del sistema.

#### Scenario: Mutación de Asignaciones
- **WHEN** un administrador asigna un nuevo rol a un empleado y este último hace login (o refresca su token)
- **THEN** el JWT generado contendrá las autoridades derivadas de la nueva configuración de la base de datos de manera inmediata.
