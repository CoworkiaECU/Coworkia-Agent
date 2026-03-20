---
name: coworkia-notifications
description: Sistema de notificaciones WhatsApp al celular personal de Diego. El agente envía notificaciones cuando completa tareas, encuentra errores críticos, o necesita decisiones. Diego puede responder desde WhatsApp para aprobar/rechazar acciones. Integrado con autopilot.
---

# Coworkia Notifications - Sistema de Notificaciones

## 🎯 Propósito de Este Skill

**El agente te avisa al celular cuando termina o necesita decisión.**

Sistema de notificaciones bidireccional vía WhatsApp que permite a Diego recibir updates del agente en su celular personal y responder con comandos simples (Si/No/Review).

---

## 📱 TIPOS DE NOTIFICACIONES

### 1. ✅ Plan Completado Exitosamente

**Cuándo**: Autopilot termina todas las tareas del plan

**Mensaje**:
```
🤖 Aurora Agent: Plan Completado ✅

📋 Plan: plan-vuelo-20mar.md
⏱️ Tiempo: 2h 15min
📦 Tareas: 17/17 completadas

📝 Commits:
• v931: templates consolidados
• v932: dashboard filters
• v933: testing completo

📊 Cambios:
• 18 archivos modificados
• +342 / -587 líneas
• 0 errores

🚀 ¿Deploy a Heroku?
Responde: Si / No / Review
```

**Comandos válidos**:
- `Si` o `✓` → Deploy automático a Heroku
- `No` o `X` → Mantener en local, no deploy
- `Review` → Agente envía diff detallado de cambios

### 2. ⚠️ Error Crítico

**Cuándo**: Sistema caído, webhook no responde, DB sin conexión, 3 intentos fallidos

**Mensaje**:
```
🚨 Aurora Agent: Error Crítico

❌ Sistema caído en Heroku
🕐 Desde: hace 12 minutos
🔍 Error: DATABASE_URL unreachable

📋 Contexto:
• Última petición exitosa: 14:23
• Requests fallidos: 47
• Usuarios afectados: ~8

🔧 Acción tomada:
• Reinicio automático de dyno
• Verificación de DATABASE_URL

⏳ Estado actual:
• Intentando reconexión...
• Si falla en 5 min, necesito intervención

Monitoreo activo. Te aviso cuando resuelva.
```

### 3. ❓ Necesita Decisión

**Cuándo**: Tarea requiere cambio arquitectónico o decisión de negocio

**Mensaje**:
```
🤖 Aurora Agent: Decisión Requerida

❓ Tarea 5/12 necesita aprobación

📋 Tarea: "Migrar formularios a Redis"

🔍 Contexto:
Esto cambia la arquitectura de persistencia:
• Actual: PostgreSQL + memoria
• Propuesta: Redis para forms (mejor performance)
• Impacto: Requiere REDIS_URL en Heroku

💰 Costo adicional: $0/mes (Redis hobby-dev gratis)

✅ Pros:
• 40% más rápido
• Mejor manejo de concurrencia
• TTL automático

⚠️ Contras:
• Nueva dependencia
• Requiere migración

¿Procedo?
Responde: Si / No / Más info
```

**Comandos válidos**:
- `Si` → Continuar con el cambio
- `No` → Skip tarea y continuar con siguientes
- `Más info` → Agente envía análisis detallado

### 4. 🎯 Checkpoint Intermedio

**Cuándo**: Cada 3-4 tareas completadas (opcional, configurable)

**Mensaje**:
```
🤖 Aurora Agent: Checkpoint 2/3

✅ Bloque 1 completado (4 tareas)
⏱️ Tiempo: 45 min
📝 Commit: v931

🔄 Siguiente: Bloque 2 (Dashboard)
⏱️ ETA: 30-40 min

Todo fluye bien 🟢
```

*(Este tipo es opcional y puede desactivarse si Diego prefiere solo notificaciones críticas)*

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### Endpoint de Notificaciones

**Archivo**: `src/express-servidor/endpoints-api/internal-notifications.js`

