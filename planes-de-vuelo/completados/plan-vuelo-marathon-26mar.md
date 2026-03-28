# 🚀 PLAN DE VUELO MARATHON — 26 Mar 2026

**Objetivo**: Completar máximo número de Magic Todos pending  
**Alcance**: 12 todos (priority: medium) agrupados en 3 fases  
**Tiempo estimado**: 10h (distribuido en bloques 45min-1.5h)  
**Modo**: Autopilot verde — precisión quirúrgica  
**Prioridad**: Quick wins → Auditorías → Features complejas

---

## 📋 INVENTARIO DE TAREAS

### TODOS PENDING (ordenados por complejidad)
```
QUICK WINS (4h):
▢ #52 — Dashboard portal cautivo con datos (1h)
▢ #51 — WiFi claves auto sincronizadas con reservas (1.5h)
▢ #54 — Dark mode email bugs visuales (1h)
▢ #55 — Sistema email reply detection (1.5h)

AUDITORÍAS (3h):
▢ #46 — Auditar duplicados código/lógica (1.5h)
▢ #40 — Auditar sistema whisper completo (1h)
▢ #41 — Auditar multilenguaje agentes (1h)

FEATURES COMPLEJAS (3h+):
▢ #53 — Membresías reservas permanentes + hotdesk refactor (2h)
▢ #44 — Workflow iPad/celular commits ordenados (1h)
▢ #45 — Plan implementación tests repo (1.5h)
▢ #42 — Tests LOPDP + estrategia clientes antiguos (2h)
▢ #43 — Sistema autoregenerativo/autotrainning (3h)
```

**Estrategia**: Ejecutar FASE 1 (quick wins) → evaluar → continuar FASE 2

---

## 🎯 FASE 1: QUICK WINS — WiFi & Email Systems (4h)

### BLOQUE C1 (1h) — Todo #52: Dashboard Portal Cautivo con Datos Reales

**Problema**: Dashboard existe pero no muestra data real del sistema WiFi  
**Magic Todo ID**: 52  
**Archivo**: `/Users/diegovillota/WiFi Coworkia/public/admin.html`

**Contexto técnico**:
- WiFi portal corre en Mac Mini (repo separado)
- Base de datos: SQLite local
- Tablas existentes: `users`, `sessions`, `auth_codes`
- No hay endpoint API expuesto para dashboard

**Implementación**:

1. **Crear endpoint API en `server.js`** (WiFi repo):
```javascript
// GET /api/stats — Dashboard KPIs
app.get('/api/stats', async (req, res) => {
  try {
    // Total usuarios registrados
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    
    // Sesiones activas (últimas 24h)
    const activeSessions = await db.get(`
      SELECT COUNT(*) as count FROM sessions 
      WHERE created_at > datetime('now', '-24 hours')
    `);
    
    // Códigos generados hoy
    const todayCodes = await db.get(`
      SELECT COUNT(*) as count FROM auth_codes 
      WHERE created_at > datetime('now', 'start of day')
    `);
    
    // Top 5 usuarios por sesiones
    const topUsers = await db.all(`
      SELECT u.phone, u.created_at, COUNT(s.id) as sessions
      FROM users u
      LEFT JOIN sessions s ON u.phone = s.phone
      GROUP BY u.phone
      ORDER BY sessions DESC
      LIMIT 5
    `);
    
    return res.json({ 
      success: true, 
      data: { totalUsers: totalUsers.count, activeSessions: activeSessions.count, todayCodes: todayCodes.count, topUsers }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
```

2. **Actualizar `admin.html` con fetch real**:
```javascript
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    
    document.getElementById('total-users').textContent = json.data.totalUsers;
    document.getElementById('active-sessions').textContent = json.data.activeSessions;
    document.getElementById('today-codes').textContent = json.data.todayCodes;
    
    // Render top users table
    renderTopUsers(json.data.topUsers);
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

setInterval(loadStats, 30000); // refresh cada 30s
loadStats();
```

3. **Testing local** (Mac Mini requerido):
```bash
cd "/Users/diegovillota/WiFi Coworkia"
node server.js
# Abrir http://localhost:3000/admin.html
```

**Criterios de aceptación**:
- ✅ Endpoint `/api/stats`返回 JSON con 4 KPIs
- ✅ Dashboard muestra números reales (no hardcodeados)
- ✅ Auto-refresh cada 30s
- ✅ Tabla top 5 usuarios renderizada

**Commit**: `feat(wifi): dashboard admin con datos reales - todo #52`  
**Update Magic Todo**: `PATCH /api/todos/52` → `{ status: 'done' }`

**NOTA IMPORTANTE**: Este bloque requiere acceso físico al Mac Mini. Si Diego no está disponible para deploy, marcar como **bloqueado** y pasar a C2.

---

### BLOQUE C2 (1.5h) — Todo #51: WiFi Claves Auto Sincronizadas con Reservas

**Problema**: Claves WiFi no sincronizadas con duración de reservas Aurora  
**Magic Todo ID**: 51  
**Objetivo**: Integrar tiempo de reserva Aurora con tiempo de validez clave WiFi

**Contexto técnico**:
- Aurora reservas: tabla `reservations` en PostgreSQL (coworkia-agent)
- WiFi portal: tabla `auth_codes` en SQLite (Mac Mini)
- Actualmente: claves fijas 8h, no vinculadas a reserva

**Arquitectura propuesta**:

```
Aurora (reserva confirmada) 
  → webhook interno → API WiFi
  → genera clave con duración = reservation.duration
```

**Implementación**:

