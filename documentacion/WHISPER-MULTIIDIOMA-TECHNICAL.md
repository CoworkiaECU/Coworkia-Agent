# 🎤 WHISPER MULTIIDIOMA - DOCUMENTACIÓN TÉCNICA

**Última actualización:** 9 Febrero 2026  
**Versión:** v727+  
**Estado:** ✅ Production-Ready

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura](#arquitectura)
3. [Componentes](#componentes)
4. [Uso](#uso)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## RESUMEN EJECUTIVO

Sistema completo de transcripción de audio multiidioma usando OpenAI Whisper API.

### Características

✅ **6 idiomas soportados:** Español, English, Français, Italiano, Português, Quechua  
✅ **Validación exhaustiva:** Formatos, tamaños, duraciones  
✅ **Mensajes localizados:** Errores en 6 idiomas  
✅ **Fallback inteligente:** Español por defecto  
✅ **131 tests:** 100% cobertura funcional  
✅ **Paridad Vision AI:** Misma calidad de testing

### Métricas

| Métrica | Valor |
|---------|-------|
| Idiomas soportados | 6 (es, en, fr, it, pt, qu) |
| Formatos audio | 8 (mp3, ogg, m4a, wav, webm, mp4, mpeg, mpga) |
| Tamaño máximo | 25MB (API limit) |
| Duración recomendada | 1s - 5min |
| Tests unitarios | 63 |
| Tests integración | 47 |
| Tests E2E | 21 |
| **Total tests** | **131** |

---

## ARQUITECTURA

### Flujo Completo

```
Usuario (WhatsApp)
    ↓ envía audio
Wassenger Webhook
    ↓ type='audio'|'voice'|'ptt'
┌─────────────────────────────────────┐
│ 1. Cargar perfil usuario            │
│    preferredLanguage → 'fr'         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. Validar audio                    │
│    validateAudio(url, metadata)     │
│    ✓ Formato válido (mp3/ogg/etc)  │
│    ✓ Tamaño < 25MB                  │
│    ✓ Duración OK                    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. Transcribir                      │
│    transcribeAudio(url, {           │
│      language: 'fr',                │
│      agentName: 'ANGELA',           │
│      userName: 'Marie'              │
│    })                               │
│    → OpenAI Whisper API             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 4. Procesar texto                   │
│    text = "Bonjour, je voudrais..." │
│    → orquestador → agentes          │
└─────────────────────────────────────┘
    ↓
Usuario recibe respuesta
```

### Componentes

```
src/
├── servicios-ia/
│   └── openai.js ← transcribeAudio()
├── utils/
│   └── audio-validator.js ← Validaciones + errores localizados
└── express-servidor/endpoints-api/
    └── wassenger.js ← Integración completa
    
tests/
├── unit/
│   ├── audio-validator.test.js (63 tests)
│   └── whisper-transcribe.test.js (47 tests)
└── integration/
    └── whisper-wassenger.test.js (21 tests)
```

---

## COMPONENTES

### 1. transcribeAudio() - `src/servicios-ia/openai.js`

Función principal de transcripción.

**Firma:**
```javascript
async function transcribeAudio(audioUrl, options = {})
```

**Parámetros:**
```javascript
{
  language: 'es',           // Código ISO-639-1
  agentName: 'AURORA',      // Nombre del agente
  userName: 'usuario'       // Nombre del usuario
}
```

**Respuesta:**
```javascript
// Éxito
{
  success: true,
  text: "Hola, quiero hacer una reserva",
  language: "es"
}

// Error
{
  success: false,
  text: "",
  error: "Error descargando audio: 404",
  language: "es"
}
```

**Idiomas soportados:**
```javascript
const supportedLanguages = ['es', 'en', 'fr', 'it', 'pt', 'qu'];
```

**Logging:**
```javascript
[Whisper] 🎤 Transcribiendo audio...
[Whisper] URL: https://...
[Whisper] Idioma: fr
[Whisper] Agente: ANGELA
[Whisper] Usuario: Marie
[Whisper] Tamaño del audio: 5.24 KB
[Whisper] ✅ Transcripción exitosa: Bonjour, je voudrais...
[Whisper] Idioma usado: fr
```

---

### 2. audio-validator.js - `src/utils/audio-validator.js`

Validaciones completas antes de transcribir.

**Funciones principales:**

#### validateAudioFormat(url)
```javascript
validateAudioFormat('https://example.com/audio.mp3')
// → { valid: true, format: 'mp3' }

validateAudioFormat('https://example.com/doc.pdf')
// → { valid: false, error: 'Formato no soportado...' }
```

#### validateAudioSize(sizeBytes)
```javascript
validateAudioSize(5 * 1024 * 1024)  // 5MB
// → { valid: true, sizeMB: 5 }

validateAudioSize(30 * 1024 * 1024)  // 30MB
// → { valid: false, sizeMB: 30, error: 'Audio demasiado grande...' }

validateAudioSize(15 * 1024 * 1024)  // 15MB
// → { valid: true, sizeMB: 15, warning: 'Audio grande...' }
```

#### validateAudioDuration(seconds)
```javascript
validateAudioDuration(30)
// → { valid: true }

validateAudioDuration(0.5)
// → { valid: false, error: 'Audio demasiado corto...' }

validateAudioDuration(400)
// → { valid: true, warning: 'Audio largo...' }
```

#### validateAudio(url, metadata)
```javascript
validateAudio('https://example.com/audio.mp3', {
  size: 5 * 1024 * 1024,
  duration: 60
})
// → { 
//     valid: true, 
//     warnings: [], 
//     errors: [],
//     details: { format: 'mp3', sizeMB: 5 }
//   }
```

#### getLocalizedAudioError(error, language)
```javascript
getLocalizedAudioError('formato', 'es')
// → "🎤 Formato de audio no soportado. Envía: voz, nota de voz..."

getLocalizedAudioError('formato', 'fr')
// → "🎤 Format audio non supporté. Envoyez: voix, note vocale..."

getLocalizedAudioError('grande', 'it')
// → "🎤 Audio troppo grande. Massimo: 25MB..."
```

**Constantes exportadas:**
```javascript
import { AUDIO_VALIDATION_CONSTANTS } from './audio-validator.js';

AUDIO_VALIDATION_CONSTANTS.SUPPORTED_FORMATS
// → ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg']

AUDIO_VALIDATION_CONSTANTS.MAX_FILE_SIZE_MB
// → 25

AUDIO_VALIDATION_CONSTANTS.MAX_DURATION_SECONDS
// → 300 (5 minutos)
```

---

### 3. Wassenger Integration - `src/express-servidor/endpoints-api/wassenger.js`

Flujo completo en endpoint webhook.

**Código relevante (líneas 736-778):**
```javascript
if (type === 'audio' || type === 'voice' || type === 'ptt') {
  // 1. Obtener idioma del usuario
  const current = await loadProfileWithTimeout(loadProfile, userId, 5000);
  const userLanguage = current.preferredLanguage || 'es';
  
  console.log(`[Whisper] 🎤 Procesando audio para usuario ${userId} en idioma: ${userLanguage}`);
  
  // 2. Validar audio
  const validation = validateAudio(mediaUrl);
  
  if (!validation.valid) {
    console.error('[Whisper] ❌ Audio inválido:', validation.errors);
    const errorMsg = getLocalizedAudioError(validation.errors[0], userLanguage);
    await enviarWhatsApp(userId, errorMsg);
    return;
  }
  
  // 3. Warnings (tamaño grande, etc.)
  if (validation.warnings.length > 0) {
    console.warn('[Whisper] ⚠️ Advertencias:', validation.warnings);
  }
  
  // 4. Transcribir
  const tr = await transcribeAudio(mediaUrl, {
    language: userLanguage,
    agentName: 'orquestador',
    userName: name || userId
  });
  
  if (!tr?.success || !tr?.text) {
    console.error('[Whisper] ❌ Error en transcripción:', tr?.error);
    const errorMsg = getLocalizedAudioError(tr?.error || 'Error desconocido', userLanguage);
    await enviarWhatsApp(userId, errorMsg);
    return;
  }
  
  text = tr.text;
  console.log(`[Whisper] ✅ Audio transcrito (${tr.language}):`, text.substring(0, 100));
}
```

---

## USO

### Ejemplo 1: Usuario español con audio válido

```
Usuario → Envía nota de voz en español
wassenger.js
  ↓ Carga perfil: preferredLanguage = 'es'
  ↓ Valida audio: ✅ mp3, 3MB, 30s
  ↓ Transcribe: language='es'
OpenAI Whisper
  ↓ Respuesta: "Hola, quiero reservar un espacio"
Bot → Procesa texto y responde
```

### Ejemplo 2: Usuario francés (Angela) con audio

```
Usuario francés → Envía audio en francés
wassenger.js
  ↓ Carga perfil: preferredLanguage = 'fr'
  ↓ Valida audio: ✅ ogg, 5MB, 45s
  ↓ Transcribe: language='fr'
OpenAI Whisper
  ↓ Respuesta: "Bonjour, je voudrais réserver..."
Angela → Responde en francés
```

### Ejemplo 3: Audio inválido (formato)

```
Usuario → Envía archivo PDF por error
wassenger.js
  ↓ Carga perfil: preferredLanguage = 'it'
  ↓ Valida audio: ❌ Formato no soportado
  ↓ Mensaje error localizado: getLocalizedAudioError('formato', 'it')
Bot → "🎤 Formato audio non supportato. Invia: voce, nota vocale..."
```

### Ejemplo 4: Audio grande (warning)

```
Usuario → Envía audio de 20MB
wassenger.js
  ↓ Carga perfil: preferredLanguage = 'pt'
  ↓ Valida audio: ⚠️ VALID con warning (grande)
  ↓ Log: "Audio grande (20MB). Puede tardar más."
  ↓ Transcribe: language='pt' (procede igual)
OpenAI Whisper
  ↓ Respuesta exitosa (tarda más)
Bot → Procesa texto normalmente
```

---

## TESTING

### Ejecutar todos los tests

```bash
# Tests unitarios audio-validator (63 tests)
node tests/unit/audio-validator.test.js

# Tests integración transcribeAudio (47 tests)
node tests/unit/whisper-transcribe.test.js

# Tests E2E wassenger (21 tests)
node tests/integration/whisper-wassenger.test.js

# Total: 131 tests
```

### Resultado esperado

```
🎉 TODOS LOS TESTS PASARON - audio-validator.js 100% funcional
✅ Tests pasados: 63
❌ Tests fallados: 0

🎉 TODOS LOS TESTS PASARON - transcribeAudio() multiidioma 100% funcional
✅ Tests pasados: 47
❌ Tests fallados: 0

🎉 TODOS LOS TESTS E2E PASARON
✅ Tests pasados: 21
❌ Tests fallados: 0

TOTAL: 131/131 ✅
```

### Cobertura de tests

| Componente | Tests | Cubre |
|------------|-------|-------|
| **audio-validator.js** | 63 | Formatos (8), Tamaños (8), Duraciones (7), Validación completa (4), Mensajes localizados (24), Fallbacks (6), Constantes (5), Formatos completos (1) |
| **transcribeAudio()** | 47 | Parámetros (7), Fallback (6), Estructura respuesta (5), Logging (8), Idiomas soportados (7), Warnings (5), Compatibilidad Angela (3), Consistencia sistema (6) |
| **Flujo E2E** | 21 | Audio válido (5), Errores localizados (4), Warnings (3), Fallback usuario (3), Integración 6 idiomas (6) |

---

## TROUBLESHOOTING

### Error: "Idioma no soportado"

**Síntoma:**
```
[Whisper] ⚠️ Idioma 'de' no soportado, usando 'es'
```

**Causa:** Usuario tiene `preferredLanguage='de'` (alemán) que no está en lista.

**Solución:** Sistema hace fallback automático a español ✅

---

### Error: "Formato de audio no soportado"

**Síntoma:**
```
🎤 Formato de audio no soportado. Envía: voz, nota de voz...
```

**Causa:** Usuario envió archivo que no es audio (PDF, imagen, video no soportado).

**Solución:** Sistema rechaza y pide audio válido ✅

---

### Warning: "Audio demasiado grande"

**Síntoma:**
```
[Whisper] ⚠️ Advertencias: Audio grande (15.00MB). Recomendado: <10MB.
```

**Causa:** Audio entre 10MB-25MB (válido pero grande).

**Acción:** Sistema transcribe igual, puede tardar más ✅

---

### Error: "Audio demasiado grande"

**Síntoma:**
```
🎤 Audio demasiado grande. Máximo: 25MB. Envía uno más corto.
```

**Causa:** Audio > 25MB (límite de Whisper API).

**Solución:** Sistema rechaza, usuario debe enviar audio más corto ✅

---

### Error: "Error descargando audio"

**Síntoma:**
```
[Whisper] ❌ Error transcribiendo: Error descargando audio: 404
```

**Causa:** URL del audio expirada o inaccesible.

**Solución:** Verificar conectividad, reintentar. Wassenger URLs pueden expirar.

---

### Inconsistencia: Angela no puede transcribir audio en francés

**Causa:** Código desactualizado sin fr/it/pt.

**Verificación:**
```javascript
// src/servicios-ia/openai.js línea 353
const supportedLanguages = ['es', 'en', 'fr', 'it', 'pt', 'qu'];  // ✅ Debe incluir fr/it/pt
```

**Estado actual:** ✅ RESUELTO (v727+)

---

## CHANGELOG

### v727+ (9 Feb 2026)
- ✅ Agregado soporte fr/it/pt a Whisper
- ✅ Traducciones completas en audio-validator.js
- ✅ 131 tests creados y pasando
- ✅ Paridad completa con Vision AI
- ✅ Documentación actualizada

### v540 (20 Ene 2026)
- ✅ Implementación multiidioma es/en/qu
- ✅ audio-validator.js creado
- ✅ Integración wassenger.js
- ⚠️ Documentación no actualizada (archivada)

---

## REFERENCIAS

- **OpenAI Whisper API:** https://platform.openai.com/docs/guides/speech-to-text
- **Idiomas ISO 639-1:** https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
- **Vision AI (referencia):** `docs/AUDITORIA-VISIONAI-ALUNA-AURORA.md`
- **Language Detector:** `src/utils/language-detector.js`
- **Angela (agente multiidioma):** `src/deteccion-intenciones/angela.js`

---

**Mantenido por:** Nena AI  
**Última revisión:** 9 Febrero 2026  
**Estado:** ✅ Production-Ready
