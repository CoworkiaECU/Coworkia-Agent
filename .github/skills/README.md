# 🎓 Coworkia Skills - Sistema Autónomo

## 📚 Skills Disponibles

### 1. 🧠 coworkia-memory
**Memoria de largo plazo del proyecto**

Contexto completo del sistema multi-agente, decisiones técnicas, problemas resueltos, preferencias de Diego, y estado actual. Lee SIEMPRE al inicio de cada sesión.

**Cuándo usar**: 
- Al inicio de cada sesión
- Antes de proponer cambios arquitectónicos
- Para entender decisiones históricas del proyecto

---

### 2. 🤖 coworkia-autopilot
**Ejecución autónoma de planes de vuelo**

Permite al agente trabajar 2-3h sin supervisión, leyendo y ejecutando tareas automáticamente con checkpoints, detección de bloqueos, y logs de progreso.

**Activación**: `"autopilot verde nena"`

**Características**:
- Lee planes de vuelo automáticamente
- Ejecuta tareas con verificación
- Checkpoints cada 3-4 tareas (commits automáticos)
- Detección de bloqueos (3 intentos)
- Rollback automático si falla
- Decisiones autónomas para refactoring/fixes
- Pausa para cambios arquitectónicos

---

### 3. 📱 coworkia-notifications
**Sistema de notificaciones WhatsApp al celular personal de Diego**

El agente envía notificaciones cuando completa tareas, encuentra errores críticos, o necesita decisiones. Diego puede responder desde WhatsApp con comandos simples.

**Tipos de notificaciones**:
- ✅ Plan completado exitosamente
- ⚠️ Error crítico
- ❓ Necesita decisión
- 🔵 Checkpoint intermedio (opcional)

**Comandos por WhatsApp**:
- `Si` / `✓` → Aprobar
- `No` / `X` → Rechazar
- `Review` → Ver detalles
- `Deploy` → Desplegar a Heroku

**Estado**: 📋 Documentado (requiere implementación)

---

### 4. 📋 coworkia-planning
**Continuidad y gestión de planes de vuelo**

Sistema inteligente que gestiona la continuidad entre planes, permite encadenar trabajos multi-día, y mantiene el momentum del proyecto.

**Características**:
- Cola de planes en `queue.json`
- División automática de objetivos grandes
- Tracking de progreso entre sesiones
- Dependencies entre planes
- Estimación de tiempos
- Métricas de velocidad

**Comandos**:
- `"status de planes"` → Ver estado de cola
- `"añade a cola: [objetivo]"` → Añadir plan
- `"continuar con siguiente plan"` → Avanzar en secuencia

---

## 🚀 FLUJO DE TRABAJO AUTÓNOMO

### Sesión Típica con Skills

```
1. 🧠 INICIO DE SESIÓN
   → Agente lee coworkia-memory.md
   → Lee reglas_multiagente.md
   → Lee cola de planes (queue.json)
   → Saluda con contexto completo

2. 📋 PLANNING
   → Diego: "quiero implementar X"
   → Agente analiza scope
   → Si > 6h: propone división en planes
   → Añade a queue.json
   → Genera plan-vuelo-[fecha].md

3. 🤖 EJECUCIÓN
   → Diego: "autopilot verde nena"
   → Agente lee plan de vuelo
   → Ejecuta tareas automáticamente
   → Checkpoints cada 3-4 tareas
   → Notifica progreso (opcional)

4. 📱 NOTIFICACIONES (si habilitadas)
   → ✅ "Plan completado, ¿deploy?"
   → Diego responde "Si" desde WhatsApp
   → Deploy automático a Heroku
   → Confirmación de éxito

5. 📋 CONTINUIDAD
   → Actualiza queue.json (status → completed)
   → Identifica siguiente plan
   → Pregunta si continuar
   → Genera nuevo plan de vuelo
   → Repite ciclo
```

---

## 📊 REDUCCIÓN DE INTERVENCIÓN

### Antes de Skills (Manual)
- ⏱️ **100% tiempo de Diego** revisando código
- 🔄 **Contexto perdido** entre sesiones
- 📝 **Plans escritos manualmente** cada vez
- ❓ **Preguntas repetitivas** sobre el proyecto
- 🐌 **Ejecución supervisada** tarea por tarea

### Con Skills (Autónomo)
- ⏱️ **50% tiempo de Diego** (solo decisiones y ventas)
- 🧠 **Contexto preservado** automáticamente
- 📝 **Plans auto-generados** desde objetivos
- ✅ **Zero preguntas básicas** (memoria completa)
- 🚀 **Ejecución autónoma** 2-3h sin supervisión

**ROI**: Diego gana 4-6h/día para ventas y clientes

---

## 🛠️ SETUP INICIAL

### 1. Verificar Skills Cargados

Los skills se cargan automáticamente desde `.github/skills/[nombre]/SKILL.md`

Para verificar:
```bash
# Los skills deberían aparecer en VS Code Copilot
```

### 2. Configurar Variables de Entorno (Notificaciones)

En tu `.env`:
```bash
# Para notificaciones WhatsApp (opcional)
DIEGO_PERSONAL_PHONE="+593xxxxxxxxx"
NOTIFICATIONS_ENABLED=false  # true cuando implementes
NOTIFICATIONS_CHECKPOINT=false  # true para checkpoints intermedios
```

### 3. Inicializar Cola de Planes

Ya existe `planes-de-vuelo/queue.json` con estructura base.

