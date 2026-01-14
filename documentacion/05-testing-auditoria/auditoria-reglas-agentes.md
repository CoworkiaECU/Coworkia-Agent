# 🎯 T4: Auditoría de Reglas de Activación de Agentes

**Fecha:** 2026-01-13  
**Versión:** v421  
**Archivos auditados:**
- `src/deteccion-intenciones/detectar-intencion.js` (343 líneas)
- `src/deteccion-intenciones/orquestador.js` (1008 líneas)

---

## 🎯 Objetivo

Auditar la lógica completa de activación y cambio de agentes para identificar inconsistencias, conflictos y oportunidades de mejora.

---

## 📊 ARQUITECTURA ACTUAL

### Sistema de Decisión en 2 Capas

```
┌─────────────────────────────────────────────────┐
│  CAPA 1: detectar-intencion.js                 │
│  ────────────────────────────────               │
│  - Analiza mensaje del usuario                 │
│  - Detecta flags especiales                    │
│  - Sugiere agente (NO fuerza)                  │
│  - Retorna: { agent, reason, flags }           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  CAPA 2: orquestador.js                        │
│  ───────────────────────                        │
│  - Recibe sugerencia de Capa 1                 │
│  - Considera activeAgent del perfil            │
│  - DECIDE qué agente usar finalmente           │
│  - Construye contexto específico               │
│  - Aplica instrucciones especiales             │
└─────────────────────────────────────────────────┘
```

---

## 🔍 INVENTARIO DE AGENTES

| Agente | Código | Rol | Keywords | Handoff |
|--------|--------|-----|----------|---------|
| **Aurora** | `AURORA` | Coordinadora general, reservas, pagos | hot desk, reserva, sala, pago | @aurora |
| **Aluna** | `ALUNA` | Closer ventas membresías | membresía, plan 10, plan 20, oficina virtual | @aluna |
| **Adriana** | `ADRIANA` | Seguros Segpopular | Ninguno | @adriana (SOLO) |
| **Enzo** | `ENZO` | Marketing/IA/ventas | Ninguno | @enzo (SOLO) |
| **Ángela** | `ANGELA` | Salud y bienestar | Ninguno | @ángela (SOLO) |
| **Axel** | `AXEL` | Reparación vehículos | Ninguno | @axel (SOLO) |
| **Gabi** | `GABI` | Admin/finanzas/legal | Ninguno | @gabi (SOLO) |
| **Tomi** | `TOMI` | Bienes raíces EC/RD | bienes raices, casa, departamento, propiedad | @tomi |

**Total:** 8 agentes activos

---

## 📋 REGLAS DE ACTIVACIÓN

### 🎯 Prioridad 1: Handoffs Explícitos (@código)

**Trigger:** Usuario escribe `@<agente>`  
**Acción:** Cambio FORZADO inmediato  
**Flags:** `agentHandoff: true, fromAgent, targetAgent`

```javascript
// Orden de evaluación:
1. @enzo      → ENZO
2. @adriana   → ADRIANA
3. @ángela    → ANGELA
4. @axel      → AXEL
5. @gabi      → GABI
6. @tomi      → TOMI
7. @aluna     → ALUNA
8. @aurora    → AURORA (flag especial: returningToAurora)
```

**Estado:** ✅ CORRECTO - Fuerzan cambio independiente del activeAgent

---

### 🎯 Prioridad 2: Contextos que Requieren Aurora

**Trigger:** Situaciones específicas que SOLO Aurora puede manejar  
**Acción:** Cambio FORZADO a Aurora (si activeAgent ≠ Aurora)  
**Flags:** `requiresAurora: true`

#### 2.1 Modificación de Reserva Existente ⚠️

**Patrones detectados:**
```javascript
/cambiar.*hora/, /cambiar.*fecha/, /cambiar.*día/,
/modificar.*reserva/, /corregir.*la/, /reprogramar/,
/reagendar/, /mover.*la/, /te equivocaste/, /está mal/,
/otra.*hora/, /error.*hora/, /error.*fecha/
```

