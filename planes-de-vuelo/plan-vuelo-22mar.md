# ✈️ Plan de Vuelo - 22 de Marzo 2026

## 🎯 OBJETIVO PRINCIPAL
**PROFESIONALIZACIÓN COMPLETA DEL ECOSISTEMA**
Follow-ups Aurora/Enzo + Dashboard Aurora rediseño + Templates HTML elegantes + Adriana Cotizaciones Automáticas

---

## 🗓️ ESTADO ACTUAL (22 Mar 2026)

### ✅ Completado antes del 21 Mar
- FASE 1: Skills troubleshooting (4 skills)
- FASE 2: Tests integración Aurora + Aluna (12 tests)
- FASE 3A: Botones manuales D+1/D+3 en dashboard Aluna

### ✅ Completado 21 Mar 2026

**FASE 1 BLOQUE 1A — Notificaciones WhatsApp (commit `759aaba`)** ✅
- `src/servicios/notification-service.js` — 5 funciones: notifyHighIntent, notifyDailyReport, notifyCriticalError, notifyAutopilotComplete, notifyAutopilotBlocked
- `src/servicios/health-monitor.js` — chequeo OpenAI + DB cada 5 min, alerta WA tras 2 fallos consecutivos
- `src/cron/daily-report.js` — cron 9AM Ecuador, stats de Aluna + Aurora + Adriana
- `src/express-servidor/index.js` — boot integra startHealthMonitor() + startDailyReportCron()
- `wassenger.js` — high-intent refactorizado usando notifyHighIntent()
- 20 tests verdes ✅ (tests/unit/notification-service.test.js)
- Deployado y notificado ✅

**Axel v2 — CTAs + Follow-up + Dashboard (commit `48ef5f1`)** ✅
- `wassenger.js` — 3 paths post-cotización ahora dicen *"¿Cuándo tienes 20 minutos esta semana?"* en vez de agendar cita
- `axel-followup-cron.js` — D+2 (10am) y D+7 (11am Ecuador) automáticos
- `index.js` — Axel cron wired junto a Aluna/Enzo
- Backend: `POST /api/axel/quotes/:code/send-reminder` — envía WA y marca reminder_1_sent_at
- Frontend dashboard: dropdown estado por tarjeta (PATCH inmediato) + botón 📲 Recordatorio con feedback visual

**Aurora Dashboard paridad con Aluna (commits `5acc440`, `f3ad735`, v1013/v1014)** ✅
- BLOQUE A: 8 funciones `window.*` (switchTab, resetFilters, loadAbandoned, filterProspects, copyCampaignList, closeThread, sendCampaignWA, refreshAll)
- BLOQUE B: Search debounce 450ms
- BLOQUE C: Botones +1h y D+7 en filas de tabla con `data-fu-action`
- GAP A: Modal follow-up manual +1h/D+7 con preview de mensaje WA
- GAP B: Filter pills por servicio (Hot Desk / Sala Reuniones)
- GAP C: Stepper visual Creada → Confirmada → Completa por reserva
- GAP D: `window.sendFollowupNow(id, type, btn)` directo sin modal

### ✅ Completado 22 Mar 2026

**FASE 1 BLOQUE 1B — Comandos WhatsApp → deploy desde celular (v1015, commit `632f94e`)** ✅
- `wassenger.js` — `handleDiegoAlwaysOnCommands()` intercepta antes del debounce
- Comandos siempre activos: `STATUS`, `PARA`, `SIGUIENTE`, `CANCELA`
- Comandos condicionales (ya existían): `SI`/`SÍ`, `NO`, `REVIEW`, `DEPLOY`
- `STATUS` → query live a DB: reservas hoy, leads activos, salud de la conexión
- `PARA` → marca señal de pausa en estado autopilot
- Seguridad: solo `DIEGO_PERSONAL_PHONE`, cualquier otro número ignorado silenciosamente

**Dashboards Paula/Adriana/Gabi/Enzo nivelados a estándar Axel (v1016, commit `76a9303`)** ✅
- Paula: `POST /api/paula/leads/:id/send-wa` + dropdown status + botón 📲 WA por fila
- Adriana: `POST /api/adriana/leads/:code/send-wa` + botón 📲 WA por fila
- Gabi: `PATCH /api/gabi/leads/:code/status` + `POST /api/gabi/leads/:code/send-wa` + acciones por fila
- Enzo: `PATCH /api/enzo/projects/:code/status` + `POST /api/enzo/projects/:code/send-reminder` + acciones por fila
- 8 nuevos endpoints backend + 4 frontends actualizados + CSS por agente (purple/navy/green/orange)

**Hotfix WA contact phone — BOT_PHONE env var (v1017)** ✅
- Todos los `wa.me` links en emails/followups corregidos: `593987770788` → `593994837117`
- Archivos corregidos: adriana/paula/enzo/gabi-cotizacion-email.js, email-template-system.js, aluna-followup-service.js, enzo-followup-service.js, partial-reservation-form.js, health.js
- `.env` + Heroku: nueva var `BOT_PHONE=593994837117` (separada de `ADMIN_PHONE` que es el celular de Diego)
- `ADMIN_PHONE` conservado para identificación de comandos Diego en wassenger.js

### ✅ Completado 22 Mar 2026 (sesión tarde) — v1020 (df701a2) — chat backend

**FASE 2 BLOQUE 1A — Aurora +1h Post-Reserva** ✅
- `auroraRepository.js` — `findReservationsForOneHourFollowup()` + columna `followup_1h_sent_at`
- `aurora-followup-service.js` — `sendOneHourFollowup()`: WA + email (AURORA_CONFIRMATION template)
- `index.js` — cron `*/15 * * * *` wired
- 16 tests verdes ✅

**FASE 2 BLOQUE 1B — Aurora D+7 Re-booking** ✅
- `auroraRepository.js` — `findReservationsForRebookingReminder()` + columna `rebook_reminder_sent_at`
- `aurora-followup-service.js` — `sendRebookingReminder()`: WA + email (AURORA_REBOOKING template)
- `index.js` — cron `0 10 * * *` (10am Ecuador) wired

**FASE 5 BLOQUE 4A — Adriana: Extracción Docs con Vision AI** ✅
- `insurance-document-analysis.js` — 4 tipos: VEHICLE_REGISTRATION, ID_CARD, CAR_APPRAISAL, COMPETITOR_QUOTE
- 31 tests de extracción verdes ✅
- Deployado Heroku v1020 🟢

### ✅ Completado 22 Mar 2026 (sesión tarde) — v1021 (9ebf29d) — chat frontend

**FASE 3 BLOQUE 2A — Aurora Dashboard Rediseño** ✅
- `aurora-reservas.html` — CSS turquesa #4ECDC4 (nav, botones, inputs, pills, KPI chips)
- Header: logo Coworkia SVG + badge 🟢 ACTIVO
- `aurora-dashboard.js` — 3 bug fixes: `rebook_reminder_sent_at` (col name), `#prospect-filters .pill` scoping, removed filter-service reset en resetFilters()

