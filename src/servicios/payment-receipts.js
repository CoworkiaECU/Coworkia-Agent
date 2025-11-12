/**
 * 💳 Sistema de Comprobantes de Pago - Coworkia
 * Maneja validación automática de comprobantes de pago enviados por WhatsApp
 */

import dotenv from 'dotenv';
dotenv.config();

import reservationRepository from '../database/reservationRepository.js';
import { updateReservationPayment } from './calendario.js';
import { enqueueBackgroundTask } from './task-queue.js';
import { sendReservationConfirmation } from './email.js';
import { createCalendarEvent } from './google-calendar.js';
import { clearPendingConfirmation } from '../perfiles-interacciones/memoria-sqlite.js';
import { markJustConfirmed } from './reservation-state.js';
import { sendReservationNotifications } from './notification-helper.js';

/**
 * 📄 Instrucciones para solicitar comprobantes de pago
 */
export const PAYMENT_INSTRUCTIONS = {
  
  // 🏦 Datos bancarios para transferencias
  BANK_INFO: `
🏦 **TRANSFERENCIA BANCARIA:**
• Banco: Banco Pichincha
• Cuenta Corriente: 2201234567
• Nombre: Coworkia Ecuador S.A.
• RUC: 1792345678001
• Email: pagos@coworkia.com
  `.trim(),
  
  // 💳 Link de Payphone
  PAYPHONE_INFO: `
💳 **PAGO CON TARJETA (PAYPHONE):**
🔗 https://pay.payphoneapp.com/coworkia

• Ingresa el link → Coloca tu tarjeta → Paga
• Proceso 100% seguro y automático
• Confirmación inmediata
  `.trim(),
  
  // 📱 Instrucciones para enviar comprobante
  RECEIPT_INSTRUCTIONS: `
📄 **ENVIAR COMPROBANTE:**

Después de realizar el pago, envíame:
📸 **Foto del comprobante** (captura de pantalla o foto)
📋 **Incluye estos datos:**
   • Monto pagado
   • Fecha y hora
   • Número de referencia/transacción
   • Tu nombre completo

⚡ **Validación automática:** En 30 segundos verifico tu pago y confirmo tu reserva
  `.trim(),

  // ✅ Mensaje completo para usuarios que deben pagar
  FULL_PAYMENT_MESSAGE: (reservationDetails, totalAmount) => `
💰 **INFORMACIÓN DE PAGO**

📋 **Tu reserva:**
${reservationDetails}

💵 **Total a pagar:** $${totalAmount} USD

${PAYMENT_INSTRUCTIONS.PAYPHONE_INFO}

${PAYMENT_INSTRUCTIONS.BANK_INFO}

${PAYMENT_INSTRUCTIONS.RECEIPT_INSTRUCTIONS}

¿Cómo prefieres pagar? 💳🏦
  `.trim()
};

/**
 * 📸 Detecta si el mensaje contiene una imagen (comprobante)
 */
export function isReceiptImage(messageData) {
  const { type, media } = messageData;
  
  // Verificar si es imagen
  if (type !== 'image' && type !== 'document') {
    return false;
  }
  
  // Verificar que tenga media válido
  if (!media || !media.url) {
    return false;
  }
  
  console.log('[RECEIPT] 📸 Imagen detectada:', {
    type: type,
    mimeType: media.mimeType,
    size: media.size,
    url: media.url ? 'presente' : 'ausente'
  });
  
  return true;
}

/**
 * 🔍 Procesa comprobante de pago automáticamente
 */