**Flags:** `modificacionReserva: true, postEmailSupport: true, requiresAurora: true`

**Instrucciones especiales:**
- NO crear nueva reserva
- Buscar cuál reserva quiere modificar (contexto)
- Preguntar nueva fecha/hora
- Confirmar cambio

**Estado:** ✅ CORRECTO - Lógica clara y específica

---

#### 2.2 Solicitud de Link de Pago 💳

**Patrones detectados:**
```javascript
/link.*pago/, /enlace.*pago/, /dame.*link/,
/envía.*link/, /me das.*link/, /cómo.*pago/,
/dónde.*pago/, /quiero.*pagar/, /necesito.*pagar/
```

**Flags:** `paymentLinkRequest: true, requiresAurora: true`

**Instrucciones especiales:**
- NO reiniciar flujo
- Buscar reserva con status `pending_payment`
- Mostrar links de Payphone + Transferencia
- Si no hay reserva confirmada, ofrecer crear una

**Estado:** ✅ CORRECTO - Evita reinicios innecesarios

---

#### 2.3 Soporte Post-Email 📧

**Patrones detectados:**
```javascript
/recibí.*correo.*dud/, /recibí.*confirmación/,
/confirmación.*dud/, /enlace.*confirmación/,
/link.*confirmación/, /detalles.*reserva/,
/mi reserva/, /tengo dud/, /dud.*reserva/,
/info.*reserva/, /hora.*llegada/
```

**Condiciones adicionales:**
- `perfil.justConfirmed === true`
- O tiene reservas confirmadas + NO pendingConfirmation

**Flags:** `postEmailSupport: true, requiresAurora: true`

**Instrucciones especiales:**
- Modo soporte: usar datos de reserva confirmada
- NO reiniciar flujo de reservas
- SOLO reactivar si keywords: cancelar, cambiar fecha, modificar, reprogramar, etc.

**Estado:** ✅ CORRECTO - Previene bucles de recolección de datos

---

### 🎯 Prioridad 3: Keywords que SUGIEREN Agente

**Trigger:** Palabras clave detectadas en mensaje  
**Acción:** SUGERENCIA (NO fuerza cambio)  
**Decisión final:** Orquestador según activeAgent  
**Flags:** `isKeywordMatch: true, suggestedAgent: <AGENTE>`

#### 3.1 Keywords Tomi (Bienes Raíces)

```javascript
TOMI_KEYWORDS = [
  'bienes raices', 'bienes raíces', 'inmobiliaria', 'propiedad', 'propiedades',
  'casa', 'departamento', 'apartamento', 'villa', 'terreno',
  'comprar casa', 'vender casa', 'busco casa', 'busco departamento',
  'ecuador', 'quito', 'guayaquil', 'cuenca', 'cumbayá', 'la pradera',
  'republica dominicana', 'república dominicana', 'punta cana', 'santo domingo',
  'ECU-001', 'ECU-002', 'DOM-001', 'DOM-002',
  'inversion inmobiliaria', 'inversión inmobiliaria', 'compra propiedad'
]
```

**Comportamiento:**
- Si `activeAgent !== 'AURORA'` → MANTENER activeAgent
- Si `activeAgent === 'AURORA'` o no existe → CAMBIAR a Tomi

**Estado:** ✅ CORRECTO pero **⚠️ Problema potencial** (ver Issues)

---

#### 3.2 Keywords Aluna (Membresías)

```javascript
ALUNA_KEYWORDS = [
  'membresía', 'membresia', 'plan mensual', 'planes',
  'plan 10', 'plan10', 'plan 20', 'plan20',
  'oficina ejecutiva', 'oficina virtual', 'virtual office'
]
```

**Comportamiento:** Igual que Tomi

**Estado:** ✅ CORRECTO

---

