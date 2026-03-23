# 🔧 Plan de Vuelo — Auditoría y Fix Completo de Botones + @agent Routing
**Fecha:** 23 Mar 2025  
**Alcance:** 7 agentes — adriana, aluna, aurora, axel, enzo, gabi, paula  

---

## 📊 Resumen de Auditoría (ya ejecutada)

### Hallazgos críticos:
| Problema | Impacto | Agentes afectados |
|---------|---------|-------------------|
| ❌ Ningún mensaje WA tiene prefijo `@agente` | Bot no puede enrutar si cliente está en otro agente | TODOS (7) |
| 🐛 `sendLeadReminder` en Enzo llama endpoint equivocado | Botón de leads marketing no envía nada (404) | enzo |

### Estado de endpoints backend (todos existen):
- ✅ adriana: `send-wa`, `send-comparison`
- ✅ aluna: `prospect/:phone/sendwa`, `send-d1-whatsapp`, `send-d3-whatsapp`
- ✅ aurora: `reservations/:id/send-followup-1h`, `send-rebooking`, `send-campaign`
- ✅ axel: `quotes/:code/send-reminder`
- ✅ enzo: `projects/:code/send-reminder`, `leads/:code/send-followup`
- ✅ gabi: `leads/:code/send-wa`
- ✅ paula: `leads/:id/send-wa`

---

## ✅ BLOQUE 1 — Fix prefijo `@agente` en TODOS los mensajes WA

**Por qué es necesario:** Cuando el cliente responde por WA, el bot recibe el mensaje. Si el cliente quedó con el hilo abierto de Aurora pero Diego le manda un WA de Adriana sin `@adriana`, el bot no sabe a cuál agente enrutar la respuesta.

**Formato estándar del prefijo:**
```
@{agente}
Hola ${name} 👋
...resto del mensaje
```

### 1.1 · adriana-dashboard.js → `send-wa`
**Archivo:** `src/express-servidor/endpoints-api/adriana-dashboard.js`  
**Cambio:** Agregar `@adriana\n` al inicio del `msg`
```js
// ANTES:
const msg = `Hola ${name} 👋\n\nTe escribo de SegPopular sobre el ${tipo.toLowerCase()}...`;

// DESPUÉS:
const msg = `@adriana\nHola ${name} 👋\n\nTe escribo de SegPopular sobre el ${tipo.toLowerCase()}...`;
```

### 1.2 · gabi-dashboard.js → `send-wa`
**Archivo:** `src/express-servidor/endpoints-api/gabi-dashboard.js`  
```js
// ANTES:
const msg = `Hola ${name} 👋\n\nSoy Gabi de GR Consulting...`;

// DESPUÉS:
const msg = `@gabi\nHola ${name} 👋\n\nSoy Gabi de GR Consulting...`;
```

### 1.3 · paula-dashboard.js → `send-wa`
**Archivo:** `src/express-servidor/endpoints-api/paula-dashboard.js`  
```js
// ANTES:
const msg = `Hola ${name} 👋\n\n¿Seguimos buscando tu ${op.toLowerCase()} en *${zone}*?...`;

// DESPUÉS:
const msg = `@paula\nHola ${name} 👋\n\n¿Seguimos buscando tu ${op.toLowerCase()} en *${zone}*?...`;
```

### 1.4 · axel-dashboard.js → `send-reminder`
**Archivo:** `src/express-servidor/endpoints-api/axel-dashboard.js`  
```js
// ANTES:
const msg = `Hola ${name} 👋\n\n¿Quedó alguna duda sobre la cotización de *${vehicle}*?...`;

// DESPUÉS:
const msg = `@axel\nHola ${name} 👋\n\n¿Quedó alguna duda sobre la cotización de *${vehicle}*?...`;
```

### 1.5 · enzo-dashboard.js → `projects/send-reminder`
**Archivo:** `src/express-servidor/endpoints-api/enzo-dashboard.js` (línea ~250)  
```js
// ANTES:
const msg = `Hola ${name} 👋\n\n¿Seguimos adelante con el ${tipo.toLowerCase()}${empresa}?...`;

// DESPUÉS:
const msg = `@enzo\nHola ${name} 👋\n\n¿Seguimos adelante con el ${tipo.toLowerCase()}${empresa}?...`;
```

### 1.6 · enzo-dashboard.js → `leads/send-followup` (d1/d3/d7)
**Archivo:** `src/express-servidor/endpoints-api/enzo-dashboard.js` (línea ~295)  
```js
// ANTES:
const waMessages = {
  d1: `Hola ${name} 👋\n\nQuería hacer seguimiento...`,
  d3: `${name}, tenemos una oferta especial...`,
  d7: `${name}, ¿sabías que una empresa...`,
};

// DESPUÉS:
const waMessages = {
  d1: `@enzo\nHola ${name} 👋\n\nQuería hacer seguimiento...`,
  d3: `@enzo\n${name}, tenemos una oferta especial...`,
  d7: `@enzo\n${name}, ¿sabías que una empresa...`,
};
```

### 1.7 · aluna-dashboard.js → `sendwa` (24h y 3d)
**Archivo:** `src/express-servidor/endpoints-api/aluna-dashboard.js` (línea ~535)  
```js
// ANTES (24h):
message = `Hola ${name} 🌙\n\nQuería hacer seguimiento sobre ${plan}...`;

// DESPUÉS (24h):
message = `@aluna\nHola ${name} 🌙\n\nQuería hacer seguimiento sobre ${plan}...`;

// ANTES (3d):
message = `Hola ${name} 👋\n\n¿Cómo estás?...`;

// DESPUÉS (3d):
message = `@aluna\nHola ${name} 👋\n\n¿Cómo estás?...`;
```

