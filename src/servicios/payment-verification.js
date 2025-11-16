import { analyzePaymentReceipt } from '../servicios-ia/openai.js';
import { updateReservationPayment, getReservationByPaymentInfo } from './calendario.js';
import { sendPaymentConfirmationEmail } from './email.js';
import { loadProfile, saveProfile, updateUser } from '../perfiles-interacciones/memoria-sqlite.js';
import { createCalendarEvent } from './google-calendar.js';

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
    const userProfile = await loadProfile(userPhone);
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

    // 4. Transcribir datos del comprobante para confirmación del usuario
    const paidAmount = parseFloat(paymentData.amount);
    const transcription = `📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $${paidAmount.toFixed(2)}
📅 Fecha: ${paymentData.date || 'No detectada'}
💳 Método: ${paymentData.paymentMethod || 'No especificado'}${paymentData.bank ? ` - ${paymentData.bank}` : ''}
${paymentData.transactionNumber ? `🔢 Referencia: ${paymentData.transactionNumber}` : ''}
${paymentData.receiptNumber ? `📝 Comprobante: ${paymentData.receiptNumber}` : ''}

¿Los datos son correctos?`;

    // 5. Validar monto
    const expectedAmount = pendingReservation.total;
    
    if (Math.abs(paidAmount - expectedAmount) > 0.50) { // Tolerancia de $0.50
      return {
        success: false,
        message: `${transcription}

⚠️ **ADVERTENCIA:** El monto no coincide
💰 Esperado: $${expectedAmount}
💳 Pagado: $${paidAmount}

¿Puedes verificar? Si el monto es correcto, responde SI para continuar`,
        data: paymentData,
        reservation: pendingReservation,
        requiresConfirmation: true
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

    // 6. Crear evento en Google Calendar
    console.log('[Payment Verification] 📅 Creando evento en Google Calendar...');
    try {
      const calendarEvent = await createCalendarEvent({
        userName: userProfile.name || 'Cliente',
        email: userProfile.email || 'noemail@coworkia.com',
        date: pendingReservation.date,
        startTime: pendingReservation.startTime,
        endTime: pendingReservation.endTime,
        serviceType: pendingReservation.serviceType || 'hotDesk',
        duration: `${pendingReservation.durationHours || 2} horas`,
        price: expectedAmount,
        guestCount: pendingReservation.guestCount || 0
      });
      
      if (calendarEvent.success) {
        console.log('[Payment Verification] ✅ Evento creado en Google Calendar:', calendarEvent.eventUrl);
      } else {
        console.error('[Payment Verification] ❌ Error creando evento en Google Calendar:', calendarEvent.error);
      }
    } catch (calendarError) {
      console.error('[Payment Verification] ❌ Error con Google Calendar:', calendarError);
    }

    // 7. Actualizar perfil del usuario
    await updateUser(userPhone, {
      'reservations.$[elem].status': 'confirmed',
      'reservations.$[elem].paymentStatus': 'paid',
      'reservations.$[elem].paymentData': updatedReservation.paymentData
    });

    // 8. Enviar email de confirmación
    console.log('[Payment Verification] 🔍 DEBUG: Intentando enviar email:', userProfile.email ? 'Configurado' : 'No configurado');
    console.log('[Payment Verification] 🔍 DEBUG: Reserva actualizada:', {
      id: updatedReservation.id,
      date: updatedReservation.date,
      time: `${updatedReservation.startTime}-${updatedReservation.endTime}`,
      status: updatedReservation.status
    });
    
    if (!userProfile.email) {
      console.warn('[Payment Verification] Usuario no tiene email registrado');
      return {
        success: true,
        message: `${transcription}

✅ *¡Pago verificado y confirmado!*

🎉 Tu reserva está lista:
📅 *Fecha:* ${pendingReservation.date}
⏰ *Hora:* ${pendingReservation.startTime} - ${pendingReservation.endTime}
🏢 *Espacio:* ${pendingReservation.serviceType === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones'}
💵 *Pagado:* $${paidAmount.toFixed(2)}

⚠️ *Nota:* No pude enviar email de confirmación porque no tienes email registrado.

📍 *Ubicación:* Whymper 403, Edificio Finistere
🗺️ https://maps.app.goo.gl/Nqy6YeGuxo3czEt66

¡Te esperamos! 🚀`,
        data: updatedReservation,
        transcription
      };
    }
    
    try {
      console.log('[Payment Verification] Enviando email de confirmación...');
      await sendPaymentConfirmationEmail(
        userProfile.email,
        userProfile.name || 'Cliente',
        updatedReservation
      );
      console.log('[Payment Verification] ✅ Email enviado exitosamente');
    } catch (emailError) {
      console.error('[Payment Verification] ❌ Error enviando email:', emailError);
      console.error('[Payment Verification] Stack trace:', emailError.stack);
    }

    // 9. Respuesta de éxito con transcripción
    return {
      success: true,
      message: `${transcription}

✅ *¡Pago verificado y confirmado!*

🎉 Tu reserva está confirmada:

📅 *Fecha:* ${pendingReservation.date}
⏰ *Hora:* ${pendingReservation.startTime} - ${pendingReservation.endTime}
🏢 *Espacio:* ${pendingReservation.serviceType === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones'}
💵 *Total pagado:* $${paidAmount.toFixed(2)}

📧 Te envié la confirmación completa por email.

📍 *Ubicación:* Whymper 403, Edificio Finistere, Piso 4
🗺️ https://maps.app.goo.gl/Nqy6YeGuxo3czEt66

¡Nos vemos en Coworkia! 🚀`,
      data: paymentData,
      reservation: updatedReservation,
      transcription
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
 * Estadísticas basadas en reservaciones con pago confirmado
 */
export async function getPaymentVerificationStats() {
  const databaseService = (await import('../database/database.js')).default;
  
  try {
    // Total de pagos verificados (confirmed con pago)
    const totalVerified = await databaseService.get(
      `SELECT COUNT(*) as count FROM reservations 
       WHERE payment_status IN ('paid', 'verified', 'confirmed')`
    );
    
    // Pagos por método
    const paymentMethods = await databaseService.all(
      `SELECT payment_data, COUNT(*) as count FROM reservations 
       WHERE payment_status IN ('paid', 'verified', 'confirmed') 
       AND payment_data IS NOT NULL
       GROUP BY payment_data`
    );
    
    // Pagos pendientes
    const pendingPayments = await databaseService.get(
      `SELECT COUNT(*) as count FROM reservations 
       WHERE payment_status = 'pending_payment'`
    );
    
    // Tasa de éxito (pagados vs totales con precio > 0)
    const totalWithPrice = await databaseService.get(
      `SELECT COUNT(*) as count FROM reservations 
       WHERE total_price > 0`
    );
    
    const successRate = totalWithPrice.count > 0 
      ? ((totalVerified.count / totalWithPrice.count) * 100).toFixed(2)
      : 0;
    
    // Extraer métodos de pago más comunes
    const methodStats = {};
    for (const pm of paymentMethods) {
      try {
        const data = JSON.parse(pm.payment_data);
        const method = data.method || data.bank || 'unknown';
        methodStats[method] = (methodStats[method] || 0) + pm.count;
      } catch (e) {
        methodStats['unknown'] = (methodStats['unknown'] || 0) + pm.count;
      }
    }
    
    return {
      totalVerified: totalVerified.count,
      pendingPayments: pendingPayments.count,
      successRate: parseFloat(successRate),
      paymentMethods: methodStats,
      totalWithPrice: totalWithPrice.count,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Payment Stats] Error generando estadísticas:', error);
    return {
      totalVerified: 0,
      pendingPayments: 0,
      successRate: 0,
      paymentMethods: {},
      error: error.message
    };
  }
}

export default {
  processPaymentReceipt,
  isPaymentReceipt,
  getPaymentVerificationStats
};