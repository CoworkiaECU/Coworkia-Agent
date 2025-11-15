# 🎭 Escenas Conversacionales - Coworkia Agent

Documentación de flujos conversacionales avanzados implementados en Aurora y el sistema multi-agente.

---

## 📋 Escena 1: Retoma de Formulario con Resumen

### Objetivo
Cuando un usuario tiene datos previos de reserva (formulario parcial guardado) y vuelve a mencionar palabras clave de reserva, Aurora debe:
1. Resumir los datos que ya tiene
2. Preguntar si desea mantenerlos o cambiar algo
3. Solicitar solo los datos faltantes

### Implementación Técnica

**Archivo:** `src/servicios/partial-reservation-form.js`

**Método clave:** `getResumeMessage()`

```javascript
getResumeMessage() {
  const missing = this.getMissingFields();
  const hasSomeData = this.spaceType || this.date || this.time || this.email;
  
  if (!hasSomeData) return null;

  let message = '¡Perfecto! Veo que tenías una reserva en proceso. Déjame verificar los datos:\n\n';
  message += this.getSummary();
  
  if (missing.length > 0) {
    message += '\n\n❓ Falta: ' + missingNames.join(', ');
  }
  
  message += '\n\n¿Deseas mantener estos datos o hacer algún cambio?';
  return message;
}
```

### Condiciones de Activación

1. **Usuario menciona keywords de reserva:**
   - `reserva`, `reservar`, `hot desk`, `sala`, `espacio`

2. **Existe formulario parcial con datos:**
   - `form.spaceType` o `form.date` o `form.time` tiene valor

3. **Sistema detecta contexto de retoma:**
   - Se genera `resumeMessage` automáticamente
   - Orquestador inyecta instrucciones especiales en prompt

### Ejemplo de Conversación

```
[Primera interacción]
Usuario: "quiero reservar una sala"
Aurora: "¿Para qué fecha?"
Usuario: "15 de noviembre"
Aurora: "¿A qué hora?"

[Usuario abandona o cancela con "olvida"]

[Usuario retoma horas o días después]
Usuario: "quiero hacer una reserva"
Aurora: "¡Perfecto! Veo que tenías una reserva en proceso. Déjame verificar los datos:

🏢 Espacio: Sala de Reuniones
📅 Fecha: 2025-11-15

❓ Falta: hora, email

¿Deseas mantener estos datos o hacer algún cambio?"

Usuario: "mantener"
Aurora: "Perfecto. ¿A qué hora necesitas la sala?"
```

### Datos Guardados en Formulario Parcial

```javascript
{
  spaceType: 'meetingRoom',    // o 'hotDesk'
  date: '2025-11-15',
  time: null,                  // aún no proporcionado
  email: null,                 // aún no proporcionado
  numPeople: 1,
  durationHours: 2,
  updatedAt: '2025-11-15T10:30:00Z'
}
```

### Instrucciones en Prompt para Aurora

Cuando `resumeMessage` existe:

```
🔄 RETOMANDO RESERVA:
- El usuario tiene datos previos de una reserva en proceso
- DEBES usar exactamente este mensaje de resumen:
---
[mensaje generado automáticamente]
---
- NO agregues nada más, solo espera respuesta del usuario
- Si confirma los datos, continúa con lo que falta
- Si quiere cambiar algo, actualiza y confirma los cambios
```

---

## 🤝 Escena 2: Relevos Elegantes Entre Agentes

### Objetivo
Crear transiciones suaves cuando usuarios mencionan `@enzo`, `@adriana` o `@aurora`, permitiendo:
1. Relevo desde Aurora hacia especialistas (Enzo/Adriana)
2. Retorno desde especialistas hacia Aurora
3. Preservar contexto de reservas al volver a Aurora
4. No mezclar conversaciones de otros agentes en Aurora

### Implementación Técnica

**Archivo:** `src/deteccion-intenciones/detectar-intencion.js`

