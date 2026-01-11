/**
 * 🎯 Marketing Visual Analysis Service
 * 
 * Servicio especializado para analizar materiales visuales de marketing:
 * - Logos y branding
 * - Creatividades publicitarias (Meta Ads, Google Ads, TikTok)
 * - Posts para redes sociales
 * - Banners y gráficas promocionales
 * - Screenshots de campañas
 * 
 * Utiliza OpenAI GPT-4 Vision para análisis profesional de marketing
 * 
 * @author Enzo - MarketingLab
 * @date 2026-01-11
 */

import { analyzeImage } from '../servicios-ia/openai.js';

/**
 * 📊 Tipos de análisis disponibles
 */
export const ANALYSIS_TYPES = {
  LOGO: 'logo',
  CAMPAIGN: 'campaign',
  SOCIAL_POST: 'social_post',
  AD_CREATIVE: 'ad_creative',
  BANNER: 'banner',
  SCREENSHOT: 'screenshot',
  GENERAL: 'general'
};

/**
 * 🎨 Detectar tipo de contenido visual automáticamente
 */
function detectVisualType(userMessage = '') {
  const msg = userMessage.toLowerCase();
  
  if (msg.match(/logo|logotipo|marca|branding|identidad/)) {
    return ANALYSIS_TYPES.LOGO;
  }
  if (msg.match(/campaña|campaign|ad|anuncio|publicidad|meta ads|google ads/)) {
    return ANALYSIS_TYPES.CAMPAIGN;
  }
  if (msg.match(/post|publicación|redes sociales|instagram|facebook|tiktok|contenido/)) {
    return ANALYSIS_TYPES.SOCIAL_POST;
  }
  if (msg.match(/creatividad|creativo|diseño publicitario/)) {
    return ANALYSIS_TYPES.AD_CREATIVE;
  }
  if (msg.match(/banner|gráfica|flyer|volante/)) {
    return ANALYSIS_TYPES.BANNER;
  }
  if (msg.match(/screenshot|captura|pantalla/)) {
    return ANALYSIS_TYPES.SCREENSHOT;
  }
  
  return ANALYSIS_TYPES.GENERAL;
}

/**
 * 🎯 Construir prompt especializado según tipo de análisis
 */
