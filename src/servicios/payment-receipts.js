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
import { markJustConfirmed, setPendingConfirmation } from './reservation-state.js';
import { sendReservationNotifications } from './notification-helper.js';
import { analyzePaymentReceipt } from '../servicios-ia/openai.js';

/**
 * 📄 Instrucciones para solicitar comprobantes de pago
 */

// 🧪 COMPROBANTE TEST - Solo para Diego (+593987770788)
const TEST_RECEIPT_DIEGO = {
  transactionNumber: '70613140',
  authorizationCode: 'W70613140',
  amount: 12.08,
  date: '2025-11-18T14:12:00',
  recipient: 'DIEGO VILLOTA',
  userPhone: '+593987770788'
};

// 🏦 CUENTAS COWORKIA - Para validación de transferencias
const COWORKIA_ACCOUNTS = {
  PRODUBANCO: {
    accountNumber: '20059783069',
    accountPartial: '3069', // Últimos 4 dígitos para matching
    accountHolder: 'VILLOTA IZURIETA GONZALO',
    alternativeNames: ['GONZALO VILLOTA', 'VILLOTA GONZALO', 'G. VILLOTA']
  }
};

// 💰 CONCEPTOS VÁLIDOS DE PAGO
const VALID_PAYMENT_CONCEPTS = [
  'garantia coworkia',
  'coworkia',
  'reserva coworkia',
  'plan coworkia',
  'plan 20',
  'plan 40',
  'plan 60',
  'plan 100',
  'hot desk',
  'sala reuniones'
];

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
 * � Valida si la transferencia es a cuentas de Coworkia
 */
function validateCoworkiaTransfer(paymentData) {
  if (!paymentData) return { isValid: false, reason: 'Datos de pago no disponibles' };
  
  // Solo validar transferencias bancarias
  const isTransfer = paymentData.paymentMethod?.includes('transferencia');
  if (!isTransfer) {
    // PayPhone u otros métodos se validan automáticamente
    return { isValid: true, validated: false, reason: 'No requiere validación de cuenta' };
  }
  
  // Verificar cuenta destino
  const accountDest = (paymentData.accountNumberDestination || '').replace(/[^0-9]/g, '');
  const accountHolder = (paymentData.accountHolderSource || '').toUpperCase();
  const concept = (paymentData.transactionDescription || '').toLowerCase();
  
  console.log('[RECEIPT] 🔍 Validando transferencia bancaria:', {
    accountDest: accountDest,
    accountHolder: accountHolder,
    concept: concept,
    bankSender: paymentData.bankSender,
    bankReceiver: paymentData.bankReceiver
  });
  
  // Validar cuenta destino (Produbanco o últimos 4 dígitos)
  const isCorrectAccount = accountDest.includes(COWORKIA_ACCOUNTS.PRODUBANCO.accountNumber) ||
                          accountDest.endsWith(COWORKIA_ACCOUNTS.PRODUBANCO.accountPartial);
  
  if (!isCorrectAccount) {
    return { 
      isValid: false, 
      validated: true,
      reason: `⚠️ Cuenta destino incorrecta. Debe ser: ${COWORKIA_ACCOUNTS.PRODUBANCO.accountNumber} (Produbanco)` 
    };
  }
  
  // Validar concepto (opcional pero recomendado)
  const hasValidConcept = VALID_PAYMENT_CONCEPTS.some(validConcept => 
    concept.includes(validConcept)
  );
  
  if (!hasValidConcept) {
    console.warn('[RECEIPT] ⚠️ Concepto no estándar:', concept);
    // No rechazar, solo advertir
  }
  
  console.log('[RECEIPT] ✅ Transferencia validada correctamente');
  return { 
    isValid: true, 
    validated: true,
    reason: 'Transferencia a cuenta Coworkia verificada'
  };
}

