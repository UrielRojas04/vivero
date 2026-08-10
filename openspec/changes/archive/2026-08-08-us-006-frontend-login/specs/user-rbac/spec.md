## ADDED Requirements

### Requirement: Autenticación de UI Global
El frontend MUST enviar las credenciales (username y password) al backend y, de ser exitoso, almacenar el JWT que contiene las autoridades unificadas. No debe requerirse la selección de Unidad de Negocio.

#### Scenario: Login Exitoso
- **WHEN** un usuario ingresa credenciales válidas en la UI y presiona Login
- **THEN** la UI recibe un JWT, lo guarda en el store global (Zustand), y redirige al Dashboard

#### Scenario: Login Fallido
- **WHEN** un usuario ingresa credenciales inválidas
- **THEN** la UI muestra un mensaje de error y no modifica la sesión global
