# 🔄 Scripts de Migración - Base de Datos

Esta carpeta contiene migraciones SQL ejecutadas en PostgreSQL (Heroku). Actualizado Febrero 2026.

---

## 📁 Migraciones SQL (7)

Todas las migraciones están **APLICADAS** en producción:

1. **`002-add-follow-up-columns.sql`** - Sistema follow-up automático
2. **`003-add-missing-columns.sql`** - Columnas faltantes en tablas existentes
3. **`004-add-payphone-fields.sql`** - Campos específicos para Payphone
4. **`006-create-photo-sessions-table.sql`** - Tabla sesiones fotos Axel
5. **`007-add-collision-session-fingerprint.sql`** - Control colisión sesiones
6. **`create-axel-quotes-table.sql`** - Tabla cotizaciones Axel
7. **`README.md`** - Esta documentación

---

## 🚀 Cómo Ejecutar una Migración SQL

### Opción 1: Heroku CLI (Recomendado)

```bash
# 1. Crear backup
heroku pg:backups:capture --app coworkia-agent

# 2. Ejecutar migración SQL
heroku pg:psql --app coworkia-agent < scripts/migrations/tu-migracion.sql

# 3. Verificar
heroku pg:psql --app coworkia-agent
\dt
\q
```

### Opción 2: Localmente (con DATABASE_URL)

```bash
# Asegurarse de tener DATABASE_URL en .env
psql $DATABASE_URL < scripts/migrations/tu-migracion.sql
```

---

## ✅ Verificación Post-Migración

```bash
# Conectarse a PostgreSQL
heroku pg:psql --app coworkia-agent

# Ver todas las tablas
\dt

# Verificar estructura de tabla específica
\d nombre_tabla

# Verificar índices
\di

# Salir
\q
```

---

## 📝 Notas Importantes

- **Todas las migraciones en esta carpeta YA ESTÁN APLICADAS en producción**
- **Siempre hacer backup antes de ejecutar SQL en producción:**  
  `heroku pg:backups:capture --app coworkia-agent`
- Las migraciones SQL **NO** son automáticamente transaccionales - usar `BEGIN; ... COMMIT;` si es crítico
- Mantener archivos SQL limpios y bien documentados
- NO ejecutar migraciones antiguas de nuevo a menos que sea necesario

---

## 🗂️ Relacionados

- `../database/` - Scripts operacionales y auditoría
- `../maintenance/` - Scripts de mantenimiento del sistema
- `../../documentacion/03-arquitectura-sistemas/` - Documentación arquitectura

---

## 🔧 Rollback de Migración

Si una migración causa problemas:

```bash
# Opción 1: Restaurar último backup
heroku pg:backups:restore --app coworkia-agent

# Opción 2: Ejecutar SQL manual de rollback
heroku pg:psql --app coworkia-agent
DROP TABLE nombre_tabla; -- Con cuidado!
```

