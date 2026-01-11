/**
 * 🚗 Servicio de Análisis de Colisiones con OpenAI Vision
 * Para Axel - The PaintBull
 */

import { analyzeImage } from '../servicios-ia/openai.js';

/**
 * 📸 Analiza una foto de colisión vehicular
 */
export async function analyzeCollisionPhoto(imageUrl, context = {}) {
  const { photoType = 'general', additionalPhotos = [], totalPhotos = 1 } = context;
  
  const prompts = {
    general: `Eres Axel, experto en carrocería con 15 años de experiencia en PaintBull. Analiza esta foto de colisión:

**RESPONDE EN FORMATO NATURAL (no lista técnica):**

1. Describe el daño de forma clara y empática (como hablarías con un cliente preocupado)
2. Indica severidad: LEVE, MODERADO o GRAVE
3. Menciona áreas afectadas principales (máximo 3)
4. Da estimación aproximada en $ (rangos amplios)

IMPORTANTE:
- Tono cálido y humano, nada de listas numeradas
- Si es grave (chasis, volcado, incendio) → rechaza amablemente
- Si no ves daño claro → pide foto más específica del área dañada
- Sé breve: 2-3 oraciones máximo`,

    batch: `Eres Axel de PaintBull analizando ${totalPhotos} foto(s) de un mismo vehículo dañado.

**ANALIZA TODAS LAS FOTOS JUNTAS Y RESPONDE:**

1. Descripción general del daño (tono empático y natural)
2. Severidad global: LEVE | MODERADO | GRAVE
3. Áreas dañadas principales (máximo 3 más importantes)
4. Estimación aproximada en $ considerando TODO el daño visible

IMPORTANTE:
- Consolida TODO en una respuesta breve y clara
- Tono cálido, nada técnico o robótico
- Si alguna foto muestra daño grave → marca GRAVE
- 3-4 oraciones máximo`,

    context: `Foto adicional del vehículo. Daños ya vistos: ${context.existingDamages?.join(', ') || 'ninguno'}. 
    
Indica brevemente:
1. ¿Ves daños adicionales no mencionados?
2. ¿Cambió la severidad del análisis con esta foto?`
  };

  const prompt = prompts[photoType] || prompts.general;

  console.log(`[COLLISION] 📸 Analizando ${totalPhotos} foto(s) - tipo: ${photoType}`);

  try {
    const result = await analyzeImage(imageUrl, prompt, {
      temperature: 0.2,
      max_tokens: 400,
      detail: photoType === 'batch' ? 'high' : 'auto'
    });

    if (!result.success) {
      console.error('[COLLISION] ❌ Error Vision API:', result.error);
      return {
        success: false,
        error: result.error
      };
    }

    const analysis = result.content;
    console.log('[COLLISION] ✅ Análisis OK');

    // Parsear respuesta para extraer datos estructurados
    const analysisLower = analysis.toLowerCase();
    
    // Detectar severidad
    let severity = 'leve';
    if (analysisLower.includes('grave') || analysisLower.includes('severo') || 
        analysisLower.includes('chasis') || analysisLower.includes('estructural')) {
      severity = 'severe';
    } else if (analysisLower.includes('moderado') || analysisLower.includes('considerable')) {
      severity = 'moderate';
    }

    // Extraer áreas dañadas (parsing simple)
    const damageAreas = [];
    const parts = ['parachoques', 'puerta', 'capó', 'guardabarro', 'lateral', 'espejo'];
    parts.forEach(part => {
      if (analysisLower.includes(part)) damageAreas.push(part);
    });

    // Extraer estimación de costo (buscar números después de $)
    let estimatedCost = null;
    const costMatch = analysis.match(/\$?\s*(\d{2,4})\s*-?\s*\$?\s*(\d{2,4})?/);
    if (costMatch) {
      estimatedCost = parseInt(costMatch[1]);
    }

    return {
      success: true,
      analysis,
      severity,
      damageAreas,
      estimatedCost,
      isAcceptable: severity !== 'severe',
      photoType,
      totalPhotos,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[COLLISION] ❌ Error:', error);
    return {
      success: false,
      error: error.message || 'Error procesando fotos'
    };
  }
}

/**
 * 📊 Analiza múltiples fotos y genera reporte consolidado
 */
export async function analyzeMultiplePhotos(photos) {
  console.log(`[COLLISION ANALYSIS] 📸 Analizando ${photos.length} fotos...`);

  const results = [];
  const damages = [];

  // Analizar primera foto sin contexto
  if (photos.length > 0) {
    const firstResult = await analyzeCollisionPhoto(photos[0].url, { photoType: photos[0].type || 'general' });
    results.push(firstResult);
    
    if (firstResult.success && firstResult.analysis) {
      // Extraer daños mencionados para contexto de siguientes fotos
      const analysisText = firstResult.analysis.toLowerCase();
      if (analysisText.includes('parachoques')) damages.push('parachoques');
      if (analysisText.includes('puerta')) damages.push('puerta');
      if (analysisText.includes('capó')) damages.push('capó');
      if (analysisText.includes('lateral')) damages.push('lateral');
    }
  }

  // Analizar fotos restantes con contexto
  for (let i = 1; i < photos.length; i++) {
    const photo = photos[i];
    const result = await analyzeCollisionPhoto(photo.url, {
      photoType: photo.type || 'context',
      existingDamages: damages
    });
    results.push(result);

    // Agregar nuevos daños detectados
    if (result.success && result.analysis) {
      // Extraer nuevos daños
      const analysisText = result.analysis.toLowerCase();
      if (analysisText.includes('parachoques') && !damages.includes('parachoques')) damages.push('parachoques');
      if (analysisText.includes('puerta') && !damages.includes('puerta')) damages.push('puerta');
      if (analysisText.includes('capó') && !damages.includes('capó')) damages.push('capó');
      if (analysisText.includes('lateral') && !damages.includes('lateral')) damages.push('lateral');
    }
  }

  // Determinar severidad máxima
  const maxSeverity = results.reduce((max, r) => {
    if (!r.success) return max;
    const severities = ['LEVE', 'MODERADO', 'GRAVE'];
    const currentIndex = severities.indexOf(r.severity);
    const maxIndex = severities.indexOf(max);
    return currentIndex > maxIndex ? r.severity : max;
  }, 'LEVE');

  const isAcceptable = maxSeverity !== 'GRAVE';

  // Contar fotos exitosas
  const successfulAnalyses = results.filter(r => r.success).length;
  const failedAnalyses = results.filter(r => !r.success).length;

  console.log(`[COLLISION ANALYSIS] ✅ Análisis completado: ${successfulAnalyses} exitosas, ${failedAnalyses} fallidas`);
  console.log(`[COLLISION ANALYSIS] 📊 Severidad máxima: ${maxSeverity}`);
  console.log(`[COLLISION ANALYSIS] ${isAcceptable ? '✅' : '❌'} ${isAcceptable ? 'Apto' : 'NO apto'} para PaintBull`);

  return {
    success: true,
    totalPhotos: photos.length,
    successfulAnalyses,
    failedAnalyses,
    results,
    maxSeverity,
    isAcceptable,
    damages,
    timestamp: new Date().toISOString()
  };
}

/**
 * 📝 Genera resumen consolidado del análisis
 */
export function generateAnalysisSummary(multiPhotoResult) {
  const { results, maxSeverity, isAcceptable, damages } = multiPhotoResult;

  const successfulResults = results.filter(r => r.success);
  
  if (successfulResults.length === 0) {
    return '⚠️ No pude analizar las fotos correctamente. ¿Podrías enviar fotos más claras de los daños?';
  }

  let summary = '🔍 **ANÁLISIS DE DAÑOS COMPLETADO**\n\n';

  // Severidad general
  const severityEmoji = {
    'LEVE': '🟢',
    'MODERADO': '🟡',
    'GRAVE': '🔴'
  };

  summary += `${severityEmoji[maxSeverity]} **Severidad:** ${maxSeverity}\n`;
  summary += `📋 **Piezas afectadas:** ${damages.length > 0 ? damages.join(', ') : 'Ver análisis detallado'}\n\n`;

  // Análisis por foto
  successfulResults.forEach((result, index) => {
    summary += `**Foto ${index + 1}:**\n${result.analysis}\n\n`;
  });

  // Recomendación
  if (!isAcceptable) {
    summary += '❌ **IMPORTANTE:** Este daño requiere un taller especializado en estructuras. The PaintBull se enfoca en colisiones leves y moderadas. Te recomiendo buscar un taller certificado para este tipo de reparación.';
  } else {
    summary += `✅ **Buenas noticias:** Este tipo de daño ${maxSeverity === 'LEVE' ? 'leve' : 'moderado'} SÍ lo podemos reparar en The PaintBull.\n\n`;
    summary += 'Para darte una cotización precisa, necesito algunos datos adicionales. ¿Continuamos? 😊';
  }

  return summary;
}

export default {
  analyzeCollisionPhoto,
  analyzeMultiplePhotos,
  generateAnalysisSummary
};
