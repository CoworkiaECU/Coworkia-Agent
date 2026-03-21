---
name: coworkia-testing
description: Estrategias de testing y QA para Coworkia Agent. Usa este skill cuando necesites crear tests, ejecutar suite de tests, hacer pruebas en local/staging/producción, validar deploys, o asegurar calidad antes de merge. Incluye tests unitarios, integración, y end-to-end.
applyTo:
  - "tests/**"
  - "**/*.test.js"
  - "**/*.spec.js"
---

# Coworkia Testing & QA Skill

## 🎯 Cuándo Usar Este Skill

- ✅ Crear tests nuevos para features
- ✅ Ejecutar suite completa de tests
- ✅ Validar cambios antes de deploy
- ✅ Hacer pruebas seguras en producción
- ✅ Debugging de tests que fallan
- ✅ Configurar CI/CD

---

## 📊 ESTRATEGIA DE TESTING

### Pirámide de Tests

```
        /\
       /E2E\         10% - End-to-End (flujos completos)
      /------\
     /  INT   \      30% - Integración (servicios + DB)
    /----------\
   /   UNIT     \    60% - Unitarios (funciones individuales)
  /--------------\
```

**Para Coworkia Agent**:
- **Unitarios**: Funciones puras, regex, validaciones
- **Integración**: Webhook → Agente → WhatsApp, DB queries
- **E2E**: Usuario real → mensaje → respuesta → confirmación

---

## 🧪 TYPES DE TESTS EN EL PROYECTO

### 1. Tests de Integración (Actuales)

**Ubicación**: `tests/integration/`

**Archivos existentes**:
- `aurora-integration.test.js` - Flujo de reservas completo
- `aluna-integration.test.js` - Flujo de membresías completo

**Comando**:
```bash
npm test
```

**Qué cubren**:
- ✅ Webhook recibe mensaje
- ✅ Detección de intención
- ✅ Forms se activan
- ✅ Datos se guardan en BD
- ✅ Emails/WhatsApp se envían (mocked)

### 2. Tests Unitarios (Crear cuando sea necesario)

**Ubicación**: `tests/unit/`

**Ejemplos de qué testear**:
```javascript
// tests/unit/validators.test.js
test('validateEmail rechaza emails inválidos', () => {
  expect(validateEmail('no-email')).toBe(false);
  expect(validateEmail('test@example.com')).toBe(true);
});

// tests/unit/high-intent-detector.test.js
test('detecta keywords de pricing correctamente', () => {
  const result = detectHighIntent('cuánto cuesta el plan mensual?');
  expect(result.detected).toBe(true);
  expect(result.category).toBe('pricing');
});
```

**Crear cuando**:
- Nueva función pure (sin side effects)
- Regex complicada
- Cálculos matemáticos (precios, descuentos)
- Validaciones críticas

### 3. Tests End-to-End (Futuro)

**Herramientas sugeridas**: Playwright, Puppeteer

**Qué testearían**:
- Abrir WhatsApp Web
- Enviar mensaje como usuario
- Verificar respuesta del bot
- Confirmar persistencia en BD

**Prioridad**: 🟡 MEDIA - Útil pero no crítico

---

## ✅ CHECKLIST PRE-DEPLOY

### Antes de `git push heroku main`:

#### 1. Tests Locales
```bash
# Todos los tests pasan
npm test

# Servidor local funciona
npm start
# → Abrir http://localhost:3000/health
# → Debe devolver {"status": "ok"}
```

#### 2. Linting (si existe)
```bash
npm run lint
# O manualmente buscar:
grep -r "console.log.*password\|token\|secret" src/
```

#### 3. Verificar Variables de Entorno
```bash
# En Heroku, variables críticas existen:
heroku config --app coworkia-agent | grep -E "DATABASE_URL|WASSENGER_TOKEN|OPENAI_API_KEY"
```

