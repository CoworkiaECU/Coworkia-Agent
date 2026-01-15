# Scripts Database - Coworkia Agent

Herramientas operacionales para PostgreSQL. Refactorizado en Enero 2026.

---

## Scripts Activos

### Auditoría y Diagnóstico
- **`audit-full-database.js`** - Auditoría completa PostgreSQL (estructura, índices, FK, issues)
- **`audit-reservations.js`** - Auditoría específica del sistema de reservas
- **`check-reservations.js`** - Ver estado de reservas activas
- **`check-user-reservations.js`** - Reservas de usuario específico
- **`check-axel-status.js`** - Diagnóstico estado Axel (The PaintBull)
- **`monitor-pending.js`** - Monitorear confirmaciones pendientes

### Limpieza y Mantenimiento
- **`cleanup-expired-data.js`** - Limpieza automática: confirmaciones expiradas, interacciones antiguas, reservas pasadas
- **`cleanup-partial-forms.js`** - Limpiar formularios parciales abandonados

### Gestión de Reservas
- **`manage-reservations.js`** - CRUD completo de reservas

---

## Uso Común

```bash
# Ver reservas de usuario
node scripts/database/check-user-reservations.js +593987654321

# Limpieza automática (recomendado: semanal)
node scripts/database/cleanup-expired-data.js

# Auditoría completa de PostgreSQL
node scripts/database/audit-full-database.js

# Auditoría sistema reservas
node scripts/database/audit-reservations.js
```

---

## Archivos Relacionados

### ../migrations-archive/
Migrations ejecutadas una sola vez (YA APLICADAS):
- `migrate-heroku.js` - Migración 001-unified-conversations
- `run-axel-migration.js` - Crear tabla axel_quotes  
- `cleanup-obsolete-tables.js` - Limpieza tablas legacy
- `migrate-active-agent.js` - Campo activeAgent
- `migrate-add-tracking-columns.js` - Tracking columns
- `migrate-postgres-schema.js` - SQLite → PostgreSQL
- `fix-corrupt-data.js` - Fix datos corruptos
- `fix-unique-index.js` - Fix índice único

 **NO ejecutar** - Solo referencia histórica

### ../maintenance/
Ver `scripts/maintenance/` para:
- `manual-agent-reset.js` - Reset manual de agentes (T9)
- `reset-server-state.js` - Reset estado servidor

---

## Historial de Refactor

**Enero 2026:** Limpieza exhaustiva /scripts/database
- Eliminados: 6 archivos obsoletos/duplicados/peligrosos
- Movidos: 3 migrations a archive
- Renombrado: audit-database → audit-full-database
- **Antes:** 19 archivos | **Después:** 9 archivos activos

Ver `auditoria-scripts-database.md` para análisis completo.

- Migrations archivadas: Ya aplicadas en producción
- Tests manuales: Para desarrollo local
