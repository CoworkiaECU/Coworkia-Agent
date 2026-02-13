# Scripts Database - Coworkia Agent

Herramientas operacionales para PostgreSQL. Actualizado Febrero 2026.

---

## 📁 Scripts Activos (8)

### Auditoría y Diagnóstico
- **`audit-full-database.js`** - Auditoría completa PostgreSQL (estructura, índices, FK, performance)
- **`audit-reservations.js`** - Auditoría específica del sistema de reservas
- **`check-reservations.js`** - Ver estado de todas las reservas activas
- **`check-user-reservations.js`** - Ver reservas de usuario específico
- **`monitor-pending.js`** - Monitorear confirmaciones pendientes

### Limpieza y Mantenimiento
- **`cleanup-expired-data.js`** - Limpieza automática: confirmaciones expiradas, interacciones antiguas, reservas pasadas (usado en producción)
- **`cleanup-partial-forms.js`** - Limpiar formularios parciales abandonados

### Gestión de Reservas
- **`manage-reservations.js`** - CRUD completo de reservas (usado en npm scripts)

---

## 🚀 Uso Común

```bash
# Ver reservas activas
node scripts/database/check-reservations.js

# Ver reservas de usuario específico
node scripts/database/check-user-reservations.js +593987654321

# Limpieza automática (ejecutado por Heroku Scheduler)
node scripts/database/cleanup-expired-data.js

# Auditoría completa de PostgreSQL
node scripts/database/audit-full-database.js

# Auditoría sistema de reservas
node scripts/database/audit-reservations.js

# Gestión de reservas (CRUD)
npm run reservations
```

---

## 📦 Scripts de Producción

Los siguientes scripts están integrados en el sistema:

- **`cleanup-expired-data.js`** → `npm run cleanup` y Heroku Scheduler
- **`manage-reservations.js`** → `npm run reservations`
- **`audit-reservations.js`** → `npm run audit`

---

## 📝 Notas

- Todos los scripts usan PostgreSQL (única base de datos)
- Conexión vía `DATABASE_URL` environment variable
- Scripts incluyen manejo de errores y logs estructurados
- **NO** ejecutar scripts de limpieza en producción sin respaldo

---

## 🗂️ Relacionados

- `../maintenance/` - Scripts de mantenimiento del sistema
- `../migrations/` - Migraciones SQL de esquema
- `../deployment/` - Scripts de deploy y configuración
