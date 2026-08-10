## ADDED Requirements

### Requirement: Database Viewer Container
El sistema SHALL orquestar un contenedor de `dpage/pgadmin4` conectado a la red interna y dependiente de la base de datos.

#### Scenario: Orquestación del visor gráfico
- **WHEN** se ejecuta `docker compose up`
- **THEN** se levanta un servicio llamado `pgadmin` exponiendo el puerto 5050 del host hacia el puerto 80 del contenedor
