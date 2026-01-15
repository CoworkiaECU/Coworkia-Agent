# 📅 Sistema Universal de Calendario Multi-Agente

## ✅ Implementación Completada

### Objetivo
Permitir que TODOS los agentes (Aurora, Ángela, Axel, Enzo, Gabi, Aluna) puedan crear y gestionar eventos en Google Calendar usando una API unificada y simple.

---

## 🎯 Características Implementadas

### 1. **Integrador Universal**

Un solo punto de entrada para todos los agentes:

```javascript
import { createUniversalEvent, AgentCalendarHelpers } from './calendar-integrator.js';

// Opción 1: API genérica
await createUniversalEvent({
  userId: '+593999123456',
  userName: 'Diego Villota',
  userEmail: 'diego@example.com',
  eventType: EVENT_TYPES.MEDICAL,
  agent: 'ANGELA',
  date: '2026-01-15',
  startTime: '10:00',
  endTime: '11:00',
  metadata: { specialty: 'Cardiología' }
});

// Opción 2: Helpers especializados (más fácil)
await AgentCalendarHelpers.createMedicalAppointment(
  userId, userName, userEmail, {
    date: '2026-01-15',
    startTime: '10:00',
    endTime: '11:00',
    specialty: 'Cardiología',
    doctorName: 'Dr. Pérez'
  }
);
```

### 2. **Tipos de Eventos Soportados**

| Tipo | Agente | Color | Uso |
|------|--------|-------|-----|
| `RESERVATION` | Aurora | 🟢 Verde | Reservas de espacios Coworkia |
| `MEDICAL` | Ángela | 💗 Rosa | Citas médicas |
| `MEETING` | Enzo | 🔵 Azul | Reuniones de negocios |
| `WORKSHOP` | Aluna | 🟡 Amarillo | Talleres/eventos |
| `QUOTE_VISIT` | Axel | 🔴 Rojo | Visitas para cotización vehicular |
| `CONSULTATION` | Gabi | 🔷 Celeste | Asesorías financieras |

### 3. **Persistencia en Base de Datos**

Todos los eventos se guardan automáticamente en:
- ✅ Google Calendar (sincronizado)
- ✅ Base de datos unificada (agent_conversations)

```sql
-- Query ejemplo: eventos de un usuario
SELECT * FROM agent_conversations
WHERE user_phone = '+593999123456'
  AND metadata->>'type' = 'calendar_event'
ORDER BY created_at DESC;
```

### 4. **Helpers por Agente**

Cada agente tiene su helper optimizado:

#### **Aurora - Reservas**
```javascript
const result = await AgentCalendarHelpers.createReservation(
  userId, userName, userEmail, {
    date: '2026-01-15',
    startTime: '09:00',
    endTime: '11:00',
    duration: '2 horas',
    spaceType: 'Hot Desk',
    spaceNumber: '3',
    guestCount: 2,
    isPaid: true,
    paymentMethod: 'tarjeta',
    price: 10
  }
);

// Evento creado:
// Título: "Hot Desk 3 - Diego Villota"
// Color: Verde
// Descripción: Detalles de reserva con pago
```

#### **Ángela - Citas Médicas**
```javascript
const result = await AgentCalendarHelpers.createMedicalAppointment(
  userId, userName, userEmail, {
    date: '2026-01-20',
    startTime: '15:00',
    endTime: '16:00',
    specialty: 'Cardiología',
    doctorName: 'Dr. Ramírez',
    clinic: 'Clínica Universitaria'
  }
);

// Evento creado:
// Título: "Cardiología - Diego Villota"
// Color: Rosa
// Ubicación: Clínica Universitaria
```

#### **Axel - Cotizaciones**
```javascript
const result = await AgentCalendarHelpers.createQuoteVisit(
  userId, userName, userEmail, {
    date: '2026-01-18',
    startTime: '14:00',
    endTime: '15:00',
    vehicleInfo: 'Toyota Corolla 2018',
    damageType: 'Golpe parachoques delantero'
  }
);

// Evento creado:
// Título: "Cotización Vehicular (Toyota Corolla 2018) - Diego"
// Color: Rojo
// Ubicación: The PaintBull - Taller
```

#### **Enzo - Reuniones**
```javascript
const result = await AgentCalendarHelpers.createMarketingMeeting(
  userId, userName, userEmail, {
    date: '2026-01-22',
    startTime: '10:00',
    endTime: '11:30',
    duration: '1.5 horas',
    meetingTopic: 'Estrategia de Contenido Q1 2026',
    attendees: 'Diego, María, Carlos'
  }
);

// Evento creado:
// Título: "Estrategia de Contenido Q1 2026 - Diego"
// Color: Azul
```

