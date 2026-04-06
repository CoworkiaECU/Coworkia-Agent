# Auditoría Multilenguaje / i18n — Completa

**Fecha:** 26 marzo 2026  
**Auditor:** Copilot (Chat Ejecución)  
**Alcance:** 7 agentes + orquestador + templates email  

---

## 1. System Prompts — Estado i18n

| Agente   | Archivo                              | ¿Tiene i18n? | Formato                          |
|----------|--------------------------------------|:------------:|----------------------------------|
| Aurora   | `src/deteccion-intenciones/aurora.js`   | ✅           | 3 reglas críticas + adaptación 6 idiomas |
| Aluna    | `src/deteccion-intenciones/aluna.js`    | ✅           | 3 reglas críticas + adaptación 6 idiomas |
| Adriana  | `src/deteccion-intenciones/adriana.js`  | ✅           | 3 reglas críticas + terminología seguros |
| Enzo     | `src/deteccion-intenciones/enzo.js`     | ✅           | Línea 91 — formato compacto equivalente |
| Paula    | `src/deteccion-intenciones/paula.js`    | ✅           | 3 reglas críticas + terminología inmobiliaria |
| Gabi     | `src/deteccion-intenciones/gabi.js`     | ✅           | 3 reglas críticas + adaptación profesional |
| Axel     | `src/deteccion-intenciones/axel.js`     | ✅           | 3 reglas críticas + terminología automotriz |

**Resultado: 7/7 agentes tienen instrucciones explícitas de idioma.**

### Reglas críticas verificadas en cada prompt:
1. **REGLA #1:** "Responde SIEMPRE en `${userLanguage}`"
2. **REGLA #2:** "Si el usuario cambia de idioma, cámbiate tú también"
3. **REGLA #3:** "NUNCA mezcles idiomas en una misma respuesta"

---

## 2. Orquestador — Flujo de idioma

| Componente                | Línea(s)  | Estado |
|---------------------------|-----------|:------:|
| `preferredLanguage` pasado a `getSystemPrompt()` | L409 | ✅ |
| Double language lock (non-Spanish) — prepend `🔒 IDIOMA ACTIVO` | L421-424 | ✅ |
| Double language lock — append `🔒 RECORDATORIO FINAL` | L425-428 | ✅ |
| Detección de idioma + comandos | L64-99 | ✅ |

**Idiomas soportados:** es, en, fr, it, pt, qu (6 idiomas)

---

## 3. Email Templates — Estado i18n

### ✅ CON i18n (usan `EMAIL_TRANSLATIONS` de `email-i18n.js`)

| Template | Archivo | Línea |
|----------|---------|-------|
| Adriana cotización genérica | `generic-email-templates.js` | L184 |
| Axel cotización genérica | `generic-email-templates.js` | L388 |
| Enzo cotización genérica | `generic-email-templates.js` | L642 |
| Paula cotización genérica | `generic-email-templates.js` | L891 |
| Aluna proforma genérica | `generic-email-templates.js` | L1059 |
| Gabi cotización genérica | `generic-email-templates.js` | L1140 |
| Proforma genérica | `generic-email-templates.js` | L1419 |

**Motor:** `email-i18n.js` (1226 líneas, 5 idiomas: es/en/fr/it/pt, 7 namespaces)

### ❌ SIN i18n — Solo español (Sprint 2 pendiente)

| Archivo | Agente | Tipo |
|---------|--------|------|
| `adriana-cotizacion-email.js` | Adriana | Cotización standalone |
| `aluna-proforma-email.js` | Aluna | Proforma standalone |
| `aluna-welcome-email.js` | Aluna | Bienvenida |
| `axel-quote-email.js` | Axel | Cotización standalone |
| `email-templates-paula.js` | Paula | Visitas (confirm/reschedule/cancel/reminder) |
| `enzo-cotizacion-email.js` | Enzo | Cotización standalone |
| `gabi-cotizacion-email.js` | Gabi | Cotización standalone |
| `paula-cotizacion-email.js` | Paula | Cotización standalone |
| `payment-receipt-email.js` | Todos | Recibo de pago |
| `email-template-system.js` | Sistema | Template central (13 templates) |
| `email-assets.js` | Todos | Assets compartidos (header/footer/styles) |

### ❌ Follow-ups — Solo español

| Archivo | Agente |
|---------|--------|
| `adriana-followup-service.js` | Adriana |
| `adriana-followup-cron.js` | Adriana |
| `aluna-followup-service.js` | Aluna |
| `aluna-followup-cron.js` | Aluna |
| `aurora-followup-service.js` | Aurora |
| `aurora-enzo-followup-cron.js` | Aurora/Enzo |
| `axel-followup-cron.js` | Axel |
| `enzo-followup-service.js` | Enzo |
| `paula-followup-service.js` | Paula |
| `paula-followup-cron.js` | Paula |
| `follow-up-service.js` | General |

---

## 4. Resumen ejecutivo

| Capa | Estado | Detalle |
|------|:------:|---------|
| System prompts (7 agentes) | ✅ 100% | Todos tienen instrucciones explícitas de idioma |
| Orquestador | ✅ 100% | Language pass + double lock funcional |
| Email generic templates | ✅ 7/7 | Usan `email-i18n.js` |
| Email standalone templates | ❌ 0/11 | Solo español — Sprint 2 |
| Follow-up services | ❌ 0/11 | Solo español — Sprint 2 |

### Sprint 2 — Email i18n (estimado)
- **22 archivos** necesitan migrar a `EMAIL_TRANSLATIONS`
- Modelo: replicar pattern de `generic-email-templates.js`
- Prioridad sugerida: payment-receipt → email-template-system → cotizaciones standalone → follow-ups