#### 4. Commits Limpios
```bash
# Ver qué se va a deployar
git diff main..HEAD

# No debe haber:
# - Archivos .env (secretos)
# - node_modules/
# - console.log con datos sensibles
```

---

## 🚀 FLUJO DE DEPLOY SEGURO

### 1. Local → GitHub → Heroku

```bash
# 1. Tests locales ✅
npm test

# 2. Commit descriptivo
git add .
git commit -m "feat: dashboard botones manuales + campañas"

# 3. Push a GitHub (backup)
git push origin main

# 4. Deploy a Heroku
git push heroku main

# 5. Monitorear logs
heroku logs --tail --app coworkia-agent
```

### 2. Si Algo Sale Mal → Rollback

```bash
# Ver releases
heroku releases --app coworkia-agent

# Output ejemplo:
# v123  Deploy abc123  20 Mar 2026  (current)
# v122  Deploy xyz456  20 Mar 2026  (previous)

# Volver a versión anterior
heroku rollback v122 --app coworkia-agent

# Verificar que funciona
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/health
```

---

## 🧪 TESTING EN PRODUCCIÓN (SEGURO)

### Niveles de Riesgo

#### 🟢 RIESGO CERO - Siempre seguros

```bash
# 1. Health check
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/health

# 2. Ver logs (solo lectura)
heroku logs --tail --app coworkia-agent

# 3. Queries SELECT en DB
heroku pg:psql --app coworkia-agent
SELECT COUNT(*) FROM membership_leads;
\q

# 4. Ver métricas
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/api/aluna/stats
```

#### 🟡 RIESGO BAJO - Con tu número de prueba

```javascript
// Crear lead de prueba con TU teléfono
POST /api/aluna/leads
{
  "nombre": "Diego Test",
  "phone": "+593XXXXXXXXX",  // TU número
  "preferred_plan": "Mensual",
  "budget": "$100"
}

// Probar botón manual
POST /api/aluna/send-d1-whatsapp
{
  "leadId": "[id del lead test]",
  "message": "Hola Diego, esto es una prueba"
}

// Solo te llega a ti → sin riesgo
```

#### 🔴 RIESGO ALTO - NUNCA hacer sin backup

```sql
-- ❌ NUNCA sin backup
DELETE FROM membership_leads WHERE status = 'old';

-- ✅ SIEMPRE con verificación previa
SELECT COUNT(*) FROM membership_leads WHERE status = 'old';
-- Ver cuántos se afectarían ANTES de borrar

-- ✅ Hacer backup antes
heroku pg:backups:capture --app coworkia-agent
-- AHORA SÍ puedes hacer DELETE
```

---

## 🎓 CREAR TESTS NUEVOS

### Plantilla para Test de Integración

```javascript
// tests/integration/nuevo-feature.test.js
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Nuevo Feature - Integración', () => {
  
  beforeAll(async () => {
    // Setup: conectar DB de prueba, limpiar datos viejos
  });

  afterAll(async () => {
    // Cleanup: cerrar conexiones, limpiar DB
  });

  test('debe hacer X cuando recibe Y', async () => {
    // Arrange: preparar datos
    const input = { ... };
    
    // Act: ejecutar acción
    const result = await nuevaFuncion(input);
    
    // Assert: verificar resultado
    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
  });

  test('debe fallar gracefully cuando falta campo requerido', async () => {
    const invalidInput = { /* sin campo crítico */ };
    
    await expect(nuevaFuncion(invalidInput))
      .rejects
      .toThrow('Campo requerido faltante');
  });
});
```

### Comando para Crear Tests Automáticamente (Autopilot)

**En el chat de autopilot**:
```
crea tests de integración para [nombre de feature]

Archivo: tests/integration/[feature]-integration.test.js
Casos:
- Happy path (flujo exitoso)
- Error handling (campos faltantes, timeouts)
- Edge cases (valores límite, null, undefined)

Formato: Jest
Mocks: Wassenger, OpenAI, DB
```

