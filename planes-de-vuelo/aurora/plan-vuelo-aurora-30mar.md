# ✈️ Plan de Vuelo — Aurora (30 Mar 2026)
**Status**: 🔴 URGENTE — Flujo de reservas en campaña activa  
**Producción**: v1184 — `8d498fc`  
**Última sesión**: 30 Mar 2026

---

## 📊 ESTADO ACTUAL

### ✅ Operativo
- Dashboard completo (reservas, pagos, automatizaciones, manual booking)
- 9 automatizaciones cron activas (D+1, D+3, D+7, +1h, recordatorios, no-show, upsell)
- Payment flow: monto → check → Gabi recibo WA+email
- Permanent desks (Diego #1, Francisco #3) — capacity 6 total, 4 disponibles
- duration_hours NUMERIC(4,1) — soporta horas fraccionadas (5.5h)
- Early availability check ANTES de pedir paymentMethod (v1183)
- Form preservado cuando slot no disponible (no pierde fecha/email)
- Renewal reminders 1 día antes de expiración

### 🔴 CRÍTICO — Validar en producción
- [ ] **V1** — Probar reserva completa desde WhatsApp (sala reuniones hoy 3pm-7pm)
- [ ] **V2** — Confirmar que early availability check funciona (slot inválido NO pide pago)
- [ ] **V3** — Confirmar que alternativas preservan fecha al elegir nueva hora
- [ ] **V4** — Boss commands Enzo/Paula (fromStr.toLowerCase fix v1179)

### 🟡 PENDIENTE (próxima sesión)
- [ ] **P1** — Efectivo como método de pago: actualmente el form solo muestra tarjeta/transferencia en `getNextQuestion()`, pero el sistema SÍ acepta efectivo. Agregar opción visible.
- [ ] **P2** — Horario sábado: config dice 8:00-18:00 pero `partial-reservation-form.js` bloquea sábados como "cerrado". Decisión de Diego pendiente.
- [ ] **P3** — Email anti-spam Bloque 1 (TLS fix + From consistente) — plan existente sin ejecutar
- [ ] **P4** — Todo #55: Usuarios que responden emails en lugar de usar botones
- [ ] **P5** — Mejorar mensajes de alternativas: mostrar "hoy de 15:00 a 19:00" en vez de solo "15:00 - 19:00"

---

## 📈 DEPLOYS HOY (30 Mar)
| Versión | Commit | Descripción |
|---------|--------|-------------|
| v1179 | `b0b793a` | fix: duration_hours NUMERIC, email from object, totalPrice mapping |
| v1180 | `a4554ad` | feat: permanent desks + hot desk capacity 6 |
| v1181 | `b72aa03` | feat: script calendar permanent desks |
| v1182 | `6c8ff61` | feat: renewal reminders 1 day before expiration |
| v1183 | `65ea48c` | fix: availability check BEFORE payment, preserve form on failure |
| v1184 | `8d498fc` | fix: renewal email benefits (WiFi+café) + parking add-on |

---

## 🐛 BUGS RESUELTOS HOY
1. ✅ `duration_hours INTEGER` → `NUMERIC(4,1)` — reservas 5.5h fallaban
2. ✅ `email.js from` object → string — boss commands Enzo/Paula crasheaban
3. ✅ `total` vs `totalPrice` mismatch — reservas guardaban $0
4. ✅ Payment asked BEFORE availability — usuario perdía tiempo eligiendo pago
5. ✅ Form cleared on validation failure — usuario re-ingresaba todo desde 0
