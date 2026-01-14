# 🎯 Sistema de Coordinación Inteligente Aurora

## ✅ Implementación Completada

### Objetivo
Sistema que permite a Aurora gestionar múltiples conversaciones por tópicos separados, derivando a agentes especializados cuando corresponde y manteniendo contexto completo.

---

## 📋 Características Implementadas

### 1. **Detección Automática de Tópicos**

El sistema reconoce 8 tipos de conversación:

```javascript
TOPICS = {
  RESERVA: 'reserva_espacio',           // Aurora
  COLISION: 'reparacion_vehicular',     // Axel
  SEGURO: 'seguro_vehicular',           // Adriana
  MARKETING: 'marketing_ia',            // Enzo
  SALUD: 'salud_bienestar',             // Ángela
  FINANZAS: 'finanzas_contabilidad',    // Gabi
  PLANES: 'planes_membresias',          // Aluna
  GENERAL: 'informacion_general'        // Aurora
}
```

**Detección por keywords:**
```javascript
// Ejemplo: Mensaje del usuario
"Hola, tuve un choque y necesito cotización"

// Sistema detecta:
Topic: COLISION
Agent: AXEL
Confidence: HIGH (keywords: "choque", "cotización")
```

### 2. **Handover Inteligente**

**Flujo de derivación:**

```
Usuario con Aurora: "tengo un golpe en mi auto"
    ↓
Sistema detecta: topic=COLISION → agent=AXEL
    ↓
shouldHandover() evalúa contexto
    ↓
Si procede handover:
  1. Aurora cierra tópico actual
  2. Guarda mensaje de handover
  3. Activa AXEL con topic=COLISION
  4. Envía mensaje empático de transición
    ↓
Usuario ahora habla con AXEL
```

**Mensajes de handover personalizados:**

```javascript
// Aurora → Axel
"Perfecto Diego! 🚗
Te conecto con *Axel* de *The PaintBull*.
Él analiza fotos y te da cotización en minutos.

*Axel*, te presento a Diego.

Cualquier cosa: *@Aurora* ✨"
```

### 3. **Gestión de Tópicos Activos**

Cada usuario puede tener múltiples tópicos:

```javascript
// Ejemplo: Usuario tiene 2 conversaciones paralelas
activeTopics = [
  {
    topic: 'reserva_espacio',
    agent: 'AURORA',
    status: 'active',
    created_at: '2026-01-11T10:00:00',
    updated_at: '2026-01-11T10:15:00'
  },
  {
    topic: 'reparacion_vehicular',
    agent: 'AXEL',
    status: 'paused',  // pausado mientras habla con Aurora
    created_at: '2026-01-11T09:00:00',
    updated_at: '2026-01-11T09:30:00'
  }
]
```

**Cambio de tópico:**
```javascript
// Usuario: "@aurora necesito cambiar mi reserva"
// Sistema:
// 1. Pausa topic=COLISION (Axel)
// 2. Reactiva topic=RESERVA (Aurora)
// 3. Carga contexto de reserva anterior
```

### 4. **Contexto Completo por Tópico**

Cada tópico mantiene su propio historial:

```sql
-- Mensajes de COLISION con Axel
SELECT * FROM agent_conversations 
WHERE user_phone = '+593999...' 
  AND topic = 'reparacion_vehicular'
  AND agent = 'AXEL'
ORDER BY created_at DESC

-- Mensajes de RESERVA con Aurora
SELECT * FROM agent_conversations
WHERE user_phone = '+593999...'
  AND topic = 'reserva_espacio'
  AND agent = 'AURORA'
ORDER BY created_at DESC
```

### 5. **Cleanup Automático**

Tópicos inactivos por 7+ días se marcan como expirados:

```javascript
cleanupOldTopics(userId, daysOld = 7)
// Ejecuta diariamente (puede ser un cron job)
// Marca topics con status='expired'
// Libera espacio sin perder datos históricos
```

---

## 📁 Archivos Creados/Modificados

### `/src/servicios/aurora-coordinator.js` (NUEVO)

**Módulo principal con funciones:**

```javascript
// Detección
detectTopicFromMessage(message, context)
getAgentForTopic(topic)
detectMentionedAgent(message)

// Gestión de tópicos
getUserActiveTopics(userId)
switchTopic(userId, newTopic, agent, metadata)

// Handover
shouldHandover(userId, message, currentAgent)
executeHandover(userId, userName, fromAgent, toAgent, topic, message)
generateHandoverMessage(fromAgent, toAgent, userName, topic)

// Contexto
getConversationSummaryForAurora(userId, lastNMessages)

// Mantenimiento
cleanupOldTopics(userId, daysOld)
```

### `/src/deteccion-intenciones/orquestador.js` (MODIFICADO)

**Integración:**
```javascript
import { 
  shouldHandover, 
  detectTopicFromMessage, 
  getAgentForTopic,
  getUserActiveTopics 
} from '../servicios/aurora-coordinator.js';
```