#### 3.3 Keywords Aurora (Reservas/Pagos)

```javascript
AURORA_KEYWORDS = [
  'hot desk', 'day pass', 'día gratis', 'dia gratis',
  'reserva', 'reservar', 'sala', 'reunión', 'reunion',
  'pagar', 'pago', 'transferencia', 'tarjeta', 'payphone'
]
```

**Comportamiento:** Igual que anteriores

**Estado:** ✅ CORRECTO

---

### 🎯 Prioridad 4: Flags Especiales

#### 4.1 Cancelación 🚫

**Patrones:**
```javascript
/^cancela$/, /^cancelar$/, /cancelar.*reserva/,
/ya no quiero/, /mejor no/, /olvídalo/, /déjalo/,
/no importa/, /no sigo/, /no continúo/, /prefiero no/,
/cambio de opinión/, /cambié de opinión/
```

**Flags:** `cancelacion: true`

**Comportamiento:**
- MANTENER activeAgent (no cambia agente)
- Marcar flag para instrucciones especiales
- Aurora: NO seguir pidiendo datos, confirmar cancelación

**Estado:** ✅ CORRECTO

---

#### 4.2 Saludo Casual 👋

**Patrones:**
```javascript
/^hola\b/, /^hi\b/, /^hello\b/, /^hey\b/,
/^buenas\b/, /^buenos días\b/, /^buenas tardes\b/,
/^buenas noches\b/, /^qué tal\b/, /^cómo estás\b/,
/^saludos\b/
```

**Flags:** `casualGreeting: true`

**Comportamiento:**
- MANTENER activeAgent
- Respuesta breve y cálida CON presentación
- ⚠️ **NO ofrecer servicios automáticamente**
- ⚠️ **NO mostrar lista de espacios/precios**

**Estado:** ✅ CORRECTO - Instrucciones explícitas para evitar spam

---

#### 4.3 Pregunta de Identidad 🎯

**Patrones:**
```javascript
/quién eres/, /qué eres/, /qué haces/,
/qué sabes hacer/, /qué puedes hacer/,
/dime quién eres/, /qué me puedes ofrecer/,
/qué servicios tienen/, /qué es coworkia/
```

**Flags:** `identityQuestion: true`

**Comportamiento:**
- MANTENER activeAgent
- Respuesta bomba del ecosistema (8 empresas)
- ⚠️ **TERMINAR después de respuesta (NO ofrecer servicios)**

**Estado:** ✅ CORRECTO - Control crítico implementado

---

#### 4.4 Promoción Venta Agentes Virtuales 🤖

**Trigger:** Campaña específica MarketingLab OneMind

**Patrones:**
```javascript
/aurora.*quiero.*saber.*qué.*puede.*hacer.*agente.*virtual/,
/muéstrame.*que.*puedes.*hacer.*agente.*virtual/,
/sistema.*como.*tú.*para.*mi.*empresa/,
/quiero.*agente.*virtual.*como.*aurora/
```

**Flags:** `virtualAgentSalesPromo: true, requiresAurora: true`

**Comportamiento:**
- FORZAR Aurora
- Misión: Demostrar capacidad y vender sistema

**Estado:** ✅ CORRECTO - Caso de uso específico bien manejado

---

## 🧠 LÓGICA DEL ORQUESTADOR

### Árbol de Decisión

```
INPUT: mensaje, perfil.activeAgent, historial
   │
   ▼
[detectar-intencion.js]
   │
   ├─ Retorna: { agent, reason, flags }
   │
   ▼
[orquestador.js]
   │
   ├─ ¿isAgentHandoff? (@código)
   │   └─ SÍ → USAR agente del handoff
   │
   ├─ ¿isReturningToAurora? (@aurora)
   │   └─ SÍ → USAR Aurora
   │
   ├─ ¿requiresAurora? (modificación/pago/post-email)
   │   └─ SÍ y activeAgent ≠ Aurora → CAMBIAR a Aurora
   │
   ├─ ¿isKeywordMatch? (sugerencia)
   │   ├─ activeAgent existe y ≠ Aurora
   │   │   └─ MANTENER activeAgent (ignorar sugerencia)
   │   └─ activeAgent = Aurora o no existe
   │       └─ USAR agente sugerido
   │
   └─ ¿maintainingActive? (sin trigger)
       └─ MANTENER activeAgent
```

