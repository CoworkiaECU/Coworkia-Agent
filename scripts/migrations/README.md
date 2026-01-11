# 🔄 Scripts de Migración - Base de Datos

Esta carpeta contiene scripts de migración para actualizar la estructura de la base de datos PostgreSQL en Heroku.

## 📋 Lista de Migraciones

### 001 - Sistema Unificado de Conversaciones Multi-Agente

**Archivo:** `001-unified-conversations.js`  
**Fecha:** 2026-01-11  
**Estado:** ✅ Listo para ejecutar

**Descripción:**
Implementa el sistema unificado de conversaciones que permite:
- Separación de conversaciones por tema/contexto
- Almacenamiento de archivos (imágenes, PDFs)
- Tracking de temas activos por usuario
- Soporte nativo para múltiples agentes

**Tablas creadas:**
- `agent_conversations` - Conversaciones estructuradas
- `conversation_files` - Archivos adjuntos
- `active_topics` - Tracking de temas activos

**Modificaciones:**
- Agrega columnas `active_agents` y `context_preferences` a tabla `users`
- Migra datos existentes de `interactions` a `agent_conversations`
- Crea índices optimizados para performance

---

## 🚀 Cómo Ejecutar una Migración

### Opción 1: Localmente (conectado a Heroku)

1. **Asegurarse de tener backup:**
   ```bash
   heroku pg:backups:capture --app coworkia-agent
   ```

2. **Configurar DATABASE_URL en .env:**
   ```bash
   # En tu .env local
   DATABASE_URL=postgres://...
   ```

3. **Ejecutar migración:**
   ```bash
   node scripts/migrations/001-unified-conversations.js
   ```

### Opción 2: Directamente en Heroku

1. **Crear backup:**
   ```bash
   heroku pg:backups:capture --app coworkia-agent
   ```

2. **Ejecutar migración:**
   ```bash
   heroku run node scripts/migrations/001-unified-conversations.js --app coworkia-agent
   ```

---

## ✅ Verificación Post-Migración

Después de ejecutar una migración, verificar que todo esté correcto:

```bash
# Conectarse a la base de datos
heroku pg:psql --app coworkia-agent

# Verificar que las tablas existen
\dt

# Verificar conteo de registros
SELECT COUNT(*) FROM agent_conversations;
SELECT COUNT(*) FROM conversation_files;
SELECT COUNT(*) FROM active_topics;

# Verificar que los índices están creados
\di

# Salir
\q
```

---

## ⚠️ Importante

- **Siempre hacer backup antes de ejecutar una migración**
- Las migraciones son **transaccionales** - si algo falla, se hace rollback automático
- Las migraciones **NO eliminan** tablas legacy - se mantienen como respaldo
- Esperar confirmación de éxito antes de continuar con más cambios

---

## 📊 Estado de Migraciones

| # | Nombre | Estado | Fecha Ejecución | Notas |
|---|--------|--------|-----------------|-------|
| 001 | Conversaciones Unificadas | ⏳ Pendiente | - | Listo para ejecutar |

---

## 🔮 Próximas Migraciones

- **002** - Índices adicionales para Aurora (si es necesario)
- **003** - Sistema de notificaciones push (futuro)
- **004** - Integración con analytics (futuro)

---

## 📞 Soporte

Si una migración falla:

1. Revisar el error en la consola
2. Verificar que DATABASE_URL esté correcta
3. Confirmar que el backup existe
4. Si es necesario, restaurar desde backup:
   ```bash
   heroku pg:backups:restore --app coworkia-agent
   ```

Para más detalles, ver: [ARQUITECTURA-CONVERSACIONES-UNIFICADAS.md](../../documentacion/ARQUITECTURA-CONVERSACIONES-UNIFICADAS.md)
