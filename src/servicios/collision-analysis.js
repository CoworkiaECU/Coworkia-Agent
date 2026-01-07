/**
 * 🚗 Servicio de Análisis de Colisiones con OpenAI Vision
 * Para Axel - The PaintBull
 */

import { analyzeImage } from '../servicios-ia/openai.js';

/**
 * 📸 Analiza una foto de colisión vehicular
 */
export async function analyzeCollisionPhoto(imageUrl, context = {}) {
  const { photoType = 'general', existingDamages = [] } = context;
  
  const prompts = {
    general: `Eres un experto en carrocería automotriz con 15 años de experiencia. Analiza esta foto de un vehículo y describe:

1. **Tipo de daño:** (abolladura, rayón, golpe, rotura, deformación)
2. **Ubicación exacta:** (parachoques delantero/trasero, puerta delantera/trasera izq/der, capó, lateral, etc.)
3. **Severidad:** LEVE (solo pintura/abolladura superficial) | MODERADO (estructura afectada levemente) | GRAVE (estructura comprometida - RECHAZAR)
4. **Piezas afectadas:** Lista de partes dañadas visibles
5. **Daños adicionales visibles:** Cualquier otro daño que notes
6. **Recomendación:** ¿Es reparable por The PaintBull? (solo colisiones leves y moderadas)

IMPORTANTE: 
- Si ves daño estructural severo, chasis comprometido, o vehículo volcado → Marca como GRAVE y recomienda taller especializado
- Si no ves ningún daño claro → Indica que necesitas foto más específica
- Sé preciso y técnico pero comprensible`,

    close_up: `Analiza esta foto de cerca del daño. Describe:
1. Profundidad del daño
2. Si la pintura está afectada (rayón, descascaramiento, rotura)
3. Si hay deformación del metal
4. Estimación de área afectada (cm² aproximados)
5. ¿Necesita masilla, enderezado, o solo pintura?`,

    vin: `Extrae el número VIN (Vehicle Identification Number) o número de chasis visible en esta foto. Si no lo encuentras claramente, indícalo.`,

    context: `Esta es una foto adicional del mismo vehículo. Daños ya identificados: ${existingDamages.join(', ')}.
    
Analiza si ves:
1. Daños adicionales no mencionados antes
2. Mejor perspectiva de daños ya identificados
3. Cualquier detalle relevante para la cotización`
  };

  const prompt = prompts[photoType] || prompts.general;

  console.log(`[COLLISION ANALYSIS] 📸 Analizando foto tipo: ${photoType}`);
  console.log(`[COLLISION ANALYSIS] 🔗 URL: ${imageUrl.substring(0, 80)}...`);

  try {
    const result = await analyzeImage(imageUrl, prompt, {
      temperature: 0.2, // Más determinístico para análisis técnico
      max_tokens: 600,
      detail: 'high' // Máxima calidad para detectar detalles
    });

    if (!result.success) {
      console.error('[COLLISION ANALYSIS] ❌ Error en Vision API:', result.error);
      return {
        success: false,
        error: result.error
      };
    }

    const analysis = result.content;
    console.log('[COLLISION ANALYSIS] ✅ Análisis completado');
    console.log('[COLLISION ANALYSIS] 📝 Resultado:', analysis.substring(0, 200) + '...');

    // Detectar severidad
    const analysisLower = analysis.toLowerCase();
    let severity = 'LEVE';
    
    if (analysisLower.includes('grave') || analysisLower.includes('severo') || 
        analysisLower.includes('estructural') || analysisLower.includes('chasis comprometido') ||
        analysisLower.includes('volcado') || analysisLower.includes('rechazar')) {
      severity = 'GRAVE';
    } else if (analysisLower.includes('moderado') || analysisLower.includes('moderada') ||
               analysisLower.includes('estructura afectada')) {
      severity = 'MODERADO';
    }

    // Detectar si es apto para PaintBull
    const isAcceptable = severity !== 'GRAVE';

    return {
      success: true,
      analysis,
      severity,
      isAcceptable,
      photoType,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[COLLISION ANALYSIS] ❌ Error:', error);
    return {
      success: false,
      error: error.message || 'Error analizando imagen'
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
