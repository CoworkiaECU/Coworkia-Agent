# Plan de Vuelo: Aluna — Automatizaciones + Wiring Completo

**Fecha**: 28 Mar 2026  
**Última actualización**: 28 Mar 2026 — sesión superpoderes Aluna  
**Objetivo**: Llevar Aluna de 70% a 100% — crons automáticos, fix BD, dashboard automations  
**Prioridad**: HIGH  
**Status**: 🟡 En progreso (2 features nuevas deployadas hoy)  
**Chat asignado**: Chat izquierdo (Aluna)

---

## 📊 ESTADO ACTUAL

**✅ Funcionando:**
- Dashboard excelente (18+ endpoints API, pipeline, stats)
- Email templates D+1 y D+3 ya existen
- Membership flow desde WhatsApp
- High-intent detector
- Payment verification con VisionAI (tabla lista)
- **🆕 Sistema de pagos híbridos (efectivo + canje)** — v1166, commit `9af6065`
- **🆕 Email Reply Reader IMAP** — v1167, commit `866ac76`

**❌ Crítico pendiente:**
- 0 cron jobs propios de follow-ups (solo manuales desde dashboard)
- Tabla `aluna_prospect_followups` rota — queries fallan con error 400
- Sin renewal reminders automáticos
- Sin lead auto-capture desde conversaciones
- Sin sección Automatizaciones en dashboard

---

## ✅ COMPLETADO HOY (28 Mar 2026)

### Pago Híbrido (Efectivo + Canje) — commit `9af6065`, v1166
- [x] Keywords "diego villota autorizó" en `membership-payment-verification.js` (13 variantes)
- [x] `PATCH /api/aluna/memberships/:id/register-payment` — cashAmount, canjeAmount, canjeDescription
- [x] `GET /api/aluna/memberships/:id/payments` — historial con hybridData
- [x] UI dashboard: columna 💰 Pago inline con inputs cash/canje
- [x] Prompt Aluna WhatsApp actualizado con flujo de autorización
- [x] Deploy + verificado en producción ✅

### Email Reply Reader — commit `866ac76`, v1167  
- [x] `sendEmail()` genera Message-ID tracking: `coworkia-AGENT-REF@coworkia.ec`
- [x] Headers X-Coworkia-Agent y X-Coworkia-Ref en cada email saliente
- [x] `email-reply-reader.js`: polling IMAP Gmail, filtro 3 capas (replies + sistema + no auto-replies)
- [x] Routing por agente sin cruce de información
- [x] API `/api/email-replies`: poll, list, stats, respond, dismiss
- [x] Cron cada 10 min (`email-reply-cron.js`)
- [x] Registrado en `index.js` (router + cron boot)
- [x] Deploy + IMAP verificado en producción (`poll` OK, `stats` OK) ✅

---

## 🎯 BLOQUES DE TRABAJO

### BLOQUE A: Fix BD + Cron D+1/D+3 Automáticos (2h)

**Tareas:**
- [x] **A1** — Auditar tabla `aluna_prospect_followups` vs `membership_leads` — YA OK (service usa membership_leads)
- [x] **A2** — Fix `daily-report.js` queries que fallan en Aluna — migrado a `membership_leads` (commit `8f652ba`)
- [x] **A3** — ~~Crear~~ YA EXISTÍA `src/servicios/aluna-followup-cron.js` con D+1 10am + D+3 11am + stats 9am
- [x] **A4** — YA registrado en `index.js` boot sequence
- [x] **A5** — Verificado en producción ✅

### BLOQUE B: Renewal Reminders + Payment Automation (2h) — YA EXISTÍA TODO

**Tareas:**
- [x] **B1** — Cron renewal día 25 → `processMembershipRenewalReminders()` en `cron-scheduler.js` (9am diario)
- [x] **B2** — Cron renewal día 30 → incluido en misma función
- [x] **B3** — VisionAI verify → `processMembershipPayment()` en tiempo real vía WhatsApp
- [x] **B4** — Auto-activate → `approveLead()` ya activa membresía + email bienvenida + WiFi code + Calendar

### BLOQUE C: Lead Auto-Capture + Dashboard Automations (2h)

**Tareas:**
- [ ] **C1** — `captureAlunaLeadFromConversation()` — auto-crear lead cuando detecta interés en membresía (45 min)
- [ ] **C2** — Integrar en membership flow (15 min)
- [x] **C3** — Sección "Automatizaciones" en dashboard Aluna — commit `8f652ba`, v1169
  - Tab ⚙️ con cards grid responsive: D+1, D+3, Renewal 25d, Renewal 30d, Payment Verify, Email Replies
  - API: `GET /api/aluna/automations/stats` — datos reales: 29 D+1, 23 D+3
- [x] **C4** — Testing — API verificado, dashboard live ✅

### BLOQUE D: Testing + Deploy (1h) — COMPLETADO

**Tareas:**
- [x] **D1** — Syntax check ✅
- [x] **D2** — Deploy v1169 exitoso ✅
- [x] **D3** — API automations/stats responde con datos reales ✅
- [x] **D4** — Dashboard tab visible en producción ✅

---

## ⏱️ RESULTADO: Bloques A+B+C3+D completados en ~30min (la mayoría ya existía)

## 📝 PENDIENTE
- C1-C2: Lead auto-capture desde conversaciones (next session)
- Tabla `aluna_prospect_followups` puede removerse en futuro cleanup (deprecated)