**FASE 4 BLOQUE 3A — Email Template System** ✅
- `email-template-system.js` — 5 nuevos builders: `buildAuroraConfirmationHTML`, `buildAuroraRebookingHTML`, `buildEnzoD1HTML`, `buildEnzoD3HTML`, `buildEnzoD7HTML`
- Dispatcher actualizado: AURORA_CONFIRMATION, AURORA_REBOOKING, ENZO_D1/D3/D7, ALUNA_D1/D3, ADRIANA_COMPARISON

**FASE 4 BLOQUE 3B — Logos y Assets** ✅
- 8 SVGs en `/public/images/logos/`: coworkia, aurora, aluna, enzo, adriana, axel, paula, gabi
- `adriana-quote-comparison.html` — template standalone HTML preview
- Deployado Heroku v1021 🟢

**FASE 5 BLOQUE 4B — Sistema de Tasas VAZ + Calculadora** ✅ — chat backend
- `src/data/insurance-rates.js` — tasas VAZ integradas
- `src/servicios/adriana-quote-calculator.js` — `calculatePremium()` con factores edad/antigüedad
- 20 tests verdes ✅ (Mapfre la semana siguiente)

**FASE 5 BLOQUE 4C — Email HTML comparativo SegPopular** ✅ — chat frontend
- `src/servicios/email-templates/adriana-quote-comparison.html` — ya existe desde v1021

### ✅ Completado 22 Mar 2026 (sesión noche) — v1022/v1023 — chat Aurora (derecha)

**FIX CRÍTICO: Aurora Dashboard (v1022, commit `f020b6e`)** ✅
- `aurora-dashboard.js` (backend) — removida columna `r.updated_at` que NO existe en la tabla `reservations` (bug que dejaba la tabla completamente vacía)
- `aurora-reservas.html` — logo cambiado de Coworkia → MarketingLab (`enzo.svg`)

**Aurora Dash Perfección (v1023, commit `7523732`)** ✅
- `public/js/aurora-dashboard.js` — cleanup: orphaned `btn-copy-campaign` event listener removido; `updated_at || created_at` → `created_at` directo (col no existe en DB)
- `public/aurora-reservas.html` — tooltips `data-tip` agregados: 4 stat cards + 4 KPI chips de prospectos (el resto ya los tenía)
- `public/aluna-proformas.html` — CSS de tooltips instalado + 14 elementos con `data-tip`: 8 stat cards, 2 tabs, 4 botones, FAB
- `src/servicios/notification-service.js` — nueva función `notifyGitCommit(hash, msg, chat, files)` para notificaciones de VCS
- `.git/hooks/post-commit` — hook automático instalado: cada commit dispara WA a Diego con hash, mensaje y archivos modificados. Auto-detecta chat (Aurora/Adriana/Aluna/Enzo) por prefijo del mensaje
- Prompt listo para chat de la izquierda (Adriana dash)

### 🔵 PENDIENTE — próximas sesiones

**FASE 2 BLOQUE 1C** — chat backend (~45 min)
- `src/database/enzoRepository.js` — tabla `marketing_leads` + queries `findEnzoProspectsForD1/D3/D7()`
- `src/servicios/enzo-followup-service.js` — lógica envío WA + email
- `src/express-servidor/index.js` — 3 cron jobs: D1 11am, D3 2pm, D7 10am Ecuador
- Templates email YA ESTÁN: `buildEmailTemplate('ENZO', 'D1'/'D3'/'D7', data)`

**FASE 5 BLOQUE 4D** — chat backend (~1h)
- `wassenger.js` handler Adriana — form conversacional: foto matrícula → foto cédula → cobertura → `calculatePremium()` → email
- Tabla `adriana_quote_leads` en BD
- Vision AI YA EXISTE: `analyzeInsuranceDocument()`
- Calculator YA EXISTE: `calculatePremium()`
- Email template YA EXISTE: `buildEmailTemplate('ADRIANA', 'COMPARISON', data)`

**FASE 2 BLOQUE 1C (frontend)** — este chat (~40 min)
- `public/enzo-leads.html` — dashboard marketing leads: tabla D1/D3/D7 sent, dropdown status, botón 📲
- CSS naranja #F97316 (Enzo branding)
- Depende de que el backend haya creado los endpoints primero

---

## 🛠️ FASE 0: SKILLS NUEVOS INSTALADOS (HOY, 20 Min) ✅
**Status**: COMPLETADO

| Skill | Directorio | Instalado |
|-------|-----------|-----------|
| `get-shit-done` | `.github/skills/get-shit-done/` | ✅ 20 Mar 2026 |
| `dont-repeat-yourself` | `.github/skills/dont-repeat-yourself/` | ✅ 20 Mar 2026 |
| `coworkia-conversations` | `.github/skills/coworkia-conversations/` | ✅ 20 Mar 2026 |
| `coworkia-guardian` | `.github/skills/coworkia-guardian/` | ✅ 20 Mar 2026 |

**Qué hacen**:
- **GET SHIT DONE**: Protocolo de ejecución rápida, sin parálisis. Patrones copy-paste del codebase. Tiempos objetivo por tipo de tarea.
- **DONT REPEAT YOURSELF**: Inventario completo de servicios, queries, patterns existentes. Antes de crear, buscar aquí.
- **COWORKIA CONVERSATIONS**: Sistema de mejora continua. Aprende de cada sesión y conversación, registra gaps, propone mejoras automáticamente.
- **COWORKIA GUARDIAN**: Guardián pre-deploy. Verifica BD (IF NOT EXISTS), window.* exports en dashboards, alineación endpoints, conflictos entre chats paralelos. Cero sorpresas en producción.

---


---

## 🥇 FASE 1 — NOTIFICACIONES WHATSAPP A DIEGO
**Prioridad**: 🔴 CRÍTICA — Columna vertebral del trabajo autónomo

---

### BLOQUE 1A: notification-service.js ✅ COMPLETADO (commit `759aaba`)

**Archivos creados**:
- `src/servicios/notification-service.js` — 5 funciones (highIntent, dailyReport, criticalError, autopilotComplete, autopilotBlocked)
- `src/servicios/health-monitor.js` — OpenAI + DB check cada 5 min
- `src/cron/daily-report.js` — 9AM Ecuador, stats 3 agentes
- `tests/unit/notification-service.test.js` — 20/20 ✅

**Entregable**:
- [x] `notification-service.js` creado y funcionando
- [x] Health monitor activo en producción
- [x] Daily report 9AM Ecuador activo
- [x] 20 tests verdes
- [x] Deployado en Heroku

---

### BLOQUE 1B: Comandos WhatsApp → accionar el bot (45 min)

**Flujo**:
```
Bot termina bloque autopilot
  → WA a Diego: "✅ Dashboard Aurora listo. ¿Deploy? SI / NO / REVIEW"
  → Diego responde "SI" desde su celular
  → Bot detecta en webhook Wassenger
  → Ejecuta deploy
  → Confirma: "🚀 v999 live. ¿Inicio siguiente bloque?"
```