```javascript
import { sendWassenger } from '../../servicios/wassenger-api.js';

// Número personal de Diego (NO el de Coworkia)
const DIEGO_PERSONAL = process.env.DIEGO_PERSONAL_PHONE; // +593...

/**
 * Envía notificación a celular personal de Diego
 * @param {string} type - 'success' | 'error' | 'question' | 'checkpoint'
 * @param {string} title - Título corto de la notificación
 * @param {object} data - Datos específicos del tipo
 */
export async function notifyDiego(type, title, data) {
  const message = formatNotificationMessage(type, title, data);
  
  try {
    await sendWassenger(DIEGO_PERSONAL, message);
    console.log('[NOTIFY] Notificación enviada a Diego:', type);
    
    // Opcional: Guardar en BD para historial
    await saveNotificationLog(type, title, data);
    
    return { success: true };
  } catch (error) {
    console.error('[NOTIFY] Error enviando notificación:', error);
    // Fallback: Email si WhatsApp falla
    await sendEmailFallback(type, title, data);
    return { success: false, fallback: 'email' };
  }
}

function formatNotificationMessage(type, title, data) {
  const emojis = {
    success: '✅',
    error: '🚨',
    question: '❓',
    checkpoint: '🔵'
  };
  
  let message = `${emojis[type]} Aurora Agent: ${title}\n\n`;
  
  // Formato según tipo
  switch (type) {
    case 'success':
      message += formatSuccessNotification(data);
      break;
    case 'error':
      message += formatErrorNotification(data);
      break;
    case 'question':
      message += formatQuestionNotification(data);
      break;
    case 'checkpoint':
      message += formatCheckpointNotification(data);
      break;
  }
  
  return message;
}

// ... funciones de formato específicas
```

### Listener de Comandos por WhatsApp

**Archivo**: `src/servicios/diego-command-listener.js`

```javascript
/**
 * Detecta comandos de Diego desde su celular personal
 * Integrado en el webhook principal de wassenger.js
 */
export function detectDiegoCommand(userId, mensaje) {
  // Solo escuchar si es el número personal de Diego
  if (userId !== process.env.DIEGO_PERSONAL_PHONE) {
    return null;
  }
  
  const msg = mensaje.toLowerCase().trim();
  
  // Comandos de aprobación
  if (msg === 'si' || msg === '✓' || msg === 'ok' || msg === 'dale') {
    return { command: 'APPROVE', action: 'continue' };
  }
  
  // Comandos de rechazo
  if (msg === 'no' || msg === 'x' || msg === 'stop' || msg === 'espera') {
    return { command: 'REJECT', action: 'pause' };
  }
  
  // Comando de review
  if (msg === 'review' || msg === 'revisión' || msg === 'diff') {
    return { command: 'REVIEW', action: 'send_details' };
  }
  
  // Comando de deploy
  if (msg === 'deploy' || msg === 'despliega') {
    return { command: 'DEPLOY', action: 'deploy_to_heroku' };
  }
  
  // Comando de más info
  if (msg.includes('más info') || msg.includes('detalles') || msg.includes('explica')) {
    return { command: 'MORE_INFO', action: 'send_details' };
  }
  
  return null;
}
```

### Estado de Autopilot (Persistencia)

**Archivo**: `src/database/autopilotStateRepository.js`

```javascript
/**
 * Persiste el estado del autopilot para poder responder a comandos de Diego
 */

let autopilotState = {
  active: false,
  currentPlan: null,
  currentTask: null,
  waitingForApproval: false,
  pendingQuestion: null,
  lastNotification: null
};

export function getAutopilotState() {
  return { ...autopilotState };
}

export function setAutopilotState(updates) {
  autopilotState = { ...autopilotState, ...updates };
}

export function isWaitingForApproval() {
  return autopilotState.waitingForApproval;
}

export function getPendingQuestion() {
  return autopilotState.pendingQuestion;
}

// Guarda estado en BD si el proceso reinicia
export async function persistAutopilotState() {
  // Implementar según necesidad
}
```

---

## 🔄 FLUJO DE INTERACCIÓN

### Caso 1: Deploy Aprobación

```
┌─────────────────────────────────────────────┐
│ 1. Autopilot termina plan                  │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 2. notifyDiego('success', ...)             │
│    "¿Deploy a Heroku?"                      │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 3. Diego responde "Si" desde WhatsApp      │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 4. detectDiegoCommand() detecta APPROVE    │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 5. Ejecuta: git push heroku main           │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 6. Notifica resultado:                      │
│    "✅ Deploy exitoso en v934"             │
└─────────────────────────────────────────────┘
```

