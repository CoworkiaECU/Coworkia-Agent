---
name: heroku-deployment
description: Procedimientos de deploy, rollback, monitoreo y troubleshooting en Heroku. Usa este skill cuando necesites deployar cambios, hacer rollback de versión, ver logs en producción, reiniciar dynos, configurar variables de entorno, o resolver problemas de deployment.
applyTo:
  - "Procfile"
  - "package.json"
  - ".env*"
---

# Heroku Deployment

## 🚀 DEPLOY STANDARD

### Prerequisitos
```bash
# Verificar que estás en branch correcto
git branch

# Verificar que no hay cambios sin commit
git status
```

### Deploy Flow
```bash
# 1. Agregar cambios
git add .

# 2. Commit descriptivo
git commit -m "feat: descripción clara del cambio"

# 3. Push a Heroku (auto-deploy)
git push heroku main

# 4. Verificar deployment exitoso
heroku logs --tail --app coworkia-agent
```

### Estados de Deploy
- ✅ **Build succeeded** → versión nueva en producción
- ❌ **Build failed** → revisa logs, deployment no aplicado
- ⚠️ **Build succeeded but app crashing** → rollback inmediato

## 🔙 ROLLBACK RÁPIDO

### Caso de Uso
Deployment nuevo rompió algo en producción → volver a versión estable anterior

### Comandos
```bash
# 1. Ver últimas releases
heroku releases --app coworkia-agent

# Output ejemplo:
# v985  Deploy abc123de  diego@coworkia.ec  2026/03/21 10:45:30 -0500 (~ 5m ago)
# v984  Deploy xyz789ab  diego@coworkia.ec  2026/03/20 23:10:15 -0500 (~ 11h ago)

# 2. Rollback a versión anterior
heroku rollback v984 --app coworkia-agent

# 3. Confirmar rollback exitoso
heroku logs --tail --app coworkia-agent | head -20
```

### Testing Post-Rollback
```bash
# Probar endpoints críticos
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/health
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/api/aluna/followup-stats
```

## 📊 MONITOREO Y LOGS

### Ver Logs en Tiempo Real
```bash
# Todos los logs
heroku logs --tail --app coworkia-agent

# Solo errores
heroku logs --tail --app coworkia-agent | grep -i "error\|exception\|failed"

# Solo Aurora
heroku logs --tail --app coworkia-agent | grep -i "aurora\|reservation"

# Solo Aluna
heroku logs --tail --app coworkia-agent | grep -i "aluna\|membership"

# Solo Cron jobs
heroku logs --tail --app coworkia-agent | grep -i "cron\|followup"
```

### Ver Logs Históricos
```bash
# Últimos 100 logs
heroku logs --num 100 --app coworkia-agent

# Logs de últimas 2 horas
heroku logs --tail --app coworkia-agent --since="2 hours ago"
```

## 🔧 RESTART Y TROUBLESHOOTING

### Restart Completo
```bash
# Reinicia todos los dynos (web + worker)
heroku restart --app coworkia-agent
```

**Cuándo usar**:
- App no responde (timeout)
- Memory leak sospechoso
- Cambios de variables de entorno

### Restart Solo Web Dyno
```bash
heroku restart web --app coworkia-agent
```

### Ver Status
```bash
# Estado de dynos
heroku ps --app coworkia-agent

# Output ejemplo:
# === web (Professional): node index.js (1)
# web.1: up 2026/03/21 10:00:00 -0500 (~ 45m ago)
```

## 🔑 VARIABLES DE ENTORNO

### Ver Todas
```bash
heroku config --app coworkia-agent
```

### Ver Una Específica
```bash
heroku config:get DATABASE_URL --app coworkia-agent
heroku config:get OPENAI_API_KEY --app coworkia-agent
```

### Agregar/Actualizar
```bash
heroku config:set NUEVA_VARIABLE=valor --app coworkia-agent
heroku config:set ADMIN_PHONE=+573XXXXXXXXX --app coworkia-agent
```

### Eliminar
```bash
heroku config:unset VARIABLE_VIEJA --app coworkia-agent
```

