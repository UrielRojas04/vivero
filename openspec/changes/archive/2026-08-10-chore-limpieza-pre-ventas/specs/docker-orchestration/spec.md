## MODIFIED Requirements

### Requirement: Configuración externalizada
El sistema SHALL externalizar las configuraciones sensibles y de entorno a variables del docker-compose obtenidas desde un archivo `.env` en la raíz del proyecto.

#### Scenario: Datasource y JWT configurable
- **WHEN** el backend se ejecuta dentro de Docker
- **THEN** la URL de conexión a la DB, usuario, password, secreto JWT y tiempos de expiración se toman de variables de entorno del compose, las cuales son leídas de `.env`.

#### Scenario: Desarrollo local sin Docker sigue funcional
- **WHEN** un desarrollador levanta el backend con `./mvnw spring-boot:run` sin Docker
- **THEN** la configuración en `application.properties` debe usar expresiones `${VARIABLE:fallback_seguro}` para requerir la inyección de entorno pero no explotar en parseo si faltan.
