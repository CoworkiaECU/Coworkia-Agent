# ✈️ Plan de Vuelo — Aurora Fixes + Consolidación (09 Abr 2026)
**Status**: ✅ COMPLETADO  
**Producción**: v1237 — `2654b86`  
**Última sesión**: 09 Abr 2026  
**Modo**: Torre de Control (6 rondas, 3 chats paralelos)

---

## 🎯 OBJETIVO
Fixes urgentes desde screenshots WA + consolidación de duplicados + tests

---

## 🔧 RONDA 1 — FIXES URGENTES (WA Reminders)

### R1.1 — Dirección falsa eliminada
- [x] Eliminar "Av. 12 de Octubre N24-562 y Cordero" de aurora-followup-service.js
- [x] Eliminar de email-template-system.js
- [x] Eliminar de email-reply-reader.js
- [x] Reemplazar por dirección real: Whymper 403 y Av. Coruña

### R1.2 — Parking/estacionamiento eliminado
- [x] Eliminar "Estacionamiento disponible" de todos los reminders

### R1.3 — Labels de servicio
- [x] Fix "meetingRoom" → "Sala de Reunión" en reminders
- [x] Implementar getServiceLabel() en aurora-followup-service.js

### R1.4 — Prefijos @aurora/@gabi
- [x] Eliminar @aurora del reminder 10min (mensaje directo al cliente)
- [x] Eliminar @gabi del WA de confirmación de pago en dashboard

### R1.5 — Maps link + opciones de pago
- [x] Agregar link Google Maps en reminder D-1
- [x] Agregar opciones de pago en payment reminder

**Commits**: `d518962`, `c0f3b3d`, `87b0f57`

---

## 🔧 RONDA 2 — EMAILS + D+3

- [x] Fix dirección en emails (template-system + reply-reader)
- [x] Fix dirección en D+3 follow-up
- [x] Verificar dashboards Aurora + Aluna

**Commits**: `53db48d`, `13cd1f6`
**Deploy**: v1231

---

## 🔧 RONDA 3 — ANTI-SPAM + ALUNA INTENT

- [x] Email From consistency: agent-aware names (AGENT_FROM_NAMES)
- [x] SPF fix: noreply→gmail en payment-receipt-email.js
- [x] Aluna: verificar intent detection post-fix v1222

**Commit**: `47d20d6`
**Deploy**: v1232

---

## 🔧 RONDA 4 — INVESTIGACIÓN

- [x] Auditoría duplicados Aurora → `auditoria-duplicados-09abr.md`
- [x] Auditoría tests Aurora → identificados 105 failures

---

## 🔧 RONDA 5 — TESTS + CONSOLIDACIÓN

- [x] Fix 72 tests (databaseService.initialize mock pattern)
- [x] Crear `src/utils/constants.js` (COWORKIA_ADDRESS, COWORKIA_MAPS_URL)
- [x] Crear `src/utils/service-labels.js` (getServiceLabel centralized)
- [x] Migrar aurora-followup, dashboard, email-reply-reader, etc. a constants
- [x] Fix remaining test failures (26 tests)

**Commits**: múltiples, deploy v1236

---

## 🔧 RONDA 6 — SÁBADOS + ÚLTIMOS TESTS

- [x] Saturday on-demand: bloquear efectivo, solo transferencia
- [x] Alerta urgente WA a Diego cuando cliente paga reserva de sábado
- [x] Migrar más archivos a constants (confirmation-flow, payment-receipt-email, google-calendar)
- [x] Resolver TODOS los 26 test failures restantes → 780/795 passing, 0 failures

**Deploy**: v1237 — `2654b86`

---

## 📋 PENDIENTE (próxima sesión)

- [x] Plan 08abr: alternativas inteligentes (usuario elige "3" → aplicar slot)
- [x] Plan 08abr: multi-hotdesk ("somos 3, necesitamos 3 hot desks")
- [ ] ~30 archivos con "Whymper 403" hardcoded (frontend + i18n) → migrar a constants
- [ ] 15 tests skipped → evaluar si recuperables
- [ ] Consolidar: 13 copias de formatDate, 9 WA message bypasses
