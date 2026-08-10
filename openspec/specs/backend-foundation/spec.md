## ADDED Requirements

### Requirement: Estructura base del Backend
El sistema MUST contar con una estructura de paquetes limpia y orientada a servicios, eliminando todo rastro del modelo de datos obsoleto.

#### Scenario: Compilación exitosa tras limpieza
- **WHEN** el desarrollador elimina el paquete `models` viejo y actualiza el `pom.xml`
- **THEN** el comando `./mvnw clean package` se ejecuta sin errores de compilación.

### Requirement: Dependencias Core preparadas
El archivo `pom.xml` MUST incluir las dependencias necesarias para el desarrollo moderno con Spring Boot 3.4.

#### Scenario: Verificación de dependencias
- **WHEN** se inspecciona el archivo `pom.xml`
- **THEN** deben existir las dependencias de `spring-boot-starter-data-jpa`, `spring-boot-starter-web`, `spring-boot-starter-security`, `jjwt-api`, `lombok` y `postgresql`.

### Requirement: Arquitectura en Capas estricta
El sistema MUST proveer la estructura de carpetas para aislar las responsabilidades (Controllers aislados de Repositories).

#### Scenario: Estructura de directorios base
- **WHEN** se inspecciona el directorio fuente principal
- **THEN** deben existir los paquetes `controllers`, `services`, `dto`, `repositories`, `security`, `config` y `exceptions`.
