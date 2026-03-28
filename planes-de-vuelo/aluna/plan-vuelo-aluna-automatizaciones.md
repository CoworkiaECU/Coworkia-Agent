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
- [ ] **A1** — Auditar tabla `aluna_prospect_followups` vs `membership_leads` — resolver schema mismatch (30 min)
- [ ] **A2** — Fix `daily-report.js` queries que fallan en Aluna (15 min)
- [ ] **A3** — Crear `src/cron/aluna-followup-cron.js` con `startAlunaFollowupCrons()` (45 min)
  - `sendAlunaD1Followup()` — 24h después de interés, WA + email
  - `sendAlunaD3Followup()` — 72h después de D+1, WA + email FOMO
- [ ] **A4** — Registrar crons en `index.js` boot sequence (15 min)
- [ ] **A5** — Test + verify en logs (15 min)

### BLOQUE B: Renewal Reminders + Payment Automation (2h)

**Tareas:**
- [ ] **B1** — Cron renewal reminder día 25 (30 min)
  - Query: miembros activos cuyo último pago fue hace 25 días
  - WA: "Tu membresía se renueva en 5 días"
- [ ] **B2** — Cron renewal reminder día 30 (urgent) (30 min)
  - WA: "Tu membresía vence hoy — renueva para mantener tu espacio"
- [ ] **B3** — Auto-verify payment receipts con VisionAI (30 min)
  - Cron que procesa `membership_payments` con `status='pending_verification'`
- [ ] **B4** — Auto-activate membership on verified payment (30 min)

### BLOQUE C: Lead Auto-Capture + Dashboard Automations (2h)

**Tareas:**
- [ ] **C1** — `captureAlunaLeadFromConversation()` — auto-crear lead cuando detecta interés en membresía (45 min)
- [ ] **C2** — Integrar en membership flow (15 min)
- [ ] **C3** — Sección "Automatizaciones" en dashboard Aluna (similar a Aurora) (45 min)
  - Cards: D+1, D+3, Renewal 25d, Renewal 30d, Payment Verify
  - API endpoint `/api/aluna/automations/stats`
- [ ] **C4** — Testing end-to-end (15 min)

### BLOQUE D: Testing + Deploy (1h)

**Tareas:**
- [ ] **D1** — Syntax check todos los archivos modificados (10 min)
- [ ] **D2** — Verificar crons en logs post-deploy (10 min)
- [ ] **D3** — Verificar API automations/stats responde (10 min)
- [ ] **D4** — Verificar dashboard muestra cards de automatización (10 min)

---

## ⏱️ ESTIMACIÓN TOTAL: ~7h (4 bloques)

## 📝 NOTAS
- Ya existen email templates: `buildAlunaD1HTML()`, `buildAlunaD3HTML()` — reutilizar
- Ya existe `sendEmail()` + `buildEmailTemplate()` — reutilizar
- Ya existe patrón de cron en `aurora-followup-cron.js` — seguir mismo patrón
- Tabla `membership_leads` es la fuente de verdad (no `aluna_prospect_followups`)
