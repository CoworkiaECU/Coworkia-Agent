# ✈️ Plan de Vuelo — Paula Inmobiliaria (1 Abril 2026)
**Objetivo**: Sistema perfecto para presentación 2 de Abril
**Prioridad**: 🔴 CRÍTICA — deadline mañana
**Status**: ✅ COMPLETADO

---

## 🐛 BUGS ENCONTRADOS EN AUDITORÍA

### BUG-1 — HTML Roto: Filtro de estado sin `<select>` (CRÍTICO)
- `paula-inmobiliaria.html` línea ~232: falta `<div class="filter-group"><label>Estado</label><select id="filter-status">`
- Solo hay `<option>` sueltos y `</select>` → filtro de estado NO funciona en producción
- **Impacto**: Dashboard inutilizable para filtrar por estado

### BUG-2 — Statuses inconsistentes entre seed y dashboard
- Demo seed usa: `searching`, `offer_made`, `accepted` 
- Dashboard solo mapea: `pending`, `viewing_scheduled`, `negotiating`, `closed`, `cancelled`
- Leads con status no mapeado se muestran con badge genérico roto
- **Fix**: Unificar statuses en seed + backend + frontend

### BUG-3 — API usa `ensureInitialized()` en vez de `initialize()`
- `paula-dashboard.js` backend usa `await databaseService.ensureInitialized()` 
- Según decisiones del proyecto, eso es VALIDACIÓN no inicialización
- Funciona en producción porque el server ya inició la BD, pero es un anti-pattern

---

## 📋 TAREAS — Orden de ejecución

### BLOQUE 1: Fixes Críticos (dashboard funcional)
- [x] **T1** — Fix HTML filtro estado: agregar `<select id="filter-status">` con wrapper
- [x] **T2** — Unificar statuses: alinear seed demo + badge map + select options
  - Statuses definitivos: `pending`, `searching`, `viewing_scheduled`, `negotiating`, `offer_made`, `closed`, `cancelled`
- [x] **T3** — Verificar dashboard carga sin errores en producción

### BLOQUE 2: Data para presentación
- [x] **T4** — Limpiar leads de test existentes (Diego Villota test)
- [x] **T5** — Mejorar seed demo con datos realistas y statuses válidos
- [x] **T6** — Ejecutar seed en producción → dashboard con 10 leads presentables (+ fix DB constraint)

### BLOQUE 3: Flujo WhatsApp e2e
- [x] **T7** — Validar boss command brochure en producción (enviar cotización real)
- [x] **T8** — Validar botón WhatsApp del dashboard (send-wa) funciona
- [x] **T9** — Test conversación @paula desde WhatsApp (lead capture flow)

### BLOQUE 4: Polish para presentación
- [x] **T10** — Botón Demo oculto (visible solo con ?debug=true)
- [x] **T11** — Verificar navegación entre dashboards (nav arrows functional)
- [x] **T12** — Test responsivo móvil del dashboard
- [x] **T13** — Deploy final + smoke test producción

---

## 📊 Estado del Sistema Paula (pre-fix)

| Componente | Estado | Notas |
|-----------|--------|-------|
| Dashboard HTML | � OK | Filtro status arreglado, 7 statuses unificados |
| API endpoints | 🟢 OK | `/api/paula/leads`, `/leads-stats`, `/leads/:id/status`, `/send-wa`, `/seed-demo` |
| Agent WA `@paula` | 🟢 OK | Personality + knowledge + multilingual |
| Boss command brochure | 🟢 OK | isPaulaBossQuoteCommand validated |
| Visit scheduler | 🟢 Existe | Calendar integration, confirmation flow |
| Lead scoring UAFE | 🟢 Existe | 200pts system + compliance |
| Casas links | 🟡 Todos PENDING | `paula-casas-links.js` → todos `PENDIENTE_AGREGAR_LINK` (no blocker para demo) |
| Demo data | 🟢 OK | 10 leads con statuses válidos, pipeline distribuido |

---

## 🎯 Criterio de éxito para presentación
1. Dashboard carga perfecto, sin errores de consola
2. 10 leads demo con pipeline visual (pendientes → visitas → negociando → cerrados)
3. Filtros funcionan (estado, operación, búsqueda)
4. Botón WhatsApp envía mensaje
5. Boss command envía brochure de lujo por email
6. Sin botón Demo visible (clean para cliente)
