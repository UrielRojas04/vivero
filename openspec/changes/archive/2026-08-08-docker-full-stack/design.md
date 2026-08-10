## Context

El proyecto sistema-vivero tiene tres capas: PostgreSQL 15 (ya dockerizado en `docker-compose.yml`), backend Spring Boot 3.4 (Java 21, compilado con Maven), y frontend React 19 (build con Vite 7, servido como estáticos). Actualmente el backend se levanta manualmente con `./mvnw spring-boot:run` y el frontend con `npm run dev`. La comunicación es vía REST API en `localhost:8080/api`.

Estado actual del `docker-compose.yml`:
- Servicio `vivero-db`: PostgreSQL 15, port 5433:5432, volumen persistente.

Configuración relevante:
- `application.properties`: datasource URL apunta a `localhost:5433`, CORS origins configurables, `ddl-auto=update`.
- Frontend `.env`: `VITE_API_URL=http://localhost:8080/api` (variable de build-time).
- Backend usa JWT con secret hardcodeado en `JwtUtils.java`.

## Goals / Non-Goals

**Goals:**
- Levantar los 3 servicios (db, backend, frontend) con un solo `docker compose up`
- Build multi-stage para imágenes livianas de producción
- Networking interno para que el backend se comunique con la DB sin exponer puertos innecesarios
- Externalizar configuración sensible a variables de entorno
- Frontend servido con Nginx en producción
- Mantener compatibilidad con desarrollo local sin Docker

**Non-Goals:**
- CI/CD pipeline (será un change separado)
- Deploy a cloud (AWS/GCP/etc.)
- Dockerizar el entorno de desarrollo (dev containers, hot-reload dentro de Docker)
- HTTPS/TLS (se maneja en reverse proxy o load balancer externo)
- Cambiar la lógica de negocio o corregir bugs del sistema

## Decisions

### 1. Multi-stage builds para ambos Dockerfiles

**Decisión**: Usar multi-stage builds en backend y frontend.

**Rationale**: Reduce dramáticamente el tamaño de las imágenes. El stage de build incluye todo el tooling (Maven/Node), pero el stage final solo tiene el runtime (JRE/Nginx).

**Alternativa descartada**: Single-stage con todo el SDK → imágenes de +800MB innecesarios.

### 2. Backend: eclipse-temurin:21-jdk → eclipse-temurin:21-jre-alpine

**Decisión**: Build con `eclipse-temurin:21-jdk` (para Maven), runtime con `eclipse-temurin:21-jre-alpine`.

**Rationale**: Temurin es la distribución recomendada de OpenJDK. Alpine reduce la imagen final a ~200MB vs ~400MB con Debian.

### 3. Frontend: Nginx para servir estáticos

**Decisión**: Build con `node:22-alpine` (Vite build), runtime con `nginx:alpine` sirviendo los archivos de `dist/`.

**Rationale**: Nginx es el estándar para servir SPAs. Necesita un `nginx.conf` con un try_files que redirija todo a `index.html` (para client-side routing futuro). Liviano (~30MB la imagen).

**Alternativa descartada**: Usar `serve` o `http-server` de Node → más pesado, menos eficiente.

### 4. API proxy via Nginx

**Decisión**: El Nginx del frontend incluye un proxy_pass para `/api` que redirige al servicio `backend:8080`.

**Rationale**: Evita problemas de CORS en producción. El frontend y la API se sirven desde el mismo origen (el Nginx). El browser nunca habla directamente con el backend.

**Alternativa descartada**: Exponer el backend en un port público y configurar CORS → más complejo, menos seguro.

### 5. Variables de entorno en docker-compose

**Decisión**: Externalizar a environment del compose: DB credentials, Spring datasource URL, JWT secret (como placeholder). NO usar archivo `.env` separado para el compose (mantenerlo simple).

**Rationale**: El compose ya tiene variables de la DB. Agregar las del backend ahí mantiene todo centralizado.

### 6. Frontend API URL como build arg

**Decisión**: Pasar `VITE_API_URL` como `ARG` en el Dockerfile del frontend. En producción, el Nginx proxy hace que sea `/api` (relativo), pero lo dejamos configurable.

**Rationale**: Vite inyecta env vars en build-time (no runtime). El valor por defecto será `/api` para producción (proxy de Nginx), pero se puede overridear para otros entornos.

### 7. Networking: red interna Docker

**Decisión**: Crear una red `vivero-net` de tipo bridge. Los tres servicios se conectan. El backend referencia la DB como `vivero-db:5432`. El Nginx del frontend referencia el backend como `backend:8080`.

**Ports expuestos al host**:
- `vivero-db`: `5433:5432` (mantener para herramientas como DBeaver)
- `backend`: `8080:8080` (para debugging directo)
- `frontend`: `80:80` (acceso principal de la app)

### 8. Health checks y depends_on

**Decisión**: Agregar health checks al servicio de DB y usar `depends_on` con condición `service_healthy` para que el backend espere a que Postgres esté listo.

**Rationale**: Sin esto, el backend arranca antes que la DB acepte conexiones → crash loop.

## Risks / Trade-offs

- **[Build time en primera ejecución]** → Maven descarga dependencias (~5 min la primera vez). Mitigation: Docker layer caching del `pom.xml` antes de copiar el source.
- **[Variables hardcodeadas en compose]** → Las credenciales de DB están en texto plano en el compose. Mitigation: Aceptable para desarrollo local. Para producción se usarán secrets o env files.
- **[Frontend build-time config]** → `VITE_API_URL` se bake en el bundle de JS. Mitigation: El default `/api` + nginx proxy funciona para cualquier dominio. Solo se necesita rebuild si cambia la arquitectura de red.
- **[Sin hot-reload en Docker]** → Los Dockerfiles son para producción, no para desarrollo. Mitigation: El flujo de dev local sin Docker sigue funcional y es lo recomendado.
