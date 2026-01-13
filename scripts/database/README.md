# 🛠️ Scripts Coworkia Agent

## 📂 Estructura

### Scripts Activos (Raíz)
Herramientas de uso frecuente para operaciones y mantenimiento:

**Auditoría y Monitoreo:**
- `audit-reservations.js` - Auditar reservas del sistema
- `check-reservations.js` - Ver estado de reservas
- `check-user-reservations.js` - Reservas de usuario específico
- `check-axel-status.js` - Verificar estado de Axel (The PaintBull)
- `monitor-pending.js` - Monitorear confirmaciones pendientes

**Limpieza y Mantenimiento:**
- `cleanup-all-cache.js` - Limpiar todos los cachés
- `cleanup-expired-data.js` - Eliminar datos expirados
- `cleanup-past-reservations.js` - Limpiar reservas pasadas
- `cleanup-partial-forms.js` - Limpiar formularios parciales
- `clean-user-data.js` - Reset datos de usuario
- `clear-database.js` - Limpiar base de datos completa
- `clear-pending-confirmation.js` - Limpiar confirmaciones pendientes

**Gestión de Reservas:**
- `manage-reservations.js` - CRUD de reservas

**Deployment:**
- `deploy-heroku.sh` - Script de deploy a Heroku
- `setup-heroku-production.sh` - Setup inicial Heroku
- `reset-postgres-heroku.sh` - Reset DB Heroku
- `toggle-wassenger.sh` - Activar/desactivar Wassenger
- `update-gmail-config.sh` - Actualizar config Gmail

**Utilidades:**
- `generate-webhook-secret.js` - Generar secreto webhook
- `reset-user-via-api.sh` - Reset usuario vía API
- `reset-test-user.mjs` - Reset usuario de prueba

### 📦 Archivos

#### `migrations-archive/`
Migrations ejecutadas una sola vez (YA APLICADAS):
- `migrate-active-agent.js` - Agrega campo activeAgent
- `migrate-add-tracking-columns.js` - Agrega tracking columns
- `migrate-postgres-schema.js` - Migración SQLite → PostgreSQL
- `fix-corrupt-data.js` - Fix datos corruptos (Nov 2025)
- `fix-unique-index.js` - Fix índice único

⚠️ **NO ejecutar de nuevo** - Solo referencia histórica

#### `tests-manual/`
Scripts de testing manual para desarrollo:
- `test-aurora-local.js` - Test Aurora local
- `test-aurora-multilanguage.js` - Test multi-idioma Aurora
- `test-campaign-flow.js` - Test flujo campañas
- `test-complete-flow.js` - Test flujo completo
- `test-confirmation-fix.js` - Test confirmaciones
- `test-follow-up-local.js` - Test follow-ups
- `test-hotdesk-tracking.js` - Test tracking hot desk
- `test-integration-multilanguage.js` - Test integración multi-idioma
- `test-new-customer-flow.js` - Test clientes nuevos
- `test-overlap-logic.js` - Test lógica overlaps
- `test-payment-receipt.js` - Test recibos pago
- `test-recurring-customer.js` - Test clientes recurrentes
- `test-validations.js` - Test validaciones

💡 Para tests automatizados usa `npm test` (Jest)

## 🚀 Uso Común

```bash
# Ver reservas de usuario
node scripts/check-user-reservations.js +593987654321

# Limpiar datos expirados (recomendado: semanal)
node scripts/cleanup-expired-data.js

# Auditar sistema de reservas
node scripts/audit-reservations.js

# Deploy a producción
./scripts/deploy-heroku.sh
```

## ⚠️ Scripts Peligrosos

Estos scripts modifican/eliminan datos. Usar con precaución:
- `clear-database.js` - ⛔ ELIMINA TODA LA DB
- `cleanup-all-cache.js` - Limpia todos los cachés
- `reset-postgres-heroku.sh` - ⛔ RESETEA DB HEROKU

## 📝 Notas

- Scripts organizados: Enero 2026
- Migrations archivadas: Ya aplicadas en producción
- Tests manuales: Para desarrollo local
