## ADDED Requirements

### Requirement: Roles de Sistema
El sistema SHALL soportar múltiples roles asignables a los usuarios.

#### Scenario: Creación de rol
- **WHEN** el sistema se inicializa
- **THEN** los roles básicos (JEFE, EMPLEADO_VIVERO, EMPLEADO_SUSTRATOS) deben existir en la base de datos

### Requirement: Permisos
El sistema SHALL soportar permisos granulares asignables a cada rol.

#### Scenario: Permisos por rol
- **WHEN** un rol es cargado
- **THEN** debe contener una lista de permisos específicos (ej. LEER_STOCK, ESCRIBIR_VENTAS)

### Requirement: Asignación Usuario-Rol
El sistema SHALL permitir que un usuario tenga uno o más roles.

#### Scenario: Usuario con múltiples roles
- **WHEN** un usuario (ej. JEFE) es consultado
- **THEN** la consulta devuelve todos sus roles y, por consiguiente, la suma de sus permisos