### Variables Críticas
```bash
DATABASE_URL          # PostgreSQL (auto-gestionada por Heroku)
WASSENGER_TOKEN       # WhatsApp API
WASSENGER_DEVICE      # Device ID de WhatsApp
OPENAI_API_KEY        # GPT-4
MAILER_USER           # Gmail para emails
MAILER_PASS           # Gmail app password
DIEGO_PERSONAL_PHONE  # Teléfono de Diego para notificaciones
NODE_ENV              # production
```

## 💾 BASE DE DATOS

### Conectar a PostgreSQL
```bash
# Abrir psql
heroku pg:psql --app coworkia-agent

# Dentro de psql:
\dt                   # Listar tablas
\d membership_leads   # Ver estructura de tabla
SELECT COUNT(*) FROM membership_leads;
```

### Backup Manual
```bash
# Descargar backup
heroku pg:backups:capture --app coworkia-agent
heroku pg:backups:download --app coworkia-agent
```

### Ver Info de DB
```bash
heroku pg:info --app coworkia-agent
```

## 🔍 DEBUGGING COMMON ISSUES

### App Crasheando
**Síntoma**: `heroku ps` muestra web dyno crashed

**Debug**:
```bash
# Ver últimos logs de crash
heroku logs --tail --app coworkia-agent | grep -i "error\|crash"

# Ver estado detallado
heroku ps --app coworkia-agent
```

**Fixes comunes**:
- Error de sintaxis → rollback y corregir
- Variable faltante → `heroku config:set VARIABLE=valor`
- Memory limit → escalar dyno (requiere plan pago)

### Build Failing
**Síntoma**: `git push heroku main` falla

**Causas comunes**:
- `package.json` con dependencia rota
- Node version incompatible (ver `engines` en package.json)
- Script de start incorrecto en `Procfile`

**Debug**:
```bash
# Ver output de build
git push heroku main 2>&1 | tee build.log

# Probar build local
npm install
npm start
```

### Timeout en Requests
**Síntoma**: Requests toman > 30s y fallan

**Causas**:
- OpenAI lento (GPT-4 puede tardar)
- DB query pesada
- Heroku Professional dyno (no duerme)

**Fix**:
```bash
# Verificar health
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/health

# Si persiste, revisar código:
# - Agregar timeouts a OpenAI calls (30s máx)
# - Optimizar queries SQL (usar índices)
# - Implementar circuit breaker
```

## 📋 CHECKLIST PRE-DEPLOY

Antes de `git push heroku main`:

- [ ] Tests passing localmente: `npm test`
- [ ] Código compila: `npm start` (verificar 30s)
- [ ] Variables de entorno nuevas agregadas en Heroku
- [ ] Commit message descriptivo
- [ ] Plan de rollback (saber versión anterior estable)

## 📋 CHECKLIST POST-DEPLOY

Después de deployment exitoso:

- [ ] App responde: `curl https://coworkia-agent-e97d15dac56f.herokuapp.com/health`
- [ ] Logs sin errores: `heroku logs --tail --num 50`
- [ ] Endpoints críticos OK:
  - `/api/aluna/followup-stats`
  - `/api/aluna/proformas`
- [ ] Test manual con WhatsApp (enviar msg de prueba)
- [ ] Dashboard funciona: abrir `/aluna-proformas.html`

## 🚨 EMERGENCIAS

### App Completamente Rota (Producción Down)
```bash
# 1. Rollback inmediato (no investigar aún)
heroku rollback v[última versión estable] --app coworkia-agent

# 2. Verificar app vuelve a funcionar
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/health

# 3. Ahora sí, debuggear en local
git checkout [branch del deploy roto]
npm install
npm start
# → Ver logs de error y corregir
```

### Database Corrupta o Perdida
```bash
# 1. Verificar si DB está up
heroku pg:info --app coworkia-agent

# 2. Si está down, contactar soporte Heroku
# 3. Si está up pero datos corruptos, restaurar último backup
heroku pg:backups:restore --app coworkia-agent
```

### Variables de Entorno Borradas Accidentalmente
```bash
# 1. Revisar últimas releases (pueden tener valores)
heroku releases --app coworkia-agent

# 2. Restaurar desde .env local (si tienes)
heroku config:set DATABASE_URL=[valor] OPENAI_API_KEY=[valor] --app coworkia-agent

# 3. Si no tienes valores, regenerar tokens:
# - Wassenger: https://wassenger.com/dashboard
# - OpenAI: https://platform.openai.com/api-keys
# - Gmail: App password en Google Account Settings
```