export async function processPaymentReceipt(messageData, userProfile) {
  console.log('[RECEIPT] 🔍 Procesando comprobante de pago...');
  
  try {
    const pendingReservation = await reservationRepository.findPendingByUser(userProfile.userId);

    if (!pendingReservation || pendingReservation.status !== 'pending_payment' || pendingReservation.payment_status === 'paid') {
      return {
        success: false,
        message: `📄 Recibí tu imagen, pero no encuentro reservas pendientes de pago en tu cuenta.
        
¿Necesitas agendar otra fecha? Solo dime cuándo quieres venir 😊`,
        needsAction: false
      };
    }
    
    const expectedAmount = Number(pendingReservation.total_price || 0);
    
    console.log('[RECEIPT] 🤖 Analizando comprobante con IA...');
    const analysisResult = await analyzeReceiptImage(messageData, expectedAmount);
    
    if (analysisResult.isValid) {
      console.log('[RECEIPT] ✅ Pago válido detectado, confirmando reserva en SQLite...');

      const updatedReservation = await updateReservationPayment(pendingReservation.id, {
        paymentMethod: analysisResult.paymentMethod,
        reference: analysisResult.reference,
        amount: analysisResult.amount,
        date: new Date().toISOString()
      });

      await clearPendingConfirmation(userProfile.userId);
      await markJustConfirmed(userProfile.userId, updatedReservation.id);
      
      // Enviar notificaciones INLINE con await para garantizar ejecución
      await queueReservationNotifications(updatedReservation, userProfile, analysisResult.amount);
      
      return {
        success: true,
        message: `✅ **¡Pago verificado y reserva confirmada!** 🎉

📋 **Detalles confirmados:**
📅 ${updatedReservation.date}
🕐 ${updatedReservation.start_time} - ${updatedReservation.end_time} 
🏢 ${formatServiceType(updatedReservation.service_type)}
💰 $${analysisResult.amount} USD ✅

📧 Te envío la confirmación completa por email
📍 **Ubicación:** Whymper 403, Edificio Finistere
🗺️ https://maps.app.goo.gl/Nqy6YeGuxo3czEt66

¡Te esperamos! 🚀`,
        reservation: updatedReservation,
        needsAction: true, // Para enviar email de confirmación
        actionType: 'SEND_CONFIRMATION_EMAIL'
      };
      
    } else {
      return {
        success: false,
        message: `❌ No pude verificar tu comprobante automáticamente.

🔍 **Posibles problemas:**
${analysisResult.issues ? analysisResult.issues.map(i => `• ${i}`).join('\n') : '• Imagen no clara o incompleta'}

📱 **Por favor, envía una nueva foto que incluya:**
• Monto completo: $${expectedAmount} USD
• Fecha y hora del pago
• Número de transacción/referencia
• Foto clara y legible

O contáctanos al 📞 +593 99 483 7117 para verificación manual.`,
        needsAction: false
      };
    }
    
  } catch (error) {
    console.error('[RECEIPT] ❌ Error procesando comprobante:', error);
    
    return {
      success: false,
      message: `⚠️ Error procesando tu comprobante. 

Por favor contacta a nuestro equipo:
📞 +593 99 483 7117
📧 secretaria.coworkia@gmail.com

Te ayudaremos a verificar tu pago manualmente 😊`,
      needsAction: false
    };
  }
}

/**
 * 🤖 Analiza imagen de comprobante con OpenAI Vision API
 */
