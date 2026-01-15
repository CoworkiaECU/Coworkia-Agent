# 🔔 Sistema de Follow-up Automático

## 📋 Descripción
Sistema inteligente de seguimiento automático para conversaciones abandonadas que envía mensajes personalizados a usuarios que no completaron su reserva.

## ✨ Características

### ⏰ Horario Inteligente
- ✅ Solo envía mensajes entre **6:00 AM - 10:00 PM** (hora Ecuador)
- ✅ Respeta el descanso de los usuarios
- ✅ Timezone configurado: `America/Guayaquil` (UTC-5)

### 🎯 Criterios de Detección
El sistema busca usuarios que cumplan TODOS estos criterios:
1. **Tiempo transcurrido**: 3-24 horas desde última interacción
2. **Agente activo**: Aurora (conversación de reservas) o Aluna (planes mensuales)
3. **Sin reserva confirmada**: No completaron el proceso
4. **Contexto relevante**: Tienen formulario parcial o confirmación pendiente

### 💬 Mensajes Personalizados
Los mensajes se adaptan según el contexto:

#### 📝 Con Confirmación Pendiente
```
¡Diego! 👋 Soy Aurora

Veo que quedamos en una reserva para *Hot Desk* el *2025-11-25* a las *14:00*.

¿Deseas confirmarla, modificarla o cancelarla? 😊
```

#### 📋 Con Formulario Parcial (tiene espacio, falta fecha)
```
¡Diego! 👋 Soy Aurora

Estábamos coordinando tu reserva para *Hot Desk*. ¿Te gustaría continuar? Puedo ayudarte a elegir fecha y hora 📅
```

#### 📅 Con Formulario Parcial (tiene fecha, falta hora)
```
¡Diego! 👋 Soy Aurora

Tenemos la fecha *2025-11-25* para tu *Hot Desk*. ¿Quieres que veamos los horarios disponibles? ⏰
```

#### 🤷 Sin Contexto Específico (Aurora)
```
¡Diego! 👋 Soy Aurora

Estábamos en el proceso de tu reserva. ¿Deseas continuar donde lo dejamos? 😊
```

#### 💼 Mensajes de Aluna (Planes Mensuales)

**Cuando mencionó Plan 10:**
```
¡Diego! 👋 Soy Aluna 💼

Estábamos conversando sobre el *Plan 10* (10 días/mes acceso a Hot Desk).

¿Te gustaría conocer más detalles o tienes alguna duda? Puedo ayudarte a encontrar el plan perfecto para ti 🚀
```

**Cuando mencionó Oficina Ejecutiva:**
```
¡Diego! 👋 Soy Aluna 💼

Estábamos viendo la *Oficina Ejecutiva* (espacio privado XL con acceso ilimitado).

¿Te interesa conocer más sobre este plan premium? 🚀
```

**Genérico Aluna:**
```
¡Diego! 👋 Soy Aluna 💼

Estábamos conversando sobre nuestros planes mensuales. ¿Te gustaría que retomemos la conversación?

Puedo ayudarte a encontrar el plan perfecto según tus necesidades 🚀
```

## 🔧 Arquitectura Técnica

### Archivos Involucrados

#### 1. `/src/servicios/follow-up-service.js`
Servicio principal con todas las funciones:
- `isWithinAllowedHours()` - Validación de horario
- `findAbandonedConversations()` - Búsqueda de usuarios
- `getUserConversationContext()` - Obtiene contexto del usuario
- `generateFollowUpMessage()` - Genera mensaje personalizado
- `sendFollowUpMessage()` - Envía via Wassenger
- `processFollowUps()` - Proceso principal

#### 2. `/src/servicios/cron-scheduler.js`
Tarea programada:
```javascript
// Cada hora en punto
'0 * * * *'
```

### 🗄️ Queries SQL

#### Buscar Conversaciones Abandonadas
```sql
SELECT DISTINCT 
  u.phone_number,
  u.name,
  u.active_agent,
  u.last_message_at
FROM users u
WHERE u.last_message_at < $1           -- Hace más de 3 horas
  AND u.last_message_at > $2           -- Menos de 24 horas
  AND u.active_agent = 'AURORA'        -- En proceso de reserva
  AND NOT EXISTS (
    SELECT 1 FROM reservations r 
    WHERE r.user_phone = u.phone_number 
    AND r.status = 'confirmed'
    AND r.created_at > u.last_message_at
  )
```

## 📊 Métricas y Logging

