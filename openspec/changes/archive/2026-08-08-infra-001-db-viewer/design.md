## Context
Actualmente el proyecto cuenta con un contenedor de PostgreSQL (`vivero-db`), pero carece de una interfaz gráfica integrada para visualizar y administrar la base de datos sin depender de clientes locales (como DBeaver o DataGrip).

## Goals / Non-Goals
**Goals:**
- Proveer una interfaz web out-of-the-box para administrar la base de datos PostgreSQL.
- Asegurar que la herramienta se inicie automáticamente con `docker compose up`.
- Pre-configurar las credenciales base para acceso rápido en desarrollo local.

**Non-Goals:**
- Exponer pgAdmin a internet de forma segura para producción.
- Automatizar la conexión inicial al servidor dentro de pgAdmin (requerirá un setup manual la primera vez usando `vivero-db`).

## Decisions
- **Uso de pgAdmin4 (dpage/pgadmin4)**: Es el estándar de facto para PostgreSQL, con soporte nativo en Docker y muy ligero.
- **Red Interna (`vivero-net`)**: pgAdmin se conectará a la misma red bridge que la base de datos, lo que permite registrar el servidor de BD usando el hostname `vivero-db` en lugar de IPs que cambian.
- **Mapeo de puerto 5050**: Se eligió el puerto 5050 en lugar del 80 para evitar colisiones con el Nginx del frontend.

## Risks / Trade-offs
- **Riesgo:** Confusión sobre cómo conectarse a la BD desde pgAdmin.
  - *Mitigación:* Documentar en las tareas que el "Host name/address" debe ser el nombre del servicio Docker (`vivero-db`).
- **Trade-off:** Incremento en el consumo de memoria local al correr Docker Compose (pgAdmin consume ~100MB RAM), pero a cambio de una altísima conveniencia para el ciclo de desarrollo.
