# 🚀 Configuración de Producción - Heroku

Este documento contiene las instrucciones paso a paso para configurar correctamente el entorno de producción en Heroku.

---

## 1️⃣ Webhook Security - WASSENGER

### Generar Token Seguro

```bash
node scripts/generate-webhook-secret.js
```

Esto generará dos opciones de tokens:
- **WASSENGER_WEBHOOK_SECRET**: Token HMAC (más seguro, recomendado)
- **WASSENGER_WEBHOOK_TOKEN**: Token simple (más fácil de configurar)

### Configurar en Heroku

**Opción A - HMAC (Recomendado para producción):**
```bash
heroku config:set WASSENGER_WEBHOOK_SECRET=<token-generado> --app coworkia-agent
```

**Opción B - Token Simple:**
```bash
heroku config:set WASSENGER_WEBHOOK_TOKEN=<token-generado> --app coworkia-agent
```

### Configurar en Panel de Wassenger

1. Ve a https://app.wassenger.com
2. Navega a Settings → Webhooks
3. Configura la URL del webhook:
   ```
   https://coworkia-agent.herokuapp.com/api/v1/webhooks/wassenger
   ```

4. **Si usas HMAC** (recomendado):
   - Header: `x-webhook-signature`
   - Algoritmo: `HMAC-SHA256`
   - Secret: `<tu-WASSENGER_WEBHOOK_SECRET>`

5. **Si usas token simple**:
   - Header: `x-wassenger-token`
   - Valor: `<tu-WASSENGER_WEBHOOK_TOKEN>`

### Verificar

```bash
# Ver configuración
heroku config:get WASSENGER_WEBHOOK_SECRET --app coworkia-agent

# Monitorear logs
heroku logs --tail --app coworkia-agent

# Deberías ver:
# [WEBHOOK-SECURITY] ✅ Firma HMAC válida
# o
# [WEBHOOK-SECURITY] ✅ Token válido
```

---

## 2️⃣ Sistema de Backups SQLite

### Variables de Entorno

```bash
# Ruta de la base de datos (dyno efímero)
heroku config:set SQLITE_PATH=/app/data/coworkia.db --app coworkia-agent

# Directorio remoto para backups (S3, Google Drive, etc)
heroku config:set BACKUP_REMOTE_DIR=s3://coworkia-backups/sqlite --app coworkia-agent

# Comando para subir backup (depende de tu provider)
# Opción 1: AWS S3
heroku config:set BACKUP_UPLOAD_COMMAND="aws s3 cp" --app coworkia-agent

# Opción 2: Google Cloud Storage
# heroku config:set BACKUP_UPLOAD_COMMAND="gsutil cp" --app coworkia-agent

# Opción 3: Curl a API personalizada
# heroku config:set BACKUP_UPLOAD_COMMAND="curl -F file=@" --app coworkia-agent
```

### Configurar AWS S3 (Ejemplo)

Si usas S3, necesitas:

```bash
# Credenciales AWS
heroku config:set AWS_ACCESS_KEY_ID=<tu-access-key> --app coworkia-agent
heroku config:set AWS_SECRET_ACCESS_KEY=<tu-secret-key> --app coworkia-agent
heroku config:set AWS_DEFAULT_REGION=us-east-1 --app coworkia-agent

# Bucket de backups
heroku config:set BACKUP_REMOTE_DIR=s3://coworkia-backups/sqlite --app coworkia-agent
heroku config:set BACKUP_UPLOAD_COMMAND="aws s3 cp" --app coworkia-agent
```

### Configurar Google Cloud Storage (Alternativa)

```bash
# Service Account JSON (base64 encoded)
heroku config:set GOOGLE_CLOUD_CREDENTIALS="<base64-encoded-json>" --app coworkia-agent
heroku config:set BACKUP_REMOTE_DIR=gs://coworkia-backups/sqlite --app coworkia-agent
heroku config:set BACKUP_UPLOAD_COMMAND="gsutil cp" --app coworkia-agent
```

### Configurar Cron Job para Backups Automáticos

**Opción A - Heroku Scheduler (Recomendado):**

