/**
 * 🔧 self-healing-cron.js — Sistema de Auto-Diagnóstico Nocturno
 *
 * Ejecuta cada noche a las 02:00 AM Ecuador (= 07:00 UTC).
 * Analiza errores de las últimas 24h, conversaciones fallidas,
 * genera un plan de reparación con OpenAI y lo guarda para revisión.
 *
 * Uso: startSelfHealingCron() desde index.js en el boot.
 */

import { CronJob } from 'cron';
import databaseService from '../database/database.js';
import { notifyRaw } from '../servicios/notification-service.js';
import { complete as generateChatCompletion } from '../servicios-ia/openai.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Análisis de Conversaciones Fallidas ─────────────────────────────────────

/**
 * Detecta conversaciones donde el usuario:
 * - Recibió "no entiendo", "lo siento", "error" del agente
 * - Envió 2+ mensajes sin respuesta del agente en >30 min
 * - Repitió la misma pregunta 3+ veces
 */
async function analyzeFailedConversations() {
  try {
    await databaseService.ensureInitialized();

    // Query 1: Mensajes de error del agente
    const errorMessages = await databaseService.all(
      `SELECT user_phone, agent, content, timestamp
       FROM conversation_history
       WHERE timestamp > NOW() - INTERVAL '24 hours'
         AND role = 'assistant'
         AND (
           content ILIKE '%no entiendo%' OR
           content ILIKE '%lo siento%' OR
           content ILIKE '%error%' OR
           content ILIKE '%intenta de nuevo%' OR
           content ILIKE '%no puedo ayudarte%'
         )
       ORDER BY timestamp DESC
       LIMIT 50`
    );

    // Query 2: Conversaciones cortadas (usuario envió múltiples mensajes sin respuesta)
    const abandonedConversations = await databaseService.all(
      `WITH user_messages AS (
         SELECT user_phone, 
                COUNT(*) as msg_count,
                MAX(timestamp) as last_msg,
                (SELECT STRING_AGG(content, ' | ' ORDER BY timestamp)
                 FROM conversation_history ch2
                 WHERE ch2.user_phone = conversation_history.user_phone
                   AND ch2.timestamp > NOW() - INTERVAL '24 hours'
                   AND ch2.role = 'user'
                 LIMIT 5) as conversation_sample
         FROM conversation_history
         WHERE timestamp > NOW() - INTERVAL '24 hours'
           AND role = 'user'
         GROUP BY user_phone
         HAVING COUNT(*) >= 2
       ),
       assistant_responses AS (
         SELECT user_phone,
                MAX(timestamp) as last_response
         FROM conversation_history
         WHERE timestamp > NOW() - INTERVAL '24 hours'
           AND role = 'assistant'
         GROUP BY user_phone
       )
       SELECT um.user_phone,
              um.msg_count,
              um.last_msg,
              um.conversation_sample,
              ar.last_response
       FROM user_messages um
       LEFT JOIN assistant_responses ar ON um.user_phone = ar.user_phone
       WHERE ar.last_response IS NULL
          OR (um.last_msg - ar.last_response) > INTERVAL '30 minutes'
       ORDER BY um.last_msg DESC
       LIMIT 30`
    );

    // Query 3: Preguntas repetidas (usuario frustrado)
    const repeatedQuestions = await databaseService.all(
      `WITH message_groups AS (
         SELECT user_phone,
                content,
                COUNT(*) as repeat_count,
                MAX(timestamp) as last_asked
         FROM conversation_history
         WHERE timestamp > NOW() - INTERVAL '24 hours'
           AND role = 'user'
           AND LENGTH(content) > 10
         GROUP BY user_phone, LOWER(TRIM(content))
         HAVING COUNT(*) >= 3
       )
       SELECT * FROM message_groups
       ORDER BY repeat_count DESC, last_asked DESC
       LIMIT 20`
    );

    return {
      errorMessages,
      abandonedConversations,
      repeatedQuestions,
      totalFailed: errorMessages.length + abandonedConversations.length + repeatedQuestions.length
    };
  } catch (err) {
    console.warn('[SELF-HEAL] ⚠️ Error analizando conversaciones:', err.message);
    return {
      errorMessages: [],
      abandonedConversations: [],
      repeatedQuestions: [],
      totalFailed: 0
    };
  }
}

