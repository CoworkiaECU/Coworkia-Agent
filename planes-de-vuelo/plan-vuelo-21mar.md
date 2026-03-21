# ✈️ Plan de Vuelo - 21 de Marzo 2026

## 🎯 OBJETIVO PRINCIPAL
**ESTABILIZACIÓN Y TESTING - SISTEMA ANTI-FALLOS**
Campaña al aire → Aurora y Aluna deben funcionar 24/7 sin supervisión

---

## 🧠 CONTEXTO

**Situación actual**:
- ✅ Aluna al 100% funcional (implementado 20 Mar con autopilot)
- ✅ Aurora operativa pero sin documentación de troubleshooting
- ⚠️ **RIESGO**: Campaña fuerte al aire, cualquier fallo = dinero perdido
- 🎯 **META**: Sistema robusto con tests, skills de troubleshooting, y recuperación automática

**Estrategia**:
PRIMERO → Herramientas de diagnóstico y recuperación (skills + tests)
DESPUÉS → Mejoras de features (dashboard, notificaciones)

---

## 📋 BLOQUES DE TRABAJO

### ✅ FASE 1: SKILLS DE TROUBLESHOOTING (2.5h) - COMPLETADA ✅
**Prioridad**: 🔴 CRÍTICO - Sin esto, Diego no puede debuggear fallos rápido  
**Estado**: ✅ Completado por autopilot - 20 Mar 2026, ~14:30

#### BLOQUE 1A: aurora-troubleshooting.md (40 min) ✅
**Objetivo**: Skill especializado para diagnosticar problemas de Aurora (reservas)

**Archivo**: `.github/skills/aurora-troubleshooting/SKILL.md`

**Contenido**:
```yaml
---
name: aurora-troubleshooting
description: Diagnóstico y solución de problemas en Aurora (reservas, coworking). Usa este skill cuando necesites debuggear reservas que no se procesan, webhooks perdidos, confirmaciones fallidas, emails no enviados, o cualquier problema con el flujo de Aurora/reservas en WhatsApp.
applyTo:
  - "src/**/aurora*.js"
  - "src/servicios/reservation*.js"
  - "src/deteccion-intenciones/*"
  - "src/express-servidor/endpoints-api/wassenger.js"
---

# Aurora Troubleshooting

## ⚙️ FLUJO NORMAL

1. **Mensaje recibido** → Wassenger webhook
2. **Orquestador detecta** → `reservation_interest`
3. **Aurora form activa** → recolecta datos (nombre, email, fecha, personas)
4. **Confirmación creada** → `pending_confirmations` table
5. **Pago verificado** → consulta en DB
6. **Email enviado** → confirmación al cliente

## 🚨 PUNTOS DE FALLA COMUNES

### 1. Form no se activa
**Síntoma**: Cliente interesado pero Aurora no pide datos

**Causas**:
- Detección de intención falló (keyword no reconocida)
- Form ya existe activo para ese usuario
- Error en `getAgentForm(userId, 'AURORA')`

**Debug**:
```javascript
// Ver si hay form activo
SELECT * FROM agent_forms WHERE user_id = '573XXXXXXXXX' AND agent = 'AURORA';

// Ver último mensaje procesado
SELECT * FROM conversation_history WHERE sender_id = '573XXXXXXXXX' ORDER BY timestamp DESC LIMIT 5;
```

**Fix**:
```javascript
// Eliminar form stuck
DELETE FROM agent_forms WHERE user_id = '573XXXXXXXXX' AND agent = 'AURORA';

// O manualmente activar form
INSERT INTO agent_forms (user_id, agent, current_step, created_at) VALUES ('573XXXXXXXXX', 'AURORA', 'nombre', NOW());
```

### 2. Confirmación no se guarda
**Síntoma**: Cliente completó form pero no hay confirmación en BD

**Causas**:
- Error al insertar en `pending_confirmations`
- Campos requeridos faltantes (email, fecha, hora, personas)
- Timeout de DB

**Debug**:
```javascript
// Ver confirmaciones recientes
SELECT * FROM pending_confirmations WHERE created_at > NOW() - INTERVAL '1 hour';

// Ver forms completos pero sin confirmación
SELECT af.* FROM agent_forms af
LEFT JOIN pending_confirmations pc ON af.user_id = pc.user_phone
WHERE af.agent = 'AURORA' AND pc.id IS NULL;
```

**Fix**:
- Revisar logs: `heroku logs --tail | grep -i "AURORA\|CONFIRMACION"`
- Verificar que todos los campos del form están llenos
- Reintentar manualmente si fue timeout

### 3. Email no llega
**Síntoma**: Confirmación guardada pero cliente no recibe email

**Causas**:
- `MAILER_PASS` incorrecto o expirado en Heroku
- Gmail bloqueó login (2FA o "app menos segura")
- Email del cliente mal formateado
- Función `sendReservationConfirmationEmail()` falló

**Debug**:
```bash
# Ver logs de mailer
heroku logs --tail --app coworkia-agent | grep -i "MAILER\|EMAIL"

