---
name: dont-repeat-yourself
description: Antes de escribir una sola línea de código nueva, lee este skill. Contiene el inventario completo de servicios, utilidades, patrones y funciones que YA EXISTEN en Coworkia Agent. Reutiliza, extiende, no copies ni reinventes.
applyTo: "src/**/*.js,public/**/*.js,public/**/*.html"
---

# DON'T REPEAT YOURSELF - Inventario de Código Existente

## 🎯 Principio Fundamental

**Antes de crear, busca. Antes de buscar, lee este skill.**

Si algo ya existe en el codebase, úsalo. Si necesita modificaciones menores, extiéndelo.
Solo crea algo nuevo cuando realmente no hay nada similar.

---

## 📦 SERVICIOS EXISTENTES - NO REINVENTAR

### 📧 Email

| Archivo | Qué hace | Cuándo usar |
|---------|----------|-------------|
| `src/servicios/aluna-welcome-email.js` | Email de bienvenida con proforma | Base para cualquier email de bienvenida |
| `src/servicios/aluna-proforma-email.js` | Proforma HTML completa con precios | Base para emails de cotización |
| `src/servicios/aluna-followup-service.js` | Envío D+1 y D+3 por WA + Email | Patrón para cualquier follow-up automático |
| `src/servicios/aluna-welcome-email.js` | Nodemailer configurado | NO volver a configurar nodemailer |

**Patrón de email `SIEMPRE` usar**:
```javascript
// Importar transporter ya configurado (no reinicializar)
import { sendEmail } from '../servicios/mailer-service.js';

await sendEmail({
  to: userEmail,
  subject: 'Asunto del email',
  html: buildEmailHtml(data)
});
```

---

### 💬 WhatsApp (Wassenger)

| Archivo | Qué hace | Cuándo usar |
|---------|----------|-------------|
| `src/servicios/wassenger-service.js` | Envío de mensajes WA | TODO envío de WA |
| `src/servicios/aluna-followup-service.js` | Templates WA D+1/D+3 | Base para mensajes de follow-up |
| `src/servicios/aluna-high-intent-detector.js` | Detecta palabras de alta intención | Reutilizar keywords, no crear nuevas |

**Patrón WA `SIEMPRE` usar**:
```javascript
// No usar axios directo a Wassenger - usar el servicio
import { sendWhatsApp } from '../servicios/wassenger-service.js';

await sendWhatsApp({
  phone: userPhone,
  message: `Hola ${nombre}! Tu mensaje aquí`
});
```

---

### 🗄️ Base de Datos

| Archivo | Queries disponibles | Extiende para |
|---------|---------------------|---------------|
| `src/database/alunaRepository.js` | CRUD leads, follow-ups, conversiones | Nuevos campos de Aluna |
| `src/database/auroraRepository.js` | CRUD reservas, prospectos, stats | Nuevos campos de Aurora |
| `src/database/db.js` | Pool de conexión PostgreSQL | NUNCA crear otro pool |

**Reglas de BD**:
```
✅ Siempre usar pool de db.js
✅ Agregar columnas en initDatabase() función existente
✅ Queries en Repository correspondiente, no inline en endpoints
❌ NUNCA crear otro db.js o pool
❌ NUNCA hacer queries SQL directo en endpoints o servicios
```

---

### ⏰ Cron Jobs

Todos los crons están en **`src/express-servidor/index.js`**.

**Crons existentes** (no duplicar lógica):
```javascript
// Aluna D+1 - enviado a las 10am
cron.schedule('0 10 * * *', aluna-d1-handler...)

// Aluna D+3 - enviado a las 2pm  
cron.schedule('0 14 * * *', aluna-d3-handler...)

// Auto-refresh stats - cada 30 min
cron.schedule('*/30 * * * *', stats-handler...)
```

**Para agregar nuevo cron**: Agregarlo en `index.js` junto a los existentes. Mismo patrón.

---

### 🔌 Endpoints API

Todos los endpoints están en **`src/express-servidor/endpoints-api/`**.

| Archivo | Prefijo | Agente |
|---------|---------|--------|
| `aluna.js` | `/api/aluna/` | Aluna (membresías) |
| `aurora.js` | `/api/aurora/` | Aurora (reservas) |
| `wassenger.js` | `/api/wassenger/` | Webhook WhatsApp |
| `openai.js` | `/api/openai/` | Chat IA |

**Para nuevo agente**: Crear `[agente].js` con mismo patrón y registrar en `index.js`.

---

### 🤖 Agentes IA (OpenAI)

