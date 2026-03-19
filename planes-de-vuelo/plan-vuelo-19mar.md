# ✈️ Plan de Vuelo - 19 de Marzo 2026

## 🎯 OBJETIVO PRINCIPAL
**AURORA Y ALUNA - FLUJOS DE SERVICIO 100% OPERATIVOS**
Campaña fuerte al aire - NO PUEDEN FALLAR

---

## ✅ HEREDADO DE AYER (18 Mar)

### Dashboard Aluna
- ✅ Captura automática de keywords en tiempo real
- ✅ Nuevas columnas: Automatizaciones, Último Contacto, Interacción Cliente
- ✅ Schema actualizado con tracking fields
- ✅ **COSTO**: CERO (solo frontend + 1 INSERT por lead)

### ⚠️ MEJORAS DE DASHBOARD → PAUSADAS PARA FUTURO
- 🔵 Botones de acción manual (D+1, D+3)
- 🔵 Modal de campañas
- 🔵 Templates editables
**Razón**: Campaña al aire, prioridad en estabilidad de flujos

---

## 🚨 PRIORIDAD HOY: AUDITORÍA AURORA & ALUNA

### 1. VERIFICAR FLUJOS CRÍTICOS

#### Aurora (Reservas/Coworking)
- [ ] Webhook Wassenger → detección intención
- [ ] Formulario de reserva completo
- [ ] Confirmación funcionando
- [ ] Pagos procesándose
- [ ] Emails enviándose
- [ ] Follow-ups automáticos

#### Aluna (Membresías)
- [ ] Webhook Wassenger → detección membresía
- [ ] Formulario de membresía completo
- [ ] Proforma enviándose automáticamente
- [ ] Follow-ups 24h/3d funcionando
- [ ] Emails enviándose
- [ ] Captura de keywords funcionando

### 2. PUNTOS DE FALLA COMUNES
- [ ] Rate limits de Wassenger
- [ ] Timeouts en OpenAI
- [ ] Circuit breakers activos
- [ ] Logs de errores (últimas 24h)
- [ ] Database connection pool

### 3. TESTING MANUAL
- [ ] Enviar mensaje de prueba Aurora
- [ ] Enviar mensaje de prueba Aluna
- [ ] Verificar respuestas en < 3 segundos
- [ ] Confirmar emails llegando

---

## 🎓 SKILLS PARA ESTE REPOSITORIO

### ¿Qué son SKILLS?
Archivos `.md` que le dan contexto especializado a Copilot sobre tu proyecto.

### Skills Recomendados para Coworkia Agent

#### 1. **aurora-troubleshooting.md** (URGENTE)
```yaml
---
description: Diagnóstico y solución de problemas en Aurora (reservas)
applyTo: 
  - "src/**/aurora*.js"
  - "src/servicios/reservation*.js"
  - "src/deteccion-intenciones/*"
---

# Aurora Troubleshooting

## Flujo Normal
1. Mensaje recibido → Wassenger webhook
2. Orquestador detecta intención → `reservation_interest`
3. Aurora form activa → recolecta datos
4. Confirmación → `pending_confirmations` table
5. Pago → verifica en DB
6. Envío email confirmación

## Puntos de Falla Comunes
- Form no activa: revisar `getAgentForm(userId, 'AURORA')`
- Confirmación perdida: `getPendingConfirmation(userId)`
- Email no llega: revisar `MAILER_PASS` en .env
- Webhook duplicado: `isDuplicateMessage(messageId)`

## Logs Clave
- `[AURORA-FORM]` - Formulario
- `[RESERVATION]` - Confirmaciones
- `[MAILER]` - Emails
- `[DEDUP]` - Deduplicación
```