### Caso 2: Decisión Arquitectónica

```
┌─────────────────────────────────────────────┐
│ 1. Autopilot detecta tarea con decisión    │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 2. Pausa autopilot                          │
│    setAutopilotState({ waitingForApproval }) │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 3. notifyDiego('question', ...)            │
│    "¿Migrar formularios a Redis?"           │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 4. Diego responde "Más info"               │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 5. Agente envía análisis detallado          │
│    (pros/cons, costo, alternativas)         │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 6. Diego responde "Si" o "No"              │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 7. Autopilot continúa o skip tarea          │
└─────────────────────────────────────────────┘
```

### Caso 3: Error Crítico Auto-Recuperable

```
┌─────────────────────────────────────────────┐
│ 1. Sistema detecta DB unreachable          │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 2. Intenta reconexión automática           │
│    (3 intentos, 10s entre cada uno)         │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 3. Si falla: notifyDiego('error', ...)     │
│    "🚨 Sistema caído"                      │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 4. Reinicia dyno de Heroku                 │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 5. Si recupera: notifyDiego('success')     │
│    "✅ Sistema restaurado"                 │
└─────────────────────────────────────────────┘
```

---

## 📊 CONFIGURACIÓN

### Variables de Entorno

**Archivo**: `.env`

```bash
# Número personal de Diego (NO el de Coworkia)
DIEGO_PERSONAL_PHONE="+593xxxxxxxxx"

# Configuración de notificaciones
NOTIFICATIONS_ENABLED=true
NOTIFICATIONS_CHECKPOINT=false  # false = solo críticas
NOTIFICATIONS_FALLBACK_EMAIL="diego@coworkia.com"
```

### Ajustes de Frecuencia

**Archivo**: `src/config/notifications.js`

```javascript
export const notificationConfig = {
  // Cuándo enviar notificaciones de checkpoint
  checkpointFrequency: 'never', // 'every' | 'blocks' | 'never'
  
  // Timeout para esperar respuesta de Diego antes de continuar
  approvalTimeout: 300000, // 5 minutos en ms
  
  // Reintentos si WhatsApp falla
  retries: 3,
  
  // Usar email como fallback
  emailFallback: true,
  
  // Formato de mensajes
  messageFormat: 'concise', // 'concise' | 'detailed'
};
```

---

## 🧪 TESTING

### Test Manual

1. **Activar notificaciones**:
```bash
# En local o Heroku
node scripts/test-notification.js
```

2. **Script de prueba**:
```javascript
// scripts/test-notification.js
import { notifyDiego } from '../src/express-servidor/endpoints-api/internal-notifications.js';

async function testNotifications() {
  console.log('🧪 Testing notificaciones...\n');
  
  // Test 1: Success
  await notifyDiego('success', 'Test Completado', {
    plan: 'test-plan.md',
    tasks: 5,
    time: '15 min',
    commits: ['v900: test']
  });
  
  console.log('✅ Test 1 enviado. Verifica tu WhatsApp.\n');
  await sleep(3000);
  
  // Test 2: Question
  await notifyDiego('question', 'Decisión Requerida', {
    task: 'Test de decisión',
    context: 'Esto es una prueba de notificación de decisión'
  });
  
  console.log('✅ Test 2 enviado. Responde "Si" o "No".\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testNotifications();
```

### Test de Comandos

```javascript
// scripts/test-diego-commands.js
import { detectDiegoCommand } from '../src/servicios/diego-command-listener.js';

const tests = [
  { input: 'si', expected: 'APPROVE' },
  { input: '✓', expected: 'APPROVE' },
  { input: 'no', expected: 'REJECT' },
  { input: 'review', expected: 'REVIEW' },
  { input: 'deploy', expected: 'DEPLOY' },
  { input: 'más info', expected: 'MORE_INFO' },
];

tests.forEach(test => {
  const result = detectDiegoCommand(process.env.DIEGO_PERSONAL_PHONE, test.input);
  const pass = result?.command === test.expected ? '✅' : '❌';
  console.log(`${pass} "${test.input}" → ${result?.command || 'null'}`);
});
```

---