// ─── Análisis de Eventos de Error ────────────────────────────────────────────

/**
 * Agrupa errores de las últimas 24h por source + error_type
 * Identifica los top 5 errores más frecuentes
 */
async function analyzeErrorEvents() {
  try {
    await databaseService.ensureInitialized();

    // Query: Agrupar errores por tipo y fuente
    const errorSummary = await databaseService.all(
      `SELECT source,
              agent,
              error_type,
              COUNT(*) as error_count,
              MAX(created_at) as last_occurrence,
              STRING_AGG(DISTINCT message, ' || ') as sample_messages
       FROM error_events
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY source, agent, error_type
       ORDER BY error_count DESC
       LIMIT 10`
    );

    // Query: Errores que afectaron a múltiples usuarios
    const multiUserErrors = await databaseService.all(
      `SELECT error_type,
              COUNT(DISTINCT user_phone) as affected_users,
              COUNT(*) as total_occurrences,
              STRING_AGG(DISTINCT user_phone, ', ') as user_phones_sample
       FROM error_events
       WHERE created_at > NOW() - INTERVAL '24 hours'
         AND user_phone IS NOT NULL
       GROUP BY error_type
       HAVING COUNT(DISTINCT user_phone) > 1
       ORDER BY affected_users DESC
       LIMIT 5`
    );

    return {
      errorSummary,
      multiUserErrors,
      totalErrors: errorSummary.reduce((sum, e) => sum + parseInt(e.error_count), 0)
    };
  } catch (err) {
    console.warn('[SELF-HEAL] ⚠️ Error analizando eventos:', err.message);
    return {
      errorSummary: [],
      multiUserErrors: [],
      totalErrors: 0
    };
  }
}

// ─── Generador de Plan de Reparación ─────────────────────────────────────────

/**
 * Usa OpenAI para analizar errores y generar plan de reparación priorizado
 */
async function generateRepairPlan(errorAnalysis, conversationAnalysis) {
  try {
    const { errorSummary, multiUserErrors, totalErrors } = errorAnalysis;
    const { errorMessages, abandonedConversations, repeatedQuestions, totalFailed } = conversationAnalysis;

    // Si no hay problemas, no generar plan
    if (totalErrors === 0 && totalFailed === 0) {
      console.log('[SELF-HEAL] ✅ No se detectaron problemas en las últimas 24h');
      return null;
    }

    // Construir contexto para OpenAI
    const errorContext = errorSummary.map(e => 
      `- ${e.source}/${e.agent || 'general'}: ${e.error_type} (${e.error_count}x) - "${e.sample_messages?.substring(0, 100)}"`
    ).join('\n');

    const conversationContext = [
      errorMessages.length > 0 ? `Mensajes de error del agente: ${errorMessages.length}` : '',
      abandonedConversations.length > 0 ? `Conversaciones abandonadas: ${abandonedConversations.length}` : '',
      repeatedQuestions.length > 0 ? `Preguntas repetidas: ${repeatedQuestions.length}` : ''
    ].filter(Boolean).join('\n');

    const prompt = `Eres el sistema de auto-diagnóstico de Coworkia Agent, un sistema multi-agente para WhatsApp Business con 8 agentes especializados.

Analiza estos errores de las últimas 24h y genera un plan de reparación priorizado.

ERRORES EN PRODUCCIÓN (${totalErrors} total):
${errorContext || 'Ninguno'}

CONVERSACIONES FALLIDAS (${totalFailed} total):
${conversationContext || 'Ninguno'}

Genera un JSON con máximo 5 issues priorizados. Cada issue debe tener:
- priority: 'critical' | 'high' | 'medium' (critical = afecta múltiples usuarios o bloquea funcionalidad core)
- title: descripción corta del problema (máx 60 caracteres)
- description: qué pasó y por qué es un problema (2-3 oraciones)
- suggested_fix: qué habría que hacer para resolverlo (específico, técnico)
- file_hint: archivo probable donde está el problema (si se puede inferir del stack trace o source)

Formato JSON esperado:
{
  "issues": [
    {
      "priority": "critical",
      "title": "OpenAI timeouts en agent Aurora",
      "description": "15 usuarios experimentaron timeouts al intentar reservar. El agente Aurora no responde después de 30s.",
      "suggested_fix": "Aumentar timeout de OpenAI de 30s a 60s, o implementar retry con backoff exponencial 3 reintentos.",
      "file_hint": "src/deteccion-intenciones/aurora.js o src/servicios-ia/openai-service.js"
    }
  ]
}

Si no hay problemas críticos, retorna {"issues": []}.`;

    const response = await generateChatCompletion(prompt, { 
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 1500
    });

    const analysisResult = JSON.parse(response);
    return analysisResult.issues || [];
  } catch (err) {
    console.error('[SELF-HEAL] ❌ Error generando plan con OpenAI:', err.message);
    return [];
  }
}

