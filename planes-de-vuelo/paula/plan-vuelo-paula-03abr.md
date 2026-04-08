# ✈️ Plan de Vuelo — Paula Inmobiliaria (03-05 Abr 2026)
**Status**: � B1-B4 + D1/D3 completados — Falta: C1-C3 dashboard + D2 Xiaomi  
**Producción**: pendiente deploy  
**Última sesión**: 08 Abr 2026 — Branding navy + co-brand removed  
**Commits**: `262ffcd` (A1-A4), `eb65ea0` (B1/B2/D1/D3)

---

## 🔍 AUDITORÍA COMPLETA (03 Abr 2026)

### 🔴 CRÍTICO — No funciona en producción

| # | Issue | Archivo | Impacto |
|---|-------|---------|---------|
| C1 | **Follow-up cron NO inicializado** — `processPaulaFollowUps()` nunca se llama | `index.js` — falta import + start | Follow-ups 24h, 3d, y recordatorio visita NUNCA se envían |
| C2 | **Todos los links de propiedades = PENDIENTE** — 5/5 links `PENDIENTE_AGREGAR_LINK` | `paula-casas-links.js` L15-60 | Clientes no reciben fotos/Drive cuando preguntan |
| C3 | **Email brochure usa SMTP global** — sale de `coworkia.ec@gmail.com` | `paula-cotizacion-email.js` L17 | No hay marca PropElite en el remitente |
| C4 | **CC brochure va a coworkia.ec@gmail.com** — debería ir a email de Diego/PropElite | `paula-cotizacion-email.js` L17 | Diego no recibe copia en buzón correcto |
| C5 | **`ensureInitialized()` en vez de `initialize()`** en followup + dashboard | Varios archivos | Anti-pattern — funciona pero es incorrecto |

### 🟡 MEDIO — Funciona pero incompleto

| # | Issue | Archivo | Impacto |
|---|-------|---------|---------|
| M1 | **Follow-ups son solo WhatsApp** — no hay email follow-up | `paula-followup-service.js` | Leads sin teléfono no reciben seguimiento |
| M2 | **Template brochure no tiene versión para follow-up email** | — | Solo existe el brochure inicial por boss command |
| M3 | **Lead scoring UAFE no se integra al flujo** | `paula-lead-scoring.js` | Score se calcula pero no influye en priorización ni mensajes |
| M4 | **Dashboard no muestra lead score** | `paula-inmobiliaria.html` | No hay indicador visual de Hot/Warm/Cold |
| M5 | **Visitas confirmadas no sincronizan a Google Calendar** en producción | `paula-visit-scheduler.js` | Calendar integration existe pero no verificada |
| M6 | **Brochure email usa ecosistema Coworkia en footer** | `paula-cotizacion-email.js` | Co-brand innecesario para PropElite |

### 🟢 FUNCIONAL — OK en producción

| Componente | Estado |
|-----------|--------|
| Dashboard HTML | ✅ 7 statuses, filtros, pipeline visual |
| API endpoints | ✅ CRUD + stats + send-wa |
| Agent WA @paula | ✅ 6 idiomas, personalidad, knowledge base |
| Boss command brochure | ✅ Email HTML de lujo enviado |
| Visit scheduler | ✅ Código completo con calendar sync |
| Lead scoring UAFE | ✅ 200pts anti-lavado |
| Catálogo propiedades | ✅ 4 casas + overview (data completa) |

---

## 🎯 PLAN DE EJECUCIÓN

### BLOQUE A — Fixes Críticos (activar lo que ya existe)

- [x] **A1** — Activar follow-up cron en `index.js` (05 Abr)
  - `paula-followup-cron.js` creado (patrón adriana-followup-cron.js)
  - Import + start en index.js
  - Commit: `262ffcd`

- [x] **A2** — Fix `ensureInitialized()` → `initialize()` en paula-followup-service.js (05 Abr)
  - Todas las instancias corregidas
  - Commit: `262ffcd`

- [x] **A3** — Configurar SMTP/CC dedicado Paula (05 Abr)
  - Env vars: PAULA_SMTP_USER, PAULA_CC_EMAIL
  - Defaults razonables si no configurado
  - Commit: `262ffcd`

- [x] **A4** — Links de propiedades en paula-casas-links.js (05 Abr)
  - 5 links placeholder https://propelite.ec/propiedad/[slug]
  - Diego los reemplazará con URLs reales
  - Commit: `262ffcd`

### BLOQUE B — Emails follow-up (no solo WhatsApp)

