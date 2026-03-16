# 🚀 Plan de Vuelo — 14 Marzo 2026
> Guía maestra diaria. Auditada y actualizada cada sesión.
> **Última actualización:** 15 Mar 2026 — P4b completado `08f6353` · **v948 en Heroku** ✅

---

## 🚨 DEPLOY: v948 EN HEROKU — NADA PENDIENTE

---

## ✅ COMPLETADO (cronológico)

| Sprint | Qué se hizo | Commit | Deploy |
|--------|------------|--------|--------|
| **F1–F5** `14 Mar` | Axel template migrado al genérico · isPos/isNeg unificado · code-generator centralizado (prefijos AXL/ADR/GAB/ENZ/PAU/ALU/AUR) · date-time-parser Ecuador UTC-5 · BaseRepository.js (-236 líneas boilerplate) | `d8619df`→`v930` | ✅ |
| **Axel v2** `14 Mar` | CTAs persuasivos email/WA · Agendamiento taller (lenguaje natural "martes en la mañana") · Recordatorios automáticos 24h + 7d (cron lun-vie 10am, respeta horario Ecuador) | `f8b17b2`→`v930` | ✅ |
| **P1+P2** `14 Mar` | console.log DEBUG gateados · .DS_Store eliminados · carpeta data/ | `d20a799` | ✅ |
| **ML-1/2/3 + Fixes** `15 Mar` | 8 agentes × 6 idiomas · Language lock QU · Whisper excluye QU · Intro idiomas única por agente · handoff-messages 6 langs | `e82cc14`→`73d672f` | ✅ |
| **ML-5/6** `15 Mar` | Normalización full compat · REGLA CRÍTICA #1/2/3 · ADAPTACIÓN CULTURAL 6L · Whisper blockedMessages 6 idiomas · QU → auto-detect nativo | `88b4524`→`ab77af0` | ✅ |
| **ML-4** `15–16 Mar` | `email-i18n.js` (961L) · 7 namespaces × 5 idiomas (aluna/gabi/axel/enzo/proforma/adriana/paula) · generateEmailForAgent propaga `userLanguage` | `076d56f` | ✅ |
| **P3 Auditoría** `16 Mar` | 12 archivos · 5,515 líneas · mapa arquitectural · C1-C4/D1-D2/I1/M1-M5 identificados | — | — |
| **P3-REFACTOR** `17 Mar` | Enzo C1 · Adriana C2 · Paula D1 (3 templates bare → PropElite CSS) · Axel M3 dirección · M1 copyright dinámico | `6b73aa0` | ✅ |
| **ML-4b + I1** `17 Mar` | i18n Adriana + Paula (18/15 strings) · payment-receipt Gmail→Resend · 12 archivos email = 1 infra | `7451bf9`→`v946` | ✅ |
| **P4 + P4b** `15 Mar` | display:grid (3 casos) → table · display:flex (10 casos) → table · meta color-scheme 5 templates · typo border-rounded | `df24767`+`08f6353`→`v948` | ✅ |

---

## 🗺️ ARQUITECTURA EMAIL — REFERENCIA PERMANENTE

| Agente | Bot flow (genérico) | Boss-cmd / VisionAI | Scheduler / Receipts | Estado |
|--------|--------------------|--------------------|----------------------|--------|
| **Aluna** | `generateAlunaEmailHTML` ✅ i18n | `aluna-proforma-email.js` → genérico ✅ | — | 🟢 |
| **Gabi** | `generateGabiEmailHTML` ✅ i18n | `gabi-cotizacion-email.js` → genérico ✅ | `payment-receipt-email.js` ✅ Resend | 🟢 |
| **Enzo** | `generateEnzoEmailHTML` ✅ i18n | `_enzoProposalHTML` en genérico `{ type:'proposal' }` ✅ | — | 🟢 |
| **Adriana** | `generateAdrianaEmailHTML` ✅ i18n | `_adrianaQuoteHTML` en genérico `{ type:'quote' }` ✅ | — | 🟢 |
| **Axel** | `generateAxelEmailHTML` ✅ i18n | `generateQuoteEmailHTML()` VisionAI async+fotos (intencional) | reminders 24h+7d ✅ | 🟡 |
| **Paula** | `generatePaulaEmailHTML` ✅ i18n | `paula-cotizacion-email.js` brochure El Morenal (intencional) | `email-templates-paula.js` 4 templates ✅ | 🟢 |
| **Aurora** | `generateAuroraEmailHTML` | — | — | 🔵 sin auditar |
| **Angela** | — | — | — | 🔵 sin templates |

