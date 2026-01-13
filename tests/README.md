# 🧪 Tests Organization

Tests organizados por tipo y cobertura para mantener calidad del código.

## 📁 Estructura

```
tests/
├── unit/           → Tests unitarios (13 tests)
├── integration/    → Tests de integración (1 test)
├── e2e/           → Tests end-to-end (1 test)
└── manual/        → Tests manuales documentados
```

---

## ✅ unit/ - Tests Unitarios

Tests de funciones y módulos individuales aislados.

| Test | Descripción | Módulos Probados |
|------|-------------|------------------|
| `aurora-validation-errors.test.js` | Validación de errores Aurora | Validaciones de entrada |
| `axel-agent.test.js` | Lógica del agente Axel | axel.js, flujo cotización |
| `cancelacion.test.js` | Flujo de cancelación | Sistema de cancelación |
| `confirmation-flow.test.js` | Flujo de confirmación | confirmation-flow.js |
| `confirmations.test.js` | Sistema de confirmaciones | Confirmaciones pendientes |
| `intentions.test.js` | Detección de intenciones | detectar-intencion.js |
| `multiple-reservations.test.js` | Múltiples reservas | Lógica reservas múltiples |
| `partial-form-regression.test.js` | Formularios parciales | partial-reservation-form.js |
| `payment-transcription.test.js` | Transcripción pagos | payment-receipts.js |
| `pricing.test.js` | Cálculos de precios | Sistema pricing |
| `security.test.js` | Seguridad y validaciones | Middleware seguridad |
| `time-normalization.test.js` | Normalización tiempos | Utils de tiempo |

**Ejecutar:**
```bash
npm test tests/unit/
```

---

## 🔗 integration/ - Tests de Integración

Tests que prueban la interacción entre múltiples módulos.

| Test | Descripción | Módulos Integrados |
|------|-------------|-------------------|
| `handoff-system.test.js` | Sistema de handoffs | detectar-intencion + orquestador + agentes |

**Ejecutar:**
```bash
npm test tests/integration/
```

---

## 🎯 e2e/ - Tests End-to-End

Tests de flujos completos desde entrada hasta salida.

| Test | Descripción | Flujo Completo |
|------|-------------|----------------|
| `e2e-reservation-flow.test.js` | Flujo completo reserva | Wassenger → Aurora → DB → Respuesta |

**Ejecutar:**
```bash
npm test tests/e2e/
```

---

## 📋 manual/ - Tests Manuales

Documentación de tests manuales para casos que requieren interacción humana.

Ver archivos en `tests/manual/` para instrucciones específicas de cada test manual.

---

## 🚀 Comandos Útiles

```bash
# Todos los tests
npm test

# Solo unitarios
npm test tests/unit/

# Solo integración
npm test tests/integration/

# Solo e2e
npm test tests/e2e/

# Test específico
npm test tests/unit/pricing.test.js

# Con coverage
npm run test:coverage

# Watch mode (desarrollo)
npm test -- --watch

# Con verbose output
npm test -- --verbose
```

---

## 📊 Cobertura de Tests

```bash
# Generar reporte de coverage
npm run test:coverage

# Ver reporte en browser
open coverage/lcov-report/index.html
```

---

## ✍️ Escribir Nuevos Tests

### Test Unitario
```javascript
// tests/unit/mi-modulo.test.js
import { miFuncion } from '../../src/modulo.js';

describe('miFuncion', () => {
  test('debe retornar resultado esperado', () => {
    const resultado = miFuncion(input);
    expect(resultado).toBe(expectedOutput);
  });
});
```

### Test de Integración
```javascript
// tests/integration/mi-integracion.test.js
import { moduloA } from '../../src/moduloA.js';
import { moduloB } from '../../src/moduloB.js';

describe('Integración ModuloA + ModuloB', () => {
  test('debe funcionar end-to-end', async () => {
    const resultadoA = await moduloA.procesar(data);
    const resultadoFinal = await moduloB.procesar(resultadoA);
    expect(resultadoFinal).toMatchObject(expected);
  });
});
```

---

## 🎯 Guías de Testing

### Qué poner en unit/
- Funciones puras
- Validaciones
- Parsers
- Cálculos
- Lógica de negocio aislada

### Qué poner en integration/
- Flujos entre módulos
- Interacciones agentes
- Handoffs
- Coordinación de sistemas

### Qué poner en e2e/
- Flujos completos usuario
- Webhook → Procesamiento → Respuesta
- Casos de uso reales
- Escenarios de producción

### Qué poner en manual/
- Tests que requieren setup especial
- Tests de servicios externos (Gmail, Calendar)
- Tests de UI/UX
- Validaciones visuales

---

**Última actualización:** v415 - Enero 2026
