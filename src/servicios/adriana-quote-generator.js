/**
 * 🛡️ Adriana Quote Generator — Cotizaciones Automáticas VAZ
 * 
 * Genera cotizaciones comparativas completas:
 * - Selecciona mejores planes según perfil cliente
 * - Genera email HTML con tabla comparativa
 * - Envía por email con CC a admin
 * 
 * @author Adriana - SegPopular S.A.
 * @date 2026-03-25
 */

import { buildEmailTemplate } from './email-template-system.js';
import { sendEmail } from './email.js';
import { loggers } from '../utils/logger.js';
import { thinkingComplete, isGeminiAvailable } from '../servicios-ia/gemini.js';

// 📧 CC operativo a partner SegPopular: ELIMINADO el 02-may-2026 por decisión de Diego.
// Si necesitas re-activar copia a oficina SegPopular, configura ADRIANA_CC_EMAIL en Heroku.
const ADMIN_CC = process.env.ADRIANA_CC_EMAIL || '';
const ADMIN_WA = (process.env.BOT_PHONE || '593994837117').replace('+', '');

/**
 * Genera cotización comparativa y la envía por email
 * @param {Object} vehicleData - Datos del vehículo
 * @param {Object} customerData - Datos del cliente extraídos de cédula
 * @param {Object} vazRates - Tasas VAZ obtenidas (3 planes)
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Resultado del envío
 */