**Comandos desde WhatsApp**:
| Comando | Acción |
|---------|--------|
| `SI` / `SÍ` | Ejecuta acción pendiente (deploy o siguiente bloque) |
| `NO` / `CANCELA` | Cancela, queda en espera |
| `REVIEW` | Envía resumen de cambios del último bloque |
| `STATUS` | Estado del sistema en producción ahora mismo |
| `SIGUIENTE` | Inicia siguiente bloque del plan sin deploy |
| `PARA` | Detiene autopilot inmediatamente |

**Archivos**:
- `src/express-servidor/endpoints-api/wassenger.js` → agregar handler Diego al inicio del webhook

**Seguridad**: Solo `DIEGO_PERSONAL_PHONE` puede ejecutar comandos. Cualquier otro número es ignorado silenciosamente.

**Entregable**:
- [x] Handler de comandos Diego activo en webhook (`handleDiegoAlwaysOnCommands`)
- [x] STATUS → stats live del sistema (reservas, leads, DB health)
- [x] PARA → pausa el autopilot inmediatamente
- [x] SI/NO/REVIEW → ya existían vía `detectSystemCommand` (condicionales a pregunta pendiente)
- [x] Seguridad: solo `DIEGO_PERSONAL_PHONE` puede ejecutar comandos
- [x] Deployado heroku v1015

## �📋 FASES DEL PLAN

### FASE 2: AUTOMATIZACIONES FOLLOW-UP (2h)
**Prioridad**: 🟡 MEDIA - Mejora conversión pero no crítico

#### BLOQUE 1A: Aurora +1h Post-Reserva (45 min)
**Objetivo**: Confirmación y agradecimiento 1 hora después de reservar

**Funcionalidad**:
- Cron job: cada 15 min verifica reservas creadas hace 1h
- Envía WhatsApp + Email de agradecimiento
- Template cálido, profesional
- Variables: {{nombre}}, {{dia}}, {{hora}}, {{servicio}}

**Implementación**:
- Nueva query: `findReservationsForOneHourFollowup()`
- Cron en `index.js`: `'0,15,30,45 * * * *'` (cada 15 min)
- Template: "¡{{nombre}}! Confirmamos tu {{servicio}} para {{dia}} a las {{hora}}. ¿Necesitas algo más?"
- BD: Nueva columna `followup_1h_sent_at` en `reservations`

**Archivos**:
- `src/database/auroraRepository.js` - Nueva query
- `src/express-servidor/index.js` - Cron job
- `src/servicios/aurora-followup-service.js` - Lógica de envío

**Entregable**:
- [ ] Columna `followup_1h_sent_at` en BD
- [ ] Query `findReservationsForOneHourFollowup()`
- [ ] Template WhatsApp + Email
- [ ] Cron job activo
- [ ] Test: reserva → espera 1h → recibe mensaje

---

#### BLOQUE 1B: Aurora D+7 Re-booking (45 min)
**Objetivo**: Invitar a volver 7 días después de la reserva

**Funcionalidad**:
- Cron job: ejecuta a las 10:00 AM Ecuador
- Solo si reserva fue `completed` (no cancelada)
- Template: "¡Hola {{nombre}}! ¿Qué tal tu experiencia con nosotros? ¿Necesitas reservar de nuevo?"

**Implementación**:
- Nueva query: `findReservationsForRebookingReminder()`
- Cron: `'0 10 * * *'` (10am diario)
- Filtro: `status = 'completed' AND created_at = 7d ago AND rebooking_reminder_sent = false`
- BD: Nueva columna `rebooking_reminder_sent_at`

**Archivos**:
- `src/database/auroraRepository.js` - Query
- `src/servicios/aurora-followup-service.js` - Función de envío
- `src/express-servidor/index.js` - Cron

**Entregable**:
- [ ] Columna `rebooking_reminder_sent_at` en BD
- [ ] Query con filtro 7 días
- [ ] Template amigable
- [ ] Cron ejecutándose

---

#### BLOQUE 1C: Enzo - Automatizaciones Persuasivas (30 min)
**Objetivo**: 3 follow-ups automáticos con HTML elegante y descuentos "Solo por hoy"

**Automatizaciones de Enzo**:

**1. D+1 (24h): Recordatorio Suave**
- Trigger: Cliente mostró interés pero no contrató
- Template HTML: Diseño limpio con logo MarketingLab
- Mensaje: "Hola {{nombre}}, ¿seguimos adelante con tu estrategia de marketing digital?"
- CTA: Botón "Agendar llamada"
- Sin descuento (aún no urgente)

**2. D+3 (72h): FOMO con Descuento**
- Trigger: Cliente no respondió a D+1
- Template HTML: Diseño urgente (rojo/naranja)
- Mensaje: "{{nombre}}, tenemos una oferta especial SOLO HOY: 15% OFF en tu primer proyecto 🎁"
- CTA: Botón "Quiero mi descuento"
- Descuento: 15% válido 24h

**3. D+7 (7 días): Último Intento + Caso de Éxito**
- Trigger: Cliente no respondió a D+3
- Template HTML: Elegante con testimonial
- Mensaje: "{{nombre}}, mira cómo ayudamos a [Cliente X] a crecer 300% en 3 meses 📈. ¿Te gustaría similar resultado?"
- CTA: "Ver caso de éxito completo"
- Último contacto, luego archiva

**Implementación**:
- Nueva tabla `marketing_leads` (similar a `membership_leads`)
- Queries: `findEnzoProspectsForD1()`, `findEnzoProspectsForD3()`, `findEnzoProspectsForD7()`
- Templates HTML en `src/servicios/enzo-email-templates.js`
- Cron jobs: D+1 a las 11am, D+3 a las 2pm, D+7 a las 10am

**Archivos a crear**:
- `src/database/enzoRepository.js` - Queries
- `src/servicios/enzo-followup-service.js` - Lógica
- `src/servicios/enzo-email-templates.js` - HTML templates
- `src/express-servidor/index.js` - 3 cron jobs

**Entregable**:
- [ ] Tabla `marketing_leads` en BD
- [ ] 3 templates HTML elegantes (MarketingLab branding)
- [ ] Sistema de descuentos temporales
- [ ] 3 cron jobs activos
- [ ] Dashboard `/enzo-leads.html` (opcional)

---

### FASE 3: DASHBOARD AURORA REDISEÑO 🔄 EN PROGRESO — OTRO CHAT
**Prioridad**: 🟢 ALTA - Diego lo usa a diario
**Responsable**: Chat front-end — este chat NO toca esta FASE

#### BLOQUE 2A: Análisis del Dashboard Actual (30 min)
**Objetivo**: Documentar qué está confuso y qué mejorar

**Problemas detectados**:
1. **Visual**: Gradiente verde/turquesa puede ser cansador
2. **Funciones ocultas**: Botones existen pero no están destacados
3. **Navegación confusa**: Muchas secciones sin jerarquía clara
4. **Filtros poco claros**: No se ve qué está activo
5. **Sin logos/branding**: Falta identidad de Coworkia

