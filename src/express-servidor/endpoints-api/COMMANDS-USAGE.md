# 🎮 Sistema de Comandos WhatsApp - Bloque 2

## ✅ Implementado

El sistema ahora puede **escuchar y ejecutar comandos** desde tu celular.

---

## 🔄 Flujo Completo

### 1. Autopilot Hace Pregunta

```javascript
// En cualquier parte del código autopilot
import { notifyDiego } from '../express-servidor/endpoints-api/internal-notifications.js';

await notifyDiego('question', 'Deploy a Heroku?', {
  type: 'deploy',
  plan: 'aluna-dashboard-mejoras',
  tasksCompleted: 5,
  filesChanged: 3
});
```

### 2. Sistema Envía WhatsApp

```
📱 WhatsApp a +593987770788:

❓ DECISIÓN REQUERIDA

Deploy a Heroku?

📋 Contexto:
Plan: aluna-dashboard-mejoras
Tareas: 5 completadas
Archivos: 3 modificados

Comandos: Si | No | Review | Deploy
```

### 3. Diego Responde

```
Diego: "Review"
```

### 4. Sistema Detecta Comando

```javascript
// wassenger.js detecta el mensaje
const command = detectSystemCommand('+593987770788', 'Review');
// → { command: 'REVIEW', action: 'send_details', question: {...} }
```

### 5. Sistema Ejecuta Acción

```javascript
// autopilot-command-executor.js
await executeSystemCommand(command, userId, enviarWhatsApp);
// → Envía review detallado
```

### 6. Diego Confirma

```
Diego: "Si"
```

### 7. Sistema Ejecuta Deploy

```javascript
// Ejecuta la acción aprobada
// Notifica resultado
await notifyDiego('success', 'Deploy completado', {
  url: 'https://coworkia-agent.herokuapp.com',
  version: 'v931'
});
```

---

## 📱 Comandos Disponibles

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| **Si** / **✓** / **ok** / **dale** | Aprobar acción | "Si" |
| **No** / **x** / **stop** | Rechazar acción | "No" |
| **Review** / **revisión** / **diff** | Ver detalles | "Review" |
| **Deploy** / **despliega** | Deploy directo | "Deploy" |
| **Más info** / **detalles** | Info adicional | "Más info" |

---

## 🧠 Lógica Anti-Conflicto

El sistema distingue comandos de mensajes normales usando **contexto temporal**:

```javascript
// Mensaje entrante
const message = "Si";

// ¿Es comando del sistema?
if (
  userId === DIEGO_PERSONAL &&           // 1. Es Diego?
  isWaitingForApproval() &&              // 2. Hay pregunta pendiente?
  withinTimeout(5 * 60 * 1000)           // 3. Dentro de 5 minutos?
) {
  // → SÍ, es comando del sistema
  executeCommand();
  return; // NO va al orquestador
}

// → NO, es mensaje normal
// Continuar con orquestador → agentes
```

**Resultado**: Mismo celular para TODO sin conflictos ✅

---

## 💾 Persistencia en PostgreSQL

Las preguntas pendientes se guardan en DB para sobrevivir reinicios:

```sql
-- Tabla: autopilot_pending_questions
CREATE TABLE autopilot_pending_questions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50),
  question_type VARCHAR(100),
  question_text TEXT,
  question_data JSONB,
  asked_at TIMESTAMP,
  expires_at TIMESTAMP,  -- 5 minutos
  status VARCHAR(20),     -- pending, answered, expired
  answer TEXT,
  answered_at TIMESTAMP
);
```

**Funcionalidades**:
- ✅ Recupera preguntas al reiniciar servidor
- ✅ Expira automáticamente después de 5 minutos
- ✅ Historial completo de decisiones
- ✅ Estadísticas de tiempo de respuesta

---

## 📊 Logs y Auditoría

Todas las decisiones se registran en `autopilot_command_logs`:

```sql
SELECT 
  command,
  question_type,
  executed_at,
  result->>'action' as action
FROM autopilot_command_logs
WHERE user_id = '+593987770788'
ORDER BY executed_at DESC;
```

**Ejemplo de output**:
```
command | question_type | executed_at         | action
--------|--------------|---------------------|------------------
APPROVE | deploy       | 2026-03-20 10:45:23 | deploy_approved
REVIEW  | deploy       | 2026-03-20 10:44:12 | review_sent
REJECT  | decision     | 2026-03-20 09:30:05 | decision_rejected
```

---

## 🧪 Testing

### Simular Pregunta Pendiente

```javascript
import { setPendingQuestion } from './src/servicios/autopilot-state.js';

// Simular pregunta
await setPendingQuestion('deploy', '¿Deploy a Heroku?', {
  plan: 'test',
  files: 3
});
```

### Enviar Comando desde WhatsApp

```
1. Abrir WhatsApp
2. Enviar mensaje al bot: "Si"
3. Sistema detecta comando
4. Ejecuta acción
5. Responde con resultado
```

### Ver Logs

```bash
# Logs del webhook
heroku logs --tail --app coworkia-agent | grep AUTOPILOT

# Logs desde DB
node scripts/check-autopilot-logs.js
```

---

## 🔧 Configuración

Ya está configurado en `.env`:

```bash
DIEGO_PERSONAL_PHONE=+593987770788
NOTIFICATIONS_ENABLED=true
NOTIFICATIONS_CHECKPOINT=false
```

---

## 🚀 Próximo: Bloque 3

**Integración con Autopilot** (45min):
- Llamar notifyDiego() desde autopilot en momentos clave
- Plan completado → notificación success
- Error crítico → notificación error
- Decisión arquitectural → notificación question
- Checkpoint → notificación checkpoint (opcional)

**Estado actual**:
- ✅ Bloque 1: Sistema base de notificaciones
- ✅ Bloque 2: Listener de comandos desde WhatsApp
- ⏳ Bloque 3: Integración con autopilot (pendiente)

---

## 📁 Archivos del Bloque 2

```
✅ src/servicios/autopilot-command-executor.js     - Ejecutor de comandos
✅ src/servicios/autopilot-question-db.js          - Persistencia PostgreSQL
✅ src/servicios/autopilot-state.js                - Estado + detección (actualizado)
✅ src/express-servidor/endpoints-api/wassenger.js - Interceptor webhook (actualizado)
✅ COMMANDS-USAGE.md                                - Esta documentación
```

---

## 🎯 Resultado Final

**Antes**: Agente trabaja solo, sin feedback, sin control

**Ahora**: 
- ✅ Agente te notifica en WhatsApp cuando completa/necesita algo
- ✅ Respondes con comandos simples desde tu celular
- ✅ Sin conflictos con pruebas de agentes
- ✅ Persistencia en DB
- ✅ Historial completo de decisiones
- ✅ Timeout automático de 5 minutos

**Próximo objetivo**: 50% menos intervención, más tiempo para ventas 🚀
