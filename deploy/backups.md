# Backups de producción

Dos capas, a niveles distintos:

1. **Backup semanal de Hostinger** (automático, incluido en el plan del VPS): una foto completa
   del disco entero del servidor. Cubre el escenario "el VPS se rompió/se corrompió del todo".
   Se gestiona desde el panel de Hostinger (VPS → Respaldos y monitoreo), no desde acá.

2. **Dump diario de la base de datos** (armado en esta sesión, 2026-09-09): un `pg_dump` de
   `vivero_db`, comprimido, guardado **en el propio VPS** (no en la compu local) en
   `/root/backups/`, con los últimos 7 días retenidos (se borran solos los más viejos). Cubre el
   escenario "se borró o se corrompió algo por error" con mucha más frecuencia que el semanal de
   Hostinger — pero si el VPS entero se pierde, este backup se pierde con él (para eso está la
   capa 1).

Un dump ES un backup (una exportación de la base que Postgres puede usar para reconstruirla), es
sólo un tipo específico -- distinto al backup de disco completo de Hostinger.

## Script del dump diario

Vive en el VPS en `/root/backup-vivero-db.sh`:

```bash
#!/bin/bash
set -e
cd /root/vivero
DB_PASS=$(grep '^POSTGRES_PASSWORD=' .env | cut -d '=' -f2-)
BACKUP_DIR="/root/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec -e PGPASSWORD="$DB_PASS" vivero-postgres pg_dump -U admin vivero_db | gzip > "$BACKUP_DIR/vivero_db_$TIMESTAMP.sql.gz"
find "$BACKUP_DIR" -name "vivero_db_*.sql.gz" -mtime +7 -delete
```

Programado vía `/etc/cron.d/vivero-backup` (corre todos los días a las 3 AM, hora del servidor):

```
0 3 * * * root /root/backup-vivero-db.sh >> /root/backups/backup.log 2>&1
```

## Restaurar un dump

Conectado por SSH al VPS:

```bash
gunzip -c /root/backups/vivero_db_FECHA.sql.gz | docker exec -i vivero-postgres psql -U admin vivero_db
```

Reemplazar `FECHA` por el timestamp real del archivo (`ls /root/backups/` para ver cuáles hay).
Esto reemplaza los datos actuales de la base con los del dump -- no se probó una restauración real
todavía en este despliegue, conviene hacer una prueba controlada en algún momento para confirmar
que el proceso funciona de punta a punta antes de necesitarlo de verdad en una emergencia.