/**
 * �📸 Detecta si el mensaje contiene una imagen (comprobante)
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
 * 💬 Detecta si el usuario menciona que pagó (sin enviar imagen)
 * Útil para casos donde el usuario dice "ya pagué" o envía número de transacción
 */
export function detectPaymentMention(text) {
  if (!text) return { mentioned: false };
  
  const lowerText = text.toLowerCase();
  
  // Patrones de "ya pagué"
  const paymentKeywords = [
    'pagué', 'pague', 'ya pague', 'ya pagué',
    'hice el pago', 'realicé el pago', 'transferí',
    'envié el dinero', 'pagado', 'ya transferí'
  ];
  
  const mentionedPayment = paymentKeywords.some(kw => lowerText.includes(kw));
  
  // Detectar números que podrían ser referencias de transacción
  // Formato típico: 6-10 dígitos
  const transactionPattern = /\b\d{6,10}\b/;
  const possibleReference = text.match(transactionPattern);
  
  if (mentionedPayment || possibleReference) {
    return {
      mentioned: true,
      hasReference: !!possibleReference,
      reference: possibleReference ? possibleReference[0] : null,
      type: mentionedPayment ? 'keyword' : 'reference_only'
    };
  }
  
  return { mentioned: false };
}

/**
 * 🔍 Procesa comprobante de pago automáticamente
 */