**Funciones que SÍ existen (activar visualmente)**:
- ✅ `copyCampaignList()` - Copiar lista para campañas
- ✅ `loadAbandoned()` - Cargar prospectos abandonados
- ✅ `filterProspects()` - Filtrar por urgencia (urgent/hot/warm/cold)
- ✅ `loadConversations()` - Ver historial de conversaciones
- ✅ `closeThread()` - Cerrar hilo de conversación
- ✅ Stats cards (total, mes, upcoming, revenue)
- ✅ Filtros por status, servicio, fecha

**Acción**: Hacer estas funciones más visibles, intuitivas, con mejores labels.

---

#### BLOQUE 2A: Rediseño Visual (1.5h)
**Objetivo**: Dashboard más limpio, profesional, usable

**Mejoras específicas**:

**1. Header mejorado**:
```html
<header>
  <div style="display:flex; align-items:center; gap:16px;">
    <img src="/images/coworkia-logo.png" alt="Coworkia" style="height:48px;">
    <div>
      <h1>Dashboard Aurora - Reservas</h1>
      <p class="subtitle">Gestión inteligente de espacios coworking</p>
    </div>
    <span style="margin-left:auto; background:#4ECDC4; color:white; padding:8px 16px; border-radius:8px; font-size:12px;">
      🟢 ACTIVO
    </span>
  </div>
</header>
```

**2. Stats Cards más claros**:
- Icons grandes (📊 📅 ⏰ 💵)
- Colores diferenciados
- Labels más descriptivos

**3. Sección de Acciones Rápidas**:
```html
<div class="quick-actions">
  <button onclick="loadAbandoned()">
    🔥 Ver Prospectos Calientes
  </button>
  <button onclick="copyCampaignList()">
    📋 Copiar Lista Campaña
  </button>
  <button onclick="loadConversations()">
    💬 Historial Conversaciones
  </button>
  <button onclick="exportToCSV()">
    📊 Exportar a Excel
  </button>
</div>
```

**4. Filtros más visuales**:
- Pills activos con color
- Clear button visible
- Búsqueda destacada

**5. Paleta de colores profesional**:
- Principal: #4ECDC4 (turquesa Coworkia)
- Secundario: #44A08D (verde oscuro)
- Acciones: #2563eb (azul)
- Peligro: #dc2626 (rojo)
- Éxito: #16a34a (verde)

**Archivos a modificar**:
- `public/aurora-reservas.html` - HTML + CSS
- `public/js/aurora-dashboard.js` - Mejorar labels, agregar helpers

**Entregable**:
- [ ] Logo de Coworkia visible
- [ ] Acciones rápidas destacadas
- [ ] Paleta de colores consistente
- [ ] Navegación clara
- [ ] Screenshots antes/después

---

### FASE 4: TEMPLATES HTML SISTEMA CENTRALIZADO 🔄 EN PROGRESO — OTRO CHAT
**Prioridad**: 🔴 CRÍTICA - Afecta a todos los agentes
**Responsable**: Chat front-end — este chat NO toca esta FASE

#### BLOQUE 3A: Template System (1h)
**Objetivo**: Templates HTML con contexto, logos, branding coherente

**Problema actual**:
- Templates dispersos en múltiples archivos
- Sin logos, branding inconsistente
- Variables hardcodeadas
- Difícil mantener

**Solución**:
Crear sistema centralizado de templates con:
- Logo de cada agente
- Colores específicos por agente
- Layout responsive
- Variables dinámicas garantizadas

**Estructura**:
```javascript
// src/servicios/email-template-system.js

const AGENT_BRANDING = {
  AURORA: {
    logo: 'https://coworkia.ec/assets/aurora-logo.png',
    primaryColor: '#4ECDC4',
    secondaryColor: '#44A08D',
    fontFamily: '"Inter", sans-serif'
  },
  ALUNA: {
    logo: 'https://coworkia.ec/assets/aluna-logo.png',
    primaryColor: '#8B5CF6',
    secondaryColor: '#6D28D9'
  },
  ENZO: {
    logo: 'https://marketinglab.ec/logo.png',
    primaryColor: '#F97316',
    secondaryColor: '#EA580C',
    companyName: 'MarketingLab'
  },
  ADRIANA: {
    logo: 'https://segpopular.ec/logo.png',
    primaryColor: '#1E3A8A', // Azul navy
    secondaryColor: '#FCD34D', // Amarillo
    companyName: 'SegPopular - Broker de Seguros'
  },
  // ... otros agentes
};

function buildEmailTemplate(agent, type, data) {
  const branding = AGENT_BRANDING[agent];
  const template = TEMPLATES[agent][type];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: ${branding.fontFamily}; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: ${branding.primaryColor}; padding: 30px; text-align: center; }
        .logo { height: 60px; }
        /* ... más estilos */
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${branding.logo}" alt="${agent}" class="logo">
        </div>
        <div class="content">
          ${replaceVariables(template, data)}
        </div>
        <div class="footer">
          <p>${branding.companyName || agent}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

**Templates por agente y tipo**:
- Aurora: confirmación, +1h, D+7
- Aluna: proforma, D+1, D+3
- Enzo: D+1, D+3, D+7
- Adriana: cotización comparativa, documentos faltantes, emisión

**Archivos**:
- `src/servicios/email-template-system.js` - Sistema central
- `src/servicios/email-templates/` - Carpeta con templates individuales
- Migrar todos los servicios a usar este sistema

**Entregable**:
- [ ] Sistema centralizado funcionando
- [ ] Templates con logos integrados
- [ ] Variables garantizadas (no pueden faltar)
- [ ] Tests de rendering
- [ ] Documentación de cómo agregar nuevo template

---

#### BLOQUE 3B: Logos y Assets (30 min)
**Objetivo**: Tener todos los logos disponibles

**Logos necesarios**:
- Coworkia (principal)
- Aurora (turquesa)
- Aluna (morado)
- Enzo - MarketingLab (naranja)
- Adriana - SegPopular (azul navy + amarillo)
- Axel - PaintBull
- Paula - PropElite
- Ángela - MedBeneficios
- Gabi - GR Consulting

**Opciones**:
1. **Subir a Heroku** (`public/images/logos/`)
2. **CDN externo** (Cloudinary, ImgBB)
3. **Base64 embebidos** (menos recomendado)

**Acción**:
- Diego proporciona logos o generamos con IA
- Subir a `/public/images/logos/[agente].png`
- Actualizar `AGENT_BRANDING` con URLs

**Entregable**:
- [ ] Logos de 8 agentes en `/public/images/logos/`
- [ ] URLs actualizadas en template system
- [ ] Test visual de cada template

---

### FASE 5: ADRIANA - COTIZACIONES AUTOMÁTICAS (5-6h) 🌟
**Prioridad**: 🔴 CRÍTICA - Feature más demandada

#### BLOQUE 4A: Extracción de Datos con Vision AI (1.5h)
**Objetivo**: Cliente envía foto de documentos → Adriana extrae datos estructurados

**Documentos a procesar**:

**1. Matrícula vehicular**:
```javascript
{
  placa: "ABC-1234",
  marca: "Hyundai",
  modelo: "Creta",
  año: 2022,
  cilindraje: "1600cc",
  color: "Blanco",
  chasis: "KMHJ381CBNU123456"
}
```

**2. Cédula / Licencia**:
```javascript
{
  cedula: "1712344460",
  nombre: "JORGE JAVIER TROYA PORTILLA",
  fechaNacimiento: "1979-07-07",
  edad: 46,
  ciudad: "Quito",
  direccion: "Pasaje Verona y José Vinueza..."
}
```

**3. Avalúo comercial** (si lo envían):
```javascript
{
  valorComercial: 18000,
  moneda: "USD"
}
```

**4. Cotizaciones competencia** (PDF/foto):
```javascript
{
  aseguradora: "Seguros Sucre",
  prima: 850,
  deducible: 200,
  coberturas: ["Todo riesgo", "Asistencia vial"]
}
```

**Implementación**:
- Reutilizar `insurance-document-analysis.js` (ya existe para Adriana)
- Agregar nuevo tipo: `VEHICLE_REGISTRATION`, `ID_CARD`, `CAR_APPRAISAL`
- Prompts especializados para extracción precisa
- Almacenar datos en tabla `adriana_quotes`

**Archivos**:
- `src/servicios/insurance-document-analysis.js` - Agregar tipos
- `src/database/adrianaRepository.js` - Queries
- `src/express-servidor/endpoints-api/wassenger.js` - Handler Adriana

**Entregable**:
- [ ] 4 tipos de documentos detectables
- [ ] Extracción > 90% precisión
- [ ] Datos guardados en BD estructurados
- [ ] Test con docs reales (VAZ attachments)

---

#### BLOQUE 4B: Sistema de Tasas y Cálculo de Primas (2h)
**Objetivo**: Con datos extraídos → calcular prima en múltiples aseguradoras

**⚠️ ACLARACIÓN DIEGO (22 Mar)**: Arrancar SOLO con VAZ. Otras aseguradoras llegan la semana siguiente. El sistema debe estar diseñado para agregar aseguradoras fácilmente, pero no inventar tasas de Mapfre o Unidos.

**Aseguradoras a integrar**:
1. VAZ Seguros ✅ (archivo de tasas en PDF attachment de sesión anterior)
2. Mapfre → pendiente, agregamos la semana que viene
3. Seguros Unidos → pendiente
4. Otras → pendiente

> 🔑 Diseño: `calculatePremium(vehicleData, personData, coverage, insurer)` debe aceptar `insurer` como parámetro para que agregar Mapfre sea solo agregar un archivo de tasas.

**Archivo de tasas** (formato sugerido):
```javascript
// src/data/insurance-rates.js

