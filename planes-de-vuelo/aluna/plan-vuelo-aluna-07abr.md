# ✈️ Plan de Vuelo — Aluna AUDITORÍA URGENTE (07 Abr 2026)
**Status**: ✅ COMPLETADO  
**Producción**: v1222 (A1 deployed) — pendiente deploy de audit fixes  
**Última sesión**: 07 Abr 2026
**Commits**: `db0fc32` (A1 keywords), `32cdc82` (B1-B3 audit fixes)

---

## 🚨 PROBLEMA DETECTADO

**Patrón idéntico a Aurora**: Keywords demasiado amplios en wassenger.js capturan mensajes que NO son de membresía y los meten al flujo de Aluna incorrectamente.

**Keyword problemático**: `"planes"` en `_alunaKeywords` (línea ~2246) — cualquier mensaje con "planes" activa el flujo de membresía, incluso si el usuario habla de planes de reserva u otra cosa.

**Agravante**: Existen DOS listas de keywords divergentes:
1. `wassenger.js` línea ~2246 (genérica, peligrosa)
2. `src/deteccion-intenciones/detectar-intencion.js` línea ~17 (similar)
3. `src/servicios/aluna-membership-flow.js` línea ~90 (BUENA — usa regex con contexto)

La detección inteligente de `aluna-membership-flow.js` NUNCA se usa porque los keywords genéricos de wassenger.js ya capturaron el mensaje antes.

---

## 🔧 BLOQUE A — HOTFIX INTENT DETECTION (CRÍTICO)

### A1 — Fix _alunaKeywords en wassenger.js
- [x] **A1.1** — Abrir `src/express-servidor/endpoints-api/wassenger.js` línea ~2246
- [x] **A1.2** — ELIMINAR `"planes"` de `_alunaKeywords` — es demasiado genérico
- [x] **A1.3** — Dejar keywords específicos SOLO: `'membresía', 'membresias', 'membresías', 'membresia', 'plan mensual', 'planes mensuales', 'plan 10', 'plan 20', 'plan10', 'plan20'`
- [x] **A1.4** — Verificar `detectar-intencion.js` tiene mismos keywords (sync)

### A2 — Verificar guards de membership-flow.js
- [x] **A2.1** — Confirmar que `aluna-membership-flow.js` línea ~145 tiene guards para Aurora keywords ("hot desk", "reservar", "sala", "pago") ✅ L76 con 12 keywords
- [x] **A2.2** — Confirmar handoff Aurora→Aluna y viceversa funciona correctamente ✅ returns handled:false
- [x] **A2.3** — Verificar que `captureAlunaLeadFromKeywords` no captura false positives ✅ FIXED — keywords genéricos reemplazados

### A3 — Pruebas de regresión
- [ ] **A3.1** — Test: "qué planes tienen" → NO debe activar Aluna (es pregunta general)
- [ ] **A3.2** — Test: "quiero una membresía" → SÍ debe activar Aluna
- [ ] **A3.3** — Test: "info del plan 10" → SÍ debe activar Aluna
- [ ] **A3.4** — Test: "planes de pago para reserva" → NO debe activar Aluna
- [ ] **A3.5** — Test: "tengo un plan mensual, cuándo vence" → SÍ debe activar Aluna

---

## 🔧 BLOQUE B — VERIFICACIÓN DE FLUJO COMPLETO

### B1 — Lead capture
- [x] **B1.1** — Verificar que leads se capturan solo con intent real de membresía ✅ FIXED alunaRepository.js
- [x] **B1.2** — Revisar `captureAlunaLeadFromKeywords` — keywords genéricos reemplazados por específicos
- [x] **B1.3** — Confirmar que high-intent detector no genera false positives ✅ FIXED urgency keywords

### B2 — Follow-ups
- [x] **B2.1** — Verificar cron D+1 y D+3 sigue activo y bien configurado ✅ crons OK
- [x] **B2.2** — Revisar que follow-ups no se envían a leads capturados por false positive ✅ FIXED — agregado accepted/pending_payment/converted al NOT IN

### B3 — Dashboard
- [x] **B3.1** — Verificar dashboard Aluna muestra datos correctos ✅ automations/stats retorna 6 cards con SQL real
- [x] **B3.2** — Confirmar pipeline stages reflejan el flujo real ✅ usa temperatura (hot/warm/cold) calculada dinámicamente

---

## 📂 ARCHIVOS CLAVE

| Archivo | Qué hacer |
|---------|-----------|
| `src/express-servidor/endpoints-api/wassenger.js` ~L2246 | FIX _alunaKeywords — ELIMINAR "planes" |
| `src/deteccion-intenciones/detectar-intencion.js` ~L17 | SYNC keywords con wassenger.js |
| `src/servicios/aluna-membership-flow.js` ~L90 | Referencia — versión correcta con regex |
| `src/servicios/aluna-high-intent-detector.js` | Verificar false positives |
| `src/servicios/aluna-followup-service.js` | Verificar crons activos |

---

## ⚠️ REGLAS
- Commit con prefijo: `fix(aluna):`
- **NO deployar** — solo commit local. Torre de Control autoriza deploy.
- Reportar cuando termines Bloque A completo.
- Se puede combinar con Aurora en mismo chat (mismo archivo wassenger.js).
