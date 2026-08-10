## 1. Entidades de Multi-Tenancy (JPA)

- [x] 1.1 Crear entidad `UnidadNegocio` (`id`, `nombre`).
- [x] 1.2 Crear entidad asociativa `UsuarioUnidadRol` (`id`, `ManyToOne Usuario`, `ManyToOne UnidadNegocio`, `ManyToOne Rol`).
- [x] 1.3 Eliminar el `@ManyToMany` directo en la clase `Usuario`. Reemplazarlo por una relación `@OneToMany` hacia `UsuarioUnidadRol`.

## 2. Refactor del JWT y Autenticación

- [x] 2.1 Refactorizar `JwtUtils` para recibir e incluir el `tenantId` en los claims al generar el token, y agregar método para extraer el `tenantId`.
- [x] 2.2 Refactorizar `JwtFilter` para que pase el `tenantId` al contexto de alguna forma (ej: extendiendo los detalles de autenticación o usando un ThreadLocal custom).
- [x] 2.3 Modificar `UsuarioRepository` y `Usuario.getAuthorities()` para que la obtención de permisos dependa de la unidad de negocio en curso, o cargue todos pero los filtre en memoria.

## 3. Repositorios y Script Inicial

- [x] 3.1 Crear `UnidadNegocioRepository` y `UsuarioUnidadRolRepository`.
- [x] 3.2 Modificar `DataInitializer` para crear las unidades "Vivero" "Herramientas" y "Sustratos y perlas", y relacionar al jefe con "Vivero", "Herramientas" y "Sustratos y perlas" a través de `UsuarioUnidadRol`.
- [x] 3.3 Verificar compilación con `./mvnw clean compile`.
