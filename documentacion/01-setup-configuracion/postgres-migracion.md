# 🔄 Migración de Esquema PostgreSQL

## Problema

El esquema de PostgreSQL en producción (Heroku) estaba desincronizado con SQLite (desarrollo local), causando:
- Columnas faltantes (`active_agent`, `duration_hours`, `payment_method`, etc.)
- Tipo incorrecto de `reservations.id` (SERIAL vs TEXT)
- Tablas faltantes (`reservation_state`, `partial_forms`)
- Estructura incorrecta de `pending_confirmations`

## Soluciones

### Opción 1: Reset Completo (RECOMENDADO para desarrollo/testing)

**⚠️ BORRA TODOS LOS DATOS**

```bash
# Ejecutar script automatizado
./scripts/reset-postgres-heroku.sh

# O manualmente:
heroku pg:reset DATABASE --confirm coworkia-agent -a coworkia-agent
heroku restart -a coworkia-agent
```

**Ventajas:**
- ✅ Rápido y simple
- ✅ Garantiza esquema limpio
- ✅ No requiere migración manual

**Desventajas:**
- ❌ Pierde todos los datos existentes

---

### Opción 2: Migración Manual (para preservar datos)

Ejecuta el script de migración que aplica cambios incrementales:

```bash
# En Heroku (preserva datos)
heroku run node scripts/migrate-postgres-schema.js -a coworkia-agent
```

**El script hace:**

1. ✅ Agrega `active_agent` a tabla `users`
2. ✅ Convierte `reservations.id` de INTEGER a TEXT
3. ✅ Agrega columnas nuevas a `reservations`:
   - `duration_hours`, `guest_count`, `was_free`
   - `payment_status`, `payment_data`, `payment_method`
   - `hot_desk_number`, `calendar_event_id`
4. ✅ Crea tablas nuevas: `reservation_state`, `partial_forms`
5. ✅ Reestructura `pending_confirmations` (PK en `user_phone`)
6. ✅ Convierte `interactions.meta` de JSONB a TEXT
7. ✅ Crea índices faltantes

**Ventajas:**
- ✅ Preserva datos existentes
- ✅ Migración transaccional (ROLLBACK en caso de error)
- ✅ Verifica cada cambio antes de aplicarlo

**Desventajas:**
- ⚠️ Más complejo
- ⚠️ Puede fallar si hay conflictos de datos

---

## Verificación Post-Migración

```bash
# Ver logs para confirmar éxito
heroku logs --tail -a coworkia-agent

# Conectar a PostgreSQL para verificar esquema
heroku pg:psql -a coworkia-agent

# Dentro de psql:
\dt                    -- Listar tablas
\d users              -- Ver estructura de users
\d reservations       -- Ver estructura de reservations
\d reservation_state  -- Ver nueva tabla
\d partial_forms      -- Ver nueva tabla
```

---

## Cambios Aplicados (v220)

### `users` tabla
```sql
-- Agregado:
active_agent TEXT DEFAULT 'AURORA'
```

### `reservations` tabla
```sql
-- Cambiado:
id TEXT PRIMARY KEY  -- antes: SERIAL

-- Agregados:
duration_hours INTEGER NOT NULL DEFAULT 2,
guest_count INTEGER DEFAULT 0,
was_free BOOLEAN DEFAULT FALSE,
payment_status TEXT DEFAULT 'pending',
payment_data TEXT,
payment_method TEXT,
hot_desk_number INTEGER,
calendar_event_id TEXT
```

### `pending_confirmations` tabla
```sql
-- Reestructurada:
user_phone TEXT PRIMARY KEY,  -- antes: id SERIAL
reservation_data TEXT NOT NULL  -- antes: JSONB
```

### `interactions` tabla
```sql
-- Cambiado:
meta TEXT  -- antes: JSONB
```

### Tablas nuevas creadas:
- ✅ `reservation_state` (flags de estado temporal)
- ✅ `partial_forms` (formularios guardados)

---

## Recomendación

Para **desarrollo/testing**: Usa **Opción 1** (reset completo)

Para **producción con datos reales**: Usa **Opción 2** (migración manual)

---

## Troubleshooting

### Error: "relation does not exist"
→ Ejecutar migración o reset

### Error: "column does not exist"
→ El esquema no está actualizado, ejecutar migración

### Error: "type mismatch on id"
→ `reservations.id` no fue migrado correctamente, usar reset

### Ver estado actual del esquema:
```bash
heroku run node scripts/migrate-postgres-schema.js -a coworkia-agent
```
(El script muestra el estado actual aunque no aplique cambios)
