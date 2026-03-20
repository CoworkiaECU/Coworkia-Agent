---
name: coworkia-planning
description: Sistema de continuidad y gestión de planes de vuelo. Permite encadenar múltiples planes, dividir objetivos grandes en planes manejables, trackear progreso entre sesiones, y sugerir próximos pasos automáticamente. Integrado con autopilot.
---

# Coworkia Planning - Continuidad Entre Planes

## 🎯 Propósito de Este Skill

**Objetivos grandes se ejecutan en secuencia automática sin perder contexto.**

Sistema inteligente que gestiona la continuidad entre planes de vuelo, permite encadenar trabajos multi-día, y mantiene el momentum del proyecto aunque haya interrupciones.

---

## 📋 ESTRUCTURA DE LA COLA

### Archivo: `planes-de-vuelo/queue.json`

```json
{
  "version": "1.0",
  "lastUpdated": "2026-03-20T10:30:00Z",
  "currentPlan": "plan-vuelo-20mar.md",
  "queue": [
    {
      "id": "aluna-followups-completo",
      "title": "Aluna Follow-ups Sistema Completo",
      "status": "completed",
      "plan": "plan-vuelo-18mar.md",
      "startedAt": "2026-03-18T09:00:00Z",
      "completedAt": "2026-03-18T16:30:00Z",
      "duration": "7.5h",
      "commits": ["v925", "v926", "v927"],
      "notes": "Dashboard + keywords + tracking automático"
    },
    {
      "id": "aluna-dashboard-metricas",
      "title": "Dashboard Aluna - Métricas Avanzadas",
      "status": "in-progress",
      "plan": "plan-vuelo-20mar.md",
      "startedAt": "2026-03-20T10:00:00Z",
      "estimatedTime": "3-4h",
      "tasksTotal": 12,
      "tasksCompleted": 7,
      "blockers": [],
      "notes": "Filtros + export CSV + modal campañas"
    },
    {
      "id": "aluna-ab-testing",
      "title": "A/B Testing Sistema para Follow-ups",
      "status": "pending",
      "plan": null,
      "estimatedTime": "4-5h",
      "dependencies": ["aluna-dashboard-metricas"],
      "priority": "high",
      "notes": "Requiere dashboard completado para métricas"
    },
    {
      "id": "axel-v2-features",
      "title": "Axel v2 - CTAs + Calendario + Recordatorios",
      "status": "pending",
      "plan": null,
      "estimatedTime": "2-3h",
      "dependencies": [],
      "priority": "medium",
      "notes": "Mejoras UX post-MVP"
    }
  ]
}
```

### Estados de Planes

- **`pending`**: No iniciado, esperando turno
- **`in-progress`**: Plan activo actual
- **`blocked`**: Bloqueado por dependencia o decisión pendiente
- **`completed`**: Terminado exitosamente
- **`cancelled`**: Cancelado (cambio de prioridades)

---

## 🔄 FLUJOS DE TRABAJO

### 1. Completar Plan y Pasar al Siguiente

**Trigger**: Autopilot termina plan actual

**Flujo**:
```
┌─────────────────────────────────────────────┐
│ 1. Autopilot completa plan-vuelo-20mar.md │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 2. Actualiza queue.json:                    │
│    • Status: in-progress → completed        │
│    • completedAt: timestamp                 │
│    • commits: [v931, v932, v933]            │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 3. Identifica siguiente plan en queue      │
│    • Status: pending                        │
│    • Sin dependencies bloqueadoras          │
│    • Prioridad más alta                     │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 4. Pregunta a Diego (opcional):             │
│    "✅ Plan completado.                     │
│     ¿Continuar con siguiente plan:          │
│     'A/B Testing Aluna'? (Si/No/Más tarde)" │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 5. Si aprobado:                             │
│    • Crea plan-vuelo-21mar.md               │
│    • Actualiza queue.json (status→in-progress)│
│    • Inicia autopilot automáticamente       │
└─────────────────────────────────────────────┘
```

### 2. Dividir Objetivo Grande en Plans

**Trigger**: Diego dice: "quiero implementar X" (objetivo > 6h)

