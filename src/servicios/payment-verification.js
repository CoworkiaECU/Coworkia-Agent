import { analyzePaymentReceipt } from '../servicios-ia/openai.js';
import { updateReservationPayment, getReservationByPaymentInfo } from './calendario.js';
import { sendPaymentConfirmationEmail } from './email.js';
import { loadProfile, saveProfile, updateUser } from '../perfiles-interacciones/memoria.js';

/**
 * 💳 Procesa comprobante de pago automáticamente
 */
export async function processPaymentReceipt(imageUrl, userPhone) {
  console.log('[Payment Verification] Procesando comprobante:', imageUrl);
  
  try {
    // 1. Analizar imagen con Vision API
    const analysis = await analyzePaymentReceipt(imageUrl);
    
    if (!analysis.success) {
      return {
        success: false,
        message: '❌ No pude analizar el comprobante. Por favor, envía una imagen más clara.',
        error: analysis.error
      };
    }

    const paymentData = analysis.data;
    console.log('[Payment Verification] Datos extraídos:', paymentData);

    // 2. Validar que es un comprobante válido
    if (!paymentData.isValid || paymentData.confidence < 70) {
      return {
        success: false,
        message: '❌ El comprobante no parece ser válido o la imagen no es clara. Por favor, envía un comprobante legible.',
        data: paymentData
      };
    }

    // 3. Buscar reserva pendiente del usuario
    const userProfile = loadProfile(userPhone);
    const pendingReservation = userProfile.reservations?.find(r => 
      r.status === 'pending_payment' || r.status === 'created'
    );

    if (!pendingReservation) {
      return {
        success: false,
        message: '❌ No encontré ninguna reserva pendiente de pago. ¿Tienes una reserva activa?',
        data: paymentData
      };
    }

    // 4. Validar monto
    const expectedAmount = pendingReservation.total;
    const paidAmount = parseFloat(paymentData.amount);
    
    if (Math.abs(paidAmount - expectedAmount) > 0.50) { // Tolerancia de $0.50
      return {
        success: false,
        message: `❌ El monto no coincide. 
        
💰 **Esperado:** $${expectedAmount}
💳 **Pagado:** $${paidAmount}

Por favor, verifica el monto o contacta a soporte.`,
        data: paymentData,
        reservation: pendingReservation
      };
    }

    // 5. Marcar reserva como pagada
    const updatedReservation = await updateReservationPayment(pendingReservation.id, {
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentData: {
        transactionNumber: paymentData.transactionNumber,
        amount: paidAmount,
        currency: paymentData.currency || 'USD',
        date: paymentData.date,
        time: paymentData.time,
        bank: paymentData.bank,
        paymentMethod: paymentData.paymentMethod,
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'ai_vision'
      }
    });

    // 6. Actualizar perfil del usuario
    await updateUser(userPhone, {
      'reservations.$[elem].status': 'confirmed',
      'reservations.$[elem].paymentStatus': 'paid',
      'reservations.$[elem].paymentData': updatedReservation.paymentData
    });

    // 7. Enviar email de confirmación
    console.log('[Payment Verification] Intentando enviar email a:', userProfile.email);
    
    if (!userProfile.email) {
      console.warn('[Payment Verification] Usuario no tiene email registrado');
      return {
        success: true,
        message: `✅ **¡Pago confirmado!**

🎉 Tu reserva está lista:
📅 **Fecha:** ${pendingReservation.date}
⏰ **Hora:** ${pendingReservation.startTime} - ${pendingReservation.endTime}

⚠️ **Nota:** No pude enviar email de confirmación porque no tienes email registrado.
📍 **Ubicación:** Whymper 403, Edificio Finistere

¡Te esperamos! 🚀`,
        data: updatedReservation
      };
    }
    
    try {
      console.log('[Payment Verification] Enviando email de confirmación...');
      await sendPaymentConfirmationEmail(
        userProfile.email,
        userProfile.name || 'Cliente',
        updatedReservation
      );
      console.log('[Payment Verification] ✅ Email enviado exitosamente a:', userProfile.email);
    } catch (emailError) {
      console.error('[Payment Verification] ❌ Error enviando email:', emailError);
      console.error('[Payment Verification] Stack trace:', emailError.stack);
    }

    // 8. Respuesta de éxito
    return {
      success: true,
      message: `✅ **¡Pago confirmado!**

🎉 Tu reserva está lista:
📅 **Fecha:** ${pendingReservation.date}
⏰ **Hora:** ${pendingReservation.startTime} - ${pendingReservation.endTime}
🏢 **Espacio:** ${pendingReservation.spaceType}
💰 **Total:** $${expectedAmount}
💳 **Referencia:** ${paymentData.transactionNumber}

📧 Te he enviado la confirmación por email.
¡Nos vemos en Coworkia! 🚀`,
      data: paymentData,
      reservation: updatedReservation
    };

  } catch (error) {
    console.error('[Payment Verification] Error:', error);
    return {
      success: false,
      message: '❌ Error interno procesando el comprobante. Contacta a soporte.',
      error: error.message
    };
  }
}

/**
 * 🔍 Validar si una imagen es un comprobante de pago
 */
export async function isPaymentReceipt(imageUrl) {
  try {
    const prompt = `Analiza esta imagen y determina si es un comprobante de pago, transferencia bancaria, o recibo de transacción.

Responde SOLO con un JSON en este formato:
{
  "isPaymentReceipt": true/false,
  "confidence": 0-100,
  "type": "transferencia/payphone/tarjeta/efectivo/otro/no_es_comprobante"
}`;

    const result = await analyzeImage(imageUrl, prompt, {
      temperature: 0.1,
      max_tokens: 100
    });

    if (!result.success) {
      return false;
    }

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return false;

    const analysis = JSON.parse(jsonMatch[0]);
    return analysis.isPaymentReceipt && analysis.confidence > 60;

  } catch (error) {
    console.error('[Payment Verification] Error validating receipt:', error);
    return false;
  }
}

/**
 * 📊 Generar reporte de verificación de pagos
 */
export function getPaymentVerificationStats() {
  const stats = {
    totalVerified: 0,
    successRate: 0,
    averageConfidence: 0,
    commonIssues: []
  };
  
  // TODO: Implementar estadísticas basadas en logs
  return stats;
}

export default {
  processPaymentReceipt,
  isPaymentReceipt,
  getPaymentVerificationStats
};