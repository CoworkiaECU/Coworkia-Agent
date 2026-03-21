---
name: coworkia-conversations
description: Sistema de mejora continua automática. Cuando el agente detecta problemas, ineficiencias, bugs, o mejoras durante conversaciones con Diego o con los agentes del sistema, los registra, prioriza, y propone acciones de mejora. El sistema se auto-afina con cada sesión.
applyTo: "src/**,planes-de-vuelo/**,.github/skills/**"
---

# Continuous Improvement - Aprender de Cada Conversación

## 🎯 Principio Fundamental

**Cada conversación es una oportunidad de mejorar el sistema.**

Cuando Diego habla con un agente, cuando un cliente interactúa con el bot, cuando algo falla o funciona, el sistema debe aprender, registrar, y mejorar automáticamente. Sin necesidad de que Diego recuerde pedirlo.

---

## 🧠 QUÉ APRENDE EL SISTEMA

### De Conversaciones con Diego

El agente detecta automáticamente estos patrones:

**1. Fricción (Diego tiene que repetirse)**
```
Señal: "como te dije antes", "ya te lo dije", "esto ya debería funcionar"
Acción: Registrar gap de memoria + mejorar skill coworkia-memory
```

**2. Bugs o comportamiento inesperado**
```
Señal: "esto está roto", "no funciona", "falla", "se cayó"
Acción: Registrar en lista de bugs + añadir a próximo plan de vuelo
```

**3. Mejoras de UX / experiencia**
```
Señal: "sería mejor si...", "me gustaría que...", "¿por qué no hace..."
Acción: Registrar como feature request + priorizar según contexto
```

**4. Confirmación de que algo funciona bien**
```
Señal: "eso está perfecto", "así me gusta", "funciona genial", "te amo"
Acción: Registrar patrón exitoso en skills como referencia futura
```

**5. Correcciones en flight plan**
```
Señal: Diego cambia orden, elimina tareas, ajusta prioridades
Acción: Actualizar queue.json y plan activo inmediatamente
```

---

### De Conversaciones de Clientes con Agentes

Cuando los agentes (Aurora, Aluna, Adriana, Enzo) interactúan con clientes, el sistema debe detectar:

**1. Preguntas frecuentes no cubiertas**
```
Señal: Cliente pregunta algo que el agente no sabe responder bien
Acción: Agregar al knowledge base del agente específico
```

**2. Palabras de alta intención nuevas**
```
Señal: Cliente usa frase que indica interés pero no está en keyword list
Acción: Proponer agregar a aluna-high-intent-detector.js
```

**3. Objeciones recurrentes**
```
Señal: Patrón de respuestas negativas similares
Acción: Crear nuevo template de respuesta para esa objeción
```

**4. Puntos de abandono del flujo**
```
Señal: Conversación se corta en el mismo paso repetidamente
Acción: Mejorar el mensaje/pregunta en ese punto del flujo
```

---

## 🔄 PROTOCOLO DE MEJORA CONTINUA

### Al Final de Cada Sesión de Trabajo

El agente debe hacer esto AUTOMÁTICAMENTE al terminar una sesión larga:

```
1. DETECTAR: ¿Qué salió diferente a lo esperado?
2. APRENDER: ¿Qué patrón nuevo funcionó o falló?
3. REGISTRAR: Actualizar memoria/skills con el aprendizaje
4. PROPONER: Sugerir mejora al plan de vuelo o código
```

### Registro de Mejora (formato estándar)

```markdown
## Aprendizaje - [Fecha]

**Tipo**: bug | feature_request | ux_improvement | pattern_found | bug_fixed
**Agente**: Aurora | Aluna | Adriana | Enzo | Sistema
**Detectado en**: conversación Diego | conversación cliente | ejecución autopilot
**Descripción**: [qué pasó]
**Impacto**: alto | medio | bajo
**Acción sugerida**: [qué cambiar]
**Status**: pendiente | en_progreso | resuelto
```

---

## 📋 LISTA DE MEJORAS PENDIENTES

> Esta sección se actualiza automáticamente cuando se detectan mejoras.

### 🔴 Alta Prioridad

- [ ] **Templates sin logos/branding**: Emails de todos los agentes carecen de logo e identidad visual. Implementar `email-template-system.js` centralizado con branding por agente.
  - Detectado: conversación Diego 20-21 Mar 2026
  - Archivo: crear `src/servicios/email-template-system.js`

- [ ] **Aurora dashboard funciones "invisibles"**: Las funciones existen en código pero Diego no las encuentra porque no están destacadas visualmente.
  - Detectado: Diego dijo "muy confuso, no tiene funciones activadas"
  - Archivo: `public/aurora-reservas.html` + `public/js/aurora-dashboard.js`

### 🟡 Media Prioridad