**Flujo**:
```
┌─────────────────────────────────────────────┐
│ 1. Diego: "Quiero A/B testing completo en  │
│    Aluna con analytics y dashboard"         │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 2. Agente analiza scope:                    │
│    • Estima: 12-15h de trabajo              │
│    • Identifica: 4 sub-planes               │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 3. Propone división:                        │
│                                             │
│    Plan 1: "Infraestructura A/B" (3-4h)    │
│    • Schema BD para experimentos            │
│    • Repository + migrations                │
│    • API endpoints básicos                  │
│                                             │
│    Plan 2: "UI Dashboard A/B" (3-4h)       │
│    • Componentes de creación experimentos   │
│    • Vista de métricas                      │
│    • Integración con dashboard existente    │
│                                             │
│    Plan 3: "Lógica de Splits" (2-3h)       │
│    • Algoritmo de asignación                │
│    • Tracking de conversiones               │
│    • Integración con follow-ups             │
│                                             │
│    Plan 4: "Analytics y Reporting" (3-4h)  │
│    • Cálculo de significance                │
│    • Gráficos de resultados                 │
│    • Export de reportes                     │
│                                             │
│    ¿Apruebas esta división? (Si/Ajustar)   │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 4. Si aprobado:                             │
│    • Añade 4 planes a queue.json            │
│    • Marca dependencies entre ellos         │
│    • Asigna prioridades                     │
│    • Sugiere empezar con Plan 1             │
└─────────────────────────────────────────────┘
```

### 3. Reanudar Después de Interrupción

**Trigger**: Diego vuelve después de días sin trabajar

**Flujo**:
```
┌─────────────────────────────────────────────┐
│ 1. Diego abre VS Code (nueva sesión)       │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 2. Agente lee:                              │
│    • coworkia-memory.md (contexto general)  │
│    • queue.json (estado de planes)          │
│    • Último plan de vuelo                   │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 3. Detecta plan in-progress incompleto:     │
│    • Plan: aluna-dashboard-metricas         │
│    • Progreso: 7/12 tareas                  │
│    • Última sesión: hace 3 días             │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 4. Saluda con contexto:                     │
│                                             │
│    "👋 Hola Diego!                         │
│                                             │
│    📋 Retomando: Dashboard Aluna - Métricas │
│    ✅ Completado: 7/12 tareas (58%)        │
│    ⏱️ Estimado restante: 1-2h              │
│                                             │
│    Último trabajo (18 Mar):                 │
│    • Filtros por status implementados       │
│    • Export CSV funcionando                 │
│                                             │
│    Pendiente:                               │
│    • Modal de campañas                      │
│    • Templates editables                    │
│    • Testing integración                    │
│                                             │
│    ¿Continuar con autopilot? (Si/Review)"  │
└─────────────────────────────────────────────┘
```

---

## 🧠 SMART PLANNING

### Análisis Automático de Scope

Cuando Diego propone un objetivo, el agente:

1. **Estima complejidad**:
   - Archivos a modificar
   - Nuevas features vs refactoring
   - Testing requerido
   - Riesgo de bloqueos

2. **Sugiere división** si > 6h:
   - Plans de 3-4h cada uno
   - Agrupación lógica de tareas
   - Dependencies claras
   - Orden de ejecución óptimo

3. **Identifica riesgos**:
   - "Requiere decisión arquitectónica"
   - "Puede tener bugs de borde"
   - "Necesita testing exhaustivo"
   - "Puede romper features existentes"

### Template de Plan Generado

**Archivo**: `planes-de-vuelo/plan-vuelo-[fecha].md`

