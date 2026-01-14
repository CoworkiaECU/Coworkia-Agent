# Auditoría /scripts/database

**Fecha:** Enero 2026  
**Archivos Analizados:** 19 (18 JS + 1 README)  
**Estado:** Completada

---

## Clasificación

### Mantener (8 archivos)
Herramientas activas de producción, bien documentadas, uso frecuente:

1. **audit-reservations.js** 
   - Auditoría completa sistema reservas
   - 206 líneas, bien estructurado
   - Uso: Producción/Debugging
   - Acción: MANTENER

2. **check-reservations.js** 
   - Verificar estado de reservas
   - Uso: Operaciones diarias
   - Acción: MANTENER

3. **check-user-reservations.js** 
   - Reservas usuario específico
   - Uso: Soporte al cliente
   - Acción: MANTENER

4. **check-axel-status.js** 
   - Diagnóstico Axel (The PaintBull)
   - 125 líneas, específico
   - Acción: MANTENER

5. **manage-reservations.js** 
   - CRUD completo reservas
   - Herramienta operacional crítica
   - Acción: MANTENER

6. **monitor-pending.js** 
   - Monitoreo confirmaciones pendientes
   - Alertas producción
   - Acción: MANTENER

7. **cleanup-partial-forms.js** 
   - Limpieza formularios incompletos
   - Mantenimiento automático
   - Acción: MANTENER

8. **README.md** 
   - Documentación completa 97 líneas
   - Índice actualizado
   - Acción: MANTENER

---

### Eliminar (5 archivos)
Scripts obsoletos, ya ejecutados en producción, o reemplazados:

9. **migrate-heroku.js** 
   - 283 líneas ejecutadas UNA VEZ
   - Migración 001-unified-conversations ya aplicada
   - Acción: MOVER �� migrations-archive/

10. **run-axel-migration.js** 
    - Migración crear tabla axel_quotes
    - Ya ejecutado en producción
    - Acción: MOVER �� migrations-archive/

11. **cleanup-obsolete-tables.js** 
    - Elimina tablas form_data, just_confirmed
    - Ejecución única, ya realizada
    - Acción: MOVER �� migrations-archive/

12. **clear-database.js**  PELIGROSO
    - Limpia TODA la DB de producción
    -  Riesgo alto
    - Sin validaciones suficientes
    - Acción: ELIMINAR (demasiado peligroso)

13. **clean-user-data.js** 
    - Reset datos usuario
    - Reemplazado por scripts/maintenance/manual-agent-reset.js (T9)
    - Acción: ELIMINAR (duplicado inferior)

---

### Investigar (6 archivos)
Necesitan análisis de duplicación/consolidación:

14. **audit-database.js** 
    - 313 líneas, auditoría completa PostgreSQL
    - Similar a audit-reservations.js
    - Decisión: Verificar si se usa vs audit-reservations
    - Acción temporal: MOVER �� temp/

15. **audit-field-usage.js** 
    - 189 líneas, auditoría campos BD vs código
    - Uso poco frecuente
    - Acción temporal: MOVER �� temp/

16. **cleanup-all-cache.js** 
    - Limpieza de cachés
    - Verificar si sistema usa caché actualmente
    - Acción temporal: MOVER �� temp/

17. **cleanup-expired-data.js** 
    - Limpieza datos expirados
    - Verificar duplicación con cleanup-partial-forms.js
    - Acción temporal: MOVER �� temp/

18. **cleanup-past-reservations.js** 
    - Limpieza reservas pasadas
    - Validar necesidad (¿se hace auto en DB?)
    - Acción temporal: MOVER �� temp/

19. **clear-pending-confirmation.js** 
    - Limpieza confirmaciones pendientes
    - Similar a cleanup-expired-data.js
    - Acción temporal: MOVER �� temp/

---

## Resumen Acciones

| Acción | Cantidad | Archivos |
|--------|----------|----------|
|  Mantener | 8 | Herramientas operacionales activas |
|  Eliminar | 2 | clear-database.js, clean-user-data.js |
|  A Archive | 3 | migrate-*.js, cleanup-obsolete-tables.js |
|  A Temp | 6 | audit-*, cleanup-* (revisar duplicación) |

---

## Ejecución

### Paso 1: Mover a migrations-archive/
```bash
mv migrate-heroku.js ../migrations-archive/
mv run-axel-migration.js ../migrations-archive/
mv cleanup-obsolete-tables.js ../migrations-archive/
```

### Paso 2: Eliminar archivos peligrosos/duplicados
```bash
rm clear-database.js
rm clean-user-data.js
```

### Paso 3: Mover a temp/ (revisión 1-2 semanas)
```bash
mv audit-database.js temp/TEMP-20250119-audit-database.js
mv audit-field-usage.js temp/TEMP-20250119-audit-field-usage.js
mv cleanup-all-cache.js temp/TEMP-20250119-cleanup-all-cache.js
mv cleanup-expired-data.js temp/TEMP-20250119-cleanup-expired-data.js
mv cleanup-past-reservations.js temp/TEMP-20250119-cleanup-past-reservations.js
mv clear-pending-confirmation.js temp/TEMP-20250119-clear-pending-confirmation.js
```

### Paso 4: Actualizar README.md
- Remover referencias a archivos eliminados
- Documentar archivos en temp/
- Añadir sección "Archivos en Revisión"

---

## Decisiones Clave

1. **clear-database.js �� ELIMINADO**  
   Razón: Demasiado peligroso sin validaciones. No hay uso legítimo en producción.

2. **clean-user-data.js �� ELIMINADO**  
   Razón: Reemplazado por manual-agent-reset.js (T9) con mejor lógica.

3. **migrations �� migrations-archive/**  
   Razón: Migrations son ejecución única. Ya aplicadas en producción.

4. **6 archivos �� temp/**  
   Razón: Posible duplicación. Necesitan análisis de uso real antes de decisión final.

---

## Resultado

**Antes:** 19 archivos (confusión, duplicados, peligros)  
**Después:** 8 archivos activos + temp/ para revisión  

**Beneficios:**
- Claridad operacional
- Eliminación riesgos (clear-database)
- Separación migrations ejecutadas
- Temp folder para decisiones informadas

---

## Próximos Pasos

1. Ejecutar movimientos/eliminaciones
2. Actualizar README.md
3. Continuar con auditoría /src/database
