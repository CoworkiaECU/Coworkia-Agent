# 📋 Pendientes Consolidados — 22 Mar 2026
**Consolidado:** 22 Mar 2026 — limpieza de backlog histórico  
**Fuente:** planes 14–22 mar + adriana-autopilot + skills + buttons-audit  
**Activo hoy:** `plan-vuelo-23mar-tarde.md` (no tocar)

---

## 🔴 ADRIANA — Alta Prioridad

| # | Tarea | Origen |
|---|-------|--------|
| A1 | **wassenger.js handler conversacional** — foto matrícula → disparar flujo Adriana | plan-22mar / adriana-autopilot |
| A2 | **Fix Vision AI**: renombrar campo "Licencia" → "Cédula" en el analizador (bug crítico) | adriana-completo |
| A3 | **Coverage Selection Step**: mostrar 2 opciones de deducible antes de cotizar | adriana-completo |
| A4 | **KYC conversacional** — estado civil, cónyuge, profesión, finanzas, banco, PEP | adriana-completo |
| A5 | **Email template KYC** + HTML form pre-llenado con datos capturados | adriana-completo |
| A6 | **Dashboard adriana-seguros.html**: columnas nuevas KYC en tabla de leads | adriana-completo |
| A7 | **Dispatcher** `ADRIANA_COMPARISON_V2` en `email-template-system.js` | adriana-autopilot |
| A8 | **Notificación a Diego vía WA** cuando lead acepta cotización | adriana-autopilot |
| A9 | Tests E2E flujo completo Adriana (demo Javier Troya) | adriana-completo |

---

## 🟠 AURORA — CRM Improvements

| # | Tarea | Grupo |
|---|-------|-------|
| B1 | **Fix D+7 filter**: usar campo `date` en lugar de `created_at` | A |
| B2 | Stats skeleton loader CSS pulsing mientras carga | A |
| B3 | Row hover highlight en tablas de prospectos y conversaciones | A |
| B4 | Columna teléfono visible (masked) + click-to-copy en tabla Prospectos | B |
| B5 | Urgency visual con emojis pulsing (hot=🔴, warm=🟡, cold=⚪) | B |
| B6 | Botón WA directo en cada fila Prospectos (wa.me link, sin modal) | B |
| B7 | Mostrar teléfono (masked) en tabla Conversaciones | C |
| B8 | Botón 📲 WA directo en fila Conversaciones | C |
| B9 | Keyboard shortcuts — 1/2/3/4 para tabs, R para refresh | D |
| B10 | Badge "Actualizado: hace Xs" en cada sección | D |

---

## 🟠 DASHBOARDS — Prefijos @agente en WA

> Todos los mensajes WA enviados desde dashboards deben tener prefijo `@agente`  
> para que el orquestador los despache correctamente.

| # | Archivo | Prefijo |
|---|---------|---------|
| C1 | `adriana-dashboard.js` (backend) | `@adriana` |
| C2 | `gabi-dashboard.js` (backend) | `@gabi` |
| C3 | `paula-dashboard.js` (backend) | `@paula` |
| C4 | `axel-dashboard.js` (backend) | `@axel` |
| C5 | `enzo-dashboard.js` proyectos | `@enzo` |
| C6 | `aluna-dashboard.js` (24h y 3d) | `@aluna` |

---

## 🟡 ALUNA — Dashboard / Campañas

| # | Tarea |
|---|-------|
| D1 | Botones manuales D+1/D+3 WA y Email en dashboard Aluna |
| D2 | Ventana de creación de campañas masivas (nombre, filtros, editor, preview) |
| D3 | Página `/admin/aluna-settings` con templates editables |

---

## 🟡 EMAILS / TEMPLATES — Sistema Centralizado

| # | Tarea |
|---|-------|
| E1 | Sistema centralizado de templates HTML para todos los agentes |
| E2 | Logos y assets por agente (Gabi, Axel, Paula, Adriana) correctamente asignados |
| E3 | Gabi: revisar y ajustar `generateGabiEmailHTML` |
| E4 | Axel: revisar email template con fotos + tabla trabajos |
| E5 | Paula: revisar `generatePaulaEmailHTML` + brochure |
| E6 | Adriana: revisar `_adrianaQuoteHTML` cotización vehículo + prima |

---

## 🟡 CONOCIMIENTO — Gabi

| # | Tarea |
|---|-------|
| F1 | Agregar bloque SENADI al knowledge base de `gabi.js` |
| F2 | Agregar contexto SENADI al `getSystemPrompt()` de Gabi |
| F3 | Tests de validación conocimiento Gabi SENADI |
| F4 | Mejorar formato presentación de ofertas |

---

## 🟢 INFRA / SKILLS — Monitoring, Migrations, Performance

| # | Tarea | Skill |
|---|-------|-------|
| G1 | Extender `health-monitor.js` con Wassenger + Heroku memory checks | coworkia-monitoring |
| G2 | Comando `/status` en `wassenger.js` | coworkia-monitoring |
| G3 | Crear `migration-runner.js` + `001_initial.js` + `template.js` | database-migrations |
| G4 | Comando `/migrate status` en `wassenger.js` | database-migrations |
| G5 | Backup pre-migración automático (local + Heroku) | database-migrations |
| G6 | Montar `requestTrackingMiddleware` en `index.js` | coworkia-performance |
| G7 | Slow query detection en `postgres-adapter.js` | coworkia-performance |
| G8 | Reporte semanal de performance en `daily-report.js` | coworkia-performance |
| G9 | Comando `/perf` en `wassenger.js` | coworkia-performance |

---

## 🟢 AUTO-APRENDIZAJE (post-producción)

| # | Tarea |
|---|-------|
| H1 | Elegir opción de plan de auto-aprendizaje (opción A, B o C) e implementar |
| H2 | Testing masivo con 10-20 leads reales |
| H3 | Optimización templates WA con datos de respuesta real |
| H4 | A/B testing follow-ups Aluna |

---

## ✅ YA COMPLETADO (no repetir)

- ~~Enzo D+1/D+3/D+7 backend~~ → endpoint `/api/enzo/leads/:code/send-followup` existe ✅
- ~~adrianaRepository KYC columns~~ → `kyc_matricula`, `competitor_quote_amount`, `competitor_insurer` → 23 mar ✅  
- ~~enzo-leads.html frontend~~ → redirect funcional al tab follow-ups de enzo-proyectos.html ✅
- ~~POST /api/aluna/prospect/manual~~ → implementado 23 mar ✅
- ~~Wiring audit 6 dashboards~~ → 48/48 ✅