```markdown
# ✈️ Plan de Vuelo - [Fecha]

## 🎯 OBJETIVO
[Título del plan de la cola]

**Parte de**: [Objetivo grande si aplica]
**Plan**: 2/4 en secuencia
**Dependencies**: [Plan 1 completado ✓]

---

## 📋 CONTEXTO

[Resumen del objetivo grande]
[Por qué estamos haciendo esto]
[Qué se completó en planes anteriores]

---

## ✅ TAREAS

### Bloque 1: [Nombre]
- [ ] Tarea 1 específica
- [ ] Tarea 2 específica
- [ ] Tarea 3 específica

### Bloque 2: [Nombre]
- [ ] Tarea 4

### Bloque 3: Testing
- [ ] Test unitarios
- [ ] Test de integración
- [ ] Verificar no rompimos features

---

## ⏱️ ESTIMACIÓN
- **Tiempo estimado**: 3-4h
- **Autopilot**: Compatible ✓
- **Riesgo**: Medio (requiere testing exhaustivo)

---

## 🔗 SIGUIENTE PASO
Tras completar este plan, continuar con:
📋 Plan 3/4: "Lógica de Splits A/B"

---

## 📊 PROGRESO
- [ ] Bloque 1 (0/3)
- [ ] Bloque 2 (0/1)
- [ ] Bloque 3 (0/3)

**Total**: 0/7 tareas
```

---

## 📊 MÉTRICAS Y TRACKING

### Velocidad Promedio

El sistema aprende cuánto tarda Diego/autopilot en promedio:

```json
{
  "metrics": {
    "avgTaskTime": "12min",
    "avgPlanTime": "2.5h",
    "successRate": 0.85,
    "blockerRate": 0.15,
    "mostCommonBlockers": [
      "Decisión arquitectónica",
      "Testing complejo",
      "Dependencia externa"
    ]
  }
}
```

### Predicción de ETA

```javascript
function estimatePlanTime(tasks) {
  const baseTime = tasks.length * 12; // 12 min por tarea promedio
  
  // Factores de complejidad
  const hasArchitectureChange = tasks.some(t => t.includes('arquitectura'));
  const hasDBMigration = tasks.some(t => t.includes('migración'));
  const hasExternalDep = tasks.some(t => t.includes('API externa'));
  
  let multiplier = 1.0;
  if (hasArchitectureChange) multiplier += 0.3;
  if (hasDBMigration) multiplier += 0.2;
  if (hasExternalDep) multiplier += 0.4;
  
  const estimatedMinutes = baseTime * multiplier;
  return `${Math.floor(estimatedMinutes / 60)}-${Math.ceil(estimatedMinutes / 60) + 1}h`;
}
```

---

## 🎯 COMANDOS

### Ver Estado de Cola

Diego dice: `"status de planes"` o `"queue status"`

**Respuesta**:
```
📋 ESTADO DE PLANES

🟢 En Progreso:
  • Dashboard Aluna - Métricas (7/12 tareas, 58%)
    ETA: 1-2h restantes

⏸️ En Cola:
  1. A/B Testing Sistema (pending, 4-5h)
     ↳ Depende de: Dashboard Aluna ✓
  
  2. Axel v2 Features (pending, 2-3h)
     ↳ Sin dependencias

✅ Completados Hoy:
  • Aluna Follow-ups Completo (7.5h)
    Commits: v925-v927

📊 Progreso Total:
  • 1/3 planes completados (33%)
  • 8-10h restantes
  • ETA final: 22 Mar 2026
```

### Añadir Plan a Cola

Diego dice: `"añade a cola: [objetivo]"`

**Ejemplo**:
```
Diego: "añade a cola: implementar cache Redis para forms"

Agente: 
"✅ Plan añadido a cola

📋 Nuevo plan: Cache Redis para Forms
⏱️ Estimado: 2-3h
🔗 Dependencies: Ninguna
📍 Posición: #3 en cola
🎯 Prioridad: Media

¿Ajustar prioridad? (High/Medium/Low)
```

### Cambiar Orden

Diego dice: `"mueve [plan] arriba"` o `"prioriza [plan]"`

### Cancelar Plan

Diego dice: `"cancela plan [nombre]"`

---

## 🔧 IMPLEMENTACIÓN

### Gestión de Queue

**Archivo**: `src/utils/plan-queue-manager.js`