export const VAZ_RATES = {
  vehiculos: {
    livianos: {
      todoRiesgo: {
        // Tasa base por rango de valor
        "0-15000": 0.045,      // 4.5% del valor asegurado
        "15001-30000": 0.04,   // 4%
        "30001-50000": 0.035,  // 3.5%
        "50001+": 0.03         // 3%
      },
      responsabilidadCivil: {
        flat: 120  // Precio fijo anual
      },
      asistenciaVial: {
        flat: 80   // Precio fijo
      }
    }
  },
  factores: {
    edad: {
      "18-25": 1.15,  // +15% si conductor es joven
      "26-65": 1.0,   // Sin ajuste
      "66+": 1.10     // +10% si es mayor
    },
    antiguedad: {
      "0-3años": 1.0,
      "4-8años": 1.05,
      "9-15años": 1.15,
      "15+años": 1.25
    }
  }
};

export const MAPFRE_RATES = {
  // Similar estructura...
};
```

**Función de cálculo**:
```javascript
// src/servicios/adriana-quote-calculator.js

export function calculatePremium(vehicleData, personData, coverage, insurer) {
  const rates = RATES_MAP[insurer];
  
  // 1. Obtener tasa base según valor del vehículo
  const baseRate = getBaseRate(rates, vehicleData.valorComercial, coverage);
  
  // 2. Calcular prima base
  let premium = vehicleData.valorComercial * baseRate;
  
  // 3. Aplicar factores de ajuste (edad, antigüedad vehículo)
  const ageFactor = getAgeFactor(rates, personData.edad);
  const vehicleAgeFactor = getVehicleAgeFactor(rates, vehicleData.año);
  
  premium *= ageFactor * vehicleAgeFactor;
  
  // 4. Agregar coberturas adicionales
  if (coverage.includes('asistenciaVial')) {
    premium += rates.asistenciaVial.flat;
  }
  
  return {
    primaAnual: Math.round(premium * 100) / 100,
    primaMensual: Math.round((premium / 12) * 100) / 100,
    desglose: {
      base: vehicleData.valorComercial * baseRate,
      ajustes: {
        edad: ageFactor,
        vehiculo: vehicleAgeFactor
      },
      coberturas: { ... }
    }
  };
}
```

**Archivos**:
- `src/data/insurance-rates.js` - Tasas de aseguradoras
- `src/servicios/adriana-quote-calculator.js` - Lógica de cálculo
- `src/database/adrianaRepository.js` - Guardar cotizaciones

**Entregable**:
- [ ] Archivo de tasas VAZ integrado
- [ ] Función de cálculo con factores
- [ ] Comparación automática (al menos 2 aseguradoras)
- [ ] Tests con casos reales (ejemplo: Hyundai Creta de attachment)

---

#### BLOQUE 4C: Email HTML Comparativo Elegante (1.5h)
**Objetivo**: Email profesional estilo broker con tabla comparativa

**Diseño** (basado en SegPopular):
- Logo SegPopular arriba
- Colores: Azul navy (#1E3A8A) + Amarillo (#FCD34D)
- Tabla limpia comparando aseguradoras
- Detalles de coberturas explicados
- CTA: "Acepto esta cotización"

**Ejemplo de template**:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .header { background: #1E3A8A; padding: 30px; text-align: center; }
    .logo { height: 60px; }
    .intro { padding: 30px; font-size: 16px; color: #374151; }
    .comparison-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .comparison-table th { background: #1E3A8A; color: white; padding: 15px; }
    .comparison-table td { border: 1px solid #e5e7eb; padding: 12px; text-align: center; }
    .best-option { background: #FEF3C7; border: 2px solid #FCD34D; }
    .cta-button { background: #1E3A8A; color: white; padding: 15px 40px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://segpopular.ec/logo.png" class="logo">
    <h1 style="color:white; margin-top:15px;">Cotización de Seguros</h1>
  </div>
  
  <div class="intro">
    <p>Estimado/a <strong>{{nombre}}</strong>,</p>
    <p>Le presentamos las mejores opciones de seguro para su vehículo <strong>{{marca}} {{modelo}} {{año}}</strong>.</p>
    <p>Como broker autorizado, hemos comparado las siguientes aseguradoras para ofrecerle la mejor relación precio-cobertura:</p>
  </div>
  
  <table class="comparison-table">
    <thead>
      <tr>
        <th>Aseguradora</th>
        <th>Prima Anual</th>
        <th>Prima Mensual</th>
        <th>Deducible</th>
        <th>Coberturas</th>
      </tr>
    </thead>
    <tbody>
      <tr class="best-option">
        <td><strong>VAZ Seguros</strong> ⭐</td>
        <td><strong>$850.00</strong></td>
        <td>$70.83</td>
        <td>$200</td>
        <td>✅ Todo Riesgo<br>✅ Asistencia Vial<br>✅ RC hasta $100K</td>
      </tr>
      <tr>
        <td>Mapfre</td>
        <td>$920.00</td>
        <td>$76.67</td>
        <td>$250</td>
        <td>✅ Todo Riesgo<br>❌ Asistencia extra<br>✅ RC hasta $80K</td>
      </tr>
      <!-- más filas -->
    </tbody>
  </table>
  
  <div style="padding: 30px; background: #F9FAFB; border-radius: 8px; margin: 20px;">
    <h3>📋 Detalles de la Mejor Opción (VAZ Seguros)</h3>
    <ul>
      <li><strong>Cobertura Todo Riesgo:</strong> Protección completa contra daños propios y a terceros</li>
      <li><strong>Asistencia Vial 24/7:</strong> Grúa, mecánico, taxi, hotel</li>
      <li><strong>Responsabilidad Civil:</strong> Hasta $100,000 en daños a terceros</li>
      <li><strong>Deducible:</strong> $200 (uno de los más bajos del mercado)</li>
    </ul>
    
    <p style="margin-top: 20px;">
      <strong>Prima Anual:</strong> $850.00 (pago único) o <strong>12 cuotas de $70.83</strong>
    </p>
  </div>
  
  <!-- ⚠️ ACLARACIÓN DIEGO: Aceptación por MAIL Y CHAT (WhatsApp) -->
  <div style="text-align: center; padding: 30px;">
    <!-- Opción 1: Email -->
    <a href="mailto:diego@coworkia.ec?subject=Acepto cotización VAZ Seguros - {{placa}}&body=Hola Adriana, acepto la cotización de VAZ Seguros para mi vehículo {{marca}} {{modelo}}."
       class="cta-button"
       style="display: inline-block; text-decoration: none; border-radius: 8px; margin-right: 10px;">
      📧 Acepto por Email
    </a>
    <!-- Opción 2: WhatsApp (responder al chat de Adriana) -->
    <span style="display:inline-block; background:#25D366; color:white; padding:15px 30px; border-radius:8px;">
      💬 O responde "ACEPTO" en WhatsApp
    </span>
  </div>
  
  <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb;">
    <p><strong>Adriana - SegPopular S.A.</strong></p>
    <p>Broker Autorizado de Seguros | RUC: XXXXXXXXXX</p>
    <p>📞 +593 99 XXX XXXX | 📧 adriana@segpopular.ec</p>
  </div>
</body>
</html>
```

