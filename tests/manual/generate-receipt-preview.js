// 🎨 Generador de Preview HTML - Recibos Gabi
// Crea archivos HTML para visualizar en navegador

import { prepareReceiptData } from '../../src/servicios/payment-receipt-email.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar la función interna de generación HTML
async function generateHTML() {
  // Re-implementar generatePaymentReceiptHTML aquí para preview
  const { default: paymentReceiptModule } = await import('../../src/servicios/payment-receipt-email.js');
  
  // Datos de Francisco Zapata (pago compuesto)
  const franciscoData = {
    receiptNumber: 'REC-1768954636362-DEMO',
    memberName: 'Francisco Zapata',
    memberEmail: 'francisco.zapata@test.com',
    membershipType: 'Plan 20',
    totalAmount: 250,
    cashAmount: 100,
    canjeAmount: 150,
    canjeDescription: 'Producción de 2 videos profesionales mensuales',
    paymentDate: new Date().toISOString(),
    bankName: 'Produbanco',
    transactionReference: 'PROD-100-TEST-2026',
    diegoAuthorized: true
  };
  
  // Datos de María (pago simple)
  const mariaData = {
    receiptNumber: 'REC-1768954641253-DEMO',
    memberName: 'María González',
    memberEmail: 'maria.gonzalez@test.com',
    membershipType: 'Plan 10',
    totalAmount: 201.60,
    cashAmount: 201.60,
    canjeAmount: 0,
    canjeDescription: '',
    paymentDate: new Date().toISOString(),
    bankName: 'Pichincha',
    transactionReference: 'PAYM-201-TEST-2026',
    diegoAuthorized: false
  };
  
  // Generar HTML usando la función del módulo
  const generatePaymentReceiptHTML = (data) => {
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
    } = data;

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

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de Pago - ${receiptNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 20px;">
  
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <div style="background: linear-gradient(135deg, #374151 0%, #1f2937 100%); text-align: center; padding: 40px 20px;">
      <div style="color: #4ECDC4; font-size: 56px; font-weight: 700; letter-spacing: -2px; margin-bottom: 12px;">Coworkia</div>
      <div style="color: rgba(255,255,255,0.8); font-size: 16px; font-weight: 400; letter-spacing: 1px; margin-bottom: 20px;">work · connect · grow</div>
      <div style="background: white; color: #374151; padding: 20px 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #374151;">🧾 RECIBO DE PAGO OFICIAL</h1>
        <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">Comprobante de pago de membresía</p>
      </div>
    </div>

    <div style="padding: 30px;">
      
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

      <div style="text-align: center; margin: 35px 0 0 0; padding: 25px; background: linear-gradient(135deg, rgba(78,205,196,0.1), rgba(68,160,141,0.1)); border-radius: 12px;">
        <p style="color: #374151; font-size: 18px; font-weight: 700; margin: 0;">¡Bienvenido a la comunidad! 🎉</p>
        <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">Gabi 💚 - Asistente Financiera</p>
      </div>

    </div>
  </div>

</body>
</html>`;
  };
  
  const franciscoHTML = generatePaymentReceiptHTML(franciscoData);
  const mariaHTML = generatePaymentReceiptHTML(mariaData);
  
  // Guardar archivos
  const outputDir = path.join(__dirname, '../../public/temp-previews');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(outputDir, 'recibo-francisco-compuesto.html'), franciscoHTML);
  fs.writeFileSync(path.join(outputDir, 'recibo-maria-simple.html'), mariaHTML);
  
  console.log('✅ Previews HTML generados:');
  console.log('   📄', path.join(outputDir, 'recibo-francisco-compuesto.html'));
  console.log('   📄', path.join(outputDir, 'recibo-maria-simple.html'));
  console.log('');
  console.log('💡 Abre los archivos en tu navegador para ver el diseño');
}

generateHTML();