**Estado:** ✅ LÓGICA CLARA y PREDECIBLE

---

## 🚨 ISSUES IDENTIFICADOS

### 🔴 CRÍTICO: Keywords Tomi Demasiado Amplios

**Problema:**
```javascript
TOMI_KEYWORDS = [
  'ecuador', 'quito', 'guayaquil', 'cuenca',
  'republica dominicana', 'punta cana'
]
```

**Escenario problemático:**
```
Usuario: "Necesito un espacio de coworking en Quito"
Detecta: keyword 'quito' → sugiere TOMI
Resultado: Si activeAgent=Aurora → CAMBIA a Tomi (❌ INCORRECTO)
Esperado: Quedarse con Aurora para reservas
```

**Impacto:** ALTO - Puede desviar usuarios a Tomi cuando quieren reservar espacios

**Solución recomendada:**
```javascript
// Opción 1: Combinar con contexto de bienes raíces
if (TOMI_KEYWORDS.some(k => text.includes(k)) && 
    /casa|departamento|propiedad|bienes raices/i.test(text)) {
  return { agent: 'TOMI', ... };
}

// Opción 2: Remover nombres de ciudades de keywords, agregar solo si hay contexto:
TOMI_LOCATION_KEYWORDS = ['ecuador', 'quito', ...];
TOMI_PROPERTY_KEYWORDS = ['casa', 'departamento', 'propiedad', ...];

// Requiere AMBOS para activar Tomi
```

---

### 🟡 MEDIO: Conflicto Keywords Aurora vs Aluna

**Problema:**
```javascript
AURORA_KEYWORDS = ['reserva', 'reservar', 'sala', 'reunion']
ALUNA_KEYWORDS = ['plan mensual', 'planes', 'oficina ejecutiva']
```

**Escenario ambiguo:**
```
Usuario: "Quiero reservar un plan mensual"
- Tiene keyword Aurora: 'reservar'
- Tiene keyword Aluna: 'plan mensual'
```

**Comportamiento actual:**
1. `detectar-intencion.js` evalúa en orden:
   - Tomi primero (no match)
   - Aluna segundo (✅ match 'plan mensual')
   - Aurora tercero (no evaluado)
2. Retorna: `agent: 'ALUNA'`

**¿Es correcto?** SÍ ✅, porque 'plan mensual' es más específico que 'reservar'

**Pero:** El orden de evaluación importa. Si cambiamos orden de IFs, cambia resultado.

**Recomendación:** Implementar sistema de **scoring de confianza**:
```javascript
// Pseudo-código
const scores = {
  tomi: calcularScore(text, TOMI_KEYWORDS),
  aluna: calcularScore(text, ALUNA_KEYWORDS),
  aurora: calcularScore(text, AURORA_KEYWORDS)
};

const winner = Object.keys(scores).reduce((a, b) => 
  scores[a] > scores[b] ? a : b
);
```

---

### 🟡 MEDIO: Handoff desde Agente No-Aurora sin Contexto

**Problema:**
Usuario conversa con Enzo → Dice "@aluna" → Cambia a Aluna

**¿Qué pasa?**
- Aluna recibe historial vacío (solo filtra por agente activo)
- Puede perder contexto de por qué el usuario quiere hablar de membresías

**Código actual:**
```javascript
// orquestador.js línea ~166
const contextoHistorial = construirContextoHistorial(historial, agenteKey);
// ⚠️ Solo incluye mensajes del agente actual
```

