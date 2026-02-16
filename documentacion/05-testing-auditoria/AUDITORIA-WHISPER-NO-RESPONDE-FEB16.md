# 🔍 AUDITORÍA COMPLETA: Sistema Whisper - No Responde a Mensajes de Voz

**Fecha:** 16 febrero 2026  
**Versión en producción:** v768 (deployed 14 feb 2026)  
**Síntoma:** Sistema no responde cuando usuario envía mensaje de voz

---

## 📊 HALLAZGOS DE LA AUDITORÍA

### ✅ **LO QUE FUNCIONA:**

1. **Estructura HTTP del webhook:**
   - ✅ Responde inmediatamente con `res.json({ ok: true, processing: 'async' })` (línea 979)
   - ✅ Procesa en background con `setImmediate()` (línea 982)
   - ✅ Evita timeouts de Wassenger

2. **Detección de audio:**
   - ✅ Detecta tipos: `audio`, `voice`, `ptt` (línea 1067)
   - ✅ Obtiene perfil y idioma del usuario (líneas 1069-1071)

3. **Fallbacks implementados:**
   - ✅ Sin URL: Envía mensaje y hace return (líneas 1075-1097)
   - ✅ Validación falla: Envía error y hace return (líneas 1118-1126)  
   - ✅ Transcripción falla: Envía error y hace return (líneas 1152-1159)

---

## 🐛 **PROBLEMA IDENTIFICADO:**

### **Caso de TRANSCRIPCIÓN EXITOSA:**

```javascript
// Línea 1155-1159
} else {
  // Transcripción exitosa
  text = tr.text;
  console.log(`[Whisper] ✅ Audio transcrito (${tr.language}):`, text.substring(0, 100));
}
```

**¿Qué pasa después?**

```javascript
// Línea 1163: Se cierra bloque if (userSentAudio)
}

// Línea 1165: Continúa flujo normal
const envelope = buildMessageEnvelope({ userId, name, text, type, mediaUrl, data, evt });

// Línea 1169: Carga historial
let conversationHistory = await loadConversationHistory(userId, 10).catch(() => []);

// ... CONTINUA procesamiento con Aurora
```

**✅ EL FLUJO CONTINÚA CORRECTAMENTE** cuando la transcripción es exitosa.

---

## 🔬 **POSIBLES CAUSAS DEL PROBLEMA:**

### **1. Wassenger API sigue fallando (MÁS PROBABLE)**

**Evidencia:**
- v765: Timeout reducido de 120s → 30s
- v768: Fallbacks devuelven mensaje y salen
- Si Wassenger falla con error 500, el fallback se activa → usuario recibe "No pude procesar tu audio"

**Verificación necesaria:**
```bash
# Ver si hay logs de fallback
heroku logs --tail | grep "Fallback activado"

# Ver si hay errores de transcripción
heroku logs --tail | grep "Error en transcripción"
```

**Diagnóstico:**
- Si logs muestran "Fallback activado": Wassenger API **sigue fallando**
- Usuario debería recibir mensaje de error, pero dice "no responde"

---

### **2. Deduplicación bloqueando mensajes (MENOS PROBABLE)**

**Código v767:**
```javascript
// Línea 995-1005
if (isDuplicateMessage(messageId)) {
  console.log(`[DEDUP] ⏭️ Ignorando webhook duplicado`);
  return;
}

if (isEchoMessage(userId, text)) {
  console.log(`[DEDUP] 🔁 Ignorando eco`);
  return;
}
```

**Problema potencial:**
- Si messageId se repite incorrectamente
- Si el cache de deduplicación tiene un bug

**Verificación:**
```bash
heroku logs --tail | grep "DEDUP"
# Si aparece "Ignorando webhook duplicado" o "Ignorando eco" → bug de deduplicación
```

---

### **3. Error silencioso en transcribeAudio() (POSIBLE)**

**Línea 1142-1150:**
```javascript
try {
  tr = await transcribeAudio(mediaUrl, {
    language: userLanguage,
    agentName: 'orquestador',
    userName: name || userId
  });
} catch (error) {
  tr = { success: false, error: error.message || 'Error desconocido' };
}
```

**Problema potencial:**
- `transcribeAudio()` podría estar lanzando una excepción no capturada
- `transcribeAudio()` podría estar colgándose (timeout infinito)
- Error en línea 1152 no detectado

**Verificación:**
```javascript
// Revisar src/servicios-ia/openai.js
// Buscar si hay timeouts configurados
// Verificar si hay try/catch adecuados
```

---

### **4. buildMediaUrl() retorna null (POSIBLE)**

**Si `mediaUrl` es null:**
```javascript
// Línea 1075
if (!mediaUrl) {
  // ... envía fallback y hace return
  return;
}
```

**Pero usuario dice "no responde"**, no dice "recibí mensaje de error".

