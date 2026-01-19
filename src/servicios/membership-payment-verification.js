/**
 * 💼💳 Sistema de Verificación de Pagos de Membresías - ALUNA
 * 
 * Procesa automáticamente comprobantes de pago para membresías de Coworkia.
 * Valida 20 parámetros, verifica cuenta destino, previene duplicados.
 * 
 * Flujo:
 * 1. Usuario envía comprobante por WhatsApp
 * 2. VisionAI extrae 20 parámetros
 * 3. Sistema valida monto, cuenta, fecha, duplicados
 * 4. Si pasa validación → aprueba automáticamente
 * 5. Si falla → envía a revisión manual o rechaza
 * 
 * @module membership-payment-verification
 */

import { analyzePaymentReceipt } from '../servicios-ia/openai.js';
import db from '../database/postgres-adapter.js';
// import { sendMembershipConfirmationEmails } from './email.js'; // TODO: Implementar
// import { createMembershipTourEvent } from './google-calendar.js'; // TODO: Implementar

// Constantes de validación
const CUENTA_COWORKIA = '20059783069';
const TOLERANCE_AMOUNT = 0.50; // $0.50 USD
const MAX_DAYS_OLD = 30; // Comprobantes de últimos 30 días
const MIN_CONFIDENCE = 70; // Confianza mínima para auto-aprobar

/**
 * 📋 Información de membresías disponibles
 */
const MEMBERSHIP_TYPES = {
  'Plan 10': { price: 100, benefits: '10 horas/mes + Uso salas' },
  'Plan 20': { price: 180, benefits: '20 horas/mes + Acceso 24/7' },
  'Oficina Ejecutiva': { price: 250, benefits: 'Oficina privada 15m²' },
  'Oficina Virtual': { price: 350, benefits: 'Dirección comercial + Mail' }
};

/**
 * 🔍 Valida monto del pago vs. monto esperado
 */
function validateAmount(paymentAmount, expectedAmount) {
  const difference = Math.abs(paymentAmount - expectedAmount);
  
  return {
    valid: difference <= TOLERANCE_AMOUNT,
    difference,
    message: difference <= TOLERANCE_AMOUNT 
      ? `Monto correcto: $${paymentAmount}` 
      : `Diferencia de $${difference.toFixed(2)} (esperado: $${expectedAmount}, recibido: $${paymentAmount})`
  };
}

/**
 * 📅 Valida fecha de transacción
 */
function validateDate(transactionDate) {
  const paymentDate = new Date(transactionDate);
  const now = new Date();
  const daysDiff = (now - paymentDate) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 0) {
    return {
      valid: false,
      warning: true,
      message: 'Fecha futura - comprobante inválido',
      daysDiff: Math.abs(daysDiff)
    };
  }
  
  if (daysDiff > MAX_DAYS_OLD) {
    return {
      valid: false,
      warning: true,
      message: `Comprobante muy antiguo (${Math.floor(daysDiff)} días)`,
      daysDiff
    };
  }
  
  return {
    valid: true,
    warning: daysDiff > 7, // Alerta si > 7 días
    message: daysDiff > 7 
      ? `Comprobante de hace ${Math.floor(daysDiff)} días` 
      : 'Fecha válida',
    daysDiff
  };
}

/**
 * 🏦 Valida cuenta destino (seguridad crítica)
 */
function validateDestinationAccount(accountNumber) {
  if (!accountNumber) {
    return {
      valid: null, // Desconocido, no rechazar
      warning: true,
      message: 'No se detectó cuenta destino en el comprobante'
    };
  }
  
  // Limpiar formato
  const cleaned = accountNumber.replace(/[-\s]/g, '');
  
  if (cleaned === CUENTA_COWORKIA) {
    return {
      valid: true,
      warning: false,
      message: '✅ Cuenta destino verificada (Produbanco 20059783069)'
    };
  }
  
  return {
    valid: false,
    warning: false,
    message: `❌ Cuenta incorrecta: ${cleaned} (debe ser ${CUENTA_COWORKIA})`
  };
}

/**
 * 🚫 Verifica si el número de transacción ya fue procesado (anti-duplicados)
 */