## 🚀 INTEGRACIÓN CON AUTOPILOT

### En el skill `coworkia-autopilot`

**Modificaciones necesarias**:

```javascript
// Al completar plan
await notifyDiego('success', 'Plan Completado', {
  plan: planFileName,
  tasks: completedTasks,
  time: totalTime,
  commits: commitList,
  stats: {
    filesModified: 18,
    linesAdded: 342,
    linesRemoved: 587
  }
});

// Esperar respuesta para deploy
const approval = await waitForDiegoApproval('deploy', 300000); // 5 min timeout
if (approval === 'APPROVE') {
  await deployToHeroku();
}

// Al encontrar error crítico
await notifyDiego('error', 'Error Crítico', {
  error: errorMessage,
  context: taskContext,
  attempts: 3,
  action: 'Autopilot pausado'
});

// Al necesitar decisión
await notifyDiego('question', 'Decisión Requerida', {
  task: taskTitle,
  reason: 'Cambio arquitectónico',
  impact: 'Migración a Redis',
  pros: [...],
  cons: [...]
});

const response = await waitForDiegoApproval('decision', 300000);
if (response === 'APPROVE') {
  // Continuar con tarea
} else if (response === 'REJECT') {
  // Skip tarea
} else if (response === 'MORE_INFO') {
  // Enviar análisis detallado
}
```

---

## 📋 HISTORIAL DE NOTIFICACIONES

### Tabla de Base de Datos

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,  -- 'success', 'error', 'question', 'checkpoint'
  title TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered BOOLEAN DEFAULT false,
  diego_response TEXT,
  response_at TIMESTAMP
);
```

### Consultas Útiles

```sql
-- Ver últimas notificaciones
SELECT * FROM notification_logs 
ORDER BY sent_at DESC 
LIMIT 20;

-- Ver notificaciones sin respuesta
SELECT * FROM notification_logs 
WHERE type = 'question' 
  AND diego_response IS NULL
  AND sent_at > NOW() - INTERVAL '1 day';

-- Estadísticas de respuestas
SELECT 
  type,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (response_at - sent_at))/60) as avg_response_time_min
FROM notification_logs
WHERE diego_response IS NOT NULL
GROUP BY type;
```

---

## 🎓 MEJORES PRÁCTICAS

### Para el Agente

✅ **Hacer**:
- Notificar solo en momentos críticos (no spam)
- Mensajes concisos y accionables
- Incluir contexto suficiente para decidir
- Timeout razonable (5-10 min) antes de asumir "No"
- Logs de todas las notificaciones

❌ **Evitar**:
- Notificar cada tarea individual (usar checkpoints)
- Mensajes ambiguos tipo "algo pasó"
- Preguntar obviedades ("¿continúo?")
- Bloquear indefinidamente esperando respuesta
- Notificar fuera de horario laboral (configurar horarios)

### Para Diego

✅ **Hacer**:
- Responder con comandos simples (`Si`, `No`, `Review`)
- Revisar notificaciones cuando aparecen
- Configurar horarios si no quiere notificaciones nocturnas

❌ **Evitar**:
- Ignorar notificaciones de error crítico
- Responder con texto largo (comandos simples funcionan mejor)
- Desactivar notificaciones completamente (perder visibilidad)

---

## 🔮 ROADMAP

### v1.0 (Actual)
- [x] Notificaciones básicas (success, error, question)
- [x] Comandos simples (Si/No/Review)
- [x] Integración con autopilot
- [x] Fallback a email

### v2.0 (Futuro)
- [ ] Notificaciones con horario configurable (no notificar 10pm-7am)
- [ ] Respuestas por voz (transcripción con Whisper)
- [ ] Dashboard web para ver historial
- [ ] Notificaciones grupales (enviar a equipo)
- [ ] Integración con Slack/Telegram (alternativas)

### v3.0 (Visión)
- [ ] IA que predice si necesitarás aprobar algo
- [ ] Auto-aprobación de tareas de bajo riesgo
- [ ] Notificaciones proactivas ("Detecté que no has deployeado en 3 días")
- [ ] Analytics de tiempo de respuesta

---

**Última actualización**: 20 Mar 2026
**Versión**: 1.0
**Dependencias**: `coworkia-autopilot`, `wassenger-api`
