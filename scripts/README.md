# 📂 Scripts Organization

Scripts organizados por categoría para fácil navegación y mantenimiento.

## 📁 Estructura

```
scripts/
├── deployment/         → Deploy y configuración de producción
├── database/          → Mantenimiento y auditoría de DB
├── testing/           → Scripts de pruebas manuales
├── maintenance/       → Limpieza y reset de datos
└── migrations/        → Migraciones de esquema DB

tests/
├── unit/             → Tests unitarios (funciones individuales)
├── integration/      → Tests de integración (múltiples módulos)
├── e2e/             → Tests end-to-end (flujos completos)
└── manual/          → Tests manuales documentados
```

---

## 🚀 deployment/

Scripts para deploy y configuración de producción en Heroku.

| Script | Descripción |
|--------|-------------|
| `deploy-heroku.sh` | Deploy automático a Heroku con validaciones |
| `setup-heroku-production.sh` | Setup inicial de app en Heroku |
| `reset-postgres-heroku.sh` | Reset completo de PostgreSQL |
| `toggle-wassenger.sh` | Activar/desactivar webhooks Wassenger |
| `update-gmail-config.sh` | Actualizar credenciales Gmail |
| `update-wassenger-validation.cjs` | Actualizar validación HMAC |

**Uso típico:**
```bash
cd scripts/deployment
./deploy-heroku.sh
```

---

## 🗄️ database/

Scripts para mantenimiento, auditoría y limpieza de base de datos.

### Auditoría y Diagnóstico
| Script | Descripción |
|--------|-------------|
| `audit-full-database.js` | Auditoría completa de integridad PostgreSQL |
| `audit-reservations.js` | Auditoría específica del sistema de reservas |
| `check-reservations.js` | Ver estado de todas las reservas activas |
| `check-user-reservations.js` | Ver reservas de usuario específico |
| `monitor-pending.js` | Monitorear confirmaciones pendientes |

### Limpieza y Mantenimiento
| Script | Descripción |
|--------|-------------|
| `cleanup-expired-data.js` | Elimina datos expirados (usado en producción) |
| `cleanup-partial-forms.js` | Limpia formularios parciales abandonados |

### Gestión de Reservas
| Script | Descripción |
|--------|-------------|
| `manage-reservations.js` | CRUD completo de reservas (usado en npm scripts) |

**Uso típico:**
```bash
# Auditar DB completo
node scripts/database/audit-full-database.js

# Ver reservas activas
node scripts/database/check-reservations.js

# Limpiar datos expirados (ejecutado automáticamente)
node scripts/database/cleanup-expired-data.js

# Gestión de reservas
npm run reservations
```

---

## 🧪 testing/

Scripts de pruebas manuales y validación de agentes.

| Script | Descripción |
|--------|-------------|
| `test-adriana-docs.js` | Test análisis de documentos Adriana |
| `test-aluna-docs.js` | Test análisis de contratos Aluna |
| `test-axel-email.js` | Test envío de emails Axel |
| `test-enzo-visual.js` | Test análisis visual Enzo |
| `test-gabi-system.js` | Test sistema completo Gabi |
| `test-gmail-simple.js` | Test conexión Gmail |
| `test-integration.js` | Test de integración general |
| `test-backup-local.sh` | Test backup local PostgreSQL |

**Uso típico:**
```bash
# Test de agente específico
node scripts/testing/test-adriana-docs.js

# Test de integración
node scripts/testing/test-integration.js
```

---

## 🔧 maintenance/

Scripts de mantenimiento, reset y generación de credenciales.

| Script | Descripción |
|--------|-------------|
| `reset-server-state.js` | Reset estado del servidor (cache, etc) |
| `reset-test-user.mjs` | Reset usuario de testing |
| `reset-to-aurora.mjs` | Resetear activeAgent a Aurora |
| `reset-user-via-api.sh` | Reset usuario vía API |
| `generate-webhook-secret.js` | Generar secreto HMAC para webhooks |
| `healthcheck.sh` | ✅ Script de healthcheck (usado por Heroku Scheduler) |

**Uso típico:**
```bash
# Reset usuario de pruebas
node scripts/maintenance/reset-test-user.mjs

# Generar nuevo webhook secret
node scripts/maintenance/generate-webhook-secret.js
```

---

## 📦 tests/

Tests automatizados organizados por tipo.

### tests/unit/ (13 tests)
Tests de funciones y módulos individuales:
- `aurora-validation-errors.test.js` - Validación de errores Aurora
- `axel-agent.test.js` - Lógica del agente Axel
- `cancelacion.test.js` - Flujo de cancelación
- `confirmation-flow.test.js` - Flujo de confirmación
- `confirmations.test.js` - Sistema de confirmaciones
- `intentions.test.js` - Detección de intenciones
- `multiple-reservations.test.js` - Múltiples reservas
- `partial-form-regression.test.js` - Formularios parciales
- `payment-transcription.test.js` - Transcripción de pagos
- `pricing.test.js` - Cálculos de precios
- `security.test.js` - Seguridad y validaciones
- `time-normalization.test.js` - Normalización de tiempos

### tests/integration/ (1 test)
Tests de integración entre módulos:
- `handoff-system.test.js` - Sistema de handoffs entre agentes

### tests/e2e/ (1 test)
Tests end-to-end de flujos completos:
- `e2e-reservation-flow.test.js` - Flujo completo de reserva

### tests/manual/
Tests manuales documentados para casos especiales

**Ejecutar tests:**
```bash
# Todos los tests
npm test

# Tests unitarios
npm test tests/unit/

# Test específico
npm test tests/unit/pricing.test.js

# Tests con coverage
npm run test:coverage
```

---

## 🎯 Guía de Uso Rápido

**Para desarrollo:**
```bash
# Ejecutar tests
npm test

# Limpiar datos de desarrollo
node scripts/database/cleanup-expired-data.js

# Reset usuario de testing
node scripts/maintenance/reset-test-user.mjs
```

**Para producción:**
```bash
# Deploy a Heroku
cd scripts/deployment
./deploy-heroku.sh

# Auditar PostgreSQL completo
node scripts/database/audit-full-database.js

# Limpiar datos expirados (ejecuta automáticamente)
node scripts/database/cleanup-expired-data.js
```

**Para debugging:**
```bash
# Ver reservas activas
node scripts/database/check-reservations.js

# Ver reservas de usuario específico
node scripts/database/check-user-reservations.js +593987654321

# Monitorear pendientes
node scripts/database/monitor-pending.js

# Auditoría completa
node scripts/database/audit-full-database.js
```

---

## ⚠️ Scripts de Producción

Los siguientes scripts están integrados en el sistema productivo:

- **`cleanup-expired-data.js`** - Ejecutado por Heroku Scheduler cada 2 horas
- **`manage-reservations.js`** - Usado vía `npm run reservations`
- **`audit-reservations.js`** - Usado vía `npm run audit`

**Siempre hacer backup antes de ejecutar scripts en producción.**

---

## 📝 Mantenimiento

**Scripts que se ejecutan automáticamente:**
- `cleanup-expired-data.js` - Cada 2 horas (Heroku Scheduler)
- Sistema de follow-up - Cada 1 hora
- Healthcheck - Cada 10 minutos

---

**Última actualización:** v753 - Febrero 2026
