## 1. Limpieza de Backend

- [x] 1.1 Eliminar el paquete `models` completo de `backend/src/main/java/com/vivero/models`.
- [x] 1.2 Eliminar o comentar temporalmente cualquier archivo de `controllers`, `services` o `repositories` que dependa de `models` y rompa la compilación.
- [x] 1.3 Ejecutar `./mvnw clean compile` (en la terminal o mediante Docker) para verificar que el código compila sin errores.

## 2. Configuración de Dependencias

- [x] 2.1 Modificar el archivo `pom.xml` para incluir `jjwt-api`, `jjwt-impl`, `jjwt-jackson` (versión 0.12.5+).
- [x] 2.2 Asegurar que `spring-boot-starter-security`, `spring-boot-starter-data-jpa` y `postgresql` estén presentes y actualizados.
- [x] 2.3 Ejecutar `./mvnw dependency:resolve` para descargar las nuevas dependencias y verificar el POM.

## 3. Estructura de Directorios (Layered Architecture)

- [x] 3.1 Crear los paquetes base dentro de `com.vivero`: `controllers`, `services`, `dto`, `repositories`, `security`, `config`, `exceptions`.
- [x] 3.2 Verificar que el contenedor `vivero-backend` levante correctamente en Docker (`docker compose restart backend` y ver logs).