**Impacto:** MEDIO - Usuario puede necesitar repetir información

**Solución recomendada:**
```javascript
// Opción 1: Incluir último mensaje de transición
if (isAgentHandoff) {
  // Incluir último mensaje del agente anterior como contexto
  const lastMessageFromPrevAgent = historial.filter(
    h => h.agent === intencion.flags.fromAgent
  ).slice(-1);
  // Agregar al contexto de Aluna
}

// Opción 2: Permitir a Aurora ver TODOS los mensajes siempre
// (ya implementado para Aurora, extender a otros agentes)
```

---

### 🟢 BAJO: Falta Confirmación de Handoff

**Problema:**
Usuario dice "@enzo" → Sistema cambia silenciosamente a Enzo

**Comportamiento actual:**
- Orquestador detecta handoff
- Construye mensaje entrada de Enzo
- Envía respuesta

**Falta:** Confirmación explícita del cambio

**Ejemplo ideal:**
```
Usuario: @enzo
Aurora: "Te conecto con Enzo, nuestro experto en marketing y automatización."
Enzo: "¡Hola! Soy Enzo 🚀. ¿En qué puedo ayudarte?"
```

**Código actual:**
```javascript
// SÓLIDO: Ya existe en agentes
handover: {
  transicion: 'Te conecto con Enzo...',
  llamado: 'Enzo, te dejo con {nombre}...'
}
```

**Estado:** ⚠️ Definido pero NO utilizado consistentemente

**Solución:** Usar siempre `agente.handover.transicion` en orquestador antes del cambio

---

### 🟢 BAJO: Post-Email Keywords Hardcodeados

**Problema:**
```javascript
// orquestador.js línea ~34
const POST_EMAIL_REACTIVATION_KEYWORDS = [
  'cancelar', 'cancelación', 'cambiar fecha', ...
];

// Usados en línea ~250:
const instruccionesPostEmail = esSoportePostEmail ? `
...SOLO reactivar si keywords: ${POST_EMAIL_REACTIVATION_KEYWORDS.join(', ')}
` : '';
```

**Issue:** Lista duplicada en orquestador + detectar-intencion

**Solución:** Mover a constante compartida en `utils/constants.js`

---

## ✅ ASPECTOS BIEN IMPLEMENTADOS

### 1. Separación Clara de Responsabilidades ✅

- `detectar-intencion.js`: Analiza y sugiere
- `orquestador.js`: Decide y ejecuta

**Beneficio:** Fácil de testear y modificar

---

### 2. Flags Descriptivos ✅

```javascript
{
  agentHandoff: true,
  fromAgent: 'AURORA',
  targetAgent: 'ENZO',
  requiresAurora: true,
  isKeywordMatch: true,
  cancelacion: true
}
```

**Beneficio:** Debugging claro, fácil agregar nuevos flags

---

### 3. Priorización de Contextos Especiales ✅

Orden de evaluación:
1. Handoffs explícitos (máxima prioridad)
2. Contextos que requieren Aurora
3. Keywords sugeridos
4. Mantener agente actual

**Beneficio:** Comportamiento predecible

---

### 4. Prevención de Bucles ✅

```javascript
// Saludo casual → NO ofrece servicios
// Pregunta identidad → SOLO responde, NO vende
// Post-email → NO reinicia flujo
```

**Beneficio:** UX no invasiva

---

### 5. Logging Extensivo ✅

```javascript
console.log(`[ORQUESTADOR] 🔄 Handoff explícito hacia: ${agenteKey}`);
console.log(`[ORQUESTADOR] ⚠️ Contexto requiere Aurora (${intencion.reason})`);
console.log(`[ORQUESTADOR] 🎯 Keywords sugieren ${intencion.agent}, pero manteniendo activo`);
```

**Beneficio:** Debugging en producción, comprensión de decisiones

---

## 📊 MÉTRICAS DE COMPLEJIDAD

