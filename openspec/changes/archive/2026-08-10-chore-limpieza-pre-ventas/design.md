## Context

El sistema tiene implementada una entidad `UnidadNegocio` que fue introducida inicialmente para dar soporte multi-tenant (múltiples sucursales). Sin embargo, luego del aplanamiento del RBAC (ADR-002), el modelo se simplificó drásticamente y `UnidadNegocio` ya no se usa, pero quedó cableada en el modelo de BD (Insumo, Producto, Usuario) y en los DTOs, obligando al frontend a mandar hardcodeado `unidadNegocioId=1` y generando ruido en el código.
Adicionalmente, el `jwt.secret` y las credenciales de BD (`spring.datasource.username`, `spring.datasource.password`) están hardcodeados en el `application.properties` y `JwtUtils.java`.

## Goals / Non-Goals

**Goals:**
- Eliminar la entidad `UnidadNegocio` de la BD (PostgreSQL `ddl-auto` se encargará de actualizar tablas o deberemos recrear la BD).
- Eliminar toda mención a `UnidadNegocio` en DTOs, controllers, frontend requests.
- Cargar `jwt.secret` y config de BD desde el entorno (`System.getenv` / `@Value`).
- Establecer un `.env.example` claro.
- Cambiar los `System.out.println` de seguridad a `log.info` / `log.warn`.

**Non-Goals:**
- Cambiar la lógica de login o AuthStore del frontend (solo se arreglan variables del backend).
- Modificar componentes visuales más allá de purgar el envío de `unidadNegocioId` en los submit forms.

## Decisions

- **UnidadNegocio Removal:** Borrar la clase Java `UnidadNegocio`, borrar la interfaz Repository, remover campo de `Usuario`, `Producto`, e `Insumo`. El frontend ya no tiene que seleccionarla ni el backend buscarla.
- **Environment Variables:** Usar `${JWT_SECRET}` en `@Value` de Spring Boot y pasarlo desde Docker Compose.
- **Logging:** Usar Lombok `@Slf4j` en `JwtFilter` y `SecurityConfig` para estandarizar logs y facilitar debugueos en producción.

## Risks / Trade-offs

- **[Risk]** Al eliminar `UnidadNegocio`, la base de datos PostgreSQL generada con Hibernate podría requerir un drop-and-recreate si no actualiza las Foreign Keys correctamente (aunque `update` podría dejarlas huérfanas o fallar).
  - **Mitigación:** Como estamos en fase de MVP y los datos de prueba son generados por `DataInitializer`, podemos hacer `docker compose down -v` para reiniciar la DB limpia.
- **[Risk]** Error de parseo JWT en migraciones.
  - **Mitigación:** Mantener en el `DataInitializer` una clave fuerte en `.env` (mínimo 32 caracteres para HS256).
