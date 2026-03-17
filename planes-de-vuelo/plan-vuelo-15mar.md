# 🚀 Plan de Vuelo — 15 Marzo 2026
> Guía maestra diaria. Auditada y actualizada cada sesión.
> **Última actualización:** 16 Mar 2026 — `802f775` · **v951 en Heroku** — Aluna ✅ Enzo ✅ Arquitectura HTML auditada ✅

---

## 🚨 BASE DE PARTIDA: v951 — 34/34 tests verdes — TODO LIMPIO

---

## ✅ COMPLETADO SPRINT ANTERIOR (14 mar → 15 mar)

*(Detalle completo en `plan-vuelo-14mar.md`)*

| Sprint | Qué se hizo | Deploy |
|--------|------------|--------|
| F1–F5, Axel v2, P1+P2 | Axel template · genérico · code-generator · parsers · BaseRepo | v930 |
| ML-1/2/3/4/5/6 | 8 agentes × 6 idiomas · i18n email · Whisper · email-i18n.js | v946 |
| P3 Auditoría + Refactor | 12 archivos auditados · CSS email fijo · PropElite branding | v948 |
| Tests + D2 + Quechua fix | 34/34 suites · footer Paula `noreply@coworkia.ec` · bug Quechua | v951 |

---

## 🗺️ NUEVO SPRINT — 15 Marzo

### P7 — Revisión y ajuste de mail templates (uno por uno)

> Workflow: presento → apruebas o ajustas → next. Al final: archivos listos para automatización.

| # | Agente | Templates en pie | Estado |
|---|--------|-----------------|--------|
| P7.1 | **Aurora** | ❌ Sin template email (WA only — por diseño) | ✅ confirmado |
| P7.2 | **Aluna** | Proforma + Email 2 (24h 15%) + Email 3 (7d FOMO) + confirmación | ✅ funnel completo `7b1cf02` |
| P7.3 | **Enzo** | Flujo consultivo WA (decode→qualify→confirm→plan) + email plan estratégico | ✅ `cd21965` `fe1bdc2` `9a339b9` `3f61eab` `802f775` — `_enzoProposalHTML` eliminado, template único con `briefHTML` dinámico |
| P7.4 | **Gabi** | `generateGabiEmailHTML` (cliente + admin — mismo fn, `recipientType`) | ⏳ siguiente |
| P7.5 | **Axel** | `generateAxelEmailHTML` (cotización con fotos + tabla trabajos) — 1 fn, CONFIRMADO ✅ | ⏳ revisar |
| P7.6 | **Adriana** | `_adrianaQuoteHTML` (cotización vehículo+prima) + `generateAdrianaEmailHTML` (router: confirmación/cotización) — 2 fns JUSTIFICADAS ✅ | ⏳ revisar |
| P7.7 | **Paula** | `generatePaulaEmailHTML` (lead confirmation) + `buildPaulaEmailHTML` (brochure propiedades boss-cmd) — 2 fns JUSTIFICADAS ✅ | ⏳ revisar |

---

### P8 — Mejorar formato de presentación de ofertas

| # | Agente | Qué mejorar | Estado |
|---|--------|------------|--------|
| P8.1 | **Enzo** | ✅ Resuelto con flujo consultivo — WA co-construye el brief antes de generar el plan | ✅ `9a339b9` |
| P8.2 | **Gabi** | Pensamiento actual + estrategia de presentación → mejora definida con usuario | ⏳ revisar pensamiento primero |

---

### P9 — Conocimiento SENADI para Gabi

> Gabi debe dominar TODOS los trámites del SENADI: Propiedad Industrial, Derecho de Autor,
> Observancia, Recursos, Inscripciones/cancelaciones, formularios oficiales, manuales,
> búsqueda previa, normativa vigente (COESCCI, Decisión 486, reglamentos), flujogramas,
> especificaciones técnicas plataforma, criterios técnicos de evaluación.