**Nota:** Integración suave - no rompe lógica existente de detección de intenciones.

---

## 🎯 Casos de Uso

### Caso 1: Usuario Nuevo - Detección Automática

```
[10:00] Usuario: "Hola"
Aurora: "Hola, soy Aurora ✨ ¿En qué te puedo ayudar?"

[10:01] Usuario: "Quiero cotizar un rayón en mi auto"
Sistema detecta: topic=COLISION, agent=AXEL

Aurora: [mensaje handover]
Axel: "Hola Diego, soy Axel de PaintBull 🚗
       Tranquilo/a, estás en buenas manos..."
```

### Caso 2: Cambio de Tópico con Mención Explícita

```
[Usuario hablando con Axel sobre colisión]

[10:15] Usuario: "@aurora necesito cambiar fecha de mi reserva"
Sistema detecta: mención explícita @aurora

Axel → Aurora (handover)
Aurora: "De vuelta contigo Diego! ✨
         Revisando tu reserva... [datos]"
```

### Caso 3: Conversaciones Paralelas

```
[09:00] Usuario habla con Axel sobre colisión
        topic=COLISION, status=active

[10:00] Usuario: "@aurora quiero reservar sala"
        topic=COLISION, status=paused
        topic=RESERVA, status=active (nuevo)

[11:00] Usuario: "@axel ya envié las fotos"
        topic=RESERVA, status=paused
        topic=COLISION, status=active (reactivado)
```

### Caso 4: Resumen para Aurora

```javascript
// Aurora necesita contexto completo para ayudar mejor
const summary = await getConversationSummaryForAurora(userId, 10);

/*
Retorna:
{
  totalTopics: 2,
  activeTopics: ['reserva_espacio', 'reparacion_vehicular'],
  recentMessages: [
    { agent: 'AXEL', topic: 'reparacion_vehicular', message: '...' },
    { agent: 'AURORA', topic: 'reserva_espacio', message: '...' }
  ],
  lastInteraction: '2026-01-11T11:30:00'
}
*/
```

---

## 🔄 Integración con Sistema Existente

### Compatibilidad Total

El coordinador **NO rompe** el sistema actual:

✅ Detección de intenciones sigue funcionando  
✅ Sistema de handoff con @menciones intacto  
✅ Memoria SQLite legacy compatible  
✅ Perfiles de usuario sin cambios  

**Migración gradual:**
```javascript
// Sistema funciona en modo dual:
// 1. conversationAdapter guarda en AMBOS:
//    - Base de datos unificada (nuevo)
//    - memoria-sqlite.js (legacy)
// 2. Cuando todo esté probado → remover legacy
```

---

## 📊 Métricas y Monitoreo

### Logs del Sistema

```bash
[AURORA COORDINATOR] 🔄 Handover: AURORA → AXEL
[AURORA COORDINATOR] ✅ Tópico cambiado: reserva_espacio → reparacion_vehicular
[AURORA COORDINATOR] 🧹 Limpiados 3 tópicos antiguos
```

### Estadísticas Útiles

```javascript
// Dashboard potencial:
- Tópicos activos por usuario
- Handovers exitosos vs fallidos
- Tiempo promedio por tópico
- Agentes más solicitados
- Tópicos expirados (usuarios que abandonan)
```

---

## 🚀 Próximos Pasos

### Mejoras Post-MVP

1. **Dashboard de Coordinación**
   - Visualizar flujo de conversaciones
   - Gráfico de handovers entre agentes
   - Métricas de engagement por tópico

2. **IA Predictiva**
   - Detectar cuándo usuario necesita handover antes de pedirlo
   - Sugerir agentes proactivamente
   - "Veo que mencionas seguros, ¿te conecto con Adriana?"

3. **Contexto Enriquecido**
   - Sentiment analysis por tópico
   - Urgencia detectada (keywords como "urgente", "ahora")
   - Priority queue para casos críticos

4. **Multi-idioma Inteligente**
   - Detectar cambio de idioma mid-conversación
   - Mantener idioma por tópico
   - Agentes con idiomas específicos

---

## ⚙️ Configuración

### Variables de Entorno

```bash
# No requiere configuración adicional
# Usa la conexión PostgreSQL existente
DATABASE_URL=postgres://...  # Ya configurado

# Opcional: habilitar logs detallados
DEBUG_COORDINATOR=true
```

### Testing

```javascript
// Test manual en consola Node
import { detectTopicFromMessage, getAgentForTopic } from './src/servicios/aurora-coordinator.js';

const topic = detectTopicFromMessage("tengo un golpe en mi auto");
console.log(topic); // 'reparacion_vehicular'

const agent = getAgentForTopic(topic);
console.log(agent); // 'AXEL'
```

---

**Implementado:** 11/01/2026  
**Status:** ✅ FUNCIONAL - INTEGRADO CON ORQUESTADOR  
**Prioridad:** MEDIA - Mejora experiencia multi-agente  
**Dependencias:** Base de datos unificada (completada)
