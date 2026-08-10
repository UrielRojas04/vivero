## 1. Backend Dockerfile

- [x] 1.1 Crear `backend/Dockerfile` con multi-stage build: stage 1 `eclipse-temurin:21-jdk` compila con Maven (copiar `pom.xml` primero para cachear deps, luego copiar `src/`); stage 2 `eclipse-temurin:21-jre-alpine` copia el JAR y lo ejecuta
- [x] 1.2 Crear `backend/.dockerignore` para excluir `target/`, `.idea/`, `.git/`, archivos innecesarios del contexto de build

## 2. Externalizar configuración del backend

- [x] 2.1 Modificar `application.properties` para usar variables de entorno con fallback: `spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5433/vivero_db}`, `spring.datasource.username=${DB_USER:admin}`, `spring.datasource.password=${DB_PASS:root}`
- [x] 2.2 Externalizar el JWT secret en `JwtUtils.java`: leer desde `@Value("${JWT_SECRET:ViveroPro_Secret_Key_Para_Gestion_De_Siembras_2026}")` en lugar del string hardcodeado

## 3. Frontend Dockerfile y Nginx

- [x] 3.1 Crear `frontend/Dockerfile` con multi-stage build: stage 1 `node:22-alpine` ejecuta `npm ci && npm run build`; stage 2 `nginx:alpine` copia `dist/` al directorio de servido de Nginx
- [x] 3.2 Crear `frontend/nginx.conf` con: server en port 80, `location /` con `try_files $uri $uri/ /index.html` para SPA routing, `location /api` con `proxy_pass http://backend:8080`
- [x] 3.3 Crear `frontend/.dockerignore` para excluir `node_modules/`, `.git/`, archivos innecesarios

## 4. Docker Compose actualizado

- [x] 4.1 Actualizar `docker-compose.yml`: agregar servicio `backend` con build desde `./backend`, variables de entorno para DB y JWT, `depends_on` con health check de `vivero-db`, port `8080:8080`
- [x] 4.2 Agregar servicio `frontend` con build desde `./frontend`, `depends_on: backend`, port `80:80`
- [x] 4.3 Agregar health check al servicio `vivero-db` (`pg_isready`)
- [x] 4.4 Crear red `vivero-net` de tipo bridge y conectar los 3 servicios
- [x] 4.5 Agregar build arg `VITE_API_URL=/api` al servicio frontend

## 5. Verificación

- [x] 5.1 Verificar que `docker compose build` compila las 3 imágenes sin errores
- [x] 5.2 Verificar que `docker compose up` levanta los 3 servicios en orden correcto (db → backend → frontend)
- [x] 5.3 Verificar que la app es accesible en `http://localhost` y el proxy de la API funciona
