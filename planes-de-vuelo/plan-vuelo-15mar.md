# 🚀 Plan de Vuelo — 15 Marzo 2026
> Guía maestra diaria. Auditada y actualizada cada sesión.
> **Última actualización:** 17 Mar 2026 — `ab3765b` · **Heroku live** — Integración WiFi portal cautivo completa ✅ + Email bienvenida Aluna: código real, sin datos inventados, 17/17 tests

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
| P7.2 | **Aluna** | Proforma + Email 2 (24h 15%) + Email 3 (7d FOMO) + confirmación + **Welcome post-pago** | ✅ funnel completo `ab3765b` — welcome: paleta verde, WiFi código real (portal cautivo), CTA persuasivo, ecosistema 8 agentes |
| P7.3 | **Enzo** | Flujo consultivo WA (decode→qualify→confirm→plan) + email plan estratégico | ✅ `cd21965` `fe1bdc2` `9a339b9` `3f61eab` `802f775` `f4f7f31` `00e075f` — Template 3 actos en producción: titular+diagnostico OpenAI, _renderBossQuoteBriefHTML narrativo con CTA WA |
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

## 📡 INTEGRACIÓN COMPLETADA — Aurora ↔ WiFi Portal Coworkia

> `ab3765b` — Integrado y en producción desde 17 Mar 2026

**Flujo real activo:**
`pago aprobado → approveLead() → generateMembershipWifiCode() → guarda en Postgres → incluido en email → Mac Mini descarga cada 5 min via sync-from-aurora.js → miembro ingresa código en portal cautivo → internet activado`

| # | Tarea | Archivo | Estado |
|---|-------|---------|--------|
| W1 | Endpoints `GET /api/wifi-codes/pending` y `POST /confirm-sync` en Aurora | `src/express-servidor/endpoints-api/wifi-codes.js` | ✅ `ab3765b` |
| W2 | Tabla `wifi_codes` en Postgres + columna `membership_code` (migración auto) | `src/database/postgres-adapter.js` | ✅ `ab3765b` |
| W3 | `generateMembershipWifiCode()` desde `approveLead()` (744h/mes, linkeado a `membership_code`) | `membership-payment-verification.js` | ✅ `ab3765b` |
| W4 | Código real inyectado en email bienvenida (fallback honesto: recepción) | `aluna-welcome-email.js` | ✅ `ab3765b` |
| W5 | `sync-from-aurora.js` en Mac Mini: descarga códigos y confirma sync (ya estaba implementado) | `WiFi Coworkia/scripts/sync-from-aurora.js` | ✅ preexistía |

**Pendiente operacional (no es código, es configuración en Mac Mini):**
- Configurar `AURORA_API_URL` y `WIFI_SYNC_API_KEY` en `.env` del Mac Mini
- Activar crontab: `*/5 * * * * node /path/to/sync-from-aurora.js`
- Configurar `WIFI_SYNC_API_KEY` en Heroku (vars de entorno)

---

## 📡 INTEGRACIÓN PENDIENTE — (sección archivada, ver arriba)

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
| noche | `e11aeaf` | Preview "3 actos" completa: `public/enzo-propuesta-preview.html` — header PNG + tarjeta oscura + 3 actos + **8 tarjetas ecosistema SVG** con WA deep links + footer real Coworkia. Lista para aprobación visual antes de codificar en producción. |

---

## 📋 LOG SESIÓN 17 MAR 2026

| Hora | Commit | Qué se hizo |
|------|--------|-------------|
| mañana | `00e075f` | **P7.3 Enzo COMPLETO**: `_renderBossQuoteBriefHTML()` reemplazado con diseño 3 actos — titular (OpenAI copywriter) + 01 diagnóstico (amber box) + 02 lo que construimos (entregables bold+why + dark result box) + 03 inversión (precio $56px) + CTA teal WA. Nuevos campos OpenAI: `titular`, `diagnostico`. max_tokens → 1800. quoteCode pasa al CTA WA link. |

---

## 🔮 RETOMAR AQUÍ — Auditoría Aurora/Aluna (errores constantes)

**Estado P7.3 Enzo:** ✅ COMPLETO — `00e075f` en Heroku

---

## 🚨 DESVÍO 17 MAR — Sprint Aurora/Aluna + LOPD

> Iniciado a pedido del usuario. P7.4 Gabi queda en pausa hasta completar este sprint.

### A1 — Aurora no reconoce nombre del usuario
**Causa:** Fallback `'amigo'` en orquestador línea 431 + handoff-messages.js. Nombres genéricos de WA Business ("Coworkia") pasan como nombre real.
**Fix:** Filtrar lista negra de nombres genéricos antes de usar `perfil.name`. Si no válido, saludo sin nombre.
| Estado | ⏳ pendiente |
|--------|------|

### A2 — Aurora no explica períodos 2h ni descuento acumulado
**Causa:** System prompt menciona `$10/2h` pero sin instrucción para solicitudes de "1 hora" ni tabla de tandas.
**Lógica de precios:**
- 1ra tanda (2h) → $10.00
- 2da tanda (2h) → $10 × 85% = $8.50
- 3ra tanda (2h) → $8.50 × 85% = $7.22
- Total 3 tandas (6h) = **$25.72**
**Fix:** Añadir sección en `getSystemPrompt` y en `getServiciosInfo` de aurora.js.
| Estado | ⏳ pendiente |
|--------|------|

### A3 — "espacio individual" no reconocido como Hot Desk
**Causa:** Falta en `AURORA_KEYWORDS` → sistema no lo detecta → handoff a Aluna que ofrece membresías.
**Fix:** Añadir keywords en `detectar-intencion.js` + instrucción en system prompt de Aurora.
| Estado | ⏳ pendiente |
|--------|------|

### A4 — Mensajes en ráfaga: respuesta por cada mensaje separado
**Causa:** Wassenger.js no tiene debounce/cola por usuario.
**Fix:** Map `userMessageQueue` en wassenger.js — acumula 4s, concatena, procesa como uno solo.
| Estado | ⏳ pendiente |
|--------|------|

### A5 — Dashboard Aluna: listado de prospectos de membresía
**Causa:** Dash no muestra usuarios con intención de membresía clasificada.
**Fix:** Endpoint `GET /api/aluna/prospects` + tabla en dash con columnas: Consultó precios / Plan 10 / Plan 20 / Recibió cotización / N° mensajes.
| Estado | ⏳ pendiente |
|--------|------|

### A6 — LOPD Ecuador: cumplimiento Ley Orgánica Protección Datos 
**Causa:** No existe consentimiento ni derechos ARCO en ningún agente.
**Fix:** `src/servicios/lopd-service.js` + tabla `user_consents` en BD + aviso automático en primer contacto de cada agente + registro completo LOPDP.
| Estado | ⏳ pendiente |
|--------|------|

**Orden de ejecución:** A1 → A2 → A3 (rápidos, mismo día) → A4 (medium) → A5 → A6 (estructurales)
**Pendiente tras este sprint:** P7.4 Gabi · P8.2 Gabi · P9.1/2/3 SENADI