- [ ] **`replace_string_in_file` falla con emojis corruptos**: Usar `sed` como backup cuando el string tiene emojis raros.
  - Detectado: sesión autopilot 20 Mar 2026 (ver coworkia-memory.md)
  - Patrón correcto: `sed -i '' 's/old/new/' archivo.js`

- [ ] **Notificación a Diego cuando autopilot termina**: Implementado parcialmente, verificar que llega al WhatsApp.
  - Detectado: sesión autopilot 20 Mar 2026
  - Archivo: `src/servicios/notification-service.js`

- [ ] **+10% buffer en estimaciones de tiempo**: El autopilot siempre termina en menos tiempo del estimado, pero algunas tareas toman más. Ajustar todos los planes.

### 🟢 Baja Prioridad

- [ ] **Keywords de high intent para Adriana**: El detector de Aluna tiene 45 keywords. Adriana necesita el suyo para seguros (prima, cotización, precio del seguro, cobertura, siniestro).
  - Archivo: crear `src/servicios/adriana-high-intent-detector.js`

- [ ] **A/B testing para follow-ups de Aluna**: Ver si versión A vs versión B del mensaje D+1 convierte más.
  - Detección: planeado en queue.json pero pendiente

---

## 🤖 APRENDIZAJES DEL SISTEMA REGISTRADOS

### Lo Que Siempre Funciona

```
✅ Patrones copy-paste de servicios existentes → velocidad 4x
✅ Tests básicos antes de commit → 0 regressions en prod
✅ Plan de vuelo con bloques < 45min → ejecución sin fricción
✅ try/catch no-crítico → features nuevas no rompen flujo existente
✅ Commits incrementales (cada bloque) → rollback fácil si algo falla
✅ Notificación a Diego cuando autopilot detecta high intent → vende más
```

### Lo Que Siempre Falla / Que Evitar

```
❌ Modificar > 3 archivos en un solo cambio sin plan claro
❌ Crear código genérico "para el futuro" → siempre termina sin usar
❌ Sesiones de autopilot > 3h sin checkpoint → pérdida de contexto
❌ No leer DONT-REPEAT-YOURSELF antes de crear → duplicación
❌ Sobrecomplicar queries SQL → siempre hay una versión más simple
```

### Preferencias de Diego

```
🎯 "Asesorame siempre" → proponer antes de ejecutar cuando es algo grande
🚀 "Get shit done" → ejecutar sin preguntar para tareas claras
💬 "Ordena mis ideas" → cuando tiene requerimientos sueltos, estructurar primero
🛑 "Para" → detener autopilot inmediatamente
✅ "Autopilot verde nena" → activar modo autónomo extendido
🤝 "Trabajamos juntos en las ideas que me presentas" → co-creación, no solo ejecución
```

---

## 🔄 CICLO DE VIDA DE UNA MEJORA

```
1. DETECTAR → en conversación, log, o error
       ↓
2. REGISTRAR → agregar a "Lista de Mejoras Pendientes" (esta sección)
       ↓
3. PRIORIZAR → alta/media/baja según impacto
       ↓
4. PLANIFICAR → agregar al próximo plan de vuelo como bloque
       ↓
5. EJECUTAR → autopilot o sesión manual
       ↓
6. VERIFICAR → test confirma que mejora funciona
       ↓
7. CERRAR → marcar como resuelto + actualizar skill relevante
       ↓
8. APRENDER → registrar patrón exitoso para futuros casos
```

---

## 📊 CÓMO ALIMENTAR ESTE SISTEMA

### En Código (logs de aprendizaje)

```javascript
// En cualquier agente, cuando detecta algo inusual:
import { logImprovement } from '../servicios/improvement-tracker.js';

// Si cliente pregunta algo que el agente no sabe
if (responseConfidence < 0.7) {
  await logImprovement({
    type: 'knowledge_gap',
    agent: 'Adriana',
    trigger: userMessage,
    suggested: 'Añadir FAQ sobre ' + topic,
    priority: 'medium'
  });
}
```

### En Conversaciones con Diego

El agente SIEMPRE debe al final de sesión larga:
1. "¿Algo que mejorar del proceso de hoy?"
2. Registrar respuesta en este skill
3. No esperar a que Diego lo recuerde

### En Autopilot

Al final de cada sesión autopilot, el agente agrega automáticamente:
```
## Aprendizaje de Sesión Autopilot - [fecha]
- ✅ Lo que salió bien:
- ⚠️ Lo que tomó más tiempo del esperado:
- 💡 Sugerencia para próxima sesión:
```

---

## 🔗 SKILLS COMPLEMENTARIOS

- **coworkia-memory**: Donde van los aprendizajes de largo plazo
- **coworkia-planning**: Para agregar mejoras al próximo plan de vuelo
- **GET-SHIT-DONE**: Para ejecutar las mejoras rápido sin sobre-ingeniería
- **DONT-REPEAT-YOURSELF**: Para no crear la misma solución dos veces