#### 2. **aluna-troubleshooting.md** (URGENTE)
```yaml
---
description: Diagnóstico y solución de problemas en Aluna (membresías)
applyTo:
  - "src/**/aluna*.js"
  - "src/servicios/membership*.js"
  - "public/aluna-*.html"
---

# Aluna Troubleshooting

## Flujo Normal
1. Keywords detectadas → `captureAlunaLeadFromKeywords()`
2. Lead creado en `membership_leads`
3. Form de membresía activa
4. Proforma enviada automáticamente
5. Follow-ups programados (24h, 3d)

## Keywords Activas
- plan, membresía, mensual, oficina, cowork

## Verificar Captura
```sql
SELECT * FROM membership_leads 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Verificar Follow-ups
```sql
SELECT * FROM aluna_prospect_followups
WHERE followup_24h_sent_at IS NULL
  AND interest_at <= NOW() - INTERVAL '24 hours';
```
```

#### 3. **heroku-deployment.md**
```yaml
---
description: Procedimientos de deploy y troubleshooting en Heroku
applyTo:
  - "Procfile"
  - "package.json"
  - ".env*"
---

# Heroku Deployment

## Deploy Standard
```bash
git add .
git commit -m "fix: descripción"
git push heroku main
```

## Rollback Rápido
```bash
heroku releases
heroku rollback v976  # número de versión anterior
```

## Ver Logs en Tiempo Real
```bash
heroku logs --tail --app coworkia-agent
```

## Restart Rápido
```bash
heroku restart --app coworkia-agent
```

## Variables de Entorno Críticas
- `DATABASE_URL` - PostgreSQL
- `WASSENGER_TOKEN` - WhatsApp
- `OPENAI_API_KEY` - GPT
- `MAILER_PASS` - Gmail
```

#### 4. **database-queries.md**
```yaml
---
description: Queries SQL comunes para debugging y monitoreo
applyTo:
  - "src/database/**"
---

# Database Common Queries

## Reservas Pendientes (Aurora)
```sql
SELECT * FROM reservations 
WHERE status = 'pending'
  AND fecha_hora > NOW()
ORDER BY fecha_hora;
```

## Leads Calientes (Aluna)
```sql
SELECT * FROM membership_leads
WHERE status IN ('negotiating', 'tour_scheduled')
  AND last_interaction_at > NOW() - INTERVAL '7 days';
```

## Prospectos Sin Follow-up
```sql
SELECT * FROM aluna_prospect_followups
WHERE converted_at IS NULL
  AND followup_24h_sent_at IS NULL
  AND interest_at <= NOW() - INTERVAL '24 hours';
```