1. **Crear endpoint en WiFi server.js**:
```javascript
// POST /api/generate-reservation-code
// Body: { phone, duration_hours, reservation_id }
app.post('/api/generate-reservation-code', async (req, res) => {
  const { phone, duration_hours, reservation_id } = req.body;
  
  if (!phone || !duration_hours) {
    return res.status(400).json({ success: false, error: 'phone y duration_hours requeridos' });
  }
  
  const code = generateCode(8); // 8 dígitos
  const expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000);
  
  await db.run(`
    INSERT INTO auth_codes (code, phone, expires_at, reservation_id, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `, [code, phone, expiresAt.toISOString(), reservation_id]);
  
  return res.json({ success: true, code, expiresAt });
});
```

2. **Modificar tabla `auth_codes` en SQLite**:
```sql
ALTER TABLE auth_codes ADD COLUMN reservation_id TEXT;
ALTER TABLE auth_codes ADD COLUMN duration_hours INTEGER DEFAULT 8;
```

3. **Integrar con Aurora en coworkia-agent**:
```javascript
// src/servicios/reservation-service.js
async function sendWiFiCode(reservation) {
  const { user_phone, duration, id } = reservation;
  
  try {
    const res = await fetch('http://192.168.1.X:3000/api/generate-reservation-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: user_phone,
        duration_hours: duration === '4h' ? 4 : 8,
        reservation_id: id
      })
    });
    
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    
    // Enviar código por WhatsApp
    await enviarWhatsApp(user_phone, `
🔑 *Tu clave WiFi Coworkia*

Código: *${data.code}*
Válido por: ${duration}
Expira: ${new Date(data.expiresAt).toLocaleString('es-EC')}

🌐 Red: Coworkia Guest
📍 Prepárala antes de llegar
    `);
    
    return data.code;
  } catch (err) {
    console.error('[WIFI-INTEGRATION] Error:', err);
    return null;
  }
}
```

4. **Llamar desde Aurora confirm flow**:
```javascript
// src/deteccion-intenciones/aurora.js
// Después de confirmar pago/reserva
if (reservation.status === 'confirmed') {
  await sendWiFiCode(reservation);
}
```

**Testing**:
```javascript
// scripts/test-wifi-integration.mjs
import fetch from 'node-fetch';

const testReservation = {
  phone: process.env.ADMIN_PHONE,
  duration_hours: 4,
  reservation_id: 'TEST-001'
};

const res = await fetch('http://192.168.1.X:3000/api/generate-reservation-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testReservation)
});

const data = await res.json();
console.log('✅ Código generado:', data);
```

**Criterios de aceptación**:
- ✅ Endpoint WiFi `/api/generate-reservation-code` funcional
- ✅ Claves expiran exactamente al final de reserva (no fixed 8h)
- ✅ Aurora envía código por WA tras confirmar reserva
- ✅ `reservation_id` vincula código con reserva específica

**Commits**:
- WiFi repo: `feat(wifi): claves sincronizadas con duración reservas - todo #51`
- Coworkia repo: `feat(aurora): integrar WiFi auto-codes con reservas - todo #51`

**Update Magic Todo**: `PATCH /api/todos/51` → `{ status: 'done' }`

**BLOCKER**: Requiere IP local Mac Mini + acceso físico. Si no disponible, documentar y pasar a C3.

---

### BLOQUE C3 (1h) — Todo #54: Dark Mode Email Bugs Visuales

**Problema**: Emails HTML se ven "horrible" en algunas plataformas con dark mode  
**Magic Todo ID**: 54  
**Requisito**: Diego debe enviar screenshot del problema

**Diagnóstico inicial**:
Ya tenemos sistema dark mode con `@media (prefers-color-scheme: dark)` en templates. Posibles causas:
1. Colores no contrastados (texto claro sobre fondo claro)
2. Imágenes/logos sin adaptación dark mode
3. Plataformas que ignoran @media y aplican inversión automática

**Plan de acción**:

1. **Solicitar a Diego**:
   - Screenshot del email problemático
   - Plataforma/app donde se ve mal (Gmail app, Outlook, Apple Mail, etc.)
   - Dispositivo (iPhone, Android, Desktop)

2. **Diagnóstico según screenshot**:
   - Si black-on-black → Agregar backgrounds explícitos
   - Si colores invertidos → Agregar `-webkit-user-select: none` para prevenir inversión
   - Si logos invisibles → Servir SVG con fallback PNG en dark mode

3. **Fix universal preventivo** (aplicar mientras esperamos screenshot):
```javascript
// src/servicios/email-ecosystem.js
function getDarkModeSafeStyles() {
  return `
    @media (prefers-color-scheme: dark) {
      /* Forzar fondo blanco en contenedor principal */
      .em-container { 
        background: #ffffff !important; 
        color: #000000 !important;
      }
      
      /* Prevenir inversión automática de imágenes */
      img { 
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
      
      /* Asegurar contraste en todos los textos */
      body, p, span, div, td {
        color: #1f2937 !important;
      }
      
      /* Links visibles en dark mode */
      a { 
        color: #2563eb !important;
        text-decoration: underline;
      }
    }
  `;
}
```

4. **Testing multi-plataforma**:
```bash
# Enviar email de prueba a Diego
node scripts/test-email-all-agents.mjs --recipient=DIEGO_PERSONAL_PHONE

# Validar en:
# - iPhone Mail app (dark mode ON)
# - Gmail app Android (dark mode ON)
# - Outlook desktop (dark theme)
# - Gmail web (dark theme)
```

**Criterios de aceptación**:
- ✅ Screenshot analizado y diagnosticado
- ✅ Fix aplicado a todos los templates (Adriana, Axel, Enzo, Aluna, Aurora, Gabi, Paula)
- ✅ Test enviado a Diego confirmando mejora
- ✅ Sin black-on-black ni elementos invisibles

**Commit**: `fix(emails): dark mode universal bugs - todo #54`  
**Update Magic Todo**: `PATCH /api/todos/54` → `{ status: 'done' }`

**DEPENDENCY**: Requiere screenshot de Diego. Si no disponible inmediatamente, aplicar fix preventivo y marcar como `in_progress`.

---

### BLOQUE C4 (1.5h) — Todo #55: Sistema Email Reply Detection

**Problema**: Usuarios responden emails HTML en vez de usar botones CTA  
**Magic Todo ID**: 55  
**Objetivo**: Detectar respuestas a emails y procesarlas como si fueran mensajes WA

**Contexto técnico**:
- Emails enviados desde: `noreply@coworkia.ec` o dominios agentes
- Respuestas van a: Reply-To header (definir en cada template)
- Necesitamos webhook para recibir emails entrantes

**Arquitectura propuesta**:

```
Cliente responde email 
  → Gmail/forwarding a webhook 
  → Parser extrae: from, subject, body
  → Detectar agente origen (subject contiene código)
  → Rutear a agente correspondiente (como si fuera WA)
```

**Implementación**:

1. **Configurar Gmail forwarding** (o servicio como SendGrid Inbound Parse):
```
Opción A (Gmail): Filtro auto-forward a endpoint
Opción B (SendGrid): Inbound Parse webhook → POST /api/email-inbound
```

2. **Crear endpoint receptor**:
```javascript
// src/express-servidor/endpoints-api/email-inbound.js
import { routeToAgent } from '../../deteccion-intenciones/router.js';

export default function setupEmailInbound(app) {
  app.post('/api/email-inbound', async (req, res) => {
    try {
      const { from, subject, text, html } = req.body; // SendGrid format
      
      // Extraer email del from
      const emailMatch = from.match(/<(.+?)>/);
      const senderEmail = emailMatch ? emailMatch[1] : from;
      
      // Detectar agente por código en subject
      // e.g., "Re: Cotización ENZO-2026-001"
      const agentMatch = subject.match(/(ENZO|ADRIANA|AXEL|GABI|PAULA|ALUNA|AURORA)-(\d{4})-(\d{3})/i);
      const agentName = agentMatch ? agentMatch[1].toLowerCase() : null;
      
      // Buscar usuario por email en BD
      const user = await databaseService.get(
        'SELECT phone_number, name FROM users WHERE email = $1',
        [senderEmail]
      );
      
      if (!user) {
        console.warn('[EMAIL-INBOUND] Usuario no encontrado:', senderEmail);
        return res.status(200).json({ ok: true, message: 'Usuario no registrado' });
      }
      
      // Limpiar texto del email (quitar quotes, signatures)
      const cleanText = cleanEmailBody(text || html);
      
      // Rutear como mensaje WhatsApp
      const response = await routeToAgent({
        phone: user.phone_number,
        message: cleanText,
        source: 'email',
        agentHint: agentName
      });
      
      // Responder por email (opcional)
      if (response && response.shouldSendEmail) {
        await sendEmailReply(senderEmail, response.message);
      }
      
      return res.status(200).json({ ok: true, processed: true });
    } catch (err) {
      console.error('[EMAIL-INBOUND] Error:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });
}

function cleanEmailBody(rawBody) {
  // Quitar líneas que empiezan con ">" (quotes)
  const lines = rawBody.split('\n').filter(line => !line.trim().startsWith('>'));
  
  // Quitar signature común (detectar "Enviado desde", "--", etc.)
  const cleanedLines = [];
  for (const line of lines) {
    if (line.includes('Enviado desde') || line.trim() === '--') break;
    cleanedLines.push(line);
  }
  
  return cleanedLines.join('\n').trim();
}
```

3. **Configurar SendGrid Inbound Parse**:
```bash
# En SendGrid dashboard:
# 1. Settings → Inbound Parse
# 2. Add Host & URL: mail.coworkia.ec → https://coworkia-agent-e97d15dac56f.herokuapp.com/api/email-inbound
# 3. Configurar MX records en dominio:
#    MX 10 mx.sendgrid.net
```

4. **Testing local con ngrok**:
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Expose to internet
ngrok http 3000

# Terminal 3: Send test email
node scripts/test-email-reply.mjs --to=reply-test@coworkia.ec --subject="Re: Cotización ENZO-2026-001" --body="Me interesa el plan de marketing"
```

**Criterios de aceptación**:
- ✅ Endpoint `/api/email-inbound` recibe y parsea emails
- ✅ Detecta agente origen por código en subject
- ✅ Limpia body eliminando quotes y signatures
- ✅ Rutea a agente correspondiente como si fuera WhatsApp
- ✅ Usuario recibe respuesta (por email o WA según prefs)

**Commits**:
1. `feat(emails): endpoint inbound parse replies - todo #55 (1/2)`
2. `feat(emails): route email replies to agents - todo #55 (2/2)`

**Deploy**: 
- Heroku: `git push heroku main` → v1162+
- SendGrid: Configurar Inbound Parse (requiere DNS update)

**Update Magic Todo**: `PATCH /api/todos/55` → `{ status: 'done' }`

**BLOCKER**: Requiere acceso a DNS de dominio `coworkia.ec` para configurar MX records. Si no disponible, documentar setup y marcar como `blocked`.

---

## 📊 CHECKLIST FASE 1

### Pre-flight
- [ ] Confirmar acceso Mac Mini disponible (C1, C2)
- [ ] Diego envió screenshot dark mode (C3)
- [ ] Confirmar acceso DNS coworkia.ec (C4)

### Execution
- [ ] C1: Dashboard WiFi con datos reales
- [ ] C2: WiFi claves sincronizadas con Aurora
- [ ] C3: Dark mode bugs fixed
- [ ] C4: Email reply detection system

### Validation
- [ ] Tests locales WiFi (Mac Mini)
- [ ] Email test todas plataformas (iPhone, Gmail, Outlook)
- [ ] Responder email de prueba → verificar routing
- [ ] Magic Todos #51, #52, #54, #55 → `done`

### Deploy
- [ ] WiFi repo: commit + restart service
- [ ] Coworkia-agent: 2-3 commits + `git push heroku main`
- [ ] SendGrid: Inbound Parse configurado
- [ ] Heroku logs sin errores

---

## 🎯 FASE 2: AUDITORÍAS CRÍTICAS (3h)

### BLOQUE A1 (1.5h) — Todo #46: Auditar Duplicados en Código/Lógica

**Problema**: Posibles duplicaciones en lógica, funciones, utilidades  
**Magic Todo ID**: 46  
**Objetivo**: Identificar y consolidar código duplicado

**Estrategia de auditoría**:

1. **Análisis automático con herramientas**:
```bash
# Instalar jscpd (JavaScript Copy-Paste Detector)
npm install -g jscpd

# Ejecutar análisis
jscpd src/ --min-lines 5 --min-tokens 50 --format "markdown" --output "./documentacion/AUDITORIA-DUPLICADOS-26MAR.md"
```

2. **Áreas sospechosas de duplicación** (manual review):
```
• Validaciones de input (teléfono, email, placa)
• Formateo de montos ($123.45)
• Parseo de fechas/timestamps
• Generación de códigos únicos
• Queries SQL repetidas
• Envío de emails/WhatsApp
• Construcción de templates HTML
```

3. **Categorizar duplicados encontrados**:
```markdown
## DUPLICADOS CRÍTICOS (refactor inmediato)
- [ ] Validación teléfono en 5 archivos (crear `validators.js`)
- [ ] formatPrice() en 3 servicios (consolidar en `utils/currency.js`)

## DUPLICADOS MEDIOS (refactor opcional)
- [ ] Queries similares en 2 endpoints (crear helper)

## FALSE POSITIVES (ignorar)
- Patterns similares pero contextos diferentes
```

4. **Implementar consolidaciones**:
```javascript
// Ejemplo: validators.js centralizado
export function validatePhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 12 || !cleaned.startsWith('593')) {
    throw new Error('Teléfono debe ser formato +593XXXXXXXXX');
  }
  return `+${cleaned}`;
}

export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    throw new Error('Email inválido');
  }
  return email.toLowerCase();
}

export function validatePlate(plate) {
  // Ecuador format: ABC-1234 o AB-1234 (motos)
  const regex = /^[A-Z]{2,3}-\d{3,4}$/i;
  if (!regex.test(plate)) {
    throw new Error('Placa formato inválido (use ABC-1234)');
  }
  return plate.toUpperCase();
}
```

5. **Refactor archivos afectados**:
```javascript
// ANTES
const phone = phoneInput.replace(/\D/g, '');
if (phone.length !== 12 || !phone.startsWith('593')) {
  return res.status(400).json({ error: 'Teléfono inválido' });
}

// DESPUÉS
import { validatePhone } from '../utils/validators.js';
try {
  const cleanPhone = validatePhone(phoneInput);
  // continuar...
} catch (err) {
  return res.status(400).json({ error: err.message });
}
```

**Entregables**:
- `documentacion/AUDITORIA-DUPLICADOS-26MAR.md` con reporte completo
- `src/utils/validators.js` con funciones consolidadas
- Lista de refactors aplicados en commit message

**Commit**: `refactor: consolidar duplicados detectados - todo #46`  
**Update Magic Todo**: `PATCH /api/todos/46` → `{ status: 'done' }`

---

### BLOQUE A2 (1h) — Todo #40: Auditar Sistema Whisper Completo

**Problema**: Revisar implementación whisper para detectar issues  
**Magic Todo ID**: 40  
**Objetivo**: Validar sistema whisper (voz → texto) en todos los agentes

**Alcance de auditoría**:

1. **Arquitectura actual**:
```
Audio WhatsApp → Wassenger webhook
  → Download audio file
  → OpenAI Whisper API (transcribe)
  → Detectar idioma
  → Rutear a agente
```

2. **Files a revisar**:
```
src/servicios/whisper-service.js         — Core transcription
src/deteccion-intenciones/router.js      — Audio routing
src/express-servidor/wassenger-webhook.js — Audio handling
```

3. **Checklist de verificación**:
```
FUNCIONALIDAD:
▢ Transcripción español funciona
▢ Transcripción inglés funciona
▢ Detección automática idioma
▢ Fallback si Whisper falla
▢ Audio muy corto (<1s) manejado
▢ Audio muy largo (>5min) manejado

PERFORMANCE:
▢ Latency promedio < 3s
▢ No acumula archivos temporales
▢ Memoria no crece con audios largos

ERRORS:
▢ Error handling completo
▢ Logs suficientes para debug
▢ Usuario recibe feedback si falla

COSTS:
▢ Cuántos requests Whisper/día
▢ Costo promedio/mes
▢ Hay audios duplicados procesándose?
```

4. **Tests automatizados**:
```javascript
// tests/whisper.test.js
describe('Whisper Service', () => {
  test('transcribe español correctamente', async () => {
    const audioPath = './tests/fixtures/audio-es.ogg';
    const result = await whisperService.transcribe(audioPath);
    expect(result.text).toContain('hola');
    expect(result.language).toBe('es');
  });
  
  test('maneja audio muy corto sin crash', async () => {
    const audioPath = './tests/fixtures/audio-short-0.5s.ogg';
    const result = await whisperService.transcribe(audioPath);
    expect(result.error).toBeNull();
  });
  
  test('fallback si Whisper API falla', async () => {
    // Mock API error
    jest.spyOn(openai, 'audio').mockRejectedValue(new Error('API down'));
    const result = await whisperService.transcribe('./test.ogg');
    expect(result.fallback).toBe(true);
    expect(result.text).toBe('Lo siento, no pude procesar el audio');
  });
});
```

5. **Optimizaciones recomendadas**:
```javascript
// Cache transcripciones para evitar re-procesar mismo audio
const transcriptionCache = new Map();

export async function transcribeWithCache(audioUrl) {
  const hash = crypto.createHash('md5').update(audioUrl).digest('hex');
  
  if (transcriptionCache.has(hash)) {
    console.log('[WHISPER] Cache hit:', hash);
    return transcriptionCache.get(hash);
  }
  
  const result = await transcribe(audioUrl);
  transcriptionCache.set(hash, result);
  return result;
}
```

**Entregables**:
- `documentacion/AUDITORIA-WHISPER-26MAR.md` con findings
- Tests automatizados en `tests/whisper.test.js`
- Optimizaciones aplicadas

**Commit**: `refactor(whisper): auditoría + optimizaciones - todo #40`  
**Update Magic Todo**: `PATCH /api/todos/40` → `{ status: 'done' }`

---

### BLOQUE A3 (1h) — Todo #41: Auditar Multilenguaje Agentes

**Problema**: Validar sistema i18n en todos los agentes  
**Magic Todo ID**: 41  
**Objetivo**: Asegurar soporte español/inglés consistente

**Alcance**:

1. **Agentes a auditar**:
```
✓ Aurora (reservas)
✓ Aluna (membresías)
✓ Adriana (seguros)
✓ Axel (cotizaciones)
✓ Enzo (marketing)
✓ Gabi (legal)
✓ Paula (inmobiliaria)
```

2. **Checklist por agente**:
```
▢ Detecta idioma usuario (español/inglés)
▢ Responde en idioma detectado
▢ Templates email bilingües
▢ Mensajes error traducidos
▢ Keywords trabajan en ambos idiomas
▢ Números/fechas formatean correctamente por locale
```

3. **Verificación en código**:
```javascript
// PATTERN CORRECTO
const t = TRANSLATIONS[userLanguage] || TRANSLATIONS.es;
await enviarWhatsApp(phone, t.welcomeMessage);

// ANTI-PATTERN (hardcoded)
await enviarWhatsApp(phone, 'Hola, bienvenido'); // ❌ Solo español
```

4. **Test casos edge**:
```javascript
// Usuario escribe en inglés pero perfil dice español
const user = { phone: '+593999999999', preferred_language: 'es' };
const message = 'Hello, I want to book a room';
// Sistema debe: detectar inglés, actualizar perfil, responder en inglés

// Usuario alterna idiomas
// Mensaje 1: "Hola" → respuesta español
// Mensaje 2: "How much?" → respuesta inglés (sin cambiar idioma guardado)
```

5. **Consolidar translations**:
```javascript
// src/utils/translations.js (centralizar)
export const TRANSLATIONS = {
  es: {
    aurora: {
      welcome: 'Hola {{name}}, bienvenido a Coworkia',
      bookingConfirmed: 'Tu reserva {{code}} está confirmada',
      // ...
    },
    adriana: { /* ... */ },
    // ...
  },
  en: {
    aurora: {
      welcome: 'Hello {{name}}, welcome to Coworkia',
      bookingConfirmed: 'Your booking {{code}} is confirmed',
      // ...
    },
    // ...
  }
};
```

**Entregables**:
- `documentacion/AUDITORIA-MULTILENGUAJE-26MAR.md`
- Tabla comparativa: agente vs cobertura i18n (%)
- Fixes para gaps encontrados

**Commit**: `refactor(i18n): auditoría multilenguaje + fixes - todo #41`  
**Update Magic Todo**: `PATCH /api/todos/41` → `{ status: 'done' }`

---

## 📊 CHECKLIST FASE 2

### Execution
- [ ] A1: Auditoría duplicados + consolidación
- [ ] A2: Auditoría whisper + optimizaciones
- [ ] A3: Auditoría multilenguaje + fixes

### Artifacts
- [ ] 3 documentos auditoría en `/documentacion`
- [ ] Tests automatizados creados
- [ ] Refactors aplicados y validados

### Validation
- [ ] `npm test` pasa (incluyendo nuevos tests)
- [ ] No hay regresiones funcionales
- [ ] Magic Todos #40, #41, #46 → `done`

---

## 🎯 FASE 3: FEATURES COMPLEJAS (3h+)

### BLOQUE F1 (2h) — Todo #53: Membresías Reservas Permanentes

**Problema**: Clientes con membership deben tener hot desk reservado todo el mes  
**Magic Todo ID**: 53  
**Caso real**: Francisco Zapata (Plan 20, pagó $100, debe $150 en canje)

**Contexto actual**:
- Total hot desks: 8
- Ocupados permanentes: Diego + Francisco = 2
- **Disponibles para reserva pública: 6** (no 8)

**Arquitectura propuesta**:

```
Cliente paga membership 
  → Trigger: createPermanentReservation()
  → Insert en tabla permanent_reservations
  → Dashboard muestra "6 hot desks available" (8 - 2 permanentes)
  → Calendario bloquea hot desk todo el mes
```

**Implementación**:

1. **Nueva tabla en postgres-adapter.js**:
```javascript
await client.query(`
  CREATE TABLE IF NOT EXISTS permanent_reservations (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(50) REFERENCES users(phone_number),
    membership_id INTEGER REFERENCES memberships(id),
    space_type VARCHAR(50) DEFAULT 'hot_desk',
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE INDEX idx_permanent_reservations_phone ON permanent_reservations(user_phone);
  CREATE INDEX idx_permanent_reservations_dates ON permanent_reservations(start_date, end_date);
`);
```

2. **Function en membership-service.js**:
```javascript
export async function createPermanentReservation(membershipId, userPhone) {
  await databaseService.initialize();
  
  const membership = await databaseService.get(
    'SELECT * FROM memberships WHERE id = $1',
    [membershipId]
  );
  
  if (!membership || membership.space_type !== 'hot_desk') {
    throw new Error('Membership no válida para reserva permanente');
  }
  
  // Calcular start_date (próximo mes) y end_date (fin de mes)
  const startDate = new Date();
  startDate.setDate(1); // Primer día del mes
  startDate.setMonth(startDate.getMonth() + 1); // Próximo mes
  
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(0); // Último día del mes
  
  const result = await databaseService.run(`
    INSERT INTO permanent_reservations 
    (user_phone, membership_id, space_type, start_date, end_date, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    userPhone,
    membershipId,
    'hot_desk',
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0],
    'active',
    `Auto-creada al confirmar pago membresía #${membershipId}`
  ]);
  
  // Crear evento calendario "todo el día" para visualización
  await createCalendarBlockEvent(userPhone, startDate, endDate);
  
  return result;
}