**Detección de menciones:**

```javascript
// Enzo explícito
if (/@enzo/.test(text)) {
  return { 
    agent: 'ENZO', 
    reason: 'trigger @Enzo', 
    flags: { agentHandoff: true, fromAgent: 'AURORA' } 
  };
}

// Adriana explícito
if (/@adriana/.test(text)) {
  return { 
    agent: 'ADRIANA', 
    reason: 'trigger @Adriana', 
    flags: { agentHandoff: true, fromAgent: 'AURORA' } 
  };
}

// Aurora explícito - retorno
if (/@aurora/.test(text)) {
  return { 
    agent: 'AURORA', 
    reason: 'trigger @Aurora - retorno desde otro agente', 
    flags: { returningToAurora: true } 
  };
}
```

### Tipos de Transiciones

#### A) Relevo de Aurora → Enzo/Adriana

**Flags activos:**
- `agentHandoff: true`
- `targetAgent: 'ENZO'` o `'ADRIANA'`

**Instrucciones para Aurora:**

```
🤝 RELEVO A OTRO AGENTE:
- El usuario mencionó @Enzo (o @Adriana)
- Haz un relevo ELEGANTE y BREVE:
  "¡Perfecto! Te conecto con Enzo 🚀 para esa consulta."
- Agrega: "Si necesitas volver a hablar de reservas, menciona @Aurora y tu pregunta. ¡Estaré aquí! 😊"
- NO des detalles sobre lo que Enzo hace
- Máximo 2 líneas en el relevo
```

#### B) Retorno de Enzo/Adriana → Aurora

**Flags activos:**
- `returningToAurora: true`

**Instrucciones para Aurora:**

```
👋 RETORNO DE USUARIO A AURORA:
- El usuario mencionó @Aurora - está volviendo después de hablar con otro agente
- Saluda brevemente: "¡Hola de nuevo! 😊"
- Resume cualquier dato de reserva que tengas (ver sección FORMULARIO PARCIAL arriba)
- Si hay formulario parcial, pregunta: "¿Quieres continuar con tu reserva o prefieres empezar de nuevo?"
- NO menciones conversaciones con otros agentes
- Enfócate SOLO en reservas y servicios de Coworkia
```

### Ejemplo de Conversación - Relevo a Enzo

```
Usuario: "hola quiero reservar sala para mañana"
Aurora: "¿A qué hora necesitas la sala?"

Usuario: "a las 3pm. por cierto, @enzo tengo una pregunta sobre marketing"
Aurora: "¡Perfecto! Te conecto con Enzo 🚀 para esa consulta.

Si necesitas volver a hablar de reservas, menciona @Aurora y tu pregunta. ¡Estaré aquí! 😊"

[Sistema cambia a Enzo]
Enzo: "¡Hola! Soy Enzo, experto en marketing digital y tecnología. ¿En qué puedo ayudarte?"

Usuario: "quiero saber sobre campañas en redes sociales"
Enzo: [responde sobre marketing]

Usuario: "@aurora quiero confirmar la sala"
Aurora: "¡Hola de nuevo! 😊

Veo que tenías una reserva en proceso:
🏢 Espacio: Sala de Reuniones
📅 Fecha: 2025-11-16
⏰ Hora: 15:00

¿Quieres continuar con esta reserva?"

Usuario: "sí"
Aurora: "¿Cuál es tu email para enviarte la confirmación?"
```

### Preservación de Contexto

**Lo que Aurora RECUERDA al retornar:**
- ✅ Datos del formulario parcial (espacio, fecha, hora, email)
- ✅ Historial de reservas confirmadas
- ✅ Estado de free trial usado
- ✅ Perfil del usuario (nombre, email)

**Lo que Aurora NO considera:**
- ❌ Conversación con Enzo sobre marketing
- ❌ Conversación con Adriana sobre seguros
- ❌ Temas no relacionados con Coworkia

### Metadata en Orquestador