**Deferred intencional (no tocar):**
- Axel VisionAI: async + sharp + fotos CID — arquitectura diferente por diseño
- Paula brochure El Morenal: catálogo con branding propio
- Photo grid Axel `display:grid` → fotos apiladas en Gmail (degradación aceptable)

---

## ⏳ PENDIENTE

### 🛑 P6 — Bloqueado por cliente
- **AXEL:** Tarifario oficial The PaintBull → actualmente usa precios demo
- **PAULA:** Links Drive 5 propiedades (Casa 1, 3, 6, 7, Generales) → brochure El Morenal incompleto
- **ALUNA:** ¿Tour post-pago → Google Calendar o recordatorio WA? → `membership-payment-verification.js`

---

### 🎤 Whisper multiagente — routing pendiente
**Problema:** Audio transcrito SIEMPRE va a Aurora. No hay routing por agente.

```
Flujo actual:    Audio → Whisper → texto → Aurora (siempre)
Flujo propuesto: Audio → Whisper → texto → detectar @agente/contexto → agente correcto
```

**Cambio:** `wassenger.js` ~línea 1175 — intent detection post-Whisper.
- Con `@mención` → rutear al mencionado
- Conversación activa con agente → continuar ese agente
- Sin contexto → Aurora default

---

### 🧪 Tests: 13 fallando (7 suites)
Más crítico: `partial-form-regression.test.js` espera campo `paymentMethod` que ya no existe.
```bash
NODE_OPTIONS=--experimental-vm-modules npx jest --forceExit 2>&1 | grep -E "FAIL|●"
```

---

### 🔵 Menor pendiente
- **D2:** `contacto@propelite.ec` hardcodeado en footer Paula → cambiar a `noreply@coworkia.ec`
- **Aurora email:** `generateAuroraEmailHTML` no auditado en P3

---

### 🧠 Auto-aprendizaje (largo plazo — requiere decisión tuya)
Tres opciones: **(A)** Feedback Loop manual · **(B)** Fine-tuning mensual · **(C)** Vector store + RAG.
Roadmap 5 meses: datos → análisis → mejoras. Pendiente: elegir opción.

---

## 📧 CÓMO PROBAR TODOS LOS EMAILS
```bash
node scripts/preview-emails.mjs --open
# Genera 15 HTMLs en /tmp/email-previews/ y abre índice
# Redimensiona: 375px mobile · 600px Gmail · 1200px desktop
```

---

## 📋 HALLAZGOS P3 — REFERENCIA AUDITORÍA (16 Mar)

### Críticos (resueltos en P3-REFACTOR)
| # | Agente | Problema | Estado |
|---|--------|----------|--------|
| C1 | Enzo | Dos builders paralelos con diseños diferentes | ✅ `_enzoProposalHTML` en genérico |
| C2 | Adriana | Dos color schemes: azul+dorado vs teal estándar | ✅ `_adrianaQuoteHTML` en genérico |
| C3 | Axel | 3 templates + dirección taller inconsistente | ✅ M3 dirección unificada · VisionAI intencional |
| C4 | Paula | 3 sistemas separados con colores distintos | ✅ PropElite CSS · Brochure intencional |

### Deuda y Menores
| # | Detalle | Estado |
|---|---------|--------|
| D1 | Paula 3 templates bare sin CSS | ✅ PropElite CSS aplicado |
| D2 | `contacto@propelite.ec` hardcodeado footer Paula | ⏳ pendiente |
| M1 | `© 2026` hardcodeado Enzo | ✅ `new Date().getFullYear()` |
| M2 | Acento `#FFD700` vs `#00C2A0` Adriana boss-cmd | ✅ unificado |
| M3 | Dirección taller inconsistente Axel reminders vs quote | ✅ `Av. Gonzalo Escudero N44-53` |
| M4 | CTAs Enzo/Adriana boss-cmd hardcodeados en español | ✅ ML-4b i18n |
| M5 | payment-receipt usaba Gmail SMTP distinto al resto | ✅ I1 → Resend |

---

## 🐛 BUGS HISTÓRICOS RESUELTOS

| Bug | Causa | Fix |
|-----|-------|-----|
| Axel: "I'm sorry, I can't assist" en tabla trabajos | Faltaba `system` en `complete()` | Añadido + fallback desde `damages_by_panel` |
| Axel: secuencial siempre `PB-2026-001` | SQLite `LIKE ?` local sin code-generator.js | Importar `generateQuoteCode` centralizado |
| Axel: footer blanco en email cotización | `theme:'light'` | Footer dark ecosistema PaintBull |

---

*Próxima auditoría: inicio de cada sesión — actualizar COMPLETADO + PENDIENTE.*
