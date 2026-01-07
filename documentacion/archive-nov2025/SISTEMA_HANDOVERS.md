# 🔄 Sistema de Handovers Multi-Agente - Coworkia

## Resumen Ejecutivo

Sistema completo de transición entre agentes (Aurora, Enzo, Adriana, Aluna) con:
- **Mensajes personalizados** según contexto (primer mensaje vs conversación activa)
- **Delays programados** (10 segundos para entrada, 5 segundos para despedida)
- **Desactivación automática** del agente saliente
- **Validación estricta**: solo el agente activo responde
- **Mensajes de entrada/despedida** únicos por agente

---

## 🎭 Agentes y Sus Características

### Aurora 🏢
- **Rol:** Recepcionista y coordinadora de Coworkia
- **Especialidad:** Reservas, Hot Desk, salas, pagos
- **Mensaje retorno:** "¡Hola {nombre}! Te asisto en Coworkia a partir de ahora 😊"

### Enzo 🚀
- **Rol:** Experto en Marketing Digital, IA y Software  
- **Descripción:** "experto en marketing digital, IA y software"
- **Mensaje entrada:** "Hola Sensei 🥋! ¿Qué te puedo ayudar hoy?"
- **Mensaje despedida:** "Entendido Sensei, dejo en manos de Aurora el servicio que requieres. ¡Sayonara! 🥋"

### Adriana 🛡️
- **Rol:** Broker de Seguros en Segpopular S.A.
- **Descripción:** "experta en seguros de Segpopular"
- **Mensaje entrada:** "¡Hola! Soy Adriana de Segpopular 🛡️ ¿En qué puedo asesorarte con seguros hoy?"
- **Mensaje despedida:** "Perfecto, dejo a Aurora para que te asista con tu reserva. ¡Cualquier duda de seguros, aquí estaré! 😊"

### Aluna 💼
- **Rol:** Closer de Ventas y Especialista en Membresías
- **Descripción:** "especialista en planes mensuales y membresías"
- **Mensaje entrada:** "¡Hola! Soy Aluna 💼 ¿Te interesa conocer nuestros planes mensuales?"
- **Mensaje despedida:** "Genial, te dejo con Aurora para tu reserva. ¡Cuando quieras hablar de planes, aquí estoy! 😊"

---

## 🔀 Flujos de Handover

### Escenario 1: Primer Mensaje (Usuario Nuevo)

```
Usuario: "@enzo necesito ayuda con marketing"

[Aurora detecta @enzo]
Aurora: "¡Hola Diego! 👋 Te conecto con Enzo 🚀, tu experto en marketing digital, IA y software.

Si necesitas volver a hablar de reservas, menciona @Aurora y tu pregunta. ¡Estaré aquí! 😊"

[Sistema actualiza: activeAgent = 'ENZO']
[Delay de 10 segundos]

Enzo: "Hola Sensei 🥋! ¿Qué te puedo ayudar hoy?"
```

**Condiciones:**
- `firstVisit: true` O `conversationCount: 0`
- Usa nombre del usuario si está disponible
- Menciona rol completo del agente destino

---

### Escenario 2: En Medio de Conversación

```
Usuario: "quiero hacer una reserva"
Aurora: "¿Para qué fecha?"
Usuario: "para mañana"
Aurora: "¿A qué hora?"

Usuario: "@enzo tengo pregunta de marketing"

Aurora: "Listo Diego, te comunico de inmediato con Enzo.

Si necesitas volver a hablar de reservas, menciona @Aurora y tu pregunta. ¡Estaré aquí! 😊"

[Sistema actualiza: activeAgent = 'ENZO']
[Delay de 10 segundos]

Enzo: "Hola Sensei 🥋! ¿Qué te puedo ayudar hoy?"
```

**Condiciones:**
- Usuario tiene conversación activa
- Mensaje más corto y directo
- Preserva datos del formulario parcial

---

### Escenario 3: Retorno a Aurora

```
[Usuario está con Enzo]
Usuario: "gracias enzo"
Enzo: [responde]

Usuario: "@aurora quiero confirmar mi reserva"

Enzo: "Entendido Sensei, dejo en manos de Aurora el servicio que requieres. ¡Sayonara! 🥋"

[Delay de 5 segundos]
[Sistema actualiza: activeAgent = 'AURORA']

Aurora: "¡Hola Diego! Te asisto en Coworkia a partir de ahora 😊

Veo que tenías una reserva en proceso:
🏢 Espacio: Hot Desk
📅 Fecha: 2025-11-16

¿Quieres continuar con esta reserva?"
```

