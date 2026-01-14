# Plan de Backups y Scheduler

1. **Ruta persistente**
   - Define `SQLITE_PATH=/app/data/coworkia.db` en las variables de Heroku para que la base siempre se cree en la misma carpeta antes de correr cualquier backup.

2. **Ejecución automática**
   - En Heroku Scheduler agrega el comando `npm run backup` cada 30 minutos u hora, según el tráfico.
   - La tarea usa `scripts/backup-database.js` y creará archivos en `data/backups`.

3. **Copia remota**
   - Opcionalmente define:
     - `BACKUP_REMOTE_DIR` → carpeta local donde se duplicará cada `.db` (útil si montas un volumen externo).
     - `BACKUP_UPLOAD_COMMAND` → comando completo para subir el archivo (usa `{file}` como placeholder).  
       Ejemplo: `BACKUP_UPLOAD_COMMAND="aws s3 cp {file} s3://coworkia-backups/"`.

4. **Restauración**
   - Descarga el último `.db`, súbelo al dyno (o volumen), luego apunta `SQLITE_PATH` a ese archivo antes de arrancar el server.

> Recomendación: valida semanalmente que el scheduler se esté ejecutando revisando los logs de Heroku (`heroku logs --ps scheduler`). 
