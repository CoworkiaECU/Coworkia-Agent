# 🎤 AUDITORÍA COMPLETA: WHISPER MULTIIDIOMA

**Fecha:** 20 Enero 2026  
**Versión actual:** Heroku v540  
**Alcance:** Sistema de transcripción de audio con soporte multiidioma  
**Objetivo:** Implementación impecable similar a Vision AI

---

## 📋 ÍNDICE

1. [Estado Actual del Sistema](#1-estado-actual-del-sistema)
2. [Análisis de Código](#2-análisis-de-código)
3. [Gaps Identificados](#3-gaps-identificados)
4. [Plan de Implementación](#4-plan-de-implementación)
5. [Definición de Tests](#5-definición-de-tests)
6. [Métricas de Éxito](#6-métricas-de-éxito)

---

## 1. ESTADO ACTUAL DEL SISTEMA

### 1.1 Arquitectura Actual

```
Usuario (WhatsApp) → Wassenger Webhook → transcribeAudio() → OpenAI Whisper API
                                              ↓
                                         text (español hardcoded)
                                              ↓
                                    procesarMensaje() → Agentes
```

### 1.2 Implementación Actual

**Ubicación:** `src/servicios-ia/openai.js` (líneas 284-323)

```javascript
export async function transcribeAudio(audioUrl) {
  // ...
  const transcription = await client.audio.transcriptions.create({
    file: audioBlob,
    model: 'whisper-1',
    language: 'es', // ⚠️ HARDCODED - Siempre español
    response_format: 'text'
  });
  // ...
}
```

**Llamada en wassenger.js** (línea 480):
```javascript
const tr = await transcribeAudio(mediaUrl);
```

### 1.3 Limitaciones Actuales

❌ **Idioma hardcoded a español** - No detecta idioma del usuario  
❌ **Sin contexto de usuario** - No recibe `userLanguage` del perfil  
❌ **Sin tests unitarios** - Cero cobertura de testing  
❌ **Sin manejo de formatos** - Solo procesa audio/ogg  
❌ **Sin validaciones** - No valida tamaño/duración del audio  
❌ **Mensaje de error genérico** - No distingue tipos de error  
❌ **Sin logging estructurado** - Logs básicos sin métricas  
❌ **Sin documentación** - No hay doc técnica

---

## 2. ANÁLISIS DE CÓDIGO

### 2.1 Flujo Actual

#### Wassenger.js (líneas 478-486)
```javascript
// 🎤 Voz → transcribir
if (type === 'audio' || type === 'voice' || type === 'ptt') {
  if (!mediaUrl) return;
  const tr = await transcribeAudio(mediaUrl); // ⚠️ Sin parámetros extras
  if (!tr?.success || !tr?.text) {
    await enviarWhatsApp(userId, '🎤 No pude procesar tu audio. ¿Puedes escribirlo por texto? 😊');
    return;
  }
  text = tr.text;
}
```

**Problemas:**
1. No pasa `userId` ni `userLanguage` a `transcribeAudio()`
2. Mensaje de error en español hardcoded
3. No distingue entre errores de red, formato, o API

### 2.2 OpenAI.js - transcribeAudio()

**Parámetros actuales:**
- `audioUrl` (string) - Único parámetro

**Parámetros faltantes:**
- ❌ `language` (string) - Idioma del audio
- ❌ `userId` (string) - Para logging/tracking
- ❌ `agentName` (string) - Contexto del agente

**Whisper API soporta:**
- ✅ `language` - ISO-639-1 (es, en, fr, it, pt, etc.)
- ✅ `prompt` - Contexto para mejorar transcripción
- ✅ `temperature` - Control de aleatoriedad (0-1)
- ✅ `response_format` - text | json | srt | vtt

### 2.3 Comparación con Vision AI

| Aspecto | Vision AI | Whisper Actual | Gap |
|---------|-----------|----------------|-----|
| **Multiidioma** | ✅ Todos los agentes | ❌ Solo español | CRÍTICO |
| **Tests unitarios** | ✅ 49 tests | ❌ 0 tests | CRÍTICO |
| **Manejo errores** | ✅ Detallado | ⚠️ Básico | ALTO |
| **Logging** | ✅ Estructurado | ⚠️ Básico | MEDIO |
| **Documentación** | ✅ Completa | ❌ Ninguna | ALTO |
| **Validaciones** | ✅ Múltiples | ❌ Ninguna | ALTO |
| **Context awareness** | ✅ Agente-específico | ❌ Genérico | MEDIO |

---

## 3. GAPS IDENTIFICADOS

### 3.1 CRÍTICOS (Bloquean multiidioma)

#### GAP-001: Idioma hardcoded
- **Problema:** `language: 'es'` fijo en transcribeAudio()
- **Impacto:** Usuarios en inglés/francés/italiano/portugués reciben transcripciones incorrectas
- **Solución:** Pasar `userLanguage` desde perfil del usuario

#### GAP-002: Sin tests unitarios
- **Problema:** Cero cobertura de testing
- **Impacto:** Imposible validar cambios, alto riesgo de regresión
- **Solución:** Suite completa de tests como Vision AI

#### GAP-003: Sin persistencia de idioma de audio
- **Problema:** No guarda idioma detectado/usado en transcripción
- **Impacto:** No hay registro histórico, dificulta debugging
- **Solución:** Agregar campo `audio_language` a conversation_files

### 3.2 ALTOS (Afectan calidad)

#### GAP-004: Sin validación de formatos
- **Problema:** No valida mp3/ogg/m4a/wav/webm
- **Impacto:** Puede fallar silenciosamente con formatos no soportados
- **Solución:** Validador de formatos con lista blanca

#### GAP-005: Mensajes error no localizados
- **Problema:** "No pude procesar tu audio" siempre en español
- **Impacto:** UX pobre para usuarios internacionales
- **Solución:** Mensajes de error multiidioma

#### GAP-006: Sin límites de tamaño/duración
- **Problema:** No valida antes de enviar a Whisper API
- **Impacto:** Errores costosos, experiencia lenta
- **Solución:** Validación 25MB max, 30min max

### 3.3 MEDIOS (Mejoras UX)

#### GAP-007: Sin prompt contextual
- **Problema:** No usa contexto del agente para mejorar transcripción
- **Impacto:** Transcripciones menos precisas en términos técnicos
- **Solución:** Agregar prompt con vocabulario del agente

#### GAP-008: Sin fallback a detección automática
- **Problema:** Si idioma del perfil es incorrecto, no hay plan B
- **Impacto:** Transcripciones incorrectas sin recuperación
- **Solución:** Detección automática como fallback

---

## 4. PLAN DE IMPLEMENTACIÓN

### FASE 1: Refactor Core Whisper (3-4 horas)

#### Tarea 1.1: Actualizar firma de transcribeAudio()
**Archivo:** `src/servicios-ia/openai.js`
```javascript
export async function transcribeAudio(audioUrl, options = {}) {
  const {
    language = 'es',           // Idioma del audio (ISO-639-1)
    userId = null,             // Para logging
    agentName = 'AURORA',      // Contexto del agente
    prompt = null,             // Prompt contextual (opcional)
    temperature = 0,           // 0 = determinístico
    responseFormat = 'text'    // text | json | srt | vtt
  } = options;
  
  // ...implementación
}
```

#### Tarea 1.2: Integrar con perfil de usuario
**Archivo:** `src/express-servidor/endpoints-api/wassenger.js`
```javascript
// Obtener idioma del perfil
const userLanguage = current.preferredLanguage || 'es';

// Transcribir con idioma correcto
const tr = await transcribeAudio(mediaUrl, {
  language: userLanguage,
  userId: userId,
  agentName: profile.activeAgent || 'AURORA'
});
```

#### Tarea 1.3: Agregar validaciones pre-transcripción
**Nuevo archivo:** `src/utils/audio-validator.js`
```javascript
export function validateAudioFile(audioUrl, fileSize) {
  // Validar formato (mp3, ogg, m4a, wav, webm)
  // Validar tamaño (< 25MB)
  // Validar duración estimada (< 30min)
}
```

### FASE 2: Logging y Persistencia (2 horas)

#### Tarea 2.1: Agregar campo audio_language a BD
**Archivo:** `src/database/postgres-adapter.js`
```sql
ALTER TABLE conversation_files 
ADD COLUMN audio_language TEXT;
```

#### Tarea 2.2: Logging estructurado
**Archivo:** `src/servicios-ia/openai.js`
```javascript
console.log('[Whisper] 📊 Transcripción:', {
  userId,
  language,
  audioSize: audioBuffer.byteLength,
  duration: transcription.length,
  success: true
});
```

### FASE 3: Mensajes Error Multiidioma (1 hora)

#### Tarea 3.1: Función getTranscriptionErrorMessage()
**Nuevo archivo:** `src/utils/whisper-error-messages.js`
```javascript
export function getTranscriptionErrorMessage(errorType, language = 'es') {
  const messages = {
    network_error: {
      es: '🎤 Error de conexión. Intenta de nuevo.',
      en: '🎤 Connection error. Try again.',
      fr: '🎤 Erreur de connexion. Réessayez.',
      it: '🎤 Errore di connessione. Riprova.',
      pt: '🎤 Erro de conexão. Tente novamente.'
    },
    format_error: {
      es: '🎤 Formato de audio no soportado. Usa mp3 u ogg.',
      en: '🎤 Audio format not supported. Use mp3 or ogg.',
      // ...
    },
    size_error: {
      es: '🎤 Audio muy largo. Máximo 30 minutos.',
      en: '🎤 Audio too long. Maximum 30 minutes.',
      // ...
    }
  };
  return messages[errorType][language] || messages[errorType]['es'];
}
```

### FASE 4: Context-Aware Prompts (2 horas)

#### Tarea 4.1: Prompts por agente
**Nuevo archivo:** `src/servicios-ia/whisper-prompts.js`
```javascript
export const AGENT_PROMPTS = {
  AURORA: 'Coworkia, reserva, sala de reuniones, hot desk, oficina',
  ALUNA: 'membresía, plan 10, plan 20, oficina virtual, pago',
  AXEL: 'choque, colisión, enderezada, pintura, cotización',
  ADRIANA: 'seguro, póliza, cobertura, vehículo, vida',
  ANGELA: 'salud, médico, consulta, bienestar, telemedicina',
  ENZO: 'marketing, publicidad, redes sociales, campaña',
  GABI: 'legal, contabilidad, impuestos, finanzas',
  PAULA: 'bienes raíces, casa, departamento, venta, arriendo'
};
```

### FASE 5: Testing Exhaustivo (4-5 horas)

#### Tarea 5.1: Tests unitarios básicos
**Archivo:** `tests/unit/whisper-transcription.test.js`
- ✅ Debe transcribir audio en español
- ✅ Debe transcribir audio en inglés
- ✅ Debe transcribir audio en francés
- ✅ Debe transcribir audio en italiano
- ✅ Debe transcribir audio en portugués
- ❌ Debe rechazar formato no soportado
- ❌ Debe rechazar audio muy grande (>25MB)
- ⚠️ Debe usar idioma del perfil automáticamente

#### Tarea 5.2: Tests de integración wassenger
**Archivo:** `tests/integration/whisper-wassenger.test.js`
- ✅ Flujo completo: audio → transcripción → respuesta agente
- ✅ Usuario español envía audio → recibe respuesta en español
- ✅ Usuario inglés envía audio → recibe respuesta en inglés
- ❌ Error de red → mensaje de error localizado
- ❌ Formato inválido → mensaje de error localizado

#### Tarea 5.3: Tests por agente
**Archivos:** `tests/unit/whisper-{agente}.test.js`
- Aurora: Reserva de sala por audio
- Aluna: Consulta de planes por audio
- Axel: Descripción de daño vehicular por audio
- Adriana: Consulta de seguros por audio
- Angela: Síntomas médicos por audio
- Enzo: Consulta marketing por audio
- Gabi: Consulta legal por audio
- Paula: Búsqueda inmobiliaria por audio

### FASE 6: Documentación (1 hora)

#### Tarea 6.1: Documento técnico
**Archivo:** `documentacion/WHISPER-MULTIIDIOMA.md`
- Arquitectura
- Flujos de datos
- APIs utilizadas
- Limitaciones de Whisper
- Troubleshooting

#### Tarea 6.2: Actualizar README
**Archivo:** `README.md`
- Agregar sección Whisper Multiidioma
- Documentar variables de entorno
- Ejemplos de uso

---

## 5. DEFINICIÓN DE TESTS

### 5.1 Test Matrix - Whisper Multiidioma

| Test ID | Categoría | Descripción | Idioma | Agente | Prioridad |
|---------|-----------|-------------|--------|--------|-----------|
| WH-001 | Basic | Transcribe español correctamente | es | AURORA | P0 |
| WH-002 | Basic | Transcribe inglés correctamente | en | AURORA | P0 |
| WH-003 | Basic | Transcribe francés correctamente | fr | AURORA | P0 |
| WH-004 | Basic | Transcribe italiano correctamente | it | AURORA | P0 |
| WH-005 | Basic | Transcribe portugués correctamente | pt | AURORA | P0 |
| WH-006 | Validation | Rechaza formato inválido (.txt) | es | AURORA | P0 |
| WH-007 | Validation | Rechaza audio >25MB | es | AURORA | P0 |
| WH-008 | Validation | Rechaza audio corrupto | es | AURORA | P1 |
| WH-009 | Integration | Flujo completo español | es | AURORA | P0 |
| WH-010 | Integration | Flujo completo inglés | en | AURORA | P0 |
| WH-011 | Error | Error de red manejado | es | AURORA | P1 |
| WH-012 | Error | Error de API manejado | es | AURORA | P1 |
| WH-013 | Context | Prompt contextual Aluna | es | ALUNA | P1 |
| WH-014 | Context | Prompt contextual Axel | es | AXEL | P1 |
| WH-015 | Context | Prompt contextual Angela | es | ANGELA | P1 |
| WH-016 | Persistence | Guarda audio_language en BD | es | AURORA | P1 |
| WH-017 | Fallback | Usa idioma preferido si audio sin idioma | es | AURORA | P2 |
| WH-018 | Fallback | Detección automática si idioma incorrecto | en | AURORA | P2 |

**Total Tests Objetivo:** 18+ tests (igual o mejor que Vision AI)

### 5.2 Estructura de Tests

```javascript
describe('🎤 WHISPER MULTIIDIOMA', () => {
  
  describe('Transcripción básica', () => {
    test('✅ Debe transcribir audio en español', async () => {
      const result = await transcribeAudio(mockSpanishAudio, {
        language: 'es',
        userId: 'test-user',
        agentName: 'AURORA'
      });
      expect(result.success).toBe(true);
      expect(result.text).toContain('hola');
    });
    
    test('✅ Debe transcribir audio en inglés', async () => {
      const result = await transcribeAudio(mockEnglishAudio, {
        language: 'en',
        userId: 'test-user',
        agentName: 'AURORA'
      });
      expect(result.success).toBe(true);
      expect(result.text).toContain('hello');
    });
    
    // ...más tests
  });
  
  describe('Validación de formatos', () => {
    test('❌ Debe rechazar formato .txt', async () => {
      const result = await transcribeAudio('https://example.com/file.txt');
      expect(result.success).toBe(false);
      expect(result.error).toContain('formato');
    });
    
    // ...más tests
  });
  
  describe('Integración por agente', () => {
    // Tests específicos para cada agente
  });
});
```

---

## 6. MÉTRICAS DE ÉXITO

### 6.1 Cobertura de Testing

- ✅ **18+ tests unitarios** (igual que Vision AI)
- ✅ **5 idiomas soportados** (es, en, fr, it, pt)
- ✅ **8 agentes cubiertos** (Aurora, Aluna, Enzo, Adriana, Angela, Axel, Gabi, Paula)
- ✅ **100% de casos de error** manejados

### 6.2 Funcionalidad

- ✅ **Detección automática** de idioma del perfil
- ✅ **Transcripción correcta** en 5 idiomas
- ✅ **Mensajes de error** localizados
- ✅ **Validación de formatos** (mp3, ogg, m4a, wav, webm)
- ✅ **Validación de tamaño** (<25MB)
- ✅ **Prompts contextuales** por agente
- ✅ **Persistencia** en base de datos

### 6.3 Calidad de Código

- ✅ **Documentación completa** (como Vision AI)
- ✅ **Logging estructurado** con métricas
- ✅ **Manejo de errores** robusto
- ✅ **Código DRY** (no repetir lógica)

### 6.4 Paridad con Vision AI

| Criterio | Vision AI | Whisper (Objetivo) |
|----------|-----------|-------------------|
| Tests unitarios | 49 | 18+ |
| Idiomas soportados | 5 | 5 |
| Agentes cubiertos | 4 (Axel, Aurora, Aluna, Angela) | 8 (todos) |
| Documentación | ✅ Completa | ✅ Completa |
| Validaciones | ✅ Múltiples | ✅ Múltiples |
| Error handling | ✅ Robusto | ✅ Robusto |

---

## 7. RIESGOS Y MITIGACIONES

### 7.1 Riesgos Técnicos

#### RIESGO-001: Whisper API no soporta detección automática confiable
- **Probabilidad:** Media
- **Impacto:** Medio
- **Mitigación:** Usar idioma del perfil siempre, fallback a 'es'

#### RIESGO-002: Costos elevados por audios largos
- **Probabilidad:** Media
- **Impacto:** Alto
- **Mitigación:** Validar duración antes (límite 30min), alertas de costos

#### RIESGO-003: Formatos de audio incompatibles por país
- **Probabilidad:** Baja
- **Impacto:** Medio
- **Mitigación:** Lista blanca amplia de formatos

### 7.2 Riesgos de Implementación

#### RIESGO-004: Cambios rompen flujo actual
- **Probabilidad:** Media
- **Impacto:** Alto
- **Mitigación:** Tests exhaustivos antes de deploy, feature flag

#### RIESGO-005: Regresión en otros módulos
- **Probabilidad:** Baja
- **Impacto:** Alto
- **Mitigación:** Suite completa de tests, validación en staging

---

## 8. CRONOGRAMA

### Sprint 1 (Día 1-2): Core Functionality
- ✅ Refactor transcribeAudio() con multiidioma
- ✅ Integración con perfil de usuario
- ✅ Validaciones básicas

### Sprint 2 (Día 2-3): Quality & Persistence
- ✅ Logging estructurado
- ✅ Persistencia en BD
- ✅ Mensajes error multiidioma

### Sprint 3 (Día 3-4): Context & Testing
- ✅ Prompts contextuales por agente
- ✅ Suite de tests unitarios (18+)
- ✅ Tests de integración

### Sprint 4 (Día 4-5): Documentación & Deploy
- ✅ Documentación técnica completa
- ✅ Actualizar README
- ✅ Deploy a staging
- ✅ Validación en producción

**Tiempo total estimado:** 4-5 días (32-40 horas)

---

## 9. CHECKLIST FINAL

### Pre-Deploy
- [ ] Todos los tests pasando (18+)
- [ ] Documentación completa
- [ ] Code review aprobado
- [ ] No hay console.log de debug
- [ ] Variables de entorno documentadas
- [ ] Logging estructurado implementado

### Deploy
- [ ] Deploy a staging exitoso
- [ ] Pruebas manuales en 5 idiomas
- [ ] Validación de costos de API
- [ ] Monitoreo de errores activo
- [ ] Rollback plan definido

### Post-Deploy
- [ ] Métricas de transcripción monitoreadas
- [ ] Feedback de usuarios recolectado
- [ ] Optimizaciones aplicadas
- [ ] Documentación actualizada

---

## 10. APÉNDICES

### A. Formatos de Audio Soportados por Whisper

| Formato | Extensión | Máx Tamaño | Notas |
|---------|-----------|------------|-------|
| MP3 | .mp3 | 25 MB | Más común |
| OGG | .ogg | 25 MB | WhatsApp usa esto |
| M4A | .m4a | 25 MB | iOS |
| WAV | .wav | 25 MB | Sin comprimir |
| WEBM | .webm | 25 MB | Navegadores |

### B. Idiomas Soportados por Whisper (Completo)

Whisper soporta **99 idiomas**, nosotros implementamos **5 prioritarios**:
- 🇪🇸 Español (es)
- 🇺🇸 English (en)
- 🇫🇷 Français (fr)
- 🇮🇹 Italiano (it)
- 🇵🇹 Português (pt)

**Expansión futura:** Agregar alemán (de), chino (zh), japonés (ja), árabe (ar)

### C. Referencias

- [OpenAI Whisper API Docs](https://platform.openai.com/docs/guides/speech-to-text)
- [Documentación Vision AI](./AUDITORIA-VISIONAI-ALUNA-AURORA.md)
- [Sistema Multiidioma](../src/utils/language-detector.js)

---

**Autor:** Nena AI Assistant  
**Revisión:** Diego Villota  
**Estado:** ✅ APROBADO PARA IMPLEMENTACIÓN
