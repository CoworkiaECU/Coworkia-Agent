# 📧 Aluna Follow-ups Automatizados - Sistema Completo

**Autor**: Aurora Core + Diego  
**Fecha**: 20 Marzo 2026  
**Versión**: 1.0

---

## 📋 Índice
1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Flujo de Follow-ups](#flujo-de-follow-ups)
4. [Mensajes y Templates](#mensajes-y-templates)
5. [Cron Jobs y Horarios](#cron-jobs-y-horarios)
6. [Tracking y Métricas](#tracking-y-métricas)
7. [API Endpoints](#api-endpoints)
8. [Testing Manual](#testing-manual)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Visión General

### Problema Resuelto
**Antes**: Diego tenía que enviar manualmente follow-ups a cada lead de membresía en D+1 (24h) y D+3 (3 días), consumiendo tiempo valioso de ventas.

**Ahora**: Sistema 100% automatizado que:
- ✅ Envía follow-up D+1 a las 10:00 AM Ecuador todos los días
- ✅ Envía follow-up D+3 a las 11:00 AM Ecuador todos los días
- ✅ Rastrea respuestas de clientes automáticamente
- ✅ Genera métricas de conversión en tiempo real
- ✅ Notifica a Diego cuando un lead responde tras follow-up

### Impacto Esperado
- **50% reducción** en tiempo de seguimiento manual
- **30% aumento** en tasa de respuesta (follow-ups más consistentes)
- **Visibilidad 100%** de efectividad de cada canal (WhatsApp vs Email)

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                   ALUNA FOLLOW-UP SYSTEM                    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐       ┌──────▼──────┐    ┌──────▼──────┐
   │ Service │       │  Cron Jobs  │    │  Dashboard  │
   │  Core   │       │  Scheduler  │    │     API     │
   └────┬────┘       └──────┬──────┘    └──────┬──────┘
        │                   │                   │
   ┌────▼────────────┐ ┌────▼────────┐  ┌──────▼──────┐
   │ D+1 Messages    │ │  Daily Run  │  │    Stats    │
   │ D+3 Messages    │ │  10am / 11am│  │   Metrics   │
   │ Email Templates │ │             │  │  Tracking   │
   └────┬────────────┘ └─────────────┘  └─────────────┘
        │
   ┌────▼──────────────────────────────┐
   │   WhatsApp (Wassenger API)        │
   │   + Email (Gmail SMTP)            │
   └────┬──────────────────────────────┘
        │
   ┌────▼──────────────────────────────┐
   │   PostgreSQL Database             │
   │   (membership_leads table)        │
   └───────────────────────────────────┘
```

### Archivos del Sistema

| Archivo | Propósito | Líneas |
|---------|-----------|--------|
| `src/servicios/aluna-followup-service.js` | Core service: mensajes y lógica de envío | 747 |
| `src/servicios/aluna-followup-cron.js` | Cron jobs scheduler (D+1, D+3, stats) | 110 |
| `src/express-servidor/endpoints-api/aluna-dashboard.js` | API endpoint `/api/aluna/followup-stats` | +140 |
| `src/express-servidor/endpoints-api/wassenger.js` | Tracking automático de respuestas | +25 |
| `src/express-servidor/index.js` | Integración en startup del servidor | +8 |

**Total**: ~1030 líneas de código

---

## 🔄 Flujo de Follow-ups

### Timeline Completo

```
┌────────────────────────────────────────────────────────────┐
│  T=0: Lead muestra interés en membresía                   │
│  📌 Campo: interest_at = NOW()                            │
└────────────────────────────────────────────────────────────┘
                        │
                        │ (24 horas)
                        ▼
┌────────────────────────────────────────────────────────────┐
│  T+24h: Follow-up D+1 (Amigable)                          │
│  ⏰ Todos los días a las 10:00 AM Ecuador                 │
│  📧 WhatsApp + Email con proforma                         │
│  ✅ followup_24h_sent_at = NOW()                          │
│  ✅ automation_d1_sent = true                             │
└────────────────────────────────────────────────────────────┘
                        │
                        │ (48 horas más)
                        ▼
┌────────────────────────────────────────────────────────────┐
│  T+72h: Follow-up D+3 (FOMO / Urgencia)                   │
│  ⏰ Todos los días a las 11:00 AM Ecuador                 │
│  🔥 Mensaje FOMO: "Solo 2 espacios disponibles"          │
│  ✅ followup_3d_sent_at = NOW()                           │
│  ✅ automation_d3_sent = true                             │
└────────────────────────────────────────────────────────────┘
                        │
                        │ (Cliente responde)
                        ▼
┌────────────────────────────────────────────────────────────┐
│  Cliente responde vía WhatsApp/Email                       │
│  📊 wassenger.js detecta respuesta automáticamente        │
│  ✅ client_response_at = NOW()                            │
│  ✅ client_whatsapp_reply = true (si fue WhatsApp)        │
│  ✅ client_email_reply = true (si fue Email)              │
│  📢 Notificar a Diego si es señal de alto interés         │
└────────────────────────────────────────────────────────────┘
```

### Condiciones para Envío

**D+1 (24 horas)**:
```sql
WHERE interest_at >= NOW() - INTERVAL '25 hours'  -- Ventana de 23-25h
  AND interest_at < NOW() - INTERVAL '23 hours'   
  AND followup_24h_sent_at IS NULL                -- No enviado antes
  AND status != 'converted'                       -- No ya convertido
  AND status != 'lost'                            -- No perdido
```

**D+3 (3 días)**:
```sql
WHERE interest_at >= NOW() - INTERVAL '73 hours'  -- Ventana de 71-73h
  AND interest_at < NOW() - INTERVAL '71 hours'
  AND followup_3d_sent_at IS NULL                -- No enviado antes
  AND status != 'converted'                      
  AND status != 'lost'
```

---

## 📨 Mensajes y Templates

### D+1: Recordatorio Amigable

**WhatsApp (Texto)**:
```
¡Hola [Nombre]! 👋

Te contacto de Coworkia Cuenca para recordarte que enviamos tu proforma de oficina privada ayer.

✨ **Beneficios de tu plan [tipo]:**
- Oficina privada amoblada
- Internet de alta velocidad
- Acceso a salas de reuniones
- Área de cocina y lounge
- Recepción profesional

📄 *Revisa tu proforma con todos los detalles*

¿Tienes alguna pregunta? Estoy aquí para ayudarte 😊

📧 [email del lead]
📞 [WhatsApp del lead]

¡Esperamos verte pronto en Coworkia! 🏢
```

**Email (HTML)**:
- Header con gradiente verde Coworkia
- Logo centrado
- Lista de beneficios con íconos
- CTA: "Agendar Visita" (botón verde)
- Footer con redes sociales

### D+3: FOMO / Urgencia

**WhatsApp (FOMO)**:
```
¡Hola [Nombre]! 😊

Solo quería recordarte que tu oficina privada de [tipo] está disponible por tiempo limitado.

🔥 **¡Últimas unidades!**
- Solo quedan 2 espacios disponibles
- 20% de descuento si confirmas esta semana
- Primer mes GRATIS en plan anual

💰 Inversión mensual desde $[precio]

⏰ Esta oferta vence pronto. ¿Agendamos una visita?

¡No te pierdas esta oportunidad! 🚀
```

**Email (HTML con Urgencia)**:
- Header rojo/naranja con sensación de urgencia
- Countdown timer visual (CSS)
- Testimonios de clientes (social proof)
- CTA destacado: "¡Reservar Ahora!"
- Badge: "Solo 2 espacios disponibles"

---

## ⏰ Cron Jobs y Horarios

### Configuración Actual

#### 1. **Follow-up D+1**
- **Horario**: 10:00 AM Ecuador (15:00 UTC)
- **Frecuencia**: Diario
- **Cron**: `0 15 * * *`
- **Función**: `sendD1Followups()`
- **Output**: Logs con # enviados y # errores

#### 2. **Follow-up D+3**
- **Horario**: 11:00 AM Ecuador (16:00 UTC)
- **Frecuencia**: Diario
- **Cron**: `0 16 * * *`
- **Función**: `sendD3Followups()`
- **Output**: Logs con # enviados y # errores

#### 3. **Stats Diarios**
- **Horario**: 9:00 AM Ecuador (14:00 UTC)
- **Frecuencia**: Diario
- **Cron**: `0 14 * * *`
- **Función**: `getFollowupStats(7)`
- **Output**: Métricas de últimos 7 días

### Verificar Cron Jobs Activos

```bash
# Ver logs de Heroku para confirmar ejecución
heroku logs --tail --app coworkia-agent | grep CRON

# Verificar que cron jobs están iniciados
heroku logs --app coworkia-agent | grep "Aluna follow-ups activos"
```

**Output esperado en startup**:
```
📧 Iniciando follow-ups automatizados de Aluna...
[CRON] ✅ Cron job D+1 configurado (10:00 AM Ecuador)
[CRON] ✅ Cron job D+3 configurado (11:00 AM Ecuador)
[CRON] ✅ Cron job de stats configurado (9:00 AM Ecuador)
[CRON] 🚀 Todos los cron jobs de Aluna iniciados exitosamente
✅ Aluna follow-ups activos (D+1: 10am, D+3: 11am Ecuador)
```

---

## 📊 Tracking y Métricas

### Tracking Automático de Respuestas

**Ubicación**: `src/express-servidor/endpoints-api/wassenger.js` (líneas 2542-2560)

**Lógica**:
1. Cada mensaje entrante de WhatsApp pasa por detector
2. Si el user_id tiene follow-ups enviados (`followup_24h_sent_at` o `followup_3d_sent_at` != NULL)
3. Y **no** tiene respuesta registrada (`client_response_at` == NULL)
4. → Marcar `client_response_at = NOW()` + `client_whatsapp_reply = true`
5. → Log: `[ALUNA-TRACKING] 💬 Prospecto respondió después de follow-up`

**Código clave**:
```javascript
const prospectStatus = await databaseService.get(
  `SELECT followup_24h_sent_at, followup_3d_sent_at, client_response_at 
   FROM membership_leads WHERE user_phone = $1`,
  [userId]
);

if (prospectStatus && 
    (prospectStatus.followup_24h_sent_at || prospectStatus.followup_3d_sent_at) && 
    !prospectStatus.client_response_at) {
  await markAlunaClientResponse(userId, 'whatsapp');
}
```

### Métricas Disponibles

**Endpoint**: `GET /api/aluna/followup-stats?days=30`

**Respuesta JSON**:
```json
{
  "ok": true,
  "period": "Last 30 days",
  "summary": {
    "total_leads": 45,
    "d1_sent": 42,
    "d3_sent": 38,
    "responded": 28,
    "converted": 12,
    "total_revenue": 4850.00,
    "whatsapp_replies": 24,
    "email_replies": 4
  },
  "conversion_rates": {
    "d1_sent_rate": 93,          // % leads que recibieron D+1
    "d3_sent_rate": 84,          // % leads que recibieron D+3
    "response_rate": 62,         // % leads que respondieron
    "conversion_rate": 27,       // % leads convertidos a activos
    "whatsapp_effectiveness": 57, // % efectividad WhatsApp vs email
    "email_effectiveness": 10
  },
  "status_distribution": [
    { "status": "active", "count": 12, "revenue": 4850 },
    { "status": "negotiating", "count": 8, "revenue": 0 },
    { "status": "pending", "count": 15, "revenue": 0 },
    { "status": "lost", "count": 10, "revenue": 0 }
  ],
  "pending_followups": {
    "d1_pending": 3,  // Leads esperando D+1
    "d3_pending": 5   // Leads esperando D+3
  },
  "reply_time_distribution": [
    { "time_range": "< 24h", "count": 12 },
    { "time_range": "24-72h", "count": 10 },
    { "time_range": "3-7 days", "count": 4 },
    { "time_range": "> 7 days", "count": 2 }
  ]
}
```

---

## 🔌 API Endpoints

### 1. Estadísticas de Follow-ups

**GET** `/api/aluna/followup-stats`

**Query Parameters**:
- `days` (default: 30): Período de tiempo (7, 30, 90)

**Ejemplo**:
```bash
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/api/aluna/followup-stats?days=7
```

**Casos de Uso**:
- Dashboard de métricas en frontend
- Reportes semanales/mensuales
- Análisis de effectividad de canales

### 2. Ejecución Manual (Testing)

**POST** `/api/aluna/test-followups`

**Body**:
```json
{
  "type": "d1" | "d3" | "both"
}
```

**Ejemplo**:
```bash
curl -X POST https://coworkia-agent.herokuapp.com/api/aluna/test-followups \
  -H "Content-Type: application/json" \
  -d '{"type": "d1"}'
```

**⚠️ Usar solo para testing** - no ejecutar en producción con leads reales

---

## 🧪 Testing Manual

### Test 1: Simular Lead para D+1

```sql
-- Crear lead con interest_at hace 24h
INSERT INTO membership_leads (
  user_phone, name, email, interest_type, mensualidad, 
  interest_at, status, created_at
) VALUES (
  '+593987770788',  -- TU TELÉFONO DE PRUEBA
  'Diego Test',
  'diego@test.com',
  'EXECUTIVE',
  350.00,
  NOW() - INTERVAL '24 hours',  -- Hace exactamente 24h
  'pending',
  NOW() - INTERVAL '24 hours'
);
```

**Ejecutar inmediatamente**:
```javascript
// En node REPL o script
import { sendD1Followups } from './src/servicios/aluna-followup-service.js';
const result = await sendD1Followups();
console.log(result);
```

**Resultado esperado**:
- WhatsApp recibido en +593987770788
- Email recibido en diego@test.com
- Log: `[ALUNA-FOLLOWUP] ✅ D+1 enviado a Diego Test`
- Base de Datos: `followup_24h_sent_at` actualizado

### Test 2: Simular Respuesta de Lead

```javascript
// Enviar mensaje de WhatsApp desde tu número de prueba
// Mensaje: "Sí, me interesa agendar una visita"
```

**Verificar en DB**:
```sql
SELECT 
  name, 
  client_response_at, 
  client_whatsapp_reply 
FROM membership_leads 
WHERE user_phone = '+593987770788';
```

**Resultado esperado**:
- `client_response_at`: timestamp actual
- `client_whatsapp_reply`: true
- Log: `[ALUNA-TRACKING] 💬 Prospecto respondió después de follow-up`

### Test 3: Verificar Stats

```bash
curl http://localhost:3000/api/aluna/followup-stats?days=7
```

**Verificar**:
- `total_leads` incluye tu lead de prueba
- `d1_sent` = 1
- `responded` = 1 (si ya enviaste respuesta)

---

## 🛠️ Troubleshooting

### Problema 1: Cron jobs no se ejecutan

**Síntomas**:
- Logs de Heroku no muestran `[CRON] ⏰ Ejecutando follow-up...`
- Follow-ups no llegan a las 10am/11am

**Diagnóstico**:
```bash
heroku logs --tail --app coworkia-agent | grep "Aluna follow-ups activos"
```

**Soluciones**:
1. Verificar que servidor arrancó correctamente
2. Revisar timezone: debe ser `America/Guayaquil`
3. Verificar que `startFollowupCronJobs()` está en `index.js`

### Problema 2: Follow-ups se envían duplicados

**Síntomas**:
- Mismo lead recibe D+1 múltiples veces
- Campos `followup_24h_sent_at` no se actualizan

**Diagnóstico**:
```sql
SELECT name, followup_24h_sent_at, followup_3d_sent_at 
FROM membership_leads 
WHERE name = 'NOMBRE_LEAD';
```

**Soluciones**:
1. Verificar que UPDATE query en `sendD1Followups()` se ejecuta
2. Chequear errores en logs: `[ALUNA-FOLLOWUP] ❌`
3. Confirmar que `WHERE followup_24h_sent_at IS NULL` está en query

### Problema 3: Tracking de respuestas no funciona

**Síntomas**:
- Cliente responde pero `client_response_at` sigue NULL
- No aparece log `[ALUNA-TRACKING] 💬 Prospecto respondió`

**Diagnóstico**:
```bash
heroku logs --tail | grep "ALUNA-TRACKING"
```

**Soluciones**:
1. Verificar que `markAlunaClientResponse()` está importado en wassenger.js
2. Confirmar que lead tiene `followup_24h_sent_at` o `followup_3d_sent_at` != NULL
3. Revisar que mensaje pasa filtros básicos (no es bot, no es fromMe)

### Problema 4: Stats endpoint retorna datos incorrectos

**Síntomas**:
- `/api/aluna/followup-stats` retorna 0 o datos vacíos
- Conversion rates son 0%

**Diagnóstico**:
```sql
SELECT COUNT(*) FROM membership_leads 
WHERE created_at >= datetime('now', '-30 days');
```

**Soluciones**:
1. Verificar que tabla `membership_leads` tiene datos
2. Confirmar formato de fechas: SQLite usa `datetime()`, PostgreSQL usa `NOW()`
3. Ajustar query si usas PostgreSQL (reemplazar `datetime()` con `NOW()`)

---

## 📈 Próximos Pasos (Futuro)

### Mejoras Planificadas

1. **A/B Testing de Mensajes**
   - Probar diferentes copys en D+1 y D+3
   - Medir qué mensaje tiene mejor tasa de respuesta
   - Optimizar automáticamente basado en datos

2. **Segmentación Inteligente**
   - Follow-ups diferentes según tipo de membresía
   - Personalización basada en historial de interacciones
   - Scoring de leads (probabilidad de conversión)

3. **Multi-canal**
   - Agregar SMS para urgencia en D+3
   - Integrar llamadas automatizadas (VoIP)
   - Secuencias por LinkedIn para leads corporativos

4. **Dashboard Avanzado**
   - Gráficas de conversión en tiempo real
   - Comparación período a período
   - Alertas proactivas (ej: "Tasa de respuesta bajó 20%")

---

## ✅ Checklist de Activación

Antes de activar en producción:

- [x] Cron jobs configurados en `index.js`
- [x] Templates de mensajes revisados y aprobados
- [x] Endpoint de stats funcionando
- [x] Tracking de respuestas activo en wassenger.js
- [ ] Testing con 3 leads reales (manual)
- [ ] Verificar recepción de emails en Gmail
- [ ] Verificar WhatsApp en número real de lead
- [ ] Monitor logs durante primera semana
- [ ] Ajustar copy basado en feedback inicial

---

**Última actualización**: 20 Marzo 2026  
**Mantenedor**: Aurora Core + Diego  
**Status**: ✅ Producción lista para activar
