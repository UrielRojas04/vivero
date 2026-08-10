## ADDED Requirements

### Requirement: Backend container with multi-stage build
El sistema SHALL proveer un Dockerfile para el backend que compile el proyecto Spring Boot con Maven en un stage y ejecute el JAR resultante en un runtime JRE Alpine en el segundo stage.

#### Scenario: Build exitoso del backend
- **WHEN** se ejecuta `docker build` en el directorio `backend/`
- **THEN** se genera una imagen funcional que ejecuta el JAR de Spring Boot con Java 21

#### Scenario: Layer caching de dependencias Maven
- **WHEN** solo cambia código fuente (sin cambios en `pom.xml`)
- **THEN** Docker reutiliza la capa de dependencias Maven descargadas, reduciendo el tiempo de build

### Requirement: Frontend container with Nginx
El sistema SHALL proveer un Dockerfile para el frontend que compile los assets con Vite (Node) en un stage y los sirva con Nginx Alpine en el segundo stage.

#### Scenario: Build exitoso del frontend
- **WHEN** se ejecuta `docker build` en el directorio `frontend/`
- **THEN** se genera una imagen con Nginx que sirve los archivos estáticos del build de Vite

#### Scenario: SPA routing con Nginx
- **WHEN** un usuario navega a una ruta de la SPA que no corresponde a un archivo estático
- **THEN** Nginx retorna `index.html` para que React maneje el routing del lado del cliente

### Requirement: API proxy via Nginx
El sistema SHALL configurar Nginx para hacer proxy_pass de requests a `/api` hacia el servicio backend interno.

#### Scenario: Request a la API via proxy
- **WHEN** el browser envía un request a `/api/bandejas`
- **THEN** Nginx redirige el request a `http://backend:8080/api/bandejas` de forma transparente

#### Scenario: Sin errores de CORS en producción
- **WHEN** el frontend y la API se sirven desde el mismo origen vía Nginx proxy
- **THEN** no se producen errores de CORS ya que ambos comparten el mismo host y port

### Requirement: Docker Compose full-stack orchestration
El sistema SHALL orquestar los tres servicios (db, backend, frontend) con un solo archivo `docker-compose.yml`.

#### Scenario: Levantar todo el stack
- **WHEN** se ejecuta `docker compose up --build`
- **THEN** los tres servicios (vivero-db, backend, frontend) se levantan en orden correcto y la aplicación es accesible en `http://localhost`

#### Scenario: Backend espera a la base de datos
- **WHEN** el servicio backend inicia
- **THEN** espera a que el servicio vivero-db esté saludable (health check) antes de comenzar a procesar requests

### Requirement: Configuración externalizada
El sistema SHALL externalizar las configuraciones sensibles y de entorno a variables del docker-compose en lugar de tenerlas hardcodeadas en el código fuente.

#### Scenario: Datasource configurable
- **WHEN** el backend se ejecuta dentro de Docker
- **THEN** la URL de conexión a la DB, usuario y password se toman de variables de entorno del compose

#### Scenario: Desarrollo local sin Docker sigue funcional
- **WHEN** un desarrollador levanta el backend con `./mvnw spring-boot:run` sin Docker
- **THEN** la configuración existente en `application.properties` se usa como fallback y todo funciona normalmente

### Requirement: Internal Docker network
El sistema SHALL crear una red Docker interna donde los servicios se comuniquen por nombre de servicio DNS.

#### Scenario: Comunicación backend → DB
- **WHEN** el backend necesita conectarse a PostgreSQL
- **THEN** usa el hostname `vivero-db` en la red interna Docker (port 5432)

#### Scenario: Comunicación frontend (Nginx) → backend
- **WHEN** Nginx necesita hacer proxy_pass al backend
- **THEN** usa el hostname `backend` en la red interna Docker (port 8080)
