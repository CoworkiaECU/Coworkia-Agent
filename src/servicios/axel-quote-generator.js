/**
 * 💰 AXEL QUOTE GENERATOR
 * Genera cotizaciones inteligentes usando OpenAI basadas en:
 * - Análisis Vision AI de los daños
 * - Datos del vehículo (marca, modelo, año)
 * - Tarifario de The PaintBull
 */

import { complete } from '../servicios-ia/openai.js';

/**
 * 💵 Tarifario base The PaintBull (valores referenciales en USD)
 */
const TARIFARIO = {
  // Mano de obra por hora
  manoDeObra: {
    enderezada: 25, // USD/hora
    pintura: 30,    // USD/hora
    pulido: 20      // USD/hora
  },
  
  // Materiales comunes
  materiales: {
    pintura: {
      pequeño: [80, 150],   // Panel pequeño (guardafango, puerta)
      mediano: [150, 300],  // Panel mediano (capó, tapa baúl)
      grande: [300, 500]    // Panel grande (lateral completo)
    },
    masilla: [15, 40],
    imprimante: [20, 50],
    lija: [10, 25],
    cinta: [5, 15]
  },
  
  // Repuestos comunes (promedio)
  repuestos: {
    faro: [80, 250],
    parrilla: [50, 200],
    parachoques: [150, 400],
    retrovisor: [30, 120],
    moldura: [20, 80]
  }
};

/**
 * 🤖 Genera cotización usando OpenAI con contexto completo
 */
export async function generateQuote({ vehicleData, damageAnalysis, photoUrls = [] }) {
  try {
    console.log('[QUOTE-GEN] 💰 Generando cotización...');
    console.log('[QUOTE-GEN] Vehículo:', vehicleData);
    console.log('[QUOTE-GEN] Severidad:', damageAnalysis.severity);

    const quotePrompt = `Eres el especialista en cotizaciones de The PaintBull, taller de colisiones y pintura en Quito, Ecuador. 15 años de experiencia.

VEHÍCULO: ${vehicleData.marca} ${vehicleData.modelo} ${vehicleData.año}
SEVERIDAD: ${damageAnalysis.severity}
DAÑOS DETECTADOS: ${JSON.stringify(damageAnalysis.affectedParts || [])}
DETALLE ANÁLISIS: ${damageAnalysis.damageDetails || (damageAnalysis.analysis && damageAnalysis.analysis.summary) || JSON.stringify(damageAnalysis.analysis) || ''}
RIESGO DAÑOS OCULTOS: ${damageAnalysis.hiddenDamageRisk || 'MEDIO'}
TIEMPO ESTIMADO: ${damageAnalysis.estimatedRepairDays || '3-5 días'}

TARIFARIO REFERENCIAL (USD):
- Mano de obra enderezada: $25/h | pintura: $30/h | pulido: $20/h
- Pintura panel pequeño: $80-$150 | mediano: $150-$300 | grande: $300-$500
- Repuestos: faro $80-$250, parachoques $150-$400, retrovisor $30-$120

TAREA: Genera una cotización estructurada en JSON exactamente así (sin texto extra, solo JSON válido):
{
  "resumen_danos": "2-3 frases técnicas y vendedoras describiendo los daños",
  "trabajos": [
    { "item": "nombre del trabajo", "detalle": "descripción breve del proceso", "rango_min": 120, "rango_max": 180 }
  ],
  "subtotal_mano_obra": { "min": 0, "max": 0 },
  "subtotal_materiales": { "min": 0, "max": 0 },
  "subtotal_repuestos": { "min": 0, "max": 0 },
  "total_min": 0,
  "total_max": 0,
  "dias_entrega": "X-X días hábiles",
  "garantia": "descripción corta de la garantía del taller",
  "nota_inspeccion": "frase corta sobre por qué la inspección física es clave"
}

REGLAS:
- Si daño LEVE: total $200-$800. Si MODERADO: $800-$2000. Si GRAVE: $2000-$5000.
- Máximo 6 trabajos en el array.
- Todos los valores numéricos sin signo $, solo el número entero.
- SOLO responde con el JSON, sin markdown, sin explicación.`;

    const raw = await complete(quotePrompt, {
      temperature: 0.2,
      max_tokens: 900,
      model: 'gpt-4o-mini'
    });

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
