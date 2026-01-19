# 🚀 Plan de Refactorización PRO - wassenger.js

**Estado:** Fase 1 completada, listo para Fase 2  
**Backup:** wassenger-backup-v517-funcional.js (commit dc9b362)

---

## ✅ COMPLETADO

### Fase 1: Helpers Extraídos (300 líneas)

**Archivos creados:**
- `src/servicios/wassenger/helpers.js` (100 líneas)
  - safeStr, nowUnix, isIncomingEvent
  - normalizeUserId, normalizeName, normalizeText, normalizeType
  - buildMediaUrl, buildMessageEnvelope

- `src/servicios/wassenger/name-detection.js` (95 líneas)
  - cleanWhatsAppName
  - extractNameFromMessage
  - detectSmartName

- `src/servicios/wassenger/validation.js` (105 líneas)
  - detectBotLight
  - isOldMessage
  - isCasualGreetingOnly
  - isReservationIntent
  - detectFormContinuation
  - validateMessage

**Próximo paso:** Reemplazar líneas 58-240 de wassenger.js con imports

---

## 📋 PENDIENTE

### Fase 2: Actualizar wassenger.js con imports (20 min)

**Cambios en wassenger.js:**

```javascript
// AGREGAR después de línea 39:
import {
  safeStr,
  nowUnix,
  isIncomingEvent,
  isGroupOrBroadcast,
  normalizeUserId,
  normalizeName,
  normalizeText,
  normalizeType,
  buildMediaUrl,
  buildMessageEnvelope
} from '../../servicios/wassenger/helpers.js';

import {
  cleanWhatsAppName,
  extractNameFromMessage,
  detectSmartName
} from '../../servicios/wassenger/name-detection.js';

import {
  detectBotLight,
  isOldMessage,
  isCasualGreetingOnly,
  isReservationIntent,
  detectFormContinuation,
  validateMessage
} from '../../servicios/wassenger/validation.js';

// ELIMINAR líneas 58-240 (funciones helper locales)
```

**Resultado esperado:**
- wassenger.js: 1060 → ~860 líneas (-200)
- Más mantenible y testeable
- Helpers reutilizables por otros módulos

### Fase 3: Extraer Handlers (30 min)

**Archivos a crear:**

```
src/servicios/wassenger/handlers/
├── axel-photo-handler.js       (150 líneas)
│   └── handleAxelPhotoMessage()
│   └── handleAxelPhotoProcessing()
│
├── confirmation-handler.js     (80 líneas)
│   └── handleConfirmationResponse()
│
├── language-handler.js         (100 líneas)
│   └── handleLanguageChange()
│
├── payment-handler.js          (60 líneas)
│   └── handlePaymentReceipt()
│
└── handoff-handler.js          (120 líneas)
    └── handleAgentHandoff()
    └── buildHandoffMessages()
```

**Beneficio:** Reducir wassenger.js de 860 → 350 líneas

### Fase 4: Error Handling Robusto (20 min)

**Archivo a crear:**
```
src/servicios/wassenger/error-handler.js
└── wrapWithErrorHandling()
└── buildFallbackResponse()
└── logCriticalError()
```

**Mejoras:**
- Try-catch en todos los handlers
- Fallbacks amigables para usuarios
- Logs estructurados de errores
- Métricas de errores

### Fase 5: Webhook Core Simplificado (30 min)

**Estructura ideal:**
```javascript
router.post('/webhooks/wassenger', async (req, res) => {
  try {
    // 1. Validar y normalizar
    const message = normalizeWebhookData(req.body);
    
    // 2. Verificar si debe ignorarse
    const validation = validateMessage(message);
    if (!validation.valid) {
      return res.json({ ok: true, ignored: validation.reason });
    }
    
    // 3. Rate limiting
    if (!await checkRateLimit(message.userId)) {
      return res.json({ ok: false, error: 'RATE_LIMIT' });
    }
    
    // 4. Seleccionar handler apropiado
    const handler = selectHandler(message);
    
    // 5. Procesar con timeout
    const result = await executeWithTimeout(
      () => handler.process(message),
      30000
    );
    
    // 6. Responder
    return res.json({ ok: true });
    
  } catch (error) {
    logCriticalError(error);
    return res.status(500).json({ ok: false });
  }
});
```