# Verificar variable de entorno
heroku config:get MAILER_PASS --app coworkia-agent
```

**Fix**:
```javascript
// Reenviar email manualmente
const { sendReservationConfirmationEmail } = await import('./src/servicios/mailer-service.js');
await sendReservationConfirmationEmail({
  email: 'cliente@example.com',
  nombre: 'Juan Pérez',
  fecha_hora: '2026-03-25 14:00',
  numero_personas: 2
});
```

### 4. Webhook duplicado
**Síntoma**: Mismo mensaje procesado múltiples veces

**Causas**:
- Wassenger reintentos (si respuesta > 5s)
- `isDuplicateMessage()` no funcionando
- Cache de Redis down

**Debug**:
```bash
# Ver mensajes duplicados
SELECT message_id, COUNT(*) FROM conversation_history 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY message_id HAVING COUNT(*) > 1;
```

**Fix**:
- Verificar que `isDuplicateMessage()` esté funcionando
- Aumentar timeout de respuesta (actualizar webhook config)
- Si es crítico, bloquear temporalmente webhook y procesar manual

## 📊 QUERIES ÚTILES

### Reservas Pendientes Hoy
```sql
SELECT * FROM pending_confirmations 
WHERE fecha_hora::date = CURRENT_DATE
  AND status = 'pending'
ORDER BY fecha_hora;
```

### Reservas Sin Email (necesitan reenvío)
```sql
SELECT * FROM pending_confirmations 
WHERE email_sent = false
  AND created_at > NOW() - INTERVAL '24 hours';
```

### Forms Stuck (más de 1 hora sin completar)
```sql
SELECT * FROM agent_forms 
WHERE agent = 'AURORA'
  AND created_at < NOW() - INTERVAL '1 hour'
  AND current_step != 'completed';
```

## 🔧 COMANDOS RÁPIDOS

### Reiniciar Aurora (si está stuck)
```bash
heroku restart --app coworkia-agent
```

### Ver logs en tiempo real
```bash
heroku logs --tail --app coworkia-agent | grep -E "AURORA|RESERVATION|ERROR"
```

### Rollback si deployment rompió algo
```bash
heroku releases --app coworkia-agent
heroku rollback v[número anterior] --app coworkia-agent
```

## 💡 PREVENCIÓN

### Circuit Breaker
- OpenAI: máx 3 reintentos, luego fallback a respuesta genérica
- Database: connection pool con timeout 10s
- Wassenger: rate limit 20 msg/min

### Logging
Tags clave para búsqueda:
- `[AURORA-FORM]` - Activación y pasos de formulario
- `[RESERVATION]` - Creación de confirmaciones
- `[MAILER]` - Envío de emails
- `[DEDUP]` - Deduplicación de mensajes

### Monitoring
- Dashboard de reservas: `/aurora-reservas.html`
- Tabla `pending_confirmations` para ver flujo
```

**Entregable**:
- [x] Archivo `.github/skills/aurora-troubleshooting/SKILL.md` ✅

---

#### BLOQUE 1B: aluna-troubleshooting.md (40 min) ✅
**Objetivo**: Skill especializado para diagnosticar problemas de Aluna (membresías)

**Archivo**: `.github/skills/aluna-troubleshooting/SKILL.md`

**Contenido**:
```yaml
---
name: aluna-troubleshooting
description: Diagnóstico y solución de problemas en Aluna (membresías, closer). Usa este skill cuando necesites debuggear leads que no se capturan, proformas que no se envían, follow-ups que no funcionan, dashboard que no muestra leads, keywords que no detectan, o cualquier problema con el flujo de Aluna/membresías.
applyTo:
  - "src/**/aluna*.js"
  - "src/servicios/membership*.js"
  - "src/servicios/follow-up*.js"
  - "public/aluna-*.html"
  - "src/database/alunaRepository.js"
---

# Aluna Troubleshooting

## ⚙️ FLUJO NORMAL

1. **Keywords detectadas** → `captureAlunaLeadFromKeywords()`
2. **Lead creado** → `membership_leads` table con status='pending'
3. **Form de membresía activa** → recolecta datos (nombre, plan, mensualidad)
4. **Proforma enviada automáticamente** → WhatsApp + Email con ID único
5. **Follow-ups programados** → D+1 (24h), D+3 (72h)
6. **High intent detection** → auto-cambio a status='negotiating' + notificación

## 🚨 PUNTOS DE FALLA COMUNES

### 1. Keywords no detectan (lead no se captura)
**Síntoma**: Cliente menciona "plan" o "membresía" pero no se crea lead

**Causas**:
- Keyword no está en la lista activa
- Mensaje muy corto (< 3 palabras)
- Ya existe lead para ese teléfono (solo actualiza `last_interaction_at`)

**Keywords activas**:
```javascript
plan, membresía, mensual, oficina, cowork, rentar, alquilar, workspace
```

**Debug**:
```sql
-- Ver leads de últimas 24h
SELECT * FROM membership_leads 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Ver si existe lead previo
SELECT * FROM membership_leads WHERE phone = '573XXXXXXXXX';
```

**Fix**:
- Si keyword falta: agregar a `captureAlunaLeadFromKeywords()` en `alunaRepository.js`
- Si lead existe: mensaje es correcto (solo actualiza timestamp)
- Si cliente no aparece: verificar que `activeAgent === 'ALUNA'` en logs

### 2. Proforma no se envía
**Síntoma**: Lead creado pero cliente no recibe mensaje inicial

**Causas**:
- Error en `sendInitialAlunaProforma()`
- Rate limit de Wassenger alcanzado (20 msg/min)
- Template de proforma roto (variables malformadas)

**Debug**:
```bash
# Ver logs de envío
heroku logs --tail | grep -i "ALUNA.*PROFORMA\|SEND.*PROFORMA"