---

## 📊 MÉTRICAS DE CALIDAD

### Cobertura Esperada (Goals)

- **Funciones críticas**: 100% (autenticación, pagos, confirmaciones)
- **Flujos principales**: 80%+ (Aurora, Aluna end-to-end)
- **Código general**: 60%+ (helpers, utilidades)

### Herramientas de Cobertura

```bash
# Instalar (si no existe)
npm install --save-dev jest-coverage

# Ejecutar con cobertura
npm test -- --coverage

# Output esperado:
# File                 | % Stmts | % Branch | % Funcs | % Lines
# ---------------------|---------|----------|---------|--------
# alunaRepository.js   |   85.2  |   78.3   |   90.1  |   84.7
# wassenger.js         |   72.1  |   65.4   |   70.8  |   71.9
```

---

## 🐛 DEBUGGING DE TESTS QUE FALLAN

### 1. Leer el Error Completo

```bash
npm test -- --verbose
# → Muestra cada test con detalles
```

**Errores comunes**:

```
❌ "Cannot connect to database"
   → Verificar DATABASE_URL en .env

❌ "Timeout exceeded (5000ms)"
   → Función tarda mucho, aumentar timeout:
   test('...', async () => { ... }, 10000);  // 10s

❌ "Module not found: 'email-service'"
   → Verificar path de import:
   import { ... } from '../src/servicios/email-service.js'
```

### 2. Usar console.log Estratégico

```javascript
test('debe enviar email', async () => {
  const result = await sendEmail({ to: 'test@example.com' });
  
  console.log('📧 Result:', JSON.stringify(result, null, 2));
  
  expect(result.sent).toBe(true);
});
```

### 3. Tests en Aislamiento

```bash
# Solo correr UN test
npm test -- tests/integration/aluna-integration.test.js

# Solo correr tests que contengan "keyword"
npm test -- --testNamePattern="keyword"
```

---

## 🎯 BEST PRACTICES

### ✅ DO

- **Nombrar tests descriptivamente**: `'debe enviar email cuando lead está en negotiating'`
- **Un concepto por test**: No mezclar validación + envío en mismo test
- **Usar mocks para externos**: No llamar WhatsApp/OpenAI real en tests
- **Cleanup después**: Borrar datos de prueba creados
- **Tests rápidos**: < 5s por test, máx 30s toda la suite

### ❌ DON'T

- **Tests frágiles**: No depender de orden de ejecución
- **Hard-coded values**: Usar variables, no `"test@example.com"` literal
- **Tests sin assertions**: Cada test debe tener `expect()`
- **Ignorar tests que fallan**: Si falla, arreglarlo o comentar por qué se skip
- **Tests en producción**: Dividir DB de test vs producción

---

## 🚀 CI/CD FUTURO (Opcional)

### GitHub Actions (Recomendado)

**Crear**: `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
      - run: npm run lint
```

**Beneficio**: Tests corren automáticamente en cada push. Si fallan, GitHub te avisa ANTES de merge.

---

## 📋 COMANDOS RÁPIDOS

```bash
# Correr todos los tests
npm test

# Tests en modo watch (re-run al guardar)
npm test -- --watch

# Solo tests de Aluna
npm test -- aluna

# Con cobertura
npm test -- --coverage

# Verbose (ver cada test)
npm test -- --verbose

# Un solo archivo
npm test -- tests/integration/aurora-integration.test.js

# Crear nuevo test (autopilot)
# En chat: "crea test para [feature]"
```

---

## 💡 TIPS FINALES

1. **Tests primero, código después**: TDD = menos bugs
2. **Tests son documentación**: Si alguien lee tus tests, entiende qué hace el código
3. **Confía en tus tests**: Si pasan, deployas con confianza
4. **Tests fallan → no deployas**: NUNCA ignorar tests rojos

**Recuerda**: 1 hora escribiendo tests ahora = 10 horas debugging en producción después. 💪