#### **Gabi - Consultoría**
```javascript
const result = await AgentCalendarHelpers.createConsultation(
  userId, userName, userEmail, {
    date: '2026-01-25',
    startTime: '16:00',
    endTime: '17:00',
    consultationType: 'Auditoría Financiera',
    consultationReason: 'Revisión estados financieros 2025'
  }
);

// Evento creado:
// Título: "Auditoría Financiera - Diego Villota"
// Color: Celeste
```

---

## 📁 Archivos del Sistema

### `/src/servicios/calendar-integrator.js` (NUEVO)

**Módulo principal con:**

```javascript
// Funciones principales
createUniversalEvent(eventData)          // API genérica
getUserScheduledEvents(userId, agent)     // Consultar eventos
testCalendarIntegration()                 // Validar conexión

// Helpers especializados
AgentCalendarHelpers.createReservation(...)
AgentCalendarHelpers.createMedicalAppointment(...)
AgentCalendarHelpers.createQuoteVisit(...)
AgentCalendarHelpers.createMarketingMeeting(...)
AgentCalendarHelpers.createConsultation(...)

// Constantes
EVENT_TYPES = {
  RESERVATION, MEDICAL, MEETING, 
  WORKSHOP, QUOTE_VISIT, CONSULTATION
}
```

### `/src/servicios/google-calendar.js` (MODIFICADO)

**Cambios:**
- ✅ Soporte para `colorId` personalizado
- ✅ Soporte para `customDescription`
- ✅ Soporte para `location` personalizada
- ✅ Mantiene compatibilidad con código existente

---

## 🎯 Casos de Uso Completos

### Caso 1: Usuario Reserva con Aurora

```
[10:00] Usuario: "Quiero reservar hot desk para mañana 9am"
Aurora procesa: detecta fecha, hora, espacio

[10:01] Aurora ejecuta:
const result = await AgentCalendarHelpers.createReservation(
  userId, 'Diego', 'diego@example.com', {
    date: '2026-01-12',
    startTime: '09:00',
    endTime: '11:00',
    spaceType: 'Hot Desk',
    spaceNumber: '3',
    isPaid: false
  }
);

[10:01] Sistema:
- ✅ Evento creado en Google Calendar
- ✅ Guardado en agent_conversations
- ✅ URL generada: https://calendar.google.com/event?eid=...

[10:01] Aurora responde:
"✅ Listo Diego! Tu Hot Desk 3 está reservado para mañana 9am-11am.
📅 https://calendar.google.com/event?eid=...
Te esperamos! 🚀"
```

### Caso 2: Ángela Agenda Cita Médica

```
[14:00] Usuario con Ángela: "Necesito cita cardiología urgente"
Ángela: "¿Qué día te viene bien?"
Usuario: "Viernes 15 a las 3pm"

[14:02] Ángela ejecuta:
await AgentCalendarHelpers.createMedicalAppointment(
  userId, 'Diego', 'diego@example.com', {
    date: '2026-01-15',
    startTime: '15:00',
    endTime: '16:00',
    specialty: 'Cardiología',
    clinic: 'Hospital Metropolitano'
  }
);

[14:02] Sistema:
- ✅ Evento creado (color rosa, categoría médica)
- ✅ Ubicación: Hospital Metropolitano
- ✅ Reminder 1 hora antes

[14:02] Ángela responde:
"✅ Perfecto Diego! Cita agendada:
📅 Viernes 15 enero - 3:00pm
🏥 Hospital Metropolitano - Cardiología
📅 [Link calendario]
Te recordaré 1 hora antes 💚"
```

### Caso 3: Axel Coordina Visita a Taller

```
[11:00] Usuario con Axel: "Ok, quiero que revisen el auto"
Axel: "Perfecto. ¿Cuándo puedes venir al taller?"
Usuario: "Jueves en la tarde"

[11:02] Axel ejecuta:
await AgentCalendarHelpers.createQuoteVisit(
  userId, 'Diego', 'diego@example.com', {
    date: '2026-01-14',
    startTime: '14:00',
    endTime: '15:00',
    vehicleInfo: 'Toyota Corolla 2018',
    damageType: 'Golpe parachoques'
  }
);

[11:02] Sistema:
- ✅ Evento rojo (urgente)
- ✅ Ubicación: The PaintBull - Taller
- ✅ Duración: 1 hora

[11:02] Axel responde:
"✅ Agendado Diego! 🚗
📅 Jueves 14 - 2:00pm
📍 The PaintBull Taller
🔧 Revisión: Toyota Corolla (parachoques)

Te esperamos para inspección completa.
📅 [Link calendario]"
```

---

## 🔄 Integración con Otros Sistemas

### Con Base de Datos Unificada

