# 🤝 Sistema de Handovers - Documentación Actualizada

## 📋 Overview
Sistema que permite cambiar entre agentes especializados según la necesidad del usuario.

## 👥 Agentes Disponibles

### 1. 👩🏼‍💼 Aurora (Recepcionista)
- **Rol**: Recepcionista y coordinadora
- **Especialidad**: Reservas, Hot Desk, Salas de Reunión, cobros unitarios
- **Trigger**: Por defecto, o `@aurora`

### 2. 💼 Aluna (Closer de Ventas)
- **Rol**: Especialista en membresías y planes mensuales
- **Especialidad**: Plan 10, Plan 20, Oficina Ejecutiva, Oficina Virtual
- **Trigger**: 
  - `@aluna` (explícito)
  - Palabras clave: "membresía", "plan mensual", "plan 10", "plan 20", "oficina ejecutiva", "oficina virtual"

### 3. 👨‍💼 Enzo (Experto Marketing & IA)
- **Rol**: Experto en marketing digital y ventas
- **Especialidad**: Estrategias de marketing, IA aplicada, ventas B2B
- **Trigger**: `@enzo` (solo explícito)

### 4. 🛡️ Adriana (Seguros)
- **Rol**: Especialista en seguros Segpopular
- **Especialidad**: Seguros de salud, vida, vehículos
- **Trigger**: `@adriana` (solo explícito)

## 🔄 Flujos de Handover

### Aurora → Aluna

#### Triggers:
```javascript
// 1. Mención explícita
"@aluna quiero saber sobre planes mensuales"

// 2. Palabras clave automáticas
"me interesa la oficina ejecutiva"
"tienen planes mensuales?"
"cuál es el plan 10?"
"membresía mensual"
```

#### Ejemplo de Conversación:
```
Usuario: "tienen oficina ejecutiva?"
Aurora: [detecta keyword → handoff a Aluna]

[10 segundos de espera]

Aluna: "Sí, contamos con la Oficina Ejecutiva. Este espacio privado XL 
te ofrece acceso ilimitado... ¿Te gustaría saber más? 🚀"

[Wait 10s]

Aluna: "¡Hola! Soy Aluna 💼 ¿Te interesa conocer nuestros planes mensuales?"
```

### Aurora → Enzo

#### Trigger:
```javascript
// Solo mención explícita
"@enzo necesito ayuda con marketing digital"
```

### Aurora → Adriana

#### Trigger:
```javascript
// Solo mención explícita
"@adriana quiero información sobre seguros"
```

### Cualquier Agente → Aurora

#### Trigger:
```javascript
"@aurora quiero hacer una reserva"
```

## 🔧 Implementación Técnica

### 1. Detección de Intención
Archivo: `/src/deteccion-intenciones/detectar-intencion.js`

```javascript
// Keywords de Aluna
const ALUNA_KEYWORDS = [
  'membresía', 'membresia', 'plan mensual', 'planes',
  'plan 10', 'plan10', 'plan 20', 'plan20',
  'oficina ejecutiva', 'oficina virtual', 'virtual office'
];

// Detección
if (/@aluna/.test(text)) {
  return { 
    agent: 'ALUNA', 
    reason: 'trigger @Aluna', 
    flags: { 
      agentHandoff: true, 
      fromAgent: 'AURORA', 
      targetAgent: 'ALUNA' 
    } 
  };
}

if (ALUNA_KEYWORDS.some(k => text.includes(k))) {
  return { 
    agent: 'ALUNA', 
    reason: 'keywords membresías/planes', 
    flags: { 
      agentHandoff: true, 
      fromAgent: 'AURORA', 
      targetAgent: 'ALUNA' 
    } 
  };
}
```

### 2. Procesamiento del Handover
Archivo: `/src/express-servidor/endpoints-api/wassenger.js`

```javascript
// Flujo de handover (líneas 742-815)
if (resultado.metadata.agentHandoff) {
  const targetAgent = resultado.metadata.targetAgent;
  
  // 1. Mensaje de transición del agente actual
  const handoffMessage = await complete(resultado.prompt, {
    temperature: 0.4,
    max_tokens: 200
  });
  await enviarWhatsApp(userId, handoffMessage);
  
  // 2. Esperar 10 segundos
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // 3. Actualizar agente activo
  await saveProfile(userId, { activeAgent: targetAgent });
  
  // 4. Mensaje de entrada del nuevo agente
  const mensajeEntrada = nuevoAgente.mensajes?.entrada || 
    `Hola, soy ${nuevoAgente.nombre}. ¿En qué puedo ayudarte?`;
  await enviarWhatsApp(userId, mensajeEntrada);
  
  // 5. Registrar handoff
  await saveConversationMessage(userId, {
    role: 'assistant',
    content: mensajeEntrada,
    agent: targetAgent
  });
}
```

### 3. Mensajes de Entrada

#### Aurora
```javascript
mensajes: {
  entrada: '¡Hola! Soy Aurora 👩🏼‍💼 Estoy aquí para ayudarte con tu reserva. ¿En qué te puedo asistir?'
}
```

#### Aluna
```javascript
mensajes: {
  entrada: '¡Hola! Soy Aluna 💼 ¿Te interesa conocer nuestros planes mensuales?'
}
```

#### Enzo
```javascript
mensajes: {
  entrada: '¡Hola! Soy Enzo 🚀 Experto en marketing digital y estrategias de IA. ¿En qué te puedo ayudar?'
}
```

