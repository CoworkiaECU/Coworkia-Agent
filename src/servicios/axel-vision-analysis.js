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
    console.log(`[AXEL-VISION] 👁️ Analizando ${photoUrls.length} foto(s)...`);

    if (!photoUrls || photoUrls.length === 0) {
      return {
        success: false,
        error: 'No hay fotos para analizar'
      };
    }

    // Prompt especializado para análisis de daños vehiculares
    const visionPrompt = `Eres un experto en reparación de colisiones vehiculares con 15 años de experiencia.

TAREA: Analiza estas fotos de un vehículo dañado y proporciona un diagnóstico profesional.

ESTRUCTURA DE RESPUESTA (formato JSON):
{
  "severity": "LEVE|MODERADO|SEVERO",
  "damageDetails": "Descripción detallada de los daños visibles",
  "affectedParts": ["Lista", "de", "partes", "afectadas"],
  "hiddenDamageRisk": "BAJO|MEDIO|ALTO",
  "estimatedRepairDays": "X-X días",
  "urgentIssues": ["Problemas", "que", "requieren", "atención", "inmediata"]
}

CRITERIOS DE SEVERIDAD:
- LEVE: Rayones superficiales, abolladuras pequeñas sin afectar estructura
- MODERADO: Daños en paneles, posible afectación de estructura leve, pintura comprometida
- SEVERO: Daño estructural visible, múltiples paneles afectados, partes mecánicas expuestas

Analiza las fotos y responde SOLO con el JSON solicitado:`;

    // Analizar con Vision AI
    const analysisResult = await analyzeImage(photoUrls[0], visionPrompt);

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
      const jsonMatch = analysisResult.analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se encontró JSON en la respuesta');
      }
    } catch (parseError) {
      console.error('[AXEL-VISION] ⚠️ Error parseando JSON, usando análisis de texto:', parseError);
      // Fallback: extraer manualmente
      analysisData = {
        severity: analysisResult.analysis.includes('SEVERO') ? 'SEVERO' : 
                  analysisResult.analysis.includes('MODERADO') ? 'MODERADO' : 'LEVE',
        damageDetails: analysisResult.analysis,
        affectedParts: [],
        hiddenDamageRisk: 'MEDIO',
        estimatedRepairDays: '2-5 días',
        urgentIssues: []
      };
    }

    console.log('[AXEL-VISION] ✅ Análisis completado:', {
      severity: analysisData.severity,
      parts: analysisData.affectedParts?.length || 0,
      risk: analysisData.hiddenDamageRisk
    });

    return {
      success: true,
      severity: analysisData.severity,
      damageDetails: analysisData.damageDetails,
      affectedParts: analysisData.affectedParts || [],
      hiddenDamageRisk: analysisData.hiddenDamageRisk || 'MEDIO',
      estimatedRepairDays: analysisData.estimatedRepairDays || '2-5 días',
      urgentIssues: analysisData.urgentIssues || [],
      analysis: analysisResult.analysis,
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