# Ver leads sin proforma enviada
SELECT * FROM membership_leads 
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND initial_message_sent = false;
```

**Fix**:
```javascript
// Reenviar proforma manualmente
const { sendInitialAlunaProforma } = await import('./src/servicios/aluna-service.js');
await sendInitialAlunaProforma({
  phone: '573XXXXXXXXX',
  nombre: 'María Gómez',
  preferred_plan: 'Mensual',
  budget: '$300'
});
```

### 3. Follow-ups no se envían (D+1, D+3)
**Síntoma**: Pasaron 24h o 3 días pero cliente no recibe recordatorio

**Causas**:
- Cron job no está corriendo (verificar `Procfile` en Heroku)
- `sendFollowUpMessages()` tiene error
- Prospect ya cambió de status (solo envía si status='pending' o 'negotiating')
- Follow-up ya fue marcado como enviado

**Debug**:
```bash
# Ver si cron está corriendo
heroku logs --tail | grep -i "CRON\|FOLLOWUP"

# Ver prospects que deberían recibir D+1
SELECT * FROM aluna_prospect_followups
WHERE followup_24h_sent_at IS NULL
  AND interest_at <= NOW() - INTERVAL '24 hours'
  AND status IN ('pending', 'negotiating');

# Ver prospects que deberían recibir D+3
SELECT * FROM aluna_prospect_followups
WHERE followup_3d_sent_at IS NULL
  AND interest_at <= NOW() - INTERVAL '3 days'
  AND status IN ('pending', 'negotiating');
```

**Fix**:
```javascript
// Ejecutar follow-ups manualmente
const { sendFollowUpMessages } = await import('./src/servicios/follow-up-service.js');
await sendFollowUpMessages();
```

### 4. Dashboard no muestra leads
**Síntoma**: `/aluna-proformas.html` está vacío o no carga

**Causas**:
- Endpoint `/api/aluna/leads` fallando
- Error de JavaScript en frontend
- Query SQL rota

**Debug**:
```bash
# Probar endpoint manualmente
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/api/aluna/leads

# Ver logs del backend
heroku logs --tail | grep -i "aluna.*leads\|aluna-dashboard"
```

**Fix**:
- Abrir DevTools (F12) → Console (ver errores JS)
- Verificar que tabla `membership_leads` existe y tiene datos
- Reiniciar Heroku si es timeout: `heroku restart --app coworkia-agent`

### 5. High Intent no detecta
**Síntoma**: Cliente pregunta "cuánto cuesta" pero no se notifica a Diego

**Causas**:
- Keyword no está en las 45 configuradas
- `activeAgent !== 'ALUNA'` (solo detecta en conversaciones de Aluna)
- Error en `detectHighIntent()` o `notifyDiegoHighIntent()`

**Keywords High Intent (categorías)**:
- **Pricing** (11): precio exacto, cuánto cuesta, valor mensual, tarifas, etc
- **Availability** (12): cuando puedo ver, horarios, puedo visitar, tour, etc
- **Commitment** (13): me interesa, quiero contratar, cómo contrato, empezar ya, etc
- **Urgency** (9): urgente, pronto, rápido, ya, hoy, esta semana, necesito, etc

**Debug**:
```javascript
// Ver detecciones recientes
SELECT * FROM membership_leads 
WHERE status = 'negotiating'
  AND updated_at > NOW() - INTERVAL '24 hours';

// Test manual
const { detectHighIntent } = await import('./src/servicios/aluna-high-intent-detector.js');
const result = detectHighIntent('Hola, cuánto cuesta el plan mensual?');
console.log(result); // Debe retornar { detected: true, category: 'pricing', keyword: 'cuánto cuesta' }
```

**Fix**:
- Si keyword falta: agregar a `aluna-high-intent-detector.js`
- Si no notifica: verificar `ADMIN_PHONE` en variables de entorno Heroku

## 📊 QUERIES ÚTILES

### Leads Calientes (requieren seguimiento humano)
```sql
SELECT * FROM membership_leads
WHERE status IN ('negotiating', 'tour_scheduled')
ORDER BY updated_at DESC;
```

### Leads Sin Respuesta (más de 7 días)
```sql
SELECT * FROM membership_leads
WHERE last_interaction_at < NOW() - INTERVAL '7 days'
  AND status = 'pending';
```

### Efectividad de Follow-ups
```sql
-- Tasa de respuesta después de D+1
SELECT 
  COUNT(*) FILTER (WHERE followup_24h_sent_at IS NOT NULL) as d1_sent,
  COUNT(*) FILTER (WHERE client_response_at IS NOT NULL AND client_response_at > followup_24h_sent_at) as d1_responses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE client_response_at > followup_24h_sent_at) / NULLIF(COUNT(*) FILTER (WHERE followup_24h_sent_at IS NOT NULL), 0), 1) as response_rate_pct
FROM aluna_prospect_followups;
```

### Leads del Día (para reporte matutino)
```sql
SELECT * FROM membership_leads
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
```

## 🔧 COMANDOS RÁPIDOS

### Forzar envío de follow-ups ahora
```bash
# SSH a Heroku y ejecutar manualmente
heroku run node -e "import('./src/servicios/follow-up-service.js').then(m => m.sendFollowUpMessages())" --app coworkia-agent
```

### Ver métricas del dashboard
```bash
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/api/aluna/stats | jq
```

### Limpiar leads de prueba
```sql
DELETE FROM membership_leads WHERE phone LIKE '%test%' OR nombre LIKE '%test%';
```

## 💡 PREVENCIÓN

### Logging
Tags clave:
- `[ALUNA-CAPTURE]` - Captura de keywords
- `[ALUNA-PROFORMA]` - Envío de proforma inicial
- `[ALUNA-FOLLOWUP]` - Follow-ups D+1/D+3
- `[HIGH-INTENT]` - Detección de alto interés

### Monitoring
- Dashboard en vivo: `/aluna-proformas.html`
- Métricas de efectividad: 4 cards superiores
- Refresh automático cada 30s

### Backup Manual
Si cron falla, ejecutar esto cada mañana:
```bash
# 1. Verificar leads nuevos
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/api/aluna/leads | jq '.data | length'