```bash
# Instalar addon (gratis hasta 1 job)
heroku addons:create scheduler:standard --app coworkia-agent

# Abrir dashboard
heroku addons:open scheduler --app coworkia-agent

# Agregar job:
# Comando: npm run backup
# Frecuencia: Every day at 3:00 AM UTC
```

**Opción B - Cron en código (requiere dyno siempre activo):**

Ya está implementado en `src/servicios/backup-scheduler.js` - se ejecuta automáticamente.

### Probar Backup Manualmente

```bash
# Conectarse al dyno
heroku run bash --app coworkia-agent

# Dentro del dyno
npm run backup

# Verificar que el backup se subió
# (depende de tu provider: aws s3 ls, gsutil ls, etc)
```

### Verificar Estado del Backup

```bash
# Endpoint de salud que muestra info de DB
curl https://coworkia-agent.herokuapp.com/health/db

# Respuesta esperada:
# {
#   "status": "healthy",
#   "database": {
#     "path": "/app/data/coworkia.db",
#     "lastBackup": "2025-11-11T10:30:00.000Z",
#     "size": "2.4 MB"
#   }
# }
```

---

## 3️⃣ Testing en Staging/Producción

### Pre-Deploy Checklist

```bash
# 1. Ver todas las variables configuradas
heroku config --app coworkia-agent

# 2. Asegurarse que estén estas variables mínimas:
# ✅ NODE_ENV=production
# ✅ OPENAI_API_KEY
# ✅ WASSENGER_API_KEY
# ✅ WASSENGER_WEBHOOK_SECRET (o TOKEN)
# ✅ GOOGLE_SERVICE_ACCOUNT_JSON
# ✅ GOOGLE_CALENDAR_ID
# ✅ PAYPHONE_TOKEN
# ✅ SQLITE_PATH
# ✅ BACKUP_REMOTE_DIR
# ✅ BACKUP_UPLOAD_COMMAND
```

### Deploy

```bash
# Ver estado actual
git status

# Commit cambios de tests
git add .
git commit -m "feat: add automated test suite with Jest (71 tests passing)"

# Deploy a Heroku
git push heroku main

# O desde otra rama
git push heroku feature-branch:main

# Ver logs del deploy
heroku logs --tail --app coworkia-agent
```

### Pruebas Post-Deploy

#### Test 1: Verificar Health Checks

```bash
# Health general
curl https://coworkia-agent.herokuapp.com/health

# Health de base de datos
curl https://coworkia-agent.herokuapp.com/health/db

# Health de sistema
curl https://coworkia-agent.herokuapp.com/health/system
```

#### Test 2: Usuario Nuevo - Reserva Gratis

**Pasos:**
1. Envía mensaje desde un número NO registrado previamente
2. Conversación esperada:
   ```
   Usuario: "Hola quiero reservar un hot desk mañana 2pm por 2 horas"
   Aurora: "¡Perfecto! [detalles]... ¿Confirmas? 😊"
   Usuario: "Si"
   Aurora: "¡Genial! Como es tu primera vez, ¡este día es GRATIS! 🎉"
   ```

3. **Verificar:**
   - ✅ Aurora NO menciona precio antes de confirmar
   - ✅ Aurora confirma que es gratis
   - ✅ NO se crea link de pago
   - ✅ Se crea evento en Google Calendar
   - ✅ Flag `justConfirmed` se activa

4. **Enviar siguiente mensaje inmediatamente:**
   ```
   Usuario: "Gracias!"
   Aurora: [respuesta amigable SIN precios]
   ```
   - ✅ NO debe mostrar precios por ~10 minutos

#### Test 3: Usuario Recurrente - Reserva Pagada

**Pasos:**
1. Con el MISMO número del test anterior (ahora tiene `firstVisit=false`)
2. **ESPERAR 15 minutos** (para que `justConfirmed` expire)
3. Conversación esperada:
   ```
   Usuario: "Quiero reservar hot desk para pasado mañana 3pm por 3 horas"
   Aurora: "[detalles]... El costo sería $20 USD... ¿Confirmas?"
   Usuario: "Si"
   Aurora: "¡Perfecto! Procede con el pago: [link Payphone]"
   ```

4. **Verificar:**
   - ✅ Aurora menciona precio ANTES de confirmar (porque ya NO es nuevo)
   - ✅ Precio correcto: 3h = $20 (base $10 + $10 adicional)
   - ✅ Se genera link de Payphone
   - ✅ Estado queda en `pending_payment`

