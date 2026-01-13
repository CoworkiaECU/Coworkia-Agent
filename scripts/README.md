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

### Auditoría
| Script | Descripción |
|--------|-------------|
| `audit-database.js` | Auditoría completa de integridad DB |
| `audit-field-usage.js` | Análisis de uso de campos |
| `audit-reservations.js` | Auditoría de reservas |

### Consultas
| Script | Descripción |
|--------|-------------|
| `check-axel-status.js` | Ver estado de cotizaciones Axel |
| `check-reservations.js` | Ver todas las reservas |
| `check-user-reservations.js` | Ver reservas de usuario específico |
| `monitor-pending.js` | Monitorear confirmaciones pendientes |

### Limpieza
| Script | Descripción |
|--------|-------------|
| `cleanup-all-cache.js` | Limpia todos los caches |
| `cleanup-expired-data.js` | Elimina datos expirados |
| `cleanup-obsolete-tables.js` | Elimina tablas obsoletas |
| `cleanup-partial-forms.js` | Limpia formularios incompletos |
| `cleanup-past-reservations.js` | Archiva reservas pasadas |
| `clean-obsolete-files.sh` | Limpia archivos obsoletos del filesystem |
| `clean-user-data.js` | Limpia datos de usuario específico (GDPR) |
| `clear-database.js` | ⚠️ Borra TODA la base de datos |
| `clear-pending-confirmation.js` | Limpia confirmaciones pendientes |

### Gestión
| Script | Descripción |
|--------|-------------|
| `manage-reservations.js` | CRUD completo de reservas |
| `migrate-heroku.js` | Migración de datos a Heroku |
| `run-axel-migration.js` | Migrar datos legacy de Axel |

**Uso típico:**
```bash
# Auditar DB
node scripts/database/audit-database.js

# Ver reservas de hoy
node scripts/database/check-reservations.js

# Limpiar datos expirados
node scripts/database/cleanup-expired-data.js
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
# Deploy
cd scripts/deployment
./deploy-heroku.sh

# Auditar DB
node scripts/database/audit-database.js

# Limpiar datos expirados (ejecuta automáticamente vía cron)
node scripts/database/cleanup-expired-data.js
```

**Para debugging:**
```bash
# Ver reservas
node scripts/database/check-reservations.js

# Ver estado Axel
node scripts/database/check-axel-status.js

# Monitorear pendientes
node scripts/database/monitor-pending.js
```

---

## ⚠️ Scripts Peligrosos

Estos scripts hacen cambios irreversibles. Usar con precaución:

- ❌ `database/clear-database.js` - Borra TODA la base de datos
- ⚠️ `database/cleanup-obsolete-tables.js` - Elimina tablas
- ⚠️ `deployment/reset-postgres-heroku.sh` - Reset PostgreSQL en Heroku

**Siempre hacer backup antes de ejecutar scripts destructivos.**

---

## 📝 Mantenimiento

**Scripts que se ejecutan automáticamente (Cron):**
- `cleanup-expired-data.js` - Cada 2 horas
- Sistema de follow-up - Cada 1 hora
- Healthcheck - Cada 10 minutos (Heroku Scheduler)

**Scripts deprecados:**
Ver `scripts/migrations-archive/` para scripts históricos no usados.

---

**Última actualización:** v415 - Enero 2026