## Errores Recientes
```sql
SELECT * FROM error_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 50;
```
```

---

## 📋 CHECKLIST HOY

### Mañana (AM)
- [x] Verificar nada de ayer incrementa costos (✅ CERO COSTO)
- [x] Actualizar plan de vuelo para enfocar en Aurora/Aluna
- [x] Crear Skills 1-4 para troubleshooting
  - [x] **aurora-troubleshooting** - Debug flujo de reservas
  - [x] **aluna-troubleshooting** - Debug flujo de membresías
  - [x] **heroku-deployment** - Deploy, rollback, logs
  - [x] **database-queries** - Queries SQL comunes
- [ ] Verificar Heroku está up (https://coworkia-agent-e97d15dac56f.herokuapp.com/health)
- [ ] Revisar logs de errores últimas 24h
- [ ] Verificar Wassenger webhook activo

### Tarde (PM)
- [ ] Testing manual Aurora (reserva completa)
- [ ] Testing manual Aluna (membresía completa)
- [ ] Verificar emails llegando
- [ ] Monitorear métricas

---

## 🚀 PROYECTO SKILLS - AUTONOMOUS AGENT SYSTEM
**Objetivo**: Reducir carga de trabajo 50%, aumentar tiempo para ventas

### FASE 1: Sistema de Memoria de Largo Plazo (3-4h)
**Prioridad**: CRÍTICA - Base de todo el sistema

**Entregables**:
- ✅ Skill `coworkia-memory.md` con estructura completa
- ⬜ Auditoría completa del repositorio (1 vez, nunca más)
- ⬜ Documentar:
  - Setup completo del proyecto (arquitectura multi-agente)
  - Decisiones técnicas y por qué se tomaron
  - Problemas comunes y sus soluciones
  - Preferencias de Diego (commits frecuentes, no tocar orquestador sin análisis)
  - Estado actual (features en prod, pendientes)
- ⬜ Sistema de actualización automática al final de cada sesión

**Resultado**: Nunca más explicar el setup del proyecto. Agente conoce TODO al inicio de cada sesión.

---

### FASE 2: Agente Autónomo "AutoPilot" (4-5h)
**Prioridad**: ALTA - Trabajo sin supervisión constante

**Entregables**:
- ⬜ Skill `coworkia-autopilot.md`
- ⬜ Sistema de lectura y ejecución de planes de vuelo automática
- ⬜ Checkpoints cada 3-4 tareas (commits automáticos)
- ⬜ Detección de bloqueos (mismo error 3x = abortar)
- ⬜ Logs de progreso en tiempo real
- ⬜ Comando de activación: `"autopilot verde nena"`

**Decisiones autónomas permitidas**:
- ✅ Refactoring técnico
- ✅ Fixes de bugs evidentes
- ✅ Tests y validaciones
- ❌ Cambios de arquitectura (requiere aprobación)
- ❌ Decisiones de negocio (requiere aprobación)

**Resultado**: Activar agente y dejar trabajando 2-3 horas mientras Diego vende o descansa.

---

### FASE 3: Notificaciones WhatsApp Personal (2-3h)
**Prioridad**: MEDIA - Nice to have pero poderoso

**Entregables**:
- ⬜ Endpoint `/api/internal/notify-diego`
- ⬜ Integración con Wassenger (enviar a número personal de Diego)
- ⬜ Tipos de notificaciones:
  - ✅ Plan completado exitosamente
  - ⚠️ Error crítico (sistema caído)
  - ❓ Necesita decisión (espera respuesta)
- ⬜ Comandos por WhatsApp:
  - "Si" → Aprobar siguiente acción
  - "No" → Detener y esperar
  - "Review" → Enviar resumen detallado

**Resultado**: Agente notifica al celular cuando termina. Diego aprueba/rechaza desde WhatsApp sin abrir VS Code.

---

### FASE 4: Continuidad entre Planes de Vuelo (1-2h)
**Prioridad**: BAJA - Optimización

**Entregables**:
- ⬜ Archivo `planes-de-vuelo/queue.json`
- ⬜ Sistema de encadenamiento automático
- ⬜ Smart planning (dividir objetivo grande en planes pequeños)
- ⬜ Comando: `"continuar con siguiente plan"`

**Resultado**: Objetivos grandes se ejecutan automáticamente en secuencia con aprobación puntual.

---

### FASE 5: OpenClaw / Integraciones Externas (TBD)
**Prioridad**: EXPLORATORIA - Necesita definición

**Pendiente**: Diego debe explicar qué es OpenClaw y qué quiere lograr con ello.

---

**⏱️ TIEMPO TOTAL ESTIMADO (Fases 1-4)**: 10-14 horas
**📈 IMPACTO ESPERADO**: -50% tiempo en código, +100% tiempo en ventas

---

## 🎯 SIGUIENTE SPRINT (Futuro - cuando campaña estable)

### Dashboard Aluna Avanzado
- Botones de acción manual (D+1, D+3 WhatsApp/Email)
- Modal de creación de campañas
- Templates editables
- Reportes y analytics

**Estimado**: 6-8 horas desarrollo

---

## 📊 MÉTRICAS DE ÉXITO HOY

✅ **Aurora**:
- Tasa respuesta < 3 seg
- 0 webhooks perdidos
- 100% emails entregados

✅ **Aluna**:
- Keywords capturando correctamente
- Follow-ups enviándose a tiempo
- Proformas llegando

---

## 🚨 ESCALATION

Si algo falla:
1. Ver logs: `heroku logs --tail`
2. Verificar health: `/health` endpoint
3. Rollback si necesario: `heroku rollback`
4. Restart: `heroku restart`

**Contacto Soporte**:
- Wassenger: Token válido hasta 2027
- OpenAI: Límites OK
- Heroku: Dyno Professional ($50/mes)
