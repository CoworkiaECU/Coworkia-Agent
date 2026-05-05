# 🤖 Coworkia Agent

## INICIO DE CHAT — leer siempre antes de responder

1. `.github/memory/user.md` — quién es Diego
2. `.github/memory/decisions.md` — decisiones técnicas
3. `.github/memory/preferences.md` — estilo UX y coding
4. `.github/memory/people.md` — personas y agentes

> Solo leer `.github/skills/coworkia-memory/SKILL.md` si Diego pide contexto de un agente específico o dice "carga memoria completa".

## Sistema 3-Chat

- **Torre de Control**: Diego dice "tu eres torre de control". Planifica, genera prompts copiables para chats de ejecución. NO deploya.
- **Chat de Ejecución**: Diego pega un prompt de Torre. Ejecuta tareas en orden, commitea con prefijo del agente (`fix(paula):`, `feat(adriana):`, `fix(aurora):`). NO deploya.
- Planes de vuelo: `planes-de-vuelo/[agente]/plan-vuelo-*.md` — retomar desde último `[x]`.
- Si chat vacío → saludar primero: chat actual, última sesión, siguiente tarea, estado producción.

## Self-Healing

Si existe `planes-de-vuelo/plan-vuelo-repair-[YYYY-MM-DD].md` hoy y está pendiente → mencionarlo en el saludo con prioridad alta.

## Reglas técnicas

### Adriana (Seguros)
- VAZ = proveedor interno, NO co-brand con cliente
- Plan cliente: "VAZ Elemental" (código: "Ensigna"), pagos hasta 12 meses, deducible 7%
- Prima mensual: `annualTotal / 12`
- `buildEmailTemplate(agent, type)` → type sin prefijo: `'COMPARISON_V2'`

### Coding
- ES Modules (`import/export`), no CommonJS
- No heredoc en zsh — escribir a `.mjs` primero
- Montos: `type="text" inputmode="decimal"`, parse con `parseFloat(value.replace(',', '.'))`

### Deploy
- `git push heroku main` — solo con autorización de Torre de Control
- Notificar con `notifyAutopilotComplete()` al terminar
- Verificar: `heroku logs --app coworkia-agent --num 20`

### Magic Todos
- Fuente de verdad: `POST/PATCH /api/todos` — actualizar estado tras cada acción
- Estados: `pending → in_progress → done | blocked`
- URL base: `https://coworkia-agent-e97d15dac56f.herokuapp.com`
- Mensajes a Diego: usar `magicHeader()`, `dashboardCTA()`, `magicClosing()` de `magic-persona.js`
- Script único: `scripts/magic-notify.mjs`

### Seguridad
- Solo `DIEGO_PERSONAL_PHONE` puede ejecutar comandos del bot
- Nunca hardcodear tokens — siempre `process.env.*`
- `ADMIN_CC`: `process.env.COWORKIA_ADMIN_EMAIL || ''`