```javascript
metadata: {
  agentHandoff: true,           // Se está haciendo relevo
  returningToAurora: false,     // Usuario vuelve a Aurora
  targetAgent: 'ENZO',          // Agente destino del relevo
  cancelacion: false,
  postEmailSupport: false
}
```

---

## 🔧 Configuración y Testing

### Probar Escena 1 (Retoma de Formulario)

1. **Iniciar reserva parcial:**
   ```
   Usuario: "quiero reservar hot desk"
   Aurora: "¿Para qué fecha?"
   Usuario: "mañana"
   Aurora: "¿A qué hora?"
   ```

2. **Cancelar:**
   ```
   Usuario: "cancela"
   Aurora: "Entendido, he cancelado la reserva..."
   ```

3. **Retomar horas después:**
   ```
   Usuario: "quiero hacer una reserva"
   Aurora: "¡Perfecto! Veo que tenías una reserva en proceso..."
   [Muestra resumen con fecha ya guardada]
   ```

### Probar Escena 2 (Relevos)

1. **Relevo desde Aurora:**
   ```
   Usuario: "@enzo cómo puedo mejorar mi marketing?"
   Aurora: "¡Perfecto! Te conecto con Enzo 🚀..."
   Enzo: "¡Hola! Soy Enzo..."
   ```

2. **Retorno a Aurora:**
   ```
   Usuario: "@aurora quiero reservar"
   Aurora: "¡Hola de nuevo! 😊 ¿Qué espacio necesitas?"
   ```

### Logs para Debugging

```javascript
// Detección de retoma
console.log('[WASSENGER] 📋 Usuario retoma reserva con datos previos');

// Detección de relevo
console.log('[ORQUESTADOR] 🤝 Relevo detectado hacia:', targetAgent);

// Detección de retorno
console.log('[ORQUESTADOR] 👋 Usuario retorna a Aurora');
```

---

## 📊 Arquitectura

```
┌─────────────────────────────────────────────┐
│  Usuario menciona keyword de reserva        │
│  + Existe formulario parcial                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  wassenger.js detecta condiciones           │
│  - isReservationIntent = true               │
│  - hasPartialData = true                    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  form.getResumeMessage()                    │
│  Genera resumen con datos existentes        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Orquestador inyecta instrucciones          │
│  en prompt de Aurora                        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Aurora responde con resumen exacto         │
│  "¡Perfecto! Veo que tenías..."            │
└─────────────────────────────────────────────┘
```

---

## 🎯 Ventajas del Sistema

### Escena 1 - Retoma de Formulario

- ✅ **Reduce fricción:** Usuario no repite datos
- ✅ **Aumenta conversión:** Más fácil completar reserva
- ✅ **Experiencia premium:** Sistema "recuerda" al usuario
- ✅ **Validación de datos:** Usuario confirma antes de proceder

### Escena 2 - Relevos Elegantes

- ✅ **Especialización:** Cada agente en su área de expertise
- ✅ **Contexto preservado:** No se pierde información de reservas
- ✅ **Transiciones suaves:** Usuario sabe cómo cambiar de agente
- ✅ **Claridad:** Aurora enfocada en reservas, no en marketing/seguros

---

## 📝 Notas de Implementación

### Escena 1

- Formulario parcial se guarda automáticamente en cada interacción
- TTL de 15 minutos para formulario en memoria (puede configurarse)
- Detección basada en keywords naturales, no comandos estrictos
- Mensaje de resumen generado dinámicamente según datos disponibles

### Escena 2

- Detección de `@agente` case-insensitive
- Flags de transición se propagan por todo el pipeline
- Historial conversacional separado por agente (futuro: implementar)
- Aurora solo accede a contexto de reservas al retornar

---

## 🚀 Releases

- **v172** - Sistema de cancelación con guardado de formularios
- **v173** - Escenas de retoma y relevos elegantes (este documento)

---

*Última actualización: 15 de noviembre, 2025*