| # | Qué | Estado |
|---|-----|--------|
| P9.1 | Agregar bloque `senadi` al `conocimiento` de `gabi.js` | ⏳ pendiente |
| P9.2 | Agregar contexto SENADI al `getSystemPrompt` de Gabi | ⏳ pendiente |
| P9.3 | Tests de validación conocimiento Gabi SENADI | ⏳ pendiente |

---

### P10 — Plan de implementación Auto-aprendizaje

> Las 3 opciones del sprint anterior:
>
> **(A) Feedback Loop Manual:**
> Semana 1-4: Recopilar conversaciones fallidas → Analizar patterns → Corregir prompts manualmente.
> Sin costo adicional. Requiere 2-3h/semana tu tiempo.
>
> **(B) Fine-tuning mensual:**
> Semana 1: Dataset curado (200+ ejemplos). Semana 2-3: Fine-tune OpenAI. Semana 4: Deploy.
> Costo: ~$50-100/mes en training. Mejoras graduales y predecibles.
>
> **(C) Vector Store + RAG (Recomendada):**
> Semana 1-2: Subir docs (tarifarios, FAQs, casos) a vector store. Semana 3: RAG pipeline.
> Semana 4+: Los agentes consultan docs en tiempo real. Escala infinitamente.
> Costo: ~$20-40/mes. ROI: respuestas 3x más precisas en dominio específico.

**Roadmap completo (5 meses):**
- Mes 1: Recolección datos + limpieza
- Mes 2: Análisis + identificación gaps
- Mes 3: Implementación opción elegida
- Mes 4: Validación + ajuste
- Mes 5: Producción estable

| Estado | Nota |
|--------|------|
| ⏳ Pendiente decisión | Tienes que elegir A, B o C |

---

## 🛑 PENDIENTE — Bloqueado por cliente

| # | Agente | Qué falta | Estado |
|---|--------|----------|--------|
| P6.1 | **Axel** | Tarifario oficial The PaintBull (precios demo actuales) | 🔴 espera info cliente |
| P6.2 | **Paula** | Links Drive 5 propiedades El Morenal (Casa 1, 3, 6, 7, Generales) | 🔴 espera info cliente |

---

## 🗺️ ARQUITECTURA EMAIL — REFERENCIA (auditada 802f775)

| Agente | Funciones | Justificación |
|--------|-----------|---------------|
| **Aluna** | `generateAlunaEmailHTML` + `generateAlunaProformaHTML` + `generateAlunaFollowup2HTML` + `generateAlunaFollowup3HTML` | 4 etapas del funnel distintas ✅ |
| **Gabi** | `generateGabiEmailHTML` (`recipientType` param) | Template único, 1 fn ✅ |
| **Enzo** | `generateEnzoEmailHTML` + `_renderBossQuoteBriefHTML()` helper | Template único, briefHTML dinámico desde OpenAI ✅ |
| **Adriana** | `generateAdrianaEmailHTML` (router) + `_adrianaQuoteHTML` (privada) | Confirmation VS cotización con prima calculada ✅ |
| **Axel** | `generateAxelEmailHTML` | Template único ✅ |
| **Paula** | `generatePaulaEmailHTML` (lead confirmation) + `buildPaulaEmailHTML` (brochure boss-cmd) | Lead confirmation VS propiedad con cards y pricing ✅ |
| **Aurora** | `generateConfirmationEmailHTML` en `email.js` | Reservas, no mover a generic-email-templates ✅ |

---

## 📧 CÓMO PROBAR TODOS LOS EMAILS
```bash
node scripts/test-aluna-email.mjs yo@diegovillota.com plan20
```

---

## 🐛 BUGS HISTÓRICOS RESUELTOS

| Bug | Fix |
|-----|-----|
| Quechua false positive (`/[qkhw]/i` matchaba 'H' de "Hola") | `specialChars: null` en language-detector.js |
| Paula footer `contacto@propelite.ec` | → `noreply@coworkia.ec` (4 ocurrencias) |
| whisper-real-api.test.js `process.exit(0)` crasheaba suite Jest | `describe.skip()` |
| aluna-vision.test.js mock faltante `sendEmail` | mock completo |

