# 🎯 Tests Unitarios vs Tests de Integración Real

**Fecha:** 14 febrero 2026  
**Contexto:** Whisper tests pasaban (4/4 PASS) pero producción fallaba con error 500

---

## 🤔 El Problema

```plaintext
✅ Tests: 49+ tests PASS
❌ Producción: Error 500 de Wassenger API después de 100 segundos
```

**Pregunta:** ¿Por qué pasan los tests si no funciona en producción?

---

## 📊 Tipos de Tests en el Proyecto

### 1️⃣ **Tests Unitarios** (lo que tenemos)

**Ubicación:** `tests/unit/`

**Qué hacen:**
- ✅ Validan LÓGICA interna del código
- ✅ Verifican selección de idiomas correcta
- ✅ Comprueban mensajes de error localizados
- ✅ Testean flujo de la aplicación

**Qué NO hacen:**
- ❌ NO llaman APIs externas reales
- ❌ NO descargan archivos reales
- ❌ NO esperan timeouts reales
- ❌ NO detectan errores 500 de servicios externos

**Ejemplo real del código:**
```javascript
// tests/unit/whisper-transcribe.test.js
const parameterTests = [
  {
    name: 'Con idioma español',
    audioUrl: 'https://example.com/audio.mp3', // ← URL FAKE
    options: { language: 'es' },
    expectedLanguage: 'es'
  }
];

// Solo valida: ¿se selecciona 'es' correctamente?
const whisperLanguage = supportedLanguages.includes(language) ? language : 'es';
expect(whisperLanguage).toBe('es'); // ✅ PASS
```

---

### 2️⃣ **Tests de Integración** (simulated)

**Ubicación:** `tests/integration/`

**Qué hacen:**
- ✅ Validan flujo COMPLETO de la aplicación
- ✅ Verifican integración entre módulos internos
- ✅ Comprueban que audio-validator → transcribeAudio → wassenger funciona

**Qué NO hacen:**
- ❌ NO usan APIs externas reales
- ❌ Usan MOCKS y datos simulados

**Ejemplo real:**
```javascript
// tests/integration/whisper-wassenger.test.js
/**
 * NOTA: Tests simulados del flujo completo
 * Validan integración entre audio-validator, transcribeAudio y wassenger
 */

const successFlows = [
  {
    mediaUrl: 'https://example.com/audio.mp3', // ← URL FAKE
    userLanguage: 'es',
    metadata: { size: 5 * 1024 * 1024 }, // ← Datos SIMULADOS
  }
];

// Valida flujo lógico, NO API real
const validation = validateAudio(flow.mediaUrl, flow.metadata);
const transcriptionLanguage = supportedLanguages.includes(flow.userLanguage) 
  ? flow.userLanguage : 'es';
  
expect(validation.valid).toBe(true); // ✅ PASS (pero API podría fallar)
```

---

### 3️⃣ **Tests de Integración REALES** (nuevo: v766)

**Ubicación:** `tests/integration/whisper-real-api.test.js`

**Qué hacen:**
- ✅ Llaman Wassenger API REAL
- ✅ Descargan audio REAL
- ✅ Esperan timeouts REALES (30-90 segundos)
- ✅ Detectan error 500 de Wassenger
- ✅ Miden tiempo real de respuesta

**Cómo ejecutarlos:**
```bash
# Con URL de audio real de los logs
TEST_AUDIO_URL="https://api.wassenger.com/..." \
REAL_API_TESTS=true \
npm test -- tests/integration/whisper-real-api.test.js
```

**Ejemplo real:**
```javascript
// tests/integration/whisper-real-api.test.js
test('Debería descargar audio con WASSENGER_API_KEY', async () => {
  const REAL_AUDIO_URL = process.env.TEST_AUDIO_URL; // ← URL REAL de logs
  
  const response = await fetch(REAL_AUDIO_URL, {
    headers: {
      'Authorization': `Bearer ${WASSENGER_API_KEY}` // ← KEY REAL
    },
    signal: AbortSignal.timeout(30000) // ← TIMEOUT REAL
  });
  
  if (response.ok) {
    const buffer = await response.arrayBuffer(); // ← DESCARGA REAL
    console.log(`✅ ${buffer.byteLength} bytes`);
  } else {
    // ❌ AQUÍ detectaría el error 500 de Wassenger
    console.log(`❌ Error ${response.status}`);
  }
}, 35000);
```

---

## 🎓 Por qué existe esta diferencia

### **Tests Unitarios/Simulados:**

