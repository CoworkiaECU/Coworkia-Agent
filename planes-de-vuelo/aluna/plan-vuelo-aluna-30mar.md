# ✈️ Plan de Vuelo — Aluna (30 Mar 2026)
**Status**: 🟢 Operativo — 100% funcional  
**Producción**: v1184  
**Última sesión**: 30 Mar 2026

---

## 📊 ESTADO ACTUAL

### ✅ Operativo
- Dashboard completo (pipeline, stats, memberships, payments, automations tab)
- 6 automatizaciones activas: D+1, D+3, Renewal 25d, Renewal 30d, VisionAI Payment, Email Replies
- Lead auto-capture desde conversaciones WA (v1179, `captureAlunaLeadFromKeywords`)
- Pago híbrido (efectivo + canje autorizado por Diego)
- Email Reply Reader IMAP (polling cada 10min)
- Payment verification VisionAI en tiempo real
- Security fix: lock payment input + confirm dialog

### ✅ COMPLETADO ESTA SEMANA
- [x] Lead auto-capture en flujo Wassenger (commit `72a9802`)
- [x] Tab Automatizaciones dashboard + API stats (commit `8f652ba`)
- [x] Payment security — approveLead wiring + field lockdown (commit `3de4429`)
- [x] transaction_number NOT NULL + client_name in welcome email (commit `8608ea1`)
- [x] Renewal reminders 1 día antes expiración (commit `6c8ff61`)

### 🟡 PENDIENTE (próxima sesión)
- [ ] **P1** — Todo #42: Tests LOPDP — simulaciones y toma de datos si ya es cliente recurrente
- [ ] **P2** — Todo #43: Auditar sistema autoregenerativo / autotraining
- [ ] **P3** — Mejorar auto-capture: detect high-intent phrases más allá de keywords
- [ ] **P4** — Dashboard: gráfico de conversión mensual (leads → miembros activos)
- [ ] **P5** — Renewal reminders: agregar opción de upgrade plan en el email

---

## 📈 MÉTRICAS SISTEMA
- Follow-ups enviados: 29 D+1, 23 D+3
- Email replies procesados: activo (polling 10min)
- Renewal reminders: activo (cron diario 9am)
