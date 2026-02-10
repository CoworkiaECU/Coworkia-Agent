# 🔍 Auditoría Usuario +593998379860 (Fer)
**Fecha:** 7 Febrero 2026
**Issue:** Sistema no respeta agente convocado, Aurora aparece sin @mención

---

## 📊 Datos del Usuario

```
Nombre: Fer
Email: Mafer.gavilanez@gmail.com
WhatsApp Display: Fer
Teléfono: +593998379860
Agente Activo (BD): AURORA ⚠️
Idioma: es
Primera Visita: false
Conversaciones: 58
Última Interacción: 6 Feb 2026 23:23:32
```

---

## 🚨 PROBLEMA DETECTADO

### Síntoma Principal
Aurora interrumpe conversaciones de agentes especializados (Paula, Axel) sin @mención explícita.

### Evidencia de Interacciones (6 Feb 2026)

#### Ejemplo 1: Conversación con Paula → Aurora interrumpe
```
[2] 23:23:32 - aurora - Input: "No recibí tu confirmación por Mail" - Output: N/A
[1] 23:23:40 - aurora - Output: "¡Hola de nuevo Fer! ✨ Soy Aurora, tomo el relevo..."
```
❌ **Paula estaba activa, usuario NO escribió @aurora**

#### Ejemplo 2: Cada mensaje genera MÚLTIPLES registros
```
[42] 23:04:24 - aurora - Input: "Quiero preguntar cuánto me cuesta pulir mi auto"
[41] 23:04:26 - axel  - Input: N/A
[40] 23:04:26 - AXEL  - Input: "Quiero preguntar cuánto me cuesta pulir mi auto"
```
❌ **3 registros del mismo mensaje con diferentes agentes**

#### Ejemplo 3: Más duplicaciones con Paula
```
[17] 23:14:08 - aurora - Input: "Me gusta esta"
[16] 23:14:10 - paula  - Input: N/A
[15] 23:14:10 - PAULA  - Input: "Me gusta esta"
```
❌ **3 registros, inconsistencia mayúscula/minúscula**

---

## 🔍 ANÁLISIS TÉCNICO

### Patrón de Duplicación
Cada mensaje del usuario genera **3 registros en `interactions` table:**

1. **Registro 1:** `aurora` (minúscula) con `Input` pero `Output: N/A`
2. **Registro 2:** `agente` (minúscula) con `Input: N/A` pero tiene `Output`
3. **Registro 3:** `AGENTE` (MAYÚSCULA) con `Input` y `Output` completos

### ⚙️ Causa Raíz

**Archivo:** `src/express-servidor/endpoints-api/wassenger.js`

**Problema:** Múltiples llamadas a `saveInteraction()` en diferentes puntos del flujo:

| Línea | Contexto | Agente Registrado |
|-------|----------|-------------------|
| 396 | Validación de formulario | `agentName` |
| 1019 | Confirmación legacy | `profile.activeAgent \\|\\| 'AURORA'` |
| 1056 | Confirmación especializada | `newSystemPending.agentName` |
| 1193 | Pago ALUNA | `'ALUNA'` |
| 1237 | Análisis médico ANGELA | `'ANGELA'` |
| 1292 | Recibo AURORA | `'AURORA'` |
| **1444** | **Registro principal** | `resultado.agenteKey` ⬅️ |

**Además:**

1. **Línea 910:** Se guarda mensaje del usuario ANTES de procesar:
   ```javascript
   await saveConversationMessage(userId, { role: 'user', content: messageContent });
   ```
   
2. **Línea 1290-1310:** Se llama al orquestador:
   ```javascript
   const resultado = await procesarMensaje(auroraInput, profile, conversationHistory, formData);
   ```

3. **Línea 1444:** Se guarda interacción DESPUÉS de respuesta:
   ```javascript
   await saveInteraction({
     userId,
     agent: resultado.agenteKey,
     agentName: resultado.agente || 'Aurora Core',
     // ...
   });
   ```

### 🎯 Inconsistencia Crítica

**En la BD:**
```sql
SELECT active_agent FROM users WHERE phone_number = '+593998379860';
-- Resultado: AURORA
```

**En las interacciones:**
```
- Usuario estaba chateando con PAULA
- Paula respondiendo correctamente
- De repente Aurora interrumpe sin @mención
```

**Esto viola la REGLA V2:**
> "SOLO @menciones explícitas cambian de agente especializado"