export async function generateAndSendComparisonQuote(
  vehicleData, 
  customerData, 
  vazRates,
  options = {}
) {
  try {
    const {
      quoteCode = `VAZ-${Date.now().toString(36).toUpperCase()}`,
      additionalNotes = ''
    } = options;

    // Validar datos mínimos
    if (!customerData.email) {
      throw new Error('Email del cliente es obligatorio');
    }

    if (!vehicleData.brand || !vehicleData.model) {
      throw new Error('Marca y modelo del vehículo son obligatorios');
    }

    // Construir datos para el template
    const templateData = {
      nombre: customerData.nombres,
      marca: vehicleData.brand.toUpperCase(),
      modelo: vehicleData.model.toUpperCase(),
      anio: vehicleData.year,
      valor_asegurado: `$${Number(vehicleData.commercialValue || 40000).toLocaleString()}`,
      
      // Plan VAZ Elemental (código interno: Ensigna)
      vaz_prima_anual: `$${vazRates.plans[0].annualPremium.toLocaleString()}`,
      vaz_prima_mensual: `$${vazRates.plans[0].monthlyPremium.toLocaleString()}`,
      vaz_deducible: vazRates.plans[0].deductible.client, // 7%
      vaz_cuotas: vazRates.plans[0].maxInstallments, // hasta 12 meses
      
      // Análisis profesional de Adriana (Gemini thinking si disponible)
      analisis_broker: await generateBrokerAnalysis(vehicleData, customerData, vazRates),
      
      // Competidores (opcional, para comparación)
      competitors: options.includeCompetitors ? generateCompetitorComparison(vazRates) : [],
      
      // Metadata
      fecha_cotizacion: new Date().toLocaleDateString('es-EC', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      bot_phone: ADMIN_WA,
      adriana_email: process.env.ADRIANA_EMAIL || 'adriana@segpopular.com',
      adriana_phone: process.env.ADRIANA_PHONE || '+593 99 123 4567',
      quote_code: quoteCode,
    };

    // Generar HTML del email usando template COMPARISON_V2
    const html = buildEmailTemplate('ADRIANA', 'COMPARISON_V2', templateData);

    // Subject personalizado
    const subject = `Cotización 🛡️ ${quoteCode} — ${vehicleData.brand} ${vehicleData.model} ${vehicleData.year} · ${customerData.nombres} | Adriana - SegPopular`;

    // Enviar email (CC opcional vía env ADRIANA_CC_EMAIL)
    const emailResult = await sendEmail({
      to: customerData.email,
      cc: ADMIN_CC || undefined,
      subject,
      html,
      from: {
        name: 'Adriana • Directora SegPopular',
        address: process.env.ADRIANA_SMTP_USER || process.env.EMAIL_USER || 'secretaria.coworkia@gmail.com'
      },
      agent: 'adriana'
    });

    loggers.adriana.info('Cotización generada y enviada', {
      quoteCode,
      email: customerData.email,
      vehicle: `${vehicleData.brand} ${vehicleData.model} ${vehicleData.year}`,
      annualPremium: vazRates.plans[0].annualPremium
    });

    return {
      success: true,
      quoteCode,
      email: customerData.email,
      emailSent: emailResult.success,
      annualPremium: vazRates.plans[0].annualPremium,
      monthlyPremium: vazRates.plans[0].monthlyPremium
    };

  } catch (error) {
    loggers.adriana.error('Error generando cotización', {}, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Genera análisis profesional personalizado de Adriana.
 * Usa Gemini thinking para razonamiento comparativo real, con fallback a template.
 */
async function generateBrokerAnalysis(vehicleData, customerData, vazRates) {
  const firstName = customerData.nombres?.split(' ')[0] || 'Cliente';
  const vehicleName = [vehicleData.brand, vehicleData.model].filter(Boolean).join(' ');
  const plan = vazRates.plans[0];

  // 🧠 Intentar Gemini thinking para análisis más profundo
  if (isGeminiAvailable()) {
    try {
      const geminiAnalysis = await thinkingComplete(
        `Eres Adriana, broker de seguros vehiculares de SegPopular S.A. en Ecuador.
Genera un análisis personalizado de 4-5 líneas para este cliente:

- Cliente: ${firstName}
- Vehículo: ${vehicleName} ${vehicleData.year || ''}
- Valor comercial: $${Number(vehicleData.commercialValue || 40000).toLocaleString()}
- Plan recomendado: VAZ Elemental
- Prima mensual: $${plan.monthlyPremium.toLocaleString()}
- Prima anual: $${plan.annualPremium.toLocaleString()}
- Deducible: ${plan.deductible.client}
- Edad del cliente: ${customerData.edad || 'desconocida'}
- Provincia: ${customerData.provincia || 'no especificada'}

Escribe el análisis dirigido al cliente en primera persona ("he analizado"). Menciona por qué este plan es competitivo para su vehículo específico. Sé específico con datos. No uses markdown. Máximo 5 líneas.`,
        {
          system: 'Eres Adriana, directora de SegPopular S.A., broker experta en seguros vehiculares en Ecuador. Respondes con análisis concisos, profesionales y personalizados. Solo texto plano, sin markdown.',
          maxOutputTokens: 400,
          thinkingBudget: 2048,
          timeout: 15000,
        }
      );

      if (geminiAnalysis && geminiAnalysis.length > 50) {
        console.log('[ADRIANA-QUOTE] ✅ Análisis broker generado con Gemini thinking');
        return geminiAnalysis;
      }
    } catch (err) {
      console.warn('[ADRIANA-QUOTE] Gemini broker analysis failed, using template:', err.message);
    }
  }

  // Fallback: template estático
  const age = customerData.edad || null;
  const ageNote = age && age < 25 
    ? ' Como conductor joven, este plan ofrece la mejor relación costo-beneficio.'
    : age && age > 60 
    ? ' El plan incluye cobertura completa sin restricciones por edad.'
    : '';

  return `${firstName}, he analizado el mercado ecuatoriano y el Plan VAZ Elemental es la mejor opción para tu ${vehicleName}. Con una prima de $${plan.monthlyPremium.toLocaleString()}/mes (hasta 12 meses), obtienes cobertura completa con deducible del ${plan.deductible.client}, asistencia vial 24/7 en todo el país y red de talleres autorizados en ${customerData.provincia || 'tu provincia'}.${ageNote} Este plan te ofrece tranquilidad sin comprometer tu presupuesto.`;
}

/**
 * Genera comparación con otros planes (opcional)
 */
function generateCompetitorComparison(vazRates) {
  // Tomar los 2 planes adicionales (Standard y Premium)
  return vazRates.plans.slice(1).map(plan => ({
    insurer: plan.name,
    annual: plan.annualPremium,
    monthly: plan.monthlyPremium,
    deductible: plan.deductible.client,
    notes: plan.coverage
  }));
}

/**
 * Calcula score de competitividad de una cotización
 * @param {number} annualPremium - Prima anual
 * @param {number} vehicleValue - Valor comercial del vehículo
 * @returns {Object} Score y análisis
 */
export function calculateCompetitivenessScore(annualPremium, vehicleValue) {
  const rate = (annualPremium / vehicleValue) * 100;
  
  let score, label, color;
  
  if (rate < 3.0) {
    score = 10;
    label = 'Excelente precio';
    color = '#16a34a'; // green-600
  } else if (rate < 3.5) {
    score = 8;
    label = 'Muy competitivo';
    color = '#22c55e'; // green-500
  } else if (rate < 4.0) {
    score = 6;
    label = 'Precio justo';
    color = '#eab308'; // yellow-500
  } else if (rate < 4.5) {
    score = 4;
    label = 'Por encima del promedio';
    color = '#f97316'; // orange-500
  } else {
    score = 2;
    label = 'Alto - considerar negociar';
    color = '#ef4444'; // red-500
  }
  
  return {
    score,
    label,
    color,
    rate: rate.toFixed(2),
    analysis: `Estás pagando ${rate.toFixed(2)}% del valor del vehículo anualmente. ${
      score >= 8 
        ? 'Este es un excelente precio en el mercado ecuatoriano.' 
        : score >= 6 
        ? 'Precio dentro del rango normal del mercado.' 
        : 'Podrías encontrar mejores opciones. Te ayudo a comparar.'
    }`
  };
}