```javascript
import fs from 'fs/promises';
import path from 'path';

const QUEUE_FILE = 'planes-de-vuelo/queue.json';

export async function loadQueue() {
  try {
    const data = await fs.readFile(QUEUE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Si no existe, crear cola vacía
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      currentPlan: null,
      queue: []
    };
  }
}

export async function saveQueue(queue) {
  queue.lastUpdated = new Date().toISOString();
  await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

export async function addToQueue(plan) {
  const queue = await loadQueue();
  
  const newPlan = {
    id: plan.id || generatePlanId(plan.title),
    title: plan.title,
    status: 'pending',
    plan: null,
    estimatedTime: plan.estimatedTime,
    dependencies: plan.dependencies || [],
    priority: plan.priority || 'medium',
    notes: plan.notes || ''
  };
  
  queue.queue.push(newPlan);
  await saveQueue(queue);
  
  return newPlan;
}

export async function updatePlanStatus(planId, status, data = {}) {
  const queue = await loadQueue();
  const plan = queue.queue.find(p => p.id === planId);
  
  if (!plan) {
    throw new Error(`Plan ${planId} not found in queue`);
  }
  
  plan.status = status;
  
  if (status === 'in-progress') {
    plan.startedAt = new Date().toISOString();
    queue.currentPlan = plan.plan;
  }
  
  if (status === 'completed') {
    plan.completedAt = new Date().toISOString();
    plan.duration = calculateDuration(plan.startedAt, plan.completedAt);
    plan.commits = data.commits || [];
  }
  
  await saveQueue(queue);
  return plan;
}

export async function getNextPlan() {
  const queue = await loadQueue();
  
  // Buscar primer plan pending sin dependencies bloqueadoras
  const pendingPlans = queue.queue.filter(p => p.status === 'pending');
  
  for (const plan of pendingPlans) {
    const hasBlockedDeps = plan.dependencies.some(depId => {
      const dep = queue.queue.find(p => p.id === depId);
      return dep && dep.status !== 'completed';
    });
    
    if (!hasBlockedDeps) {
      return plan;
    }
  }
  
  return null;
}

function generatePlanId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function calculateDuration(start, end) {
  const diff = new Date(end) - new Date(start);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}min`;
}
```

### Generación Automática de Plan

**Archivo**: `src/utils/plan-generator.js`

```javascript
import { addToQueue, loadQueue } from './plan-queue-manager.js';
import fs from 'fs/promises';

export async function generatePlanFromQueue(planId) {
  const queue = await loadQueue();
  const planData = queue.queue.find(p => p.id === planId);
  
  if (!planData) {
    throw new Error(`Plan ${planId} not found`);
  }
  
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const fileName = `plan-vuelo-${date}.md`;
  const filePath = `planes-de-vuelo/${fileName}`;
  
  const content = generatePlanContent(planData, queue);
  
  await fs.writeFile(filePath, content);
  
  // Actualizar queue con nombre de archivo
  planData.plan = fileName;
  await saveQueue(queue);
  
  return filePath;
}

function generatePlanContent(planData, queue) {
  const date = new Date().toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  // Detectar si es parte de secuencia
  const relatedPlans = queue.queue.filter(p => 
    p.title.includes(planData.title.split('-')[0]) || 
    planData.dependencies.includes(p.id)
  );
  
  const isPartOfSequence = relatedPlans.length > 1;
  const sequenceIndex = isPartOfSequence ? 
    relatedPlans.findIndex(p => p.id === planData.id) + 1 : null;
  
  return `# ✈️ Plan de Vuelo - ${date}

## 🎯 OBJETIVO
${planData.title}

${isPartOfSequence ? `**Parte de**: Secuencia ${planData.title.split('-')[0]}
**Plan**: ${sequenceIndex}/${relatedPlans.length}
**Dependencies**: ${planData.dependencies.map(d => 
  queue.queue.find(p => p.id === d)?.title || d
).join(', ')}` : ''}

---

## 📋 CONTEXTO

${planData.notes || '[Añadir contexto del objetivo]'}

---

## ✅ TAREAS

### Bloque 1: Setup
- [ ] Revisar código existente relacionado
- [ ] Identificar archivos a modificar
- [ ] Planificar estructura

### Bloque 2: Implementación
- [ ] [Tarea específica 1]
- [ ] [Tarea específica 2]
- [ ] [Tarea específica 3]

### Bloque 3: Testing
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Verificar features existentes

---

## ⏱️ ESTIMACIÓN
- **Tiempo estimado**: ${planData.estimatedTime}
- **Autopilot**: Compatible ✓
- **Riesgo**: [Evaluar]

---

## 🔗 SIGUIENTE PASO
${getNextPlanSuggestion(planData, queue)}

---

## 📊 PROGRESO
- [ ] Bloque 1 (0/3)
- [ ] Bloque 2 (0/3)
- [ ] Bloque 3 (0/3)

**Total**: 0/9 tareas
`;
}

