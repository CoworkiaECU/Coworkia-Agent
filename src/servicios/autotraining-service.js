/**
 * 🧠 autotraining-service.js — Sistema de Auto-Entrenamiento por Conversaciones
 *
 * Analiza conversaciones exitosas y fallidas de cada agente para generar
 * reportes de mejora. NO modifica prompts automáticamente — solo genera
 * reportes para revisión humana.
 *
 * Ejecución: Domingos 3:00 AM Ecuador (cron semanal)
 * Costo estimado: ~7 llamadas GPT-4o-mini por semana (1 por agente)
 */

import databaseService from '../database/database.js';
import { complete as generateChatCompletion } from '../servicios-ia/openai.js';
import { notifyRaw } from './notification-service.js';

// Agentes activos en el sistema
const ACTIVE_AGENTS = ['aurora', 'aluna', 'adriana', 'enzo', 'paula', 'gabi', 'axel'];

// Tablas de outcomes por agente para medir "éxito"
const AGENT_SUCCESS_TABLES = {
  aurora: { table: 'reservations', dateCol: 'created_at', label: 'reservas creadas' },
  aluna: { table: 'membership_leads', dateCol: 'created_at', label: 'leads de membresía' },
  adriana: { table: 'insurance_leads', dateCol: 'created_at', label: 'leads de seguros' },
  enzo: { table: 'membership_leads', dateCol: 'created_at', label: 'propuestas generadas' },
  paula: { table: 'paula_partial_visits', dateCol: 'created_at', label: 'visitas registradas' },
  gabi: { table: 'conversation_history', dateCol: 'timestamp', label: 'consultas respondidas' },
  axel: { table: 'conversation_history', dateCol: 'timestamp', label: 'cotizaciones' },
};

// ─── Recopilar conversaciones de un agente ──────────────────────────────────

/**
 * Obtiene las últimas conversaciones de un agente (últimos 7 días)
 * @param {string} agent - Nombre del agente
 * @returns {Object} { conversations, successCount, failedCount }
 */
async function getAgentConversations(agent) {
  try {
    // Conversaciones del agente (últimos 7 días, agrupadas por usuario)
    const conversations = await databaseService.all(
      `SELECT 
         user_phone,
         STRING_AGG(
           role || ': ' || LEFT(content, 300),
           E'\n' ORDER BY timestamp
         ) as conversation_text,
         COUNT(*) as message_count,
         MIN(timestamp) as started_at,
         MAX(timestamp) as ended_at,
         COUNT(*) FILTER (WHERE role = 'user') as user_msgs,
         COUNT(*) FILTER (WHERE role = 'assistant') as agent_msgs
       FROM conversation_history
       WHERE agent = $1
         AND timestamp > NOW() - INTERVAL '7 days'
       GROUP BY user_phone
       ORDER BY MAX(timestamp) DESC
       LIMIT 50`,
      [agent]
    );

    // Contar outcomes exitosos del periodo
    const successConfig = AGENT_SUCCESS_TABLES[agent];
    let successCount = 0;
    if (successConfig) {
      try {
        const result = await databaseService.get(
          `SELECT COUNT(*) as cnt FROM ${successConfig.table} 
           WHERE ${successConfig.dateCol} > NOW() - INTERVAL '7 days'
           ${agent !== 'gabi' && agent !== 'axel' ? `AND user_phone IN (
             SELECT DISTINCT user_phone FROM conversation_history 
             WHERE agent = $1 AND timestamp > NOW() - INTERVAL '7 days'
           )` : ''}`,
          agent !== 'gabi' && agent !== 'axel' ? [agent] : []
        );
        successCount = parseInt(result?.cnt || 0);
      } catch {
        // Tabla puede no existir en dev
      }
    }

    // Detectar conversaciones "fallidas" (indicadores negativos)
    const failedConversations = await databaseService.all(
      `SELECT user_phone, COUNT(*) as msg_count
       FROM conversation_history
       WHERE agent = $1
         AND timestamp > NOW() - INTERVAL '7 days'
         AND role = 'assistant'
         AND (
           content ILIKE '%no entiendo%'
           OR content ILIKE '%lo siento%'
           OR content ILIKE '%intenta de nuevo%'
           OR content ILIKE '%no puedo ayudar%'
           OR content ILIKE '%error%'
         )
       GROUP BY user_phone`,
      [agent]
    );

    return {
      conversations,
      successCount,
      failedCount: failedConversations.length,
      totalConversations: conversations.length,
    };
  } catch (err) {
    console.warn(`[AUTOTRAINING] ⚠️ Error obteniendo conversaciones de ${agent}:`, err.message);
    return { conversations: [], successCount: 0, failedCount: 0, totalConversations: 0 };
  }
}

