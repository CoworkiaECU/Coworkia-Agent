# 💼 Sistema Completo de Gabi - Gestión Financiera y Contador de Interacciones

## 📋 Resumen

Sistema integral implementado para el agente Gabi que incluye:

1. **Contador de Interacciones**: Seguimiento automático de cada interacción del usuario con Gabi
2. **Trigger Automático de Reunión**: Oferta de reunión presencial al alcanzar 5+ interacciones
3. **Dashboard de Métricas**: API REST con estadísticas completas del sistema
4. **Detección de Documentos**: Clasificación de 8 tipos de documentos financieros

## 🎯 Tareas Completadas

### Tarea 17: Sistema Completo de Finanzas
- ✅ Análisis de métricas financieras por período (hoy/semana/mes/año)
- ✅ Dashboard de consultas y usuarios únicos
- ✅ Ranking de usuarios más activos
- ✅ Detección de tipos de documentos financieros

### Tarea 18: Contador de Interacciones (5 → trigger)
- ✅ Contador automático por usuario en tabla `agent_conversations`
- ✅ Threshold de 5 interacciones para activar trigger
- ✅ Sistema de cooldown de 7 días entre ofertas
- ✅ Tracking de estado (ofrecido/no ofrecido)

### Tarea 19: Oferta de Reunión Presencial Automática
- ✅ Generación de mensaje personalizado con topics del usuario
- ✅ Envío automático vía WhatsApp al alcanzar threshold
- ✅ Registro en metadata de conversación
- ✅ Métricas de reuniones ofrecidas

## 🏗️ Arquitectura del Sistema

### Archivos Creados

1. **`src/servicios/gabi-financial-system.js`** (438 líneas)
   - Servicio principal con toda la lógica del sistema
   - 8 funciones exportadas + constantes

2. **`src/express-servidor/endpoints-api/gabi-dashboard.js`** (200 líneas)
   - 6 endpoints REST API para dashboard
   - Rutas: `/api/gabi/*`

3. **`scripts/test-gabi-system.js`** (400+ líneas)
   - Suite completa de tests (30 casos)
   - Resultado: 100% tests pasados

### Archivos Modificados

1. **`src/express-servidor/endpoints-api/wassenger.js`**
   - Líneas 2014-2044: Integración del trigger automático
   - Se ejecuta después de cada mensaje enviado por Gabi

2. **`src/express-servidor/index.js`**
   - Agregado router: `app.use('/api/gabi', gabiDashboardRouter)`

## 📊 Funciones Principales

### 1. Contador de Interacciones

```javascript
getGabiInteractionCount(userId)
```

**Descripción**: Cuenta el total de interacciones del usuario con Gabi

**Query**:
```sql
SELECT COUNT(*) 
FROM agent_conversations 
WHERE user_id = $1 AND agent = 'GABI'
```

**Return**: `{ count: number }`

---

### 2. Verificación de Threshold

```javascript
shouldOfferMeeting(userId)
```

**Descripción**: Determina si se debe ofrecer reunión basado en:
- Contador ≥ 5 interacciones
- No ofrecido en los últimos 7 días

**Return**:
```javascript
{
  shouldOffer: boolean,    // true si debe ofrecer
  count: number,           // total interacciones
  lastOffered: Date|null,  // última oferta
  reason: string          // motivo de decisión
}
```

**Razones**:
- `threshold_reached`: ≥5 interacciones, debe ofrecer
- `below_threshold`: <5 interacciones
- `recently_offered`: ofrecido hace <7 días
- `error`: error en consulta

---

### 3. Generación de Mensaje de Reunión

```javascript
generateMeetingOffer(userId, count)
```

**Descripción**: Crea mensaje personalizado con:
- Cantidad de interacciones
- Top 3 temas consultados por el usuario
- Invitación a reunión presencial

