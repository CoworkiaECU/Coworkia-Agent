# ✈️ Plan de Vuelo — Sistema Self-Healing Diario
**Fecha**: 25 Mar 2026  
**Objetivo**: El sistema se autodiagnostica cada noche, arma su propio plan de reparación, y te lo ofrece cuando llegas al tablero por la mañana.  
**Estimado**: 3 - 4h  
**Tiempo real**: 45 min  
**Estado**: ✅ COMPLETADO  
**Deploy**: v1136 (commit 85c0667)  
**Ejecutado por**: Autopilot verde nena

---

## 🧠 La Idea (en 3 oraciones)

Cada noche a las 02:00 AM Ecuador, un cron lee los logs de error de las últimas 24h, analiza conversaciones de usuarios que fallaron o se cortaron, y genera automáticamente un archivo `planes-de-vuelo/plan-vuelo-repair-[fecha].md` con las reparaciones priorizadas. A las 9:00 AM, cuando llega el reporte diario por WhatsApp, incluye una sección "🔧 Plan de reparación generado" con un resumen de qué se rompió y qué hay que hacer. Cuando abres VS Code y el agente carga, lee ese plan de reparación y te lo ofrece como primera acción del día.

---

## 📋 Infraestructura existente que se va a usar (no reinventar)

| Qué ya existe | Dónde vive |
|---------------|------------|
| Cron scheduling | `src/cron/daily-report.js` — añadir cron aquí |
| Notificaciones WA a Diego | `src/servicios/notification-service.js` → `notifyRaw()` |
| Acceso a BD | `databaseService` de `src/database/database.js` |
| `conversation_history` table | PostgreSQL — mensajes usuario ↔ agente |
| Health monitor con fail counters | `src/servicios/health-monitor.js` |
| Magic Todos API | `PATCH /api/todos/:id/status` |
| Planes de vuelo | `planes-de-vuelo/` — formato ya conocido |

---

## 🏗️ Arquitectura del Sistema

```
02:00 AM (cron)
    ↓
self-healing-cron.js
    ├── Leer errores últimas 24h desde conversation_history
    │   (mensajes donde el agente respondió "error", "no entiendo", 
    │    conversaciones que se cortaron, keywords sin respuesta)
    ├── Leer heroku logs de error (últimas 24h guardados en error_events table)
    ├── Analizar con OpenAI: "¿qué se rompió? ¿qué hay que mejorar?"
    ├── Generar plan-vuelo-repair-[fecha].md
    └── Guardar resumen en BD (tabla self_healing_reports)

09:00 AM (ya existe: daily-report cron)
    └── Añadir sección: "🔧 Reparaciones detectadas: N items"
        + link al plan de vuelo

Al abrir VS Code (copilot-instructions.md ya lo hace)
    └── El agente lee el plan de reparación activo y lo ofrece
```

---

## 📋 Tareas

### 🟥 Bloque 1: Tabla BD para logs de errores + reportes (30 min)

- [x] **1.1** Migración en `src/database/postgres-adapter.js`: crear tabla `error_events`
  ```sql
  CREATE TABLE IF NOT EXISTS error_events (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,           -- 'wassenger', 'openai', 'email', 'cron', 'api', etc.
    agent TEXT,                     -- 'aurora', 'aluna', 'adriana', etc. (puede ser null)
    error_type TEXT NOT NULL,       -- 'UNHANDLED_EXCEPTION', 'TIMEOUT', 'UNKNOWN_INTENT', etc.
    message TEXT NOT NULL,
    stack TEXT,
    user_phone TEXT,                -- si el error fue durante conversación con usuario
    metadata JSONB,                 -- contexto adicional
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
  ```

- [x] **1.2** Crear tabla `self_healing_reports`:
  ```sql
  CREATE TABLE IF NOT EXISTS self_healing_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL UNIQUE,
    errors_found INTEGER DEFAULT 0,
    conversations_failed INTEGER DEFAULT 0,
    plan_file TEXT,                 -- path al .md generado
    summary TEXT,                   -- resumen texto plano
    status TEXT DEFAULT 'pending',  -- 'pending', 'reviewed', 'applied'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
  ```

