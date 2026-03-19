---
name: heroku-deployment
description: Procedimientos de deploy, rollback, monitoreo y troubleshooting en Heroku. Usa este skill cuando necesites deployar cambios, hacer rollback de versión, ver logs en producción, reiniciar dynos, configurar variables de entorno, o resolver problemas de deployment.
---

# Heroku Deployment Skill

## Cuándo Usar Este Skill
- 🚀 Necesito deployar cambios a producción
- ⏪ Deploy salió mal, necesito rollback
- 📊 Ver logs en tiempo real de producción
- 🔄 App crashed, necesito restart
- ⚙️ Configurar variables de entorno
- 💾 Ver uso de recursos (dyno, DB)

## App Info

```bash
App Name: coworkia-agent
URL: https://coworkia-agent-e97d15dac56f.herokuapp.com
Region: US
Stack: heroku-22
Dyno: Professional ($50/mes)
Add-ons: Heroku Postgres (Standard-0, $50/mes)
```

## Deploy Standard

### 1. Pre-Deploy Checklist
```bash
# ANTES de deployar, verificar:
✓ Tests locales pasan
✓ Servidor local funciona sin errores
✓ No hay console.log sensibles (passwords, tokens)
✓ .gitignore actualizado
✓ package.json tiene todas las dependencias
```

### 2. Deploy a Heroku
```bash
# Commit cambios:
git add .
git commit -m "feat: descripción clara del cambio"

# Push a Heroku (triggerea build automático):
git push heroku main

# Ver build en tiempo real:
heroku logs --tail --app coworkia-agent
```

### 3. Post-Deploy Verification
```bash
# 1. Verificar app está up:
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/health

# 2. Ver si hay errores:
heroku logs --tail --app coworkia-agent | grep "ERROR"

# 3. Verificar version deployada:
heroku releases --app coworkia-agent | head -5
```

## Rollback Rápido

### Cuando Usar Rollback
- ❌ Deploy causó errores en producción
- ❌ App no responde después de deploy
- ❌ Bug crítico introducido
- ❌ Usuarios reportan fallas

### Hacer Rollback
```bash
# 1. Ver versiones disponibles:
heroku releases --app coworkia-agent

# Output ejemplo:
# v977  Deploy abc123  2026/03/19 10:30:00
# v976  Deploy def456  2026/03/18 15:45:00
# v975  Deploy ghi789  2026/03/17 09:20:00

# 2. Rollback a versión anterior (v976):
heroku rollback v976 --app coworkia-agent

# 3. Verificar:
heroku releases --app coworkia-agent | head -3
```

### Rollback con Confirmación
```bash
# Si no estás seguro, hacer rollback gradual:

# 1. Ver qué cambió en último deploy:
git diff HEAD^ HEAD

# 2. Si confirmas rollback:
heroku rollback --app coworkia-agent  # Va a versión inmediata anterior

# 3. Monitor logs:
heroku logs --tail --app coworkia-agent
```

## Logs y Monitoreo

### Ver Logs en Tiempo Real
```bash
# Todos los logs:
heroku logs --tail --app coworkia-agent

# Solo errores:
heroku logs --tail --app coworkia-agent | grep -E "(ERROR|❌|500|fail)"

# Último deploy:
heroku logs --tail --app coworkia-agent | grep -A 20 "State changed"

# Webhook specific:
heroku logs --tail --app coworkia-agent | grep WASSENGER

# Aurora/Aluna specific:
heroku logs --tail --app coworkia-agent | grep -E "(AURORA|ALUNA)"
```

### Logs Históricos
```bash
# Últimos 1000 logs:
heroku logs -n 1000 --app coworkia-agent

# Guardar logs a archivo:
heroku logs -n 5000 --app coworkia-agent > production-logs.txt

# Logs de fecha específica:
# (Heroku solo guarda últimos 1500 líneas, considera Papertrail para historical)
heroku logs --tail --app coworkia-agent --since="2026-03-18T10:00:00Z"
```

