/**
 * 💰 AXEL QUOTE GENERATOR
 * Genera cotizaciones inteligentes usando OpenAI basadas en:
 * - Análisis Vision AI de los daños
 * - Datos del vehículo (marca, modelo, año)
 * - Precios del mercado de Quito, Ecuador (OpenAI)
 *
 * TODO: cuando The PaintBull entregue su tarifario oficial, reemplazar
 *       el bloque de precios del prompt por ese tarifario real.
 */

import { complete, analyzeImage } from '../servicios-ia/openai.js';

/**
 * 🤖 Genera cotización usando OpenAI con contexto completo
 */
export async function generateQuote({ vehicleData, damageAnalysis, photoUrls = [] }) {
  try {
    console.log('[QUOTE-GEN] 💰 Generando cotización...');
    console.log('[QUOTE-GEN] Vehículo:', vehicleData);
    console.log('[QUOTE-GEN] Severidad:', damageAnalysis.severity);

    // Construir detalle panel por panel si está disponible
    const panelDetail = (damageAnalysis.damages_by_panel && damageAnalysis.damages_by_panel.length > 0)
      ? damageAnalysis.damages_by_panel.map((p, i) =>
          `${i + 1}. ${p.panel}: ${p.damage_type} → acción: ${p.action} (severidad: ${p.severity_panel})`
        ).join('\n')
      : damageAnalysis.damageDetails || JSON.stringify(damageAnalysis.analysis) || '';

    const quotePrompt = `Eres el especialista en cotizaciones de The PaintBull, taller de colisiones y pintura en Quito, Ecuador. 15 años de experiencia. Mercado ecuatoriano.

VEHÍCULO: ${vehicleData.marca} ${vehicleData.modelo} ${vehicleData.año}
SEVERIDAD GLOBAL: ${damageAnalysis.severity}
RIESGO DAÑOS OCULTOS: ${damageAnalysis.hiddenDamageRisk || 'MEDIO'}
TIEMPO ESTIMADO (visión): ${damageAnalysis.estimatedRepairDays || '3-5 días'}

DAÑOS IDENTIFICADOS POR PIEZA (análisis previo de visión IA):
${panelDetail}

PARTES AFECTADAS: ${JSON.stringify(damageAnalysis.affectedParts || [])}
URGENCIAS: ${JSON.stringify(damageAnalysis.urgentIssues || [])}

${photoUrls.length > 0 ? `Se adjuntan ${photoUrls.length} foto(s) del vehículo — ÚSALAS para validar y mejorar el diagnóstico previo. Si ves daños adicionales no listados arriba, inclúyelos.` : ''}

PRECIOS DE REFERENCIA:
Usa tus conocimientos actualizados del mercado de talleres de colisión y pintura en QUITO, ECUADOR (año 2026).
Considera talleres de mediana-alta categoría con buena reputación en la ciudad (ni el más barato del barrio ni concesionario oficial).
Ten en cuenta que los repuestos en Ecuador pueden tener sobreprecio de importación del 20-40% respecto a Colombia o Perú.
Ajusta los rangos según el año y marca del vehículo: repuestos de autos japoneses (Toyota, Hyundai, Kia) son más accesibles que europeos o americanos.

// NOTA TÉCNICA: cuando The PaintBull entregue su tarifario oficial, reemplazar este bloque por los valores reales.

TAREA: Basándote en las fotos (si están adjuntas) y el análisis por pieza, genera una cotización realista pieza por pieza en JSON:
{
  "resumen_danos": "2-3 frases técnicas describiendo los daños reales observados (específico, no genérico)",
  "trabajos": [
    { "item": "nombre exacto de la pieza/trabajo", "detalle": "proceso técnico específico", "rango_min": 120, "rango_max": 180 }
  ],
  "subtotal_mano_obra": { "min": 0, "max": 0 },
  "subtotal_materiales": { "min": 0, "max": 0 },
  "subtotal_repuestos": { "min": 0, "max": 0 },
  "total_min": 0,
  "total_max": 0,
  "dias_entrega": "X-X días hábiles",
  "garantia": "descripción concreta de la garantía (ej: 1 año en pintura, garantía de por vida en enderezado estructural)",
  "nota_inspeccion": "frase específica sobre qué daños ocultos podrían aparecer en inspección física"
}

REGLAS CRÍTICAS:
- Un ítem de "trabajos" por CADA pieza dañada identificada — no agrupes todo en uno solo.
- Los precios deben reflejar el tarifario real, NO los rangos globales de severidad.
- subtotal_mano_obra = suma de trabajos de enderezado + pintura (sin repuestos).
- subtotal_materiales = suma de materiales consumibles (masilla, lija, etc.).
- subtotal_repuestos = suma SOLO de piezas que se reemplazan (no se reparan).
- total_min y total_max = suma de los 3 subtotales (mínimos y máximos respectivamente).
- Todos los valores numéricos sin signo $, solo el número entero.
- SOLO responde con el JSON, sin markdown, sin explicaciones previas ni posteriores.`;

    // Si ya tenemos análisis detallado por pieza (del paso de visión previo), usar
    // complete() texto-solo — más fiable y evita segunda llamada vision con URLs que
    // podrían expirar. Solo usar analyzeImage si no hay datos de análisis previo.
    const hasDetailedDamageData = damageAnalysis.damages_by_panel && damageAnalysis.damages_by_panel.length > 0;
    let raw;
    if (!hasDetailedDamageData && photoUrls.length > 0) {
      // Sin análisis previo: usar vision directamente
      const visionResult = await analyzeImage(photoUrls, quotePrompt, {
        temperature: 0.2,
        max_tokens: 1800,
        model: 'gpt-4o',
        detail: 'high'
      });
      raw = visionResult.success ? visionResult.content : null;
      if (!raw) throw new Error(visionResult.error || 'Error en Vision API para cotización');
    } else {
      // Datos de análisis disponibles: texto-solo es más fiable
      raw = await complete(quotePrompt, {
        temperature: 0.2,
        max_tokens: 1800,
        model: 'gpt-4o'
      });
    }

    console.log('[QUOTE-GEN] ✅ Cotización generada');

    // Parsear JSON estructurado
    let quoteData;
    try {
      const jsonText = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      quoteData = JSON.parse(jsonText);
    } catch (parseErr) {
      console.warn('[QUOTE-GEN] ⚠️ No se pudo parsear JSON, fallback a texto:', parseErr.message);
      quoteData = { raw_text: raw };
    }

    const priceRange = (quoteData.total_min && quoteData.total_max)
      ? { min: quoteData.total_min, max: quoteData.total_max }
      : (() => {
          const m = raw.match(/\$(\d+)\s*-\s*\$(\d+)/);
          return m ? { min: parseInt(m[1]), max: parseInt(m[2]) } : null;
        })();

    return {
      success: true,
      quote: quoteData,
      priceRange,
      metadata: {
        vehicleData,
        severity: damageAnalysis.severity,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('[QUOTE-GEN] ❌ Error generando cotización:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📊 Genera resumen ejecutivo de la cotización (para email)
 */
export function generateQuoteSummary({ vehicleData, priceRange, severity }) {
  return `
🚗 **VEHÍCULO**
${vehicleData.marca} ${vehicleData.modelo} ${vehicleData.año}

💰 **ESTIMACIÓN**
$${priceRange.min} - $${priceRange.max} USD

⚠️ **SEVERIDAD**
${severity === 'LEVE' ? '🟢 Leve' : '🟡 Moderada'}

📅 **TIEMPO ESTIMADO**
${severity === 'LEVE' ? '2-3 días hábiles' : '4-7 días hábiles'}
  `.trim();
}

/**
 * 🎯 Proceso completo: Genera cotización con todos los datos disponibles
 */
export async function processQuoteGeneration({ 
  userId, 
  vehicleData, 
  damageAnalysis, 
  photoUrls = [] 
}) {
  try {
    console.log('[QUOTE-GEN] 🎯 Iniciando generación de cotización completa');

    // 1. Generar cotización con OpenAI
    const quoteResult = await generateQuote({
      vehicleData,
      damageAnalysis,
      photoUrls
    });

    if (!quoteResult.success) {
      throw new Error('Error generando cotización: ' + quoteResult.error);
    }

    // 2. Preparar mensaje final para WhatsApp
    const whatsappMessage = `
🎯 *COTIZACIÓN PAINTBULL*

${quoteResult.quote}

---

📞 *SIGUIENTE PASO*
Para confirmar y agendar la reparación, contáctanos:
• WhatsApp: +593 99 810 0623
• O responde este mensaje

✉️ *Te enviaremos una copia detallada por email*

_The PaintBull - Expertos en colisiones_ 🚗💥
    `.trim();

    // 3. Generar resumen para email
    const summary = quoteResult.priceRange 
      ? generateQuoteSummary({
          vehicleData,
          priceRange: quoteResult.priceRange,
          severity: damageAnalysis.severity
        })
      : null;

    console.log('[QUOTE-GEN] ✅ Cotización completa generada');

    return {
      success: true,
      whatsappMessage,
      emailData: {
        quote: quoteResult.quote,
        summary: summary,
        priceRange: quoteResult.priceRange,
        vehicleData,
        damageAnalysis,
        photoUrls
      },
      metadata: quoteResult.metadata
    };

  } catch (error) {
    console.error('[QUOTE-GEN] ❌ Error en proceso completo:', error);
    return {
      success: false,
      error: error.message,
      fallbackMessage: `⚠️ Hubo un problema generando la cotización automática.

No te preocupes, nuestro equipo te enviará una cotización personalizada en las próximas horas.

📞 ¿Urgente? Contáctanos:
+593 99 810 0623

Disculpa las molestias.`
    };
  }
}

/**
 * 🧮 Calcula precio base según severidad (fallback simple)
 */
export function estimateBasicPrice(severity) {
  const ranges = {
    'LEVE': { min: 200, max: 800 },
    'MODERADO': { min: 800, max: 2000 },
    'GRAVE': { min: 2000, max: 5000 }
  };
  
  return ranges[severity] || ranges['MODERADO'];
}

/**
 * 📝 Genera disclaimers según el tipo de daño
 */
export function getQuoteDisclaimers(severity) {
  const base = [
    '⚠️ Esta cotización es preliminar basada en análisis fotográfico',
    '🔍 Inspección física puede revelar daños adicionales no visibles',
    '💰 Precios sujetos a cambios según disponibilidad de partes'
  ];

  if (severity === 'MODERADO') {
    base.push('🛠️ Posibles daños estructurales ocultos que requieren evaluación directa');
  }

  return base;
}