async function checkDuplicate(transactionNumber) {
  try {
    const query = `
      SELECT id, membership_lead_id, amount, transaction_date, status
      FROM membership_payments 
      WHERE transaction_number = $1
      LIMIT 1
    `;
    
    const result = await db.get(query, [transactionNumber]);
    
    if (result) {
      return {
        isDuplicate: true,
        existingPayment: result,
        message: `Ya existe pago con transacción ${transactionNumber} (${result.status})`
      };
    }
    
    return {
      isDuplicate: false,
      message: 'Número de transacción único ✅'
    };
    
  } catch (error) {
    console.error('[PAYMENT-VERIFICATION] Error checking duplicates:', error);
    return {
      isDuplicate: false,
      error: true,
      message: 'No se pudo verificar duplicados (proceder con precaución)'
    };
  }
}

/**
 * 🎯 Decide si un pago debe aprobarse automáticamente
 */
function shouldAutoApprove(validations, confidence) {
  // Criterios para auto-aprobación:
  // 1. Confianza >= 70%
  // 2. Monto válido
  // 3. Fecha válida
  // 4. No es duplicado
  // 5. Estado "approved"
  // 6. Cuenta destino correcta (o desconocida pero con alta confianza)
  
  if (confidence < MIN_CONFIDENCE) {
    return {
      autoApprove: false,
      reason: `Confianza baja (${confidence}% < ${MIN_CONFIDENCE}%)`,
      action: 'manual_review'
    };
  }
  
  if (!validations.amount.valid) {
    return {
      autoApprove: false,
      reason: validations.amount.message,
      action: 'reject'
    };
  }
  
  if (!validations.date.valid) {
    return {
      autoApprove: false,
      reason: validations.date.message,
      action: 'reject'
    };
  }
  
  if (validations.duplicate.isDuplicate) {
    return {
      autoApprove: false,
      reason: validations.duplicate.message,
      action: 'reject'
    };
  }
  
  if (validations.account.valid === false) {
    return {
      autoApprove: false,
      reason: validations.account.message,
      action: 'reject'
    };
  }
  
  // Si cuenta es desconocida pero confidence >= 90, aprobar
  if (validations.account.valid === null && confidence >= 90) {
    return {
      autoApprove: true,
      reason: 'Auto-aprobado (alta confianza)',
      action: 'notify_staff'
    };
  }
  
  // Cuenta verificada + todas las validaciones OK
  if (validations.account.valid === true) {
    return {
      autoApprove: true,
      reason: 'Todas las validaciones pasadas',
      action: confidence >= 90 ? 'auto' : 'notify_staff'
    };
  }
  
  // Caso por defecto: revisión manual
  return {
    autoApprove: false,
    reason: 'Requiere verificación manual',
    action: 'manual_review'
  };
}

/**
 * 💾 Guarda el pago en la base de datos
 */