### Logs por Componente
```bash
# Cron jobs:
heroku logs --tail --app coworkia-agent | grep CRON

# Database:
heroku logs --tail --app coworkia-agent | grep POSTGRES

# Mailer:
heroku logs --tail --app coworkia-agent | grep MAILER

# Circuit breakers:
heroku logs --tail --app coworkia-agent | grep "Circuit Breaker"
```

## Restart y Maintenance

### Restart App
```bash
# Restart completo (reinicia todos los dynos):
heroku restart --app coworkia-agent

# Ver status:
heroku ps --app coworkia-agent

# Output:
# web.1: up 2026/03/19 10:45:00 (~ 5m ago)
```

### Cuando Hacer Restart
- App no responde (timeout en requests)
- Memory leak sospechoso
- Después de cambiar variables de entorno
- Circuit breaker stuck
- Websockets/connections colgadas

### Maintenance Mode
```bash
# Activar (muestra página de mantenimiento):
heroku maintenance:on --app coworkia-agent

# Hacer cambios/fixes...

# Desactivar:
heroku maintenance:off --app coworkia-agent
```

## Variables de Entorno

### Ver Variables
```bash
# Todas:
heroku config --app coworkia-agent

# Variable específica:
heroku config:get WASSENGER_TOKEN --app coworkia-agent
heroku config:get DATABASE_URL --app coworkia-agent
```

### Setear Variables
```bash
# Una variable:
heroku config:set NODE_ENV=production --app coworkia-agent

# Múltiples:
heroku config:set \
  MAILER_PASS=nuevo-password \
  WASSENGER_TOKEN=nuevo-token \
  --app coworkia-agent

# IMPORTANTE: Setear variable reinicia la app automáticamente
```

### Variables Críticas
```bash
# WhatsApp:
WASSENGER_TOKEN
WASSENGER_DEVICE_ID
WHATSAPP_BOT_NUMBER

# OpenAI:
OPENAI_API_KEY

# Email:
MAILER_USER
MAILER_PASS

# Database:
DATABASE_URL          # Seteado automáticamente por Heroku Postgres

# App:
NODE_ENV=production
PORT                  # Seteado automáticamente por Heroku
ADMIN_PHONE
```

### Eliminar Variable
```bash
heroku config:unset VARIABLE_NAME --app coworkia-agent
```

## Database Access

### PostgreSQL Connection
```bash
# Abrir psql directo:
heroku pg:psql --app coworkia-agent

# Connection info:
heroku pg:credentials:url --app coworkia-agent
```

### Database Commands
```bash
# Ver info de DB:
heroku pg:info --app coworkia-agent

# Backups:
heroku pg:backups --app coworkia-agent

# Crear backup manual:
heroku pg:backups:capture --app coworkia-agent

# Descargar último backup:
heroku pg:backups:download --app coworkia-agent
```

### Queries Directas
```bash
# Query simple:
heroku pg:psql --app coworkia-agent --command "SELECT COUNT(*) FROM users;"

# Query desde archivo:
heroku pg:psql --app coworkia-agent < query.sql
```

## Troubleshooting Común

### 1. App Crashed (H10/H14 Error)

**Síntoma**: App no responde, Heroku muestra error page

**Debug**:
```bash
# Ver crashes:
heroku logs --tail --app coworkia-agent | grep "State changed"

# Buscar error inmediato antes del crash:
heroku logs -n 500 --app coworkia-agent | grep -B 10 "crashed"
```

**Causas Comunes**:
```
- Process.exit() sin catch
- Uncaught promise rejection
- Memory limit exceeded (512 MB en Professional)
- Port binding error
```

**Fix**:
```bash
# 1. Si es código nuevo, rollback:
heroku rollback --app coworkia-agent

# 2. Si es resource issue, upgrade dyno:
heroku ps:scale web=1:professional-1x --app coworkia-agent

# 3. Restart:
heroku restart --app coworkia-agent
```

### 2. Build Failed

**Síntoma**: `git push heroku main` falla durante build

**Debug**:
```bash
# Ver error de build:
heroku logs --tail --app coworkia-agent | grep "BUILD"
```

