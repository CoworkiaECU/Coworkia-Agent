# ✈️ Plan de Vuelo — Paula Inmobiliaria (03 Abr 2026)
**Status**: 🟡 Auditoría + Correcciones — Sistema 85% operativo  
**Producción**: v1200  
**Última sesión**: 01 Abr 2026 — Dashboard arreglado para presentación  
**Agente**: Paula · PropElite Bienes Raíces

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

- [ ] **A1** — Activar follow-up cron en `index.js`
  - Crear `paula-followup-cron.js` (patrón de adriana-followup-cron.js)
  - Import + start en index.js
  - Horarios: 10:00 AM (24h brochure), 11:00 AM (3d re-engagement), 8:00 AM (reminder visita)

- [ ] **A2** — Fix `ensureInitialized()` → `initialize()` en paula-followup-service.js
  - Líneas 22, 47, 73, 91, 102 — cambiar todas

- [ ] **A3** — Configurar SMTP/CC dedicado Paula (si Diego tiene cuenta)
  - ❓ **PREGUNTA**: ¿Hay email paula@propelite.com o similar?
  - Si no → al menos CC a email correcto de Diego (no coworkia.ec@gmail.com)
  - Actualizar `PE_ADMIN_CC` en paula-cotizacion-email.js

- [ ] **A4** — Agregar links de propiedades en paula-casas-links.js
  - ❓ **PREGUNTA**: ¿Diego tiene los links de SharePoint/Drive de las casas?
  - Si no → poner placeholder informativo en vez de `PENDIENTE_AGREGAR_LINK`

### BLOQUE B — Emails follow-up (no solo WhatsApp)

- [ ] **B1** — Crear template email follow-up 24h Paula
  - Branding PropElite (gold #D4AF37 + navy #1A2744)
  - Incluir: resumen propiedad, link al brochure, CTA "Agendar visita"
  - Usar logo PropElite consistente

- [ ] **B2** — Crear template email follow-up 3d Paula
  - Mensaje de re-engagement con nuevas opciones
  - CTA: "Ver más propiedades" + WhatsApp directo

- [ ] **B3** — Crear template email recordatorio visita 24h
  - Datos de visita: propiedad, dirección, hora
  - Google Maps link, preparación para visita
  - CTA: "Confirmar" / "Reagendar"

- [ ] **B4** — Integrar envío dual (WA + email) en processPaulaFollowUps()
  - Si tiene email → enviar email
  - Si tiene phone → enviar WhatsApp
  - Si tiene ambos → ambos

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

- [ ] **D1** — Remover co-brand Coworkia del footer del brochure
  - Paula/PropElite es marca independiente
  - Reemplazar ecosistemaTable() con footer PropElite propio

- [ ] **D2** — Verificar compatibilidad Xiaomi/MIUI del brochure
  - Sin linear-gradient sin fallback
  - Sin sombras complejas
  - Viewport-safe

- [ ] **D3** — Verificar que FROM del brochure muestre "Paula • PropElite"
  - Actual: usa DEFAULT_FROM_EMAIL (email genérico)
  - Fix: usar email dedicado si existe, sino al menos nombre correcto

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