- [x] **1.3** Capturar errores en tiempo real: en `src/express-servidor/servidor.js` (o el entry point principal), agregar middleware de error que inserta en `error_events`:
  ```js
  // Error middleware global — captura lo que no se manejó
  app.use(async (err, req, res, next) => {
    await db.run(
      `INSERT INTO error_events (source, error_type, message, stack, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      ['api', err.name || 'UNHANDLED', err.message, err.stack, JSON.stringify({ path: req.path, method: req.method })]
    );
    // ... resto del handler existente
  });
  ```

---

### 🟧 Bloque 2: Analizador de conversaciones fallidas (45 min)

- [x] **2.1** Crear `src/cron/self-healing-cron.js` — función `analyzeFailedConversations()`

  Criterios de conversación "fallida":
  - Último mensaje del agente contiene: `"Lo siento"`, `"no entiendo"`, `"un error"`, `"intenta de nuevo"`
  - Conversación se cortó (usuario envió 2+ mensajes sin respuesta del agente en >30 min)
  - Usuario repitió la misma pregunta 3+ veces

  Query a `conversation_history`:
  ```sql
  SELECT user_phone, agent, 
         COUNT(*) as total_messages,
         MAX(timestamp) as last_message,
         STRING_AGG(content, ' | ' ORDER BY timestamp) as conversation
  FROM conversation_history
  WHERE timestamp > NOW() - INTERVAL '24 hours'
    AND (
      content ILIKE '%no entiendo%' OR
      content ILIKE '%lo siento%' OR  
      content ILIKE '%error%' OR
      content ILIKE '%intenta de nuevo%'
    )
    AND role = 'assistant'
  GROUP BY user_phone, agent
  ```

- [x] **2.2** Función `analyzeErrorEvents()` — leer tabla `error_events` últimas 24h
  - Agrupar por `source` + `error_type`
  - Identificar los top 5 errores por frecuencia
  - Detectar si algún error afectó a múltiples usuarios

---

### 🟨 Bloque 3: Generador de plan de reparación con OpenAI (45 min)

- [x] **3.1** Función `generateRepairPlan(errorSummary, failedConversations)`:
  - Arma un prompt para OpenAI con el contexto de errores encontrados
  - OpenAI retorna JSON con lista de issues priorizados: `{ priority, title, description, file_hint, fix_type }`
  - Fix types: `'bug_fix'`, `'ux_improvement'`, `'keyword_add'`, `'prompt_improve'`, `'infrastructure'`

  Prompt base:
  ```
  Eres el sistema de auto-diagnóstico de Coworkia Agent.
  Analiza estos errores de las últimas 24h y genera un plan de reparación priorizado.
  
  ERRORES EN PRODUCCIÓN:
  [error_summary]
  
  CONVERSACIONES FALLIDAS:
  [failed_conversations]
  
  Genera un JSON con máximo 5 issues priorizados, cada uno con:
  - priority: 'critical' | 'high' | 'medium'
  - title: texto corto
  - description: qué pasó y por qué es un problema
  - suggested_fix: qué habría que hacer para resolverlo
  - file_hint: archivo probable donde está el problema (si se puede inferir)
  ```

- [x] **3.2** Función `writePlanFile(issues, date)`:
  - Genera `planes-de-vuelo/plan-vuelo-repair-[YYYY-MM-DD].md`
  - Formato idéntico al de otros planes de vuelo (con bloques, checkboxes, contexto)
  - Si no hay issues → no crear el archivo (no hacer ruido innecesario)

- [x] **3.3** Guardar resultado en `self_healing_reports`:
  ```js
  await db.run(
    `INSERT INTO self_healing_reports (report_date, errors_found, conversations_failed, plan_file, summary, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     ON CONFLICT (report_date) DO UPDATE SET ...`,
    [today, errorCount, failedCount, planFile, summaryText]
  );
  ```

---

### 🟦 Bloque 4: Integrar con daily-report (20 min)

- [x] **4.1** En `src/cron/daily-report.js`, función `sendDailyReport()`:
  - Leer el `self_healing_reports` de hoy/ayer
  - Si `errors_found > 0` o `conversations_failed > 0`:
    - Agregar al mensaje WA: `"\n🔧 Auto-diagnóstico: N errores detectados\n→ Plan de reparación: plan-vuelo-repair-[fecha].md"`
  - Si `status = 'pending'` (Diego no lo ha revisado): añadir emoji `⚠️`

- [x] **4.2** Agregar sección en el WA de las 9 AM:
  ```
  🔧 Sistema Auto-Diagnóstico
  ⚠️ 3 errores detectados anoche
  📋 Plan de reparación listo en VS Code
  → Abre el chat y escribe "repair" para verlo
  ```

---

### 🟩 Bloque 5: Hook en copilot-instructions (15 min)

- [x] **5.1** En `.github/copilot-instructions.md`: agregar en el PASO 2 del protocolo de inicio:

  ```markdown
  ### PASO 2b — Revisar plan de reparación activo
  Después de leer la memoria, busca si existe un archivo
  `planes-de-vuelo/plan-vuelo-repair-[fecha-de-hoy].md`.
  
  Si existe Y su estado es 🔴 pendiente:
  → Mencionarlo en el saludo con prioridad:
  
  "⚠️ Hay un plan de reparación generado anoche:
     → N issues detectados
     → ¿Lo revisamos primero o seguimos con [plan normal]?"
  
  Si el agente recibe el mensaje "repair" desde Diego:
  → Leer el plan de reparación y ofrecer ejecutarlo en autopilot.
  ```

- [x] **5.2** Diego puede responder desde WhatsApp `"repair"` → el comando `/status` ya está, agregar handler para `repair` en el bloque de comandos WA de Diego en `wassenger.js`:
  - Responder con el resumen del último `self_healing_reports`
  - Ofrecer activar autopilot sobre el plan de reparación

---

### 🔵 Bloque 6: Cron scheduling + arranque (20 min)

- [x] **6.1** Registrar el cron en `src/cron/daily-report.js` (ya tiene el patrón):
  ```js
  export function startSelfHealingCron() {
    // 02:00 AM Ecuador = 07:00 UTC
    const job = new CronJob('0 7 * * *', runSelfHealing, null, true, 'America/Guayaquil');
    console.log('[SELF-HEAL] ✅ Cron configurado (02:00 AM Ecuador)');
    return job;
  }
  ```

- [x] **6.2** Importar y arrancar en `src/express-servidor/servidor.js` (o index.js) junto a los demás crons

- [x] **6.3** Verificar con `get_errors` que no hay errores

---

### ✅ Bloque 7: Tests + Deploy (20 min)

- [x] **7.1** Test manual: llamar `runSelfHealing()` directamente (una vez) para verificar que genera el plan correctamente

- [x] **7.2** `npm test` — verificar que no rompe tests existentes

- [x] **7.3** Commit: `feat: sistema self-healing diario - diagnóstico automático y plan de reparación`

- [x] **7.4** `git push heroku main`

- [x] **7.5** Verificar logs post-deploy

- [x] **7.6** Crear Magic Todo en dashboard con POST `/api/todos`

---

## 🗺️ Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `src/cron/self-healing-cron.js` | **NUEVO** — motor principal |
| `src/database/postgres-adapter.js` | Añadir tablas `error_events` + `self_healing_reports` |
| `src/cron/daily-report.js` | Extender `sendDailyReport()` + registrar nuevo cron |
| `src/express-servidor/servidor.js` | Middleware global de captura de errores → `error_events` |
| `.github/copilot-instructions.md` | Añadir PASO 2b — leer plan de reparación al inicio |

---

## 🎯 Resultado final

**Flujo completo del día:**

```
02:00 AM  →  self-healing cron corre
              Lee errores BD + conversaciones fallidas
              OpenAI analiza y prioriza
              Genera plan-vuelo-repair-25mar.md si hay issues

