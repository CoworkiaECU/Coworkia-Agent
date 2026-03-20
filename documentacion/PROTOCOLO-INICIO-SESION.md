# 🚀 Protocolo de Inicio de Sesión - Coworkia Agent

## ¿Por qué este protocolo?

Trabajar con **dos ventanas siempre visibles**:
1. **Plan de vuelo/contexto** (izquierda) - para ver progreso
2. **Chat activo** (derecha) - para interacción

Esto permite:
- ✅ Ver tareas mientras trabajamos
- ✅ Marcar checkpoints en tiempo real
- ✅ Mantener contexto compartido humano-agente
- ✅ No perder el norte del objetivo del día

---

## 📋 Cómo Iniciar una Sesión

### Opción 1: Script Automático (Recomendado)

```bash
npm run setup
```

Este comando:
- ✅ Encuentra el plan de vuelo del día
- ✅ Muestra estado del proyecto
- ✅ Sugiere archivos a abrir
- ✅ Da contexto inmediato

### Opción 2: Manual

1. **Abre el plan de vuelo del día**:
   - `planes-de-vuelo/plan-vuelo-[fecha].md`
   - Si no existe para hoy → usar el más reciente

2. **Split editor vertical**:
   - `⌘ + \` (Mac)
   - `Ctrl + \` (Windows/Linux)
   - O: `cmd+shift+p` → "View: Split Editor Right"

3. **Abre el chat en el panel derecho**:
   - El chat de Copilot debe estar visible
   - Si no → `⌘ + Shift + i` para abrir

---

## 🤖 Qué Hace el Agente al Inicio

Cuando inicias una sesión, el agente automáticamente:

1. **Lee coworkia-memory**: Contexto completo del proyecto
2. **Carga plan de vuelo**: Del día o el más reciente
3. **Verifica cola**: Si hay planes pendientes en `queue.json`
4. **Saluda y pregunta**: "¿Continuamos donde lo dejamos?"

### Ejemplo de Saludo del Agente:

```
¡Hola Diego! 👋

📋 Plan de vuelo cargado: plan-vuelo-20mar.md
🧠 Memoria del proyecto cargada
🎯 Objetivo: Aluna 100% operativo

¿Continuamos con el plan o hay algo nuevo? 🚀
```

---

## 📂 Estructura de Workspace Ideal

```
┌─────────────────────────┬─────────────────────────┐
│                         │                         │
│  PANEL IZQUIERDO        │  PANEL DERECHO          │
│                         │                         │
│  📄 Plan de Vuelo       │  💬 GitHub Copilot Chat │
│                         │                         │
│  ✅ BLOQUE 1            │  Usuario: "verde nena"  │
│  ⏳ BLOQUE 2            │                         │
│  ⬜ BLOQUE 3            │  Agente: "Entendido..." │
│                         │                         │
│  ## Checkpoints         │  [trabajo en progreso]  │
│  - [x] Auditoría        │                         │
│  - [ ] Tracking         │                         │
│                         │                         │
└─────────────────────────┴─────────────────────────┘
```

---

## 💡 Tips de Productividad

### Para Diego:
- **Al inicio del día**: corre `npm run setup`
- **Marca checkpoints**: en el plan mientras trabajas
- **Usa "verde nena"**: cuando apruebes una acción
- **Actualiza el plan**: al terminar cada bloque

### Para el Agente:
- **Lee el plan PRIMERO**: antes de preguntar qué hacer
- **Marca tareas completadas**: en tiempo real
- **Commit frecuente**: cada 2-3 tareas
- **Documenta decisiones**: en el plan o en memoria

---

## 🔄 Comandos Rápidos

```bash
# Iniciar sesión de trabajo
npm run setup

# Ver estado de Aluna
node scripts/check-aluna-status.mjs

# Test de captura de keywords
node scripts/test-aluna-capture.mjs

# Ver logs de Heroku
heroku logs --tail --app coworkia-agent

# Deploy rápido
git add . && git commit -m "tu mensaje" && git push heroku main
```

---

## 🎯 Workflow Típico

1. **Iniciar**:
   ```bash
   npm run setup
   ```

2. **Abrir archivos sugeridos** en dos paneles

3. **En el chat**, decir:
   ```
   Hola! Vamos con el plan del día
   ```

4. **Trabajar bloques** uno por uno:
   - Agente propone → Diego aprueba con "verde nena"
   - Agente ejecuta → marca checkpoint
   - Commit cada 2-3 tareas

5. **Al terminar**:
   - Actualizar plan con "🔮 LO QUE VIENE DESPUÉS"
   - Commit + Deploy si es necesario
   - Cerrar sesión consciente

---

## 📝 Ejemplo de Sesión Real

```bash
$ npm run setup

🚀 ═══════════════════════════════════
🤖   COWORKIA AGENT - SESSION SETUP
📋   Configuración de Workspace Dual Panel
🚀 ═══════════════════════════════════

✅ Plan del día encontrado: plan-vuelo-20mar.md
🔄 Trabajo en progreso: tracking-respuestas-aluna
📊 Planes pendientes en cola: 1

📂 ═══ ARCHIVOS A ABRIR ═══

📄 PANEL IZQUIERDO (Contexto):
   → planes-de-vuelo/plan-vuelo-20mar.md

💬 PANEL DERECHO:
   → Chat de Copilot (activo)

📊 ═══ ESTADO DEL PROYECTO ═══

✅ Aluna: Follow-ups D+1 y D+3 funcionando
✅ Aurora: Sistema estable 100%
⏳ Pendiente: Tracking de respuestas Aluna

🎯 ═══ LISTO PARA TRABAJAR ═══

   ¿Continuamos con el plan o hay algo nuevo?

🚀 ═══════════════════════════════════
```

---

## 🆘 Troubleshooting

### El plan del día no existe
**Solución**: El script abre el más reciente automáticamente

### No veo dos paneles
**Solución**: `⌘ + \` para split vertical

### El agente no recuerda el contexto
**Solución**: El agente debe leer `coworkia-memory` al inicio (skill automático)

### Quiero cambiar de plan
**Solución**: Edita `planes-de-vuelo/queue.json` manualmente

---

## 🔗 Referencias

- **Skills del proyecto**: `.github/skills/`
- **Planes de vuelo**: `planes-de-vuelo/`
- **Memoria del sistema**: `.github/skills/coworkia-memory/SKILL.md`
- **Autopilot**: `.github/skills/coworkia-autopilot/SKILL.md`

---

**Última actualización**: 20 Mar 2026  
**Versión**: 1.0  
**Autor**: Sistema Coworkia Agent
