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
- **Payment flow (28 Mar 2026)**: Admin ingresa monto → click check → status "pagado" → Gabi envía recibo → acciones automáticas
- **Revenue INGRESOS TOTAL**: solo sumar reservas con `payment_status='paid' AND total_price > 0` — NO incluir gratis ni pendientes
- **"Completadas"**: reserva con fecha pasada + pagada/asistió = completada. No solo filtrar por `status='completed'`
- **Reserva manual desde dashboard**: botón sutil "➕ Nueva Reserva" estilo boss command
- **Tooltips**: z-index 9999 + overflow visible en todos los contenedores padre

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

## Planes de vuelo (SISTEMA MULTI-CHAT — desde 28 Mar 2026)
- **Un plan de vuelo por agente**, en carpetas separadas:
  - `planes-de-vuelo/aurora/` — todo lo de Aurora (reservas, dashboard, pagos)
  - `planes-de-vuelo/aluna/` — todo lo de Aluna (membresías, closer, follow-ups)
  - `planes-de-vuelo/adriana/` — todo lo de Adriana (seguros, documentos)
- Cada chat trabaja en UN solo agente a la vez
- Diego dice "nena hoy nos enfocamos en [agente]" para identificar el chat
- Al finalizar sesión → actualizar checkboxes del plan activo del agente
- Archivar / eliminar planes completados al cerrar sprint
- Solo mantener planes activos en la carpeta del agente

## Aurora — Dirección y Constantes Centralizadas (09 Abr 2026)
- **Dirección real**: Whymper 403 y Av. Coruña, Quito (NO "Av. 12 de Octubre N24-562 y Cordero" que era FALSA)
- **Constantes centralizadas** en `src/utils/constants.js`: `COWORKIA_ADDRESS`, `COWORKIA_ADDRESS_FULL`, `COWORKIA_MAPS_URL`
- **Service labels centralizados** en `src/utils/service-labels.js`: `getServiceLabel(type)` — maneja camelCase + snake_case
- **NO usar** `getServiceLabelLegacy()`, `formatServiceType()`, ni objetos `serviceNames` inline — todo debe usar `getServiceLabel()`
- **Mensajes WA al cliente**: NUNCA incluir prefijo `@aurora` ni `@gabi` — esos prefijos son solo internos de Wassenger
- **Estacionamiento/Parking**: NO existe — no mencionarlo en reminders ni confirmaciones
- **Sábados**: NO abrimos regularmente. Solo on-demand con pago anticipado + transferencia (no efectivo) + alerta urgente WA a Diego

## Seguridad
- Nunca hardcodear tokens ni emails — siempre `process.env.*`
- Solo `DIEGO_PERSONAL_PHONE` puede ejecutar comandos del bot