function buildMarketingPrompt(visualType, userContext = '') {
  const baseIntro = `Eres Enzo, experto en marketing digital para el mercado ecuatoriano/latinoamericano.

Analiza esta imagen con ojo crítico de marketero profesional.`;

  const prompts = {
    [ANALYSIS_TYPES.LOGO]: `${baseIntro}

🎨 ANÁLISIS DE LOGO/BRANDING:

1. **Primera impresión** (¿memorable? ¿profesional?)
2. **Identidad visual** (colores, tipografía, símbolos)
3. **Aplicabilidad**:
   - ¿Funciona en pequeño? (perfil WhatsApp, favicon)
   - ¿Funciona en blanco/negro?
   - ¿Funciona en fondos diversos?
4. **Psicología del color** (¿qué emociones evoca?)
5. **Competencia** (¿se diferencia del mercado?)
6. **Versatilidad** (horizontal, vertical, isotipo)

✅ FORTALEZAS (2-3 puntos)
⚠️ OPORTUNIDADES DE MEJORA (2-3 acciones concretas)
💡 RECOMENDACIÓN FINAL (directo, accionable)

TONO: Directo, técnico pero accesible, emojis estratégicos 🎯
FORMATO: Párrafos cortos, bullets, fácil de leer en WhatsApp
LONGITUD: 300-400 palabras máximo`,

    [ANALYSIS_TYPES.CAMPAIGN]: `${baseIntro}

📊 ANÁLISIS DE CAMPAÑA PUBLICITARIA:

1. **Hook/Gancho** (¿atrapa en 3 segundos?)
2. **Propuesta de valor** (¿queda clara?)
3. **Call-to-Action** (¿visible? ¿accionable?)
4. **Copy** (¿persuasivo? ¿keywords correctas?)
5. **Visual hierarchy** (¿dónde va la mirada?)
6. **Mobile-first** (Ecuador = 90% mobile)
7. **Contexto cultural** (¿resuena con público ecuatoriano?)

MÉTRICAS ESPERADAS:
- CTR estimado (bajo/medio/alto)
- Tasa de conversión esperada
- Rango de CPC probable

✅ QUÉ ESTÁ FUNCIONANDO BIEN
⚠️ QUÉ OPTIMIZAR URGENTE (priorizado)
🎯 ESTRATEGIA: [Mantener/Optimizar/Rehacer]

TONO: Analítico, orientado a ROI, emojis de datos 📊💰
FORMATO: Bullets, métricas claras
LONGITUD: 250-350 palabras`,

    [ANALYSIS_TYPES.SOCIAL_POST]: `${baseIntro}

📱 ANÁLISIS DE POST PARA REDES SOCIALES:

1. **Stop-scroll power** (¿detiene el scroll?)
2. **Engagement potential**:
   - ¿Genera comentarios?
   - ¿Impulsa shares?
   - ¿Emociones evocadas?
3. **Copy + visual** (¿trabajan juntos?)
4. **Branding** (¿reconocible sin logo?)
5. **Contexto cultural** (¿local? ¿universal?)
6. **Formato óptimo**:
   - Instagram: ¿1:1 o 4:5?
   - TikTok: ¿9:16?
   - Facebook: ¿16:9?

PREDICCIÓN DE PERFORMANCE:
- Alcance: [bajo/medio/alto]
- Engagement rate: [estimado %]
- Mejor red social: [Instagram/TikTok/Facebook]

💡 3 ACCIONES PARA MEJORAR
🚀 LISTO PARA PUBLICAR: [SÍ/NO/CON AJUSTES]

TONO: Creativo, entusiasta, emojis de redes 📱💡🔥
FORMATO: Conversacional, bullets
LONGITUD: 200-300 palabras`,

    [ANALYSIS_TYPES.AD_CREATIVE]: `${baseIntro}

🎨 ANÁLISIS DE CREATIVIDAD PUBLICITARIA:

1. **Impacto visual** (0-10)
2. **Claridad del mensaje** (0-10)
3. **Diferenciación** (¿único o genérico?)
4. **Elementos clave**:
   - Imagen/video principal
   - Headline
   - Copy secundario
   - CTA button
   - Logo/branding
5. **Psicología publicitaria**:
   - FOMO ✅/❌
   - Prueba social ✅/❌
   - Urgencia ✅/❌
   - Beneficio claro ✅/❌
6. **Plataforma óptima**: [Meta/Google/TikTok]

BENCHMARK:
- Similar a [ejemplo reconocido]
- Nivel: [Principiante/Intermedio/Pro]

⚡ QUICK WINS (cambios rápidos, gran impacto)
🎯 RECOMENDACIÓN: [Aprobar/Iterar/Rehacerla]

TONO: Crítico constructivo, emojis de marketing 🎯⚡
FORMATO: Rating + bullets + acción
LONGITUD: 250-350 palabras`,

    [ANALYSIS_TYPES.BANNER]: `${baseIntro}

🖼️ ANÁLISIS DE BANNER/GRÁFICA:

1. **Jerarquía visual** (¿dónde va el ojo primero?)
2. **Legibilidad**:
   - ¿Se lee en 3 segundos?
   - ¿Texto suficientemente grande?
   - ¿Contraste adecuado?
3. **Elementos**:
   - Headline
   - Imagen/ilustración
   - Precio/oferta (si aplica)
   - CTA
   - Branding
4. **Tamaño/formato** (¿optimizado para su uso?)
5. **Coherencia de marca**

APLICACIÓN:
- ¿Dónde se usará? [Digital/Impreso/Ambos]
- ¿Funciona a distancia?
- ¿Funciona en móvil?

✅ FORTALEZAS
⚠️ AJUSTES NECESARIOS
💰 ROI ESPERADO: [Bajo/Medio/Alto]

TONO: Práctico, directo, emojis de diseño 🎨📐
FORMATO: Checklist + recomendaciones
LONGITUD: 200-300 palabras`,

    [ANALYSIS_TYPES.SCREENSHOT]: `${baseIntro}

📸 ANÁLISIS DE SCREENSHOT/CAPTURA:

Identifica el tipo de contenido en la captura y analiza según corresponda:
- Si es dashboard/métricas: Interpreta datos, sugiere optimizaciones
- Si es ad/campaña: Analiza performance, da feedback
- Si es diseño: Evalúa calidad y efectividad
- Si es competencia: Identifica aprendizajes y oportunidades

ESTRUCTURA:
1. **Qué veo**: [descripción breve]
2. **Insights clave**: [2-3 puntos principales]
3. **Oportunidades**: [acciones concretas]

💡 RECOMENDACIÓN PRINCIPAL (la MÁS importante)

TONO: Analítico, consultivo, emojis de data 📊🔍
FORMATO: Conversacional, bullets
LONGITUD: 200-300 palabras`,

    [ANALYSIS_TYPES.GENERAL]: `${baseIntro}

🔍 ANÁLISIS GENERAL DE MARKETING:

Analiza esta imagen desde perspectiva de marketing profesional:

1. **Propósito**: ¿Qué intenta comunicar/lograr?
2. **Efectividad**: ¿Lo logra? (0-10)
3. **Público objetivo**: ¿A quién va dirigido?
4. **Contexto cultural**: ¿Funciona en Ecuador/LATAM?
5. **Elementos destacados**:
   - Visual
   - Texto/copy
   - Colores
   - Composición

EVALUACIÓN:
✅ Qué funciona bien
⚠️ Qué mejorar
💡 Sugerencia principal

TONO: Profesional, constructivo, emojis relevantes
FORMATO: Estructurado, fácil de leer
LONGITUD: 250-350 palabras`
  };

  let prompt = prompts[visualType] || prompts[ANALYSIS_TYPES.GENERAL];
  
  // Agregar contexto del usuario si lo proporcionó
  if (userContext && userContext.trim().length > 0) {
    prompt += `\n\n📝 CONTEXTO ADICIONAL DEL USUARIO:\n"${userContext}"\n\nConsidera este contexto en tu análisis.`;
  }
  
  return prompt;
}