---

## 🐛 BUG #1: Agente No se Actualiza en Perfil

### Código Actual (`decidirAgente`)

```javascript
// orquestador.js:438
function decidirAgente(intent, activeAgent) {
  const currentAgent = activeAgent || 'AURORA';
  
  // 4. Agente especializado activo → MANTENER
  if (currentAgent !== 'AURORA' && !intent.flags?.forceChange) {
    console.log('[DECIDIR-AGENTE] 🔒 Manteniendo agente especializado:', currentAgent);
    return currentAgent; // ✅ Esto está BIEN
  }
  // ...
}
```

### Problema
**Aunque `decidirAgente` retorna el agente correcto, el perfil del usuario NO se actualiza:**

```javascript
// wassenger.js - NO actualiza activeAgent después de handoff manual
await updateProfile(userId, profile, { reason: 'message_received' });
// ⚠️ profile.activeAgent sigue siendo el anterior
```

**Resultado:**
- En memoria: `activeAgent = 'PAULA'`
- En BD: `active_agent = 'AURORA'` ❌
- Próxima interacción: Sistema cree que activo es AURORA

---

## 🐛 BUG #2: Registros de Interacción Duplicados

### Flujo Actual
```
1. Usuario envía mensaje
   └─> saveConversationMessage('user', texto) 
       └─> Registra con agente = profile.activeAgent (puede estar desactualizado)

2. Procesamiento
   └─> procesarMensaje(orquestador)
       └─> Decide agente correcto
       └─> Genera respuesta

3. Guardar respuesta
   └─> saveConversationMessage('assistant', respuesta)
   └─> saveInteraction(resultado.agenteKey) ⬅️ CORRECTO

4. Pero TAMBIÉN se guarda en otros lugares:
   - confirmación (línea 1019)
   - formularios (línea 396)
   - pagos (línea 1193, 1292)
```

**Resultado:** Múltiples registros del mismo mensaje

---

## 🐛 BUG #3: Inconsistencia Mayúscula/Minúscula

### Ocurrencias en Código

**Minúsculas:**
```javascript
// conversationMessage usa minúsculas
await saveConversationMessage(userId, { 
  role: 'assistant', 
  content: message, 
  agent: 'paula' // ⬅️ minúscula
});
```

**Mayúsculas:**
```javascript
// saveInteraction usa mayúsculas
await saveInteraction({
  agent: 'PAULA', // ⬅️ MAYÚSCULA
  agentName: 'Paula - Bienes Raíces'
});
```

**Resultado:** Queries inconsistentes, registros duplicados, confusión en análisis

---

## 💡 SOLUCIONES PROPUESTAS

### FIX #1: Actualizar activeAgent Consistentemente

**Archivo:** `src/express-servidor/endpoints-api/wassenger.js`

**Cambio necesario después de línea 1310 (llamada a orquestador):**

```javascript
// ✅ DESPUÉS DE PROCESAR CON ORQUESTADOR
const resultado = await procesarMensaje(auroraInput, profile, conversationHistory, formData);

// 🔥 FIX: Actualizar activeAgent SI CAMBIÓ
if (resultado.agenteKey && resultado.agenteKey !== profile.activeAgent) {
  console.log(`[WASSENGER-FIX] 🔄 Actualizando agente: ${profile.activeAgent} → ${resultado.agenteKey}`);
  
  profile.activeAgent = resultado.agenteKey;
  
  await updateProfile(userId, { 
    activeAgent: resultado.agenteKey 
  }, { 
    reason: 'agent_change_post_orchestrator',
    previousAgent: profile.activeAgent,
    newAgent: resultado.agenteKey
  });
}
```

### FIX #2: Eliminar Registros Duplicados de saveInteraction

**Estrategia:** Solo guardar UNA vez en el registro principal (línea 1444)

**Cambios:**

1. **Línea 1019** - Confirmación legacy:
   ```javascript
   // ❌ ELIMINAR saveInteraction aquí
   // await saveInteraction({ ... });
   
   // ✅ Solo guardar en conversationMessage
   await saveConversationMessage(userId, { 
     role: 'assistant', 
     content: confirmationResult.message, 
     agent: profile.activeAgent 
   });
   ```

2. **Línea 1056** - Confirmación especializada:
   ```javascript
   // ❌ ELIMINAR saveInteraction aquí también
   ```

