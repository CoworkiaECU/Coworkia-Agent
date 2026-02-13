# 🔍 Auditoría Sistema de Handoffs - v751

**Fecha:** 12 Feb 2026  
**Auditor:** GitHub Copilot  
**Scope:** Sistema completo de handoffs (detección + ejecución) para TODOS los agentes

---

## 📊 Resumen Ejecutivo

### ✅ Arquitectura General: BIEN ESTRUCTURADA
- Sistema V2 centralizado con `handoff-manager.js` + `handoff-messages.js`
- Detección clara en `detectar-intencion.js` con @menciones
- Validación de transiciones en `agent-transitions.js`
- Ejecución unificada en `wassenger.js`

### ❌ Issues Críticos Encontrados: 3
1. **Código duplicado**: 7 funciones `getHandover()` sin usar
2. **Agente fantasma TOMI**: Parcialmente implementado
3. **Función deprecada en uso**: `isHandoffInProgress()`

---

## 🔴 Issues P0 (Bloqueantes)

### 1. Código Duplicado: `getHandover()` en Archivos Individuales

**Problema:**  
Todos los archivos de agentes tienen función `getHandover()` que YA NO SE USA porque fue reemplazada por `handoff-messages.js` centralizado.

**Archivos afectados:**
- `src/deteccion-intenciones/adriana.js` (L43)
- `src/deteccion-intenciones/aluna.js` (L41)
- `src/deteccion-intenciones/angela.js` (L42)
- `src/deteccion-intenciones/axel.js` (L29)
- `src/deteccion-intenciones/enzo.js` (L40)
- `src/deteccion-intenciones/gabi.js` (L23)
- `src/deteccion-intenciones/paula.js` (L47)

**Líneas de código duplicadas:** ~350+ líneas innecesarias

**Impacto:**
- ⚠️ Confusión: Parece que hay 2 sistemas de handoff
- ⚠️ Mantenimiento: Cambios hay que replicarlos (pero no se usan)
- ⚠️ Tamaño: 350+ líneas muertas en codebase

**Evidencia:**
```javascript
// adriana.js L43-100
getHandover: function(targetAgent, userName = 'amigo', userLanguage = 'es') {
  const handoverMessages = {
    'AURORA': { es: '...', en: '...', fr: '...' },
    'AXEL': { es: '...', en: '...', fr: '...' },
    // ... más código NO usado
  };
}
```

**Sistema correcto (ya implementado):**
```javascript
// handoff-messages.js (CENTRALIZADO)
export function getHandoffMessages(fromAgent, toAgent, userName, userLanguage, isReturning) {
  // UN SOLO lugar gestiona TODOS los mensajes
}
```

**Acción requerida:**  
✅ **ELIMINAR** todas las funciones `getHandover()` de archivos individuales

---

### 2. Agente Fantasma: TOMI NO Implementado Correctamente

**Problema:**  
TOMI está parcialmente implementado - existe la detección pero no el agente completo.

**Inconsistencias encontradas:**

| Componente | Estado TOMI |
|------------|-------------|
| `detectar-intencion.js` | ✅ Detecta @tomi (L502-503) |
| `agent-transitions.js` | ❌ NO está en VALID_AGENTS |
| `handoff-messages.js` | ❌ NO está en AGENT_INFO |
| `src/deteccion-intenciones/tomi.js` | ❌ Archivo NO existe |
| `observability.js` | ✅ Tiene métricas TOMI |
| `follow-up-service.js` | ✅ Tiene mensajes TOMI |
| `generic-confirmation-flow.js` | ✅ Tiene casos TOMI |

**Evidencia:**
```javascript
// detectar-intencion.js L502-503
if (/@tomi/i.test(text)) {
  return { agent: 'TOMI', reason: 'trigger @Tomi', 
    flags: { agentHandoff: true, fromAgent: currentAgent, targetAgent: 'TOMI' } };
}

// agent-transitions.js L37-45
export const VALID_AGENTS = [
  'AURORA', 'ALUNA', 'ADRIANA', 'ENZO', 'ANGELA', 'AXEL', 'GABI', 'PAULA'
  // ⚠️ TOMI NO está en la lista
];
```

**Impacto:**
- 🔥 Si usuario dice @tomi → trigger detectado → handoff falla en validateTransition()
- 🔥 Mensaje de error al usuario
- 🔥 Sistema inconsistente

**Opciones:**

**Opción A: Eliminar TOMI (Recomendado si no está activo)**
- Eliminar @tomi de `detectar-intencion.js`
- Eliminar referencias en observability/follow-up/generic-confirmation

**Opción B: Implementar TOMI completamente**
- Crear `src/deteccion-intenciones/tomi.js`
- Agregar a VALID_AGENTS
- Agregar a AGENT_INFO en handoff-messages.js
- Definir su rol y contexto

**Acción requerida:**  
🚨 **DECIDIR**: ¿TOMI está activo? Si no → Eliminar. Si sí → Implementar completo.

---

### 3. Función Deprecada en Uso: `isHandoffInProgress()`

**Problema:**  
`isHandoffInProgress()` está marcada DEPRECADA pero `wassenger.js` la sigue usando.

**Evidencia:**
```javascript
// handoff-manager.js L185-188
export function isHandoffInProgress(userId) {
  // Siempre devolver false - esta función ya no usa locks propios
  console.warn('[HANDOFF-MANAGER] ⚠️ isHandoffInProgress() deprecada - usar AgentStateManager.isUpdateInProgress()');
  return false; // ← SIEMPRE FALSE
}

// wassenger.js L1661 (EN USO)
if (isHandoffInProgress(userId)) {
  console.warn(`[WASSENGER-V2] ⚠️ Handoff ya en progreso para ${userId}, esperando...`);
  await new Promise(r => setTimeout(r, 2000));
}
```