**Ejemplo de mensaje**:
```
🤝 ¡Hola! He notado que hemos tenido 6 conversaciones sobre temas financieros.

📊 Temas principales que hemos discutido:
• Facturación
• Estados financieros
• Declaraciones de impuestos

Me gustaría ofrecerte una reunión presencial gratuita de 30 minutos para poder ayudarte de manera más personalizada con tus consultas financieras.

¿Te gustaría agendar esta reunión? Puedo adaptarme a tu horario.
```

---

### 4. Registro de Oferta

```javascript
markMeetingOffered(userId, conversationId)
```

**Descripción**: Marca en metadata que la reunión fue ofrecida

**Metadata actualizada**:
```json
{
  "meeting_offered": true,
  "meeting_offered_at": "2026-01-12T10:30:00.000Z",
  "meeting_offered_count": 6
}
```

---

### 5. Métricas Financieras

```javascript
getFinancialMetrics(period)
```

**Períodos**: `'today'`, `'week'`, `'month'`, `'year'`

**Return**:
```javascript
{
  period: string,
  totalConsultas: number,
  usuariosUnicos: number,
  promedioInteraccionesPorUsuario: number,
  topicsMasConsultados: [
    { topic: string, count: number }
  ]
}
```

---

### 6. Top Usuarios

```javascript
getTopGabiUsers(limit = 10)
```

**Descripción**: Ranking de usuarios más activos con Gabi

**Return**:
```javascript
[
  {
    userId: string,
    interactionCount: number,
    lastInteraction: Date,
    topics: [string]
  }
]
```

---

### 7. Métricas de Reuniones

```javascript
getMeetingMetrics()
```

**Return**:
```javascript
{
  totalOffered: number,
  uniqueUsers: number,
  recentOffers: [
    {
      userId: string,
      offeredAt: Date,
      count: number
    }
  ]
}
```

---

### 8. Detección de Documentos

```javascript
detectFinancialDocumentType(message)
```

**Tipos detectados**:
1. `invoice` - Facturas
2. `statement` - Estados financieros/bancarios
3. `tax_return` - Declaraciones de impuestos
4. `payroll` - Nóminas
5. `contract` - Contratos
6. `report` - Reportes financieros
7. `receipt` - Recibos
8. `general` - Documentos generales

**Return**: `string` (tipo de documento)

## 🚀 API Endpoints

### Base URL
```
https://coworkia-agent-XXX.herokuapp.com/api/gabi
```

### 1. Métricas por Período
```http
GET /api/gabi/metrics/:period
```

**Parámetros**:
- `period`: `today` | `week` | `month` | `year`

**Response**:
```json
{
  "ok": true,
  "data": {
    "period": "month",
    "totalConsultas": 245,
    "usuariosUnicos": 87,
    "promedioInteraccionesPorUsuario": 2.82,
    "topicsMasConsultados": [
      { "topic": "Facturación", "count": 56 },
      { "topic": "Impuestos", "count": 42 }
    ]
  }
}
```

---

### 2. Top Usuarios
```http
GET /api/gabi/top-users/:limit?
```

**Parámetros**:
- `limit`: número (default: 10)

**Response**:
```json
{
  "ok": true,
  "data": [
    {
      "userId": "+593987654321",
      "interactionCount": 12,
      "lastInteraction": "2026-01-12T10:30:00.000Z",
      "topics": ["Facturación", "RRHH", "Contabilidad"]
    }
  ]
}
```

---

### 3. Métricas de Reuniones
```http
GET /api/gabi/meeting-metrics
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "totalOffered": 34,
    "uniqueUsers": 28,
    "recentOffers": [
      {
        "userId": "+593987654321",
        "offeredAt": "2026-01-12T10:30:00.000Z",
        "count": 6
      }
    ]
  }
}
```

---

### 4. Contador Individual
```http
GET /api/gabi/user/:userId/interactions
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "userId": "+593987654321",
    "count": 6,
    "shouldOffer": true,
    "lastOffered": null,
    "reason": "threshold_reached"
  }
}
```

---