3. **Líneas 396, 1193, 1237, 1292** - Casos especiales:
   - Mantener saveInteraction SOLO si hace `return` (no continúa flujo normal)
   - Eliminar si el flujo continúa hasta línea 1444

### FIX #3: Normalizar Nombres de Agentes

**Crear helper function:**

```javascript
// src/utils/agent-normalizer.js
export function normalizeAgentName(agent) {
  if (!agent) return 'AURORA';
  
  const upper = agent.toUpperCase();
  
  // Validar que sea un agente válido
  const VALID_AGENTS = ['AURORA', 'ALUNA', 'ADRIANA', 'ENZO', 'ANGELA', 'AXEL', 'GABI', 'PAULA'];
  
  if (VALID_AGENTS.includes(upper)) {
    return upper;
  }
  
  console.warn(`[AGENT-NORMALIZER] ⚠️ Invalid agent "${agent}", defaulting to AURORA`);
  return 'AURORA';
}
```

**Usar en TODAS las llamadas:**

```javascript
// En wassenger.js y otros archivos
import { normalizeAgentName } from '../../utils/agent-normalizer.js';

await saveConversationMessage(userId, { 
  role: 'assistant', 
  content: message, 
  agent: normalizeAgentName(agentKey) // ✅ Siempre MAYÚSCULA
});

await saveInteraction({
  agent: normalizeAgentName(agentKey), // ✅ Consistente
  // ...
});
```

### FIX #4: Agregar Logging de Debug

**Para detectar futuros problemas:**

```javascript
// Al inicio del procesamiento
console.log(`[WASSENGER-DEBUG] 📥 Mensaje de ${userId}:`);
console.log(`   activeAgent (profile): ${profile.activeAgent}`);
console.log(`   activeAgent (BD): ${currentFromDB.active_agent}`);
console.log(`   Mensaje: "${processedText.substring(0, 50)}..."`);

// Después del orquestador
console.log(`[WASSENGER-DEBUG] 📤 Respuesta para ${userId}:`);
console.log(`   agenteKey decidido: ${resultado.agenteKey}`);
console.log(`   ¿Cambió agente?: ${resultado.agenteKey !== profile.activeAgent}`);
console.log(`   Razón: ${resultado.razonSeleccion}`);
```

---

## 🧪 PRUEBA DE VALIDACIÓN

### Después de aplicar fixes, probar:

1. **Usuario con Paula activa:**
   ```
   Usuario: "Me gustaría ver propiedades"
   ✅ Debe mantener PAULA
   ❌ NO debe aparecer Aurora
   ```

2. **Cambio explícito con @mención:**
   ```
   Usuario: "@aurora necesito ayuda"
   ✅ Debe cambiar a AURORA
   ✅ BD debe actualizar active_agent = 'AURORA'
   ```

3. **Verificar en BD:**
   ```sql
   SELECT active_agent, last_message_at FROM users WHERE phone_number = '+593998379860';
   -- Debe coincidir con el último agente que respondió
   ```

4. **Verificar interactions table:**
   ```sql
   SELECT user_phone, agent, intent_reason, input, output
   FROM interactions 
   WHERE user_phone = '+593998379860'
   ORDER BY timestamp DESC
   LIMIT 5;
   
   -- ✅ Debe haber UN registro por mensaje
   -- ✅ agent debe estar en MAYÚSCULA
   -- ✅ agent debe coincidir con el agente que respondió
   ```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] FIX #1: Actualizar activeAgent post-orquestador (wassenger.js)
- [ ] FIX #2: Eliminar saveInteraction duplicados
- [ ] FIX #3: Crear y aplicar normalizeAgentName()
- [ ] FIX #4: Agregar logging de debug
- [ ] Probar con usuario +593998379860
- [ ] Verificar BD after fix
- [ ] Monitorear logs por 24h
- [ ] Documentar cambios en CHANGELOG

---

## 🎯 IMPACTO ESPERADO

**Antes:**
- 3 registros por mensaje
- Agente inconsistente (aurora vs AURORA vs paula vs PAULA)
- Aurora interrumpe conversaciones sin @mención
- Profile.activeAgent desactualizado

**Después:**
- 1 registro por mensaje
- Agente consistente (MAYÚSCULA siempre)
- Solo @menciones cambian agentes especializados
- Profile.activeAgent siempre actualizado

---

**Auditoría completada:** 7 Feb 2026
**Analista:** GitHub Copilot (Claude Sonnet 4.5)
