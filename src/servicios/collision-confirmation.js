/**
 * 🔨 AXEL - PaintBull Collision Confirmation Handler
 * 
 * Maneja la confirmación SI del usuario y completa el proceso de cotización:
 * 1. Analiza fotos con AI Vision (si aún no se hizo)
 * 2. Genera cotización detallada con OpenAI
 * 3. Guarda el quote en la base de datos (collision_quotes)
 * 4. Envía email con cotización y análisis de daños
 * 5. Retorna mensaje de éxito con código de cotización
 * 
 * DIFERENCIAS con Insurance:
 * - Usa AI Vision para analizar daños en fotos
 * - Genera cotización de reparación (no prima de seguro)
 * - Guarda en tabla collision_quotes (no insurance_leads)
 * - No valida ciudad ni rango de valores
 * - NO crea evento de calendario automáticamente
 */

import { getPendingConfirmation, clearPendingConfirmation } from './reservation-state.js';
import databaseService from '../database/database.js';
import axelRepository from '../database/axelRepository.js';
import { sendQuoteEmail } from './axel-quote-email.js';
import { analyzeCollisionPhotos } from './axel-vision-analysis.js';
import { generateQuote } from './axel-quote-generator.js';
import { generateQuoteCode } from './axel-quote-code.js';

/**
 * ✅ Procesa confirmación SI de Axel
 */