### 5. Forzar Oferta (Testing)
```http
POST /api/gabi/user/:userId/offer-meeting
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "message": "Mensaje de reunión aquí...",
    "count": 6
  }
}
```

---

### 6. Dashboard Completo
```http
GET /api/gabi/dashboard
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "month": { /* métricas del mes */ },
    "week": { /* métricas de la semana */ },
    "topUsers": [ /* top 5 usuarios */ ],
    "meetings": { /* métricas de reuniones */ }
  }
}
```

## ⚙️ Integración en Wassenger

### Flujo Automático (wassenger.js líneas 2014-2044)

```javascript
// Después de enviar mensaje exitoso
if (resultado.agenteKey === 'GABI') {
  // 1. Import del sistema
  const { 
    shouldOfferMeeting, 
    generateMeetingOffer, 
    markMeetingOffered 
  } = await import('../../servicios/gabi-financial-system.js');
  
  // 2. Verificar si debe ofrecer reunión
  const meetingCheck = await shouldOfferMeeting(userId);
  
  // 3. Si cumple threshold (5+) y no ofrecido recientemente
  if (meetingCheck.shouldOffer) {
    // 4. Generar mensaje personalizado
    const meetingMessage = await generateMeetingOffer(
      userId, 
      meetingCheck.count
    );
    
    // 5. Enviar vía WhatsApp
    await enviarWhatsApp(userId, meetingMessage);
    
    // 6. Marcar como ofrecido
    await markMeetingOffered(userId, conversationId);
    
    console.log('[GABI-SYSTEM] ✅ Reunión ofrecida exitosamente');
  }
}
```

**Características**:
- ✅ No bloquea el flujo principal si falla
- ✅ Logging completo de cada paso
- ✅ Error handling con try/catch
- ✅ Solo se ejecuta para agente Gabi

## 🧪 Tests

### Ejecución
```bash
node scripts/test-gabi-system.js
```

### Resultados
```
30/30 tests pasados (100%)

Suite 1: Detección de documentos (8/8)
Suite 2: Constantes (8/8)
Suite 3: Exports (8/8)
Suite 4: Lógica de reunión (3/3)
Suite 5: Estructura de métricas (3/3)
```

### Cobertura
- ✅ Detección de 8 tipos de documentos financieros
- ✅ Validación de constantes exportadas
- ✅ Verificación de todas las funciones
- ✅ Lógica de threshold y cooldown
- ✅ Estructura de respuestas de métricas

## 🗄️ Base de Datos

### Tabla: `agent_conversations`

**Columnas usadas**:
```sql
- user_id          VARCHAR(255)
- agent            VARCHAR(50)
- created_at       TIMESTAMP
- metadata         TEXT (JSON)
- messages         TEXT (JSON con topics)
```

### Queries Principales

**1. Contador**:
```sql
SELECT COUNT(*) as count
FROM agent_conversations
WHERE user_id = $1 AND agent = 'GABI'
```

**2. Última oferta**:
```sql
SELECT metadata, created_at
FROM agent_conversations
WHERE user_id = $1 
  AND agent = 'GABI'
  AND metadata LIKE '%meeting_offered%'
ORDER BY created_at DESC
LIMIT 1
```

**3. Métricas del período**:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT user_id) as unicos,
  messages
FROM agent_conversations
WHERE agent = 'GABI'
  AND created_at >= $1
```

**4. Top usuarios**:
```sql
SELECT 
  user_id,
  COUNT(*) as interaction_count,
  MAX(created_at) as last_interaction,
  messages