---

*Próxima acción: **P7.4 Gabi** → revisar `generateGabiEmailHTML` → aprobar/ajustar → continuar.*
*P8.1 Enzo WA ya resuelto por `enzo-consulting-flow.js` (`9a339b9`).*

---

## 📋 LOG SESIÓN 16 MAR 2026

| Hora | Commit | Qué se hizo |
|------|--------|-------------|
| mañana | `7b1cf02` | P7.2 Aluna: funnel 3 emails + pipeline dashboard + BD migration 008 |
| tarde | `cd21965` | P7.3 Enzo: `enzo-brief-generator.js` v1 — OpenAI genera competidores, FODA, cierre estratégico |
| tarde | `fe1bdc2` | P7.3 Enzo fix: boss-command migrado al template aprobado, elimina `_enzoProposalHTML` |
| noche | `refactor` | Brief v2: reemplazado por diagnóstico @handle + matriz capacidades + superpoderes (descartado — sobreprometía) |
| noche | `9a339b9` | **P7.3 + P8.1 Enzo**: `enzo-consulting-flow.js` — flujo consultivo WA completo: decode→qualify→confirm→plan. OpenAI co-construye el brief con el cliente antes de generar el plan estratégico (idea central + objetivos SMART + plan 4 semanas + KPIs + email). Hook en `wassenger.js` para agente ENZO. |
| noche | `3f61eab` | Intento fix boss-command WELLFEST: añade `project_title`+`deliverables` a OpenAI JSON, cambia a `type:'proposal'` → sigue usando template incorrecto (no deployado aún a Heroku) |
| noche | `802f775` | **FIX DEFINITIVO**: elimina `_enzoProposalHTML` (229 líneas hardcodeadas), elimina rama `type==='proposal'`, crea `_renderBossQuoteBriefHTML()` que construye HTML dinámico desde OpenAI data, pasa como `briefHTML` al template único `generateEnzoEmailHTML`. Secciones estáticas envueltas en `${!briefHTML ? ... : ''}`. Audit completo: 7/7 agentes con arquitectura justificada. Regla `0.2` escrita en `reglas_multiagente.md`. |
| noche | `f4f7f31` | Precio limpio: elimina descuento artificial / precio tachado / badge / footer amarillo / "Garantía 15 días". OpenAI calcula precio real ecuatoriano sin rangos fijos. |

---

## 🔮 RETOMAR AQUÍ — Rediseño briefHTML de Enzo (pendiente de aprobación)

**Problema identificado:** El `_renderBossQuoteBriefHTML()` actual genera cards/grids/bullets numerados — se ve como landing page SaaS, no como propuesta de agencia boutique. El cliente quiere algo persuasivo, narrativo, con peso de copywriter de agencia.

**Concepto aprobado: Opción G — "3 Actos"**
- `01 El diagnóstico` — párrafo narrativo + caja amber con la consecuencia real
- `02 Lo que construimos` — párrafo + entregables detallados con *por qué* + dark box con resultado real
- `03 La inversión` — precio único enorme, 50/50, deadline
- CTA conversacional: `"¿Le damos luz verde?"` + botón `"Arrancar con [empresa] →"`
- Header: logo real PNG de MarketingLab (no texto) + tarjeta oscura con nombre cliente/proyecto/ref
- Footer: logo pequeño blanco + ecosistema agentes + datos reales (igual que el template actual)

**Mejora pendiente al prompt de OpenAI:**
- Añadir campo `titular` — frase de golpe de apertura generada por OpenAI (estilo: *"WELLFEST no necesita un logo. Necesita una razón para que la gente vuelva."*)
- Tone change: pensar como copywriter sénior de agencia, no como asistente corporativo
- Entregables: cada uno con contexto del *por qué*, no solo el *qué*

**Estado:** Preview en `public/preview-enzo-g.html` — aprobado concepto visual, pendiente aprobación final antes de reemplazar `_renderBossQuoteBriefHTML()` en `enzo-cotizacion-email.js` y commit.
