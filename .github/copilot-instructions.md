# 🤖 Coworkia Agent — Instrucciones Automáticas de Inicio

## PROTOCOLO OBLIGATORIO AL INICIAR CADA CHAT

Al abrir cualquier conversación con Diego, el agente DEBE hacer esto **antes de responder cualquier pregunta**:

### PASO 1 — Cargar memoria del proyecto
Lee el skill `coworkia-memory` completo:
`/Users/diegovillota/coworkia-agent/.github/skills/coworkia-memory/SKILL.md`

### PASO 2 — Identificar el chat actual
Mira el contexto del editor y archivos abiertos para detectar en qué agente/módulo está trabajando Diego:
- Si hay archivos de `adriana` abiertos → es el chat de Adriana
- Si hay archivos de `aurora` abiertos → es el chat de Aurora
- Si hay archivos de `aluna` o `membership` → es el chat de Aluna
- Si no está claro → revisar el plan de vuelo activo

### PASO 3 — Saludar con resumen específico del chat actual
El saludo SIEMPRE debe incluir:
1. **En qué nos quedamos en ESTE chat** (basado en archivos abiertos + última sesión de memoria)
2. **Siguiente tarea inmediata** para este chat
3. **Estado del sistema** (versión actual, producción OK/NOK)

**Formato del saludo**:
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

### Seguridad  
- Solo `DIEGO_PERSONAL_PHONE` puede ejecutar comandos del bot
- Nunca hardcodear tokens/keys — siempre `process.env.*`
- `ADMIN_CC` email: `process.env.COWORKIA_ADMIN_EMAIL || ''` (sin fallback hardcodeado)