async function createCalendarBlockEvent(userPhone, startDate, endDate) {
  const user = await databaseService.get(
    'SELECT name FROM users WHERE phone_number = $1',
    [userPhone]
  );
  
  // Crear evento en Google Calendar (integración existente)
  await calendarService.createEvent({
    summary: `Hot Desk Reservado — ${user?.name || userPhone}`,
    description: 'Membresía activa (reserva permanente)',
    start: { date: startDate.toISOString().split('T')[0] },
    end: { date: endDate.toISOString().split('T')[0] },
    colorId: '10' // Verde oscuro para permanentes
  });
}
```

3. **Refactorizar conteo hot desks**:
```javascript
// src/servicios/space-availability.js
export async function getAvailableHotDesks(date) {
  const TOTAL_HOT_DESKS = 8;
  
  // Contar permanentes activos
  const permanents = await databaseService.get(`
    SELECT COUNT(*) as count 
    FROM permanent_reservations 
    WHERE status = 'active' 
    AND start_date <= $1 
    AND (end_date IS NULL OR end_date >= $1)
  `, [date]);
  
  // Contar reservas normales para esa fecha
  const normalReservations = await databaseService.get(`
    SELECT COUNT(*) as count 
    FROM reservations 
    WHERE DATE(reservation_date) = $1 
    AND status IN ('confirmed', 'pending_payment')
    AND space_type = 'hot_desk'
  `, [date]);
  
  const occupied = (permanents?.count || 0) + (normalReservations?.count || 0);
  const available = TOTAL_HOT_DESKS - occupied;
  
  return {
    total: TOTAL_HOT_DESKS,
    permanent: permanents?.count || 0,
    normalReservations: normalReservations?.count || 0,
    available: Math.max(0, available)
  };
}
```

4. **Actualizar dashboard Aurora**:
```javascript
// public/aurora-dashboard.html