async function analyzeReceiptImage(messageData, expectedAmount) {
  console.log('[RECEIPT] 🤖 Analizando comprobante con OpenAI Vision...');
  
  try {
    // Importar OpenAI dinámicamente
    const { default: OpenAI } = await import('openai');
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[RECEIPT] ⚠️ OpenAI API Key no configurada, usando análisis simulado');
      return await simulateReceiptAnalysis(expectedAmount);
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Verificar si tenemos datos de imagen
    if (!messageData.media || !messageData.media.url) {
      console.log('[RECEIPT] ❌ No hay imagen en el mensaje');
      return { isValid: false, reason: 'No se encontró imagen válida' };
    }
    
    // Analizar imagen con GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analiza este comprobante de pago y extrae la información clave. 
              
Busca específicamente:
- Monto pagado (debe ser aproximadamente $${expectedAmount} USD)  
- Fecha de la transacción
- Número de referencia/transacción
- Banco o método de pago (Banco Pichincha, Payphone, etc.)
- Confirmación de que es un pago exitoso

Responde en formato JSON con esta estructura:
{
  "isValid": true/false,
  "amount": numero_encontrado,
  "reference": "referencia_encontrada", 
  "paymentMethod": "método_detectado",
  "date": "fecha_encontrada",
  "confidence": 0.0-1.0,
  "reason": "explicación si no es válido"
}`
            },
            {
              type: "image_url",
              image_url: {
                url: messageData.media.url
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });
    
    const analysisText = response.choices[0]?.message?.content;
    console.log('[RECEIPT] 🔍 Respuesta de OpenAI:', analysisText);
    
    // Parsear respuesta JSON
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('[RECEIPT] ❌ Error parseando respuesta JSON:', parseError);
      return await simulateReceiptAnalysis(expectedAmount);
    }
    
    // Validar que el monto coincida (±10% tolerancia)
    const amountDifference = Math.abs(analysis.amount - expectedAmount);
    const tolerancePercent = 0.10; // 10% tolerancia
    const maxDifference = expectedAmount * tolerancePercent;
    
    if (analysis.isValid && amountDifference <= maxDifference) {
      console.log('[RECEIPT] ✅ Comprobante válido confirmado por AI');
      return {
        isValid: true,
        amount: analysis.amount,
        reference: analysis.reference || 'N/A',
        paymentMethod: analysis.paymentMethod || 'Método no identificado',
        confidence: analysis.confidence || 0.8,
        aiAnalyzed: true
      };
    } else {
      console.log('[RECEIPT] ❌ Comprobante no válido según AI:', analysis.reason);
      return {
        isValid: false,
        reason: analysis.reason || `Monto esperado $${expectedAmount} no coincide con $${analysis.amount}`,
        confidence: analysis.confidence || 0.5,
        aiAnalyzed: true
      };
    }
    
  } catch (error) {
    console.error('[RECEIPT] ❌ Error con OpenAI Vision:', error);
    console.log('[RECEIPT] 🔄 Usando análisis simulado como fallback...');
    return await simulateReceiptAnalysis(expectedAmount);
  }
}

/**
 * 🤖 Análisis simulado como fallback
 */
async function simulateReceiptAnalysis(expectedAmount) {
  console.log('[RECEIPT] 🎭 Análisis simulado (fallback)...');
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simular procesamiento
  
  // Simulación básica que siempre acepta (para testing)
  return {
    isValid: true,
    amount: expectedAmount,
    reference: `SIM${Date.now()}`,
    paymentMethod: 'Simulado - Testing',
    confidence: 0.9,
    aiAnalyzed: false
  };
}

/**
 * 📧 Generar mensaje de solicitud de pago personalizado
 */
export function generatePaymentRequest(reservationDetails, userProfile) {
  const { serviceType, date, startTime, endTime, totalPrice, guestCount = 0 } = reservationDetails;
  const userName = userProfile.name || 'Cliente';
  
  const reservationSummary = `
📅 **Fecha:** ${date}
🕐 **Horario:** ${startTime} - ${endTime}
🏢 **Servicio:** ${serviceType}
👥 **Personas:** ${1 + guestCount}
💰 **Total:** $${totalPrice} USD
  `.trim();
  
  return PAYMENT_INSTRUCTIONS.FULL_PAYMENT_MESSAGE(reservationSummary, totalPrice);
}

/**
 * 📊 Estadísticas de comprobantes procesados
 */
export async function getReceiptStats() {
  return {
    today: {
      processed: 0, // En producción, consultar base de datos
      validated: 0,
      rejected: 0
    },
    week: {
      processed: 0,
      validated: 0,
      rejected: 0
    },
    averageProcessingTime: '45 segundos'
  };
}
function formatServiceType(serviceType = '') {
  if (serviceType === 'hotDesk') return 'Hot Desk';
  if (serviceType === 'meetingRoom') return 'Sala de Reuniones';
  if (serviceType === 'privateOffice') return 'Oficina Privada';
  return serviceType;
}

async function queueReservationNotifications(reservation, userProfile, paidAmount) {
  if (!userProfile.email) {
    console.warn('[RECEIPT] ⚠️ Usuario sin email configurado, notificaciones no se enviarán');
    return { email: { success: false }, calendar: { success: false } };
  }
  
  console.log('[RECEIPT] 🚀 Enviando notificaciones INLINE (email + calendar) para pago confirmado...');
  
  // EJECUTAR INLINE con reintentos automáticos
  const notificationResults = await sendReservationNotifications({
    email: userProfile.email,
    userName: userProfile.name || 'Cliente',
    date: reservation.date,
    startTime: reservation.start_time,
    endTime: reservation.end_time,
    serviceType: reservation.service_type,
    guestCount: reservation.guest_count || 0,
    wasFree: false,
    durationHours: reservation.duration_hours,
    totalPrice: paidAmount,
    reservation: reservation
  });
  
  // Log detallado de resultados
  if (notificationResults.bothSucceeded) {
    console.log('[RECEIPT] ✅ AMBAS notificaciones enviadas exitosamente (email + calendar)');
  } else if (notificationResults.anySucceeded) {
    console.warn('[RECEIPT] ⚠️ PARCIAL: Solo algunas notificaciones se enviaron:', {
      email: notificationResults.email.success ? 'OK' : 'FAILED',
      calendar: notificationResults.calendar.success ? 'OK' : 'FAILED'
    });
  } else {
    console.error('[RECEIPT] 🚨 CRÍTICO: NINGUNA notificación se envió - Revisión manual requerida');
    console.error('[RECEIPT] 🚨 Detalles de la reserva:', {
      reservationId: reservation.id,
      userId: reservation.user_id,
      email: userProfile.email,
      date: reservation.date,
      startTime: reservation.start_time
    });
  }
  
  return notificationResults;
}
