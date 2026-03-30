# Plan de Vuelo: Aluna — Automatizaciones + Wiring Completo

**Fecha**: 28 Mar 2026  
**Última actualización**: 29 Mar 2026 — fix seguridad pagos + wiring Gabi  
**Objetivo**: Llevar Aluna de 70% a 100% — crons automáticos, fix BD, dashboard automations  
**Prioridad**: HIGH  
**Status**: 🟡 En progreso (pagos fixed, Gabi wired, pendiente auto-capture)  
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
- [x] **C1** — Auto-captura leads: wired `captureAlunaLeadFromKeywords()` en flujo Wassenger cuando Aluna no maneja mensaje (30 Mar 2026, commit `72a9802`)
- [x] **C2** — Integrado: captura corre antes del LLM, anti-duplicados verificados, deploy OK
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

---

## 🔧 HOTFIX SESSION — 29 Mar 2026

### Fix Seguridad Pagos Dashboard + Wiring Gabi — commits `3de4429` v1171, `8608ea1` v1173

**Problema reportado por Diego:**
- Al registrar pago desde dashboard, Gabi NO enviaba recibo (proceso incompleto)
- Campos de pago seguían editables después de "Registrar Pago" (riesgo de seguridad)
- Email llegaba como "Recibo de reserva" (Aurora) en vez de recibo de Gabi

**Causa raíz (3 bugs):**
1. INSERT en `membership_payments` faltaba `transaction_number` (NOT NULL) → error 500 silencioso
2. Endpoint reimplementaba flujo simplificado en vez de llamar `approveLead()` completo
3. `lead.full_name` no existe — la columna es `client_name` → nombres `undefined` en emails

**Fixes aplicados:**
- [x] **F1** — Agregar `transaction_number` al INSERT de `membership_payments` (usa paymentId)
- [x] **F2** — Reemplazar lógica inline por `approveLead()` del sistema de verificación
  - Ahora ejecuta proceso COMPLETO: Gabi receipt + Aluna welcome + WiFi code + Calendar + Pipeline
- [x] **F3** — Fix `lead.full_name` → `lead.client_name` en 4 archivos:
  - `payment-receipt-email.js` (prepareReceiptData)
  - `membership-payment-verification.js` (blockMembershipCalendar)
  - `aluna-welcome-email.js` (subject + template + logs)
- [x] **F4** — Frontend: bloqueo INMEDIATO de todos los inputs al hacer clic
  - Inputs se deshabilitan + opacity 0.5 antes del fetch
  - Al éxito: editor reemplazado con badge inmutable "✅ Pagado $XX.XX"
  - Solo se re-habilitan si hay error
  - Backend ya rechaza pagos duplicados (status check accepted/active → 409)
- [x] **F5** — Export `approveLead` desde `membership-payment-verification.js`
- [x] **F6** — Deploy v1173 exitoso ✅

---

## 📝 PENDIENTE
- ~~C1-C2: Lead auto-capture desde conversaciones~~ ✅ Completado 30 Mar 2026, commit `72a9802`
- Tabla `aluna_prospect_followups` puede removerse en futuro cleanup (deprecated)
- Probar pago completo desde dashboard con lead real para verificar Gabi + Welcome + WiFi + Calendar
