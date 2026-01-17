# 🔍 AUDITORÍA DE CHAT - Reporte

**Fecha:** 2026-01-17  
**Usuario:** +593 99 483 7117  
**Conversación analizada:** Screenshots del chat

---

## 📋 PROBLEMAS DETECTADOS

### 1️⃣ **PROBLEMA CRÍTICO: Detección errónea de intención**

**QUÉ PASÓ:**
- Usuario envía: `"¡Hola Coworkia! quiero probar el servicio ☕"`
- Sistema activa: **PAULA** (bienes raíces)
- Debería activar: **AURORA** (coworking)

**CAUSA:**
- El mensaje NO contiene keywords de Paula:
  - ❌ No menciona: casa, propiedad, bienes raíces, Ecuador, etc.
  - ✅ Menciona: "Coworkia" (servicio de coworking)
- Paula NO debería activarse sin keywords explícitas

**EVIDENCIA EN CÓDIGO:**
```javascript
// detectar-intencion.js línea ~420
// Paula requiere keywords PROPERTY (obligatorio) + LOCATION (opcional)
const PAULA_PROPERTY_KEYWORDS = [
  'bienes raices', 'casa', 'departamento', 'propiedad', etc.
];

// El mensaje "Coworkia servicio" NO matchea ningún keyword de Paula
```

**HIPÓTESIS:**
1. OpenAI interpretó "servicio" como consulta de propiedades (error del LLM)
2. Hay un problema en el orquestador que no respeta activeAgent
3. El perfil del usuario tiene activeAgent='PAULA' guardado de sesión anterior

---

### 2️⃣ **PROBLEMA: Handoff en inglés cuando usuario habla español**

**QUÉ PASÓ:**
- Usuario escribe: `@aurora` (en español)
- Aurora responde: `"Paula, I'm leaving you to chat with Diego who's looking for a property."`
- Mensaje en **INGLÉS** cuando debería ser español

**CAUSA:**
El handoff usa `userLanguage` del perfil:
```javascript
// wassenger.js línea ~834
const userLanguage = profile.preferredLanguage || 'es';
const handoffMessages = getHandoffMessages(fromAgent, targetAgent, userName, userLanguage);
```

**HIPÓTESIS:**
- El perfil tiene `preferredLanguage = 'en'` guardado
- Esto hace que TODOS los mensajes (incluyendo handoffs) sean en inglés

---

### 3️⃣ **PROBLEMA: Nombre incorrecto "Diego"**

**QUÉ PASÓ:**
- Paula saluda: `"¡Hola Diego!"`
- El número pertenece a "Administrador/a" (según usuario)

**CAUSA:**
```javascript
// wassenger.js línea ~551-580
let detectedName = null;

// 1️⃣ PRIORIDAD: Nombre de WhatsApp
if (name) {
  detectedName = cleanWhatsAppName(name);
}
// 2️⃣ FALLBACK: Nombre en BD
else if (current.name) {
  detectedName = current.name;
}
```

**HIPÓTESIS:**
1. La BD tiene `name = 'Diego'` guardado de sesión anterior
2. WhatsApp está enviando `name = 'Diego'` como nombre del contacto
3. El contacto en el teléfono del bot está guardado como "Diego"

---

### 4️⃣ **PROBLEMA: Paula no hace handoff a Aurora**

**QUÉ PASÓ:**
- Paula dice: `"para consultas sobre el servicio de Coworkia, te recomiendo que hables directamente con el equipo de atención al cliente"`
- Pero NO activa handoff a Aurora automáticamente

**CAUSA:**
Paula está diseñada SOLO para bienes raíces. Cuando detecta que el usuario quiere Coworkia:
- ❌ NO tiene lógica para hacer handoff automático
- ✅ Sugiere contactar a "equipo de atención" (pero no conecta)

**DEBERÍA:**
Paula detecta intención de Coworkia → Activa handoff a Aurora

---

## 🔬 ANÁLISIS TÉCNICO

### Flujo esperado vs. Flujo real

**FLUJO ESPERADO:**
```
Usuario: "Hola Coworkia quiero probar servicio"
  ↓
detectarIntencion() → NO keywords de Paula → agent: 'AURORA'
  ↓
orquestador.js → activeAgent = 'AURORA'
  ↓
Aurora responde: "Hola! Soy Aurora de Coworkia..."
```

**FLUJO REAL:**
```
Usuario: "Hola Coworkia quiero probar servicio"
  ↓
detectarIntencion() → ??? → agent: 'PAULA' ❌
  ↓
orquestador.js → activeAgent = 'PAULA'
  ↓
Paula responde: "Hola Diego! Mi especialidad es bienes raíces..."
```

---

## 🎯 ACCIONES CORRECTIVAS REQUERIDAS

### **URGENTE (Deploy inmediato):**

1. **Verificar perfil en BD del usuario +593994837117**
   ```bash
   heroku run "node scripts/testing/debug-user-profile.js +593994837117" -a coworkia-agent
   ```
   
   Verificar:
   - ✅ `name` → ¿Dice "Diego"?
   - ✅ `preferred_language` → ¿Dice "en"?
   - ✅ `active_agent` → ¿Dice "PAULA"?

2. **Limpiar perfil corrupto:**
   ```sql
   UPDATE users 
   SET 
     name = NULL,
     active_agent = 'AURORA',
     preferred_language = 'es'
   WHERE phone_number = '+593994837117';
   ```

### **IMPORTANTE (Próximo sprint):**

3. **Mejorar detección de intención para Paula:**
   - Paula SOLO se activa con @paula explícito o keywords PROPERTY + LOCATION
   - Agregar validación estricta: sin keywords → NO activar Paula

4. **Agregar handoff inteligente en Paula:**
   - Si usuario menciona "Coworkia" o keywords de coworking → Handoff automático a Aurora
   - Mensaje: "Te conecto con Aurora para ayudarte con Coworkia"

5. **Validar idioma en handoffs:**
   - Siempre verificar preferredLanguage antes de handoff
   - Agregar log: `[HANDOFF] userLanguage: ${userLanguage}`

6. **Agregar sanitización de perfil en cada mensaje:**
   - Si activeAgent no es válido → Reset a AURORA
   - Si preferredLanguage no es válido → Reset a 'es'
   - Log de correcciones automáticas

---

## 📊 IMPACTO

**Severidad:** 🔴 ALTA  
**Usuarios afectados:** Todos los que tienen perfil corrupto en BD  
**Frecuencia:** Ocasional (depende de sesiones previas)

**Experiencia del usuario:**
- ❌ Recibe respuestas del agente incorrecto
- ❌ Mensajes en idioma incorrecto
- ❌ Nombre incorrecto en saludos
- ❌ No puede acceder al servicio real que busca (Coworkia)

---

## ✅ VALIDACIÓN POST-FIX

Después de implementar correcciones:

1. **Test E2E:**
   ```
   Usuario nuevo → "Hola Coworkia"
   Esperado: Aurora responde en español con nombre correcto
   ```

2. **Test Handoff:**
   ```
   Usuario en Paula → "@aurora"
   Esperado: Handoff en español, Aurora saluda
   ```

3. **Test Perfil corrupto:**
   ```
   Usuario con active_agent='PAULA' → Mensaje genérico
   Esperado: Sistema corrige a AURORA automáticamente
   ```

4. **Test Idioma:**
   ```
   Usuario con preferred_language='en' → Escribe en español
   Esperado: Sistema detecta y cambia a 'es'
   ```

---

**Auditoría completada por:** GitHub Copilot  
**Próximos pasos:** Ejecutar debug script en producción para confirmar hipótesis