# 2. Enviar follow-ups pendientes
heroku run node scripts/send-followups-manual.js --app coworkia-agent
```
```

**Entregable**:
- [x] Archivo `.github/skills/aluna-troubleshooting/SKILL.md` ✅

---

#### BLOQUE 1C: heroku-deployment.md (30 min) ✅
**Objetivo**: Skill para deployment, rollback y troubleshooting de Heroku

**Archivo**: `.github/skills/heroku-deployment/SKILL.md`

**Contenido**:
```yaml
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
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/api/aluna/stats
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
# === web (Free): node index.js (1)
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
ADMIN_PHONE           # Teléfono de Diego para notificaciones
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
- Heroku Free tier (duerme después de 30min inactividad)

**Fix**:
```bash
# Si es cold start, hacer warm-up request
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/health

# Si persiste, revisar código:
# - Agregar timeouts a OpenAI calls (30s máx)
# - Optimizar queries SQL (usar índices)
# - Implementar circuit breaker
```

## 📋 CHECKLIST PRE-DEPLOY

Antes de `git push heroku main`:

- [ ] Tests passing localmente: `npm test`
- [ ] Sintaxis OK: `npm run lint` (si existe)
- [ ] Código compila: `npm start` (verificar 30s)
- [ ] Variables de entorno nuevas agregadas en Heroku
- [ ] Commit message descriptivo
- [ ] Plan de rollback (saber versión anterior estable)

## 📋 CHECKLIST POST-DEPLOY

Después de deployment exitoso:

- [ ] App responde: `curl https://coworkia-agent-e97d15dac56f.herokuapp.com/health`
- [ ] Logs sin errores: `heroku logs --tail --num 50`
- [ ] Endpoints críticos OK:
  - `/api/aluna/stats`
  - `/api/aluna/leads`
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
heroku help

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
```

**Entregable**:
- [x] Archivo `.github/skills/heroku-deployment/SKILL.md` ✅

---

#### BLOQUE 1D: database-queries.md (40 min) ✅
**Objetivo**: Skill con queries SQL comunes para debugging, monitoreo y análisis

**Archivo**: `.github/skills/database-queries/SKILL.md`

**Contenido**:
```yaml
---
name: database-queries
description: Queries SQL comunes para debugging, monitoreo y análisis de datos. Usa este skill cuando necesites consultar reservas, leads, usuarios, follow-ups, verificar integridad de datos, generar reportes, o debuggear problemas de base de datos.
applyTo:
  - "src/database/**"
---

# Database Common Queries

## 🎯 ACCESO A LA BASE DE DATOS

### Conectar desde Terminal
```bash
# Opción 1: Heroku CLI
heroku pg:psql --app coworkia-agent

# Opción 2: psql directo (necesitas DATABASE_URL)
heroku config:get DATABASE_URL --app coworkia-agent
psql [DATABASE_URL copiado]
```

### Comandos Útiles de psql
```sql
\dt                      -- Listar todas las tablas
\d membership_leads      -- Ver estructura de tabla específica
\q                       -- Salir
```

---

## 📊 ALUNA (MEMBRESÍAS)

### Leads Calientes (Requieren Seguimiento Humano)
```sql
SELECT 
  id,
  nombre,
  phone,
  preferred_plan,
  status,
  created_at,
  last_interaction_at
FROM membership_leads
WHERE status IN ('negotiating', 'tour_scheduled')
ORDER BY updated_at DESC
LIMIT 20;
```

### Leads Nuevos del Día
```sql
SELECT 
  COUNT(*) as total_hoy,
  COUNT(*) FILTER (WHERE status = 'pending') as pendientes,
  COUNT(*) FILTER (WHERE status = 'negotiating') as negociando,
  COUNT(*) FILTER (WHERE status = 'tour_scheduled') as tours
FROM membership_leads
WHERE created_at::date = CURRENT_DATE;
```

### Leads Sin Respuesta (Más de 7 días)
```sql
SELECT 
  nombre,
  phone,
  preferred_plan,
  budget,
  created_at,
  last_interaction_at
FROM membership_leads
WHERE last_interaction_at < NOW() - INTERVAL '7 days'
  AND status = 'pending'
ORDER BY created_at DESC;
```

### Leads Convertidos (Clientes Activos)
```sql
SELECT 
  nombre,
  phone,
  preferred_plan,
  created_at as fecha_lead,
  updated_at as fecha_conversion
FROM membership_leads
WHERE status = 'active_member'
ORDER BY updated_at DESC
LIMIT 20;
```

---

## 📈 EFECTIVIDAD DE FOLLOW-UPS