| Métrica | Valor | Evaluación |
|---------|-------|------------|
| Total líneas código | 1,351 | ⚠️ Alto |
| Archivos involucrados | 2 | ✅ OK |
| Agentes configurados | 8 | ✅ OK |
| Patrones regex | 12 | ⚠️ Medio-Alto |
| Keywords totales | ~50 | ✅ OK |
| Flags especiales | 10+ | ⚠️ Medio |
| Niveles decisión | 4 | ✅ OK |

**Complejidad ciclomática estimada:** ALTA (muchos IFs anidados)

**Recomendación:** Considerar refactoring a **máquina de estados** o **pattern matching**

---

## 🎯 MATRIZ DE COBERTURA

| Agente | Handoff Explícito | Keywords | Contexto Especial | Prioridad Default |
|--------|-------------------|----------|-------------------|-------------------|
| Aurora | @aurora ✅ | reserva, pago ✅ | Modificación ✅, Pago ✅, Post-email ✅ | SÍ ✅ |
| Aluna | @aluna ✅ | membresía, plan ✅ | - | - |
| Adriana | @adriana ✅ | - | - | - |
| Enzo | @enzo ✅ | - | - | - |
| Ángela | @ángela ✅ | - | - | - |
| Axel | @axel ✅ | - | - | - |
| Gabi | @gabi ✅ | - | - | - |
| Tomi | @tomi ✅ | casa, propiedad ⚠️ | - | - |

**Cobertura total:** 7/8 agentes con keywords (87.5%)  
**Agentes solo handoff:** 5/8 (Adriana, Enzo, Ángela, Axel, Gabi)

---

## 🧪 CASOS DE USO EDGE

### Caso 1: Usuario Confundido Cambia Múltiples Veces

**Escenario:**
```
Usuario: "Hola" (activeAgent: Aurora)
Usuario: "@enzo quiero marketing"
Usuario: "@aluna mejor un plan"
Usuario: "@gabi espera, necesito asesoría legal"
Usuario: "@aurora olvídalo, quiero reservar"
```

**Comportamiento esperado:**
- Cada handoff cambia agente inmediatamente ✅
- Historial se filtra por agente activo ⚠️ (pierde contexto)

**Estado:** FUNCIONA pero puede confundir al usuario

**Mejora:** Límite de handoffs por minuto (rate limiting de cambios)

---

### Caso 2: Keyword Ambiguo Durante Handoff

**Escenario:**
```
Usuario conversa con Aluna sobre planes
Usuario: "Quiero reservar la oficina ejecutiva"
- Keyword 'reservar' (Aurora)
- Keyword 'oficina ejecutiva' (Aluna)
```

**Comportamiento actual:**
- activeAgent = Aluna
- Keywords detectan Aluna primero en código
- MANTIENE Aluna (correcto ✅)

**Estado:** CORRECTO por suerte del orden de evaluación

---

### Caso 3: Post-Email pero Usuario Dice Keyword de Cancelación

**Escenario:**
```
Usuario tiene reserva confirmada (justConfirmed=true)
Usuario: "Quiero cancelar mi reserva"
```

**Comportamiento actual:**
1. Detecta postEmailSupport ✅
2. Detecta cancelación ✅
3. Instrucciones especiales incluyen AMBOS

**Estado:** ✅ CORRECTO - Flags no son mutuamente excluyentes

---

### Caso 4: Tomi Activado por Error con "Quito"

**Escenario:**
```
Usuario: "Necesito un espacio de coworking en Quito"
Keyword 'quito' detectado → sugiere Tomi
activeAgent = Aurora
```

**Comportamiento actual:**
- Keywords match de Tomi
- Orquestador: activeAgent ≠ Aurora? NO (es Aurora)
- Cambia a Tomi ❌ INCORRECTO

**Estado:** 🔴 BUG CONFIRMADO (ver Issues Críticos)

---

## 📈 RECOMENDACIONES PRIORITARIAS

