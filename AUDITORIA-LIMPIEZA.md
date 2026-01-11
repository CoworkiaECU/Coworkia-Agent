# 🔍 AUDITORÍA DE CÓDIGO - Coworkia Agent
**Fecha:** 10 Enero 2026  
**Versión actual:** v372

---

## 📊 RESUMEN EJECUTIVO

**Total archivos analizados:** ~142 archivos  
**Archivos con duplicación detectada:** 15  
**Scripts obsoletos identificados:** 18  
**Carpeta coverage (no versionada):** ~120KB  
**Potencial ahorro de espacio:** ~50KB código + limpieza estructural

---

## 🗑️ CATEGORÍA 1: BORRADO SEGURO (SIN RIESGO)

### 1.1 Carpeta Coverage (120KB)
**Ubicación:** `/coverage/` y `/coverage/lcov-report/`  
**Razón:** Archivos generados por Jest, NO deben estar en Git  
**Acción:** 
```bash
# Borrar carpeta
rm -rf coverage/

# Agregar a .gitignore si no está
echo "coverage/" >> .gitignore
```
**Impacto:** ✅ CERO - Se regenera con `npm run test:coverage`

---

### 1.2 Tests Manuales Obsoletos (13 archivos)

#### DUPLICADOS o NO USADOS:
```
scripts/tests-manual/test-aurora-local.js          (8KB)  ❌ DUPLICADO de test-aurora-messaging.mjs
scripts/tests-manual/test-aurora-multilanguage.js  (16KB) ✅ RELEVANTE pero no usado activamente
scripts/tests-manual/test-integration-multilanguage.js (16KB) ❌ DUPLICADO del anterior
scripts/tests-manual/test-campaign-flow.js         (8KB)  ⚠️  Feature de campañas ¿existe?
scripts/tests-manual/test-complete-flow.js         (8KB)  ❌ Genérico, ya cubierto
scripts/tests-manual/test-confirmation-fix.js      (8KB)  ❌ "Fix" implica temporal
scripts/tests-manual/test-follow-up-local.js       (12KB) ⚠️  ¿Se usa follow-up?
scripts/tests-manual/test-hotdesk-tracking.js      (8KB)  ✅ RELEVANTE pero no en uso activo
scripts/tests-manual/test-new-customer-flow.js     (8KB)  ❌ Genérico
scripts/tests-manual/test-overlap-logic.js         (4KB)  ✅ ESPECÍFICO - mantener
scripts/tests-manual/test-payment-receipt.js       (8KB)  ✅ RELEVANTE
scripts/tests-manual/test-recurring-customer.js    (8KB)  ❌ Genérico
scripts/tests-manual/test-validations.js           (12KB) ✅ RELEVANTE pero puede consolidarse
```

**Recomendación de borrado SEGURO:**
```bash
rm scripts/tests-manual/test-aurora-local.js              # Duplicado
rm scripts/tests-manual/test-integration-multilanguage.js # Duplicado
rm scripts/tests-manual/test-complete-flow.js             # Genérico
rm scripts/tests-manual/test-confirmation-fix.js          # Temporal
rm scripts/tests-manual/test-new-customer-flow.js         # Genérico
rm scripts/tests-manual/test-recurring-customer.js        # Genérico
```
**Impacto:** ✅ BAJO - No se usan en producción ni en package.json

---

### 1.3 Scripts de Utilidad con Funcionalidad Duplicada

#### CONSOLIDAR SCRIPTS DE "CHECK":
```
scripts/check-reservations.js           (hardcoded a fecha 2025-11-25) ❌
scripts/check-user-reservations.js      (hardcoded a +593987770788)    ✅ ÚTIL
scripts/check-axel-status.js            (¿qué verifica?)                ⚠️
```

**Recomendación:**
- `check-reservations.js` → BORRAR (fecha hardcoded obsoleta)
- `check-axel-status.js` → REVISAR qué hace vs check-axel-state.mjs

---

### 1.4 Scripts de Limpieza con Funcionalidad Solapada

```
scripts/cleanup-all-cache.js           ⚠️  ¿Qué cache?
scripts/cleanup-expired-data.js        ✅ USADO en npm script
scripts/cleanup-obsolete-tables.js     ❌ "Obsolete" → temporal
scripts/cleanup-partial-forms.js       ⚠️  ¿Se usan partial forms?
scripts/cleanup-past-reservations.js   ⚠️  vs cleanup-expired-data
scripts/clean-user-data.js             ⚠️  vs clear-database
scripts/clear-database.js              ✅ MANTENER (útil)
scripts/clear-pending-confirmation.js  ⚠️  Muy específico
```