// En la sección de estadísticas
async function loadSpaceStats() {
  const res = await fetch('/api/aurora/space-availability');
  const data = await res.json();
  
  document.getElementById('total-hotdesks').textContent = data.total;
  document.getElementById('permanent-reservations').textContent = data.permanent;
  document.getElementById('available-hotdesks').textContent = data.available;
  
  // Mostrar warning si disponibilidad < 2
  if (data.available < 2) {
    showAlert('⚠️ Solo quedan ' + data.available + ' hot desks disponibles');
  }
}
```

5. **Trigger automático desde Aluna**:
```javascript
// src/deteccion-intenciones/aluna.js

// Cuando se confirma pago de membership
if (payment.status === 'confirmed' && membership.space_type === 'hot_desk') {
  try {
    await createPermanentReservation(membership.id, user.phone_number);
    
    await enviarWhatsApp(user.phone_number, `
✅ *Membresía activada*

Tu hot desk está reservado permanentemente:
📅 Desde: ${formatDate(startDate)}
📅 Hasta: ${formatDate(endDate)}

🪑 Tu espacio está garantizado todos los días del mes.

¡Bienvenido al equipo Coworkia! 🚀
    `);
  } catch (err) {
    console.error('[ALUNA] Error creando reserva permanente:', err);
    // Notificar a admin
    await notifyAdmin('Error reserva permanente membership #' + membership.id);
  }
}
```

**Testing**:
```javascript
// tests/memberships-permanent-reservation.test.js
test('crear reserva permanente al pagar membership', async () => {
  const membership = await createMembership({ 
    phone: '+593999999999', 
    plan: 'plan_20' 
  });
  
  await confirmPayment(membership.id, 100);
  
  const reservation = await databaseService.get(
    'SELECT * FROM permanent_reservations WHERE membership_id = $1',
    [membership.id]
  );
  
  expect(reservation).toBeDefined();
  expect(reservation.status).toBe('active');
  expect(reservation.space_type).toBe('hot_desk');
});

