## 1. Docker Compose Configuration

- [x] 1.1 Agregar el servicio `pgadmin` al archivo `docker-compose.yml` utilizando la imagen `dpage/pgadmin4`.
- [x] 1.2 Configurar las variables de entorno `PGADMIN_DEFAULT_EMAIL=admin@vivero.com` y `PGADMIN_DEFAULT_PASSWORD=admin` dentro del servicio.
- [x] 1.3 Mapear el puerto `5050:80` para exponer la interfaz web en el host local.
- [x] 1.4 Conectar el servicio a la red `vivero-net` y agregar la dependencia `depends_on: vivero-db`.

## 2. Verificación

- [x] 2.1 Ejecutar `docker compose up -d` para levantar el nuevo servicio.
- [x] 2.2 Verificar que se puede acceder a la UI de pgAdmin ingresando a `http://localhost:5050`.
- [x] 2.3 Instruir al usuario sobre cómo registrar el servidor PostgreSQL interno usando el hostname `vivero-db` y el puerto `5432`.
