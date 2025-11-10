// Sistema de Email para confirmaciones de reservas - Coworkia
// Envía emails profesionales con detalles de reserva

import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

/**
 * 📧 Configuración del transportador de email
 */
async function createEmailTransporter() {
  console.log('[EMAIL] 🔧 Inicializando transportador de email');
  
  const EMAIL_USER = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS || process.env.GMAIL_PASS;
  const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail';
  
  console.log('[EMAIL] - Usuario:', EMAIL_USER);
  console.log('[EMAIL] - Servicio:', EMAIL_SERVICE);
  console.log('[EMAIL] - Password configurado:', EMAIL_PASS ? 'SÍ' : 'NO');
  
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('[EMAIL] ❌ Configuración de email no encontrada. Emails no se enviarán.');
    return null;
  }

  try {
    console.log('[EMAIL] 🏗️ Creando transportador nodemailer...');
    const transporter = nodemailer.createTransport({
      service: EMAIL_SERVICE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      },
      // Configuración adicional para Gmail
      tls: {
        rejectUnauthorized: false
      },
      debug: true, // Debugging habilitado
      logger: true
    });
    
    console.log('[EMAIL] ✅ Transportador creado, verificando conexión...');
    
    // Verificar la conexión
    try {
      await transporter.verify();
      console.log('[EMAIL] ✅ Conexión SMTP verificada exitosamente');
    } catch (verifyError) {
      console.error('[EMAIL] ❌ Error verificando conexión SMTP:', verifyError.message);
      console.error('[EMAIL] 💡 Posibles soluciones:');
      console.error('  1. Usar App Password en lugar de contraseña normal');
      console.error('  2. Verificar que 2FA esté habilitado en Gmail');
      console.error('  3. Generar un App Password específico para esta aplicación');
      console.error('  4. Verificar que EMAIL_PASS sea el App Password, no la contraseña normal');
    }
    
    return transporter;
  } catch (error) {
    console.error('[EMAIL] ❌ Error creando transportador:', error);
    return null;
  }
}

/**
 * 🎨 Genera HTML template para email de confirmación (estilo actualizado)
 */
