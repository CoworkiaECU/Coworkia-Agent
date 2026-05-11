// 🧾 Sistema de Recibos de Pago por Email - Gabi Financiera
// Envía recibos profesionales HTML por email (NO interactúa con usuarios)

import { sendEmail } from './email.js';
import { COWORKIA_ADDRESS_FULL } from '../utils/constants.js';

/**
 * 🎨 Genera HTML template para recibo de pago (estilo formal/legal)
 * Usa colores más sobrios para que se sienta "recibo de dinero"
 */
function generatePaymentReceiptHTML(paymentData) {
  const {
    receiptNumber,
    memberName,
    memberEmail,
    membershipType,
    totalAmount,
    cashAmount,
    canjeAmount,
    canjeDescription,
    paymentDate,
    bankName,
    transactionReference,
    diegoAuthorized = false
  } = paymentData;

  const formatDate = new Date(paymentDate).toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const today = new Date().toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Sección de pago compuesto (efectivo + canje)
  const compositePaymentSection = canjeAmount > 0 ? `
    <div style="background: #fefce8; border: 2px solid #eab308; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #713f12; margin-top: 0; display: flex; align-items: center; font-size: 16px;">
        💰 <span style="margin-left: 8px;">Pago Compuesto Autorizado</span>
      </h3>
      <div style="background: white; border-radius: 8px; padding: 15px; border: 1px solid #fef3c7;">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #fef3c7;">
            <td style="padding: 10px 0; color: #374151; font-weight: 600;">Efectivo (transferencia):</td>
            <td style="padding: 10px 0; text-align: right; color: #15803d; font-weight: 700; font-size: 16px;">$${cashAmount.toFixed(2)} USD</td>
          </tr>
          <tr style="border-bottom: 1px solid #fef3c7;">
            <td style="padding: 10px 0; color: #374151; font-weight: 600;">Canje de servicios:</td>
            <td style="padding: 10px 0; text-align: right; color: #d97706; font-weight: 700; font-size: 16px;">$${canjeAmount.toFixed(2)} USD/mes</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px 0;">
              <div style="background: #fef3c7; border-radius: 6px; padding: 10px; margin-top: 5px;">
                <p style="margin: 0; color: #78350f; font-size: 13px; font-weight: 500;">
                  📦 Servicio de canje: ${canjeDescription}
                </p>
              </div>
            </td>
          </tr>
          <tr style="border-top: 2px solid #374151;">
            <td style="padding: 15px 0; color: #374151; font-weight: 700; font-size: 16px;">Total membresía:</td>
            <td style="padding: 15px 0; text-align: right; color: #374151; font-weight: 700; font-size: 18px;">$${totalAmount.toFixed(2)} USD/mes</td>
          </tr>
        </table>
      </div>
      ${diegoAuthorized ? `
      <div style="background: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 12px; margin-top: 15px;">
        <p style="margin: 0; color: #15803d; font-size: 13px; display: flex; align-items: center;">
          <span style="font-size: 18px; margin-right: 8px;">✅</span>
          <strong>Pago autorizado por Diego Villota</strong> - Dirección Ejecutiva
        </p>
      </div>
      ` : ''}
    </div>
  ` : `
    <div style="background: #dcfce7; border: 2px solid #16a34a; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <h3 style="color: #15803d; margin: 0 0 10px 0; font-size: 18px;">💵 Monto Total Recibido</h3>
      <div style="color: #374151; font-size: 32px; font-weight: 700; margin: 10px 0;">
        $${totalAmount.toFixed(2)} <span style="font-size: 20px; font-weight: 500;">USD</span>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recibo de Pago - ${receiptNumber}</title>
      <style>@media(prefers-color-scheme:dark){body{background-color:#f3f4f6!important}.em-wrap{background-color:#fff!important;color:#1f2937!important}}</style>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
      
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header formal con colores sobrios para recibo de pago -->
        <div style="background-color:#374151;background:linear-gradient(135deg, #374151 0%, #1f2937 100%); text-align: center; padding: 40px 20px;">
          <div style="color: white; font-size: 64px; font-weight: 700; letter-spacing: -2px; margin-bottom: 8px;">
            Coworkia
          </div>
          <div style="color: rgba(255,255,255,0.95); font-size: 20px; font-weight: 500; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">
            Business Center
          </div>
          <div style="background: white; color: #374151; padding: 20px 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #374151;">🧾 RECIBO DE PAGO OFICIAL</h1>
            <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">Comprobante de pago de membresía</p>
          </div>
        </div>

        <div style="padding: 30px;">
          
          <!-- Información del recibo -->
          <div style="background: #f3f4f6; border: 2px solid #d1d5db; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Número de recibo:</td>
                <td style="padding: 8px 0; color: #374151; font-weight: 700; font-family: monospace; text-align: right;">${receiptNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Fecha de emisión:</td>
                <td style="padding: 8px 0; color: #374151; font-weight: 600; text-align: right;">${today}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Fecha de pago:</td>
                <td style="padding: 8px 0; color: #374151; font-weight: 600; text-align: right;">${formatDate}</td>
              </tr>
            </table>
          </div>

          <!-- Información del cliente -->
          <div style="background: linear-gradient(135deg, rgba(78,205,196,0.08), rgba(68,160,141,0.08)); border-left: 4px solid #4ECDC4; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #374151; margin-top: 0; font-size: 16px; font-weight: 600;">👤 DATOS DEL CLIENTE</h3>
            <table style="width: 100%; font-size: 14px; margin-top: 15px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Nombre completo:</td>
                <td style="padding: 8px 0; color: #374151; font-weight: 600; text-align: right;">${memberName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td>
                <td style="padding: 8px 0; color: #374151; font-weight: 600; text-align: right;">${memberEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Tipo de membresía:</td>
                <td style="padding: 8px 0; color: #4ECDC4; font-weight: 700; text-align: right;">${membershipType}</td>
              </tr>
            </table>
          </div>

          ${compositePaymentSection}

          <!-- Detalles de la transacción bancaria -->
          <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0; font-size: 16px; font-weight: 600;">🏦 DETALLES DE TRANSACCIÓN</h3>
            <table style="width: 100%; font-size: 14px; margin-top: 15px;">
              ${bankName ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Banco:</td>
                <td style="padding: 8px 0; color: #374151; font-weight: 600; text-align: right;">${bankName}</td>
              </tr>` : ''}
              ${transactionReference ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Referencia:</td>
                <td style="padding: 8px 0; color: #374151; font-weight: 700; font-family: monospace; text-align: right;">${transactionReference}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Método de pago:</td>
                <td style="padding: 8px 0; color: #374151; font-weight: 600; text-align: right;">${canjeAmount > 0 ? 'Pago Compuesto (Efectivo + Canje)' : 'Transferencia Bancaria'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Estado:</td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 6px; font-weight: 600; font-size: 13px;">
                    ✅ VERIFICADO Y APROBADO
                  </span>
                </td>
              </tr>
            </table>
          </div>

          ${canjeAmount > 0 ? `
          <!-- Recordatorio de entregas mensuales -->
          <div style="background: linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.1)); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="color: #f59e0b; font-size: 24px; margin-right: 10px;">📦</span>
              <h4 style="color: #374151; margin: 0; font-size: 16px; font-weight: 600;">ENTREGAS MENSUALES</h4>
            </div>
            <p style="color: #374151; font-size: 14px; margin: 10px 0; line-height: 1.6;">
              <strong>Servicio comprometido:</strong> ${canjeDescription}<br>
              <strong>Valor mensual:</strong> $${canjeAmount.toFixed(2)} USD<br>
              <strong>Frecuencia:</strong> Mensual
            </p>
            <div style="background: white; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; margin-top: 10px;">
              <p style="margin: 0; color: #78350f; font-size: 13px;">
                ⏰ <strong>Gabi te recordará</strong> 3 días antes de cada entrega mensual para coordinar los detalles.
              </p>
            </div>
          </div>
          ` : ''}

          <!-- Beneficios de la membresía -->
          <div style="background: rgba(78,205,196,0.05); border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #374151; font-size: 16px; margin-bottom: 15px; font-weight: 600;">🌟 Tu membresía incluye:</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div style="background: white; border-radius: 8px; padding: 12px; border: 1px solid rgba(78,205,196,0.2);">
                <span style="color: #4ECDC4; font-size: 16px; margin-right: 6px;">☕</span>
                <span style="color: #374151; font-weight: 500; font-size: 13px;">Café ilimitado</span>
              </div>
              <div style="background: white; border-radius: 8px; padding: 12px; border: 1px solid rgba(78,205,196,0.2);">
                <span style="color: #4ECDC4; font-size: 16px; margin-right: 6px;">🌐</span>
                <span style="color: #374151; font-weight: 500; font-size: 13px;">Internet alta velocidad</span>
              </div>
              <div style="background: white; border-radius: 8px; padding: 12px; border: 1px solid rgba(78,205,196,0.2);">
                <span style="color: #4ECDC4; font-size: 16px; margin-right: 6px;">🖥️</span>
                <span style="color: #374151; font-weight: 500; font-size: 13px;">Espacios modernos</span>
              </div>
              <div style="background: white; border-radius: 8px; padding: 12px; border: 1px solid rgba(78,205,196,0.2);">
                <span style="color: #4ECDC4; font-size: 16px; margin-right: 6px;">🤝</span>
                <span style="color: #374151; font-weight: 500; font-size: 13px;">Networking</span>
              </div>
            </div>
          </div>

          <!-- Próximos pasos -->
          <div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #15803d; margin-top: 0; font-size: 16px; font-weight: 600;">✨ Próximos pasos</h3>
            <ol style="color: #374151; font-size: 14px; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
              <li><strong>Coordina tu tour:</strong> Aurora te contactará para agendar tu visita inicial al espacio.</li>
              <li><strong>Conoce el ecosistema:</strong> Te presentaremos a la comunidad y todas las instalaciones.</li>
              <li><strong>Comienza a trabajar:</strong> Activa tu membresía y disfruta de todos los beneficios.</li>
            </ol>
          </div>

          <!-- Contacto en caso de dudas -->
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 15px 0;">
              ¿Dudas sobre tu pago o membresía?
            </p>
            <a href="https://wa.me/593994837117?text=Hola%20Aluna,%20recibí%20mi%20recibo%20de%20pago%20y%20tengo%20una%20consulta%20sobre%20mi%20membresía" 
               style="background-color:#25D366;background:linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(37,211,102,0.3); font-size: 14px;">
              📱 Hablar con Aluna
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin: 12px 0 0 0;">
              Aluna tiene tu caso en sus manos 💜
            </p>
          </div>

          <!-- Footer agradecimiento -->
          <div style="text-align: center; margin: 35px 0 0 0; padding: 25px; background: linear-gradient(135deg, rgba(78,205,196,0.1), rgba(68,160,141,0.1)); border-radius: 12px;">
            <p style="color: #374151; font-size: 18px; font-weight: 700; margin: 0;">¡Bienvenido a la comunidad! 🎉</p>
            <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">Gabi 💚 - Asistente Financiera</p>
          </div>

          <!-- Nota legal -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 11px; margin: 0; line-height: 1.5; text-align: center;">
              <strong>Nota legal:</strong> Este recibo constituye comprobante oficial de pago de su membresía en Coworkia. 
              Conserve este documento para sus registros. En caso de requerir factura electrónica, por favor contacte a nuestro equipo administrativo.
            </p>
          </div>

        </div>
      </div>

      <!-- Footer externo -->
      <div style="text-align: center; padding: 30px 20px; background: #374151; color: #9CA3AF;">
        <div style="color: #4ECDC4; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 8px;">
          Coworkia
        </div>
        <div style="color: #9CA3AF; font-size: 14px; font-weight: 400; letter-spacing: 1px; margin-bottom: 20px;">
          work · connect · grow
        </div>
        <div style="color: #6B7280; font-size: 12px; line-height: 1.6;">
          © 2026 Coworkia Ecuador - Espacios que inspiran<br>
          ${COWORKIA_ADDRESS_FULL}<br>
          RUC: 1234567890001
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 📧 Envía recibo de pago por email
 */
export async function sendPaymentReceipt(paymentData) {
  console.log('[GABI-EMAIL] 🧾 Preparando envío de recibo de pago...');
  console.log('[GABI-EMAIL] - Cliente:', paymentData.memberName);
  console.log('[GABI-EMAIL] - Email:', paymentData.memberEmail);
  console.log('[GABI-EMAIL] - Recibo:', paymentData.receiptNumber);

  const htmlContent = generatePaymentReceiptHTML(paymentData);

  const result = await sendEmail({
    from: '"Gabi • Asesoría Legal y Contable" <secretaria.coworkia@gmail.com>',
    to: paymentData.memberEmail,
    subject: `🧾 Recibo de Pago - ${paymentData.receiptNumber} - Coworkia`,
    html: htmlContent
  });

  if (result.success) {
    console.log('[GABI-EMAIL] ✅ Recibo enviado exitosamente');
    console.log('[GABI-EMAIL] - Message ID:', result.messageId);
  } else {
    console.error('[GABI-EMAIL] ❌ Error enviando recibo:', result.error);
  }

  return result;
}

/**
 * 📋 Extrae datos de pago para generar recibo
 */
export function prepareReceiptData(lead, paymentData, compositePayment = null) {
  const receiptNumber = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  return {
    receiptNumber,
    memberName: lead.client_name || lead.full_name,
    memberEmail: lead.email,
    membershipType: lead.membership_type,
    totalAmount: parseFloat(lead.total_amount || paymentData.amount || 0),
    cashAmount: compositePayment ? compositePayment.cashAmount : parseFloat(paymentData.amount || 0),
    canjeAmount: compositePayment ? compositePayment.canjeAmount : 0,
    canjeDescription: compositePayment ? compositePayment.canjeDescription : '',
    paymentDate: paymentData.transaction_date || new Date().toISOString(),
    bankName: paymentData.destination_account || '',
    transactionReference: paymentData.transaction_id || '',
    diegoAuthorized: compositePayment ? true : false
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏢 RECIBO DE RESERVA — Gabi lo envía silenciosamente al confirmar el pago
// Diferente al recibo de membresía: habla de "espacio" no "membresía",
// incluye fecha/horario de la reserva, CTA a @aurora.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 🎨 Genera HTML para recibo oficial de RESERVA (Hot Desk / Sala de Reuniones)
 */
function generateReservationReceiptHTML(data) {
  const {
    receiptNumber,
    clientName,
    clientEmail,
    serviceType,       // 'Hot Desk' | 'Sala de Reuniones' | 'Escritorio Permanente'
    totalAmount,
    reservationDate,   // 'Lunes 11 de mayo de 2026' o rango 'Lun 11 – Jue 14 mayo'
    startTime,
    endTime,
    paymentMethod,
    bankName,
    transactionReference,
    authorizationCode,
    receiptImageUrl    // URL del comprobante original enviado por WhatsApp (opcional)
  } = data;

  const today = new Date().toLocaleDateString('es-EC', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const horarioLine = (startTime && endTime)
    ? `${startTime} – ${endTime}`
    : 'Jornada completa';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de Reserva - ${receiptNumber}</title>
  <style>@media(prefers-color-scheme:dark){body{background-color:#f3f4f6!important}.em-wrap{background-color:#fff!important;color:#1f2937!important}}</style>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;background-color:#f9fafb;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">

  <!-- Header Aurora teal -->
  <div style="background:linear-gradient(135deg,#0f766e 0%,#134e4a 100%);text-align:center;padding:40px 20px;">
    <div style="color:white;font-size:64px;font-weight:700;letter-spacing:-2px;margin-bottom:8px;">Coworkia</div>
    <div style="color:rgba(255,255,255,0.9);font-size:18px;font-weight:500;letter-spacing:2px;margin-bottom:20px;text-transform:uppercase;">Business Center</div>
    <div style="background:white;color:#0f766e;padding:18px 28px;border-radius:12px;display:inline-block;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
      <h1 style="margin:0;font-size:20px;font-weight:700;">🧾 RECIBO DE PAGO OFICIAL</h1>
      <p style="margin:8px 0 0 0;color:#6b7280;font-size:13px;">Comprobante de pago de reserva de espacio</p>
    </div>
  </div>

  <div style="padding:30px;">

    <!-- Datos del recibo -->
    <div style="background:#f3f4f6;border:2px solid #d1d5db;border-radius:12px;padding:20px;margin:20px 0;">
      <table style="width:100%;font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-weight:500;">Número de recibo:</td>
          <td style="padding:8px 0;color:#374151;font-weight:700;font-family:monospace;text-align:right;">${receiptNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-weight:500;">Fecha de emisión:</td>
          <td style="padding:8px 0;color:#374151;font-weight:600;text-align:right;">${today}</td>
        </tr>
      </table>
    </div>

    <!-- Datos del cliente -->
    <div style="background:linear-gradient(135deg,rgba(15,118,110,0.07),rgba(20,83,45,0.07));border-left:4px solid #0f766e;border-radius:12px;padding:25px;margin:25px 0;">
      <h3 style="color:#374151;margin-top:0;font-size:15px;font-weight:600;">👤 DATOS DEL CLIENTE</h3>
      <table style="width:100%;font-size:14px;margin-top:12px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-weight:500;">Nombre completo:</td>
          <td style="padding:8px 0;color:#374151;font-weight:600;text-align:right;">${clientName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-weight:500;">Email:</td>
          <td style="padding:8px 0;color:#374151;font-weight:600;text-align:right;">${clientEmail}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-weight:500;">Tipo de espacio:</td>
          <td style="padding:8px 0;color:#0f766e;font-weight:700;text-align:right;">${serviceType}</td>
        </tr>
      </table>
    </div>

    <!-- Detalle de la reserva -->
    <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;margin:20px 0;">
      <h3 style="color:#166534;margin-top:0;font-size:15px;font-weight:600;">📅 DETALLE DE LA RESERVA</h3>
      <table style="width:100%;font-size:14px;margin-top:12px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-weight:500;">Fecha:</td>
          <td style="padding:8px 0;color:#374151;font-weight:600;text-align:right;">${reservationDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-weight:500;">Horario:</td>
          <td style="padding:8px 0;color:#374151;font-weight:600;text-align:right;">${horarioLine}</td>
        </tr>
        <tr style="border-top:2px solid #bbf7d0;">
          <td style="padding:12px 0;color:#374151;font-weight:700;font-size:16px;">Total pagado:</td>
          <td style="padding:12px 0;text-align:right;color:#166534;font-weight:700;font-size:22px;">$${Number(totalAmount).toFixed(2)} <span style="font-size:14px;font-weight:500;">USD</span></td>
        </tr>
      </table>
    </div>

    <!-- Transacción bancaria -->
    <div style="background:white;border:2px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0;">
      <h3 style="color:#374151;margin-top:0;font-size:15px;font-weight:600;">🏦 DETALLES DE TRANSACCIÓN</h3>
      <table style="width:100%;font-size:14px;margin-top:12px;">
        ${bankName ? `<tr><td style="padding:8px 0;color:#6b7280;font-weight:500;">Banco / Método:</td><td style="padding:8px 0;color:#374151;font-weight:600;text-align:right;">${bankName}</td></tr>` : ''}
        ${transactionReference ? `<tr><td style="padding:8px 0;color:#6b7280;font-weight:500;">Referencia:</td><td style="padding:8px 0;color:#374151;font-weight:700;font-family:monospace;text-align:right;">${transactionReference}</td></tr>` : ''}
        ${authorizationCode ? `<tr><td style="padding:8px 0;color:#6b7280;font-weight:500;">Autorización:</td><td style="padding:8px 0;color:#374151;font-weight:700;font-family:monospace;text-align:right;">${authorizationCode}</td></tr>` : ''}
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-weight:500;">Método de pago:</td>
          <td style="padding:8px 0;color:#374151;font-weight:600;text-align:right;">${paymentMethod || 'Transferencia Bancaria'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-weight:500;">Estado:</td>
          <td style="padding:8px 0;text-align:right;">
            <span style="background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:6px;font-weight:600;font-size:13px;">✅ VERIFICADO Y APROBADO</span>
          </td>
        </tr>
      </table>
    </div>

    ${receiptImageUrl ? `
    <!-- Comprobante original adjunto -->
    <div style="background:#fafafa;border:1px dashed #d1d5db;border-radius:12px;padding:16px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 10px 0;color:#6b7280;font-size:13px;">📎 Comprobante original enviado</p>
      <img src="${receiptImageUrl}" alt="Comprobante" style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb;" />
    </div>` : ''}

    <!-- Nota legal -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:24px 0;">
      <p style="margin:0;color:#78350f;font-size:12px;line-height:1.7;">
        <strong>Nota legal:</strong> Este recibo constituye comprobante oficial de pago de su reserva en Coworkia Business Center.
        Conserve este documento para cualquier consulta futura.<br>
        RUC: 1702683499001 · secretaria.coworkia@gmail.com
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="https://wa.me/593994837117?text=@aurora%2C%20revisa%20mi%20reserva%20${receiptNumber}"
         style="background:linear-gradient(135deg,#0f766e,#134e4a);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        🏢 Ver detalles de tu reserva
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;line-height:1.8;">
      © 2026 Coworkia Ecuador · Espacios que inspiran<br>
      Whymper 403, Edificio Finistere · Quito, Ecuador<br>
      <a href="mailto:secretaria.coworkia@gmail.com" style="color:#0f766e;">secretaria.coworkia@gmail.com</a>
    </div>

  </div>
</div>
</body>
</html>`;
}

/**
 * 📧 Gabi envía recibo de RESERVA por email (silenciosamente, sin WA al cliente)
 * @param {Object} reservationData - Datos de la reserva confirmada
 */
export async function sendReservationReceiptByGabi(reservationData) {
  console.log('[GABI-RESERVA] 🧾 Preparando recibo de reserva...');

  const {
    clientName,
    clientEmail,
    serviceType,
    reservationDate,
    startTime,
    endTime,
    totalAmount,
    paymentMethod,
    bankName,
    transactionReference,
    authorizationCode,
    receiptImageUrl,
    reservationId
  } = reservationData;

  if (!clientEmail) {
    console.warn('[GABI-RESERVA] ⚠️ Sin email — no se envía recibo');
    return { success: false, error: 'No email provided' };
  }

  // Número corto: RSV-YYYYMMDD-XXXX (no usar UUID completo)
  const dateTag = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const shortId = reservationId ? reservationId.slice(-4).toUpperCase() : Date.now().toString(36).slice(-4).toUpperCase();
  const receiptNumber = `RSV-${dateTag}-${shortId}`;

  const htmlContent = generateReservationReceiptHTML({
    receiptNumber,
    clientName: clientName || 'Cliente',
    clientEmail,
    serviceType: serviceType || 'Hot Desk',
    reservationDate: reservationDate || new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    startTime,
    endTime,
    totalAmount: totalAmount || 0,
    paymentMethod,
    bankName,
    transactionReference,
    authorizationCode,
    receiptImageUrl
  });

  const adminCC = process.env.COWORKIA_ADMIN_EMAIL || '';
  const result = await sendEmail({
    from: '"Gabi • Asesoría Legal y Contable" <secretaria.coworkia@gmail.com>',
    to: clientEmail,
    ...(adminCC ? { cc: adminCC } : {}),
    subject: `🧾 Tu recibo de reserva ${receiptNumber} — Coworkia`,
    html: htmlContent
  });

  if (result.success) {
    console.log('[GABI-RESERVA] ✅ Recibo de reserva enviado a', clientEmail, adminCC ? `(CC: ${adminCC})` : '', '—', receiptNumber);
  } else {
    console.error('[GABI-RESERVA] ❌ Error enviando recibo de reserva:', result.error);
  }

  return { ...result, receiptNumber };
}
