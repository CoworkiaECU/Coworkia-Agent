# 🤖 Coworkia Agent — Instrucciones Automáticas de Inicio

## PROTOCOLO OBLIGATORIO AL INICIAR CADA CHAT

Al abrir cualquier conversación con Diego, el agente DEBE hacer esto **antes de responder cualquier pregunta**:

### PASO 1 — Cargar memoria del proyecto
Lee en este orden (todos antes de responder):
1. `/Users/diegovillota/coworkia-agent/.github/memory/user.md` — quién es Diego y cómo trabaja
2. `/Users/diegovillota/coworkia-agent/.github/memory/decisions.md` — decisiones técnicas permanentes
3. `/Users/diegovillota/coworkia-agent/.github/memory/preferences.md` — estilo UX y coding
4. `/Users/diegovillota/coworkia-agent/.github/memory/people.md` — personas y agentes
5. Skill completo: `/Users/diegovillota/coworkia-agent/.github/skills/coworkia-memory/SKILL.md`

### PASO 2 — Identificar el chat actual (SISTEMA MULTI-CHAT)

**Diego trabaja en 3 chats paralelos simultáneos**, cada uno enfocado en un agente distinto.
Esto le permite trabajar en Aurora, Aluna y Adriana sin mezclar contextos.

**IMPORTANTE:** Cuando Diego abre un chat limpio, TÚ debes saludar primero y preguntar en qué agente enfocar.
Si Diego ya escribió primero, identifica el agente según su mensaje:

- "nena hoy nos enfocamos en **aurora**" → Este es el chat de Aurora
- "nena hoy nos enfocamos en **aluna**" → Este es el chat de Aluna  
- "nena hoy nos enfocamos en **adriana**" → Este es el chat de Adriana
- Si no lo dice explícitamente → revisar archivos abiertos y plan de vuelo activo

**Cada agente tiene su propio plan de vuelo** en:
```
planes-de-vuelo/aurora/plan-vuelo-aurora-*.md
planes-de-vuelo/aluna/plan-vuelo-aluna-*.md
planes-de-vuelo/adriana/plan-vuelo-adriana-*.md
```

**Al identificar el chat:**
1. Leer el plan de vuelo del agente correspondiente (buscar el más reciente)
2. Retomar desde la última tarea marcada `[x]`
3. Continuar con la siguiente tarea `[ ]`
4. Al finalizar sesión → actualizar checkboxes del plan + anotar estado

**Si es un chat completamente nuevo (sin historial):**
- TÚ debes saludar primero
- Pregunta: "¿En qué agente nos enfocamos hoy? (aurora/aluna/adriana)"
- Luego carga el plan de vuelo correspondiente y arranca

### PASO 2b — Revisar plan de reparación Self-Healing (si existe)
Después de cargar la memoria, busca si existe un archivo `planes-de-vuelo/plan-vuelo-repair-[YYYY-MM-DD].md` con la fecha de hoy.

**Si existe Y su estado es pendiente:**
1. Leer el contenido del plan
2. Verificar en BD el estado del reporte:
   ```javascript
   const report = await fetch('https://coworkia-agent-e97d15dac56f.herokuapp.com/api/self-healing/latest');
   // Si status === 'pending' y errorsFound > 0 → incluir en saludo
   ```
3. Mencionarlo en el saludo con **prioridad alta**:
   ```
   ⚠️ PLAN DE REPARACIÓN PENDIENTE:
      → N issues detectados anoche por Self-Healing System
      → [N críticos / N altos / N medios]
      → Plan: plan-vuelo-repair-[fecha].md
   
   ¿Lo revisamos primero o seguimos con [plan normal]?
   ```

**Comando "repair" desde WhatsApp:**
- Si Diego escribe "repair" desde su celular (en wassenger.js), responder con:
  - Resumen del último reporte de self_healing_reports
  - Top 3 issues priorizados
  - Ofrecer "autopilot para reparar" si Diego lo aprueba

### PASO 3 — Saludar con resumen específico del chat actual

**REGLA CRÍTICA:** Si el chat está vacío (sin historial), TÚ debes saludar primero.
No esperes a que Diego hable. Carga la memoria y pregunta en qué agente enfocar.

