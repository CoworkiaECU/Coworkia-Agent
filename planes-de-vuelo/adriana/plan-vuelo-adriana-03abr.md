# ✈️ Plan de Vuelo — Adriana (03-05 Abr 2026)
**Status**: 🟢 Bloques A+B+B5+B6+C1 completados  
**Producción**: pendiente deploy (commits locales)  
**Última sesión**: 05 Abr 2026 — Multi-quote seed + dashboard + conversational handler

---

## 📊 RESUMEN DE SESIÓN (03 Abr)

### ✅ Completado 03 Abr
- [x] SMTP dedicado `adriana@segpopular.com` (mail.segpopular.com:465)
- [x] CC automático a `info@segpopular.com` en todos los emails de Adriana
- [x] Env vars Heroku: ADRIANA_SMTP_USER, ADRIANA_SMTP_PASS, ADRIANA_SMTP_HOST, ADRIANA_SMTP_PORT, ADRIANA_CC_EMAIL, ADRIANA_EMAIL
- [x] Deploy v1200

### ✅ Completado 04 Abr
- [x] Gemini 2.5 Flash thinking integrado en `adriana-quote-generator.js` → `generateBrokerAnalysis()` con thinking (2K budget, 15s timeout, fallback OpenAI)
- [x] Gemini integrado en `enzo-brief-generator.js` y `enzo-consulting-flow.js`
- [x] `src/servicios-ia/gemini.js` creado (thinkingComplete, thinkingCompleteJSON, isGeminiAvailable)
- [x] `geminiBreaker` añadido a circuit-breaker.js
- [x] GEMINI_API_KEY configurado en Heroku (billing enabled, $300 credit, $5/month budget alert)
- [x] @google/generative-ai ^0.24.1 instalado
- [x] Deploy v1205-v1209

---

## 🔍 AUDITORÍA DE TEMPLATES — INVENTARIO COMPLETO

### Hay 4 templates distintos de Adriana activos en el sistema:

