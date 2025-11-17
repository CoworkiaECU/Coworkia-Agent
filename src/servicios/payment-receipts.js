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
import { clearPendingConfirmation, setPendingConfirmation } from '../perfiles-interacciones/memoria-sqlite.js';
import { markJustConfirmed } from './reservation-state.js';
import { sendReservationNotifications } from './notification-helper.js';
import { analyzePaymentReceipt } from '../servicios-ia/openai.js';

/**
 * 📄 Instrucciones para solicitar comprobantes de pago
 */
export const PAYMENT_INSTRUCTIONS = {
  
  // 🏦 Datos bancarios para transferencias
  BANK_INFO: `
🏦 **TRANSFERENCIA BANCARIA:**
• Banco: Produbanco
• Cuenta Ahorros: 20059783069
• Nombre: Coworkia
• RUC: 1702683499001
• Email: coworkia.ec@gmail.com
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
    // 🔍 SIEMPRE analizar imagen primero con Vision API
    console.log('[RECEIPT] 🤖 Analizando comprobante con Vision API...');
    const analysisResult = await analyzeReceiptImage(messageData, null); // null = sin monto esperado
    
    // Transcribir datos extraídos
    const transcription = `📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $${analysisResult.amount || 'No detectado'}
📅 Fecha: ${analysisResult.date || 'No detectada'}
💳 Método: ${analysisResult.paymentMethod || 'No especificado'}
${analysisResult.reference ? `🔢 Referencia: ${analysisResult.reference}` : ''}

¿Los datos son correctos?`;

    // Buscar reserva pendiente
    const pendingReservation = await reservationRepository.findPendingByUser(userProfile.userId);

    if (!pendingReservation || pendingReservation.status !== 'pending_payment' || pendingReservation.payment_status === 'paid') {
      return {
        success: false,
        message: `${transcription}

⚠️ No encuentro reservas pendientes de pago en tu cuenta.

¿Necesitas agendar otra fecha? Solo dime cuándo quieres venir 😊`,
        needsAction: false,
        data: analysisResult
      };
    }
    
    const expectedAmount = Number(pendingReservation.total_price || 0);
    
    // Validar monto con reserva existente
    const amountDifference = Math.abs(analysisResult.amount - expectedAmount);
    const isAmountValid = amountDifference <= 0.50; // Tolerancia $0.50
    
    if (analysisResult.amount && isAmountValid) {
      console.log('[RECEIPT] ✅ Pago válido detectado, guardando info de pago...');

      // Guardar información del pago PERO NO confirmar aún
      const updatedReservation = await updateReservationPayment(pendingReservation.id, {
        paymentMethod: analysisResult.paymentMethod,
        reference: analysisResult.reference,
        amount: analysisResult.amount,
        date: new Date().toISOString()
      });

      // NO limpiar pending confirmation - esperamos respuesta SI/NO del usuario
      // await clearPendingConfirmation(userProfile.userId); // COMENTADO
      
      // Guardar datos del pago en pending confirmation para usarlos después del SI
      await setPendingConfirmation(userProfile.userId, {
        reservationId: updatedReservation.id,
        paymentVerified: true,
        paymentReceipt: {
          method: analysisResult.paymentMethod,
          reference: analysisResult.reference,
          amount: analysisResult.amount,
          date: new Date().toISOString(),
          bank: analysisResult.bank || 'No especificado'
        },
        type: 'payment_verification'
      }, 15); // 15 minutos para confirmar
      
      return {
        success: true,
        message: `${transcription}

✅ **¡Pago verificado!** 💰

📋 **Tu reserva:**
📅 ${updatedReservation.date}
🕐 ${updatedReservation.start_time} - ${updatedReservation.end_time} 
🏢 ${formatServiceType(updatedReservation.service_type)}
💰 $${analysisResult.amount} USD ✅

**¿Confirmas esta reserva?**

Responde **SI** para agendar o **NO** si necesitas cambiar fecha/hora 😊`,
        reservation: updatedReservation,
        needsConfirmation: true, // Activar flujo SI/NO
        actionType: 'AWAIT_FINAL_CONFIRMATION',
        data: analysisResult
      };
      
    } else {
      // Transcribir datos pero indicar problema de monto
      const serviceType = pendingReservation.service_type === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones';
      const transcriptionWithIssue = `${transcription}

⚠️ **EL MONTO NO COINCIDE**

Tu reserva es:
🏢 ${serviceType}
💰 Total a pagar: **$${expectedAmount.toFixed(2)}**
💳 Monto detectado en tu comprobante: **$${analysisResult.amount ? analysisResult.amount.toFixed(2) : 'No detectado'}**

❌ Diferencia: $${Math.abs(expectedAmount - (analysisResult.amount || 0)).toFixed(2)}

📸 **Por favor:**
• Verifica que pagaste el monto correcto ($${expectedAmount.toFixed(2)})
• Si pagaste menos, completa la diferencia
• Envía el comprobante correcto o más claro

¿Necesitas ayuda? Escríbeme 😊`;
      
      return {
        success: false,
        message: transcriptionWithIssue,
        needsAction: false,
        data: analysisResult
      };
    }
    
  } catch (error) {
    // 🚨 LOG CRÍTICO CON CONTEXTO COMPLETO
    console.error('[RECEIPT] 🚨 ERROR CRÍTICO procesando comprobante:', {
      error: error.message,
      stack: error.stack,
      userId: userId || 'unknown',
      hasImage: !!imageUrl,
      imageUrl: imageUrl || 'none',
      pendingReservationId: pendingReservation?.id || 'not_found',
      timestamp: new Date().toISOString()
    });
    
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
  console.log('[RECEIPT] 🤖 Analizando comprobante con Vision API...');
  
  try {
    // Verificar si tenemos datos de imagen
    if (!messageData.media || !messageData.media.url) {
      console.log('[RECEIPT] ❌ No hay imagen en el mensaje');
      return { 
        isValid: false, 
        amount: null,
        reason: 'No se encontró imagen válida' 
      };
    }
    
    // Usar la función de openai.js con Vision API
    const imageUrl = messageData.media.url;
    console.log('[RECEIPT] 📸 URL de imagen:', imageUrl);
    
    const analysisResult = await analyzePaymentReceipt(imageUrl);
    
    if (!analysisResult.success) {
      console.error('[RECEIPT] ❌ Error en Vision API:', analysisResult.error);
      return {
        isValid: false,
        amount: null,
        reason: analysisResult.error || 'Error analizando comprobante'
      };
    }
    
    const paymentData = analysisResult.data;
    console.log('[RECEIPT] 📊 Datos extraídos:', paymentData);
    
    // Si no hay monto esperado, solo retornar datos extraídos
    if (!expectedAmount) {
      return {
        isValid: paymentData.isValid || false,
        amount: parseFloat(paymentData.amount) || null,
        date: paymentData.date || null,
        reference: paymentData.transactionNumber || null,
        receiptNumber: paymentData.receiptNumber || null,
        paymentMethod: paymentData.paymentMethod || 'No especificado',
        bank: paymentData.bank || null,
        confidence: paymentData.confidence || 0
      };
    }
    
    // Validar que el monto coincida (tolerancia de $0.50)
    const detectedAmount = parseFloat(paymentData.amount) || 0;
    const amountDifference = Math.abs(detectedAmount - expectedAmount);
    const tolerance = 0.50; // $0.50 de tolerancia
    
    if (paymentData.isValid && amountDifference <= tolerance) {
      console.log('[RECEIPT] ✅ Comprobante válido confirmado por Vision API');
      return {
        isValid: true,
        amount: detectedAmount,
        date: paymentData.date,
        reference: paymentData.transactionNumber || 'N/A',
        receiptNumber: paymentData.receiptNumber || null,
        paymentMethod: paymentData.paymentMethod || 'Método no identificado',
        bank: paymentData.bank || null,
        confidence: paymentData.confidence || 0,
        aiAnalyzed: true
      };
    } else {
      console.log('[RECEIPT] ⚠️ Monto no coincide:', {
        esperado: expectedAmount,
        detectado: detectedAmount,
        diferencia: amountDifference
      });
      return {
        isValid: false,
        amount: detectedAmount,
        date: paymentData.date,
        reference: paymentData.transactionNumber,
        receiptNumber: paymentData.receiptNumber,
        paymentMethod: paymentData.paymentMethod,
        bank: paymentData.bank,
        reason: `Monto esperado $${expectedAmount.toFixed(2)} no coincide con $${detectedAmount.toFixed(2)}`,
        confidence: paymentData.confidence || 0.5,
        aiAnalyzed: true,
        issues: [`Diferencia de $${amountDifference.toFixed(2)} detectada`]
      };
    }
    
  } catch (error) {
    console.error('[RECEIPT] ❌ Error con Vision API:', error);
    return {
      isValid: false,
      amount: null,
      reason: `Error analizando imagen: ${error.message}`,
      confidence: 0
    };
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