### Tasa de Respuesta D+1 vs D+3
```sql
SELECT 
  COUNT(*) FILTER (WHERE followup_24h_sent_at IS NOT NULL) as d1_enviados,
  COUNT(*) FILTER (WHERE client_response_at IS NOT NULL 
                   AND client_response_at > followup_24h_sent_at) as d1_respondieron,
  ROUND(100.0 * 
    COUNT(*) FILTER (WHERE client_response_at > followup_24h_sent_at) / 
    NULLIF(COUNT(*) FILTER (WHERE followup_24h_sent_at IS NOT NULL), 0), 
    1) as d1_tasa_respuesta_pct,
  
  COUNT(*) FILTER (WHERE followup_3d_sent_at IS NOT NULL) as d3_enviados,
  COUNT(*) FILTER (WHERE client_response_at IS NOT NULL 
                   AND client_response_at > followup_3d_sent_at) as d3_respondieron,
  ROUND(100.0 * 
    COUNT(*) FILTER (WHERE client_response_at > followup_3d_sent_at) / 
    NULLIF(COUNT(*) FILTER (WHERE followup_3d_sent_at IS NOT NULL), 0), 
    1) as d3_tasa_respuesta_pct
FROM aluna_prospect_followups
WHERE created_at > NOW() - INTERVAL '30 days';
```

### Follow-ups Pendientes de Enviar
```sql
-- D+1 pendientes
SELECT 
  ap.nombre,
  ap.phone,
  ap.interest_at,
  EXTRACT(HOUR FROM (NOW() - ap.interest_at)) as horas_desde_interes
FROM aluna_prospect_followups ap
WHERE ap.followup_24h_sent_at IS NULL
  AND ap.interest_at <= NOW() - INTERVAL '24 hours'
  AND ap.status IN ('pending', 'negotiating')
ORDER BY ap.interest_at;

-- D+3 pendientes
SELECT 
  ap.nombre,
  ap.phone,
  ap.interest_at,
  EXTRACT(DAY FROM (NOW() - ap.interest_at)) as dias_desde_interes
FROM aluna_prospect_followups ap
WHERE ap.followup_3d_sent_at IS NULL
  AND ap.interest_at <= NOW() - INTERVAL '3 days'
  AND ap.status IN ('pending', 'negotiating')
ORDER BY ap.interest_at;
```

### Conversión: Lead → Cliente
```sql
SELECT 
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as leads_30d,
  COUNT(*) FILTER (WHERE status = 'active_member' 
                   AND updated_at > NOW() - INTERVAL '30 days') as convertidos_30d,
  ROUND(100.0 * 
    COUNT(*) FILTER (WHERE status = 'active_member' AND updated_at > NOW() - INTERVAL '30 days') /
    NULLIF(COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0),
    1) as tasa_conversion_pct
FROM membership_leads;
```

---

## 🏢 AURORA (RESERVAS)

### Reservas Pendientes Hoy
```sql
SELECT 
  id,
  user_name as nombre,
  user_phone as telefono,
  fecha_hora,
  numero_personas,
  status,
  created_at
FROM pending_confirmations
WHERE fecha_hora::date = CURRENT_DATE
  AND status = 'pending'
ORDER BY fecha_hora;
```

### Reservas de Próximos 7 Días
```sql
SELECT 
  fecha_hora::date as fecha,
  COUNT(*) as total_reservas,
  SUM(numero_personas) as personas_total
FROM pending_confirmations
WHERE fecha_hora BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND status = 'confirmed'
GROUP BY fecha_hora::date
ORDER BY fecha;
```

### Reservas Sin Email Enviado (Necesitan Reenvío)
```sql
SELECT 
  user_name,
  user_email,
  fecha_hora,
  created_at
FROM pending_confirmations
WHERE email_sent = false
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Ocupación por Horario (top horarios)
```sql
SELECT 
  EXTRACT(HOUR FROM fecha_hora)::integer as hora,
  COUNT(*) as num_reservas,
  SUM(numero_personas) as personas_total
FROM pending_confirmations
WHERE fecha_hora > NOW() - INTERVAL '30 days'
  AND status = 'confirmed'
GROUP BY EXTRACT(HOUR FROM fecha_hora)
ORDER BY num_reservas DESC;
```

---

## 👥 USUARIOS Y CONVERSACIONES

### Usuarios Activos (Últimos 7 días)
```sql
SELECT 
  sender_id as user_phone,
  COUNT(*) as num_mensajes,
  MAX(timestamp) as ultimo_mensaje
FROM conversation_history
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY sender_id
ORDER BY num_mensajes DESC
LIMIT 50;
```

### Conversaciones por Agente
```sql
SELECT 
  agent,
  COUNT(DISTINCT sender_id) as usuarios_unicos,
  COUNT(*) as mensajes_totales
FROM conversation_history
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY agent
ORDER BY mensajes_totales DESC;
```

### Mensajes Sin Responder (Posible Bug)
```sql
SELECT 
  ch.sender_id,
  ch.message_text,
  ch.timestamp,
  ch.agent
FROM conversation_history ch
LEFT JOIN conversation_history ch_response 
  ON ch.sender_id = ch_response.sender_id 
  AND ch_response.timestamp > ch.timestamp
  AND ch_response.is_from_bot = true
WHERE ch.is_from_bot = false
  AND ch.timestamp > NOW() - INTERVAL '1 hour'
  AND ch_response.id IS NULL
ORDER BY ch.timestamp DESC;
```

---

## 🔍 DEBUGGING Y AUDITORÍA

### Forms Stuck (Más de 1 hora sin completar)
```sql
SELECT 
  user_id,
  agent,
  current_step,
  form_data,
  created_at,
  EXTRACT(HOUR FROM (NOW() - created_at)) as horas_stuck
