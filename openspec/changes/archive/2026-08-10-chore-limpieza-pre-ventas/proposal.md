## Why

Antes de avanzar con la complejidad de `us-013-ventas-core`, es necesario resolver inconsistencias técnicas de prioridad alta documentadas en la base de conocimiento (`10_preguntas_abiertas.md`). En particular, los secretos JWT y credenciales están hardcodeados, lo cual es un riesgo de seguridad crítico en producción. Además, la entidad `UnidadNegocio` quedó como código muerto vestigial luego de aplanar el RBAC (`us-012-flat-rbac`), y mantenerla solo suma confusión al modelo de dominio.

## What Changes

- **BREAKING**: Se elimina por completo la entidad `UnidadNegocio` y toda referencia a ella en base de datos, modelos, controladores y `SecurityService`.
- Se limpian las referencias a `unidadNegocioId` en `Producto` e `Insumo` (frontend y backend).
- Se trasladan el `jwt.secret`, `spring.datasource.username` y `spring.datasource.password` desde `application.properties` y código Java (hardcodeado) hacia variables de entorno inyectadas por `docker-compose.yml`.
- Se crea el archivo `.env.example` en la raíz del proyecto para documentar las variables necesarias y `.env` en el `.gitignore`.
- Se unifica el logging reemplazando `System.out.println` por `@Slf4j` en los filtros de seguridad y logs del sistema.

## Capabilities

### New Capabilities
- Ninguna nueva (es un chore refactor).

### Modified Capabilities
- `multi-tenancy`: Se elimina/deprecia el soporte multi-tenant ya que el RBAC se maneja de forma plana por usuario.
- `catalogo-productos`: Se remueve el campo `unidadNegocioId`.
- `catalogo-insumos`: Se remueve el campo `unidadNegocioId`.
- `jwt-authentication`: Secret key gestionada por variables de entorno. Logging con SLF4J en vez de sysout.
- `docker-orchestration`: Configuración de base de datos y backend inyectada vía archivo de entorno `.env`.

## Impact

- **Backend:** Entidad `UnidadNegocio` eliminada. `Producto` e `Insumo` no dependerán de una unidad de negocio. `JwtUtils` requerirá variables de entorno. `SecurityService` simplificado.
- **Frontend:** Formularios y requests de ABM de Productos e Insumos ya no enviarán `unidadNegocioId`.
- **Infraestructura:** `docker-compose.yml` tomará variables desde `.env`.