export async function processPaymentReceipt(messageData, userProfile) {
  console.log('[RECEIPT] 🔍 Procesando comprobante de pago...');
  
  // Extract variables BEFORE try block so catch can access them
  const userId = userProfile?.userId;
  const imageUrl = messageData?.media?.url;
  let pendingReservation = null;
  
  try {
    // Validar que haya imagen
    if (!messageData?.media?.url) {
      return {
        success: false,
        message: '📸 No se encontró imagen en tu mensaje.\n\nPor favor envía una foto de tu comprobante de pago.'
      };
    }
    
    // 🔍 SIEMPRE analizar imagen primero con Vision API
    console.log('[RECEIPT] 🤖 Analizando comprobante con Vision API...');
    const analysisResult = await analyzeReceiptImage(messageData, null, userId); // Pasar userId
    
    // Manejar error de Vision API
    if (!analysisResult.isValid && analysisResult.reason) {
      return {
        success: false,
        message: `⚠️ No pude analizar el comprobante.\n\n${analysisResult.reason}\n\nPor favor:\n• Verifica que la foto sea clara\n• Intenta con mejor iluminación\n• Envía captura de pantalla si es digital`
      };
    }
    
    // 🏦 VALIDAR si la transferencia es a cuentas de Coworkia
    const transferValidation = validateCoworkiaTransfer(analysisResult);
    console.log('[RECEIPT] 🏦 Validación de transferencia:', transferValidation);
    
    if (transferValidation.validated && !transferValidation.isValid) {
      return {
        success: false,
        message: `📸 He recibido tu comprobante, pero encontré un problema:

${transferValidation.reason}

🏦 **Datos correctos para transferencia:**
• Banco: Produbanco
• Cuenta: ${COWORKIA_ACCOUNTS.PRODUBANCO.accountNumber}
• Nombre: ${COWORKIA_ACCOUNTS.PRODUBANCO.accountHolder}

Por favor verifica y envía el comprobante correcto 😊`
      };
    }
    
    // Transcribir datos extraídos
    const transcription = `📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $${analysisResult.amount || 'No detectado'}
📅 Fecha: ${analysisResult.date || 'No detectada'}
💳 Método: ${analysisResult.paymentMethod || 'No especificado'}
${analysisResult.reference ? `🔢 Referencia: ${analysisResult.reference}` : ''}
${transferValidation.validated ? '✅ Cuenta destino verificada' : ''}

¿Los datos son correctos?`;

    // Buscar reserva pendiente
    pendingReservation = await reservationRepository.findPendingByUser(userProfile.userId);

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
    const isAmountValid = amountDifference <= 1.00; // Tolerancia $1.00
    
    if (analysisResult.amount && isAmountValid) {
      console.log('[RECEIPT] ✅ Pago válido detectado, guardando info de pago...');

      // Guardar información del pago PERO NO confirmar aún (autoConfirm = false)
      const updatedReservation = await updateReservationPayment(pendingReservation.id, {
        paymentMethod: analysisResult.paymentMethod || 'PayPhone',
        reference: analysisResult.transactionNumber,
        amount: analysisResult.amount,
        date: new Date().toISOString(),
        // Nuevos campos PayPhone
        transactionNumber: analysisResult.transactionNumber,
        authorizationCode: analysisResult.authorizationNumber,
        paymentDate: analysisResult.transactionDate && analysisResult.transactionTime 
          ? `${analysisResult.transactionDate}T${analysisResult.transactionTime}` 
          : new Date().toISOString(),
        receiptUrl: imageUrl,
        verifiedAt: new Date().toISOString()
      }, false); // ⚠️ NO auto-confirmar, esperamos SI del usuario

      // NO limpiar pending confirmation - esperamos respuesta SI/NO del usuario
      // await clearPendingConfirmation(userProfile.userId); // COMENTADO
      
      // Guardar datos del pago en pending confirmation para usarlos después del SI
      await setPendingConfirmation(userProfile.userId, {
        reservationId: updatedReservation.id,
        paymentVerified: true,
        paymentReceipt: {
          method: analysisResult.paymentMethod || 'PayPhone',
          reference: analysisResult.transactionNumber,
          authorizationCode: analysisResult.authorizationNumber,
          amount: analysisResult.amount,
          date: analysisResult.transactionDate,
          time: analysisResult.transactionTime,
          status: analysisResult.transactionStatus,
          isTestReceipt: analysisResult.isTestReceipt || false
        },
        type: 'payment_verification'
      }, 15); // 15 minutos para confirmar
      
      return {
        success: true,
        message: `${transcription}

✅ **PAGO VERIFICADO** ${analysisResult.isTestReceipt ? '(🧪 TEST)' : ''}

📋 **DETALLES DEL PAGO:**
💰 Monto: $${analysisResult.amount} USD ✅
📅 Fecha: ${analysisResult.transactionDate || 'Hoy'} ${analysisResult.transactionTime || ''}
🔢 Transacción: ${analysisResult.transactionNumber || 'N/A'}
🔐 Autorización: ${analysisResult.authorizationNumber || 'N/A'}
💳 Método: ${analysisResult.paymentMethod || 'PayPhone'}
✓ Estado: ${analysisResult.transactionStatus || 'Aprobado'}

📅 **TU RESERVA:**
• Fecha: ${updatedReservation.date}
• Horario: ${updatedReservation.start_time} - ${updatedReservation.end_time}
• Espacio: ${formatServiceType(updatedReservation.service_type)}

**¿Confirmas la reserva?** (SI/NO)`,
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
 * 
 * Soporta:
 * - Payphone (ej: $12.08 USD aprobado)
 * - Transferencias bancarias (Produbanco, Pichincha, etc.)
 * - Screenshots de apps bancarias
 * 
 * Extrae:
 * - Monto (amount)
 * - Fecha (date)
 * - Número de transacción (reference)
 * - Método de pago (paymentMethod)
 * - Banco (bank)
 */
async function analyzeReceiptImage(messageData, expectedAmount, userId = null) {
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
        reason: 'Error al procesar la imagen'
      };
    }
    
    const paymentData = analysisResult.data;
    console.log('[RECEIPT] 📊 Datos extraídos:', paymentData);
    
    // 🧪 LÓGICA ESPECIAL PARA DIEGO - Comprobante test
    const isDiegoTest = userId === TEST_RECEIPT_DIEGO.userPhone && 
                        paymentData.transactionNumber === TEST_RECEIPT_DIEGO.transactionNumber &&
                        paymentData.authorizationNumber === TEST_RECEIPT_DIEGO.authorizationCode;
    
    if (isDiegoTest) {
      console.log('[RECEIPT] 🧪 COMPROBANTE TEST DIEGO detectado - Ignorando fecha');
      paymentData.isValid = true;
      paymentData.isTestReceipt = true;
      paymentData.transactionDate = new Date().toISOString().split('T')[0]; // Usar fecha actual
      paymentData.transactionTime = new Date().toISOString().split('T')[1].split('.')[0];
    }
    
    // Validar que el comprobante sea válido
    if (!paymentData.isValid) {
      return {
        isValid: false,
        amount: null,
        reason: '⚠️ Comprobante incompleto o rechazado'
      };
    }
    
    // Para usuarios reales (NO Diego): validar fecha reciente
    if (!isDiegoTest && paymentData.transactionDate) {
      const receiptDate = new Date(paymentData.transactionDate);
      const now = new Date();
      const daysDiff = Math.floor((now - receiptDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 2) {
        return {
          isValid: false,
          amount: paymentData.amount,
          reason: `⚠️ Comprobante antiguo (${daysDiff} días). Envía pago reciente.`
        };
      }
    }
    
    // Si no hay monto esperado, retornar datos extraídos
    if (!expectedAmount) {
      return {
        isValid: paymentData.isValid,
        amount: parseFloat(paymentData.amount) || null,
        transactionNumber: paymentData.transactionNumber,
        authorizationNumber: paymentData.authorizationNumber,
        transactionDate: paymentData.transactionDate,
        transactionTime: paymentData.transactionTime,
        paymentMethod: paymentData.paymentMethod || 'PayPhone',
        transactionStatus: paymentData.transactionStatus,
        // Bank transfer fields for validation
        accountNumberDestination: paymentData.accountNumberDestination,
        accountHolderSource: paymentData.accountHolderSource,
        transactionDescription: paymentData.transactionDescription,
        bankSender: paymentData.bankSender,
        bankReceiver: paymentData.bankReceiver,
        isTestReceipt: isDiegoTest,
        confidence: paymentData.confidence || 0
      };
    }
    
    // Validar monto (tolerancia $0.65)
    const detectedAmount = parseFloat(paymentData.amount) || 0;
    const amountDifference = Math.abs(detectedAmount - expectedAmount);
    const tolerance = 0.65;
    
    if (amountDifference <= tolerance) {
      console.log('[RECEIPT] ✅ Comprobante válido');
      return {
        isValid: true,
        amount: detectedAmount,
        transactionNumber: paymentData.transactionNumber,
        authorizationNumber: paymentData.authorizationNumber,
        transactionDate: paymentData.transactionDate,
        transactionTime: paymentData.transactionTime,
        paymentMethod: paymentData.paymentMethod || 'PayPhone',
        transactionStatus: paymentData.transactionStatus,
        // Bank transfer fields for validation
        accountNumberDestination: paymentData.accountNumberDestination,
        accountHolderSource: paymentData.accountHolderSource,
        transactionDescription: paymentData.transactionDescription,
        bankSender: paymentData.bankSender,
        bankReceiver: paymentData.bankReceiver,
        isTestReceipt: isDiegoTest,
        confidence: paymentData.confidence || 0
      };
    } else {
      console.log('[RECEIPT] ⚠️ Monto no coincide:', { esperado: expectedAmount, detectado: detectedAmount });
      return {
        isValid: false,
        amount: detectedAmount,
        reason: `Monto esperado $${expectedAmount.toFixed(2)}, detectado $${detectedAmount.toFixed(2)}`
      };
    }
    
  } catch (error) {
    console.error('[RECEIPT] ❌ Error en análisis:', error);
    return {
      isValid: false,
      amount: null,
      reason: 'Error al procesar comprobante'
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
      userId: reservation.user_phone,
      email: userProfile.email,
      date: reservation.date,
      startTime: reservation.start_time
    });
  }
  
  return notificationResults;
}