**Ventajas:**
- ⚡ Rápidos (1-2 segundos total)
- 💰 Gratis (no consumen APIs de pago)
- 🔄 Se pueden ejecutar miles de veces sin costo
- ✅ Detectan bugs en TU código

**Limitaciones:**
- ❌ NO detectan problemas con servicios externos
- ❌ NO detectan cambios en APIs de terceros
- ❌ NO detectan problemas de red/timeout

### **Tests de Integración Reales:**

**Ventajas:**
- ✅ Detectan problemas REALES en producción
- ✅ Validan que APIs externas funcionan
- ✅ Miden performance real

**Limitaciones:**
- ⏱️ Lentos (30-90 segundos por test)
- 💰 Consumen cuota de OpenAI API ($$$)
- 🚫 NO se pueden ejecutar en CI/CD automáticamente
- ⚠️ Dependen de servicios externos (pueden fallar incluso si tu código está bien)

---

## 📋 Cuándo usar cada tipo

### Tests Unitarios/Simulados (siempre):
```bash
npm test  # Durante desarrollo, pre-commit, CI/CD
```

**Úsalos para:**
- Verificar cambios de código no rompan nada
- TDD (Test Driven Development)
- Refactoring seguro

### Tests de Integración Reales (ocasional):
```bash
TEST_AUDIO_URL="..." REAL_API_TESTS=true npm test -- whisper-real-api.test.js
```

**Úsalos cuando:**
- ✅ Producción reporta error pero tests unitarios pasan
- ✅ Sospecha de problema con API externa
- ✅ Cambio en configuración de API keys
- ✅ Actualización de dependencias externas
- ✅ Debugging de error 500, timeouts, etc.

---

## 🐛 Caso de Estudio: Error 500 Wassenger

### **Situación:**
```
✅ Tests unitarios: 4/4 PASS (49+ tests)
❌ Producción: Error 500 después de 100 segundos
```

### **Por qué pasaron los tests:**
```javascript
// Tests validaban LÓGICA
audioUrl = 'https://example.com/audio.mp3' // ← URL fake
expect(validateAudio(audioUrl).valid).toBe(true) // ✅ PASS

// Producción usaba URL REAL
audioUrl = 'https://api.wassenger.com/v1/chat/.../download'
fetch(audioUrl) → espera 100s → Error 500 // ❌ FALLA
```

### **Cómo detectarlo con tests reales:**
```javascript
// tests/integration/whisper-real-api.test.js
const response = await fetch(REAL_WASSENGER_URL, {
  headers: { 'Authorization': `Bearer ${WASSENGER_API_KEY}` }
});

// ❌ Este test fallaría con error 500
expect(response.ok).toBe(true); // FAIL: status 500
```

---

## 💡 Lecciones Aprendidas

1. **Tests unitarios NO reemplazan tests de integración**
   - Validan TU código funciona correctamente
   - NO validan que servicios externos funcionen

2. **APIs externas pueden fallar independientemente de tu código**
   - Wassenger error 500 → problema de ELLOS, no tuyo
   - Tests reales lo detectan, tests unitarios NO

3. **Balance costo/beneficio:**
   - Tests unitarios: Ejecutar siempre (rápido, gratis)
   - Tests reales: Ejecutar solo cuando se sospecha problema externo

4. **Documentación es crítica:**
   - Tests deben indicar claramente si son simulados o reales
   - Comentarios como "NOTA: Tests simulados" son esenciales

---

## 🛠️ Estrategia Recomendada

### **Desarrollo normal:**
```bash
# CI/CD, pre-commit, desarrollo
npm test  # Solo tests unitarios/simulados
```

### **Debugging producción:**
```bash
# 1. Obtener URL real de logs
heroku logs --num 50 | grep mediaUrl

# 2. Ejecutar test real
TEST_AUDIO_URL="<URL-real>" REAL_API_TESTS=true npm test -- whisper-real-api.test.js

# 3. Si falla: problema con API externa (Wassenger/OpenAI)
# 4. Si pasa: problema con configuración/código de producción
```

---

## 📚 Referencias

- Tests unitarios: `tests/unit/whisper-*.test.js`
- Tests integración simulados: `tests/integration/whisper-wassenger.test.js`
- Tests integración reales: `tests/integration/whisper-real-api.test.js`
- Documentación Wassenger API: https://wassenger.com/docs
- OpenAI Whisper API: https://platform.openai.com/docs/api-reference/audio

---

**Conclusión:** Tests unitarios validan TU código. Tests de integración reales validan que el MUNDO EXTERNO funciona. Necesitas ambos, pero úsalos inteligentemente según el contexto.