FROM agent_conversations
WHERE agent = 'GABI'
GROUP BY user_id
ORDER BY interaction_count DESC
LIMIT $1
```

## 📈 Métricas y KPIs

### Métricas Clave
- **Total consultas**: Número de interacciones con Gabi
- **Usuarios únicos**: Cantidad de usuarios diferentes
- **Promedio por usuario**: Consultas / Usuarios
- **Topics más consultados**: Ranking de temas
- **Reuniones ofrecidas**: Total de ofertas enviadas
- **Tasa de conversión**: Usuarios con 5+ interacciones

### Períodos Disponibles
- **today**: Últimas 24 horas
- **week**: Últimos 7 días
- **month**: Últimos 30 días
- **year**: Últimos 365 días

## 🔧 Configuración

### Threshold de Reunión
```javascript
// En gabi-financial-system.js línea ~50
const MEETING_THRESHOLD = 5;  // Cambiar si necesario
```

### Cooldown de Oferta
```javascript
// En gabi-financial-system.js línea ~70
const COOLDOWN_DAYS = 7;  // Días entre ofertas
```

### Límite de Dashboard
```javascript
// En gabi-dashboard.js línea ~150
const DEFAULT_TOP_USERS = 5;  // Top N usuarios en dashboard
```

## 🚨 Manejo de Errores

### Errores Capturados
1. **DB Connection**: Si falla PostgreSQL, retorna valores por defecto
2. **Missing User**: Si userId no existe, retorna count=0
3. **Invalid Period**: Si período inválido, usa 'month'
4. **WhatsApp Send**: Error en envío no bloquea flujo principal

### Logging
```javascript
// Éxito
console.log('[GABI-SYSTEM] ✅ Reunión ofrecida exitosamente');

// Conteo
console.log('[GABI-COUNTER] 📊 Usuario tiene N interacciones');

// Error
console.log('[GABI-COUNTER] ❌ Error:', error.message);
```

## 📱 Ejemplo de Uso en Producción

### Escenario: Usuario consulta 5 veces sobre facturación

**Interacciones 1-4**:
```
Usuario: "Cómo hago una factura?"
Gabi: [Respuesta sobre facturación]
// Sistema: count=1, no trigger
```

**Interacción 5** (Trigger activado):
```
Usuario: "Necesito ayuda con IVA"
Gabi: [Respuesta sobre IVA]

// Sistema automático:
1. Detecta count=5
2. Verifica no ofrecido recientemente ✅
3. Genera mensaje personalizado
4. Envía: "🤝 ¡Hola! He notado que hemos tenido 5 conversaciones sobre temas financieros. Temas: Facturación, IVA..."
5. Marca oferta en DB
```

**Interacciones 6-11**:
```
// Sistema: oferta ya realizada hace <7 días
// No vuelve a ofrecer (cooldown activo)
```

**Interacción 12** (después de 7 días):
```
// Sistema: cooldown cumplido
// Si count ≥ 5, vuelve a ofrecer
```

## 🎯 Próximos Pasos (Opcional)

### Mejoras Potenciales
- [ ] Dashboard visual en frontend
- [ ] Sistema de agendamiento integrado
- [ ] Notificaciones por email de reuniones
- [ ] Análisis de conversión (oferta → agendamiento)
- [ ] A/B testing de mensajes de oferta
- [ ] Personalización de threshold por usuario

### Monitoreo
```bash
# Ver ofertas en producción
heroku logs --tail | grep "GABI-SYSTEM"

# Verificar contador
curl https://coworkia-agent-XXX.herokuapp.com/api/gabi/user/+593XXX/interactions

# Dashboard
curl https://coworkia-agent-XXX.herokuapp.com/api/gabi/dashboard
```

## 📝 Changelog

### v382 (2026-01-12)
- ✅ Sistema completo de Gabi implementado
- ✅ Contador de interacciones automático
- ✅ Trigger de reunión al 5+ interacciones
- ✅ Dashboard completo con 6 endpoints API
- ✅ Detección de 8 tipos de documentos financieros
- ✅ Tests 100% pasados (30/30)
- ✅ Integración en webhook de Wassenger
- ✅ Documentación completa

## 👥 Créditos

**Desarrollado por**: GitHub Copilot (Claude Sonnet 4.5)  
**Fecha**: 2026-01-12  
**Versión**: v382  
**Tareas**: 17-19/19 (100% completado)
