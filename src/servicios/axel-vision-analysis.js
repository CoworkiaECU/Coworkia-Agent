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

    // Prompt especializado para análisis de daños vehiculares - panel por panel
    const visionPrompt = `Eres un perito técnico de colisiones vehiculares con 15 años de experiencia en talleres de carrocería en Ecuador.

TAREA CRÍTICA: Analiza TODAS las ${photoUrls.length} foto(s) adjuntas de un vehículo dañado. Cada foto puede mostrar un ángulo diferente del mismo vehículo. Debes identificar CADA daño visible, pieza por pieza.

INSTRUCCIONES:
- Examina cada foto al detalle: rayones, abolladuras, piezas rotas o deformadas, daños en pintura, vidrios, faros, paragolpes, etc.
- No generalices — describe cada panel dañado por separado con su tipo de daño exacto.
- Si el mismo panel aparece en varias fotos, consolida la descripción pero no lo repitas.
- Identifica si la pieza necesita reparación (enderezado + pintura) o reemplazo total.

RESPONDE ÚNICAMENTE con este JSON válido (sin markdown, sin explicaciones):
{
  "severity": "LEVE|MODERADO|SEVERO",
  "damages_by_panel": [
    {
      "panel": "nombre exacto de la pieza (ej: guardafango delantero derecho)",
      "damage_type": "descripción técnica del daño (ej: abolladura profunda + arañazo hasta metal)",
      "action": "reparar|reemplazar",
      "severity_panel": "LEVE|MODERADO|SEVERO"
    }
  ],
  "damageDetails": "Descripción técnica consolidada de todos los daños en 2-3 frases",
  "affectedParts": ["lista", "de", "todas", "las", "piezas", "afectadas"],
  "hiddenDamageRisk": "BAJO|MEDIO|ALTO",
  "estimatedRepairDays": "X-X días hábiles",
  "urgentIssues": ["problemas que requieren atención inmediata, ej: vidrio roto"]
}

CRITERIOS DE SEVERIDAD GLOBAL:
- LEVE: Rayones superficiales, abolladuras pequeñas sin afectar estructura, 1-2 paneles
- MODERADO: Daños en 2-4 paneles, pintura comprometida, sin daño estructural grave
- SEVERO: Daño estructural visible, 5+ paneles, partes mecánicas expuestas o faros rotos

Analiza TODAS las fotos y responde SOLO con el JSON:`;

    // Pasar TODAS las fotos al modelo de visión (analyzeImage ya soporta arrays)
    const analysisResult = await analyzeImage(photoUrls, visionPrompt, {
      max_tokens: 1500,
      model: 'gpt-4o',
      detail: 'high'
    });

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
      damages_by_panel: analysisData.damages_by_panel || [],
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