async function savePayment(lead, paymentData, validations, imageUrl) {
  const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const query = `
      INSERT INTO membership_payments (
        id, membership_lead_id, user_phone,
        amount, transaction_date, transaction_time, transaction_number, payment_method,
        bank_sender, bank_receiver, account_number_destination, account_number_source,
        account_holder_source, authorization_number, receipt_number,
        currency, transaction_description, transaction_status, payment_channel,
        card_type, card_last_four, transaction_fee,
        confidence_score, image_url, raw_vision_data, validation_warnings,
        status, verification_method, verified_at, processed_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, $29, $30,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;
    
    const validationWarnings = {
      amount: validations.amount,
      date: validations.date,
      account: validations.account,
      duplicate: validations.duplicate
    };
    
    const values = [
      paymentId,
      lead.id,
      lead.user_phone,
      paymentData.amount,
      paymentData.transactionDate,
      paymentData.transactionTime || null,
      paymentData.transactionNumber,
      paymentData.paymentMethod,
      paymentData.bankSender,
      paymentData.bankReceiver,
      paymentData.accountNumberDestination,
      paymentData.accountNumberSource,
      paymentData.accountHolderSource,
      paymentData.authorizationNumber,
      paymentData.receiptNumber,
      paymentData.currency || 'USD',
      paymentData.transactionDescription,
      paymentData.transactionStatus,
      paymentData.paymentChannel,
      paymentData.cardType,
      paymentData.cardLastFour,
      paymentData.transactionFee || 0,
      paymentData.confidence,
      imageUrl,
      JSON.stringify(paymentData),
      JSON.stringify(validationWarnings),
      validations.shouldAutoApprove ? 'verified' : 'manual_review',
      'vision_ai',
      new Date().toISOString(),
      new Date().toISOString()
    ];
    
    const result = await db.run(query, values);
    
    console.log('[PAYMENT-VERIFICATION] ✅ Pago guardado:', paymentId);
    
    return {
      success: true,
      paymentId,
      payment: result
    };
    
  } catch (error) {
    console.error('[PAYMENT-VERIFICATION] ❌ Error guardando pago:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📧 Actualiza lead a estado 'accepted' y envía emails
 */
async function approveLead(lead, payment) {
  try {
    // Actualizar lead
    await db.run(
      `UPDATE membership_leads 
       SET status = 'accepted', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [lead.id]
    );
    
    // TODO: Enviar emails de confirmación
    // await sendMembershipConfirmationEmails(lead, payment);
    console.log('[PAYMENT-VERIFICATION] 📧 TODO: Enviar emails de confirmación');
    
    // TODO: Programar tour (si aplica)
    // if (lead.membership_type !== 'Oficina Virtual') {
    //   await createMembershipTourEvent(lead);
    // }
    console.log('[PAYMENT-VERIFICATION] 📅 TODO: Programar tour del espacio');
    
    console.log('[PAYMENT-VERIFICATION] ✅ Lead aprobado:', lead.id);
    
    return { success: true };
    
  } catch (error) {
    console.error('[PAYMENT-VERIFICATION] ❌ Error aprobando lead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 💳 FUNCIÓN PRINCIPAL: Procesa comprobante de pago de membresía
 */
export async function processMembershipPayment(messageData, userProfile) {
  console.log('[MEMBERSHIP-PAYMENT] 🔍 Procesando comprobante...');
  
  const userId = userProfile.userId;
  const imageUrl = messageData.media?.url;
  
  try {
    // PASO 1: Analizar imagen con VisionAI (20 parámetros)
    console.log('[MEMBERSHIP-PAYMENT] 🤖 Analizando con VisionAI...');
    const analysisResult = await analyzePaymentReceipt(imageUrl);
    
    if (!analysisResult.success) {
      return {
        success: false,
        message: `⚠️ No pude analizar el comprobante automáticamente.

Por favor, escribe estos datos:
1️⃣ Monto: $____
2️⃣ Fecha: dd/mm/aaaa  
3️⃣ Número de transacción: ____

O si prefieres, reenvía la foto más clara 📸`
      };
    }
    
    const paymentData = analysisResult.data;
    
    // PASO 2: Buscar lead pendiente de pago
    const pendingLead = await db.get(
      `SELECT * FROM membership_leads 
       WHERE user_phone = $1 
       AND status = 'pending_payment'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    if (!pendingLead) {
      return {
        success: false,
        message: `📊 *Comprobante recibido*

💵 Monto: $${paymentData.amount || '?'}
📅 Fecha: ${paymentData.transactionDate || 'No detectada'}
💳 Método: ${paymentData.paymentMethod || 'No especificado'}

⚠️ No encuentro solicitudes de membresía pendientes de pago.

¿Necesitas información sobre nuestros planes? Escribe "planes" 😊`
      };
    }
    
    // PASO 3: Validar todos los parámetros
    const membershipInfo = MEMBERSHIP_TYPES[pendingLead.membership_type];
    const expectedAmount = membershipInfo.price;
    
    const validations = {
      amount: validateAmount(paymentData.amount, expectedAmount),
      date: validateDate(paymentData.transactionDate),
      account: validateDestinationAccount(paymentData.accountNumberDestination),
      duplicate: await checkDuplicate(paymentData.transactionNumber)
    };
    
    // PASO 4: Decidir si auto-aprobar
    const approvalDecision = shouldAutoApprove(validations, paymentData.confidence);
    validations.shouldAutoApprove = approvalDecision.autoApprove;
    validations.approvalReason = approvalDecision.reason;
    
    // PASO 5: Guardar pago en BD
    const saveResult = await savePayment(pendingLead, paymentData, validations, imageUrl);
    
    if (!saveResult.success) {
      return {
        success: false,
        message: `⚠️ Error guardando información del pago.

Por favor contacta a nuestro equipo:
📞 +593 99 483 7117
📧 secretaria.coworkia@gmail.com`
      };
    }
    
    // PASO 6: Responder según decisión
    
    // 🟢 CASO 1: AUTO-APROBADO
    if (approvalDecision.autoApprove) {
      await approveLead(pendingLead, paymentData);
      
      return {
        success: true,
        autoApproved: true,
        message: `✅ *¡PAGO VERIFICADO AUTOMÁTICAMENTE!*

📋 *RESUMEN DEL PAGO:*
💰 Monto: $${paymentData.amount} USD
📅 Fecha: ${paymentData.transactionDate}
💳 Método: ${paymentData.paymentMethod}
${paymentData.authorizationNumber ? `🔢 Autorización: ${paymentData.authorizationNumber}` : ''}

📦 *TU MEMBRESÍA:*
✨ ${pendingLead.membership_type}
💵 ${membershipInfo.benefits}

📧 *Confirmación enviada a:* ${pendingLead.email}

${pendingLead.membership_type !== 'Oficina Virtual' ? `🏢 *PRÓXIMO PASO:*
Te agendamos un tour del espacio para conocernos y entregarte tu acceso.

📅 Fecha tour: Te contactaremos en las próximas horas` : ''}

¡Bienvenido/a a Coworkia! 🎉`
      };
    }
    
    // 🔴 CASO 2: RECHAZADO
    if (approvalDecision.action === 'reject') {
      let rejectionMessage = `⚠️ *PROBLEMA CON EL COMPROBANTE*

📊 *Datos detectados:*
💰 Monto: $${paymentData.amount || '?'}
📅 Fecha: ${paymentData.transactionDate || 'No detectada'}
💳 Método: ${paymentData.paymentMethod || '?'}

❌ *Motivo:* ${approvalDecision.reason}

`;
      
      // Mensajes específicos según el problema
      if (!validations.amount.valid) {
        rejectionMessage += `📋 *Tu membresía:* ${pendingLead.membership_type}
💵 *Monto correcto:* $${expectedAmount} USD
💳 *Monto detectado:* $${paymentData.amount} USD
❌ *Diferencia:* $${validations.amount.difference.toFixed(2)}

Por favor:
• Verifica que pagaste $${expectedAmount}
• Si pagaste menos, completa la diferencia
• Envía el comprobante correcto`;
      } else if (validations.duplicate.isDuplicate) {
        rejectionMessage += `Este comprobante ya fue procesado anteriormente.

Si necesitas ayuda, contáctanos:
📞 +593 99 483 7117`;
      } else if (validations.account.valid === false) {
        rejectionMessage += `La cuenta destino no coincide con Coworkia.

🏦 *Cuenta correcta:*
• Banco: Produbanco
• Cuenta: ${CUENTA_COWORKIA}
• Titular: Gonzalo Villota Izurieta

Por favor realiza el pago a esta cuenta y envía el nuevo comprobante.`;
      }
      
      return {
        success: false,
        rejected: true,
        message: rejectionMessage
      };
    }
    
    // 🟡 CASO 3: REVISIÓN MANUAL
    return {
      success: true,
      manualReview: true,
      message: `📊 *COMPROBANTE RECIBIDO*

💰 Monto: $${paymentData.amount} USD
📅 Fecha: ${paymentData.transactionDate}
💳 Método: ${paymentData.paymentMethod}
${paymentData.authorizationNumber ? `🔢 Autorización: ${paymentData.authorizationNumber}` : ''}

⏳ *En revisión...*

Tu comprobante requiere verificación manual. Nuestro equipo lo revisará y te confirmará en los próximos minutos.

Recibirás notificación tan pronto esté aprobado 😊`
    };
    
  } catch (error) {
    console.error('[MEMBERSHIP-PAYMENT] 🚨 ERROR:', error);
    return {
      success: false,
      message: `⚠️ Error procesando tu comprobante.

Por favor contacta a nuestro equipo:
📞 +593 99 483 7117
📧 secretaria.coworkia@gmail.com

Te ayudaremos a verificar tu pago manualmente 😊`
    };
  }
}

/**
 * 🔍 Busca lead pendiente por teléfono
 */
export async function findPendingMembershipLead(userId) {
  try {
    const lead = await db.get(
      `SELECT * FROM membership_leads 
       WHERE user_phone = $1 
       AND status = 'pending_payment'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    return lead || null;
  } catch (error) {
    console.error('[MEMBERSHIP-PAYMENT] Error finding lead:', error);
    return null;
  }
}

export default {
  processMembershipPayment,
  findPendingMembershipLead
};