**Causas Comunes**:
```
- package.json inválido (JSON syntax error)
- Dependencia no encontrada en npm
- Node version incompatible
- Build script falla
```

**Fix**:
```bash
# Verificar package.json localmente:
npm install --production

# Si funciona local, problema es Heroku específico
# Verificar engines en package.json:
{
  "engines": {
    "node": "20.x",
    "npm": "10.x"
  }
}
```

### 3. Slow Response / Timeout (H12)

**Síntoma**: Requests tardan >30seg, timeout

**Debug**:
```bash
# Ver requests lentos:
heroku logs --tail --app coworkia-agent | grep "at=error code=H12"

# Ver duración de requests:
heroku logs --tail --app coworkia-agent | grep "duration="
```

**Causas Comunes**:
```
- OpenAI API lento (whisper largo)
- Database query sin index
- Circuit breaker abierto (retries)
- Memory leak → GC pausas
```

**Fix**:
```javascript
// Aumentar timeouts en código:
const TIMEOUT_MS = 25000; // < 30seg de Heroku

// Agregar circuit breakers:
dispatchHttpRequest({ timeoutMs: 8000, maxRetries: 2 })
```

### 4. Memory Leak (R14 Error)

**Síntoma**: Dyno usa >512 MB RAM

**Debug**:
```bash
# Ver uso de memoria:
heroku logs --tail --app coworkia-agent | grep "source=web.1.*sample#memory"
```

**Fix**:
```bash
# Restart temporal:
heroku restart --app coworkia-agent

# Fix permanente: revisar código
# Posibles causas:
- Maps/Sets que crecen sin límite (processedMessages, sentMessages)
- Listeners no removidos
- Closures reteniendo objetos grandes
```

## Deployment Best Practices

### 1. Deploy Incremental
```
❌ NO: Deploy 50 cambios a la vez
✅ SÍ: Deploy 1 feature a la vez

Razón: Fácil identificar qué causó un bug
```

### 2. Test en Localhost Primero
```bash
# Antes de push:
npm run dev
# Probar manualmente flows críticos
# Aurora: reserva completa
# Aluna: captura + proforma
```

### 3. Deploy en Horario de Bajo Tráfico
```
🌙 Mejor: 11 PM - 6 AM (Ecuador)
🏢 Evitar: 9 AM - 6 PM (horas pico)
```

### 4. Monitor Post-Deploy (15 min)
```bash
# Después de deploy:
heroku logs --tail --app coworkia-agent

# Verificar:
✓ No hay errores
✓ Webhooks procesando
✓ DB queries OK
✓ APIs externas responden
```

### 5. Tag Releases
```bash
# Después de deploy exitoso:
git tag -a v977 -m "feat: Dashboard Aluna + captura keywords"
git push origin v977

# Ver tags:
git tag -l | tail -10
```

## CI/CD (Futuro - Opcional)

### GitHub Actions (Recomendado)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Heroku
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "coworkia-agent"
          heroku_email: ${{secrets.HEROKU_EMAIL}}
```

## Monitoring URLs

```bash
# Health check:
https://coworkia-agent-e97d15dac56f.herokuapp.com/health

# Metrics:
https://coworkia-agent-e97d15dac56f.herokuapp.com/metrics

# Dashboard Aurora:
https://coworkia-agent-e97d15dac56f.herokuapp.com/aurora-reservas.html

# Dashboard Aluna:
https://coworkia-agent-e97d15dac56f.herokuapp.com/aluna-proformas.html
```

## Emergency Contacts

```
Heroku Support: https://help.heroku.com
Status Page: https://status.heroku.com
Billing: https://dashboard.heroku.com/account/billing
Add-ons: https://dashboard.heroku.com/apps/coworkia-agent/resources
```

## Cost Monitor

```bash
# Ver costos actuales:
heroku billing --app coworkia-agent

# Breakdown:
- Professional Dyno: $50/mes
- Postgres Standard-0: $50/mes
- Total: ~$100/mes + overages
```