test('disponibilidad desciende con reservas permanentes', async () => {
  const before = await getAvailableHotDesks(new Date());
  expect(before.available).toBe(6); // 8 - 2 permanentes existentes
  
  // Nueva membership
  await createPermanentReservation(10, '+593911111111');
  
  const after = await getAvailableHotDesks(new Date());
  expect(after.available).toBe(5); // Bajó 1
  expect(after.permanent).toBe(3); // Subió 1
});
```

**Criterios de aceptación**:
- ✅ Tabla `permanent_reservations` creada y migrada
- ✅ Membresías hot desk crean reserva permanente automáticamente
- ✅ Dashboard muestra count correcto (6 disponibles, no 8)
- ✅ Calendario Google Calendar muestra eventos mes completo
- ✅ Tests automatizados verifican lógica

**Commits**:
1. `feat(db): tabla permanent_reservations - todo #53 (1/3)`
2. `feat(memberships): auto-create permanent reservations - todo #53 (2/3)`
3. `refactor(aurora): ajustar conteo hot desks a 6 disponibles - todo #53 (3/3)`

**Update Magic Todo**: `PATCH /api/todos/53` → `{ status: 'done' }`

---

### BLOQUE F2 (1h) — Todo #44: Workflow iPad/Celular Commits Ordenados