FROM agent_forms
WHERE created_at < NOW() - INTERVAL '1 hour'
  AND current_step != 'completed'
ORDER BY created_at;
```

### Mensajes Duplicados (Detectar Webhook Issues)
```sql
SELECT 
  message_id,
  COUNT(*) as veces_procesado,
  MAX(created_at) as ultima_vez
FROM conversation_history
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY message_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
```

### Logs de Errores (Si existe tabla error_logs)
```sql
SELECT 
  error_type,
  COUNT(*) as ocurrencias,
  MAX(created_at) as ultimo_error
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY ocurrencias DESC;
```

### Integridad de Datos: Leads Sin Teléfono o Nombre
```sql
-- Leads mal formateados
SELECT * FROM membership_leads
WHERE phone IS NULL 
   OR phone = '' 
   OR nombre IS NULL 
   OR nombre = '';
```

---

## 📊 REPORTES PARA DIEGO

### Reporte Diario Completo
```sql
WITH stats AS (
  SELECT 
    -- Aluna
    COUNT(*) FILTER (WHERE ml.created_at::date = CURRENT_DATE) as aluna_leads_hoy,
    COUNT(*) FILTER (WHERE ml.status = 'negotiating') as aluna_negociando,
    COUNT(*) FILTER (WHERE ml.status = 'tour_scheduled') as aluna_tours,
    
    -- Aurora
    (SELECT COUNT(*) FROM pending_confirmations 
     WHERE created_at::date = CURRENT_DATE) as aurora_reservas_hoy,
    (SELECT COUNT(*) FROM pending_confirmations 
     WHERE fecha_hora::date = CURRENT_DATE AND status = 'confirmed') as aurora_confirmadas_hoy
  FROM membership_leads ml
)
SELECT * FROM stats;
```

### Reporte Semanal de Performance
```sql
SELECT 
  DATE_TRUNC('week', created_at)::date as semana,
  COUNT(*) as leads_capturados,
  COUNT(*) FILTER (WHERE status = 'active_member') as convertidos,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'active_member') / COUNT(*), 1) as tasa_conversion
FROM membership_leads
WHERE created_at > NOW() - INTERVAL '8 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY semana DESC;
```

---

## 🧹 LIMPIEZA Y MANTENIMIENTO

### Eliminar Leads de Prueba
```sql
-- CUIDADO: Verificar antes de ejecutar
DELETE FROM membership_leads 
WHERE phone LIKE '%test%' 
   OR phone LIKE '%prueba%'
   OR nombre ILIKE '%test%'
   OR nombre ILIKE '%prueba%';
```

### Archivar Conversaciones Viejas (>6 meses)
```sql
-- Primero contar cuánto se eliminará
SELECT COUNT(*) FROM conversation_history 
WHERE timestamp < NOW() - INTERVAL '6 months';

-- Luego eliminar (considerar hacer backup antes)
DELETE FROM conversation_history 
WHERE timestamp < NOW() - INTERVAL '6 months';
```

### Resetear Form Stuck Manualmente
```sql
-- Ver el form
SELECT * FROM agent_forms WHERE user_id = '573XXXXXXXXX';

-- Eliminarlo para que pueda reiniciarse
DELETE FROM agent_forms WHERE user_id = '573XXXXXXXXX' AND agent = 'AURORA';
```

---

## 💡 TIPS

### Exportar Resultados a CSV (desde psql)
```sql
\copy (SELECT * FROM membership_leads WHERE created_at > NOW() - INTERVAL '30 days') TO '/tmp/leads_30d.csv' CSV HEADER;
```

### Ver Plan de Ejecución de Query Lenta
```sql
EXPLAIN ANALYZE
SELECT * FROM membership_leads 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

