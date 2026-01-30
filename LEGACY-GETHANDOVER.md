# 🔴 CÓDIGO LEGACY - PENDIENTE MIGRACIÓN

## getHandover() en 7 archivos de agentes

### Archivos afectados:
- `src/deteccion-intenciones/adriana.js` (línea 43)
- `src/deteccion-intenciones/aluna.js` (línea 41)
- `src/deteccion-intenciones/angela.js` (línea 42)
- `src/deteccion-intenciones/aurora.js` (línea 1165)
- `src/deteccion-intenciones/axel.js` (línea 23)
- `src/deteccion-intenciones/enzo.js` (línea 40)
- `src/deteccion-intenciones/gabi.js` (línea 23)

### Estado actual (30 Ene 2026):
✅ **Sistema V2 implementado:**
- `handoff-manager.js` usa `handoff-messages.js` (centralizado)
- `wassenger.js` usa `executeHandoff()` del V2
- Tests locales pasando (21/21)

⚠️ **Todavía en uso:**
- `orquestador.js` llama `agenteActual.getHandover()` en líneas 98-105
- `procesarMensaje()` del orquestador todavía se usa en `wassenger.js` línea 1317

### Plan de migración:
1. ✅ Testing V2 con números 262 y 788 (validar handoffs funcionan)
2. ⏳ Refactorizar `orquestador.js` para usar `handoff-messages.js` en lugar de llamar `getHandover()`
3. ⏳ Eliminar los 7 `getHandover()` individuales (~560 líneas)

### Riesgo:
- **BAJO**: Los getHandover() solo se usan en orquestador, que ahora está siendo reemplazado por intent-resolver-v2 + handoff-manager
- Mantenerlos temporalmente no causa conflicto porque handoff-manager YA NO los llama

### Acción inmediata:
**Marcar como DEPRECADO con warning logs**