### 1.11 · aluna-dashboard.js → `send-d1-whatsapp` y `send-d3-whatsapp`
**Archivo:** `src/express-servidor/endpoints-api/aluna-dashboard.js`  
Localizar los mensajes de d1 y d3 en los endpoints `/send-d1-whatsapp` y `/send-d3-whatsapp` y agregar `@aluna\n` al inicio de cada mensaje.

---

## ✅ BLOQUE 2 — Fix bug wiring Enzo `sendLeadReminder`

**Problema confirmado:** La función `sendLeadReminder` en `public/js/enzo-dashboard.js` (línea 511) llama al endpoint equivocado:
```js
// ACTUAL (INCORRECTO):
const res = await fetch(`/api/enzo/projects/${code}/send-reminder`, { method: 'POST' });
// → Busca en enzo_projects, falla con 404 para leads de marketing

// CORRECTO:
const res = await fetch(`/api/enzo/leads/${code}/send-followup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ day: determineDay(code) })
});
```

**Opciones para `day`:** El botón siempre envía el día que corresponde según `followup_d1_sent_at`. Como el frontend no tiene esa info fácilmente, la opción más simple es:
- Pasar `day: 'd1'` siempre desde el botón (el backend podría auto-detectar cuál día es el siguiente)
- O bien: en el render de la tarjeta del lead, leer qué followups ya se enviaron y pasar `data-day="d1|d3|d7"` en el botón

**Fix recomendado (simple):** Hacer que el backend auto-detecte el día:
```js
// En el endpoint /leads/:code/send-followup, si no viene `day` en body, auto-detectar:
const day = req.body.day || (!lead.followup_d1_sent_at ? 'd1' : !lead.followup_d3_sent_at ? 'd3' : 'd7');
```
Y en frontend:
```js
const res = await fetch(`/api/enzo/leads/${code}/send-followup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})  // backend auto-detecta el día
});
```

---

## ✅ BLOQUE 3 — Verificación post-fix

```bash
# Verificar que todos los agentes tienen @agente en sus mensajes
git grep -n "@adriana\|@gabi\|@paula\|@axel\|@enzo\|@aurora\|@aluna" src/

# Debe mostrar al menos 13 matches (1 por cada mensaje WA listado arriba)
```

**Checklist de botones a validar (sin deploy, revisión de código):**
- [ ] adriana → botón "📲 Recordatorio" → mensaje inicia con `@adriana`
- [ ] gabi → botón "📲 Recordatorio" → mensaje inicia con `@gabi`
- [ ] paula → botón "📲 Seguimiento" → mensaje inicia con `@paula`
- [ ] axel → botón "📲 Recordatorio" → mensaje inicia con `@axel`
- [ ] enzo (proyectos) → botón "📲 Recordatorio" → mensaje inicia con `@enzo`
- [ ] enzo (leads) → botón "📲" → llama `/leads/:code/send-followup` ← fix wiring
- [ ] enzo (leads) → mensaje d1/d3/d7 inicia con `@enzo`
- [ ] ~~aurora → se trabaja en chat separado~~
- [ ] aluna → botón "📲 Enviar WA" → mensaje inicia con `@aluna`
- [ ] aluna → botón d1 → mensaje inicia con `@aluna`
- [ ] aluna → botón d3 → mensaje inicia con `@aluna`

---

## ✅ BLOQUE 4 — Deploy

```bash
git add -A
git commit -m "fix: add @agent routing prefix to all WA messages across 7 dashboards + Enzo lead wiring"
git push heroku main
heroku logs --app coworkia-agent --num 20
```

---

## 📋 Archivos a editar (resumen)

| Archivo | Cambios |
|---------|---------|
| `src/express-servidor/endpoints-api/adriana-dashboard.js` | +`@adriana\n` en send-wa |
| `src/express-servidor/endpoints-api/gabi-dashboard.js` | +`@gabi\n` en send-wa |
| `src/express-servidor/endpoints-api/paula-dashboard.js` | +`@paula\n` en send-wa |
| `src/express-servidor/endpoints-api/axel-dashboard.js` | +`@axel\n` en send-reminder |
| `src/express-servidor/endpoints-api/enzo-dashboard.js` | +`@enzo\n` en send-reminder + leads/send-followup d1/d3/d7 + auto-detect day |
| ~~`src/express-servidor/endpoints-api/aurora-dashboard.js`~~ | se trabajar en chat Aurora |
| ~~`src/servicios/aurora-followup-service.js`~~ | se trabaja en chat Aurora |
| `src/express-servidor/endpoints-api/aluna-dashboard.js` | +`@aluna\n` en sendwa (24h y 3d) + send-d1 + send-d3 |
| `public/js/enzo-dashboard.js` | Fix `sendLeadReminder`: endpoint `/leads/:code/send-followup` |

**Total: 9 archivos, ~15 ediciones puntales de 1 línea cada una + 1 fix de wiring**

---

## 🚀 PROMPT PARA PEGAR EN ESTE CHAT (autopilot)

```
verde nena autopilot — ejecuta el plan de vuelo plan-vuelo-23mar-buttons-audit.md completo:

BLOQUE 1: Agrega prefijo @agente a TODOS los mensajes WA en los 9 archivos listados (13 ediciones).
BLOQUE 2: Corrige sendLeadReminder en enzo-dashboard.js (frontend) para apuntar a /api/enzo/leads/:code/send-followup con body JSON vacío, y en el backend enzo-dashboard.js agrega auto-detección de day si no viene en body.
BLOQUE 3: Ejecuta el git grep de verificación y confirma 13+ matches de @agente.
BLOQUE 4: Deploy completo con commit descriptivo + heroku logs.

Al terminar notifica con notifyAutopilotComplete().
```