### Logs por Ejecución
```
[FOLLOW-UP] 🚀 Iniciando proceso de seguimiento automático...
[FOLLOW-UP] ⏰ Hora Ecuador: 14:35:22 - Permitido: true
[FOLLOW-UP] 🔍 Encontrados 5 usuarios con conversaciones abandonadas
[FOLLOW-UP] ✅ Mensaje enviado a +593987770788
[FOLLOW-UP] ⏭️ Saltando +593991234567 - sin contexto relevante
[FOLLOW-UP] 📊 Resumen: 3 enviados, 2 saltados de 5 encontrados
```

### Registro en Base de Datos
Cada follow-up se guarda en `interactions`:
```javascript
{
  agent: 'aurora',
  agent_name: 'Aurora',
  intent_reason: 'follow_up_automatic',
  output: 'Mensaje enviado...',
  meta: {
    role: 'assistant',
    automatic: true,
    followUp: true,
    timestamp: '2025-11-21T...'
  }
}
```

## 🚀 Ejecución

### Automática (Producción)
- ✅ Cada hora en punto
- ✅ Solo envía si está en horario permitido
- ✅ Máximo 50 usuarios por ejecución

### Manual (Testing)

#### Opción 1: Script de Test Completo
```bash
npm run test:followup
```

Este script ejecuta tests de:
- ✅ Verificación de horario permitido
- ✅ Búsqueda de conversaciones abandonadas
- ✅ Análisis de contexto por usuario
- ✅ Generación de mensajes personalizados
- ✅ Dry run del proceso completo

#### Opción 2: Ejecutar Proceso Directo
```javascript
import { processFollowUps } from './src/servicios/follow-up-service.js';

// Ejecutar una vez
const result = await processFollowUps();
console.log(result); // { processed: 5, sent: 3, skipped: 2 }
```

## ⚙️ Configuración

### Variables de Entorno Requeridas
```bash
WASSENGER_TOKEN=xxx
WASSENGER_DEVICE_ID=xxx
NODE_ENV=production
```

### Customización

#### Cambiar horario permitido (actualmente 6am-10pm)
```javascript
// En follow-up-service.js línea ~16
const isAllowed = hour >= 6 && hour < 22;
```

#### Cambiar ventana de tiempo (actualmente 3-24 horas)
```javascript
// En follow-up-service.js línea ~33
const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
```

#### Cambiar frecuencia del cron (actualmente cada hora)
```javascript
// En cron-scheduler.js
'0 * * * *'  // Cada hora
'0 */2 * * *'  // Cada 2 horas
'*/30 * * * *'  // Cada 30 minutos
```

## 🧪 Testing Local

### Forzar envío fuera de horario
```javascript
// Comentar temporalmente en follow-up-service.js
// if (!isWithinAllowedHours()) {
//   console.log('Fuera de horario...');
//   return;
// }
```

### Ver usuarios elegibles sin enviar
```javascript
import { findAbandonedConversations, getUserConversationContext } from './src/servicios/follow-up-service.js';

const users = await findAbandonedConversations();
for (const user of users) {
  const context = await getUserConversationContext(user.phone_number);
  console.log({
    user: user.name,
    phone: user.phone_number,
    hasContext: context.hasPartialForm || context.hasPendingConfirmation
  });
}
```

## 📈 Estadísticas Esperadas

En un coworkspace activo:
- **Tasa de abandono**: ~30-40% de conversaciones
- **Follow-ups enviados**: 5-15 por día
- **Tasa de respuesta**: ~25-35% responden tras follow-up
- **Conversiones**: ~10-15% completan reserva tras follow-up

## 🔒 Seguridad

- ✅ No envía mensajes duplicados (verifica `last_message_at`)
- ✅ Rate limiting: 2 segundos entre cada mensaje
- ✅ Máximo 50 usuarios por ejecución
- ✅ Solo a usuarios con contexto relevante
- ✅ Respeta horarios prudentes

## 🐛 Troubleshooting

### No se envían mensajes
1. Verificar horario Ecuador: `6am-10pm`
2. Verificar que existan usuarios elegibles
3. Revisar logs: `heroku logs --tail | grep FOLLOW-UP`
4. Verificar credenciales Wassenger

### Mensajes duplicados
- El sistema previene duplicados verificando `last_message_at`
- Si ocurre, revisar lógica de query SQL

### Errores de Wassenger
```
[FOLLOW-UP] ❌ Error enviando mensaje a +593xxx: Wassenger error: 429
```
- Solución: Aumentar delay entre mensajes (línea 242)

## 📝 Changelog

### v1.0.0 (2025-11-21)
- ✅ Sistema de follow-up automático
- ✅ Validación de horarios Ecuador
- ✅ Mensajes personalizados por contexto
- ✅ Integración con cron-scheduler
- ✅ Logging completo
- ✅ Rate limiting