### Crear Índice para Query Frecuente
```sql
-- Si notas que queries por phone son lentas
CREATE INDEX idx_membership_leads_phone ON membership_leads(phone);

-- Si queries por status son frecuentes
CREATE INDEX idx_membership_leads_status ON membership_leads(status);
```
```

**Entregable**:
- [x] Archivo `.github/skills/database-queries/SKILL.md` ✅

---

### ✅ FASE 2: TESTING AUTOMATIZADO (2h) - COMPLETADA ✅
**Prioridad**: 🔴 CRÍTICO - Sin tests, cualquier cambio puede romper producción
**Estado**: ✅ Completado por autopilot - 20 Mar 2026, ~19:55
**Commit**: 5c16da2 - FASE 2 Completada: Tests de integración Aurora y Aluna

#### BLOQUE 2A: Tests de Integración Aurora (1h) ✅
**Objetivo**: Suite de tests automatizados para flujo completo de reservas

**Archivo**: `tests/aurora-integration.test.js`

**Tests a implementar**:
1. ✅ Webhook recibe mensaje → detecta intención de reserva
2. ✅ Form se activa correctamente
3. ✅ Datos se validan (email, fecha futura, número personas > 0)
4. ✅ Confirmación se guarda en `pending_confirmations`
5. ✅ Email de confirmación se envía (mock)
6. ✅ Intento de mensajes duplicados → deduplicación funciona

**Comando de ejecución**:
```bash
npm test -- aurora-integration
```

**Entregable**:
- [x] Archivo `tests/aurora-integration.test.js` con 6+ tests ✅

---

#### BLOQUE 2B: Tests de Integración Aluna (1h) ✅
**Objetivo**: Suite de tests automatizados para flujo completo de membresías

**Archivo**: `tests/aluna-integration.test.js`

**Tests a implementar**:
1. ✅ Keywords detectan y crean lead automáticamente
2. ✅ Proforma se envía (mock WhatsApp + Email)
3. ✅ Follow-up D+1 se programa correctamente
4. ✅ Follow-up D+3 se programa correctamente
5. ✅ High intent detection funciona (45 keywords)
6. ✅ Client response tracking funciona

**Comando de ejecución**:
```bash
npm test -- aluna-integration
```

**Entregable**:
- [x] Archivo `tests/aluna-integration.test.js` con 6+ tests ✅

---

### ✅ FASE 3: MEJORAS DE DASHBOARD (3h)
**Prioridad**: 🟡 IMPORTANTE - Mejora productividad de Diego

#### BLOQUE 3A: Botones de Acción Manual (1.5h)
**Objetivo**: Enviar follow-ups manualmente desde dashboard (cuando automation falla o requiere toque personal)

**Funcionalidad**:
- 4 botones por fila: 📱 D+1 WA | 📧 D+1 Email | 📱 D+3 WA | 📧 D+3 Email
- Botón verde si no enviado, gris si ya enviado
- Click abre modal con template del mensaje editable
- Variables: {{nombre}}, {{plan}}, {{mensualidad}}
- Al enviar: actualiza `automation_d1_sent` y `followup_24h_sent_at` en BD

**Archivos a modificar**:
- `public/aluna-proformas.html` - Agregar botones en tabla
- `public/js/aluna-dashboard.js` - Modal + fetch a endpoints
- `src/express-servidor/endpoints-api/aluna-dashboard.js` - 4 nuevos endpoints POST

**Endpoints a crear**:
- `POST /api/aluna/send-d1-whatsapp`
- `POST /api/aluna/send-d1-email`
- `POST /api/aluna/send-d3-whatsapp`
- `POST /api/aluna/send-d3-email`

**Entregable**:
- [ ] Botones en dashboard funcionales
- [ ] Modal con preview de mensaje
- [ ] Endpoints backend implementados

---

#### BLOQUE 3B: Ventana de Creación de Campañas (1.5h)
**Objetivo**: Permitir crear mensajes masivos desde dashboard (ej: "envía D+7 a todos los pending")

**Funcionalidad**:
- Botón `+ Crear Campaña` en dashboard
- Modal con:
  - 📋 Nombre de campaña
  - 🎯 Filtro de audiencia (status: new, negotiating, pending, etc)
  - 📝 Editor de mensaje (textarea grande)
  - 🔤 Variables: {{nombre}}, {{plan}}, {{email}}, {{phone}}
  - 👁️ Preview con datos de un lead real
  - ⏰ "Enviar Ahora" o "Programar" (futuro)
- Backend:
  - Nueva tabla `campaigns` (id, name, message_template, target_filter, created_at, sent_at)
  - Endpoint `POST /api/aluna/campaigns/create`
  - Endpoint `POST /api/aluna/campaigns/send` (envía a todos los que cumplen filtro)

**Archivos a crear/modificar**:
- `public/aluna-proformas.html` - Modal de campaña
- `public/js/aluna-dashboard.js` - Lógica de campaña
- `src/express-servidor/endpoints-api/aluna-dashboard.js` - Endpoints
- `src/database/postgres-adapter.js` - Tabla `campaigns`

**Entregable**:
- [ ] Modal de campaña funcional
- [ ] Preview en tiempo real
- [ ] Envío masivo funcionando

---

### ✅ FASE 4: SISTEMA DE NOTIFICACIONES (2h)
**Prioridad**: 🟢 NICE-TO-HAVE - Permite a Diego monitorear sin abrir dashboard

#### BLOQUE 4: Notificaciones WhatsApp a Diego (2h)
**Objetivo**: Agente notifica a Diego automáticamente en WhatsApp personal

**Casos de uso**:
1. 🚨 **High intent detectado** → notificación inmediata (✅ ya implementado parcialmente)
2. 📊 **Reporte diario 9am**: "Buenos días Diego, ayer: 5 leads nuevos, 3 respondieron, 1 convertido"
3. ⚠️ **Error crítico**: "ALERTA: Circuit breaker abierto en OpenAI - sistema en fallback"
4. ✅ **Autopilot completó**: "Autopilot terminó plan de 3h - 8/8 tareas completadas, 0 errores"
5. 🤔 **Autopilot bloqueado**: "Autopilot pausado - necesito decisión sobre implementación de feature X"

**Implementación**:
- Archivo nuevo: `src/servicios/notification-service.js`
- Variable `ADMIN_PHONE` en Heroku (teléfono de Diego)
- Templates de mensajes para cada tipo
- Integración en:
  - Cron jobs (reporte diario)
  - Health check monitor (errores críticos)
  - Autopilot engine (completado/bloqueado)

**Archivos a crear/modificar**:
- `src/servicios/notification-service.js` - Service principal
- `src/servicios/health-monitor.js` - Monitor de errores
- `src/cron/daily-report.js` - Reporte matutino
- Variables Heroku: `ADMIN_PHONE=+573XXXXXXXXX`

**Entregable**:
- [ ] `notification-service.js` con 5 tipos de notificaciones
- [ ] Cron job para reporte diario 9am
- [ ] Health monitor detecta errores críticos

---

## ⏰ ESTIMACIÓN DE TIEMPOS

| **Fase** | **Bloques** | **Tiempo Estimado** | **Prioridad** |
|----------|-------------|---------------------|---------------|
| FASE 1: Skills Troubleshooting | 4 archivos .md | 2.5h | 🔴 CRÍTICO |
| FASE 2: Testing Automatizado | 2 test suites | 2h | 🔴 CRÍTICO |
| FASE 3: Mejoras Dashboard | 2 features | 3h | 🟡 IMPORTANTE |
| FASE 4: Notificaciones | 1 sistema completo | 2h | 🟢 NICE-TO-HAVE |
| **TOTAL** | **9 bloques** | **9.5h** | Dividir en 2-3 sesiones |

---

## 🎯 RECOMENDACIÓN DE EJECUCIÓN

### Sesión 1 (Autopilot - 2.5h) - MÁXIMA PRIORIDAD
```
✅ FASE 1 completa: Skills de troubleshooting
```
**Razón**: Si hay un fallo en producción, Diego necesita diagnosticar rápido. Los skills le dan al agente contexto especializado para resolver problemas sin intervención humana.

### Sesión 2 (Autopilot - 2h)
```
✅ FASE 2 completa: Testing automatizado
```
**Razón**: Con tests, cualquier cambio futuro se valida automáticamente. Evita romper producción.

### Sesión 3 (Autopilot - 3h)
```
✅ FASE 3 completa: Mejoras de dashboard
```
**Razón**: Diego puede enviar mensajes manualmente y crear campañas. Aumenta productividad.

### Sesión 4 (Opcional - 2h)
```
✅ FASE 4: Sistema de notificaciones
```
**Razón**: Monitoreo proactivo. Diego está informado sin necesidad de abrir dashboard.

---

## 🚀 ACTIVACIÓN DE AUTOPILOT

### Qué decir en el otro chat:
```
autopilot verde nena

