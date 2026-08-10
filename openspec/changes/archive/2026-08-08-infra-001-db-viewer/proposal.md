## Why

Para poder validar la correcta creación y estructura de las nuevas tablas que Hibernate generará para el re-write del ERP (basado en la KB), necesitamos una herramienta de inspección de base de datos. Integrar pgAdmin directamente en el Docker Compose facilita enormemente este proceso sin requerir instalaciones locales, permitiendo ver el esquema Multi-Tenant y RBAC de forma gráfica.

## What Changes

- Se agregará el servicio `pgadmin` al archivo `docker-compose.yml`.
- Se conectará `pgadmin` a la red interna `vivero-net`.
- Se configurarán variables de entorno básicas (`PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`) para el acceso.
- Se mapeará el puerto `5050` al host para acceso web.

## Capabilities

### New Capabilities
- `database-inspection`: Capacidad de inspeccionar gráficamente las tablas, esquemas y datos de PostgreSQL vía web.

### Modified Capabilities
- `docker-orchestration`: Se añade un nuevo contenedor al stack orquestado actual.

## Impact

- Modifica `docker-compose.yml`.
- No impacta el código fuente de Spring Boot ni de React.
- Incrementa ligeramente el uso de memoria en desarrollo local (contenedor adicional).
