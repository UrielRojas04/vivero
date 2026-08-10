## ADDED Requirements

### Requirement: CRUD de Usuarios para Administración
El sistema MUST proveer endpoints para listar usuarios y modificar sus roles, protegiendo estos endpoints para que solo administradores puedan accederlos.

#### Scenario: Listar usuarios
- **WHEN** un administrador hace `GET /api/usuarios`
- **THEN** el sistema devuelve un array con los usuarios (sin contraseñas) y sus roles asignados por cada unidad de negocio.

#### Scenario: Crear usuario
- **WHEN** un administrador hace `POST /api/usuarios` con username, password y lista de asignaciones
- **THEN** el sistema crea el usuario, asocia los roles mediante la tabla `UsuarioUnidadRol` y devuelve el DTO creado.

#### Scenario: Actualizar usuario (Asignación de roles)
- **WHEN** un administrador hace `PUT /api/usuarios/{id}` con la lista completa deseada de asignaciones
- **THEN** el sistema limpia las asignaciones previas del usuario, inserta las nuevas, y retorna éxito, sin requerir que se envíe una contraseña si no se quiere cambiar.

### Requirement: CRUD de Roles para Administración
El sistema MUST proveer endpoints para crear, leer, actualizar y borrar (soft o validado) roles, asignando una lista de permisos a cada uno. El rol JEFE debe estar excluido y protegido.

#### Scenario: Listado de Roles excluyendo JEFE
- **WHEN** un administrador hace `GET /api/roles`
- **THEN** el sistema retorna la lista de roles del sistema, pero NUNCA retorna el rol cuyo nombre sea "JEFE".

#### Scenario: Crear Rol
- **WHEN** un administrador hace `POST /api/roles` con nombre y un array de IDs de permisos
- **THEN** el sistema crea el rol, asocia los permisos en la tabla intermedia y lo retorna.

#### Scenario: Protección del rol JEFE
- **WHEN** alguien intenta hacer `PUT /api/roles/{jefeId}` o `DELETE /api/roles/{jefeId}`
- **THEN** el sistema arroja 403 o 400 indicando que el rol jefe no puede ser modificado.

### Requirement: Lectura de Permisos
El sistema MUST proveer un endpoint de solo lectura para listar todos los permisos disponibles en el sistema (sembrados en el código).

#### Scenario: Listado de Permisos
- **WHEN** un administrador hace `GET /api/permisos`
- **THEN** el sistema retorna la lista de todos los permisos.