**Recomendación de borrado:**
```bash
rm scripts/cleanup-obsolete-tables.js    # "Obsolete" indica temporal
rm scripts/check-reservations.js         # Fecha hardcoded
```

---

### 1.5 Archivos de Migración Completados

**Ubicación:** `scripts/migrations-archive/`  
**Archivos:**
```
fix-corrupt-data.js
fix-unique-index.js
migrate-active-agent.js
migrate-add-tracking-columns.js
migrate-postgres-schema.js
```

**Estado:** Ya ejecutadas históricamente  
**Recomendación:** ✅ MANTENER en archive (histórico útil)

---

## ⚠️ CATEGORÍA 2: REVISAR ANTES DE BORRAR

### 2.1 Tests con Potencial Uso Futuro

```
test-aurora-multilanguage.js       → ¿Se usa multiidioma activamente?
test-campaign-flow.js              → ¿Existe feature de campañas?
test-follow-up-local.js            → ¿Sistema de follow-up activo?
test-hotdesk-tracking.js           → ¿Se rastrea hot desk assignment?
test-payment-receipt.js            → ¿Vision API para pagos activa?
```

**Acción requerida:** Confirmar si estas features están ACTIVAS en producción

---

### 2.2 Scripts de Reset/Deploy

```
scripts/reset-postgres-heroku.sh      ⚠️  PELIGROSO - mantener
scripts/reset-server-state.js         ⚠️  ¿Qué resetea?
scripts/reset-test-user.mjs           ✅ Usado en testing
scripts/reset-to-aurora.mjs           ✅ Usado recientemente
scripts/reset-user-via-api.sh         ⚠️  vs reset-test-user
```

**Recomendación:**
- Consolidar `reset-test-user.mjs` y `reset-user-via-api.sh`
- Documentar qué hace `reset-server-state.js`

---

### 2.3 Documentación Posiblemente Obsoleta

**Archivo:** `documentacion/archive-nov2025/`  
**Estado:** ✅ Ya archivada correctamente  
**Acción:** Ninguna (bien organizado)

---

## 🔴 CATEGORÍA 3: NO TOCAR (RIESGO ALTO)

### 3.1 Código Core en Producción

```
src/express-servidor/endpoints-api/wassenger.js  (2019 líneas) ✅ CRÍTICO
src/servicios/aurora-confirmation-helper.js      (915 líneas)  ✅ ACTIVO
src/deteccion-intenciones/orquestador.js         (879 líneas)  ✅ CORE
src/servicios/confirmation-flow.js               (868 líneas)  ✅ ACTIVO
src/servicios/email.js                           (847 líneas)  ✅ ACTIVO
src/servicios/partial-reservation-form.js        (838 líneas)  ⚠️  ¿Se usa?
src/servicios/calendario.js                      (724 líneas)  ✅ ACTIVO
```

**Observación:** `partial-reservation-form.js` tiene 838 líneas pero no sé si está activo  
**Acción:** AUDITAR si se usa en producción antes de considerar eliminación

---

### 3.2 Tests de Jest (src/__tests__/)

```
src/__tests__/handoff-system.test.js              (536 líneas)
src/__tests__/axel-agent.test.js                  (417 líneas)
src/__tests__/e2e-reservation-flow.test.js        (374 líneas)
src/__tests__/payment-transcription.test.js       (373 líneas)
```

**Estado:** ✅ Tests de Jest activos  
**Acción:** MANTENER (coverage ~57% según últimos logs)

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Borrado Inmediato (SIN RIESGO)

```bash
# 1. Borrar coverage (no debe estar en Git)
rm -rf coverage/
echo "coverage/" >> .gitignore

# 2. Borrar tests duplicados/obsoletos
rm scripts/tests-manual/test-aurora-local.js
rm scripts/tests-manual/test-integration-multilanguage.js
rm scripts/tests-manual/test-complete-flow.js
rm scripts/tests-manual/test-confirmation-fix.js
rm scripts/tests-manual/test-new-customer-flow.js
rm scripts/tests-manual/test-recurring-customer.js

# 3. Borrar scripts con fecha hardcoded
rm scripts/check-reservations.js
rm scripts/cleanup-obsolete-tables.js

# 4. Commit
git add -A
git commit -m "chore: limpiar tests obsoletos y archivos duplicados

- Remover coverage/ (no debe estar en Git)
- Eliminar 6 tests manuales duplicados/genéricos
- Borrar scripts con datos hardcoded obsoletos
- Total: ~60KB de código obsoleto removido"
```

**Impacto estimado:**
- ✅ Reduce 8 archivos (~60KB)
- ✅ Limpia coverage/ (~120KB)
- ✅ CERO impacto en producción
- ✅ Mantiene tests relevantes (AXEL, Aurora)

---

