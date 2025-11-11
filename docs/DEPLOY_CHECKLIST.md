# 🚀 Deploy Rápido a Heroku - Checklist

## Pre-Requisitos

- [ ] Cuenta de Heroku activa
- [ ] Heroku CLI instalado (`brew install heroku/brew/heroku`)
- [ ] Git configurado
- [ ] Node.js v22+ instalado

## Configuración Rápida (5 minutos)

### 1. Generar Token de Webhook

```bash
node scripts/generate-webhook-secret.js
```

Guarda el `WASSENGER_WEBHOOK_SECRET` generado.

### 2. Ejecutar Script de Configuración

```bash
./scripts/setup-heroku-production.sh coworkia-agent
```

Este script te guiará para configurar:
- ✅ Webhook security
- ✅ OpenAI API
- ✅ Wassenger (WhatsApp)
- ✅ Google Calendar
- ✅ Payphone (pagos)
- ✅ Sistema de backups (S3 o GCS)

### 3. Deploy

```bash
git add .
git commit -m "chore: production configuration"
git push heroku main
```

### 4. Configurar Wassenger

Ve a https://app.wassenger.com → Settings → Webhooks:

- **URL**: `https://coworkia-agent.herokuapp.com/api/v1/webhooks/wassenger`
- **Header**: `x-webhook-signature`
- **Secret**: El token que generaste en paso 1

### 5. Configurar Heroku Scheduler

```bash
heroku addons:create scheduler:standard --app coworkia-agent
heroku addons:open scheduler --app coworkia-agent
```

Agrega job:
- **Comando**: `npm run backup`
- **Frecuencia**: Every day at 3:00 AM UTC

### 6. Verificar

```bash
# Health check
curl https://coworkia-agent.herokuapp.com/health

# Database health
curl https://coworkia-agent.herokuapp.com/health/db

# Ver logs
heroku logs --tail --app coworkia-agent
```

## Testing en Producción

### Test 1: Usuario Nuevo - Día Gratis ✅

1. Envía desde número NO registrado:
   ```
   "Hola quiero reservar hot desk mañana 2pm por 2 horas"
   ```

2. Responde al mensaje de confirmación:
   ```
   "Si"
   ```

3. **Verificar**:
   - ✅ Aurora NO menciona precio antes de confirmar
   - ✅ Dice "es GRATIS tu primera vez"
   - ✅ NO genera link de pago
   - ✅ Crea evento en Google Calendar

4. Envía otro mensaje inmediatamente:
   ```
   "Gracias!"
   ```

5. **Verificar**:
   - ✅ NO debe mostrar precios por ~10 minutos (flag `justConfirmed`)

### Test 2: Usuario Recurrente - Reserva Pagada 💳

1. **ESPERA 15 minutos** después del test anterior

2. Con el MISMO número, envía:
   ```
   "Quiero reservar hot desk pasado mañana 3pm por 3 horas"
   ```

3. **Verificar**:
   - ✅ Aurora menciona precio ANTES de confirmar: "$20 USD"
   - ✅ Precio correcto: 3h = $20 (base $10 + $10 adicional)

4. Confirma:
   ```
   "Si"
   ```

5. **Verificar**:
   - ✅ Genera link de Payphone
   - ✅ Estado: `pending_payment`

### Test 3: Monitorear Sistema 📊

```bash
# Ver webhook security
heroku logs --tail | grep WEBHOOK-SECURITY

# Ver backups
heroku logs --tail | grep BACKUP

# Ver confirmaciones
heroku logs --tail | grep CONFIRMATION

# Ver flag justConfirmed
heroku logs --tail | grep justConfirmed

# Health de base de datos
curl https://coworkia-agent.herokuapp.com/health/db | jq
```

## Troubleshooting

### Webhook no funciona

```bash
# Ver configuración
heroku config:get WASSENGER_WEBHOOK_SECRET

# Test manual
curl -X POST https://coworkia-agent.herokuapp.com/api/v1/webhooks/wassenger \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: sha256=test" \
  -d '{"test": true}'
```

### Backup falla

```bash
# Ejecutar manualmente
heroku run npm run backup

# Ver logs
heroku logs --tail | grep BACKUP

# Verificar variables
heroku config | grep BACKUP
heroku config | grep AWS
```

### justConfirmed no expira

```bash
# Ver perfil de usuario
heroku run node -e "
const { loadProfile } = require('./src/perfiles-interacciones/memoria-sqlite.js');
loadProfile('+593999999999').then(p => console.log(p));
"
```

## Rollback

Si algo sale mal:

```bash
# Ver releases
heroku releases

# Rollback
heroku rollback v93
```

## Variables Críticas

Verifica que estén configuradas:

```bash
heroku config --app coworkia-agent | grep -E "WASSENGER_WEBHOOK_SECRET|OPENAI_API_KEY|WASSENGER_API_KEY|GOOGLE_CALENDAR_ID|SQLITE_PATH|BACKUP_REMOTE_DIR"
```

## Scripts Útiles

```bash
# Generar webhook token
node scripts/generate-webhook-secret.js

# Test backup local
./scripts/test-backup-local.sh

# Setup completo Heroku
./scripts/setup-heroku-production.sh

# Listar backups
npm run backup:list

# Crear backup
npm run backup

# Tests
npm test
npm run test:watch
npm run test:coverage
```

## Recursos

- 📖 [Documentación completa](./docs/HEROKU_PRODUCTION_SETUP.md)
- 🧪 [Test suite](./src/__tests__/)
- 🔧 [Scripts](./scripts/)
- 📝 [Variables de entorno](./.env.example)

## Checklist Final

Antes de considerar exitoso el deploy:

- [ ] Todos los health checks pasan
- [ ] Webhook recibe mensajes correctamente
- [ ] Usuario nuevo recibe día gratis
- [ ] Usuario recurrente ve precios
- [ ] Flag `justConfirmed` previene precios por 10min
- [ ] Google Calendar crea eventos
- [ ] Backups se ejecutan automáticamente
- [ ] No hay errores en logs
- [ ] Tests pasan: `npm test` (71/71 ✅)

---

**¿Problemas?** Revisa [HEROKU_PRODUCTION_SETUP.md](./docs/HEROKU_PRODUCTION_SETUP.md)