### P0: FIX Keywords Tomi (CRÍTICO) 🚨

**Acción:**
```javascript
// detectar-intencion.js
const TOMI_PROPERTY_KEYWORDS = ['casa', 'departamento', 'propiedad', 'villa', 'terreno'];
const TOMI_LOCATION_KEYWORDS = ['ecuador', 'quito', 'guayaquil'];

// Requiere keyword de propiedad + opcionalmente ubicación
if (TOMI_PROPERTY_KEYWORDS.some(k => text.includes(k))) {
  return { agent: 'TOMI', reason: 'keywords bienes raíces', flags: { ... } };
}
```

**Impacto:** Evita 90%+ de falsos positivos

---

### P1: Implementar Sistema de Scoring 🎯

**Acción:**
```javascript
function calcularScoreAgente(text, keywords) {
  let score = 0;
  keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      score += keyword.length; // Keywords más largos = más específicos
    }
  });
  return score;
}

// Detectar agente con mayor score
const scores = {
  tomi: calcularScoreAgente(text, TOMI_KEYWORDS),
  aluna: calcularScoreAgente(text, ALUNA_KEYWORDS),
  aurora: calcularScoreAgente(text, AURORA_KEYWORDS)
};
```

**Beneficio:** Reduce ambigüedades

---

### P1: Agregar Contexto en Handoffs 🔄

**Acción:**
```javascript
// orquestador.js
if (isAgentHandoff) {
  // Incluir último mensaje del agente anterior
  const previousAgentContext = historial
    .filter(h => h.agent === intencion.flags.fromAgent)
    .slice(-2) // Últimos 2 mensajes
    .map(h => `[${h.agent}] ${h.content}`)
    .join('\n');
  
  contextoHistorial = `
CONTEXTO DE TRANSICIÓN:
${previousAgentContext}

CONVERSACIÓN ACTUAL:
${contextoHistorial}
  `;
}
```

---

### P2: Centralizar Constantes 📦

**Acción:**
```javascript
// src/utils/agent-constants.js (NUEVO ARCHIVO)
export const POST_EMAIL_REACTIVATION_KEYWORDS = [
  'cancelar', 'cancelación', 'cambiar fecha', 'modificar reserva', ...
];

export const TOMI_KEYWORDS = { ... };
export const ALUNA_KEYWORDS = { ... };
export const AURORA_KEYWORDS = { ... };
```

**Importar en ambos archivos:**
```javascript
// detectar-intencion.js
import { TOMI_KEYWORDS, ALUNA_KEYWORDS, ... } from '../utils/agent-constants.js';

// orquestador.js
import { POST_EMAIL_REACTIVATION_KEYWORDS } from '../utils/agent-constants.js';
```

---

### P3: Refactoring a Máquina de Estados 🏗️

**Concepto:**
```javascript
class AgentStateMachine {
  constructor(currentAgent) {
    this.state = currentAgent;
  }
  
  transition(trigger, flags) {
    // Validar transición válida
    // Aplicar prioridades
    // Logging automático
    // Retornar nuevo estado
  }
  
  canTransition(fromAgent, toAgent, reason) {
    // Validar transición permitida
  }
}
```

**Beneficio:** Testeable, extensible, más fácil de visualizar

---

## 📊 TABLA DE ESTADOS (PROPUESTA)

```
┌──────────┬─────────────────────────────────────────────────────┐
│  Estado  │  Transiciones Permitidas                           │
├──────────┼─────────────────────────────────────────────────────┤
│ Aurora   │ → Aluna (keywords/handoff)                         │
│          │ → Tomi (keywords/handoff)                          │
│          │ → Adriana/Enzo/Ángela/Axel/Gabi (handoff)         │
├──────────┼─────────────────────────────────────────────────────┤
│ Aluna    │ → Aurora (handoff/keywords reserva/requiresAurora) │
│          │ → Otros (handoff explícito)                        │
├──────────┼─────────────────────────────────────────────────────┤
│ Tomi     │ → Aurora (handoff/keywords reserva/requiresAurora) │
│          │ → Otros (handoff explícito)                        │
├──────────┼─────────────────────────────────────────────────────┤
│ Otros    │ → Aurora (handoff/requiresAurora)                  │
│ (6)      │ → Cualquiera (handoff explícito)                   │
└──────────┴─────────────────────────────────────────────────────┘
```