#### Adriana
```javascript
mensajes: {
  entrada: '¡Hola! Soy Adriana 🛡️ Especialista en seguros. ¿Necesitas proteger algo importante?'
}
```

## 📊 Contexto por Agente

### Aurora (Contexto Completo)
Recibe TODO:
- ✅ Perfil completo del usuario
- ✅ Historial de reservas
- ✅ Pending confirmations
- ✅ Formularios parciales
- ✅ Free trial status
- ✅ Payment methods

### Aluna, Enzo, Adriana (Contexto Básico)
Reciben SOLO:
- ✅ Nombre del usuario
- ✅ Historial de conversación con ese agente específico
- ❌ NO reciben info de reservas
- ❌ NO reciben formularios de Aurora

```javascript
// Contexto básico
const contextoUsuario = {
  nombre: perfil.name,
  conversaciones: perfil.conversationCount,
  canal: 'whatsapp'
};
```

## 🔍 Tracking y Logs

### Detección de Handover
```
[WASSENGER] 🤝 Handoff detectado hacia: ALUNA
[WASSENGER] 📤 Enviando mensaje de transición...
[WASSENGER] ⏳ Esperando 10 segundos antes de que entre el nuevo agente...
[WASSENGER] 👤 Agente activo actualizado a: ALUNA
[WASSENGER] 📤 Enviando mensaje de entrada del nuevo agente...
[WASSENGER] ✅ Handoff completado exitosamente
```

### Registro en Database
```javascript
// Interacción de handoff
{
  user_phone: '+593987770788',
  agent: 'aluna',
  agent_name: 'Aluna',
  intent_reason: 'agent_handoff',
  input: 'tienen oficina ejecutiva?',
  output: 'Handoff desde Aurora a Aluna',
  meta: {
    route: '/webhooks/wassenger',
    via: 'whatsapp',
    handoff: true,
    fromAgent: 'Aurora',
    toAgent: 'ALUNA'
  }
}
```

## 🧪 Testing

### Test de Keywords
```javascript
// Test 1: Keyword automático
const result = detectarIntencion("me interesa el plan 10");
// Expected: { agent: 'ALUNA', reason: 'keywords membresías/planes', ... }

// Test 2: Mención explícita
const result2 = detectarIntencion("@aluna hola");
// Expected: { agent: 'ALUNA', reason: 'trigger @Aluna', ... }

// Test 3: Keyword en medio de frase
const result3 = detectarIntencion("cuéntame sobre la oficina ejecutiva porfavor");
// Expected: { agent: 'ALUNA', ... }
```

### Test de Flujo Completo
```javascript
// 1. Usuario empieza con Aurora
"hola, quiero información" → AURORA

// 2. Menciona keyword de Aluna
"tienen planes mensuales?" → HANDOFF a ALUNA

// 3. Aluna responde
"¡Hola! Soy Aluna 💼..." 

// 4. Usuario regresa a Aurora
"@aurora quiero reservar hot desk" → HANDOFF a AURORA
```

## 📝 Mejores Prácticas

### 1. Keywords Específicos
- ✅ Usar keywords únicos por agente
- ✅ Evitar solapamiento entre agentes
- ✅ Mantener lista actualizada

### 2. Mensajes de Transición
- ✅ Claros y concisos
- ✅ Mencionan al nuevo agente
- ✅ Smooth handoff (10s wait)

### 3. Contexto Apropiado
- ✅ Aurora: TODO el contexto
- ✅ Otros: Solo conversación relevante
- ✅ No mezclar especialidades

### 4. Logging
- ✅ Log cada handoff
- ✅ Track success/failure
- ✅ Métricas de uso

## 🐛 Troubleshooting

### Handoff no se ejecuta
1. Verificar keyword en `ALUNA_KEYWORDS`
2. Revisar logs: `[WASSENGER] 🤝 Handoff detectado`
3. Verificar que `agentHandoff: true` en flags

### Mensaje duplicado
- Sistema espera 10s entre transición y entrada
- Si duplica, revisar timing en wassenger.js

### Agente no cambia
- Verificar `saveProfile()` actualiza `activeAgent`
- Revisar query de actualización en userRepository

## 📈 Métricas de Uso

### KPIs a Trackear
- Número de handoffs Aurora → Aluna por día
- Tasa de conversión post-handoff
- Tiempo promedio en cada agente
- Keywords más usados

### Query para Estadísticas
```sql
SELECT 
  agent_name,
  COUNT(*) as handoffs,
  DATE(timestamp) as fecha
FROM interactions
WHERE intent_reason = 'agent_handoff'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY agent_name, fecha
ORDER BY fecha DESC, handoffs DESC;
```

## 🎯 Roadmap

### Futuras Mejoras
- [ ] Handover inteligente basado en IA
- [ ] Métricas en dashboard
- [ ] A/B testing de mensajes de transición
- [ ] Multi-handoff tracking (Aurora → Aluna → Enzo)
- [ ] Handoff suggestions proactivos

## 📚 Referencias

- Detección: `/src/deteccion-intenciones/detectar-intencion.js`
- Orquestador: `/src/deteccion-intenciones/orquestador.js`
- Webhook: `/src/express-servidor/endpoints-api/wassenger.js`
- Agentes: `/src/deteccion-intenciones/[aurora|aluna|enzo|adriana].js`
