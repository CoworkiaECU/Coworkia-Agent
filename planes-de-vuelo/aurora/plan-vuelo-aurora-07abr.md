# ✈️ Plan de Vuelo — Aurora AUDITORÍA URGENTE (07 Abr 2026)
**Status**: � Hotfixes deployed v1226 + audit 08 Abr  
**Producción**: v1226  
**Última sesión**: 08 Abr 2026

---

## 🚨 BUG DETECTADO EN PRODUCCIÓN

**Síntoma**: Usuario pregunta "donde quedan ubicados" → Aurora responde con menú de espacios ("¿Qué espacio necesitas?") en vez de dar la dirección. Se repitió 2 veces seguidas.

**Root Cause**: `isReservationIntent()` en wassenger.js incluye keywords genéricos ("donde", "ubicación", "horario", "información") que NUNCA deberían activar el form de reserva. Cualquier pregunta informativa cae al form.

**Impacto**: Aurora es INÚTIL para preguntas generales — solo funciona si el usuario quiere reservar directamente.

---

## 🔧 BLOQUE A — HOTFIX INTENT DETECTION (CRÍTICO)

### A1 — Fix isReservationIntent() en wassenger.js
- [x] **A1.1-A1.5** — ✅ DEPLOYED v1226. questionKeywords eliminados, solo reservationKeywords: reserva/reservar/hot desk/sala de reuniones/quiero venir/quiero reservar

### A2 — Pruebas de regresión intent (code audit 08 Abr)
- [x] **A2.1** — ✅ "donde quedan ubicados" → isReservationIntent=FALSE → LLM → prompt tiene sección UBICACIÓN con Whymper 403
- [x] **A2.2** — ✅ "qué horarios tienen" → isReservationIntent=FALSE → LLM → prompt tiene horarios Lun-Vie 8:30-18h
- [x] **A2.3** — ✅ "cuánto cuesta" → isReservationIntent=FALSE → LLM → prompt tiene precios $10/2h, $29/2h
- [x] **A2.4** — ✅ "quiero reservar hot desk" → matches 'reservar' + 'hot desk' → form activates
- [x] **A2.5** — ✅ "sala de reuniones para mañana" → matches 'sala de reuniones' → form activates
- [x] **A2.6** — ✅ "qué servicios tienen" → isReservationIntent=FALSE → LLM responde

### A3 — Auditar respuesta del orquestador para preguntas generales
- [x] **A3.1** — ✅ System prompt incluye: Whymper 403, Lun-Vie 8:30-18h, $10/2h HD, $29/2h Sala, cerrado fines de semana, link mapa
- [x] **A3.2** — ✅ Cuando isReservationIntent=false, `_shouldForm=false` → mensaje llega al orquestador/LLM sin bloqueos
- [x] **A3.3** — ✅ No hay interceptores adicionales — flujo: filters → debounce → _shouldForm=false → procesarMensaje() → complete()

---

## 🔧 BLOQUE B — VALIDACIONES PENDIENTES (desde 30 Mar)

- [x] **B1 (V1)** — ✅ Code trace completo 08 Abr: extractDataFromMessage parsea spaceType/date/time/duration correctamente. Alternativa "3" funciona (pendingAlternatives + return inmediato). Precio sala 2h: $29 base + IVA
- [x] **B2 (V2)** — ✅ Early availability check funciona: L1346-1430 partial-reservation-form.js. Cuando slot no disponible: limpia form.time, genera alternativas con suggestAlternativeSlots(), NO pide paymentMethod
- [x] **B3 (V3)** — ✅ Alternativas preservan fecha: suggestAlternativeSlots() usa mismo `date` param. dateLabel muestra "hoy"/"mañana"/"el 7 de abr"
- [x] **B4 (V4)** — ✅ Boss commands: firstToken.toLowerCase() en L1849. Todos los regex de agentes usan /i flag. Sin bugs de case-sensitivity

---

## 🔧 BLOQUE C — MEJORAS PENDIENTES

- [x] **C1** — ✅ Efectivo YA es visible en form: L371 `💵 Efectivo` en getNextQuestion(). Pricing: solo +15% IVA (sin card fee)
- [ ] **C2** — Horario sábado: config vs partial-reservation-form.js (decisión Diego)
- [x] **C3** — ✅ Mensajes de alternativas YA incluyen contexto: `_dateLabelForAlts()` genera "hoy de 15:00 a 17:00" en ambos paths (validación y availability)

---

## 📂 ARCHIVOS CLAVE

| Archivo | Qué hacer |
|---------|-----------|
| `src/express-servidor/endpoints-api/wassenger.js` ~L1379 | FIX isReservationIntent() — ELIMINAR keywords genéricos |
| `src/servicios/wassenger/validation.js` ~L57 | Referencia — versión correcta con regex |
| `src/deteccion-intenciones/aurora.js` ~L200 | Verificar ubicación/horarios en prompt |
| `src/deteccion-intenciones/orquestador.js` | Verificar que recibe mensajes no-form |

---

## ⚠️ REGLAS
- Commit con prefijo: `fix(aurora):`
- **NO deployar** — solo commit local. Torre de Control autoriza deploy.
- Reportar cuando termines Bloque A completo.