**Impacto:**
- ⚠️ La función siempre devuelve `false` → el check no hace nada
- ⚠️ Locks reales están en `AgentStateManager` pero no se usan aquí
- ⚠️ Posible race condition si handoffs concurrentes

**Acción requerida:**  
✅ **REEMPLAZAR** con `AgentStateManager.isUpdateInProgress(userId)`

---

## 🟡 Issues P1 (Importantes)

### 4. Inconsistencia de Nombres: ANGELA vs ÁNGELA

**Observación:**  
El código usa ambos nombres inconsistentemente:
- Código interno: `ANGELA` (sin tilde)
- Detección: `/@[áa]ngela/i` (con y sin tilde)
- UI: "Ángela" (con tilde)

**Impacto:** Mínimo (regex maneja ambos)

**Recomendación:** Mantener `ANGELA` interno, regex flexible, UI con tilde.

---

## ✅ Aspectos Bien Implementados

### 1. Sistema Centralizado V2
- `handoff-manager.js`: Maneja UX de handoffs (delay, mensajes, forms)
- `handoff-messages.js`: UN SOLO lugar para mensajes (soporte 5 idiomas)
- `agent-transitions.js`: Validación clara de transiciones

### 2. Detección de Handoffs
- @menciones con prioridad absoluta
- Protección contra ejemplos de Aurora
- Flags claros: `agentHandoff`, `fromAgent`, `targetAgent`

### 3. Ejecución en wassenger.js
- Handoff silencioso (solo nuevo agente habla)
- Guarda formularios de agente anterior
- Delay de 7s para transición suave
- Tracking de transacciones T14

### 4. Cobertura de Agentes
Todos los agentes principales cubiertos:
- ✅ AURORA (coordinadora)
- ✅ ALUNA (membresías)
- ✅ ADRIANA (seguros)
- ✅ ENZO (marketing/IA)
- ✅ ANGELA (salud)
- ✅ AXEL (cotizaciones colisión)
- ✅ GABI (legal/finanzas)
- ✅ PAULA (bienes raíces)

---

## 📋 Plan de Refactorización

### Fase 1: Limpieza de Código Duplicado
**Tiempo estimado:** 10 min

1. Eliminar `getHandover()` de:
   - adriana.js
   - aluna.js
   - angela.js
   - axel.js
   - enzo.js
   - gabi.js
   - paula.js

**Resultado:** -350 líneas

---

### Fase 2: Resolver Agente TOMI
**Tiempo estimado:** 5 min

**Opción A (Eliminar):**
1. Eliminar @tomi de `detectar-intencion.js`
2. Eliminar métricas de `observability.js`
3. Eliminar mensajes de `follow-up-service.js`
4. Eliminar casos de `generic-confirmation-flow.js`

**Opción B (Implementar):**
1. Crear `src/deteccion-intenciones/tomi.js`
2. Agregar a VALID_AGENTS
3. Agregar a AGENT_INFO
4. Definir rol y contexto

**Recomendación:** Opción A (eliminar) si no está activo en producción.

---

### Fase 3: Fix Función Deprecada
**Tiempo estimado:** 2 min

1. Reemplazar en `wassenger.js` L1661:
```javascript
// ANTES
if (isHandoffInProgress(userId)) {
  console.warn(`⚠️ Handoff ya en progreso...`);
  await new Promise(r => setTimeout(r, 2000));
}

// DESPUÉS
import { isUpdateInProgress } from '../../servicios/agent-state-manager.js';

if (isUpdateInProgress(userId)) {
  console.warn(`⚠️ Actualización de agente en progreso...`);
  await new Promise(r => setTimeout(r, 2000));
}
```

2. Eliminar import de `isHandoffInProgress` en wassenger.js

---

## 📈 Métricas Esperadas Post-Refactor

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Líneas código | ~2200 | ~1850 | -15% |
| Funciones duplicadas | 7 | 0 | -100% |
| Funciones deprecadas en uso | 1 | 0 | -100% |
| Agentes fantasma | 1 | 0 | -100% |
| Cobertura handoffs | 87.5% | 100% | +12.5% |

---

## ✅ Tests Requeridos Post-Refactor

1. **Test handoff básico:** Aurora → Enzo → Aurora
2. **Test handoff múltiple:** Aurora → Aluna → Adriana → Aurora
3. **Test @mención inválida:** @tomi (si se elimina, debe ignorarse)
4. **Test concurrencia:** 2 handoffs simultáneos mismo usuario
5. **Test mensajes:** Verificar que se usen mensajes de handoff-messages.js

---

## 🎯 Prioridades de Ejecución

1. **P0 - Inmediato:** Resolver TOMI (eliminar o implementar)
2. **P0 - Inmediato:** Fix función deprecada
3. **P0 - Esta semana:** Eliminar getHandover() duplicados
4. **P1 - Siguiente sprint:** Tests E2E completos

---

## 📝 Notas Adicionales

- Sistema V2 está bien diseñado arquitecturalmente
- Los issues son de limpieza, no de diseño
- Refactor es seguro (solo elimina código muerto)
- No hay breaking changes para usuarios finales

---

**Auditoría completada.** Sistema handoff funcional pero requiere limpieza de código legacy.
