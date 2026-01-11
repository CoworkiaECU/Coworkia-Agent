# 🧪 Tests Manuales - Coworkia Agent

Scripts de testing y verificación para desarrollo local y pre-deploy.

---

## 📂 Scripts Disponibles

### 🤖 AXEL (Vehicle Damage Analysis)

#### `check-axel-state.mjs` - Verificación de Estado
Verifica que todas las piezas del sistema de análisis de fotos estén implementadas.

```bash
node scripts/tests-manual/check-axel-state.mjs
```

**Verifica:**
- ✅ Map de fotos pendientes declarado
- ✅ Sistema de agrupación implementado
- ✅ Timer de 4 segundos configurado
- ✅ Limpieza de cache
- ✅ Flag waitingForPhotoRetry
- ✅ Prevención de reinicio de conversación
- ✅ Servicio collision-analysis.js

---

#### `test-axel-photos.mjs` - Test de Agrupación
Simula el envío de 4 fotos para verificar la agrupación.

```bash
# Test local (servidor en localhost:3000)
node scripts/tests-manual/test-axel-photos.mjs photos

# Test en Heroku staging
TEST_URL=https://tu-app-staging.herokuapp.com node scripts/tests-manual/test-axel-photos.mjs photos
```

**Qué hace:**
1. Envía 4 fotos rápidamente (300ms entre cada una)
2. Espera 5 segundos para que el timer se dispare
3. Muestra resultados de cada foto enviada

**Documentación completa:** [README-AXEL-TESTS.md](README-AXEL-TESTS.md)

---

### 🌟 AURORA (Messaging & Presentation)

#### `test-aurora-messaging.mjs` - Verificación de Messaging
Verifica que Aurora use el nuevo messaging persuasivo sobre Coworkia.

```bash
node scripts/tests-manual/test-aurora-messaging.mjs
```

**Verifica:**
- ✅ Aurora NO dice "¡Soy Aurora!" automáticamente
- ✅ Metáfora de torre de control incluida
- ✅ Énfasis en IA y diferenciación
- ✅ Comparaciones humano vs IA
- ✅ Respuesta persuasiva a "Qué es Coworkia"
- ✅ Handover a Axel menciona IA/visión artificial

---

#### `quick-test-aurora.sh` - Guía de Prueba en Producción
Muestra mensajes para probar Aurora en WhatsApp real.

```bash
./scripts/tests-manual/quick-test-aurora.sh
```

**Mensajes de prueba:**
1. "hola" → NO debe presentarse
2. "quien eres?" → Debe dar respuesta completa sobre ecosistema
3. "que es coworkia?" → Debe vender Coworkia persuasivamente
4. "que servicios tienen?" → Respuesta directa SIN presentarse

**Documentación completa:** [../documentacion/AURORA-MESSAGING.md](../../documentacion/AURORA-MESSAGING.md)

---

## 🚀 Workflow de Testing

### Pre-Deploy Checklist

Antes de hacer `git push heroku main`, ejecuta:

```bash
# 1. Verificar AXEL
node scripts/tests-manual/check-axel-state.mjs

# 2. Verificar AURORA
node scripts/tests-manual/test-aurora-messaging.mjs

# 3. (Opcional) Test de agrupación AXEL local
# Requiere servidor corriendo: npm run dev
node scripts/tests-manual/test-axel-photos.mjs photos
```

**Todos los checks deben pasar ✅ antes de deploy.**

---

### Post-Deploy Testing

Después de desplegar a Heroku:

```bash
# 1. Ver guía de prueba Aurora
./scripts/tests-manual/quick-test-aurora.sh

# 2. Probar en WhatsApp según guía
# Enviar mensajes al bot y verificar respuestas

# 3. (Opcional) Test AXEL en staging
TEST_URL=https://coworkia-agent-e97d15dac56f.herokuapp.com \
  node scripts/tests-manual/test-axel-photos.mjs photos
```

---

## 📁 Estructura

```
scripts/tests-manual/
├── README.md                      ← Este archivo
├── README-AXEL-TESTS.md          ← Documentación completa AXEL
│
├── check-axel-state.mjs          ← Verificación sistema AXEL
├── test-axel-photos.mjs          ← Test agrupación fotos
│
├── test-aurora-messaging.mjs     ← Verificación messaging Aurora
└── quick-test-aurora.sh          ← Guía prueba WhatsApp
```