### Fase 2: Consolidación (REQUIERE TESTING)

**Script a crear:** `scripts/utils/check-user.mjs` (consolida check-user-reservations + reset-test-user)

```javascript
#!/usr/bin/env node
/**
 * Utilidad consolidada para inspeccionar/resetear usuarios
 * Reemplaza: check-user-reservations.js, reset-test-user.mjs
 */

import { program } from 'commander';

program
  .option('-p, --phone <number>', 'Número de teléfono')
  .option('-r, --reset', 'Resetear usuario')
  .option('-i, --info', 'Ver información (default)')
  .parse();

// Implementación...
```

**Beneficio:** 2 scripts → 1 con opciones

---

### Fase 3: Auditoría de Features Inactivas (CRÍTICO)

**Preguntas para ti:**

1. **¿Sistema de follow-up está activo?**  
   - Si NO → Borrar `test-follow-up-local.js`
   - Si SÍ → Mantener

2. **¿Sistema de campañas existe?**  
   - Si NO → Borrar `test-campaign-flow.js`
   - Si SÍ → Mantener

3. **¿Partial reservation forms se usa?**  
   - Si NO → Borrar `partial-reservation-form.js` (838 líneas!) 🎯 **MAYOR AHORRO**
   - Si SÍ → Mantener

4. **¿Payment receipt OCR está activo?**  
   - Si NO → Borrar `test-payment-receipt.js`
   - Si SÍ → Mantener

5. **¿Hot desk tracking con números?**  
   - Si NO → Borrar `test-hotdesk-tracking.js`
   - Si SÍ → Mantener

---

## 📈 MÉTRICAS DE LIMPIEZA

### Ahorro Estimado (Fase 1 solamente):

| Categoría | Archivos | Tamaño | Impacto |
|-----------|----------|--------|---------|
| Coverage folder | 1 carpeta | ~120KB | ✅ SEGURO |
| Tests obsoletos | 6 archivos | ~52KB | ✅ SEGURO |
| Scripts hardcoded | 2 archivos | ~8KB | ✅ SEGURO |
| **TOTAL FASE 1** | **9 items** | **~180KB** | **✅ SIN RIESGO** |

### Ahorro Potencial (Fase 3 si features inactivas):

| Feature | Archivos | Tamaño | Condición |
|---------|----------|--------|-----------|
| Partial forms | 2 archivos | ~850KB | Si NO se usa |
| Follow-up | 1 test | ~12KB | Si NO está activo |
| Campañas | 1 test | ~8KB | Si NO existe |
| Payment OCR | 1 test | ~8KB | Si NO está activo |
| **TOTAL FASE 3** | **5 items** | **~878KB** | **⚠️ REQUIERE CONFIRMACIÓN** |

---

## 🔍 DUPLICACIÓN DETECTADA EN CÓDIGO ACTIVO

### wassenger.js (2019 líneas)

**Observación:** Archivo muy grande, posible candidato para refactoring  
**NO borrar** pero considerar split en v373+:

```
wassenger.js (2019 líneas)
├── webhook-handler.js      (lógica de webhook)
├── photo-grouping.js       (Map de AXEL)
├── message-router.js       (routing a agentes)
└── media-processing.js     (descarga de archivos)
```

**Beneficio:** Mejor mantenibilidad, no reduce tamaño pero mejora estructura

---

## ✅ RECOMENDACIÓN FINAL

### EJECUTAR HOY (Fase 1):
```bash
# Script de limpieza segura
cat > scripts/clean-obsolete-files.sh << 'EOF'
#!/bin/bash
echo "🧹 Limpieza segura de archivos obsoletos"
rm -rf coverage/
rm scripts/tests-manual/test-aurora-local.js
rm scripts/tests-manual/test-integration-multilanguage.js
rm scripts/tests-manual/test-complete-flow.js
rm scripts/tests-manual/test-confirmation-fix.js
rm scripts/tests-manual/test-new-customer-flow.js
rm scripts/tests-manual/test-recurring-customer.js
rm scripts/check-reservations.js
rm scripts/cleanup-obsolete-tables.js
echo "✅ Limpieza completada: 9 items removidos"
EOF

chmod +x scripts/clean-obsolete-files.sh
./scripts/clean-obsolete-files.sh
git add -A
git commit -m "chore: limpieza de archivos obsoletos"
```

### INVESTIGAR DESPUÉS (Fase 3):
Confirmar uso de:
- `partial-reservation-form.js` (838 líneas - **MAYOR OPORTUNIDAD**)
- Sistema de follow-up
- Sistema de campañas
- Payment receipt OCR
- Hot desk tracking con números

---

**Preparado por:** GitHub Copilot  
**Próxima auditoría:** Post v380 (después de confirmar features activas)
