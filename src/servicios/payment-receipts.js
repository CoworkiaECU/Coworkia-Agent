/**
 * 💳 Sistema de Comprobantes de Pago - Coworkia
 * Maneja validación automática de comprobantes de pago enviados por WhatsApp
 */

import dotenv from 'dotenv';
dotenv.config();

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
    // 1. Verificar que el usuario tenga reserva pendiente de pago
    if (!userProfile.pendingConfirmation) {
      return {
        success: false,
        message: `📄 Recibí tu imagen, pero no tienes reservas pendientes de pago.
        
¿Necesitas hacer una nueva reserva? Solo dime cuándo quieres venir 😊`,
        needsAction: false
      };
    }
    
    const pending = userProfile.pendingConfirmation;
    
    // 2. Simular análisis de imagen (en el futuro, usar Vision AI)
    console.log('[RECEIPT] 🤖 Analizando comprobante con IA...');
    const analysisResult = await analyzeReceiptImage(messageData, pending.totalPrice);
    
    if (analysisResult.isValid) {
      // 3. Pago válido - confirmar reserva automáticamente
      console.log('[RECEIPT] ✅ Pago válido detectado, confirmando reserva...');
      
      // Actualizar perfil: marcar como pagado
      const updatedProfile = {
        ...userProfile,
        pendingConfirmation: null,
        lastPaymentVerified: new Date().toISOString(),
        paymentMethod: analysisResult.paymentMethod
      };
      
      // Crear reserva confirmada
      const reservation = {
        ...pending,
        status: 'confirmed',
        paymentVerified: true,
        paymentAmount: analysisResult.amount,
        paymentReference: analysisResult.reference
      };
      
      return {
        success: true,
        message: `✅ **¡Pago verificado y reserva confirmada!** 🎉

📋 **Detalles confirmados:**
📅 ${pending.date}
🕐 ${pending.startTime} - ${pending.endTime} 
🏢 ${pending.serviceType}
💰 $${analysisResult.amount} USD ✅

📧 Te envío la confirmación completa por email
📍 **Ubicación:** Whymper 403, Edificio Finistere
🗺️ https://maps.app.goo.gl/ZrKqKw8vBm2eZeK69

¡Te esperamos! 🚀`,
        reservation: reservation,
        needsAction: true, // Para enviar email de confirmación
        actionType: 'SEND_CONFIRMATION_EMAIL'
      };
      
    } else {
      // 4. Pago no válido o no detectado
      return {
        success: false,
        message: `❌ No pude verificar tu comprobante automáticamente.

🔍 **Posibles problemas:**
${analysisResult.issues ? analysisResult.issues.map(i => `• ${i}`).join('\n') : '• Imagen no clara o incompleta'}

📱 **Por favor, envía una nueva foto que incluya:**
• Monto completo: $${pending.totalPrice} USD
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
 * 🤖 Analiza imagen de comprobante (simulado - futuro Vision AI)
 */
async function analyzeReceiptImage(messageData, expectedAmount) {
  console.log('[RECEIPT] 🤖 Simulando análisis con IA...');
  
  // Por ahora, simulamos un análisis básico
  // En el futuro, esto usará Vision AI de Google o OpenAI para leer la imagen
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simular procesamiento
  
  // Simulación de resultados (en producción esto sería real)
  const mockAnalysis = {
    textDetected: [
      'BANCO PICHINCHA',
      'TRANSFERENCIA EXITOSA',
      `$${expectedAmount}`,
      'REF: TXN123456789',
      new Date().toLocaleDateString()
    ],
    confidence: 0.85
  };
  
  // Lógica de validación simulada
  const hasAmount = mockAnalysis.textDetected.some(text => 
    text.includes(expectedAmount.toString())
  );
  
  const hasReference = mockAnalysis.textDetected.some(text => 
    text.includes('REF') || text.includes('TXN') || text.includes('TRANS')
  );
  
  const hasBank = mockAnalysis.textDetected.some(text => 
    text.toUpperCase().includes('BANCO') || 
    text.toUpperCase().includes('PAYPHONE') ||
    text.toUpperCase().includes('TRANSFERENCIA')
  );
  
  console.log('[RECEIPT] 📊 Análisis completado:', {
    hasAmount,
    hasReference, 
    hasBank,
    confidence: mockAnalysis.confidence
  });
  
  if (hasAmount && hasReference && hasBank && mockAnalysis.confidence > 0.7) {
    return {
      isValid: true,
      amount: expectedAmount,
      reference: 'TXN123456789', // En producción, extraer del OCR
      paymentMethod: hasBank ? 'Transferencia Bancaria' : 'Payphone',
      confidence: mockAnalysis.confidence
    };
  } else {
    return {
      isValid: false,
      confidence: mockAnalysis.confidence,
      issues: [
        !hasAmount ? `Monto $${expectedAmount} no detectado claramente` : null,
        !hasReference ? 'Número de referencia no visible' : null,
        !hasBank ? 'Información bancaria no clara' : null,
        mockAnalysis.confidence < 0.7 ? 'Imagen poco clara (usa mejor iluminación)' : null
      ].filter(Boolean)
    };
  }
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