---

## 🔍 Troubleshooting

### AXEL: "Map is not declared"
```bash
# Verificar que wassenger.js tenga el Map declarado
grep -n "axelPendingPhotos" src/express-servidor/endpoints-api/wassenger.js
```

**Debe aparecer:**
- Línea ~19: `const axelPendingPhotos = new Map()`

---

### AURORA: "Sigue diciendo 'Soy Aurora'"
```bash
# Verificar system prompt
node scripts/tests-manual/test-aurora-messaging.mjs

# Si falla, revisar
cat src/deteccion-intenciones/aurora.js | grep "Soy Aurora"
```

**NO debe aparecer:** `"¡Soy Aurora! 🌟 El cerebro..."`  
**SÍ debe aparecer:** `"Eres Aurora, la inteligencia artificial..."`

---

### Test de fotos no funciona
```bash
# 1. Verificar servidor local esté corriendo
curl http://localhost:3000/health

# 2. Verificar variables de entorno
# Editar test-axel-photos.mjs y poner tu número real

# 3. Ver logs del servidor
# Terminal donde corre npm run dev debe mostrar:
# "📸 Foto 1 de X recibida"
```

---

## 📊 Interpretación de Resultados

### ✅ PASS (Todo bien)
```
✅ PASS: System prompt actualizado correctamente
✅ PASS: Incluye metáfora de torre de control
...
```
**Acción:** Continuar con deploy

---

### ❌ FAIL (Algo falló)
```
❌ FAIL: Map de fotos pendientes no encontrado
```
**Acción:** 
1. Revisar archivo indicado
2. Corregir código
3. Re-ejecutar test
4. NO hacer deploy hasta que pase

---

### ⚠️ WARNING (Revisar)
```
⚠️  WARNING: Handover podría enfatizar más la IA
```
**Acción:** 
- Opcional mejorar
- No bloquea deploy
- Considerar para siguiente iteración

---

## 🎯 Uso Recomendado

### Desarrollo Diario
```bash
# Al empezar el día
node scripts/tests-manual/check-axel-state.mjs
node scripts/tests-manual/test-aurora-messaging.mjs
```

### Antes de Feature Branch
```bash
# Verificar estado limpio
git status
npm run dev &  # Background
sleep 3
node scripts/tests-manual/test-axel-photos.mjs photos
kill %1  # Detener servidor
```

### Antes de Merge a Main
```bash
# Full test suite
node scripts/tests-manual/check-axel-state.mjs && \
node scripts/tests-manual/test-aurora-messaging.mjs && \
echo "✅ Todos los tests pasaron - OK para merge"
```

---

## 📝 Agregar Nuevos Tests

### Template para Nuevo Test

```javascript
#!/usr/bin/env node

/**
 * test-nombre-feature.mjs
 * 
 * Descripción breve del test
 */

import { MODULO } from '../../src/path/to/module.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TEST: NOMBRE FEATURE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Verificar algo
console.log('📋 Test 1: Descripción');
if (condicion) {
  console.log('✅ PASS: Descripción éxito');
} else {
  console.log('❌ FAIL: Descripción fallo');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✨ Testing completado\n');
```

### Checklist Nuevo Test

- [ ] Nombre descriptivo (`test-{feature}.mjs`)
- [ ] Comentario JSDoc al inicio
- [ ] Output claro (✅ PASS / ❌ FAIL)
- [ ] Documentar en este README
- [ ] Agregar a pre-deploy checklist si aplica

---

## 🤝 Contribuir

Al agregar un nuevo test:

1. **Crear el script** en `scripts/tests-manual/`
2. **Documentar aquí** con ejemplo de uso
3. **Hacer executable** si es .sh: `chmod +x script.sh`
4. **Commitear junto con feature**: 
   ```bash
   git add scripts/tests-manual/test-nueva-feature.mjs
   git commit -m "test: agregar verificación para nueva feature"
   ```

---

## 📚 Referencias

- [Documentación AXEL](README-AXEL-TESTS.md)
- [Documentación Aurora Messaging](../../documentacion/AURORA-MESSAGING.md)
- [Testing Local](../../documentacion/TESTING_LOCAL.md)

---

**Última actualización:** Enero 2025  
**Versión:** v371  
**Mantenedor:** Diego Villota