Ejecutar FASE 1 del plan-vuelo-21mar.md:
- Crear 4 skills de troubleshooting
- Objetivo: Sistema anti-fallos con documentación especializada
- Tiempo estimado: 2.5 horas
- Checkpoint después de cada 2 skills
```

### Qué esperar:
1. ✅ Agente lee este plan completo
2. ✅ Identifica BLOQUE 1A, 1B, 1C, 1D
3. ✅ Crea los archivos con contenido completo
4. ✅ Commit después de 2 skills: "feat: skills aurora + aluna troubleshooting"
5. ✅ Commit final: "feat: skills heroku + database queries"
6. ✅ Reporta: "FASE 1 completada - 4/4 skills creados"

---

## 📝 CRITERIOS DE ÉXITO

### FASE 1 completada cuando:
- [ ] 4 archivos `.md` creados en `.github/skills/`
- [ ] Cada skill tiene frontmatter YAML correcto
- [ ] Contenido completo y útil (no placeholders)
- [ ] Skills aparecen en Copilot al trabajar en archivos relacionados

### FASE 2 completada cuando:
- [ ] 2 archivos de test creados
- [ ] `npm test` pasa con 12+ tests verdes
- [ ] Tests cubren flujos críticos end-to-end
- [ ] CI/CD puede correr tests automáticamente (futuro)

### FASE 3 completada cuando:
- [ ] Dashboard tiene botones de acción manual funcionales
- [ ] Modal de campañas permite crear y enviar mensajes
- [ ] Diego puede enviar D+1/D+3 manualmente desde UI
- [ ] 0 errores en consola del navegador

### FASE 4 completada cuando:
- [ ] Diego recibe notificación WhatsApp de prueba
- [ ] Reporte diario llega a las 9am automáticamente
- [ ] Errores críticos generan alerta inmediata
- [ ] Autopilot notifica cuando completa o se bloquea

---

## 🎓 LECCIONES PARA AUTOPILOT

### Lo que debe hacer:
✅ Leer plan completo antes de empezar  
✅ Ejecutar bloques en orden (1A → 1B → 1C → 1D)  
✅ Crear archivos completos (no placeholders)  
✅ Commit después de cada 2 bloques (checkpoint)  
✅ Verificar que archivos se crearon correctamente  
✅ Reportar progreso: "BLOQUE 1A completado (1/4)"  

### Lo que NO debe hacer:
❌ Saltarse bloques o cambiar orden  
❌ Crear archivos vacíos con "TODO"  
❌ Hacer un solo commit giant al final  
❌ Inventar funciones que no existen  
❌ Continuar si hay errores de sintaxis  

---

## 🧠 NOTAS PARA DIEGO

### Por qué este orden:
1. **Skills primero**: Si el sistema falla HOY, necesitas poder debuggear. Los skills le dan contexto especializado al agente.
2. **Tests después**: Aseguran que cambios futuros no rompan lo que funciona.
3. **Dashboard luego**: Mejora experiencia pero no es crítico (puedes enviar mensajes manualmente).
4. **Notificaciones al final**: Nice-to-have, no afecta operación diaria.

### Cómo monitorear autopilot:
- Verás commits en GitHub cada 1-2 bloques
- Puedes abrir los archivos creados y revisarlos
- Si algo está mal, detén autopilot: "pausa por favor"
- Si todo OK: "continúa con siguiente bloque"

### Próximos pasos después de este plan:
- 🔄 **Renovación Automática**: Recordatorios D-5, D-0, D+3 para membresías expirando
- 📊 **Analytics Avanzado**: Dashboards con gráficas de conversión por fuente
- 🤖 **Multi-idioma**: Whisper para detectar idioma y responder en inglés/portugués
- 🔌 **Integraciones**: Stripe para pagos, Calendly para tours automáticos

---

**¡Listo para autopilot! 🚀**
