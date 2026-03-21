---
name: get-shit-done
description: Protocolo de ejecución rápida sin análisis parálisis. Actívalo cuando necesitas moverse fast, terminar un bloque rápido, o no enredarte en sobreingenería. Máxima velocidad con mínimo desperdicio.
applyTo: "**/*.js,**/*.html,planes-de-vuelo/**"
---

# GET SHIT DONE - Protocolo de Ejecución Rápida

## 🎯 Principio Fundamental

**Build first. Perfect later. Ship it.**

Este skill existe para combatir la parálisis por análisis y la sobreingenería.
Cuando Diego dice "Get shit done" o "GSD", el agente entra en modo ejecución pura.

---

## ⚡ MODO GSD - REGLAS DE EJECUCIÓN

### Las 5 Reglas de Oro

```
1. Si funciona, es suficiente
2. Si ya existe, reutiliza (ver DONT-REPEAT-YOURSELF)
3. Si puedes hacer en 30min, hazlo ahora, no planifiques
4. Si tarda más de 2h → divide en bloques de 30min cada uno
5. Si dudarías más de 3 minutos → commit lo que hay y sigue
```

### El Anti-Patrón a Detectar y Evitar

❌ **NO hacer esto**:
- "Podríamos refactorizar X para que sea más clean..."
- "Sería mejor crear una abstracción que..."
- "Antes de implementar B, deberíamos revisar A, C, D..."
- Buscar la solución perfecta antes de tener una solución funcional
- Agregar error handling para casos que nunca van a pasar
- Crear helpers para una cosa que solo se usa una vez

✅ **SÍ hacer esto**:
- Implementar la versión más simple que funcione
- Commit cada bloque terminado (no esperar a que "esté listo")
- Tests básicos que confirman que funciona, no edge cases
- Variables con nombres claros, no arquitectura perfecta

---

## 🏃 FLUJO GSD POR TIPO DE TAREA

### Nuevo Endpoint API (objetivo: 20min)
```
1. Copiar un endpoint existente similar (2min)
2. Cambiar query + lógica (10min)
3. Test manual con curl/browser (3min)
4. Commit (2min)
5. Siguiente tarea
```

### Nuevo Cron Job / Automatización (objetivo: 30min)
```
1. Buscar cron existente en index.js (2min)
2. Copiar patrón, cambiar query + template (15min)
3. Verificar cron syntax en crontab.guru (1min)
4. Test: ejecutar función manualmente (5min)
5. Commit (2min)
```

### Nuevo Servicio / Lógica de Negocio (objetivo: 45min)
```
1. Buscar servicio similar (aluna-followup-service.js, aurora-followup-service.js)
2. Copiar estructura, adaptar lógica (25min)
3. Agregar al index.js o donde corresponda (5min)
4. Test básico (10min)
5. Commit (2min)
```

### Dashboard HTML / Frontend (objetivo: 45min)
```
1. Copiar aluna-proformas.html como base (2min)
2. Cambiar colores, labels, IDs, funciones (20min)
3. Adaptar JS para los nuevos endpoints (15min)
4. Verificar en browser (5min)
5. Commit (2min)
```

### Nueva Columna en BD (objetivo: 10min)
```
1. Buscar migration existente (2min)
2. ALTER TABLE ADD COLUMN en initDatabase() (3min)
3. Actualizar query relacionada (3min)
4. Test: deploy + verificar columna existe (2min)
```

---

## 📦 PATRONES COPY-PASTE DEL PROYECTO

### Cron Job → Copiar de index.js
```javascript
// PATRÓN de cron existente (copiar, no reinventar)
cron.schedule('0 10 * * *', async () => {
  try {
    console.log('[CRON] Ejecutando [nombre]...');
    const results = await [nombreRepository].find[Nombre]Pending();
    for (const item of results) {
      await [nombreService].send[Tipo](item);
    }
    console.log(`[CRON] [nombre]: ${results.length} procesados`);
  } catch (error) {
    console.error('[CRON] Error en [nombre]:', error.message);
  }
});
```

### Endpoint API → Copiar de endpoints-api/
```javascript
// PATRÓN de endpoint GET (copiar, no reinventar)
router.get('/api/[agente]/[recurso]', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const data = await [agente]Repository.findAll({ status, limit });
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('[API] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Función de Repository → Copiar de alunaRepository.js
```javascript
// PATRÓN de query (copiar, no reinventar)
async find[Nombre]Pending() {
  const result = await pool.query(`
    SELECT * FROM [tabla]
    WHERE [condicion] = $1
    AND [campo]_sent_at IS NULL
    AND created_at < NOW() - INTERVAL '[n] hours'
    ORDER BY created_at ASC
    LIMIT 100
  `, [valor]);
  return result.rows;
},
```

---

## 🎯 CHECKLIST GSD ANTES DE COMMIT

```
[ ] ¿Funciona? (prueba rápida)
[ ] ¿No rompe lo que ya funcionaba? (no hace falta test completo, sentido común)
[ ] ¿El commit message es claro? (ej: "feat: Aurora +1h followup cron + template")
[ ] ¿Tiempo en este bloque < 45min? → Si sí, commit y siguiente
```

---

## 🚨 SEÑAL DE ALERTA - SALIR DE GSD MODE

Si alguna de estas situaciones ocurre, **PARAR y preguntar a Diego**:
- El cambio requiere modificar > 5 archivos a la vez
- Necesita cambiar arquitectura de BD existente (no solo agregar columnas)
- Hay un bug que no es reproducible
- Se necesita integrar una API externa nueva (no Wassenger, no OpenAI)
- Algo podría romper producción (Heroku live)

---

## 📊 MÉTRICAS GSD

| Tarea | Tiempo Objetivo | Si tarda más |
|-------|----------------|--------------|
| Endpoint simple | 20min | Dividir en sub-tareas |
| Cron job | 30min | Hay algo complejo, parar y revisar |
| Servicio nuevo | 45min | Buscar patrón más cercano |
| Dashboard HTML | 45min | Quizás hay demasiados cambios |
| Feature completa | 2-3h | Esto es 3-4 bloques GSD |

---

## 🔗 SKILLS COMPLEMENTARIOS

- **DONT-REPEAT-YOURSELF**: Antes de escribir código nuevo, buscar si ya existe
- **coworkia-autopilot**: Para sesiones de ejecución extendida sin supervisión
- **coworkia-planning**: Para organizar los bloques antes de ejecutar
