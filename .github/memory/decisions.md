# Decisiones Técnicas del Proyecto

## Arquitectura
- **Stack**: Node.js + Express + PostgreSQL + Heroku + Wassenger API
- **Frontend dashboards**: HTML puro + JS vanilla (no React/Vue) — decisión consciente para simplicidad
- **Módulos**: ES Modules (`import/export`), NO CommonJS
- **Deploy**: `git push heroku main` — siempre. Release phase limpia BD de testing.
- **BD**: Una sola PostgreSQL en Heroku. NO SQLite local en producción.

## Routing de mensajes WhatsApp (Wassenger)
- **REGLA CRÍTICA**: Todo mensaje enviado a Wassenger DEBE comenzar con `@[agente]\n`
- Ejemplo: `@aurora\nHola! Tu reserva está confirmada.`
- Sin este prefijo, el mensaje lo responde el agente equivocado
- Agentes: `@aurora`, `@aluna`, `@adriana`, `@gabi`, `@enzo`, `@axel`, `@paula`

## Inputs de dinero
- Siempre `type="text" inputmode="decimal"`, NUNCA `type="number"`
- Parse: `parseFloat(value.replace(',', '.'))` — acepta coma y punto

## Adriana (Seguros)
- VAZ = proveedor. NO decir "VAZ" al cliente, solo "tu aseguradora"
- Plan cliente: "VAZ Elemental" (interno: "Ensigna")
- Prima mensual: `annualTotal / 12` (NO /12.something, NO /10)
- Deducible al cliente: 7%
- `buildEmailTemplate(agent, type)` → type sin prefijo: `'COMPARISON_V2'` ✅

## Aurora (Reservas)
- Release phase de Heroku BORRA reservas `pending`, `cancelled` en cada deploy → grupos "Interesados" siempre vacíos en testing
- D+7 tab vacío = correcto en staging (no hay `completed` recientes después del clean)
- Los `@aurora` prefixes están en: `buildOneHourWhatsApp`, `buildRebookingWhatsApp`, `send-campaign`, `register-payment`
- Prospectos: tabla (no grid de cards) — decisión 23 Mar 2026
- **Dashboard arranca siempre en tab "Todas"** — NO persistir el tab activo en localStorage (fix 24 Mar 2026: localStorage causa que reabrir el dash quede atrapado en D+7=0)

## Dashboard UX — Decisiones tomadas
- Columnas de tabla: truncar agentes a 3+N, temas a 3+N con tooltip hover
- `.card` NO debe tener `overflow:hidden` — rompe tooltips `::after`
- Cache-busting con `?v=YYYYMMDD[letra]` en todos los `<script src>`
- Siempre validar JS con `node --check archivo.js` antes de commitear

## Testing
- Framework: Jest con ES Modules (`NODE_OPTIONS=--experimental-vm-modules`)
- Mock pattern: `jest.unstable_mockModule` — declarar ANTES del primer `import` del módulo bajo test
- `dashboard-endpoints.test.js`: 29 tests — mocks devuelven null/[] → acción-buttons dan 404 (correcto para ese suite)
- `action-buttons.test.js`: 26 tests — mocks devuelven leads reales → botones devuelven 200 + WA/email llamado
- Rutas correctas de email: `../../src/servicios/email.js` y `../../src/servicios/email-template-system.js`
- Tests que requieren BD real (`aurora-integration`, `aluna-integration`) cuelgan en local — NO correr sin `--forceExit --testTimeout`
- Comando: `npm test -- <archivo> --forceExit --testTimeout=15000`

## Magic Todos — Fuente de verdad del backlog

**REGLA CRÍTICA AL INICIO DE SESIÓN**: Siempre consultar el dashboard de todos ANTES de proponer un plan:
```js
const res = await fetch('https://coworkia-agent-e97d15dac56f.herokuapp.com/api/todos');
const d = await res.json();
// Filtrar: d.todos.filter(t => t.status !== 'done')
```
- Los todos en el dashboard son la fuente de verdad del backlog de Diego
- Tienen prioridad sobre los planes de vuelo (que son snapshots del pasado)
- Diego los escribe directamente desde el admin — confiar en ellos
- Al terminar una tarea: PATCH `/api/todos/:id/status` con `{ status: 'done' }`
- Al crear tarea nueva: POST `/api/todos` con `{ title, agent, priority }`

## Planes de vuelo
- Archivar / eliminar planes de vuelo completados al cerrar sprint
- Solo mantener el plan activo o "próxima sesión" en `/planes-de-vuelo/`
- Nuevo plan se crea en: `planes-de-vuelo/plan-vuelo-DDMMM.md`

## Seguridad
- Nunca hardcodear tokens ni emails — siempre `process.env.*`
- Solo `DIEGO_PERSONAL_PHONE` puede ejecutar comandos del bot
