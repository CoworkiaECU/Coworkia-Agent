/**
 * 🔬 Prompt A/B Tester — Loop 2
 *
 * Infraestructura para probar variantes de prompts y medir conversion.
 * NO integrado al flujo aún — solo tablas + servicios.
 *
 * Flujo futuro:
 * 1. Crear variante con prompt_patch (texto que se inyecta al system prompt)
 * 2. 50/50 split entre control y variante
 * 3. Medir conversations_count vs completions_count
 * 4. Declarar ganador cuando N >= 50 y delta > 0.1
 */

import databaseService from '../database/database.js';

/**
 * 🎲 Retorna la variante activa para un agente (50/50 split)
 *
 * @param {string} agent - Nombre del agente
 * @returns {Promise<{variantName:string, promptPatch:string|null}>}
 *   - 'control' + null si no hay variante activa o sale control
 *   - variant_name + prompt_patch si sale la variante
 */
export async function getActiveVariant(agent) {
  try {
    await databaseService.initialize();

    const variant = await databaseService.get(
      `SELECT id, variant_name, prompt_patch
       FROM prompt_variants
       WHERE agent = $1 AND is_active = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [agent]
    );

    if (!variant) {
      return { variantName: 'control', promptPatch: null };
    }

    // 50/50 random split
    if (Math.random() < 0.5) {
      return { variantName: 'control', promptPatch: null };
    }

    return {
      variantName: variant.variant_name,
      promptPatch: variant.prompt_patch,
    };
  } catch (err) {
    console.warn('[AB-TESTER] ⚠️ Error getting variant:', err.message);
    return { variantName: 'control', promptPatch: null };
  }
}

/**
 * 📊 Registra outcome de una conversación para la variante
 *
 * @param {string} agent - Nombre del agente
 * @param {string} variantName - 'control' o nombre de variante
 * @param {boolean} completed - Si la conversación terminó exitosamente
 */
export async function recordOutcome(agent, variantName, completed) {
  try {
    await databaseService.initialize();

    if (variantName === 'control') {
      // Control no tiene registro en BD — se calcula por diferencia
      return;
    }

    const setCols = completed
      ? 'conversations_count = conversations_count + 1, completions_count = completions_count + 1'
      : 'conversations_count = conversations_count + 1';

    await databaseService.run(
      `UPDATE prompt_variants
       SET ${setCols}
       WHERE agent = $1 AND variant_name = $2 AND is_active = true`,
      [agent, variantName]
    );
  } catch (err) {
    console.warn('[AB-TESTER] ⚠️ Error recording outcome:', err.message);
  }
}

/**
 * 🏆 Verifica si hay un ganador en el A/B test
 *
 * Condiciones para ganador:
 * - >= 50 conversaciones en la variante
 * - conversion_rate de variante > control + 0.1 (10pp)
 *
 * @param {string} agent - Nombre del agente
 * @returns {Promise<{hasWinner:boolean, winner?:string, controlRate?:number, variantRate?:number}>}
 */
export async function checkForWinner(agent) {
  try {
    await databaseService.initialize();

    const variant = await databaseService.get(
      `SELECT id, variant_name, conversations_count, conversion_rate
       FROM prompt_variants
       WHERE agent = $1 AND is_active = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [agent]
    );

    if (!variant || variant.conversations_count < 50) {
      return { hasWinner: false };
    }

    // Calcular control rate: all scored conversations for this agent minus variant
    const controlStats = await databaseService.get(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE outcome = 'completed') as completed
       FROM conversation_scores
       WHERE agent = $1
         AND created_at >= (SELECT created_at FROM prompt_variants WHERE id = $2)`,
      [agent, variant.id]
    );

    const controlTotal = parseInt(controlStats?.total || 0);
    const controlCompleted = parseInt(controlStats?.completed || 0);
    const controlRate = controlTotal > 0 ? controlCompleted / controlTotal : 0;
    const variantRate = variant.conversion_rate;

    if (variantRate > controlRate + 0.1) {
      // Winner found — deactivate and mark
      await databaseService.run(
        `UPDATE prompt_variants
         SET is_active = false, is_winner = true
         WHERE id = $1`,
        [variant.id]
      );

      console.log(`[AB-TESTER] 🏆 WINNER: ${variant.variant_name} (${(variantRate * 100).toFixed(1)}% vs control ${(controlRate * 100).toFixed(1)}%)`);

      return {
        hasWinner: true,
        winner: variant.variant_name,
        controlRate: parseFloat(controlRate.toFixed(3)),
        variantRate: parseFloat(variantRate.toFixed(3)),
      };
    }

    return {
      hasWinner: false,
      controlRate: parseFloat(controlRate.toFixed(3)),
      variantRate: parseFloat(variantRate.toFixed(3)),
    };
  } catch (err) {
    console.warn('[AB-TESTER] ⚠️ Error checking winner:', err.message);
    return { hasWinner: false };
  }
}
