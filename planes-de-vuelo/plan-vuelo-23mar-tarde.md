# 🤖 Plan de Vuelo — Autopilot 23 Mar (tarde)
**Activado:** 23 Mar 2026 — sesión tarde  
**Alcance:** Botones sin wiring + backlog backlog crítico (excluye Aurora que tiene chat propio)

---

## 📊 Estado de Tareas (desde Magic Todos)

| # | Prioridad | Tarea | Agente | Estado |
|---|-----------|-------|--------|--------|
| 1 | 🔴 urgent | Fix wiring botones pendientes dashboards | aurora | in_progress |
| 2 | 🟠 high | adrianaRepository.js KYC columns + competitor_quotes | adriana | pending |
| 3 | 🟠 high | Aurora Fase 3 métricas semanales | aurora | pending → **excluir (chat Aurora)** |
| 4 | 🟡 medium | wassenger.js handler Adriana conversacional (foto matrícula → cotizar) | adriana | pending |
| 5 | 🟡 medium | Enzo follow-ups D+1/D+3/D+7 frontend dashboard `/enzo-leads.html` | enzo | pending |
| 6 | 🟢 low | Aurora + Gabi recibo email por reserva | gabi | pending |

---

## 🔴 BLOQUE 1 — Auditoría completa botones sin wiring (1.5h)

**Objetivo:** Identificar exactamente qué botones de qué dashboards no tienen wiring real, y fixearlos todos.

**Método:**
1. Leer los 7 archivos `public/js/*-dashboard.js` + HTML correspondiente
2. Para cada botón: verificar que el `fetch()` apunta a un endpoint que existe en el backend
3. Verificar que el backend maneja la petición y responde correctamente
4. Fixear cualquier 404, endpoint incorrecto, o función sin implementar

**Archivos a revisar:**
- [ ] `public/js/adriana-dashboard.js` + `src/express-servidor/endpoints-api/adriana-dashboard.js`
- [ ] `public/js/aluna-dashboard.js` + `src/express-servidor/endpoints-api/aluna-dashboard.js`
- [ ] `public/js/axel-dashboard.js` + `src/express-servidor/endpoints-api/axel-dashboard.js`
- [ ] `public/js/enzo-dashboard.js` (leads + proyectos) + `src/express-servidor/endpoints-api/enzo-dashboard.js`
- [ ] `public/js/gabi-dashboard.js` + `src/express-servidor/endpoints-api/gabi-dashboard.js`
- [ ] `public/js/paula-dashboard.js` + `src/express-servidor/endpoints-api/paula-dashboard.js`
- [ ] Aurora ya revisada en su propio chat

**Checkpoint:** commit `fix(wiring): botones X/Y reparados — audit completo`

---

## 🟠 BLOQUE 2 — adrianaRepository.js KYC columns (45min)

**Objetivo:** Agregar columnas KYC y `competitor_quotes` al repositorio de Adriana.

**Columnas a agregar:**
- `kyc_cedula` — número de cédula del asegurado
- `kyc_matricula` — placa del vehículo  
- `competitor_quote_amount` — prima del competidor (si se capturó)
- `competitor_insurer` — nombre de la aseguradora competidora

**Archivos:**
- [ ] `src/repositorios/adriana-repository.js` — agregar métodos `updateKYC()` y `saveCompetitorQuote()`
- [ ] Migración SQL: `ALTER TABLE insurance_leads ADD COLUMN IF NOT EXISTS ...`

**Checkpoint:** commit `feat(adriana): KYC columns + competitor_quotes en repository`

---

## 🟡 BLOQUE 3 — Enzo Leads frontend `/enzo-leads.html` (1h)

**Objetivo:** El backend de enzo-leads ya existe (`/api/enzo/leads/*`). Solo falta el dashboard HTML.

**Funcionalidad:**
- Tabla de leads con columnas: código, empresa, contacto, email, status, día de follow-up, prima
- Botones de acción: 📲 WA D+1/D+3/D+7, cambiar status
- KPIs: total leads, en negociación, conversión
- Estilo consistente con `enzo-proyectos.html`

**Archivos:**
- [ ] Crear `public/enzo-leads.html`
- [ ] Agregar link en `public/admin-coworkia.html`

**Checkpoint:** commit `feat(enzo): leads dashboard frontend /enzo-leads.html`

---

## ✅ REGLAS DE EJECUCIÓN

1. **Leer antes de editar** — leer archivo completo antes de cualquier cambio
2. **No tocar Aurora** — tiene chat propio, excluir todas sus features
3. **No tocar orquestador** — sin cambios en `orquestador.js` sin análisis previo
4. **Commit por bloque** — commit al terminar cada bloque, no antes
5. **Si hay duda en un fix de wiring** → documentar el problema y pasar al siguiente, no bloquear
6. **Actualizar Magic Todos** — marcar `PATCH /api/todos/:id/status` los todos completados

---

## 🏁 DEFINICIÓN DE TERMINADO

- [ ] BLOQUE 1: Zero botones con 404 o fetch a endpoint inexistente en los 6 dashboards
- [ ] BLOQUE 2: `adrianaRepository.js` tiene métodos KYC + migración ejecutada
- [ ] BLOQUE 3: `/enzo-leads.html` funcional y linkeado desde admin panel

**Deploy final:** `git push heroku main` + `heroku logs --app coworkia-agent --num 20`