// ─── Análisis con GPT-4o-mini ───────────────────────────────────────────────

/**
 * Genera un training report para un agente usando GPT-4o-mini
 * @param {string} agent - Nombre del agente
 * @param {Object} data - Datos de conversaciones
 * @returns {Object} { successful_patterns, failed_patterns, suggestions }
 */
async function generateTrainingReport(agent, data) {
  const { conversations, successCount, failedCount, totalConversations } = data;

  if (totalConversations === 0) {
    return null; // Sin datos, no generar reporte
  }

  // Preparar sample de conversaciones (máx ~3000 chars para mantener tokens bajos)
  const conversationSamples = conversations
    .slice(0, 10)
    .map((c, i) => {
      const status = c.user_msgs > 0 && c.agent_msgs > 0 ? 'completa' : 'incompleta';
      return `--- Conversación ${i + 1} (${c.message_count} msgs, ${status}) ---\n${c.conversation_text?.substring(0, 400) || '[vacía]'}`;
    })
    .join('\n\n');

  const successLabel = AGENT_SUCCESS_TABLES[agent]?.label || 'acciones completadas';

  const prompt = `Eres un analista de calidad conversacional para "${agent}", un agente de WhatsApp Business de Coworkia (coworking en Quito, Ecuador).

DATOS DE LA SEMANA:
- Total conversaciones: ${totalConversations}
- Outcomes exitosos (${successLabel}): ${successCount}
- Conversaciones con errores: ${failedCount}
- Tasa de éxito estimada: ${totalConversations > 0 ? Math.round((successCount / totalConversations) * 100) : 0}%

MUESTRA DE CONVERSACIONES:
${conversationSamples}

ANALIZA y responde en JSON estricto:
{
  "successful_patterns": [
    "Patrón concreto que funcionó bien (frase, flujo, tono) — máx 5"
  ],
  "failed_patterns": [
    "Problema concreto detectado: qué falló y por qué — máx 5"
  ],
  "suggestions": [
    {
      "priority": "high|medium|low",
      "area": "prompt|flujo|tono|datos|ux",
      "suggestion": "Cambio específico recomendado",
      "evidence": "En qué conversación(es) se basa esta sugerencia"
    }
  ],
  "summary": "Resumen de 1-2 oraciones del estado del agente esta semana",
  "health_score": 0-100
}

Reglas:
- Solo JSON válido, sin markdown ni backticks
- Máximo 5 items por array
- Sugerencias accionables y específicas (no genéricas)
- Si no hay suficientes datos, health_score = -1 y arrays vacíos`;

  try {
    const response = await generateChatCompletion(prompt, {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 1200,
    });

    return JSON.parse(response);
  } catch (err) {
    console.error(`[AUTOTRAINING] ❌ Error generando reporte para ${agent}:`, err.message);
    return {
      successful_patterns: [],
      failed_patterns: [`Error generando análisis: ${err.message}`],
      suggestions: [],
      summary: `Error en análisis: ${err.message}`,
      health_score: -1,
    };
  }
}

// ─── Guardar reporte en BD ──────────────────────────────────────────────────

/**
 * Guarda un training report en la tabla autotraining_reports
 */