#### Test 4: Monitorear Background Processes

```bash
# Ver logs en tiempo real
heroku logs --tail --app coworkia-agent

# Buscar eventos específicos
heroku logs --tail --app coworkia-agent | grep "\[WEBHOOK-SECURITY\]"
heroku logs --tail --app coworkia-agent | grep "\[BACKUP\]"
heroku logs --tail --app coworkia-agent | grep "\[CONFIRMATION\]"
heroku logs --tail --app coworkia-agent | grep justConfirmed

# Logs de errores
heroku logs --tail --app coworkia-agent | grep "ERROR\|Error\|❌"
```

#### Test 5: Verificar Base de Datos

```bash
# Endpoint de DB
curl https://coworkia-agent.herokuapp.com/health/db | jq

# Respuesta esperada incluye:
# - userCount: número de usuarios registrados
# - reservationsCount: número de reservas
# - pendingConfirmations: confirmaciones pendientes
# - lastBackup: timestamp del último backup
```

### Troubleshooting

**Problema: Webhook no recibe mensajes**
```bash
# Ver logs de webhook
heroku logs --tail --app coworkia-agent | grep WEBHOOK

# Verificar secret configurado
heroku config:get WASSENGER_WEBHOOK_SECRET --app coworkia-agent

# Test manual del endpoint
curl -X POST https://coworkia-agent.herokuapp.com/api/v1/webhooks/wassenger \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: test" \
  -d '{"test": true}'
```

**Problema: Backup no se ejecuta**
```bash
# Ver estado del scheduler
heroku addons:open scheduler --app coworkia-agent

# Ejecutar backup manualmente
heroku run npm run backup --app coworkia-agent

# Ver logs de backup
heroku logs --tail --app coworkia-agent | grep BACKUP
```

**Problema: justConfirmed no expira**
```bash
# Ver perfiles en DB
heroku run node -e "
const { loadProfile } = require('./src/perfiles-interacciones/memoria-sqlite.js');
loadProfile('+593999999999').then(p => console.log(p));
" --app coworkia-agent

# Limpiar manualmente si es necesario
heroku run node -e "
const { clearJustConfirmed } = require('./src/servicios/reservation-state.js');
clearJustConfirmed('+593999999999');
" --app coworkia-agent
```

---

## 📊 Monitoring Dashboard

### Métricas Clave

1. **Heroku Metrics** (dashboard web):
   ```bash
   heroku open --app coworkia-agent
   # Click en "Metrics" tab
   ```

2. **Response Times**:
   ```bash
   heroku logs --tail --app coworkia-agent | grep "Response time"
   ```

3. **Error Rate**:
   ```bash
   heroku logs --tail --app coworkia-agent | grep -c "ERROR"
   ```

4. **Memory Usage**:
   ```bash
   heroku ps:scale --app coworkia-agent
   ```

---

## 🔄 Rollback Plan

Si algo sale mal:

```bash
# Ver releases recientes
heroku releases --app coworkia-agent

# Rollback a versión anterior
heroku rollback v93 --app coworkia-agent

# Ver logs del rollback
heroku logs --tail --app coworkia-agent
```

---

## ✅ Checklist Final

Antes de considerar el deploy exitoso, confirmar:

- [ ] Webhook security configurado y funcionando
- [ ] Backup system configurado y testeado
- [ ] Usuario nuevo recibe día gratis correctamente
- [ ] Usuario recurrente ve precios y puede pagar
- [ ] Flag `justConfirmed` previene mostrar precios inmediatamente
- [ ] Flag `justConfirmed` expira después de 10 minutos
- [ ] Google Calendar crea eventos correctamente
- [ ] Emails de confirmación se envían
- [ ] `/health/db` responde correctamente
- [ ] No hay errores en los logs durante operación normal
- [ ] Backups se ejecutan y suben correctamente

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa logs: `heroku logs --tail --app coworkia-agent`
2. Verifica config: `heroku config --app coworkia-agent`
3. Revisa test suite: `npm test`
4. Consulta este documento

---

**Última actualización**: 2025-11-11
**Versión**: v94 + Test Suite