function generateConfirmationEmailHTML(reservationData) {
  const {
    userName,
    date,
    startTime,
    endTime,
    durationHours,
    serviceType,
    wasFree,
    totalPrice,
    reservation,
    paymentReceipt = null
  } = reservationData;

  const formatDate = new Date(date).toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Sección de recibo de pago si existe
  const paymentReceiptSection = paymentReceipt ? `
    <div style="background: #f0fdf4; border: 1px solid #16a34a; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #15803d; margin-top: 0; display: flex; align-items: center;">
        ✅ <span style="margin-left: 8px;">Pago Confirmado</span>
      </h3>
      <div style="background: white; border-radius: 8px; padding: 15px; border: 1px solid #dcfce7;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 5px 0; color: #374151; font-weight: 500;">Método de pago:</td>
            <td style="padding: 5px 0; color: #6b7280;">${paymentReceipt.method || 'Transferencia/Payphone'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #374151; font-weight: 500;">Referencia:</td>
            <td style="padding: 5px 0; color: #6b7280; font-family: monospace;">${paymentReceipt.reference || reservation.id}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #374151; font-weight: 500;">Monto:</td>
            <td style="padding: 5px 0; color: #6b7280; font-weight: 600;">$${paymentReceipt.amount || totalPrice} USD</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #374151; font-weight: 500;">Fecha de pago:</td>
            <td style="padding: 5px 0; color: #6b7280;">${paymentReceipt.date || new Date().toLocaleDateString('es-EC')}</td>
          </tr>
          ${paymentReceipt.bank ? `
          <tr>
            <td style="padding: 5px 0; color: #374151; font-weight: 500;">Banco:</td>
            <td style="padding: 5px 0; color: #6b7280;">${paymentReceipt.bank}</td>
          </tr>` : ''}
        </table>
      </div>
      <p style="color: #059669; font-size: 14px; margin: 10px 0 0 0;">
        💰 Tu pago ha sido verificado y procesado exitosamente.
      </p>
    </div>
  ` : '';

  const priceSection = wasFree ? `
    <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #10b981; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <h3 style="color: #059669; margin: 0; font-size: 20px;">🎉 ¡Día Gratis Confirmado!</h3>
      <p style="margin: 8px 0 0 0; color: #065f46; font-size: 16px;">Esta es tu primera visita, disfruta 2 horas sin costo.</p>
    </div>
  ` : `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #92400e; margin: 0; font-size: 18px;">💳 Información de Pago</h3>
      <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0;">
        <p style="margin: 0; color: #374151; font-size: 18px; font-weight: 600;">
          Total: <span style="color: #059669;">$${totalPrice} USD</span>
        </p>
      </div>
      <div style="font-size: 14px; color: #92400e;">
        <p style="margin: 8px 0;"><strong>💳 Payphone:</strong> 
          <a href="https://ppls.me/hnMI9yMRxbQ6rgIVi6L2DA" style="color: #0f766e;">Pagar aquí</a>
        </p>
        <p style="margin: 8px 0;"><strong>🏦 Transferencia:</strong> Banco Pichincha - Cta: 2207158516</p>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reserva confirmada en Coworkia!</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
      
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header con colores corporativos Coworkia -->
        <div style="background: linear-gradient(135deg, #4FD1C7 0%, #2DD4BF 100%); color: #1f2937; text-align: center; padding: 30px 20px;">
          <div style="margin-bottom: 15px;">
            <svg width="80" height="60" viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
              <!-- Laptop con taza de café (logo Coworkia) -->
              <rect x="10" y="25" width="50" height="30" rx="3" fill="#374151" stroke="#1f2937" stroke-width="2"/>
              <rect x="15" y="28" width="40" height="22" rx="1" fill="white"/>
              <rect x="25" y="55" width="30" height="3" rx="1" fill="#374151"/>
              <!-- Taza de café -->
              <ellipse cx="55" cy="18" rx="8" ry="6" fill="#374151"/>
              <ellipse cx="55" cy="15" rx="6" ry="4" fill="white"/>
              <path d="M63 18 Q68 18 68 22 Q68 26 63 26" stroke="#374151" stroke-width="2" fill="none"/>
              <!-- Vapor -->
              <path d="M52 8 Q53 5 54 8 Q55 5 56 8" stroke="#4FD1C7" stroke-width="1.5" fill="none"/>
            </svg>
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">✅ ¡Reserva Confirmada!</h1>
          <p style="margin: 8px 0 0 0; color: #374151; font-size: 16px;">Tu espacio te está esperando</p>
        </div>

        <div style="padding: 30px;">
          
          <!-- Saludo personalizado -->
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #1f2937; font-size: 20px; margin: 0;">¡Perfecto, ${userName}! 👋</h2>
          </div>

          <!-- Detalles de la reserva -->
          <div style="background: #f0fdfa; border-left: 4px solid #4FD1C7; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0f766e; margin-top: 0; font-size: 16px; font-weight: 600;">✅ DETALLES DE TU RESERVA</h3>
            
            <div style="margin: 15px 0;">
              <div style="display: flex; align-items: center; margin: 8px 0;">
                <span style="width: 24px;">📅</span>
                <span style="color: #1f2937; font-weight: 500;">${formatDate}</span>
              </div>
              
              <div style="display: flex; align-items: center; margin: 8px 0;">
                <span style="width: 24px;">🕐</span>
                <span style="color: #1f2937; font-weight: 500;">${startTime} - ${endTime}</span>
              </div>
              
              <div style="display: flex; align-items: center; margin: 8px 0;">
                <span style="width: 24px;">🏢</span>
                <span style="color: #1f2937; font-weight: 500;">${serviceType}</span>
              </div>
            </div>
          </div>

          ${paymentReceiptSection}
          ${priceSection}

          <!-- Ubicación -->
          <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">📍 UBICACIÓN</h3>
            <p style="margin: 5px 0; color: #92400e; font-weight: 500;">Coworkia</p>
            <p style="margin: 5px 0; color: #92400e;">Edificio Finistere - Planta Baja<br>Whymper 403, Quito</p>
            
            <div style="text-align: center; margin: 15px 0;">
              <a href="https://goo.gl/maps/9GD83LV3XRf23XK59" 
                 style="background: #4FD1C7; color: #1f2937; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
                Ver en Google Maps
              </a>
            </div>
          </div>

          <!-- Advertencia importante -->
          <div style="background: #fef9c3; border: 1px solid #eab308; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #a16207; margin-top: 0; font-size: 14px; font-weight: 600;">⚠️ IMPORTANTE - Llegada tardía</h4>
            <p style="color: #a16207; font-size: 14px; margin: 5px 0;">
              El tiempo regular de espera es de 10 minutos. Si llegarás más tarde, avísanos para mantener tu espacio reservado.
            </p>
          </div>

          <!-- Lo que te espera -->
          <div style="margin: 25px 0;">
            <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 10px;">🌟 Lo que te espera:</h3>
            <ul style="color: #6b7280; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>☕ Café ilimitado</li>
              <li>🌐 Internet de alta velocidad</li>
              <li>🖥️ Espacios cómodos y modernos</li>
              <li>🤝 Ambiente colaborativo</li>
            </ul>
          </div>

          <!-- Contacto -->
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
              ⭐ Si tienes alguna pregunta, simplemente responde este correo.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin: 30px 0 0 0;">
            <p style="color: #0f766e; font-size: 16px; font-weight: 600; margin: 0;">¡Nos vemos pronto! 🚀</p>
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">Aurora ✨ - Tu asistente de Coworkia</p>
          </div>

        </div>
      </div>

      <!-- Footer externo con branding corporativo -->
      <div style="text-align: center; padding: 20px; background: #1f2937; color: #9ca3af; font-size: 12px;">
        <div style="margin-bottom: 10px;">
          <svg width="60" height="45" viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" style="display: inline-block;">
            <!-- Laptop con taza de café (logo Coworkia) -->
            <rect x="10" y="25" width="50" height="30" rx="3" fill="#4FD1C7" stroke="#2DD4BF" stroke-width="2"/>
            <rect x="15" y="28" width="40" height="22" rx="1" fill="white"/>
            <rect x="25" y="55" width="30" height="3" rx="1" fill="#4FD1C7"/>
            <!-- Taza de café -->
            <ellipse cx="55" cy="18" rx="8" ry="6" fill="#4FD1C7"/>
            <ellipse cx="55" cy="15" rx="6" ry="4" fill="white"/>
            <path d="M63 18 Q68 18 68 22 Q68 26 63 26" stroke="#4FD1C7" stroke-width="2" fill="none"/>
            <!-- Vapor -->
            <path d="M52 8 Q53 5 54 8 Q55 5 56 8" stroke="#4FD1C7" stroke-width="1.5" fill="none"/>
          </svg>
        </div>
        <div style="color: #4FD1C7; font-size: 18px; font-weight: 600; margin-bottom: 5px;">coWorkia</div>
        <div style="color: #9ca3af; font-size: 14px; margin-bottom: 15px;">work · connect · grow</div>
        <div style="color: #6b7280; font-size: 12px;">
          © 2025 Coworkia Ecuador - Espacios que inspiran<br>
          Whymper 403, Quito | RUC: 1792954078001
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * � Procesa imagen de comprobante de pago y extrae información
 */
export async function processPaymentReceipt(imageData, amount) {
  // En una implementación real, aquí iría OCR o análisis de imagen
  // Por ahora, simulamos extracción de datos básicos
  
  const currentDate = new Date().toLocaleDateString('es-EC');
  
  // Detectar método de pago basado en patrones comunes
  let method = 'Transferencia bancaria';
  let bank = 'Banco Pichincha';
  
  // Generar referencia única basada en timestamp
  const reference = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  return {
    method,
    bank,
    reference,
    amount: amount,
    date: currentDate,
    verified: true, // En producción, esto sería resultado del análisis
    imageProcessed: true
  };
}

/**
 * �📧 Envía email de confirmación de reserva
 */
export async function sendReservationConfirmation(reservationData) {
  console.log('[EMAIL] 🚀 Iniciando envío de confirmación de reserva...');
  const transporter = await createEmailTransporter();
  
  if (!transporter) {
    console.error('[EMAIL] ❌ No se pudo crear el transportador de email');
    return {
      success: false,
      error: 'Configuración de email no disponible'
    };
  }

  const {
    email,
    userName,
    date,
    startTime,
    serviceType,
    wasFree
  } = reservationData;

  if (!email) {
    return {
      success: false,
      error: 'Email del usuario no proporcionado'
    };
  }

  const emailHTML = generateConfirmationEmailHTML(reservationData);
  
  const mailOptions = {
    from: {
      name: 'Coworkia Ecuador',
      address: process.env.EMAIL_USER || 'noreply@coworkia.com'
    },
    to: email,
    subject: `✅ Reserva Confirmada - ${serviceType} ${date} ${startTime} - Coworkia`,
    html: emailHTML,
    text: `
Hola ${userName},

Tu reserva en Coworkia ha sido confirmada:

📅 Fecha: ${date}
🕐 Horario: ${startTime}
🏢 Servicio: ${serviceType}
${wasFree ? '🎉 Día gratis confirmado!' : '💳 Recuerda realizar el pago'}

Ubicación: Edificio Finistere - Planta Baja, Whymper 403, Quito
https://goo.gl/maps/9GD83LV3XRf23XK59

¿Preguntas? WhatsApp: +593 99 483 7117

¡Te esperamos!
Equipo Coworkia
    `.trim()
  };

  try {
    console.log(`[EMAIL] 📤 Enviando confirmación a ${email}...`);
    console.log('[EMAIL] 📋 Configuración del email:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHtml: !!mailOptions.html,
      hasText: !!mailOptions.text
    });
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`[EMAIL] ✅ Email enviado exitosamente!`);
    console.log('[EMAIL] 📊 Detalles del resultado:', {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      pending: result.pending,
      response: result.response
    });
    
    // Verificar si hay destinatarios rechazados
    if (result.rejected && result.rejected.length > 0) {
      console.warn('[EMAIL] ⚠️ Algunos destinatarios fueron rechazados:', result.rejected);
    }
    
    return {
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      message: 'Email de confirmación enviado exitosamente'
    };
    
  } catch (error) {
    console.error('[EMAIL] ❌ Error enviando email:', error.message);
    console.error('[EMAIL] 📜 Tipo de error:', error.name);
    console.error('[EMAIL] 🔍 Código de error:', error.code);
    console.error('[EMAIL] 📋 Stack trace:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📧 Envía email de recordatorio (24h antes)
 */
export async function sendReservationReminder(reservationData) {
  const transporter = await createEmailTransporter();
  
  if (!transporter) {
    return { success: false, error: 'Configuración de email no disponible' };
  }

  const {
    email,
    userName,
    date,
    startTime,
    serviceType
  } = reservationData;

  const mailOptions = {
    from: {
      name: 'Coworkia Ecuador',
      address: process.env.EMAIL_USER || 'noreply@coworkia.com'
    },
    to: email,
    subject: `🔔 Recordatorio - Tu reserva es mañana - ${serviceType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4a90e2;">🔔 Recordatorio de Reserva</h2>
        <p>Hola <strong>${userName}</strong>,</p>
        <p>Te recordamos que tienes una reserva <strong>mañana</strong>:</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>📅 Fecha:</strong> ${date}</p>
          <p><strong>🕐 Horario:</strong> ${startTime}</p>
          <p><strong>🏢 Servicio:</strong> ${serviceType}</p>
        </div>
        
        <p><strong>📍 Ubicación:</strong> Edificio Finistere - Planta Baja, Whymper 403, Quito</p>
        <p>¡Te esperamos!</p>
        
        <p style="color: #666; font-size: 14px;">Equipo Coworkia</p>
      </div>
    `,
    text: `
Hola ${userName},

Recordatorio: Tienes una reserva mañana en Coworkia
📅 ${date} a las ${startTime}
🏢 ${serviceType}

Ubicación: Edificio Finistere - Planta Baja, Whymper 403, Quito

¡Te esperamos!
Equipo Coworkia
    `.trim()
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] 🔔 Recordatorio enviado a ${email}`);
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('[EMAIL] Error enviando recordatorio:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 💳 Envía email de confirmación de pago
 */
export async function sendPaymentConfirmationEmail(userEmail, userName, reservationData) {
  console.log('[EMAIL] 🚀 Iniciando envío de confirmación de pago');
  console.log('[EMAIL] - Destinatario:', userEmail);
  console.log('[EMAIL] - Usuario:', userName);
  console.log('[EMAIL] - Datos reserva:', JSON.stringify(reservationData, null, 2));
  
  const transporter = await createEmailTransporter();
  if (!transporter) {
    console.error('[EMAIL] ❌ Transportador no configurado');
    return { success: false, error: 'Email no configurado' };
  }
  
  console.log('[EMAIL] ✅ Transportador creado exitosamente');

  const { paymentData } = reservationData;
  
  // Generar link de Google Calendar
  const calendarLink = generateGoogleCalendarLink(reservationData);
  
  const emailHtml = generatePaymentConfirmationHTML({
    userName,
    ...reservationData,
    paymentData,
    calendarLink
  });
  
  console.log('[EMAIL] ✅ HTML del email generado');

  const emailOptions = {
    from: `"Coworkia" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `✅ Pago Confirmado - Reserva ${reservationData.date}`,
    html: emailHtml,
    text: `¡Pago confirmado! Tu reserva para ${reservationData.date} está lista. Referencia: ${paymentData?.transactionNumber}`
  };
  
  console.log('[EMAIL] 📧 Configuración de email:', {
    from: emailOptions.from,
    to: emailOptions.to,
    subject: emailOptions.subject
  });

  try {
    console.log('[EMAIL] 📤 Enviando email...');
    const info = await transporter.sendMail(emailOptions);
    console.log('[EMAIL] ✅ Email enviado exitosamente. ID:', info.messageId);
    console.log('[EMAIL] 📊 Info completa:', info);
    
    return {
      success: true,
      messageId: info.messageId,
      email: userEmail
    };
  } catch (error) {
    console.error('[EMAIL] ❌ ERROR enviando confirmación de pago:', error.message);
    console.error('[EMAIL] 📜 Stack trace completo:', error.stack);
    console.error('[EMAIL] 🔍 Tipo de error:', error.name);
    console.error('[EMAIL] 📋 Código de error:', error.code);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🎨 Template HTML para confirmación de pago
 */
function generatePaymentConfirmationHTML(data) {
  const {
    userName,
    date,
    startTime,
    endTime,
    durationHours,
    serviceType,
    total,
    paymentData
  } = data;

  const serviceName = serviceType === 'hotDesk' ? 'Hot Desk' : 
                     serviceType === 'meetingRoom' ? 'Sala de Reuniones' : 
                     serviceType === 'privateOffice' ? 'Oficina Privada' : 'Espacio';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pago Confirmado - Coworkia</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc;">
        
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header con colores corporativos Coworkia -->
            <div style="background: linear-gradient(135deg, #4FD1C7 0%, #2DD4BF 100%); padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    <svg width="80" height="60" viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
                      <!-- Laptop con taza de café (logo Coworkia) -->
                      <rect x="10" y="25" width="50" height="30" rx="3" fill="#374151" stroke="#1f2937" stroke-width="2"/>
                      <rect x="15" y="28" width="40" height="22" rx="1" fill="white"/>
                      <rect x="25" y="55" width="30" height="3" rx="1" fill="#374151"/>
                      <!-- Taza de café -->
                      <ellipse cx="55" cy="18" rx="8" ry="6" fill="#374151"/>
                      <ellipse cx="55" cy="15" rx="6" ry="4" fill="white"/>
                      <path d="M63 18 Q68 18 68 22 Q68 26 63 26" stroke="#374151" stroke-width="2" fill="none"/>
                      <!-- Vapor -->
                      <path d="M52 8 Q53 5 54 8 Q55 5 56 8" stroke="#4FD1C7" stroke-width="1.5" fill="none"/>
                    </svg>
                </div>
                <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 600;">✅ ¡Pago Confirmado!</h1>
                <p style="color: #374151; margin: 10px 0 0 0; font-size: 16px;">Tu reserva está confirmada</p>
            </div>

            <!-- Contenido -->
            <div style="padding: 30px 20px;">
                
                <!-- Saludo -->
                <div style="margin-bottom: 25px;">
                    <h2 style="color: #2d3748; margin: 0 0 10px 0; font-size: 20px;">¡Hola ${userName}! 👋</h2>
                    <p style="color: #4a5568; line-height: 1.6; margin: 0;">
                        Hemos confirmado tu pago exitosamente. Tu espacio de trabajo está reservado y listo para usar.
                    </p>
                </div>

                <!-- Información de la Reserva -->
                <div style="background: #f0fdfa; border-left: 4px solid #4FD1C7; padding: 20px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
                    <h3 style="color: #0f766e; margin: 0 0 15px 0; font-size: 18px;">📋 Detalles de tu Reserva</h3>
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ccfbf1;">
                            <span style="color: #0f766e; font-weight: 500;">📅 Fecha:</span>
                            <span style="color: #1f2937; font-weight: 600;">${date}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ccfbf1;">
                            <span style="color: #0f766e; font-weight: 500;">⏰ Horario:</span>
                            <span style="color: #1f2937; font-weight: 600;">${startTime} - ${endTime}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ccfbf1;">
                            <span style="color: #0f766e; font-weight: 500;">🏢 Espacio:</span>
                            <span style="color: #1f2937; font-weight: 600;">${serviceName}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ccfbf1;">
                            <span style="color: #0f766e; font-weight: 500;">⏱️ Duración:</span>
                            <span style="color: #1f2937; font-weight: 600;">${durationHours} hora${durationHours > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>

                <!-- Información de Pago -->
                <div style="background: #f0fdfa; border-left: 4px solid #4FD1C7; padding: 20px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
                    <h3 style="color: #0f766e; margin: 0 0 15px 0; font-size: 18px;">💳 Confirmación de Pago</h3>
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ccfbf1;">
                            <span style="color: #0f766e; font-weight: 500;">💰 Monto Total:</span>
                            <span style="color: #1a202c; font-weight: 700; font-size: 18px;">$${total}</span>
                        </div>
                        ${paymentData?.transactionNumber ? `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ccfbf1;">
                            <span style="color: #0f766e; font-weight: 500;">🔢 Referencia:</span>
                            <span style="color: #1a202c; font-weight: 600;">${paymentData.transactionNumber}</span>
                        </div>
                        ` : ''}
                        ${paymentData?.bank ? `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ccfbf1;">
                            <span style="color: #0f766e; font-weight: 500;">🏦 Banco:</span>
                            <span style="color: #1a202c; font-weight: 600;">${paymentData.bank}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                            <span style="color: #0f766e; font-weight: 500;">✅ Estado:</span>
                            <span style="color: #0f766e; font-weight: 700;">PAGADO</span>
                        </div>
                    </div>
                </div>

                <!-- Información Importante -->
                <div style="background: #fff5b4; border-left: 4px solid #f6e05e; padding: 20px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
                    <h3 style="color: #744210; margin: 0 0 10px 0; font-size: 16px;">📋 Información Importante</h3>
                    <ul style="color: #744210; line-height: 1.6; margin: 0; padding-left: 20px;">
                        <li>Llega 5 minutos antes de tu horario reservado</li>
                        <li>Presenta este email en recepción</li>
                        <li>WiFi disponible las 24/7</li>
                        <li>Café y agua incluidos</li>
                    </ul>
                </div>

                <!-- Acciones -->
                <div style="text-align: center; margin: 30px 0;">
                    ${data.calendarLink ? `
                    <a href="${data.calendarLink}" style="background: #4285F4; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; margin-bottom: 10px;">
                        📅 Agregar a Google Calendar
                    </a>
                    <br>
                    ` : ''}
                    <a href="https://wa.me/593969696969" style="background: #4FD1C7; color: #1f2937; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                        💬 Contactar Soporte
                    </a>
                </div>

                <!-- Ubicación -->
                <div style="text-align: center; margin: 25px 0; padding: 20px; background: #f7fafc; border-radius: 8px;">
                    <h4 style="color: #2d3748; margin: 0 0 10px 0;">📍 Ubicación</h4>
                    <p style="color: #4a5568; margin: 0; line-height: 1.5;">
                        <strong>Coworkia</strong><br>
                        Av. Principal 123<br>
                        Quito, Ecuador<br>
                        <a href="https://maps.google.com/?q=Coworkia" style="color: #3182ce;">Ver en Google Maps</a>
                    </p>
                </div>

            </div>

            <!-- Footer con branding corporativo -->
            <div style="background: #1f2937; padding: 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                  <svg width="60" height="45" viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" style="display: inline-block;">
                    <!-- Laptop con taza de café (logo Coworkia) -->
                    <rect x="10" y="25" width="50" height="30" rx="3" fill="#4FD1C7" stroke="#2DD4BF" stroke-width="2"/>
                    <rect x="15" y="28" width="40" height="22" rx="1" fill="white"/>
                    <rect x="25" y="55" width="30" height="3" rx="1" fill="#4FD1C7"/>
                    <!-- Taza de café -->
                    <ellipse cx="55" cy="18" rx="8" ry="6" fill="#4FD1C7"/>
                    <ellipse cx="55" cy="15" rx="6" ry="4" fill="white"/>
                    <path d="M63 18 Q68 18 68 22 Q68 26 63 26" stroke="#4FD1C7" stroke-width="2" fill="none"/>
                    <!-- Vapor -->
                    <path d="M52 8 Q53 5 54 8 Q55 5 56 8" stroke="#4FD1C7" stroke-width="1.5" fill="none"/>
                  </svg>
                </div>
                <div style="color: #4FD1C7; font-size: 18px; font-weight: 600; margin-bottom: 5px;">coWorkia</div>
                <div style="color: #9ca3af; font-size: 14px; margin-bottom: 15px;">work · connect · grow</div>
                <p style="color: #a0aec0; margin: 0; font-size: 14px;">
                    ¡Gracias por elegir Coworkia! 🚀<br>
                    <a href="mailto:info@coworkia.com" style="color: #4FD1C7;">info@coworkia.com</a> | 
                    <a href="https://wa.me/593969696969" style="color: #4FD1C7;">+593 96 969 6969</a>
                </p>
            </div>

        </div>

    </body>
    </html>
  `;
}

/**
 * 🧪 Prueba la configuración de email
 */
export async function testEmailConfiguration() {
  const transporter = await createEmailTransporter();
  
  if (!transporter) {
    return {
      success: false,
      error: 'Transportador de email no configurado'
    };
  }

  try {
    await transporter.verify();
    return {
      success: true,
      message: 'Configuración de email válida'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error en configuración: ${error.message}`
    };
  }
}

/**
 * 📅 Genera link de Google Calendar para agregar evento
 */
export function generateGoogleCalendarLink(reservationData) {
  const { date, startTime, endTime, userName = 'Cliente' } = reservationData;
  
  try {
    // Convertir fecha y horas a formato de Google Calendar (UTC)
    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);
    
    // Formato ISO para Google Calendar (quitamos los : de la hora)
    const start = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const title = encodeURIComponent('Reserva Coworkia - Hot Desk');
    const details = encodeURIComponent(`
Reserva confirmada en Coworkia
👤 Usuario: ${userName}
📅 Fecha: ${date}
⏰ Horario: ${startTime} - ${endTime}
📍 Ubicación: Whymper 403, Edificio Finistere, Quito
🏢 Espacio: Hot Desk

¡Nos vemos en Coworkia! 🚀
    `.trim());
    
    const location = encodeURIComponent('Coworkia - Whymper 403, Edificio Finistere, Quito');
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  } catch (error) {
    console.error('[EMAIL] Error generando link de Google Calendar:', error);
    return null;
  }
}

export default {
  sendReservationConfirmation,
  sendPaymentConfirmationEmail,
  sendReservationReminder,
  testEmailConfiguration,
  generateGoogleCalendarLink
};