```javascript
// Eventos se guardan automáticamente como mensajes especiales
{
  user_phone: '+593999123456',
  agent: 'ANGELA',
  role: 'system',
  content: 'Evento agendado: Cardiología - Diego',
  topic: 'salud_bienestar',
  metadata: {
    type: 'calendar_event',
    eventType: 'medical_appointment',
    eventId: 'abc123',
    eventUrl: 'https://...',
    date: '2026-01-15',
    startTime: '15:00',
    endTime: '16:00',
    specialty: 'Cardiología'
  }
}
```

### Con Sistema de Notificaciones

```javascript
// Futuro: enviar recordatorios automáticos
const upcomingEvents = await getUserScheduledEvents(userId);

upcomingEvents.forEach(event => {
  if (isWithin24Hours(event.date, event.startTime)) {
    sendWhatsAppReminder(userId, event);
  }
});
```

---

## 📊 Estadísticas y Monitoreo

### Logs del Sistema

```bash
[CALENDAR INTEGRATOR] 📅 Creando evento tipo: medical_appointment
[CALENDAR INTEGRATOR] ✅ Evento creado exitosamente
[CALENDAR INTEGRATOR] 💾 Evento guardado en BD
[GOOGLE CALENDAR] ✅ Evento creado en Google Calendar!
[GOOGLE CALENDAR] 🔗 URL: https://calendar.google.com/event?eid=...
```

### Queries Útiles

```sql
-- Eventos por agente (últimos 30 días)
SELECT 
  metadata->>'agent' as agente,
  metadata->>'eventType' as tipo,
  COUNT(*) as total
FROM agent_conversations
WHERE metadata->>'type' = 'calendar_event'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY agente, tipo
ORDER BY total DESC;

-- Próximos eventos de un usuario
SELECT 
  content,
  metadata->>'date' as fecha,
  metadata->>'startTime' as hora,
  metadata->>'eventUrl' as link
FROM agent_conversations
WHERE user_phone = '+593999123456'
  AND metadata->>'type' = 'calendar_event'
  AND (metadata->>'date')::date >= CURRENT_DATE
ORDER BY metadata->>'date', metadata->>'startTime';
```

---

## 🧪 Testing

### Test de Conexión

```javascript
import { testCalendarIntegration } from './src/servicios/calendar-integrator.js';

const result = await testCalendarIntegration();

console.log(result);
// {
//   success: true,
//   calendars: [
//     { summary: 'Coworkia Principal', id: 'coworkia@gmail.com' }
//   ],
//   message: 'Sistema de calendario listo para todos los agentes'
// }
```

### Test de Creación

```javascript
// Test rápido con Aurora
const testEvent = await AgentCalendarHelpers.createReservation(
  '+593999000000',
  'Test Usuario',
  'test@coworkia.com',
  {
    date: '2026-01-15',
    startTime: '10:00',
    endTime: '12:00',
    spaceType: 'Hot Desk',
    isPaid: false
  }
);

console.log(testEvent);
// {
//   success: true,
//   eventId: 'abc123xyz',
//   eventUrl: 'https://calendar.google.com/event?eid=...',
//   message: 'Evento agendado correctamente'
// }
```

---

## ⚙️ Configuración

### Variables de Entorno Requeridas

```bash
# Service Account JSON (obligatorio)
GOOGLE_SERVICE_ACCOUNT_JSON='{"type": "service_account", ...}'

# ID del calendario (opcional, default: primary)
GOOGLE_CALENDAR_ID='coworkia@gmail.com'
```

### Permisos de Service Account

El Service Account debe tener:
- ✅ Acceso al calendario de Coworkia
- ✅ Scope: `https://www.googleapis.com/auth/calendar`
- ✅ Compartido con permisos de "Gestionar eventos"

---

## 🚀 Próximos Pasos

### Mejoras Post-MVP

1. **Recordatorios Automáticos**
   - WhatsApp 24h antes del evento
   - Email de confirmación
   - SMS para urgencias

2. **Modificación de Eventos**
   - Cambiar fecha/hora
   - Cancelar eventos
   - Reprogramar con un comando

3. **Sincronización Bidireccional**
   - Detectar cambios en Google Calendar
   - Notificar a usuarios si admin modifica
   - Webhook de Google Calendar

4. **Dashboard de Eventos**
   - Vista de todos los eventos del día
   - Ocupación de espacios en tiempo real
   - Métricas por agente

---

**Implementado:** 11/01/2026  
**Status:** ✅ FUNCIONAL - LISTO PARA TODOS LOS AGENTES  
**Prioridad:** ALTA - Sistema crítico multi-agente  
**Dependencias:** Google Calendar API, Base de datos unificada