| # | Template | Archivo | Logo | Uso actual | Estado |
|---|----------|---------|------|------------|--------|
| 1 | **COMPARISON_V2** ✅ | `email-template-system.js` L1081 | `segpopular.png` (URL pública, filter invert para fondo azul) | Quote generator + Boss quote + Dashboard resend | **APROBADO** — template principal |
| 2 | **COMPARISON (V1 legacy)** | `email-template-system.js` L373 | Branding object (no logo directo) | Solo si alguien llama `buildEmailTemplate('ADRIANA', 'COMPARISON')` | ⚠️ LEGACY — considerar eliminar |
| 3 | **Generic quote** ⚠️ | `generic-email-templates.js` L18 `_adrianaQuoteHTML()` | `segpopular.png` vía **base64** (sin filter, logo oscuro sobre fondo dorado #FFD700) | Confirmación automática desde `insurance-confirmation.js` vía `generateEmailForAgent('ADRIANA')` | ⚠️ DISEÑO DIFERENTE — fondo dorado, co-brand Coworkia prominente, cuotas "×10" (error: debería ser ×12) |
| 4 | **Followup S1/S2/S3** | `adriana-followup-service.js` L107-196 | Sin logo — solo texto "🛡️ ADRIANA · SEGPOPULAR" | Cron automático D+1, D+3, D+7 | ✅ OK pero sin logo SegPopular |

### 🚨 PROBLEMAS DETECTADOS

1. **Template #3 (Generic) dice "×10 cuotas"** — Debería ser ×12 (decisión documentada en memory)
2. **Template #3 usa co-brand Coworkia Business Center prominente en footer** — VAZ = proveedor, no co-brand
3. **Template #3 no usa `ADRIANA_FROM_EMAIL`** — Sale desde email genérico (ya corregido parcialmente hoy)
4. **Template #1 y #3 tienen diseños totalmente diferentes** — No hay consistencia visual
5. **Followups (S1/S2/S3) no tienen logo SegPopular** — Solo texto en gradient header
6. **Doble pathway de cotización**: Boss quote usa V2, pero form web usa Generic (#3) — el cliente puede recibir emails con diseño distinto según el canal

---

## 🎯 PLAN SEMANA 03-07 ABRIL — ADRIANA

### BLOQUE A — Unificación de templates (prioridad alta)

- [x] **A1** — Estandarizar Template único de cotización
  - `insurance-confirmation.js` migrado de `generateEmailForAgent` → `buildEmailTemplate('ADRIANA', 'COMPARISON_V2')`
  - `generateEmailForAgent('ADRIANA')` en generic-email-templates.js ahora delega a V2
  - Cuotas corregidas: annualTotal / 12 (no /10)
  - Co-brand Coworkia eliminado del flujo
  - Logo segpopular.png correcto en template V2

- [x] **A2** — Agregar logo SegPopular a followups S1/S2/S3
  - Logo URL pública con `filter:brightness(0) invert(1)` en headers azul/rojo
  - height:42px consistente con template principal

- [x] **A3** — Eliminar template COMPARISON V1 (legacy)
  - `buildAdrianaComparisonHTML()` eliminada de email-template-system.js
  - Mapping `ADRIANA_COMPARISON` removido de `buildEmailTemplate()`
  - Verificado: nadie más importaba/usaba V1

- [x] **A4** — Verificar `from` address en `insurance-confirmation.js`
  - Usa `ADRIANA_FROM_EMAIL` + `agent: 'adriana'` → transporter dedicado
  - CC automático a `ADRIANA_CC_EMAIL`

### BLOQUE B — Flujo Foto-a-Cotización Multi-Aseguradora

- [ ] **B0** — Flujo completo: Cliente envía fotos → Adriana cotiza con N aseguradoras → Email comparativo
  - **Flujo actual**: Cliente manda foto matrícula + cédula → Vision AI extrae datos → cotización solo VAZ
  - **Flujo objetivo**: Mismo input fotográfico → cotización simultánea con N aseguradoras → email comparativo real
  - **Ejemplo real**: Javier Troya — Hyundai Creta 2022, PBC-1234, $16,000 → VAZ $830/año vs Sucre $1,285 vs Unidos $1,190

- [x] **B1** — Diseñar estructura de datos multi-aseguradora
  - Tabla `insurance_providers` creada (id, name, slug, logo_url, active, contact_info)
  - Tabla `insurance_rates` creada (provider_id, vehicle_category, year_range, base_rate, deductible_pct, coverages)
  - Tabla `insurance_lead_quotes` creada (lead_id → provider_id, primas, coverages)
  - Seed VAZ + tasa base 5.19% auto-aplicado al iniciar BD

- [x] **B2** — Implementar motor de cotización multi-aseguradora
  - `adriana-multi-quote-engine.js` — consulta insurance_providers + insurance_rates
  - VAZ usa calculador local (más preciso, tramos por valor)
  - Otras aseguradoras usan base_rate de BD
  - `generateMultiQuotes()` → array ordenado por prima ASC
  - `saveLeadQuotes()` persiste en insurance_lead_quotes
  - `formatQuotesForTemplate()` → datos listos para COMPARISON_V2

- [x] **B3** — Conectar Vision AI flow → Multi-quote engine
  - wassenger.js `waiting_coverage` handler ahora llama `generateMultiQuotes()`
  - Merge de competitors: DB multi-quote + Vision AI extracted quotes
  - insurance-confirmation.js también usa multi-quote
  - Email con `from: adriana@segpopular.com` + `agent: 'adriana'` + CC

- [x] **B4** — Actualizar template COMPARISON_V2 con data real multi-aseguradora
  - competitorRows se llenan con data real del motor B2
  - Template ya soporta N competidores dinámicamente
  - Cuando se agreguen aseguradoras a BD, aparecerán automáticamente

- [x] **B5** — Seed aseguradoras reales (05 Abr)
  - Sucre, Equinoccial, Unidos insertados en insurance_providers + insurance_rates
  - Multi-quote WA summary formateado con 4 aseguradoras
  - Commit: `76178a6`

- [x] **B6** — Dashboard Adriana — vista multi-cotización (05 Abr)
  - Endpoint GET /api/adriana/leads/:id/quotes
  - Tabla comparativa en detalle lead: aseguradora, prima, deducible, coberturas, logo
  - Commit: `45dc529`

### BLOQUE C — Mejoras pendientes (del plan anterior)

- [x] **C1** — Handler conversacional Adriana en wassenger.js (05 Abr)
  - Adriana ahora responde conversacionalmente en todos los insurance states
  - Usa orquestador con history (patrón Enzo post-fix)
  - Commit: `b6f2dbc`
  - E2E test: 17/17 passed — Commit: `0ed4fcf`
- [ ] **C2** — Validación cruzada cédula ↔ matrícula
- [ ] **C3** — Historial de cotizaciones por cliente en dashboard
- [ ] **C4** — PDF export de cotización comparativa

---

## 📋 PRIORIZACIÓN SUGERIDA

| Prioridad | Tarea | Esfuerzo | Impacto |
|-----------|-------|----------|---------|
| 🔴 P0 | A1 — Unificar template cotización | 1.5h | Alto — consistencia visual |
| 🔴 P0 | A4 — Fix from address insurance-confirmation | 15min | Alto — emails salen del correo correcto |
| 🟡 P1 | A2 — Logo en followups | 30min | Medio — branding |
| 🟡 P1 | A3 — Eliminar legacy V1 | 15min | Bajo — limpieza |
| 🟡 P1 | B0 — Flujo foto→multi-cotización (diseño) | 1h | Alto — feature principal |
| 🟡 P1 | B1 — Schema multi-aseguradora | 1h | Alto — fundamento |
| 🟢 P2 | B2 — Motor multi-cotización | 2-3h | Alto — power feature |
| 🟢 P2 | B3 — Conectar Vision AI → Multi-quote | 1.5h | Alto — integración |
| 🟢 P2 | B4 — Template tabla real | 1h | Alto — visual |
| 🔵 P3 | B5 — Aseguradoras (necesita input Diego) | — | Bloqueado sin data |
| 🔵 P3 | B6 — Dashboard multi-cotización | 2h | Medio |
| 🔵 P3 | C1-C4 — Mejoras pendientes | 4-6h | Medio |

---

## 🧪 CASO DE REFERENCIA — Javier Troya

| Campo | Valor |
|-------|-------|
| Nombre | Javier Troya (test: "Javier Andrade") |
| Vehículo | Hyundai Creta 2022 |
| Placa | PBC-1234 |
| Valor comercial | $16,000 |
| VAZ Elemental | $830/año ($83/mes), deducible 7% |
| Seguros Sucre | $1,285/año ($128/mes), deducible 10% |
| Seguros Unidos | $1,190/año ($119/mes), deducible 10% |
| Quote code | INS-JT-001 |
| Email | jota@nube.ec |
| Phone | +593983765432 |

---

## 💡 NOTAS

- URL logo actual: `https://coworkia-agent-e97d15dac56f.herokuapp.com/assets/logos/segpopular.png`
- El logo es navy sobre transparente — se invierte con CSS `filter:brightness(0) invert(1)` para fondos oscuros
- Para fondo claro (como el template genérico dorado): usar sin filter
- SMTP ahora está separado: Adriana tiene su propio transporter (`mail.segpopular.com:465`)