**Problema**: Diego quiere trabajar desde iPad/celular sin romper producción  
**Magic Todo ID**: 44  
**Objetivo**: Documentar estrategia segura para commits móviles

**Riesgos actuales**:
- Editar directo en GitHub web → sin tests, sin review
- Commits desordenados → merge conflicts
- Sin rollback rápido si algo falla
- No hay ambiente staging para validar

**Estrategia propuesta**:

#### OPCIÓN 1: Working Copy (iOS) + Branch Strategy
```
1. Instalar Working Copy app (iOS)
2. Clonar repo coworkia-agent
3. SIEMPRE trabajar en branch feature/mobile-YYYYMMDD
4. Never commit directo a main desde móvil
5. Testing en staging antes de merge
```

**Workflow seguro**:
```bash
# En iPad/iPhone con Working Copy
git checkout -b feature/mobile-fix-email-26mar
# Editar archivos
git add src/servicios/email.js
git commit -m "fix(email): corregir formato dark mode"
git push origin feature/mobile-fix-email-26mar

# En VS Code (laptop)
git fetch
git checkout feature/mobile-fix-email-26mar
npm test  # Validar
git checkout main
git merge feature/mobile-fix-email-26mar
git push heroku main
```

#### OPCIÓN 2: GitHub Codespaces (Cloud IDE)
```
Ventajas:
✓ Entorno completo VS Code en navegador
✓ Puede correr npm test
✓ Terminal con acceso a heroku CLI
✓ No necesita clonar local

Setup:
1. Ir a github.com/diegovillota/coworkia-agent
2. Click "Code" → "Codespaces" → "New codespace"
3. Esperar 2min inicialización
4. Trabajar como en VS Code normal
5. Commit & push desde Codespaces
```