/**
 * 🎯 Analizar imagen de marketing con Vision AI
 * 
 * @param {string} imageUrl - URL de la imagen a analizar
 * @param {string} userMessage - Mensaje del usuario (para detectar tipo)
 * @param {object} options - Opciones adicionales
 * @returns {object} - Resultado del análisis
 */
export async function analyzeMarketingVisual(imageUrl, userMessage = '', options = {}) {
  try {
    console.log('[MARKETING-VISUAL] 🎯 Iniciando análisis...');
    console.log(`[MARKETING-VISUAL] 📸 Imagen: ${imageUrl}`);
    console.log(`[MARKETING-VISUAL] 💬 Contexto: ${userMessage.substring(0, 100)}...`);
    
    // Detectar tipo de análisis
    const visualType = options.visualType || detectVisualType(userMessage);
    console.log(`[MARKETING-VISUAL] 🔍 Tipo detectado: ${visualType}`);
    
    // Construir prompt especializado
    const prompt = buildMarketingPrompt(visualType, userMessage);
    
    // Analizar con Vision AI
    const analysis = await analyzeImage(imageUrl, prompt);
    
    if (!analysis || !analysis.success) {
      throw new Error('No se pudo analizar la imagen');
    }
    
    console.log('[MARKETING-VISUAL] ✅ Análisis completado');
    
    return {
      success: true,
      visualType,
      analysis: analysis.content, // ← Cambio: era analysis.response
      imageUrl,
      timestamp: new Date().toISOString(),
      confidence: 'high'
    };
    
  } catch (error) {
    console.error('[MARKETING-VISUAL] ❌ Error:', error.message);
    
    return {
      success: false,
      error: error.message,
      visualType: options.visualType || ANALYSIS_TYPES.GENERAL,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 🎨 Analizar múltiples imágenes (batch)
 * 
 * @param {Array<string>} imageUrls - Array de URLs de imágenes
 * @param {string} userMessage - Mensaje del usuario
 * @param {object} options - Opciones adicionales
 * @returns {object} - Resultado del análisis consolidado
 */
export async function analyzeBatchMarketingVisuals(imageUrls, userMessage = '', options = {}) {
  try {
    console.log(`[MARKETING-VISUAL] 🎯 Análisis batch de ${imageUrls.length} imágenes`);
    
    // Analizar todas las imágenes
    const analysisPromises = imageUrls.map((url, index) => 
      analyzeMarketingVisual(url, userMessage, { 
        ...options, 
        imageIndex: index + 1,
        totalImages: imageUrls.length 
      })
    );
    
    const results = await Promise.all(analysisPromises);
    
    // Consolidar resultados
    const successfulAnalyses = results.filter(r => r.success);
    const failedAnalyses = results.filter(r => !r.success);
    
    // Si todas fallaron
    if (successfulAnalyses.length === 0) {
      throw new Error('No se pudo analizar ninguna imagen');
    }
    
    // Combinar análisis en uno consolidado
    const consolidatedAnalysis = successfulAnalyses.length === 1 
      ? successfulAnalyses[0].analysis
      : `📊 ANÁLISIS DE ${successfulAnalyses.length} IMÁGENES:\n\n` +
        successfulAnalyses.map((r, i) => 
          `━━━━━━━━━━━━━━━\n🖼️ IMAGEN ${i + 1}:\n\n${r.analysis}\n`
        ).join('\n');
    
    console.log('[MARKETING-VISUAL] ✅ Análisis batch completado');
    
    return {
      success: true,
      totalImages: imageUrls.length,
      analyzedImages: successfulAnalyses.length,
      failedImages: failedAnalyses.length,
      analysis: consolidatedAnalysis,
      imageUrls,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[MARKETING-VISUAL] ❌ Error en batch:', error.message);
    
    return {
      success: false,
      error: error.message,
      totalImages: imageUrls.length,
      analyzedImages: 0,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 💡 Generar sugerencias de mejora basadas en análisis
 * 
 * @param {string} analysis - Texto del análisis
 * @returns {Array<string>} - Lista de sugerencias accionables
 */
export function extractActionableInsights(analysis) {
  const insights = [];
  
  // Buscar secciones de oportunidades/mejoras
  const improvementSection = analysis.match(/⚠️.*?(?=\n\n|$)/gs);
  if (improvementSection) {
    improvementSection.forEach(section => {
      const items = section.match(/[-•]\s*(.+)/g);
      if (items) {
        items.forEach(item => {
          const clean = item.replace(/^[-•]\s*/, '').trim();
          if (clean.length > 0) insights.push(clean);
        });
      }
    });
  }
  
  // Si no encontró nada específico, buscar bullets generales
  if (insights.length === 0) {
    const bullets = analysis.match(/[-•]\s*(.+)/g);
    if (bullets) {
      bullets.slice(0, 3).forEach(bullet => {
        const clean = bullet.replace(/^[-•]\s*/, '').trim();
        if (clean.length > 0) insights.push(clean);
      });
    }
  }
  
  return insights.slice(0, 5); // Máximo 5 insights
}

/**
 * 📊 Calcular score de calidad visual (0-100)
 * Basado en keywords del análisis
 */
export function calculateVisualQualityScore(analysis) {
  let score = 50; // Base
  
  // Palabras positivas (+5 cada una, max +30)
  const positiveWords = ['excelente', 'profesional', 'efectivo', 'claro', 'impactante', 'memorable', 'atractivo', 'funciona bien', 'alta calidad'];
  positiveWords.forEach(word => {
    if (analysis.toLowerCase().includes(word)) score = Math.min(100, score + 5);
  });
  
  // Palabras negativas (-5 cada una, max -30)
  const negativeWords = ['confuso', 'genérico', 'poco claro', 'débil', 'mejorar urgente', 'rehacer', 'no funciona', 'difícil de leer'];
  negativeWords.forEach(word => {
    if (analysis.toLowerCase().includes(word)) score = Math.max(0, score - 5);
  });
  
  return Math.round(score);
}

export default {
  analyzeMarketingVisual,
  analyzeBatchMarketingVisuals,
  extractActionableInsights,
  calculateVisualQualityScore,
  ANALYSIS_TYPES
};
