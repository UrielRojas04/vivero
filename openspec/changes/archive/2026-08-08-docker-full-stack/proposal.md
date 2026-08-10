## Why

El proyecto actualmente solo tiene un contenedor Docker para PostgreSQL. Para levantar el backend (Spring Boot) y el frontend (Vite + React), hay que hacerlo manualmente con `mvnw spring-boot:run` y `npm run dev`. Esto dificulta el onboarding de nuevos desarrolladores, genera inconsistencias entre entornos, e impide un despliegue reproducible. Dockerizar el stack completo es el paso previo necesario para cualquier CI/CD o deploy a producción.

## What Changes

- **Dockerfile para el backend** (Spring Boot + Java 21): build multi-stage con Maven para compilar y JRE slim para runtime.
- **Dockerfile para el frontend** (Vite + React): build multi-stage con Node para compilar y Nginx para servir los estáticos en producción.
- **docker-compose.yml actualizado**: agregar servicios `backend` y `frontend` al compose existente que ya tiene `vivero-db` (PostgreSQL 15).
- **Configuración de red interna**: los tres servicios se comunican por la red Docker (el backend se conecta a `vivero-db:5432` en lugar de `localhost:5433`).
- **Variables de entorno centralizadas**: extraer credenciales, URLs y JWT secret a variables de entorno del compose o a un `.env`.

## Capabilities

### New Capabilities
- `docker-orchestration`: Contenedores Docker para backend y frontend, con build multi-stage, networking interno, y orquestación vía docker-compose.

### Modified Capabilities
_(Sin capabilities existentes modificadas — el directorio openspec/specs/ está vacío)_

## Impact

- **Archivos nuevos**: `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`
- **Archivos modificados**: `docker-compose.yml`, `backend/src/main/resources/application.properties` (externalizar config), posiblemente `frontend/.env` o `frontend/vite.config.js` (API URL dinámica para build)
- **Dependencias**: Docker y Docker Compose (ya presentes dado el compose actual)
- **Breaking changes**: Ninguno. El flujo de desarrollo local sin Docker sigue funcionando.