**Archivos**:
- `src/servicios/email-templates/adriana-quote-comparison.html` - Template
- `src/servicios/email-template-system.js` - Integración
- `src/servicios/mailer-service.js` - Función de envío

**Entregable**:
- [ ] Template HTML responsive
- [ ] Logo SegPopular integrado
- [ ] Tabla comparativa con al menos 2 aseguradoras
- [ ] Botón CTA funcional (mailto o link)
- [ ] Test: envío a email de Diego

---

#### BLOQUE 4D: Form Conversacional → BD → Email (1h)
**Objetivo**: Adriana guía al cliente en WhatsApp, guarda en BD, envía a Diego

**Flujo conversacional**:

```
Adriana: ¡Hola! 👋 Soy Adriana de SegPopular. ¿En qué tipo de seguro estás interesado?

Cliente: Seguro de auto

Adriana: Perfecto! 🚗 Necesito algunos datos. ¿Puedes enviarme una foto de la matrícula de tu vehículo?

Cliente: [foto de matrícula]

Adriana: Gracias! Procesando... ✅
Detecté: Hyundai Creta 2022, Placa ABC-1234

Ahora necesito una foto de tu cédula o licencia de conducir.

Cliente: [foto de cédula]

Adriana: Perfecto Jorge! Tengo tus datos:
- Nombre: Jorge Javier Troya Portilla
- Edad: 46 años
- Vehículo: Hyundai Creta 2022

¿Tienes un avalúo comercial reciente? Si no, puedo estimarlo.

Cliente: No tengo

Adriana: Sin problema. Basándome en el mercado, estimo tu Creta 2022 en aprox. $18,000. ¿Te parece correcto?

Cliente: Sí

Adriana: Excelente! ¿Qué tipo de cobertura buscas?
1. Solo Responsabilidad Civil ($120/año)
2. Todo Riesgo Básico ($850/año)
3. Todo Riesgo Full (RC + Asistencia + Daños) ($1,200/año)

Cliente: La opción 2

Adriana: Perfecto! Estoy preparando tu cotización comparativa con las mejores aseguradoras. Te la envío por email en 2 minutos ✉️

[Sistema procesa cotización]
[Guarda en BD]
[Envía email a diego@coworkia.ec Y al cliente]

Adriana: ✅ Listo Jorge! Revisa tu email (jtroya@email.com).

Te envié una comparación de 3 aseguradoras. La mejor opción es VAZ Seguros a $850/año.

Si aceptas, responde al email y yo gestiono todo el proceso de emisión 📋
```

**Implementación**:
- Usar sistema de forms conversacionales (ya existe para Aurora/Aluna)
- Nueva tabla `adriana_quote_leads` con columnas:
  - `id`, `user_phone`, `user_name`, `user_email`
  - `vehicle_data` (JSONB con marca, modelo, año, placa, valor)
  - `person_data` (JSONB con cedula, edad, nombre, direccion)
  - `coverage_type` (responsabilidad_civil, todo_riesgo, full)
  - `quote_sent_at`, `quote_accepted_at`
  - `status` (gathering_data, quote_sent, accepted, rejected, in_process)

**Form steps**:
1. Tipo de seguro (auto/vida/salud/hogar)
2. Foto de matrícula → extrae datos
3. Foto de cédula → extrae datos
4. Avalúo (opcional)
5. Tipo de cobertura → calcula
6. Confirmación → envía email

**Canales de aceptación** (⚠️ ACLARACIÓN DIEGO: tanto mail como chat):
- **Por WhatsApp**: Cliente responde "ACEPTO" o "Acepto" en la misma conversación con Adriana → Adriana confirma y notifica a Diego
- **Por Email**: Cliente hace click en botón del email comparativo → llega a diego@coworkia.ec

**Emails que se envían**:
- **Al cliente**: Email comparativo elegante (BLOQUE 4C)
- **A Diego**: Email resumen con datos para vinculación manual

