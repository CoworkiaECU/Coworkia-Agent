/**
 * 📧 AXEL QUOTE EMAIL SERVICE
 * Genera y envía emails HTML con cotizaciones de The PaintBull
 */

import { sendEmail } from './email.js';

/**
 * 🎨 Genera HTML del email de cotización (estilo The PaintBull)
 */
async function generateQuoteEmailHTML({ customerName, vehicleData, damageAnalysis, quote, priceRange, photoUrls = [], quoteCode }) {
  const formatDate = new Date().toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Sección de fotos - convertir URLs a base64
  let photosSection = '';
  
  if (photoUrls && photoUrls.length > 0) {
    try {
      // Importar función para descargar y convertir a base64
      const photosBase64 = await Promise.all(
        photoUrls.map(async (url) => {
          try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            return `data:image/jpeg;base64,${base64}`;
          } catch (err) {
            console.error('[QUOTE-EMAIL] ❌ Error descargando foto:', err.message);
            return null;
          }
        })
      );
      
      const validPhotos = photosBase64.filter(p => p !== null);
      
      if (validPhotos.length > 0) {
        photosSection = `
          <div style="margin: 30px 0;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 18px;">📸 FOTOS DEL VEHÍCULO</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
              ${validPhotos.map((base64Img, idx) => `
                <div style="border: 2px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                  <img src="${base64Img}" alt="Foto ${idx + 1}" style="width: 100%; height: auto; display: block; max-height: 300px; object-fit: cover;" />
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        console.log('[QUOTE-EMAIL] ⚠️ No se pudieron descargar fotos, se omite sección');
      }
    } catch (error) {
      console.error('[QUOTE-EMAIL] ❌ Error procesando fotos:', error);
      // Fallback: mostrar links si falla la conversión
      photosSection = `
        <div style="margin: 30px 0;">
          <h3 style="color: #374151; margin-bottom: 15px; font-size: 18px;">📸 FOTOS DEL VEHÍCULO</h3>
          <p style="color: #6B7280; font-size: 14px; margin-bottom: 15px;">
            Fotos disponibles temporalmente (haz clic para ver):
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
            ${photoUrls.map((url, idx) => `
              <a href="${url}" target="_blank" style="text-decoration: none; display: block;">
                <div style="border: 2px solid #E5E7EB; border-radius: 8px; overflow: hidden; transition: all 0.2s;">
                  <div style="background: #F3F4F6; padding: 40px 20px; text-align: center;">
                    <p style="margin: 0; color: #6B7280; font-size: 14px;">📷 Foto ${idx + 1}</p>
                    <p style="margin: 5px 0 0 0; color: #DC2626; font-size: 12px; font-weight: 600;">Ver imagen →</p>
                  </div>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  // Badge de severidad
  const severityBadge = damageAnalysis.severity === 'LEVE' 
    ? '<span style="background: #DCFCE7; color: #166534; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🟢 DAÑO LEVE</span>'
    : '<span style="background: #FEF3C7; color: #92400E; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">🟡 DAÑO MODERADO</span>';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cotización The PaintBull - ${vehicleData.marca} ${vehicleData.modelo}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
      
      <div style="max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header The PaintBull con Diana -->
        <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); text-align: center; padding: 50px 30px; position: relative;">
          
          <!-- Logo Diana (círculos concéntricos rojo y blanco) -->
          <div style="margin: 0 auto 25px; width: 140px; height: 140px; position: relative;">
            <div style="position: absolute; width: 140px; height: 140px; border-radius: 50%; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.2);"></div>
            <div style="position: absolute; top: 12px; left: 12px; width: 116px; height: 116px; border-radius: 50%; background: #DC2626;"></div>
            <div style="position: absolute; top: 24px; left: 24px; width: 92px; height: 92px; border-radius: 50%; background: white;"></div>
            <div style="position: absolute; top: 36px; left: 36px; width: 68px; height: 68px; border-radius: 50%; background: #DC2626;"></div>
            <div style="position: absolute; top: 52px; left: 52px; width: 36px; height: 36px; border-radius: 50%; background: white;"></div>
          </div>

          <div style="color: white; font-size: 42px; font-weight: 700; letter-spacing: -1px; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            The PaintBull
          </div>
          <div style="color: rgba(255,255,255,0.95); font-size: 16px; font-weight: 400; letter-spacing: 1px; margin-bottom: 25px;">
            Expertos en Enderezada y Pintura Vehicular
          </div>

          <!-- Banner de cotización -->
          <div style="background: rgba(255,255,255,0.97); color: #1F2937; padding: 25px 35px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 16px rgba(0,0,0,0.25);">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #DC2626;">💰 Cotización Personalizada</h1>
            <p style="margin: 10px 0 5px 0; color: #6B7280; font-size: 15px;">${formatDate}</p>
            <p style="margin: 5px 0 0 0; color: #111827; font-size: 14px; font-weight: 600;">Cliente: ${customerName}</p>
            <p style="margin: 5px 0 0 0; color: #DC2626; font-size: 13px; font-weight: 700; letter-spacing: 1px;">Código: ${quoteCode}</p>
          </div>
        </div>

        <div style="padding: 40px 35px;">
          
          <!-- Datos del vehículo -->
          <div style="background: linear-gradient(135deg, rgba(220,38,38,0.08), rgba(185,28,28,0.08)); border-left: 4px solid #DC2626; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 22px; font-weight: 700; display: flex; align-items: center;">
              🚗 <span style="margin-left: 10px;">VEHÍCULO</span>
            </h2>
            
            <div style="background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <table style="width: 100%; font-size: 16px;">
                <tr>
                  <td style="padding: 10px 0; color: #6B7280; font-weight: 500; width: 40%;">Marca:</td>
                  <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 18px;">${vehicleData.marca}</td>
                </tr>
                <tr style="border-top: 1px solid #F3F4F6;">
                  <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Modelo:</td>
                  <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 18px;">${vehicleData.modelo}</td>
                </tr>
                <tr style="border-top: 1px solid #F3F4F6;">
                  <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Año:</td>
                  <td style="padding: 10px 0; color: #111827; font-weight: 600;">${vehicleData.año}</td>
                </tr>
                <tr style="border-top: 1px solid #F3F4F6;">
                  <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Severidad:</td>
                  <td style="padding: 10px 0;">${severityBadge}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Cotización detallada -->
          <div style="background: white; border: 2px solid #FCA5A5; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
            <h2 style="color: #DC2626; margin: 0 0 20px 0; font-size: 22px; font-weight: 700; display: flex; align-items: center;">
              📋 <span style="margin-left: 10px;">COTIZACIÓN DETALLADA</span>
            </h2>
            
            <div style="color: #374151; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">
${quote}
            </div>

            ${priceRange ? `
            <div style="background: linear-gradient(135deg, #DC2626, #B91C1C); border-radius: 10px; padding: 25px; margin-top: 25px; text-align: center;">
              <p style="color: rgba(255,255,255,0.9); margin: 0 0 10px 0; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">INVERSIÓN ESTIMADA</p>
              <p style="color: white; margin: 0; font-size: 36px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                $${priceRange.min} - $${priceRange.max} USD
              </p>
            </div>
            ` : ''}
          </div>

          ${photosSection}

          <!-- Disclaimers importantes -->
          <div style="background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
            <h3 style="color: #92400E; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">⚠️ IMPORTANTE</h3>
            <ul style="color: #78350F; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
              <li>Esta cotización es <strong>preliminar</strong> basada en análisis fotográfico con IA</li>
              <li>La <strong>inspección física</strong> puede revelar daños adicionales no visibles en fotos</li>
              <li>Los precios están sujetos a cambios según disponibilidad de repuestos</li>
              <li>El tiempo estimado puede variar según carga de trabajo del taller</li>
            </ul>
          </div>

          <!-- Siguiente paso -->
          <div style="background: linear-gradient(135deg, #DC2626, #B91C1C); border-radius: 12px; padding: 35px; text-align: center; margin-bottom: 30px;">
            <h3 style="color: white; margin: 0 0 15px 0; font-size: 22px; font-weight: 700;">🔧 SIGUIENTE PASO</h3>
            <p style="color: rgba(255,255,255,0.95); margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
              Para confirmar y agendar la reparación,<br>
              contáctanos por WhatsApp o teléfono:
            </p>
            <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <p style="color: white; margin: 0; font-size: 18px; font-weight: 600;">
                📱 WhatsApp: <a href="https://wa.me/593994837117" style="color: white; text-decoration: none; border-bottom: 2px solid white;">+593 99 483 7117</a>
              </p>
            </div>
            <a href="https://wa.me/593994837117?text=Hola%2C%20quiero%20confirmar%20mi%20cotizaci%C3%B3n%20${quoteCode}" style="display: inline-block; background: white; color: #DC2626; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
              💬 Confirmar Cotización ${quoteCode}
            </a>
          </div>

          <!-- Garantía y experiencia -->
          <div style="text-align: center; padding: 25px; background: #F9FAFB; border-radius: 10px; margin-bottom: 30px;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">✨ Por qué The PaintBull</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
              <div>
                <div style="font-size: 32px; margin-bottom: 8px;">🏆</div>
                <p style="margin: 0; color: #6B7280; font-size: 13px; font-weight: 600;">15 años<br>de experiencia</p>
              </div>
              <div>
                <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                <p style="margin: 0; color: #6B7280; font-size: 13px; font-weight: 600;">Garantía<br>certificada</p>
              </div>
              <div>
                <div style="font-size: 32px; margin-bottom: 8px;">⚡</div>
                <p style="margin: 0; color: #6B7280; font-size: 13px; font-weight: 600;">Trabajo<br>profesional</p>
              </div>
            </div>
          </div>

          <!-- Ubicación -->
          <div style="background: white; border: 2px solid #DC2626; border-radius: 12px; padding: 30px; margin-bottom: 30px; text-align: center;">
            <h3 style="color: #DC2626; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">📍 VISÍTANOS</h3>
            <p style="color: #374151; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
              <strong>The PaintBull - Taller de Colisiones</strong><br>
              Calle N44-53 y, Quito 170124<br>
              Ecuador
            </p>
            <div style="margin: 25px 0;">
              <a href="https://www.google.com/maps?q=-0.1640916,-78.4665958" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #DC2626, #B91C1C); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
                🗺️ Cómo llegar →
              </a>
            </div>
            <p style="color: #6B7280; margin: 20px 0 0 0; font-size: 14px;">
              📅 <strong>Horarios:</strong> Lun-Vie 8:00-18:00 | Sáb 9:00-14:00
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 25px 0; border-top: 2px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 13px; margin: 0 0 8px 0;">
              Esta cotización fue generada por:
            </p>
            <p style="color: #6B7280; font-size: 15px; margin: 0; font-weight: 600;">
              <strong style="color: #DC2626;">Axel</strong> - Experto en colisiones de The PaintBull
            </p>
            <p style="color: #D1D5DB; font-size: 12px; margin: 10px 0 0 0;">
              Sistema de análisis inteligente con Vision AI | ${formatDate}
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 📧 Envía email de cotización al cliente
 */
export async function sendQuoteEmail({ 
  customerEmail, 
  customerName,
  vehicleData, 
  damageAnalysis, 
  quote, 
  priceRange,
  photoUrls = [],
  quoteCode
}) {
  try {
    console.log('[QUOTE-EMAIL] 📧 Enviando cotización por email a:', customerEmail);
    console.log('[QUOTE-EMAIL] 🔢 Código de cotización:', quoteCode);

    const htmlContent = await generateQuoteEmailHTML({
      customerName,
      vehicleData,
      damageAnalysis,
      quote,
      priceRange,
      photoUrls,
      quoteCode
    });

    const subject = `🚗 Cotización ${quoteCode} - ${vehicleData.marca} ${vehicleData.modelo} ${vehicleData.año}`;

    const result = await sendEmail({
      to: customerEmail,
      subject: subject,
      html: htmlContent
    });

    if (result.success) {
      console.log('[QUOTE-EMAIL] ✅ Email de cotización enviado exitosamente');
    } else {
      console.error('[QUOTE-EMAIL] ❌ Error enviando email:', result.error);
    }

    return result;

  } catch (error) {
    console.error('[QUOTE-EMAIL] ❌ Error en sendQuoteEmail:', error);
    return { success: false, error: error.message };
  }
}