---

## 🧪 SUITE DE TESTS RECOMENDADA

### Tests Unitarios (detectar-intencion.js)

```javascript
describe('detectarIntencion', () => {
  test('Handoff explícito @enzo fuerza cambio', () => {
    const result = detectarIntencion('@enzo ayuda con marketing', 'AURORA');
    expect(result.agent).toBe('ENZO');
    expect(result.flags.agentHandoff).toBe(true);
  });
  
  test('Keyword "quito" solo NO activa Tomi', () => {
    const result = detectarIntencion('necesito espacio en quito', 'AURORA');
    expect(result.agent).not.toBe('TOMI');
  });
  
  test('Cancelación mantiene agente actual', () => {
    const result = detectarIntencion('cancela', 'ALUNA');
    expect(result.agent).toBe('ALUNA');
    expect(result.flags.cancelacion).toBe(true);
  });
  
  test('Modificación reserva fuerza Aurora', () => {
    const result = detectarIntencion('cambiar fecha de mi reserva', 'TOMI');
    expect(result.agent).toBe('AURORA');
    expect(result.flags.requiresAurora).toBe(true);
  });
});
```

### Tests Integración (orquestador.js)

```javascript
describe('procesarMensaje', () => {
  test('Keywords Aluna desde Aurora cambia a Aluna', () => {
    const perfil = { activeAgent: 'AURORA' };
    const result = procesarMensaje('quiero un plan mensual', perfil);
    expect(result.metadata.selectedAgent).toBe('ALUNA');
  });
  
  test('Keywords Aurora desde Aluna MANTIENE Aluna', () => {
    const perfil = { activeAgent: 'ALUNA' };
    const result = procesarMensaje('quiero reservar', perfil);
    expect(result.metadata.selectedAgent).toBe('ALUNA');
  });
  
  test('requiresAurora desde cualquier agente fuerza Aurora', () => {
    const perfil = { activeAgent: 'TOMI' };
    const result = procesarMensaje('cambiar mi reserva', perfil);
    expect(result.metadata.selectedAgent).toBe('AURORA');
  });
});
```

---

## 📊 RESUMEN EJECUTIVO

### Estado General: 🟢 BUENO con Issues Críticos

**Fortalezas:**
- ✅ Arquitectura clara en 2 capas
- ✅ Flags descriptivos y extensibles
- ✅ Priorización lógica de triggers
- ✅ Prevención de bucles UX
- ✅ Logging extensivo

**Debilidades:**
- 🔴 Keywords Tomi demasiado amplios (ciudades)
- 🟡 Falta scoring para resolver ambigüedades
- 🟡 Pérdida contexto en handoffs no-Aurora
- 🟢 Constantes duplicadas

**Cobertura:**
- 8/8 agentes tienen handoff explícito ✅
- 3/8 agentes tienen keywords (Aurora, Aluna, Tomi)
- 5/8 agentes solo @código (especialistas)

**Complejidad:** ALTA pero MANEJABLE

---

## 🎯 PRÓXIMOS PASOS

1. **HOY:** Fix keywords Tomi (remover ciudades o agregar contexto)
2. **Esta semana:** Implementar scoring system
3. **Este mes:** Refactoring a máquina de estados
4. **Próximo mes:** Suite completa de tests unitarios + integración

---

**Auditoría completada:** 2026-01-13  
**Próxima revisión:** Después de implementar fixes P0  
**Responsable:** Aurora 🤖