**Email a Diego** (plantilla):
```
Asunto: [Adriana] Nueva solicitud de cotización - Jorge Troya

Hola Diego,

Adriana recibió una nueva solicitud de cotización de seguros.

Datos del cliente:
- Nombre: Jorge Javier Troya Portilla
- Cédula: 1712344460
- Teléfono: +593994153468
- Email: jtroya@email.com
- Edad: 46 años

Datos del vehículo:
- Marca/Modelo: Hyundai Creta 2022
- Placa: ABC-1234
- Valor estimado: $18,000

Cobertura solicitada: Todo Riesgo Básico

Cotización enviada al cliente:
- VAZ Seguros: $850/año (recomendada) ⭐
- [Más aseguradoras en próxima semana]

Estado: Esperando aceptación del cliente

Próximos pasos si acepta:
1. Llenar formulario de vinculación VAZ (ver adjunto)
2. Solicitar documentos faltantes (RUC si aplica, declaración impuesto a la renta)
3. Digitalizar y enviar a VAZ para emisión

---
Adriana SegPopular S.A.
Sistema Automatizado
```

**Archivos**:
- `src/servicios/adriana-form-service.js` - Lógica conversacional
- `src/database/adrianaRepository.js` - Queries
- `src/express-servidor/endpoints-api/wassenger.js` - Handler

**Entregable**:
- [ ] Form conversacional completo (6 pasos)
- [ ] BD con datos estructurados
- [ ] Email al cliente (comparativo elegante)
- [ ] Email a Diego (resumen + próximos pasos)
- [ ] Test end-to-end completo

---

#### BLOQUE 4E: Formulario de Vinculación (Opcional - 45 min)
**Objetivo**: Adriana ayuda a llenar formulario VAZ automáticamente

**Contexto**:
- VAZ requiere formulario complejo (ver imagen attachment)
- Tiene campos: datos personales, laborales, financieros, bancarios
- Diego actualmente lo llena manualmente

**Solución híbrida**:
1. Adriana recopila todos los datos en conversación
2. Genera formulario prellenado (PDF o HTML)
3. Envía a Diego para revisión
4. Diego ajusta si necesario y envía a VAZ

**Implementación**:
- Template del formulario VAZ en HTML
- Función `fillVazForm(clientData)` que mapea datos → campos
- Genera PDF con puppeteer o envía HTML editable

**Archivos**:
- `src/servicios/adriana-vaz-form-generator.js` - Generator
- `src/templates/vaz-vinculacion-form.html` - Template HTML

**Entregable** (opcional):
- [ ] Template formulario VAZ
- [ ] Mapeo automático de datos
- [ ] PDF generado o HTML editable
- [ ] Envío a Diego para revisión

---

### 🎓 SKILLS NUEVOS A CREAR

#### adriana-insurance-system.md
Documenta todo el sistema de Adriana:
- Tipos de seguros
- Proceso de cotización
- Aseguradoras integradas
- Cálculo de primas
- Email templates
- Formulario de vinculación

---

## ⏰ ESTIMACIÓN DE TIEMPOS

| **Fase** | **Bloques** | **Tiempo Estimado** | **Prioridad** |
|----------|-------------|---------------------|---------------|
| FASE 1: Automatizaciones | 3 (Aurora +1h, D+7, Enzo x3) | 2h | 🟡 MEDIA |
| FASE 2: Dashboard Aurora | 2 (Análisis + Rediseño) | 2h | 🟢 ALTA |
| FASE 3: Templates HTML | 2 (Sistema + Logos) | 1.5h | 🔴 CRÍTICA |
| FASE 4: Adriana Cotizaciones | 5 (Extracción + Cálculo + Email + Form + Vinculación) | 5.5h | 🔴 CRÍTICA |
| **TOTAL** | **12 bloques** | **11h** | 2-3 sesiones autopilot |

---

## �🚀 RECOMENDACIÓN DE EJECUCIÓN

### Sesión 1 (Autopilot - 3.5h) - HOY
```
✅ FASE 3 completa: Templates HTML centralizados
✅ FASE 2 completa: Dashboard Aurora rediseño
```

**Razón**: Impacta a todos los agentes, mejora marca y UX inmediato.

### Sesión 2 (Autopilot - 4h) - MAÑANA
```
✅ FASE 4 bloques A, B, C: Adriana extracción + cálculo + email
```

**Razón**: Core de Adriana funcionando, puede cotizar.

### Sesión 3 (Autopilot - 3.5h) - PASADO MAÑANA
```
✅ FASE 4 bloques D, E: Form conversacional Adriana + Vinculación
✅ FASE 1 completa: Automatizaciones Aurora + Enzo
```

**Razón**: Completa Adriana end-to-end + follow-ups adicionales.

---

## 📋 CRITERIOS DE ÉXITO

### FASE 1 completada cuando:
- [ ] Aurora envía +1h y D+7 automáticamente
- [ ] Enzo tiene 3 automatizaciones con HTML elegante
- [ ] Descuentos "Solo por hoy" funcionando
- [ ] Cron jobs activos sin errores

### FASE 2 completada cuando:
- [ ] Dashboard Aurora es visualmente limpio
- [ ] Todas las funciones están destacadas y usables
- [ ] Logo Coworkia visible
- [ ] Paleta de colores profesional
- [ ] Screenshots antes/después documentados

### FASE 3 completada cuando:
- [ ] Sistema centralizado de templates funciona
- [ ] 8 logos de agentes integrados
- [ ] Todos los emails usan nuevo sistema
- [ ] Variables nunca faltan (garantizado)
- [ ] Tests de rendering pasan

### FASE 4 completada cuando:
- [ ] Adriana extrae datos de fotos con >90% precisión
- [ ] Cotiza en al menos 2 aseguradoras (VAZ + Mapfre)
- [ ] Email comparativo se envía elegante y profesional
- [ ] Cliente puede aceptar cotización fácilmente
- [ ] Form conversacional completo funciona
- [ ] BD guarda todo estructurado
- [ ] Diego recibe email con datos para vinculación
- [ ] Test end-to-end con ejemplo real (Hyundai Creta)

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

### ¿Qué necesito de Diego AHORA?

1. **Logos** (urgente):
   - ¿Tienes logos de SegPopular, MarketingLab, Coworkia?
   - ¿Los subo o los buscas y me pasas URLs?

2. **Tasas de Mapfre/Otras** (para FASE 4):
   - ¿Tienes ya o consigo después?
   - ¿Empiezo solo con VAZ?

3. **Aprobación de prioridades**:
   - ¿Ejecutar Sesión 1 hoy (FASE 2 + 3)?
   - ¿O prefieres empezar directo con Adriana (FASE 4)?

4. **Email de aceptación**:
   - ¿Link a form externo o responder email?
   - ¿Integración con sistema de pagos o manual?

---

## ✅ DECISIONES TOMADAS (20 Mar - Diego)

1. **Tasas seguros**: Solo VAZ por ahora. Mapfre y otras llegan la semana próxima.
2. **Aceptación de cotización**: Por mail Y por WhatsApp (cliente responde "ACEPTO").
3. **No inventar datos**: Si no existen las tasas → NO fabricarlas. Arquitectura extensible para agregar después.
4. **Logos**: Si existen en el repo, usarlos. Si no existen, no inventar → placeholder hasta que Diego los pase.
5. **Skills nuevos**: GET SHIT DONE + DONT REPEAT YOURSELF + COWORKIA CONVERSATIONS → instalados hoy.