**Características:**
- Despedida del agente saliente primero
- Delay de 5 segundos (más corto)
- Aurora recupera contexto de reserva
- NO menciona conversación con Enzo

---

## 🎯 Lógica de Detección

### Triggers de Handover

```javascript
// Detectar menciones explícitas
@enzo    → Handoff hacia Enzo
@adriana → Handoff hacia Adriana
@aluna   → Handoff hacia Aluna
@aurora  → Retorno a Aurora
```

### Validación de Agente Activo

```javascript
// Campo en perfil de usuario
profile.activeAgent = 'AURORA' | 'ENZO' | 'ADRIANA' | 'ALUNA'

// Flujo de validación
1. Usuario envía mensaje sin @mención
2. Sistema detecta intención → agente X
3. Agente activo = agente Y
4. Si X ≠ Y → IGNORAR mensaje
5. Si X = Y → PROCESAR mensaje
```

**Ejemplo:**
```
activeAgent: 'ENZO'
Usuario: "quiero hot desk"
Detectado: AURORA
Acción: IGNORAR (Enzo está activo, no Aurora)
```

---

## ⏱️ Timing de Transiciones

| Evento | Delay | Razón |
|--------|-------|-------|
| Mensaje handoff de agente saliente | 0s | Inmediato |
| Entrada nuevo agente | 10s | Dar tiempo a leer handoff |
| Despedida agente saliente (retorno) | 0s | Inmediato |
| Entrada Aurora (retorno) | 5s | Más rápido, ya conoce el sistema |

---

## 💾 Estructura de Base de Datos

### Campo `active_agent` en tabla `users`

```sql
ALTER TABLE users 
ADD COLUMN active_agent TEXT DEFAULT 'AURORA'
```

**Valores posibles:**
- `'AURORA'` - Default, reservas y servicios
- `'ENZO'` - Marketing, IA, software
- `'ADRIANA'` - Seguros
- `'ALUNA'` - Planes mensuales

**Actualización:**
- Se actualiza en cada handoff exitoso
- Persiste entre sesiones
- Default 'AURORA' para usuarios nuevos

---

## 🔧 Implementación Técnica

### Archivos Modificados

**1. Definiciones de Agentes**
- `src/deteccion-intenciones/enzo.js` → `mensajes.entrada`, `mensajes.despedida`
- `src/deteccion-intenciones/adriana.js` → ídem
- `src/deteccion-intenciones/aluna.js` → ídem
- `src/deteccion-intenciones/aurora.js` → `mensajes.entradaRetorno`

**2. Detección y Orquestación**
- `src/deteccion-intenciones/detectar-intencion.js` → Flags de handoff
- `src/deteccion-intenciones/orquestador.js` → Instrucciones personalizadas

**3. Handler Principal**
- `src/express-servidor/endpoints-api/wassenger.js`:
  - Validación de agente activo
  - Handoff con delays
  - Despedida y entrada secuencial
  - Actualización de `activeAgent`

**4. Gestión de Perfil**
- `src/perfiles-interacciones/memoria-sqlite.js` → Campo `activeAgent`
- `src/database/database.js` → Schema de `active_agent`

---

## 📊 Diagrama de Flujo

```
┌─────────────────────────────────────────────┐
│  Usuario menciona @enzo                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  detectarIntencion() retorna:               │
│  agent: 'ENZO'                              │
│  flags: { agentHandoff: true }              │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Orquestador inyecta instrucciones:         │
│  - Mensaje según contexto (nuevo/activo)    │
│  - Incluir nombre si disponible             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Aurora genera mensaje handoff             │
│  (OpenAI con prompt específico)             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Wassenger.js:                              │
│  1. Envía mensaje de Aurora                │
│  2. Guarda en historial                     │
│  3. await delay(10000)                      │
│  4. Actualiza activeAgent = 'ENZO'          │
│  5. Envía mensaje entrada Enzo              │
│  6. Guarda en historial                     │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Test 1: Handoff en Primer Mensaje
```bash
# Prerequisitos: Usuario nuevo sin conversación
Usuario: "@enzo ayuda con marketing"

# Verificar:
✅ Aurora saluda con nombre
✅ Menciona "experto en marketing digital, IA y software"
✅ Delay de 10 segundos
✅ Enzo entra con "Hola Sensei 🥋!"
✅ activeAgent actualizado a 'ENZO'
```

### Test 2: Handoff en Conversación Activa
```bash
# Prerequisitos: Usuario con conversación activa
Usuario: "quiero reservar"
Aurora: "¿Para qué fecha?"
Usuario: "@adriana pregunta de seguros"

