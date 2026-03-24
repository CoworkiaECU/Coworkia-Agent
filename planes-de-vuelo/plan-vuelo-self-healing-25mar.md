# ✈️ Plan de Vuelo — Sistema Self-Healing Diario
**Fecha**: 25 Mar 2026  
**Objetivo**: El sistema se autodiagnostica cada noche, arma su propio plan de reparación, y te lo ofrece cuando llegas al tablero por la mañana.  
**Estimado**: 3 - 4h  
**Estado**: 🟡 PENDIENTE

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

- [ ] **1.1** Migración en `src/database/postgres-adapter.js`: crear tabla `error_events`
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

- [ ] **1.2** Crear tabla `self_healing_reports`:
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

- [ ] **1.3** Capturar errores en tiempo real: en `src/express-servidor/servidor.js` (o el entry point principal), agregar middleware de error que inserta en `error_events`:
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

- [ ] **2.1** Crear `src/cron/self-healing-cron.js` — función `analyzeFailedConversations()`

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

- [ ] **2.2** Función `analyzeErrorEvents()` — leer tabla `error_events` últimas 24h
  - Agrupar por `source` + `error_type`
  - Identificar los top 5 errores por frecuencia
  - Detectar si algún error afectó a múltiples usuarios

---

### 🟨 Bloque 3: Generador de plan de reparación con OpenAI (45 min)

- [ ] **3.1** Función `generateRepairPlan(errorSummary, failedConversations)`:
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

- [ ] **3.2** Función `writePlanFile(issues, date)`:
  - Genera `planes-de-vuelo/plan-vuelo-repair-[YYYY-MM-DD].md`
  - Formato idéntico al de otros planes de vuelo (con bloques, checkboxes, contexto)
  - Si no hay issues → no crear el archivo (no hacer ruido innecesario)

- [ ] **3.3** Guardar resultado en `self_healing_reports`:
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

- [ ] **4.1** En `src/cron/daily-report.js`, función `sendDailyReport()`:
  - Leer el `self_healing_reports` de hoy/ayer
  - Si `errors_found > 0` o `conversations_failed > 0`:
    - Agregar al mensaje WA: `"\n🔧 Auto-diagnóstico: N errores detectados\n→ Plan de reparación: plan-vuelo-repair-[fecha].md"`
  - Si `status = 'pending'` (Diego no lo ha revisado): añadir emoji `⚠️`

- [ ] **4.2** Agregar sección en el WA de las 9 AM:
  ```
  🔧 Sistema Auto-Diagnóstico
  ⚠️ 3 errores detectados anoche
  📋 Plan de reparación listo en VS Code
  → Abre el chat y escribe "repair" para verlo
  ```

---

### 🟩 Bloque 5: Hook en copilot-instructions (15 min)

- [ ] **5.1** En `.github/copilot-instructions.md`: agregar en el PASO 2 del protocolo de inicio:

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

- [ ] **5.2** Diego puede responder desde WhatsApp `"repair"` → el comando `/status` ya está, agregar handler para `repair` en el bloque de comandos WA de Diego en `wassenger.js`:
  - Responder con el resumen del último `self_healing_reports`
  - Ofrecer activar autopilot sobre el plan de reparación

---

### 🔵 Bloque 6: Cron scheduling + arranque (20 min)

- [ ] **6.1** Registrar el cron en `src/cron/daily-report.js` (ya tiene el patrón):
  ```js
  export function startSelfHealingCron() {
    // 02:00 AM Ecuador = 07:00 UTC
    const job = new CronJob('0 7 * * *', runSelfHealing, null, true, 'America/Guayaquil');
    console.log('[SELF-HEAL] ✅ Cron configurado (02:00 AM Ecuador)');
    return job;
  }
  ```

- [ ] **6.2** Importar y arrancar en `src/express-servidor/servidor.js` (o index.js) junto a los demás crons

- [ ] **6.3** Verificar con `get_errors` que no hay errores

---

### ✅ Bloque 7: Tests + Deploy (20 min)

- [ ] **7.1** Test manual: llamar `runSelfHealing()` directamente (una vez) para verificar que genera el plan correctamente

- [ ] **7.2** `npm test` — verificar que no rompe tests existentes

- [ ] **7.3** Commit: `feat: sistema self-healing diario - diagnóstico automático y plan de reparación`

- [ ] **7.4** `git push heroku main`

- [ ] **7.5** Verificar logs post-deploy

- [ ] **7.6** Crear Magic Todo en dashboard con POST `/api/todos`

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
