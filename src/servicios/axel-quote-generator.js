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

    const quotePrompt = `Eres un especialista en cotizaciones de reparación vehicular de The PaintBull con 15 años de experiencia.

**DATOS DEL VEHÍCULO:**
- Marca: ${vehicleData.marca}
- Modelo: ${vehicleData.modelo}
- Año: ${vehicleData.año}

**ANÁLISIS DE DAÑOS (Vision AI):**
Severidad: ${damageAnalysis.severity}
Detalles: ${damageAnalysis.damageDetails || damageAnalysis.analysis}

**TARIFARIO THE PAINTBULL:**
${JSON.stringify(TARIFARIO, null, 2)}

**TAREA:**
Genera una cotización profesional y realista para reparar estos daños. Incluye:

1. **RESUMEN DE DAÑOS** (2-3 líneas): Describe los daños principales detectados

2. **TRABAJOS REQUERIDOS** (lista detallada):
   - Enderezada/desabollado (si aplica)
   - Preparación y masillado
   - Pintura y acabado
   - Reemplazo de partes (si es necesario)

3. **DESGLOSE DE COSTOS** (formato tabla):
   - Mano de obra: XX-XX horas a $XX/hora = $XXX-$XXX
   - Materiales: $XXX-$XXX
   - Repuestos (si aplica): $XXX-$XXX
   - **TOTAL ESTIMADO: $XXX - $XXX USD**

4. **TIEMPO ESTIMADO**: X-X días hábiles

5. **NOTAS IMPORTANTES**:
   - Esta es una cotización preliminar basada en análisis fotográfico
   - Inspección física puede revelar daños adicionales
   - Precios sujetos a cambios según disponibilidad de partes

**FORMATO DE RESPUESTA:**
Usa formato WhatsApp (negritas con *texto*, viñetas con •, emojis apropiados)
Sé claro, profesional pero cercano
Siempre da RANGOS de precio (mínimo-máximo), no valores exactos

**IMPORTANTE:**
- Si es daño LEVE: estimar entre $200-$800
- Si es daño MODERADO: estimar entre $800-$2000
- Siempre mencionar que se requiere inspección física para diagnóstico final
- Ser honesto sobre posibles daños ocultos

Genera la cotización ahora:`;

    const quote = await complete(quotePrompt, {
      temperature: 0.3,
      max_tokens: 1000,
      model: 'gpt-4o-mini'
    });

    console.log('[QUOTE-GEN] ✅ Cotización generada');

    // Extraer rango de precio del texto generado
    const priceMatch = quote.match(/\$(\d+)\s*-\s*\$(\d+)/);
    const priceRange = priceMatch ? {
      min: parseInt(priceMatch[1]),
      max: parseInt(priceMatch[2])
    } : null;

    return {
      success: true,
      quote: quote,
      priceRange: priceRange,
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