function getNextPlanSuggestion(currentPlan, queue) {
  const nextPlan = queue.queue.find(p => 
    p.dependencies.includes(currentPlan.id) && 
    p.status === 'pending'
  );
  
  if (nextPlan) {
    return `Tras completar este plan, continuar con:\n📋 ${nextPlan.title}`;
  }
  
  return 'Este plan completa la secuencia actual.';
}
```

---

## 🧪 TESTING

### Test de Queue Manager

```javascript
// tests/plan-queue-manager.test.js
import { addToQueue, getNextPlan, updatePlanStatus } from '../src/utils/plan-queue-manager.js';

describe('Plan Queue Manager', () => {
  test('Añadir plan a cola', async () => {
    const plan = await addToQueue({
      title: 'Test Plan A',
      estimatedTime: '2h',
      priority: 'high'
    });
    
    expect(plan.id).toBe('test-plan-a');
    expect(plan.status).toBe('pending');
  });
  
  test('Obtener siguiente plan sin dependencies', async () => {
    const next = await getNextPlan();
    expect(next).not.toBeNull();
    expect(next.dependencies).toHaveLength(0);
  });
  
  test('No retornar plan con dependencies bloqueadoras', async () => {
    await addToQueue({
      id: 'plan-a',
      title: 'Plan A',
      status: 'pending'
    });
    
    await addToQueue({
      id: 'plan-b',
      title: 'Plan B',
      dependencies: ['plan-a'],
      status: 'pending'
    });
    
    const next = await getNextPlan();
    expect(next.id).toBe('plan-a'); // Plan B bloqueado por Plan A
  });
});
```

---

## 🎓 MEJORES PRÁCTICAS

### Para Diego

✅ **Hacer**:
- Pensar en objetivos grandes como secuencias de plans
- Dar títulos descriptivos a planes
- Indicar dependencies si existen
- Revisar queue.json semanalmente

❌ **Evitar**:
- Planes vagos ("mejorar performance")
- Planes gigantes (> 8h)
- Ignorar dependencies entre planes
- Acumular > 10 planes en cola

### Para el Agente

✅ **Hacer**:
- Sugerir división cuando scope > 6h
- Actualizar queue.json tras cada plan
- Identificar dependencies automáticamente
- Estimar tiempos conservadoramente

❌ **Evitar**:
- Asumir planes pueden completarse en paralelo
- Crear planes sin tareas específicas
- Ignorar blockers al sugerir siguiente plan
- Perder contexto entre planes de una secuencia

---

## 🔮 ROADMAP

### v1.0 (Actual)
- [x] Sistema de cola básico (queue.json)
- [x] Comandos de gestión (añadir, status, priorizar)
- [x] Generación automática de planes
- [x] Tracking de progreso

### v2.0 (Futuro)
- [ ] Dashboard web para visualizar cola
- [ ] Estimación con ML basado en historial
- [ ] Auto-sugerencia de división de planes
- [ ] Integración con calendario (deadlines)
- [ ] Métricas de velocidad real vs estimada

### v3.0 (Visión)
- [ ] IA que genera tareas específicas desde objetivo vago
- [ ] Detección automática de dependencies
- [ ] Priorización inteligente basada en valor/urgencia
- [ ] Simulación de timelines ("si priorizas X, Y se retrasa 2 días")

---

**Última actualización**: 20 Mar 2026
**Versión**: 1.0
**Dependencias**: `coworkia-autopilot`, `coworkia-memory`