---

## 🎯 MÉTRICAS OBJETIVO

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Líneas wassenger.js | 1060 | 350 | -67% |
| Funciones locales | 19 | 5 | -74% |
| Complejidad ciclomática | ~150 | ~40 | -73% |
| Niveles anidación | 6 | 3 | -50% |
| Módulos reutilizables | 0 | 8 | ∞ |
| Cobertura tests | 0% | 80% | +80% |

---

## ⚠️ RIESGOS Y MITIGACIÓN

### Riesgo 1: Romper funcionalidad existente
**Mitigación:**
- ✅ Backup creado (v517)
- Tests manuales después de cada fase
- Deploy incremental por fases
- Rollback rápido si falla

### Riesgo 2: Introducir bugs sutiles
**Mitigación:**
- Imports explícitos (no wildcards)
- Validar tipos con JSDoc
- Tests unitarios de helpers extraídos
- Monitoring de errores en producción

### Riesgo 3: Performance degradation
**Mitigación:**
- Medir latencia antes/después
- Evitar imports dinámicos innecesarios
- Mantener funciones helper puras (sin I/O)

---

## 📊 TIMELINE ESTIMADO

| Fase | Tiempo | Riesgo | Estado |
|------|--------|--------|--------|
| Fase 1: Helpers extraídos | 15 min | Bajo | ✅ COMPLETADO |
| Fase 2: Imports en wassenger | 20 min | Bajo | ⏳ PENDIENTE |
| Fase 3: Handlers extraídos | 30 min | Medio | ⏳ PENDIENTE |
| Fase 4: Error handling | 20 min | Bajo | ⏳ PENDIENTE |
| Fase 5: Webhook simplificado | 30 min | Alto | ⏳ PENDIENTE |
| Tests + Validación | 45 min | - | ⏳ PENDIENTE |
| **TOTAL** | **2h 40min** | - | **6% completo** |

---

## 🚦 DECISIÓN REQUERIDA

**Opciones:**

### Opción A: Continuar con Fase 2-5 ahora (2h 30min)
- ✅ Arquitectura limpia completa
- ✅ Código profesional y mantenible
- ❌ Tiempo significativo requerido
- ❌ Riesgo medio de romper algo

### Opción B: Detener aquí, completar después
- ✅ Fase 1 ya aporta valor (helpers reutilizables)
- ✅ Sin riesgo de romper nada
- ❌ wassenger.js aún monolítico
- ❌ Refactorización incompleta

### Opción C: Solo Fase 2 ahora (actualizar imports)
- ✅ Reducción inmediata 200 líneas
- ✅ Bajo riesgo (solo imports)
- ✅ 20 minutos
- ❌ Fases 3-5 quedan pendientes

---

## 💡 RECOMENDACIÓN

**Opción C: Completar Fase 2 ahora**

**Razones:**
1. Bajo riesgo (solo cambiar imports)
2. Mejora inmediata (-200 líneas)
3. Helpers ya listos para tests
4. Fases 3-5 pueden hacerse en otra sesión
5. 20 minutos vs 2h 30min

**Siguientes pasos si eliges C:**
1. Actualizar imports en wassenger.js
2. Eliminar funciones duplicadas
3. Commit + deploy v519
4. Validar webhook sigue verde
5. Documentar Fases 3-5 para después

---

## 📝 COMANDO PARA CONTINUAR

```bash
# Si eliges Opción C (recomendada):
# 1. Actualizar wassenger.js con imports
# 2. Eliminar líneas 58-240
# 3. git commit -m "refactor: Fase 2 - Extraer helpers a módulos"
# 4. git push heroku main
# 5. Validar webhook verde
```

**¿Qué decides: A, B o C?**