| Archivo | Qué agente | Sistema prompt |
|---------|-----------|----------------|
| `src/agentes/aurora-agent.js` | Aurora - reservas y espacios | Coordinadora de coworking |
| `src/agentes/aluna-agent.js` | Aluna - membresías y closer | Vendedora de planes |
| `src/agentes/adriana-agent.js` | Adriana - seguros | Broker de seguros SegPopular |
| `src/agentes/enzo-agent.js` | Enzo - marketing | MarketingLab |

**Patrón de agente** (copiar de aurora-agent.js):
```javascript
export async function processWithAgent(userMessage, conversationHistory, userData) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 800
  });
  return response.choices[0].message.content;
}
```

---

### 📊 Dashboards HTML

| Archivo | Agente | Extiende para |
|---------|--------|---------------|
| `public/aluna-proformas.html` | Aluna | BASE para nuevos dashboards |
| `public/aurora-reservas.html` | Aurora | Dashboard de reservas |
| `public/js/aluna-dashboard.js` | Aluna | Patrones de carga, filtros, modals |
| `public/js/aurora-dashboard.js` | Aurora | Stats, prospects, campañas |

**Paleta de colores por agente** (NO inventar nuevos colores):
```css
/* Aurora */
--primary: #4ECDC4;
--secondary: #44A08D;

/* Aluna */
--primary: #8B5CF6;
--secondary: #6D28D9;

/* Adriana / SegPopular */
--primary: #1E3A8A;   /* Navy blue */
--secondary: #FCD34D; /* Amarillo */

/* Enzo / MarketingLab */
--primary: #F97316;   /* Naranja */
--secondary: #EA580C;

/* Global / Coworkia */
--brand: #4ECDC4;
--dark: #0f172a;
--surface: #1e293b;
```

---

### 🔍 Detección de Documentos (Vision AI)

Ya existe para **Adriana**:
- `src/servicios/insurance-document-analysis.js` - 540+ líneas
- Detecta 8 tipos de documentos
- Prompts especializados por tipo
- 87.9% precisión probada

**Para extender** (agregar nuevos tipos de doc):
```javascript
// En insurance-document-analysis.js - agregar al DOCUMENT_TYPES object
VEHICLE_REGISTRATION: {
  keywords: ['matricula', 'placa', 'chasis', 'motor'],
  prompt: 'Extrae: placa, marca, modelo, año, cilindraje, color, chasis'
},
```

---

### 🔔 Notificaciones a Diego

`src/servicios/notification-service.js` - Envío a WhatsApp personal de Diego

```javascript
import { notifyDiego } from '../servicios/notification-service.js';

await notifyDiego({
  type: 'high_intent',
  message: `🚨 Alta intención: ${clientName} preguntó por ${plan}`,
  data: { clientPhone, plan, message }
});
```

**Tipos existentes**: `high_intent`, `autopilot_done`, `autopilot_blocked`, `daily_report`, `critical_error`

---

## 🔎 CÓMO BUSCAR ANTES DE CREAR

### 1. Buscar función similar
```bash
grep -r "function send\|async send\|export.*send" src/servicios/
```

### 2. Buscar patrón en repository
```bash
grep -r "find.*Pending\|find.*By\|update.*Sent" src/database/
```

### 3. Buscar cron existente
```bash
grep -n "cron.schedule" src/express-servidor/index.js
```

### 4. Buscar endpoint existente
```bash
ls src/express-servidor/endpoints-api/
grep -r "router.get\|router.post" src/express-servidor/endpoints-api/[agente].js
```

---

## 📋 CHECKLIST ANTES DE CREAR CÓDIGO NUEVO

```
[ ] ¿Busqué en src/servicios/ si hay algo similar?
[ ] ¿Revisé src/database/ si la query ya existe?
[ ] ¿Existe el cron ya en index.js?
[ ] ¿El endpoint ya está en endpoints-api/?
[ ] ¿El agente ya existe en src/agentes/?
[ ] Si todo anterior es NO → crear con patrón de existente más cercano
```

---

## 🚨 CÓDIGO QUE NUNCA SE DEBE DUPLICAR

```javascript
// ❌ NUNCA reinicializar la BD
const pg = new Pool({ ... }); // INCORRECTO, ya existe en db.js

// ❌ NUNCA reinicializar OpenAI client
const openai = new OpenAI({ apiKey: ... }); // Ya existe en openai-service.js

// ❌ NUNCA hacer fetch() directo a Wassenger
fetch('https://api.wassenger.com/...', { headers: { token: ... } }); // Usar wassenger-service.js

// ❌ NUNCA hardcodear teléfono/email de Diego
'+593994153468' // Usar process.env.DIEGO_PHONE
'diego@coworkia.ec' // Usar process.env.DIEGO_EMAIL
```