- [x] **B1** — Crear template email follow-up 24h Paula
  - ✅ Ya existía en email-templates-paula.js L487
  - Branding actualizado: olive → navy (#1A2744/#2D3748)
  - Commit: `eb65ea0`

- [x] **B2** — Crear template email follow-up 3d Paula
  - ✅ Ya existía en email-templates-paula.js L600
  - Branding actualizado a navy
  - Commit: `eb65ea0`

- [x] **B3** — Crear template email recordatorio visita 24h
  - ✅ Ya existía en email-templates-paula.js L708
  - Branding actualizado a navy (incluído en batch)

- [x] **B4** — Integrar envío dual (WA + email) en processPaulaFollowUps()
  - ✅ Ya implementado: WA + email para D+1, D+3, y visit reminder
  - paula-followup-service.js ya importa y usa generateFollowUp24hEmail/3dEmail

### BLOQUE C — Dashboard + Lead Scoring visual

- [ ] **C1** — Integrar lead score en pipeline del dashboard
  - Mostrar badge 🔥 Hot / 🌡️ Warm / ❄️ Cold junto al nombre
  - Score numérico en detalle del lead
  - Ordenar leads por score (priorización inteligente)

- [ ] **C2** — Agregar indicador de follow-ups enviados
  - Mostrar: ✅ Brochure → ✅ Follow-up 24h → ⏳ 3d pendiente
  - Timeline visual del lifecycle del lead

- [ ] **C3** — Botón "Enviar brochure" desde dashboard
  - Seleccionar propiedad del catálogo
  - Generar y enviar brochure directo sin boss command

### BLOQUE D — Limpieza de template brochure

- [x] **D1** — Remover co-brand Coworkia del footer del brochure
  - ✅ ecosistemaTable() eliminado, import removido
  - Footer PropElite limpio con contacto directo
  - Commit: `eb65ea0`

- [ ] **D2** — Verificar compatibilidad Xiaomi/MIUI del brochure
  - Sin linear-gradient sin fallback
  - Sin sombras complejas
  - Viewport-safe

- [x] **D3** — Verificar que FROM del brochure muestre "Paula · PropElite"
  - ✅ AGENT_FROM_NAMES.paula = 'Paula · PropElite Bienes Raíces'
  - PE_FROM_EMAIL usa PAULA_SMTP_USER o DEFAULT_FROM_EMAIL
  - Commit: `eb65ea0`

### BLOQUE E — Verificación e2e producción

- [ ] **E1** — Test: Boss command → brochure email → lead en dashboard
- [ ] **E2** — Test: @paula conversación → lead capture → follow-up 24h
- [ ] **E3** — Test: Agendar visita → recordatorio 24h antes
- [ ] **E4** — Test: Dashboard → filtros → WhatsApp → status update
- [ ] **E5** — Verificar Google Calendar sync con visita real

---

## 📋 PRIORIZACIÓN

| Prioridad | Tarea | Esfuerzo | Impacto |
|-----------|-------|----------|---------|
| 🔴 P0 | A1 — Activar follow-up cron | 30min | CRÍTICO — feature muerta |
| 🔴 P0 | A2 — Fix ensureInitialized | 10min | Correctitud |
| 🔴 P0 | A3 — CC email correcto | 10min | Diego recibe copias |
| 🟡 P1 | B1-B4 — Email follow-ups | 2h | Alto — leads con email |
| 🟡 P1 | D1 — Remover co-brand Coworkia | 30min | Branding correcto |
| 🟡 P1 | D3 — FROM email correcto | 10min | Branding |
| 🟢 P2 | C1 — Lead score en dashboard | 1h | Priorización visual |
| 🟢 P2 | C2-C3 — Dashboard enhancements | 1.5h | UX |
| 🔵 P3 | A4 — Links propiedades | Bloqueado | Necesita URLs de Diego |
| 🔵 P3 | E1-E5 — Tests e2e | 1h | Calidad |

---

## 🧩 ARCHIVOS CLAVE

| Archivo | Función |
|---------|---------|
| `src/servicios/paula-followup-service.js` | 3 follow-ups (24h, 3d, reminder) — **NO ACTIVADO** |
| `src/servicios/paula-cotizacion-email.js` | Boss command → brochure email HTML |
| `src/servicios/email-templates-paula.js` | Template confirmación de visita |
| `src/servicios/paula-visit-scheduler.js` | Agendar visita + Google Calendar |
| `src/servicios/paula-lead-scoring.js` | UAFE scoring 200pts |
| `src/servicios/paula-casas-links.js` | Links Drive propiedades — **TODOS PENDING** |
| `src/servicios/paula-confirmation-helper.js` | SI/NO detection, date parsing |
| `src/database/paulaRepository.js` | DB access (leads, visits) |
| `src/express-servidor/endpoints-api/paula-dashboard.js` | API endpoints dashboard |
| `public/paula-inmobiliaria.html` | Dashboard UI |
| `src/deteccion-intenciones/paula.js` | Agent personality + WA flow |
| `src/express-servidor/index.js` | **Falta**: import paula cron |