Para añadir tu primer objetivo:
```javascript
import { addToQueue } from './src/utils/plan-queue-manager.js';

await addToQueue({
  title: 'Mi Objetivo',
  estimatedTime: '3-4h',
  priority: 'high',
  notes: 'Descripción del objetivo'
});
```

---

## 📝 CREANDO UN PLAN DE VUELO COMPATIBLE

Para que autopilot funcione, los planes deben seguir esta estructura:

```markdown
# ✈️ Plan de Vuelo - [Fecha]

## 🎯 OBJETIVO
[Descripción clara del objetivo del día]

---

## 📋 TAREAS

### Bloque 1: [Nombre del Bloque]
- [ ] Tarea 1 específica y accionable
- [ ] Tarea 2 específica y accionable
- [ ] Tarea 3 específica y accionable

### Bloque 2: [Nombre del Bloque]
- [ ] Tarea 4

### Bloque 3: Testing
- [ ] Test unitarios
- [ ] Verificar features existentes

---

## ⏱️ ESTIMACIÓN
- **Tiempo estimado**: 3-4h
- **Autopilot**: Compatible ✓
```

**Claves**:
- ✅ Tareas claras y específicas
- ✅ Un checkbox `[ ]` por tarea
- ✅ Agrupadas en bloques lógicos
- ✅ Sin ambigüedad

---

## 🧪 TESTING DE SKILLS

### Test Manual de Memoria

```bash
# Inicio de sesión nuevo
# El agente debería saludar con contexto completo del proyecto
# Sin preguntas básicas sobre arquitectura o setup
```

### Test Manual de Autopilot

```bash
# 1. Crear plan de prueba simple
# 2. Decir: "autopilot verde nena"
# 3. Verificar que ejecuta tareas automáticamente
# 4. Verificar commits cada 3-4 tareas
# 5. Verificar que pausa en errores
```

### Test Manual de Planning

```bash
# 1. Decir: "añade a cola: implementar cache Redis"
# 2. Verificar que aparece en queue.json
# 3. Decir: "status de planes"
# 4. Verificar que muestra la cola correctamente
```

---

## 📚 ORDEN DE LECTURA RECOMENDADO

Para entender el sistema completo:

1. **README.md** (este archivo) - Vista general
2. **coworkia-memory/SKILL.md** - Contexto del proyecto
3. **coworkia-autopilot/SKILL.md** - Cómo funciona la ejecución autónoma
4. **coworkia-planning/SKILL.md** - Gestión de planes
5. **coworkia-notifications/SKILL.md** - Sistema de notificaciones

---

## 🔄 ROADMAP DEL SISTEMA

### v1.0 - Actual (20 Mar 2026)
- [x] Skill de memoria completo
- [x] Skill de autopilot completo
- [x] Skill de planning completo
- [x] Skill de notificaciones (documentado)
- [x] queue.json implementado
- [x] plan-queue-manager.js implementado

### v1.1 - Próximos Pasos
- [ ] Implementar sistema de notificaciones WhatsApp
- [ ] Testing exhaustivo de autopilot
- [ ] Generador automático de planes desde queue
- [ ] Dashboard web para visualizar cola

### v2.0 - Futuro
- [ ] IA que estima tiempos con ML
- [ ] Auto-división de objetivos grandes
- [ ] Integración con calendario (deadlines)
- [ ] Ejecución paralela de tareas independientes
- [ ] Deploy automático tras tests exitosos

---

## 🎯 MÉTRICAS DE ÉXITO

El sistema de skills es exitoso cuando:

- 🎯 **Diego interviene < 50%** del tiempo que antes
- 🧠 **0 preguntas básicas** sobre setup del proyecto
- 🤖 **Autopilot completa > 80%** de tareas sin intervención
- 📋 **Plans encadenados** sin perder contexto
- ⏱️ **Diego gana 4-6h/día** para ventas

---

## ❓ FAQ

**P: ¿Los skills reemplazan a Diego?**
R: No. Los skills hacen trabajo repetitivo y permiten a Diego enfocarse en decisiones estratégicas y ventas.

**P: ¿Qué pasa si autopilot se equivoca?**
R: Todos los cambios son commits individuales. Fácil hacer rollback. Además, autopilot pausa ante cambios arquitectónicos.

**P: ¿Puedo desactivar notificaciones?**
R: Sí, con `NOTIFICATIONS_ENABLED=false` en .env

**P: ¿Cómo sé qué skill usar?**
R: VS Code Copilot carga skills automáticamente según contexto. Puedes invocarlos explícitamente si es necesario.

**P: ¿Los skills funcionan offline?**
R: La memoria y planning sí (archivos locales). Autopilot y notificaciones requieren conexión (OpenAI, Wassenger).

---

## 🆘 TROUBLESHOOTING

### Autopilot no arranca
- Verifica que exista plan de vuelo del día
- Verifica formato del plan (checkboxes `[ ]`)
- Verifica no hay errores de compilación previos

### Queue.json no actualiza
- Verifica permisos de escritura en `planes-de-vuelo/`
- Verifica formato JSON válido
- Revisa logs de `plan-queue-manager.js`

### Skills no cargan en VS Code
- Verifica estructura: `.github/skills/[nombre]/SKILL.md`
- Verifica frontmatter YAML válido
- Reinicia VS Code

---

**Creado**: 20 Mar 2026
**Autor**: Coworkia Agent (Aurora) + Diego
**Versión**: 1.0
**Licencia**: Privado (uso interno Coworkia)