async function saveReport(agent, report, stats) {
  const reportDate = new Date().toISOString().split('T')[0];

  await databaseService.run(
    `INSERT INTO autotraining_reports 
       (agent, report_date, total_conversations, success_count, failed_count,
        successful_patterns, failed_patterns, suggestions, health_score, summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (agent, report_date) DO UPDATE SET
       total_conversations = $3,
       success_count = $4,
       failed_count = $5,
       successful_patterns = $6,
       failed_patterns = $7,
       suggestions = $8,
       health_score = $9,
       summary = $10,
       created_at = NOW()`,
    [
      agent,
      reportDate,
      stats.totalConversations,
      stats.successCount,
      stats.failedCount,
      JSON.stringify(report.successful_patterns || []),
      JSON.stringify(report.failed_patterns || []),
      JSON.stringify(report.suggestions || []),
      report.health_score ?? -1,
      report.summary || '',
    ]
  );
}

// ─── Función principal ──────────────────────────────────────────────────────

/**
 * Analiza conversaciones de todos los agentes y genera reportes.
 * Llamada por cron semanal (domingo 3:00 AM Ecuador).
 *
 * @returns {Object} { success, agents: [{ agent, health_score, totalConversations }] }
 */
export async function analyzeConversations() {
  const startTime = Date.now();
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🧠 AUTOTRAINING SYSTEM — Análisis Semanal de Conversaciones ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    await databaseService.ensureInitialized();

    const results = [];

    for (const agent of ACTIVE_AGENTS) {
      console.log(`[AUTOTRAINING] 📊 Analizando ${agent}...`);

      // 1. Recopilar datos
      const data = await getAgentConversations(agent);

      if (data.totalConversations === 0) {
        console.log(`[AUTOTRAINING] ⏭️  ${agent}: sin conversaciones esta semana`);
        results.push({ agent, health_score: -1, totalConversations: 0, skipped: true });
        continue;
      }

      // 2. Generar reporte con GPT-4o-mini
      const report = await generateTrainingReport(agent, data);

      if (!report) {
        results.push({ agent, health_score: -1, totalConversations: 0, skipped: true });
        continue;
      }

      // 3. Guardar en BD
      await saveReport(agent, report, data);

      console.log(`[AUTOTRAINING] ✅ ${agent}: score=${report.health_score}, convs=${data.totalConversations}, success=${data.successCount}`);
      results.push({
        agent,
        health_score: report.health_score,
        totalConversations: data.totalConversations,
        successCount: data.successCount,
        suggestions: report.suggestions?.length || 0,
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const analyzed = results.filter(r => !r.skipped).length;

    // Notificar a Diego
    const summaryLines = results
      .filter(r => !r.skipped)
      .map(r => `• ${r.agent}: ${r.health_score}/100 (${r.totalConversations} convs, ${r.suggestions} sugerencias)`)
      .join('\n');

    const notification = `🧠 *AUTOTRAINING SEMANAL*\n\n` +
      `Agentes analizados: ${analyzed}/${ACTIVE_AGENTS.length}\n` +
      `${summaryLines || 'Sin conversaciones esta semana'}\n\n` +
      `⏱️ ${duration}s | Ver: /api/autotraining/latest`;

    try {
      await notifyRaw(notification);
    } catch {
      console.warn('[AUTOTRAINING] ⚠️ No se pudo notificar a Diego');
    }

    console.log(`[AUTOTRAINING] ✅ Análisis completado en ${duration}s — ${analyzed} agentes procesados`);

    return { success: true, agents: results, duration: parseFloat(duration) };
  } catch (error) {
    console.error('[AUTOTRAINING] ❌ Error en análisis:', error.message);
    console.error(error.stack);

    try {
      await notifyRaw(`⚠️ AUTOTRAINING FALLÓ\n\nError: ${error.message}`);
    } catch {
      // No critical
    }

    return { success: false, error: error.message };
  }
}
