# 🗃️ Skill: coworkia-database-migrations

## Propósito
Sistema de migraciones de base de datos versionadas para el proyecto Coworkia Agent. Garantiza que los cambios de esquema se apliquen exactamente una vez, en orden, de forma idempotente.

---

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/database/migrations/migration-runner.js` | Motor principal — lee archivos, aplica, registra en `_migrations` |
| `src/database/migrations/001_initial.js` | Migración baseline (no-op, tablas ya existen) |
| `src/database/migrations/template.js` | Plantilla para nuevas migraciones |

---

## Cómo funciona

1. Al arrancar el servidor (`startServer()` en `index.js`), se llama `await runMigrations()`
2. El runner crea la tabla `_migrations` si no existe
3. Escanea archivos `NNN_*.js` en el directorio de migraciones
4. Aplica solo los que **no están** en `_migrations`
5. Registra cada migración aplicada con timestamp

### Tabla de control
```sql
CREATE TABLE _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
)
```

---

## Crear una nueva migración

### Paso 1 — Copiar la plantilla
```bash
cp src/database/migrations/template.js src/database/migrations/002_descripcion.js
```
El nombre del archivo define el orden. Usar `NNN_descripcion.js` (ej: `002_add_plan_column.js`).

### Paso 2 — Implementar up() y down()
```js
// src/database/migrations/002_add_plan_column.js
export const name = '002_add_plan_column';

export async function up(db) {
  await db.run(`
    ALTER TABLE prospectos 
    ADD COLUMN IF NOT EXISTS plan VARCHAR(50)
  `);
}

export async function down(db) {
  await db.run(`
    ALTER TABLE prospectos 
    DROP COLUMN IF EXISTS plan
  `);
}
```

### Paso 3 — Verificar sintaxis
```bash
node --check src/database/migrations/002_add_plan_column.js
```

### Paso 4 — Deploy normal
```bash
git push heroku main
```
La migración se aplica automáticamente al arrancar.

---

## API del migration-runner

```js
import { runMigrations, getMigrationStatus, rollbackLast } 
  from '../database/migrations/migration-runner.js';

// Aplica migraciones pendientes (llamado automáticamente en boot)
await runMigrations();

// Estado de migraciones (usado por /migrate status desde WA)
const status = await getMigrationStatus();
// { applied: ['001_initial'], pending: [], dbOk: true }

// Rollback de la última migración (solo NON-PRODUCTION)
await rollbackLast();
```

---

## Comando WhatsApp: `/migrate status`

Solo `DIEGO_PERSONAL_PHONE` puede ejecutarlo.

Respuesta de ejemplo:
```
📊 Estado de Migraciones

✅ Aplicadas (1):
  • 001_initial

⏳ Pendientes: ninguna

🗄️ DB: OK
```

---

## Reglas importantes

- **NUNCA borrar** archivos de migración ya aplicados en producción
- `rollbackLast()` solo funciona en `NODE_ENV !== 'production'`
- Migraciones deben ser **idempotentes**: usar `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`
- Cada migración tiene una sola responsabilidad (1 tabla o 1 columna)
- Numeración secuencial: `001_`, `002_`, `003_`, ...

---

## Diagnóstico de problemas

### Migración falló al arrancar
Buscar en logs de Heroku:
```bash
heroku logs --app coworkia-agent --num 50 | grep -i migration
```

### Verificar estado desde WA
Enviar `/migrate status` al bot desde `DIEGO_PERSONAL_PHONE`.

### Migración atascada
Si una migración dejó la DB en estado inconsistente en dev:
```bash
# En psql local:
DELETE FROM _migrations WHERE name = '002_nombre';
# Corregir el error en el archivo
# Reiniciar servidor
```