#### OPCIÓN 3: Hotfix Protocol (Emergencias)
```markdown
SOLO para bugs críticos en producción:

1. Crear issue en GitHub desde móvil con label "hotfix"
2. Editar archivo en GitHub web
3. Commit message DEBE incluir: "[HOTFIX] descripción"
4. Crear PR inmediatamente (no merge directo)
5. Notificar en WA: "Hotfix pendiente review"
6. En laptop: review PR, correr tests, merge si OK
7. Deploy: git push heroku main
8. Eliminar branch hotfix
```

**Checklist pre-commit móvil**:
```
[ ] Es un fix pequeño y aislado? (< 20 líneas)
[ ] No toca lógica crítica (pagos, BD, auth)?
[ ] Puedo revertir fácil si falla?
[ ] Es urgente o puede esperar a laptop?
[ ] Creé branch dedicado (no commit a main)?
```

**Anti-patterns (NUNCA hacer)**:
```
❌ Editar main branch directo en GitHub web
❌ Commits sin mensaje descriptivo
❌ Cambios en postgres-adapter.js desde móvil
❌ Modificar .env o config sensible
❌ Deploy a heroku sin tests
```

**Tools recomendadas**:
```
iOS:
- Working Copy (Git client)
- Textastic (code editor con syntax highlight)
- iSH (Linux shell en iOS para emergencias)

Android:
- Termux (terminal + git + node)
- Acode (code editor)
```

**Emergency Rollback Procedure**:
```bash
# Si commit móvil rompió producción

# Desde cualquier dispositivo con acceso a Heroku
heroku rollback --app coworkia-agent

# Revertir commit en GitHub
git revert HEAD
git push origin main

# Notificar en WA sistema restaurado
```

**Entregables**:
- `documentacion/WORKFLOW-MOVIL-COMMITS.md` con guía completa
- Configuración Working Copy con repo
- Checklist imprimible para Diego

**Commit**: `docs: workflow seguro commits desde móvil - todo #44`  
**Update Magic Todo**: `PATCH /api/todos/44` → `{ status: 'done' }`

---

### BLOQUE F3 (1.5h) — Todo #45: Plan Implementación Tests Repo

**Problema**: Tests insuficientes, cobertura baja  
**Magic Todo ID**: 45  
**Objetivo**: Documentar estrategia completa testing

**Estado actual tests**:
```bash
npm test
# 45/48 suites passing (93.75%)
# Cobertura estimada: ~40%
```

**Estrategia por capas**:

#### 1. UNIT TESTS (Funciones aisladas)
```javascript
// tests/unit/validators.test.js
describe('Validators', () => {
  test('validatePhone acepta formato Ecuador', () => {
    expect(validatePhone('+593999999999')).toBe('+593999999999');
  });
  
  test('validatePhone rechaza formato inválido', () => {
    expect(() => validatePhone('123')).toThrow('Teléfono debe ser formato');
  });
});

// tests/unit/currency.test.js
describe('Currency Utils', () => {
  test('formatPrice formatea correctamente', () => {
    expect(formatPrice(1234.56)).toBe('$1,234.56');
  });
  
  test('parseAmount acepta coma y punto decimal', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
  });
});
```

**Target**: 100% cobertura en `src/utils/`

#### 2. INTEGRATION TESTS (Servicios + DB)
```javascript
// tests/integration/aurora-booking.test.js
describe('Aurora Booking Flow', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });
  
  test('crear reserva completo flujo', async () => {
    const user = await createTestUser();
    const reservation = await createReservation({
      user_phone: user.phone_number,
      space_type: 'hot_desk',
      duration: '4h'
    });
    
    expect(reservation.status).toBe('pending_payment');
    expect(reservation.amount).toBe(6);
  });
  
  test('confirmar pago actualiza status', async () => {
    const res = await createReservation({ /* ... */ });
    await confirmPayment(res.id, 6);
    
    const updated = await getReservation(res.id);
    expect(updated.status).toBe('confirmed');
    expect(updated.payment_confirmed_at).toBeDefined();
  });
});
```

**Target**: 80% cobertura en servicios críticos (reservas, membresías, seguros)

#### 3. E2E TESTS (Flujos completos usuario)
```javascript
// tests/e2e/whatsapp-booking.test.js
describe('WhatsApp Booking E2E', () => {
  test('usuario reserva hot desk y paga', async () => {
    // Simular mensaje WhatsApp
    const response1 = await sendWhatsAppMessage(TEST_PHONE, 'quiero reservar hot desk');
    expect(response1).toContain('¿Cuántas horas?');
    
    const response2 = await sendWhatsAppMessage(TEST_PHONE, '4 horas');
    expect(response2).toContain('$6.00');
    expect(response2).toContain('transferencia');
    
    // Simular pago
    await simulatePayment(TEST_PHONE, 6);
    
    const response3 = await waitForMessage(TEST_PHONE);
    expect(response3).toContain('confirmada');
    expect(response3).toContain('código');
  });
});
```

**Target**: Flujos críticos cubiertos (reserva, membership, cotización seguro)