**Verificación:**
```bash
heroku logs --tail | grep "No se encontró URL de audio"
# Si aparece → problema con buildMediaUrl()
```

---

### **5. Webhook nunca llega (POCO PROBABLE)**

**Posibles causas:**
- Wassenger no está enviando webhooks
- Firewall/proxy bloqueando
- Rate limiting bloqueando usuario

**Verificación:**
```bash
heroku logs --tail | grep "Processing incoming message"
# Si NO aparece → webhook no llega
```

---

## 🎯 **PLAN DE DIAGNÓSTICO:**

### **Paso 1: Verificar si webhook llega**
```bash
heroku logs --app coworkia-agent --tail | grep -E "Processing incoming|type.*audio|voice|ptt"
```

**Esperado:** Ver `[INFO] [WEBHOOK] [user=+593...] Processing incoming message`

---

### **Paso 2: Verificar si audio se procesa**
```bash
heroku logs --app coworkia-agent --tail | grep -E "Whisper|🎤|Procesando audio|Fallback"
```

**Esperado:** 
- `[Whisper] 🎤 Procesando audio para usuario +593...`
- O: `[Whisper] 🔄 Fallback activado`

---

### **Paso 3: Verificar si hay errores**
```bash
heroku logs --app coworkia-agent --tail | grep -E "ERROR|❌|Error|Exception"
```

**Esperado:** Ningún error, o errores específicos de Wassenger API

---

### **Paso 4: Verificar deduplicación**
```bash
heroku logs --app coworkia-agent --tail | grep "DEDUP"
```

**Esperado:** Ver registros normales, NO "Ignorando webhook duplicado"

---

### **Paso 5: Simular audio con logs habilitados**
```bash
# Activar debug mode
heroku config:set DEBUG_MODE=true --app coworkia-agent

# Enviar audio de prueba
# [Usuario envía audio por WhatsApp]

# Ver logs completos
heroku logs --app coworkia-agent --tail

# Desactivar debug
heroku config:unset DEBUG_MODE --app coworkia-agent
```

---

## 🔧 **FIXES POTENCIALES:**

### **Fix 1: Si Wassenger sigue fallando**
```javascript
// Cambiar timeout de 30s a 45s o 60s
// O: Implementar retry con backoff exponencial
// Archivo: src/servicios-ia/openai.js
```

### **Fix 2: Si deduplicación está bloqueando**
```javascript
// Agregar TTL más corto (30s en vez de 60s)
// O: Agregar logs más detallados
// Archivo: src/express-servidor/endpoints-api/wassenger.js líneas 129-165
```

### **Fix 3: Si transcribeAudio() se cuelga**
```javascript
// Agregar timeout explícito con Promise.race()
const transcriptionPromise = transcribeAudio(...);
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Transcription timeout')), 45000)
);
tr = await Promise.race([transcriptionPromise, timeoutPromise]);
```

### **Fix 4: Si buildMediaUrl() falla silenciosamente**
```javascript
// Agregar logs antes de validar mediaUrl
console.log('[Whisper] 📋 Media URL:', mediaUrl);
console.log('[Whisper] 📋 data.media:', data.media);
```

---

## 📝 **CHECKLIST DE VERIFICACIÓN:**

- [ ] Webhook llega al servidor
- [ ] Audio se detecta correctamente (type=audio/voice/ppt)
- [ ] mediaUrl se construye correctamente
- [ ] Validación de audio pasa
- [ ] transcribeAudio() se ejecuta sin errores
- [ ] Texto se extrae correctamente
- [ ] Aurora procesa el texto
- [ ] Respuesta se envía al usuario
- [ ] Deduplicación NO está bloqueando
- [ ] No hay errores en logs

---

## 🚨 **ACCIÓN INMEDIATA REQUERIDA:**

**Ejecutar en terminal:**
```bash
# 1. Ver estado de dynos
heroku ps --app coworkia-agent

# 2. Ver últimos logs (sin auth issues)
heroku logs --app coworkia-agent --num 100 --no-color > /tmp/heroku-logs.txt
cat /tmp/heroku-logs.txt | grep -E "audio|voice|Whisper" -i

# 3. Ver versión deployed
git log --oneline -5
```

**Solicitar al usuario:**
1. ¿Cuándo enviaste el audio? (hora exacta)
2. ¿Recibiste ALGÚN mensaje de error?
3. ¿O simplemente no hubo ninguna respuesta?
4. ¿Era un audio corto (< 10s) o largo?

---

## 🎓 **CONCLUSIÓN PRELIMINAR:**

El código tiene la lógica correcta:
- ✅ Fallbacks implementados con `return`
- ✅ Flujo continúa cuando transcripción exitosa
- ✅ Estructura HTTP adecuada

**Problema más probable:** Wassenger API rechazando descargas (error 500) pero usuario no recibiendo mensaje de fallback.

**Próximo paso:** Ver logs en tiempo real mientras usuario envía audio.
