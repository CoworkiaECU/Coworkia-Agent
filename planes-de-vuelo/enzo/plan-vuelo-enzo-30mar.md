# ✈️ Plan de Vuelo — Enzo (30 Mar → 04 Abr 2026)
**Status**: 🟢 Operativo  
**Producción**: v1210  
**Última sesión**: 04 Abr 2026 — cierre de sesión

---

## 📊 ESTADO ACTUAL

### ✅ Completado (04 Abr)
- [x] Gemini 2.5 Flash thinking integrado (brief-generator + consulting-flow)
- [x] Fix: `_handleInitialMessage()` fallback cuando `decodeClientMessage()` retorna null
- [x] Fix: OneMind promo ya NO hijackea a Enzo cuando `activeAgent === 'ENZO'`
- [x] **Rewrite total system prompt** — "visión primero, preguntas después"
  - Eliminado: MODO IMPERIO, COMITÉ INVISIBLE, WAR MODE, proforma verbosa
  - Nuevo: propone solución concreta antes de preguntar, máx 1 pregunta a la vez
  - Prompt: 6715 → 3939 chars (41% más corto)
  - Idioma estricto (no más cambios random a portugués)
  - Ejemplos explícitos de respuestas correctas vs incorrectas
- [x] Deploy v1208 (OneMind fix + prompt cleanup)
- [x] Deploy v1209 (prompt rewrite completo)
- [x] **Bypass consulting flow** — conversaciones normales ahora van por orquestador con history
  - Consulting flow solo se activa con #PROCESS_FORM o state activo
  - Fix: Enzo ya NO intercepta mensajes para hacer interrogatorio mecánico
  - Conversation history se preserva entre mensajes
- [x] Deploy v1210 (consulting flow bypass)

### ✅ Operativo (previo)
- [x] Dashboard con botones D+1/D+3/D+7 wired (v1122)
- [x] Storytelling con ROI real 300-600% (v1122)
- [x] Follow-up cron D+2/D+7 activo
- [x] Boss command cotización (fix fromStr v1179)

### 🟡 PENDIENTE (para mañana)
- [ ] **P0** — Validar en WhatsApp que el nuevo Enzo engancha (test con caso LavaYá)
- [ ] **P1** — Todo #48: Mejorar sistema cotizaciones con OpenAI — más persuasivo
- [ ] **P2** — Todo #5: Follow-ups D+1/D+3/D+7 frontend — refinar UX botones
- [ ] **P3** — Boss command cotización validar en producción (bug fromStr fix)
- [ ] **P4** — Validar en WhatsApp que el nuevo prompt engancha mejor