export async function confirmCollisionQuote(userId, userProfile) {
  console.log('[COLLISION-CONFIRM] 🔨 Procesando confirmación de cotización...');

  // Obtener datos pendientes
  const pendingData = await getPendingConfirmation(userId);
  
  if (!pendingData || pendingData.agentName !== 'AXEL') {
    console.log('[COLLISION-CONFIRM] ⚠️ No hay datos pendientes de AXEL');
    return {
      success: false,
      message: 'No encontré datos pendientes de cotización. Por favor inicia el proceso nuevamente con @axel.'
    };
  }

  const formData = pendingData.formData;

  try {
    // ==========================================
    // 1️⃣ ANALIZAR FOTOS CON AI VISION
    // ==========================================
    
    let damageAnalysis = null;
    
    if (formData.photoUrls && formData.photoUrls.length > 0) {
      console.log(`[COLLISION-CONFIRM] 👁️ Analizando ${formData.photoUrls.length} foto(s)...`);
      
      const visionResult = await analyzeCollisionPhotos(formData.photoUrls);
      
      if (visionResult.success) {
        damageAnalysis = visionResult;
        console.log('[COLLISION-CONFIRM] ✅ Análisis AI Vision completado:', {
          severity: damageAnalysis.severity,
          parts: damageAnalysis.affectedParts?.length
        });
      } else {
        console.warn('[COLLISION-CONFIRM] ⚠️ AI Vision falló, continuando sin análisis:', visionResult.error);
        // Análisis fallback manual
        damageAnalysis = {
          severity: 'MODERADO',
          damageDetails: formData.damageDescription || 'Daño requiere inspección en taller',
          affectedParts: [formData.damageType || 'carrocería'],
          hiddenDamageRisk: 'MEDIO',
          estimatedRepairDays: '3-7 días'
        };
      }
    } else {
      console.log('[COLLISION-CONFIRM] ⚠️ No hay fotos para analizar');
      damageAnalysis = {
        severity: 'DESCONOCIDO',
        damageDetails: 'Sin fotos disponibles para análisis',
        affectedParts: [formData.damageType || 'a determinar'],
        hiddenDamageRisk: 'ALTO',
        estimatedRepairDays: 'Requiere inspección'
      };
    }

    // ==========================================
    // 2️⃣ GENERAR COTIZACIÓN CON OPENAI
    // ==========================================
    
    console.log('[COLLISION-CONFIRM] 💰 Generando cotización...');
    
    const vehicleData = {
      marca: formData.vehicleBrand,
      modelo: formData.vehicleModel,
      año: formData.vehicleYear
    };

    const quoteResult = await generateQuote({
      vehicleData,
      damageAnalysis,
      photoUrls: formData.photoUrls || []
    });

    if (!quoteResult.success) {
      console.error('[COLLISION-CONFIRM] ❌ Error generando cotización:', quoteResult.error);
      return {
        success: false,
        message: `❌ Hubo un error generando la cotización: ${quoteResult.error}\n\nPor favor intenta nuevamente más tarde.`
      };
    }

    const quoteDetails = quoteResult.quote;
    const priceRange = quoteResult.priceRange;

    console.log('[COLLISION-CONFIRM] ✅ Cotización generada:', {
      min: priceRange.min,
      max: priceRange.max
    });

    // ==========================================
    // 3️⃣ GUARDAR EN BASE DE DATOS usando axelRepository
    // ==========================================
    
    const quoteCode = (await generateQuoteCode()).code;
    
    const quoteData = {
      id: `collision_${Date.now()}_${userId.replace(/\+/g, '')}`,
      quoteCode: quoteCode,
      userId: userId,
      damageType: formData.damageType || 'General',
      clientName: formData.fullName,
      vehicleBrand: formData.vehicleBrand,
      vehicleModel: formData.vehicleModel,
      vehicleYear: formData.vehicleYear,
      email: formData.email || null,
      phone: formData.phone || null,
      damageDescription: formData.damageDescription || '',
      photoUrls: formData.photoUrls || [],
      damageAnalysis: {
        severity: damageAnalysis.severity,
        details: damageAnalysis.damageDetails,
        parts: damageAnalysis.affectedParts,
        risk: damageAnalysis.hiddenDamageRisk,
        estimatedDays: damageAnalysis.estimatedRepairDays
      },
      quoteDetails: quoteDetails,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      sessionFingerprint: null
    };
    
    const { id: quoteId } = await axelRepository.saveCollisionQuote(quoteData);
    console.log(`[COLLISION-CONFIRM] ✅ Cotización guardada: ${quoteId}`);

    // ==========================================
    // 4️⃣ ENVIAR EMAIL CON COTIZACIÓN
    // ==========================================
    
    let emailSent = false;
    let emailError = null;

    if (formData.email) {
      try {
        const emailResult = await sendQuoteEmail({
          customerEmail: formData.email,
          customerName: formData.fullName,
          vehicleData: {
            marca: formData.vehicleBrand,
            modelo: formData.vehicleModel,
            año: formData.vehicleYear
          },
          damageAnalysis,
          quote: quoteDetails,
          priceRange,
          photoUrls: formData.photoUrls || [],
          quoteCode
        });

        emailSent = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.error;
          console.error('[COLLISION-CONFIRM] ❌ Error enviando email:', emailResult.error);
        } else {
          console.log('[COLLISION-CONFIRM] ✅ Email enviado exitosamente con fotos');
        }
      } catch (error) {
        console.error('[COLLISION-CONFIRM] ❌ Error enviando email:', error);
        emailError = error.message;
      }
    } else {
      console.log('[COLLISION-CONFIRM] ⚠️ No hay email para enviar cotización');
    }

    // ==========================================
    // 5️⃣ LIMPIAR DATOS PENDIENTES
    // ==========================================
    
    await clearPendingConfirmation(userId);
    console.log('[COLLISION-CONFIRM] 🗑️ Datos pendientes limpiados');

    // ==========================================
    // 6️⃣ RETORNAR RESULTADO
    // ==========================================
    
    return {
      success: true,
      quoteId,
      quoteCode,
      message: `✅ Cotización generada exitosamente!

📋 Código de cotización: ${quoteCode}

💰 ESTIMACIÓN DE REPARACIÓN:
━━━━━━━━━━━━━━━
🚗 Vehículo: ${formData.vehicleBrand} ${formData.vehicleModel} ${formData.vehicleYear}
🔨 Daño: ${formData.damageType || 'General'}
⚠️ Severidad: ${damageAnalysis.severity}
⏰ Tiempo estimado: ${damageAnalysis.estimatedRepairDays}

💵 Rango de precio: $${priceRange.min.toLocaleString('en-US')} - $${priceRange.max.toLocaleString('en-US')} USD

${emailSent ? '📧 Te enviamos los detalles completos a tu email\n\n' : ''}${emailError ? `⚠️ Hubo un problema enviando el email: ${emailError}\n\n` : ''}🔨 PaintBull - 15 años de experiencia en colisiones
💡 Guarda tu código ${quoteCode} para agendar inspección en taller`,
      data: {
        quoteId,
        quoteCode,
        vehicleInfo: `${formData.vehicleBrand} ${formData.vehicleModel} ${formData.vehicleYear}`,
        severity: damageAnalysis.severity,
        priceRange,
        estimatedDays: damageAnalysis.estimatedRepairDays,
        emailSent
      }
    };

  } catch (error) {
    console.error('[COLLISION-CONFIRM] ❌ Error general:', error);
    return {
      success: false,
      message: `❌ Error procesando cotización: ${error.message}\n\nPor favor intenta nuevamente.`
    };
  }
}

export default {
  confirmCollisionQuote
};