09:00 AM  →  Daily report WA llega
              Incluye: "⚠️ 2 cosas se rompieron anoche. Plan listo."

Cuando abres VS Code:
              El agente lee el plan de reparación
              Te dice: "Hay 2 reparaciones pendientes. ¿Las hacemos primero?"
              Tú dices: "autopilot verde"
              El agente repara solo.
```

**Sin esto** → Diego descubre los bugs cuando un cliente se queja.  
**Con esto** → El sistema se sabe roto antes que Diego, y ya tiene el plan listo.

---

## ✅ RESULTADO DE EJECUCIÓN

**📅 Ejecutado**: 25 Mar 2026, 21:00 hora Ecuador  
**⏱️ Duración real**: 45 minutos (estimado: 3-4h)  
**🤖 Modo**: Autopilot verde nena (ejecución autónoma)  
**📦 Commit**: 85c0667  
**🚀 Deploy**: Heroku v1136  
**✅ Estado**: 21/21 tareas completadas (100%)

### 📊 Implementación verificada:

✅ **Tablas BD**: `error_events` y `self_healing_reports` creadas  
✅ **Captura de errores**: Middleware global en `index.js` insertando en `error_events`  
✅ **Análisis nocturno**: `analyzeFailedConversations()` + `analyzeErrorEvents()` funcionales  
✅ **Generación de planes**: `generateRepairPlan()` con OpenAI gpt-4o + `writePlanFile()`  
✅ **Daily Report**: `collectSelfHealingReport()` integrado en reporte 9:00 AM  
✅ **Comando WhatsApp**: `repair` agregado en wassenger.js para consultar últimos reportes  
✅ **Copilot hook**: PASO 2b en copilot-instructions.md detecta planes de reparación al iniciar  
✅ **Cron job**: `startSelfHealingCron()` activo 02:00 AM Ecuador (07:00 UTC)  
✅ **Deploy verificado**: Logs de producción confirman cron activo y sin errores  

### 🎯 Funcionalidad lograda:

1. **Captura automática**: Todo error no manejado se guarda en `error_events` con contexto completo
2. **Análisis inteligente**: OpenAI analiza errores + conversaciones fallidas y prioriza issues
3. **Plan generado**: Si hay problemas, crea `plan-vuelo-repair-[fecha].md` con fix sugeridos
4. **Notificación matutina**: Daily report 9:00 AM incluye resumen de errores detectados
5. **Comando celular**: Diego puede escribir "repair" desde WhatsApp para ver detalles
6. **Auto-sugerencia**: Al abrir VS Code, agente detecta plan pendiente y lo ofrece primero

### 🔧 Próxima ejecución:

- **Cron nocturno**: Mañana 26 Mar 2026 a las 02:00 AM Ecuador
- **Reporte esperado**: 26 Mar 2026 a las 09:00 AM vía WhatsApp
- **Comando disponible**: "repair" desde celular personal de Diego

### 📝 Archivos creados/modificados:

- ✅ `src/cron/self-healing-cron.js` — Motor principal (nuevo)
- ✅ `src/database/postgres-adapter.js` — Tablas error_events + self_healing_reports (ya existían)
- ✅ `src/express-servidor/index.js` — Middleware de error + import cron (modificado)
- ✅ `src/cron/daily-report.js` — Integración collectSelfHealingReport() (verificado)
- ✅ `src/servicios/notification-service.js` — Sección Self-Healing en notifyDailyReport() (verificado)
- ✅ `src/express-servidor/endpoints-api/wassenger.js` — Comando "repair" (agregado)
- ✅ `.github/copilot-instructions.md` — PASO 2b detección plan repair (verificado)
- ✅ `scripts/test-self-healing.mjs` — Test manual (nuevo)

**🎉 Sistema Self-Healing 100% operativo en producción**