El saludo SIEMPRE debe incluir:
1. **En qué nos quedamos en ESTE chat** (basado en archivos abiertos + última sesión de memoria)
2. **Siguiente tarea inmediata** para este chat
3. **Estado del sistema** (versión actual, producción OK/NOK)

**Formato del saludo (chat existente con contexto)**:
```
¡Hola Diego! 🤖

📋 Chat: [Adriana / Aurora / Aluna / General]
🔖 Última sesión: [fecha] — [resumen 1 línea]

📍 Nos quedamos en:
   → [tarea específica pendiente de este chat]
   → [estado: completado / en progreso / bloqueado]

🎯 Siguiente paso inmediato:
   → [descripción concreta]

🟢 Producción: v[versión] — [commit hash corto]

¿Arrancamos? 🚀
```

**Formato del saludo (chat nuevo sin historial)**:
```
¡Hola Diego! 🤖

✨ Chat limpio iniciado

¿En qué agente nos enfocamos hoy?
→ Aurora (reservas coworking)
→ Aluna (membresías/closer)
→ Adriana (seguros vehiculares)

Dime el agente y cargo su plan de vuelo 🚀
```

### PASO 4 — Skills disponibles (NO listar, solo cargar cuando se necesiten)
Los skills se cargan bajo demanda según la tarea. La lista completa está en el índice de customizaciones.

---

## REGLAS PERMANENTES DEL PROYECTO

### Adriana (Seguros Vehiculares)
- VAZ = proveedor, **NO** co-brand en comunicaciones al cliente
- Plan para clientes: **"VAZ Elemental"** (código interno: "Ensigna")
- Pagos: **hasta 12 meses**
- Deducible mostrado al cliente: **7%** (no mencionar "Taller VAZ")
- Prima mensual: `annualTotal / 12` (no /10)
- `buildEmailTemplate(agent, type)` → type sin prefijo: `'COMPARISON_V2'` ✅

### Coding Standards
- ES Modules (`import/export`), no CommonJS
- No heredoc en zsh para código Node — siempre escribir a `.mjs` primero
- Input de montos: siempre `type="text" inputmode="decimal"`, nunca `type="number"`
- Parse de montos: `parseFloat(value.replace(',', '.'))` — acepta coma y punto

### Deploy
- Siempre `git push heroku main`
- Notificar a Diego por WA al terminar un bloque con `notifyAutopilotComplete()`
- Verificar logs tras deploy: `heroku logs --app coworkia-agent --num 20`

### Magic ✨Todos — Actualización Obligatoria

> **REGLA CRÍTICA:** Al final de **CADA transacción con el sistema** (cualquier commit, deploy, feature, fix, migración, auditoría, o bloque de autopilot), el agente DEBE actualizar el Magic Todos dashboard. Sin excepción.

- **Al finalizar cualquier acción concreta** (commit, deploy, feature, fix, migración, auditoría, bloque autopilot), el agente DEBE actualizar el estado de los todos correspondientes vía `PATCH /api/todos/:id/status`
- Estados válidos: `pending` → `in_progress` → `done` | `blocked`
- Si no existe un todo para la tarea ejecutada, **crearlo** vía `POST /api/todos` antes de marcarlo como `done`
- Dashboard: `/todos-dashboard.html` — visible en producción en tiempo real
- **Flujo obligatorio por cada transacción:**
  1. Al iniciar → `PATCH /api/todos/:id/status` con `{ status: 'in_progress' }`
  2. Al terminar → `PATCH /api/todos/:id/status` con `{ status: 'done' }`
  3. Si no existe el todo → `POST /api/todos` con `{ title, agent, priority }` → luego PATCH a `done`
- La URL base es siempre `https://coworkia-agent-e97d15dac56f.herokuapp.com`

### Seguridad  
- Solo `DIEGO_PERSONAL_PHONE` puede ejecutar comandos del bot
- Nunca hardcodear tokens/keys — siempre `process.env.*`
- `ADMIN_CC` email: `process.env.COWORKIA_ADMIN_EMAIL || ''` (sin fallback hardcodeado)