# Verificar:
✅ Aurora mensaje corto "Listo [nombre], te comunico con Adriana"
✅ Delay de 10 segundos
✅ Adriana entra con mensaje de seguros
✅ Formulario parcial preservado (fecha guardada)
```

### Test 3: Retorno a Aurora
```bash
# Prerequisitos: Usuario activo con Enzo
Usuario: "@aurora confirmar reserva"

# Verificar:
✅ Enzo despedida: "Entendido Sensei, sayonara!"
✅ Delay de 5 segundos
✅ Aurora entra con saludo personalizado
✅ Aurora muestra datos de reserva guardados
✅ activeAgent actualizado a 'AURORA'
```

### Test 4: Validación de Agente Activo
```bash
# Prerequisitos: activeAgent = 'ENZO'
Usuario: "quiero hot desk" (sin @aurora)

# Verificar:
✅ Mensaje ignorado
✅ No hay respuesta de Aurora
✅ Logs: "Mensaje ignorado - Agente activo: ENZO"
```

---

## 🎨 Personalización de Mensajes

### Variables Disponibles

En orquestador, las siguientes variables se usan para personalización:

```javascript
perfil.name                  // "Diego Villota"
perfil.whatsappDisplayName   // "Diego"
perfil.firstVisit            // true/false
perfil.conversationCount     // 0, 1, 2, ...
AGENTES[target].nombre       // "Enzo"
AGENTES[target].descripcionCorta // "experto en..."
```

### Plantillas de Mensajes

**Handoff - Primer Mensaje:**
```
¡Hola {nombre}! 👋 Te conecto con {agente} 🚀, tu {descripción}.

Si necesitas volver a hablar de reservas, menciona @Aurora y tu pregunta. ¡Estaré aquí! 😊
```

**Handoff - Conversación Activa:**
```
Listo {nombre}, te comunico de inmediato con {agente}.

Si necesitas volver a hablar de reservas, menciona @Aurora y tu pregunta. ¡Estaré aquí! 😊
```

**Entrada Nuevo Agente:**
```
[Mensaje único por agente - ver sección "Agentes"]
```

**Retorno a Aurora:**
```
¡Hola {nombre}! Te asisto en Coworkia a partir de ahora 😊
```

---

## 🚨 Manejo de Errores

### Error: Delay Timeout
**Síntoma:** Usuario envía mensaje durante delay
**Solución:** Mensaje se procesa normalmente después del delay

### Error: Agente No Responde
**Síntoma:** activeAgent desincronizado
**Solución:** Usuario menciona @aurora explícitamente para forzar cambio

### Error: Formulario Perdido en Handoff
**Síntoma:** Datos de reserva no aparecen al retornar
**Solución:** Sistema preserva formulario parcial automáticamente

---

## 📈 Métricas Recomendadas

- **Tasa de handoff:** % mensajes que activan cambio de agente
- **Tiempo promedio de transición:** Desde @mención hasta entrada nuevo agente
- **Tasa de retorno:** % usuarios que vuelven a Aurora
- **Pérdida de contexto:** % formularios perdidos en transición (debe ser 0%)

---

## 🔐 Seguridad

- ✅ Validación estricta de agente activo
- ✅ Solo menciones explícitas activan handoff
- ✅ No se cruzan conversaciones entre agentes
- ✅ Logs detallados para auditoría
- ✅ Campo `activeAgent` con default seguro

---

## 📝 Ejemplo de Logs

```
[WASSENGER] 🤝 Handoff detectado hacia: ENZO
[WASSENGER] Enviando mensaje de handoff...
[WASSENGER] Esperando 10 segundos...
[WASSENGER] Actualizando activeAgent a ENZO
[WASSENGER] Enviando mensaje de entrada de Enzo
[WASSENGER] ✅ Handoff completado

[Usuario envía mensaje sin @mención]
[WASSENGER] ⏸️ Mensaje ignorado - Agente activo: ENZO, Detectado: AURORA

[Usuario menciona @aurora]
[WASSENGER] 👋 Usuario retorna a Aurora desde ENZO
[WASSENGER] Enviando despedida de Enzo...
[WASSENGER] Esperando 5 segundos...
[WASSENGER] Actualizando activeAgent a AURORA
[WASSENGER] Aurora responde con mensaje de retorno
```

---

## 🚀 Releases

- **v175** - Sistema completo de handovers multi-agente

---

*Última actualización: 15 de noviembre, 2025*