#### 4. PERFORMANCE TESTS
```javascript
// tests/performance/api-load.test.js
describe('API Performance', () => {
  test('endpoint /api/reservations responde < 200ms', async () => {
    const start = Date.now();
    await fetch('http://localhost:3000/api/reservations');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(200);
  });
  
  test('maneja 50 requests concurrentes sin crash', async () => {
    const promises = Array(50).fill().map(() => 
      fetch('http://localhost:3000/api/health')
    );
    
    const results = await Promise.all(promises);
    expect(results.every(r => r.ok)).toBe(true);
  });
});
```

#### 5. CONTRACT TESTS (APIs externas)
```javascript
// tests/contract/wassenger.test.js
describe('Wassenger API Contract', () => {
  test('estructura response sendMessage', async () => {
    const response = await wassenger.sendMessage(TEST_PHONE, 'test');
    
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('messageId');
    expect(typeof response.messageId).toBe('string');
  });
});
```

**Plan de implementación (priorizado)**:

```markdown
## SEMANA 1 (5h)
- [ ] Unit tests: validators, currency, dates (2h)
- [ ] Integration: aurora reservations (2h)
- [ ] E2E: whatsapp booking completo (1h)

## SEMANA 2 (5h)
- [ ] Integration: aluna memberships (2h)
- [ ] Integration: adriana insurance quotes (2h)
- [ ] E2E: membership payment flow (1h)

## SEMANA 3 (4h)
- [ ] Unit tests: email builders (1.5h)
- [ ] Contract tests: Wassenger, OpenAI (1.5h)
- [ ] Performance tests: API endpoints (1h)

## SEMANA 4 (3h)
- [ ] Missing tests en coverage report (2h)
- [ ] Refactor tests duplicados (1h)

TOTAL: 17h distribuidas en 4 semanas
```

**CI/CD Integration**:
```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

**Entregables**:
- `documentacion/PLAN-TESTS-IMPLEMENTACION.md`
- `tests/README.md` con guía para escribir tests
- `.github/workflows/tests.yml` para CI
- Coverage badge en README principal

**Commit**: `docs: plan implementación tests completo - todo #45`  
**Update Magic Todo**: `PATCH /api/todos/45` → `{ status: 'done' }`

---

## 📊 RESUMEN EJECUTIVO

### DISTRIBUCIÓN DEL PLAN

**FASE 1 — Quick Wins (4h)**:
- C1: Dashboard WiFi datos reales (1h)
- C2: WiFi claves sincronizadas (1.5h)
- C3: Fix dark mode emails (1h)
- C4: Email reply detection (1.5h)

**FASE 2 — Auditorías (3h)**:
- A1: Auditar duplicados (1.5h)
- A2: Auditar whisper (1h)
- A3: Auditar multilenguaje (1h)

**FASE 3 — Features Complejas (3.5h)**:
- F1: Membresías reservas permanentes (2h)
- F2: Workflow commits móvil (1h)
- F3: Plan tests repo (1.5h)

**TOTAL FASE 1-3**: 10.5h

**TAREAS PENDIENTES (futuro)**:
- Todo #42: Tests LOPDP + estrategia clientes antiguos (2h)
- Todo #43: Sistema autoregenerativo (3h)

---

## 🎯 RECOMENDACIÓN DE EJECUCIÓN

### OPCIÓN A — Sprint Completo (10.5h)
Ejecutar FASE 1 → FASE 2 → FASE 3 en modo autopilot distribuido en 2 días:
- **Día 1**: FASE 1 (4h) + parte FASE 2 (2h) = 6h
- **Día 2**: FASE 2 resto (1h) + FASE 3 (3.5h) = 4.5h

### OPCIÓN B — Quick Wins Only (4h) ⭐ RECOMENDADA
Ejecutar solo FASE 1 (todos los bloques C1-C4) en una sesión:
- Impacto inmediato en UX usuario
- WiFi integration funcional
- Email system robusto

### OPCIÓN C — Por Demanda
Diego elige bloques específicos según prioridad negocio:
```bash
# Ejemplo: Solo WiFi + Membresías
autopilot --blocks=C1,C2,F1
```

---

## 🚀 COMANDOS DE ACTIVACIÓN

```bash
# Activar plan completo
"autopilot verde nena con plan marathon completo"

# Activar solo FASE 1
"autopilot verde fase 1 del plan marathon"

# Activar bloque específico
"autopilot verde bloque C1 del plan marathon"
```

---

## 📋 CHECKLIST PRE-FLIGHT

Antes de iniciar autopilot, confirmar:
- [ ] Acceso a Mac Mini disponible (C1, C2)
- [ ] Screenshot dark mode de Diego (C3)
- [ ] Acceso DNS coworkia.ec (C4)
- [ ] Magic Todos API accesible
- [ ] Tests suite corriendo sin errores críticos
- [ ] Heroku CLI autenticado
- [ ] Git working tree limpio

---

## 🎖️ EXPECTATIVAS DE ENTREGA

**Al completar FASE 1**:
- 4 TODOs marcados `done` (#51, #52, #54, #55)
- 2-3 commits por bloque = 8-12 commits total
- Deploy Heroku v1162-v1165
- WiFi repo actualizado (si Mac Mini disponible)
- Email system robusto multi-plataforma

**Al completar FASE 2**:
- 3 TODOs marcados `done` (#40, #41, #46)
- 3 documentos auditoría generados
- Tests automatizados creados
- Refactors aplicados y validados

**Al completar FASE 3**:
- 3 TODOs marcados `done` (#44, #45, #53)
- Sistema membresías con reservas permanentes
- Documentación workflows móvil
- Plan tests documentado

**TOTAL IMPACTO**: 10 TODOs completados de 12 pending (83% clearance rate)

---

## 🔔 NOTIFICACIÓN TEMPLATE

Al finalizar cada FASE, notificar Diego:

```
✅ FASE 1 COMPLETADA — Plan Marathon

🎯 Bloques: C1, C2, C3, C4
⏱️ Tiempo: 4.2h (estimado: 4h)
📦 Deploy: v1165
📋 TODOs done: #51, #52, #54, #55

🚀 Próximo: FASE 2 (auditorías) o pausa?
```

---

**FIN DEL PLAN MARATHON** 🏁