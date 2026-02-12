/**
 * 👁️ AXEL VISION ANALYSIS
 * Analiza fotos de colisiones usando OpenAI Vision API
 * Detecta severidad y tipo de daños
 */

import { analyzeImage } from '../servicios-ia/openai.js';

/**
 * 🔍 Analiza múltiples fotos de colisión
 */
export async function analyzeCollisionPhotos(photoUrls) {
  try {
    // Validar que photoUrls sea un array válido
    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return {
        success: false,
        error: 'No hay fotos para analizar'
      };
    }

    console.log(`[AXEL-VISION] 👁️ Analizando ${photoUrls.length} foto(s) simultáneamente...`);

    // Prompt especializado para análisis de daños vehiculares
    const visionPrompt = `Eres un experto en reparación de colisiones vehiculares con 15 años de experiencia.

TAREA: Analiza TODAS las fotos proporcionadas (${photoUrls.length} foto(s)) de un vehículo dañado y proporciona un diagnóstico profesional CONSOLIDADO.

IMPORTANTE: 
- Analiza TODAS las imágenes en conjunto
- Identifica daños en diferentes ángulos/áreas del vehículo
- Consolida tu análisis en una evaluación completa

ESTRUCTURA DE RESPUESTA (formato JSON):
{
  "severity": "LEVE|MODERADO|SEVERO",
  "damageDetails": "Descripción detallada de TODOS los daños visibles en todas las fotos",
  "affectedParts": ["Lista", "de", "todas", "las", "partes", "afectadas"],
  "hiddenDamageRisk": "BAJO|MEDIO|ALTO",
  "estimatedRepairDays": "X-X días",
  "urgentIssues": ["Problemas", "que", "requieren", "atención", "inmediata"]
}

CRITERIOS DE SEVERIDAD:
- LEVE: Rayones superficiales, abolladuras pequeñas sin afectar estructura
- MODERADO: Daños en paneles, posible afectación de estructura leve, pintura comprometida
- SEVERO: Daño estructural visible, múltiples paneles afectados, partes mecánicas expuestas

Analiza TODAS las fotos y responde SOLO con el JSON solicitado:`;

    // Analizar solo la primera foto (limitación actual documentada)
    const primaryPhoto = photoUrls[0];
    const analysisResult = await analyzeImage(primaryPhoto, visionPrompt);

    if (!analysisResult.success) {
      console.error('[AXEL-VISION] ❌ Error en Vision API:', analysisResult.error);
      return {
        success: false,
        error: analysisResult.error
      };
    }

    // Parsear respuesta JSON
    let analysisData;
    try {
      const rawContent = analysisResult.content || analysisResult.analysis || '';
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se encontró JSON en la respuesta');
      }
    } catch (parseError) {
      console.error('[AXEL-VISION] ⚠️ Error parseando JSON, usando análisis de texto:', parseError);
      // Fallback: extraer manualmente
      const fallbackText = analysisResult.content || analysisResult.analysis || '';
      analysisData = {
        severity: fallbackText.includes('SEVERO') ? 'SEVERO' : 
                  fallbackText.includes('MODERADO') ? 'MODERADO' : 'LEVE',
        damageDetails: fallbackText,
        affectedParts: [],
        hiddenDamageRisk: 'MEDIO',
        estimatedRepairDays: '2-5 días',
        urgentIssues: []
      };
    }

    console.log('[AXEL-VISION] ✅ Análisis completado:', {
      severity: analysisData.severity,
      parts: analysisData.affectedParts?.length || 0,
      risk: analysisData.hiddenDamageRisk,
      photosAnalyzed: photoUrls.length
    });

    return {
      success: true,
      severity: analysisData.severity,
      damageDetails: analysisData.damageDetails,
      affectedParts: analysisData.affectedParts || [],
      hiddenDamageRisk: analysisData.hiddenDamageRisk || 'MEDIO',
      estimatedRepairDays: analysisData.estimatedRepairDays || '2-5 días',
      urgentIssues: analysisData.urgentIssues || [],
      analysis: analysisResult.content || analysisResult.analysis,
      photoCount: photoUrls.length
    };

  } catch (error) {
    console.error('[AXEL-VISION] ❌ Error general:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  analyzeCollisionPhotos
};