// ─── Escritura de Plan de Vuelo ──────────────────────────────────────────────

/**
 * Genera archivo markdown con el plan de reparación
 */
async function writePlanFile(issues, date) {
  if (!issues || issues.length === 0) {
    console.log('[SELF-HEAL] ✅ No hay issues - no se genera plan de vuelo');
    return null;
  }

  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const fileName = `plan-vuelo-repair-${dateStr}.md`;
  const filePath = path.join(__dirname, '../../planes-de-vuelo', fileName);

  // Generar contenido del plan
  const criticalIssues = issues.filter(i => i.priority === 'critical');
  const highIssues = issues.filter(i => i.priority === 'high');
  const mediumIssues = issues.filter(i => i.priority === 'medium');

  let content = `# 🔧 Plan de Reparación — ${dateStr}
**Generado automáticamente por Self-Healing System**  
**Fecha**: ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}

---

## 📊 Resumen

Total de issues detectados: **${issues.length}**  
- 🔴 Críticos: ${criticalIssues.length}
- 🟠 Alta prioridad: ${highIssues.length}
- 🟡 Media prioridad: ${mediumIssues.length}

---
`;

  // Función helper para renderizar issues
  const renderIssues = (issueList, emoji) => {
    if (issueList.length === 0) return '';
    
    let section = '';
    issueList.forEach((issue, idx) => {
      section += `
### ${emoji} Issue ${idx + 1}: ${issue.title}

**Problema:**  
${issue.description}

**Solución sugerida:**  
${issue.suggested_fix}

${issue.file_hint ? `**Archivo probable:** \`${issue.file_hint}\`\n` : ''}
---
`;
    });
    return section;
  };

  // Agregar issues por prioridad
  if (criticalIssues.length > 0) {
    content += '\n## 🔴 Issues Críticos\n';
    content += renderIssues(criticalIssues, '🔴');
  }

  if (highIssues.length > 0) {
    content += '\n## 🟠 Issues de Alta Prioridad\n';
    content += renderIssues(highIssues, '🟠');
  }

  if (mediumIssues.length > 0) {
    content += '\n## 🟡 Issues de Media Prioridad\n';
    content += renderIssues(mediumIssues, '🟡');
  }

  content += `
---

## ✅ Checklist de Reparación

${issues.map((issue, idx) => `- [ ] **${issue.title}** (${issue.priority})`).join('\n')}

---

**Nota:** Este plan fue generado automáticamente. Revísalo antes de ejecutarlo.
`;

  // Escribir archivo
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`[SELF-HEAL] ✅ Plan de reparación guardado: ${fileName}`);

  return fileName;
}

// ─── Job Principal ────────────────────────────────────────────────────────────

/**
 * Función principal que ejecuta todo el flujo de self-healing
 */
export async function runSelfHealing() {
  const startTime = Date.now();
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🔧 SELF-HEALING SYSTEM - Análisis Nocturno Automático     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // PASO 1: Análisis de errores y conversaciones
    console.log('[SELF-HEAL] 📊 Analizando errores de las últimas 24h...');
    const errorAnalysis = await analyzeErrorEvents();
    
    console.log('[SELF-HEAL] 💬 Analizando conversaciones fallidas...');
    const conversationAnalysis = await analyzeFailedConversations();

    console.log(`[SELF-HEAL] Resultados:`);
    console.log(`  - Errores detectados: ${errorAnalysis.totalErrors}`);
    console.log(`  - Conversaciones fallidas: ${conversationAnalysis.totalFailed}`);

    // PASO 2: Generar plan con OpenAI
    console.log('[SELF-HEAL] 🤖 Generando plan de reparación con OpenAI...');
    const issues = await generateRepairPlan(errorAnalysis, conversationAnalysis);

    // PASO 3: Escribir plan de vuelo
    const planFile = await writePlanFile(issues, today);

    // PASO 4: Guardar reporte en BD
    const summary = planFile
      ? `${issues.length} issues detectados. Ver ${planFile}`
      : 'Sistema funcionando correctamente, sin problemas detectados.';

    await databaseService.run(
      `INSERT INTO self_healing_reports (report_date, errors_found, conversations_failed, plan_file, summary, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       ON CONFLICT (report_date) DO UPDATE
       SET errors_found = $2,
           conversations_failed = $3,
           plan_file = $4,
           summary = $5`,
      [
        dateStr,
        errorAnalysis.totalErrors,
        conversationAnalysis.totalFailed,
        planFile || '',
        summary
      ]
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[SELF-HEAL] ✅ Análisis completado en ${duration}s`);
    
    if (planFile) {
      console.log(`[SELF-HEAL] 📋 Plan de reparación listo: ${planFile}`);
    } else {
      console.log('[SELF-HEAL] ✨ No se detectaron problemas - sistema saludable');
    }

    return {
      success: true,
      errorsFound: errorAnalysis.totalErrors,
      conversationsFailed: conversationAnalysis.totalFailed,
      issuesGenerated: issues?.length || 0,
      planFile
    };
  } catch (error) {
    console.error('[SELF-HEAL] ❌ Error en análisis:', error.message);
    console.error(error.stack);
    
    // Intentar notificar el error crítico
    try {
      await notifyRaw(
        `⚠️ SELF-HEALING SYSTEM FALLÓ\n\nError: ${error.message}\n\nRevisa logs en Heroku.`
      );
    } catch (notifyErr) {
      console.error('[SELF-HEAL] ❌ No se pudo notificar el error:', notifyErr.message);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

// ─── Cron Job Setup ───────────────────────────────────────────────────────────

let selfHealingJob = null;

/**
 * Inicia el cron job de self-healing (02:00 AM Ecuador)
 */
export function startSelfHealingCron() {
  if (selfHealingJob) {
    console.log('[SELF-HEAL] ⚠️ Cron ya estaba activo');
    return selfHealingJob;
  }

  // 02:00 AM Ecuador = 07:00 UTC
  selfHealingJob = new CronJob(
    '0 7 * * *',
    runSelfHealing,
    null,
    true,
    'America/Guayaquil'
  );

  console.log('[SELF-HEAL] ✅ Cron configurado (02:00 AM Ecuador)');
  return selfHealingJob;
}

/**
 * Detiene el cron job
 */
export function stopSelfHealingCron() {
  if (selfHealingJob) {
    selfHealingJob.stop();
    selfHealingJob = null;
    console.log('[SELF-HEAL] 🛑 Cron detenido');
  }
}
