---
name: aluna-troubleshooting
description: Diagnóstico y solución de problemas en Aluna (membresías, closer). Usa este skill cuando necesites debuggear leads que no se capturan, proformas que no se envían, follow-ups que no funcionan, dashboard que no muestra leads, keywords que no detectan, o cualquier problema con el flujo de Aluna/membresías.
applyTo:
  - "src/**/aluna*.js"
  - "src/servicios/membership*.js"
  - "src/servicios/*followup*.js"
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
SELECT * FROM membership_leads WHERE user_phone = '573XXXXXXXXX';
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
  AND quote_sent_at IS NULL;
```

**Fix**:
```javascript
// Reenviar proforma manualmente
const { sendD1Followups, sendD3Followups } = await import('./src/servicios/aluna-followup-service.js');
// Para testing manual con lead específico
```

### 3. Follow-ups no se envían (D+1, D+3)
**Síntoma**: Pasaron 24h o 3 días pero cliente no recibe recordatorio

**Causas**:
- Cron job no está corriendo (verificar logs de startup)
- Lead ya cambió de status (solo envía si status='pending' o 'negotiating')
- Follow-up ya fue marcado como enviado

**Debug**:
```bash
# Ver si cron está corriendo
heroku logs --tail | grep -i "CRON.*Aluna\|follow"

# Ver leads que deberían recibir D+1
SELECT * FROM membership_leads
WHERE followup_24h_sent_at IS NULL
  AND interest_at <= NOW() - INTERVAL '24 hours'
  AND interest_at >= NOW() - INTERVAL '25 hours'
  AND status IN ('pending', 'negotiating');

# Ver leads que deberían recibir D+3
SELECT * FROM membership_leads
WHERE followup_3d_sent_at IS NULL
  AND interest_at <= NOW() - INTERVAL '3 days'
  AND interest_at >= NOW() - INTERVAL '73 hours'
  AND status IN ('pending', 'negotiating');
```

**Fix**:
```bash
# Ejecutar follow-ups manualmente
heroku run "node -e \"import('./src/servicios/aluna-followup-service.js').then(m => m.sendD1Followups())\"" --app coworkia-agent
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
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/api/aluna/proformas | jq

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
- Error en `detectHighIntent()` o notificación

**Keywords High Intent (categorías)**:
- **Pricing** (11): precio exacto, cuánto cuesta, valor mensual, tarifas, etc
- **Availability** (12): cuando puedo ver, horarios, puedo visitar, tour, etc
- **Commitment** (13): me interesa, quiero contratar, cómo contrato, empezar ya, etc
- **Urgency** (9): urgente, pronto, rápido, ya, hoy, esta semana, necesito, etc

**Debug**:
```sql
-- Ver detecciones recientes
SELECT * FROM membership_leads 
WHERE status = 'negotiating'
  AND updated_at > NOW() - INTERVAL '24 hours';
```

**Fix**:
- Si keyword falta: agregar a `aluna-high-intent-detector.js`
- Si no notifica: verificar `DIEGO_PERSONAL_PHONE` en Heroku config

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
  COUNT(*) FILTER (WHERE client_response_at IS NOT NULL 
                   AND client_response_at > followup_24h_sent_at) as d1_responses,
  ROUND(100.0 * 
    COUNT(*) FILTER (WHERE client_response_at > followup_24h_sent_at) / 
    NULLIF(COUNT(*) FILTER (WHERE followup_24h_sent_at IS NOT NULL), 0), 
    1) as response_rate_pct
FROM membership_leads;
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
# D+1
heroku run "node -e \"import('./src/servicios/aluna-followup-service.js').then(m => m.sendD1Followups())\"" --app coworkia-agent

# D+3
heroku run "node -e \"import('./src/servicios/aluna-followup-service.js').then(m => m.sendD3Followups())\"" --app coworkia-agent
```

### Ver métricas del dashboard
```bash
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/api/aluna/followup-stats | jq
```

### Limpiar leads de prueba
```sql
DELETE FROM membership_leads WHERE user_phone LIKE '%test%' OR name LIKE '%test%';
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
#

 1. Verificar leads nuevos
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/api/aluna/proformas | jq '.total'

# 2. Enviar follow-ups pendientes
heroku run "node scripts/send-followups-manual.js" --app coworkia-agent
```
