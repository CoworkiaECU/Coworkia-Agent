# 📱 Sistema de Notificaciones - Setup

## 🎯 ¿Qué hace esto?

El agente te envía WhatsApp a tu celular personal cuando:
- ✅ Completa un plan
- 🚨 Encuentra un error crítico
- ❓ Necesita que tomes una decisión
- 🔵 Alcanza un checkpoint (opcional)

Tú respondes con comandos simples (`Si`, `No`, `Review`) y el agente actúa.

---

## 📋 Configuración (5 minutos)

### 1. Variables de Entorno ✅ CONFIGURADO

Ya está configurado en tu `.env`:

```bash
# Tu número personal
DIEGO_PERSONAL_PHONE="+593987770788"  # ✅ Tu celular configurado

# Habilitar notificaciones
NOTIFICATIONS_ENABLED=true             # ✅ Sistema activado

# Notificaciones de checkpoint (opcional, puede generar spam)
NOTIFICATIONS_CHECKPOINT=false         # ✅ Desactivado por defecto
```

**Estado**: Listo para probar 🚀

**⚠️ IMPORTANTE**: 
- Usa tu número personal, NO el del bot de Coworkia
- Incluye código de país con `+` (ej: `+593987654321`)
- Sin espacios ni guiones

### 2. Reinicia el servidor:

```bash
# Local
npm run dev

# Heroku
heroku restart --app coworkia-agent
```

---

## 🧪 Prueba que funciona

```bash
# Prueba básica
node scripts/test-notifications.js test

# Prueba tipo success
node scripts/test-notifications.js success

# Prueba tipo error
node scripts/test-notifications.js error

# Prueba tipo question
node scripts/test-notifications.js question

# Prueba tipo checkpoint
node scripts/test-notifications.js checkpoint

# Prueba todos los tipos
node scripts/test-notifications.js all
```

Deberías recibir un WhatsApp en tu celular personal.

---

## 📝 Tipos de Notificaciones

### ✅ Success (Plan Completado)

Te llega cuando autopilot termina todas las tareas del plan.

**Ejemplo**:
```
✅ Aurora Agent: Plan Completado

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
• 12 tests pasando ✓

🚀 ¿Deploy a Heroku?
Responde: Si / No / Review
```

**Tú respondes**: `Si` → el agente deployea a Heroku automáticamente

---

### 🚨 Error (Error Crítico)

Te llega cuando hay un problema grave (sistema caído, DB sin conexión, etc).

**Ejemplo**:
```
🚨 Aurora Agent: Error Crítico

❌ Error: Database unreachable
🔍 Tipo: CONNECTION_ERROR
🕐 Desde: hace 12 minutos
🔁 Intentos: 3
👥 Usuarios afectados: ~8

📋 Contexto:
Última petición exitosa: 14:23
Requests fallidos: 47

🔧 Acción tomada:
Reinicio automático de dyno
Verificación de DATABASE_URL

⚠️ Se requiere tu intervención
```

**Tú intervienes**: Revisas Heroku logs y arreglas el problema

---

### ❓ Question (Necesita Decisión)

Te llega cuando el agente necesita aprobación para un cambio arquitectónico.

**Ejemplo**:
```
❓ Aurora Agent: Decisión Requerida

📋 Tarea: Migrar formularios a Redis
📊 Progreso: 5/12

🔍 Razón: Cambio arquitectónico
📋 Contexto:
Esto cambia la persistencia de PostgreSQL + memoria a Redis.

⚡ Impacto: Requiere REDIS_URL en Heroku

✅ Pros:
• 40% más rápido
• Mejor concurrencia
• TTL automático

⚠️ Contras:
• Nueva dependencia
• Requiere migración

¿Procedo?
Responde: Si / No / Más info
```

**Tú respondes**: 
- `Si` → continúa con el cambio
- `No` → salta esa tarea
- `Más info` → te envía análisis detallado

---

### 🔵 Checkpoint (Progreso Intermedio)

Te llega cada 3-4 tareas (solo si `NOTIFICATIONS_CHECKPOINT=true`).

**Ejemplo**:
```
🔵 Aurora Agent: Checkpoint 2/3

✅ Bloque 1 - Refactoring Templates completado
📦 Tareas: 4 completadas
⏱️ Tiempo: 45 min
📝 Commit: v931

🔄 Siguiente: Bloque 2 - Dashboard
⏱️ ETA: 30-40 min

🟢 Todo fluye bien
```

**No necesitas responder**, es solo para que sepas que está trabajando.

---

## 🔧 Comandos que Puedes Enviar

Cuando el agente espera tu respuesta, estos comandos funcionan:

| Comando | Significado | Acción |
|---------|-------------|--------|
| `Si`, `✓`, `ok`, `dale` | Aprobar | Continúa con la acción |
| `No`, `X`, `stop` | Rechazar | Detiene la acción |
| `Review`, `diff` | Ver cambios | Te envía detalle de archivos modificados |
| `Deploy` | Deployear | Deploy inmediato a Heroku |
| `Más info`, `detalles` | Más información | Te envía análisis completo |

---

## 🛠️ Troubleshooting

### No me llegan notificaciones

1. **Verifica .env**:
   ```bash
   heroku config:get DIEGO_PERSONAL_PHONE --app coworkia-agent
   heroku config:get NOTIFICATIONS_ENABLED --app coworkia-agent
   ```

2. **Verifica que NOTIFICATIONS_ENABLED=true**:
   ```bash
   heroku config:set NOTIFICATIONS_ENABLED=true --app coworkia-agent
   ```

3. **Verifica que el número esté bien escrito**:
   - Debe incluir código de país: `+593...`
   - Sin espacios ni guiones
   - Exactamente como aparece en WhatsApp

4. **Prueba manual**:
   ```bash
   node scripts/test-notifications.js test
   ```

### Me llegan demasiadas notificaciones (spam)

1. **Desactiva checkpoints**:
   ```bash
   heroku config:set NOTIFICATIONS_CHECKPOINT=false --app coworkia-agent
   ```

2. Solo recibirás: success, error, question (las críticas)

### No quiero notificaciones ahora

```bash
heroku config:set NOTIFICATIONS_ENABLED=false --app coworkia-agent
```

Para reactivar:
```bash
heroku config:set NOTIFICATIONS_ENABLED=true --app coworkia-agent
```

---

## 🔮 Próximos Pasos (Implementación Fase A - Bloques 2 y 3)

**Bloque 2** (pendiente): 
- Sistema completo de comandos desde WhatsApp
- Estado persistente de preguntas pendientes
- Timeout de aprobación (5 min)

**Bloque 3** (pendiente):
- Integración con autopilot
- Notificaciones automáticas en eventos clave
- Respuestas automáticas basadas en comandos

---

**Creado**: 20 Mar 2026
**Estado**: Bloque 1 completo (notificaciones base funcional)
**Próximo**: Bloque 2 (comandos)