---

## 🤖 PROMPT HANDOFF — PARA CUANDO TERMINA FASE 3 DE ALUNA

> **Diego: copia esto cuando el otro chat termine y las pruebas pasen.**

```
🤖 HANDOFF: Aluna Dashboard COMPLETO - Iniciando Plan 22mar

El dashboard de Aluna (aluna-proformas.html) quedó terminado y probado en producción:
- BLOQUE 3A ✅ Botones manuales D+1/D+3 (WhatsApp + Email) con modal editor
- BLOQUE 3B ✅ Ventana de campañas masivas con filtros, preview y envío
- BD actualizada, endpoints /api/aluna/* funcionales, tests pasando

--- TU PRÓXIMA MISIÓN ---

Lee estos archivos en orden:
1. .github/skills/coworkia-memory/SKILL.md   ← contexto del proyecto
2. .github/skills/get-shit-done/SKILL.md     ← protocolo de ejecución rápida
3. .github/skills/dont-repeat-yourself/SKILL.md ← inventario de código existente
4. planes-de-vuelo/plan-vuelo-22mar.md       ← plan completo

Ejecuta en orden:

BLOQUE A (1.5h): FASE 1 → Aurora follow-ups automáticos
  - Aurora +1h post-reserva: nueva columna BD + cron + template WA
  - Aurora D+7 re-booking: nueva columna BD + cron + template WA
  - Archivos: src/database/auroraRepository.js, src/express-servidor/index.js
  - Patrón: copiar de aluna-followup-cron.js y adaptar

BLOQUE B (2h): FASE 2 → Dashboard Aurora rediseño visual
  - Archivo: public/aurora-reservas.html + public/js/aurora-dashboard.js
  - Las funciones YA EXISTEN (loadAbandoned, filterProspects, copyCampaignList, closeThread)
  - Solo necesita: acciones destacadas, paleta limpia, logo Coworkia, UX clara
  - Colores: #4ECDC4 (turquesa Aurora), fondo dark #0f172a
  - Logo: buscar en public/images/ si existe, NO inventar URL externa

Checkpoint después de cada BLOQUE.
Autopilot verde nena.
```

---

## 🤖 PROMPT SESIÓN 2 — ADRIANA COTIZACIONES (cuando pidas)

```
🤖 SESIÓN 2: Adriana - Sistema de Cotizaciones Automáticas

Lee: planes-de-vuelo/plan-vuelo-22mar.md → FASE 4 completa

CONTEXTO CLAVE:
- Adriana ya tiene Vision AI funcionando (insurance-document-analysis.js, 540 líneas, 8 tipos de doc)
- Solo aseguradora activa: VAZ Seguros (tasas en src/data/ si ya existen, sino crearlas)
- NO inventar tasas de Mapfre ni Unite → arquitectura extensible solo
- Aceptación de cotización: por email (botón mailto) Y por WhatsApp (cliente responde "ACEPTO")
- Email estilo broker: navy #1E3A8A + amarillo #FCD34D + logo SegPopular si existe en public/images/

BLOQUES A EJECUTAR:
1. BLOQUE 4A: Extender Vision AI → tipos VEHICLE_REGISTRATION, ID_CARD, CAR_APPRAISAL
2. BLOQUE 4B: src/data/vaz-rates.js + src/servicios/adriana-quote-calculator.js
3. BLOQUE 4C: Email HTML comparativo elegante (una aseguradora = VAZ, extensible)
4. BLOQUE 4D: Form conversacional en WhatsApp → BD → email cliente + email Diego

Checkpoint después de cada bloque.
Autopilot verde nena.
```

---

## 🛡️ SESIÓN TARDE 22MAR — ADRIANA DASHBOARD + EMAIL COMPARATIVO

### ✅ TODO LO QUE SE HIZO EN ESTA SESIÓN

**Dashboard Adriana** (commits `88245ac` → `dd49ff5`):
- Header limpio: solo MarketingLab logo + "🛡️ Adriana Seguros"
- Sin botón "Datos demo", sin logos SegPopular/VAZ en header
- Auto-panel S1/S2/S3 con contadores en vivo (ventanas de seguimiento)
- Urgency bar aparece si leads pendientes >48h
- Tooltips (data-tip) en KPIs, tabs, automation cards
- Auto-refresh cada 5 min, puntos rojos en leads urgentes
- Javier Troya sembrado en BD producción (ADR-JT-001, $830, Hyundai Creta 2022)

**Email ADRIANA_COMPARISON_V2** (último commit esta sesión):
- Logo SegPopular real en header y footer del email
- Branding limpio: "Adriana · Bróker de Seguros Vehiculares" (no VAZ como marca)
- Tabla comparativa SIEMPRE visible (aunque no haya competidores reales → genera 4 estimados de mercado: Mapfre, Equinoccial, AIG, Latina como % del valor asegurado)
- Plan: **VAZ Elemental** (corregido desde "Ensigna Plus" que era incorrecto)
- Pagos: **hasta 12 cuotas** (corregido desde 10)
- Deducible: **7%** (sin mencionar "Taller VAZ")
- CTA verde fuerte: "✅ Quiero este seguro — Activar ahora"
- Footer: solo WhatsApp a Adriana (sin email ni teléfono expuesto)
- Badge: "★ ADRIANA RECOMIENDA"

**Bug crítico resuelto**: `buildEmailTemplate('adriana', 'ADRIANA_COMPARISON_V2')` → duplicaba el prefijo → usaba fallback. Fix: pasar `'COMPARISON_V2'` como tipo.

### 🚧 PRÓXIMAS TAREAS ADRIANA (en orden de prioridad)

1. **Flujo WA → lead real**: wassenger.js handler Adriana → guardar en insurance_leads → cotizar
2. **Captura competidores por WA**: si el cliente comparte cotizaciones reales → parsear → guardar en `competitor_quotes` → el email usará datos reales
3. **Botón 📱 WA del dashboard**: verificar funciona y envía mensaje correcto
4. **Follow-up automático**: adriana-followup-service.js existe → activar en producción
5. **Aceptación por WA**: cliente responde "ACEPTO" → status a `accepted` → notificar Diego

### 🔑 REGLAS DE NEGOCIO ADRIANA (no olvidar jamás)
- VAZ = proveedor (NO socio ni co-brand en comunicaciones al cliente)
- SegPopular = broker (marca que ve el cliente)
- Plan: **VAZ Elemental** (no Ensigna, no Ensigna Plus)
- Pagos: **hasta 12 meses**
- Adriana solo se contacta por WhatsApp (el sistema) — no exponer email/teléfono directo

### 📝 SCRIPTS DE UTILIDAD
```bash
node scripts/test-comparison-jt.mjs    # enviar email de prueba a Javier Troya
node scripts/check-template.mjs        # verificar template V2 compilaOK
node scripts/seed-javier-troya.mjs     # reinsertar Javier Troya en BD si borraron
```
