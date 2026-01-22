/**
 * 🚨 SEVERE COLLISION ALERT SERVICE
 * Maneja el proceso de colisiones graves que requieren atención del Jefe de Taller
 * 
 * Flujo:
 * 1. Genera enlace WhatsApp pre-llenado para que el cliente contacte a Juan
 * 2. Envía mensaje WhatsApp automático a Juan (+593998100623) con datos del cliente
 * 3. Envía email HTML a coworkia.ec@gmail.com con análisis detallado
 */

import axios from 'axios';
import { sendEmail } from './email.js';

const JEFE_TALLER = {
  nombre: 'Juan',
  whatsapp: '593998100623',
  email: 'villotaj71@gmail.com'
};

const WASSENGER_API_KEY = process.env.WASSENGER_API_KEY;
const WASSENGER_DEVICE = process.env.WASSENGER_DEVICE;

/**
 * 🔗 Genera enlace de WhatsApp pre-llenado para contactar al jefe de taller
 */
export function generateJuanContactLink(userName) {
  const mensaje = `Hola Juan, soy ${userName} y tuve una colisión que necesita tu asesoría 🚗`;
  const encodedMessage = encodeURIComponent(mensaje);
  return `https://wa.me/${JEFE_TALLER.whatsapp}?text=${encodedMessage}`;
}

/**
 * 📱 Envía mensaje de alerta por WhatsApp al jefe de taller
 */
export async function sendWhatsAppToJefe({ userName, userId, vehicleData, analysis, timestamp, photoUrls = [] }) {
  try {
    console.log('[SEVERE-COLLISION] 📱 Enviando WhatsApp a Juan...');

    // Datos del vehículo (si están disponibles)
    const vehicleInfo = vehicleData?.marca && vehicleData?.modelo
      ? `🚗 Vehículo:\n• Marca/Modelo: ${vehicleData.marca} ${vehicleData.modelo}\n• Año: ${vehicleData.año || 'No especificado'}\n\n`
      : '🚗 Vehículo: Datos pendientes por recopilar\n\n';

    const mensaje = `🚨 *ALERTA: COLISIÓN GRAVE*

📞 Cliente por contactar:
• Nombre: ${userName}
• WhatsApp: ${userId}
• Hora: ${timestamp}

${vehicleInfo}📋 Análisis preliminar:
${analysis}

El cliente tiene tu enlace de contacto directo. 🔧`;

    // Enviar mensaje de texto
    const response = await axios.post(
      `https://api.wassenger.com/v1/messages`,
      {
        phone: JEFE_TALLER.whatsapp,
        message: mensaje,
        device: WASSENGER_DEVICE
      },
      {
        headers: {
          'Authorization': `Bearer ${WASSENGER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[SEVERE-COLLISION] ✅ WhatsApp enviado a Juan');

    // Enviar fotos si existen
    if (photoUrls && photoUrls.length > 0) {
      console.log(`[SEVERE-COLLISION] 📸 Enviando ${photoUrls.length} fotos a Juan...`);
      
      for (const photoUrl of photoUrls) {
        try {
          await axios.post(
            `https://api.wassenger.com/v1/messages`,
            {
              phone: JEFE_TALLER.whatsapp,
              media: { url: photoUrl },
              device: WASSENGER_DEVICE
            },
            {
              headers: {
                'Authorization': `Bearer ${WASSENGER_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('[SEVERE-COLLISION] ✅ Foto enviada');
        } catch (photoError) {
          console.error('[SEVERE-COLLISION] ❌ Error enviando foto:', photoError.message);
        }
      }
    }

    return { success: true, messageId: response.data.id };

  } catch (error) {
    console.error('[SEVERE-COLLISION] ❌ Error enviando WhatsApp:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📧 Genera HTML del email de alerta (estilo The PaintBull)
 */
function generateSevereCollisionEmailHTML({ userName, userId, vehicleData, analysis, timestamp, photoUrls = [] }) {
  const formatTimestamp = new Date(timestamp).toLocaleString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Datos del vehículo
  const vehicleSection = vehicleData?.marca && vehicleData?.modelo ? `
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #DC2626;">
      <h3 style="color: #374151; margin-top: 0; font-size: 16px; font-weight: 600;">🚗 VEHÍCULO</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 5px 0; color: #6B7280; font-weight: 500;">Marca/Modelo:</td>
          <td style="padding: 5px 0; color: #111827; font-weight: 600;">${vehicleData.marca} ${vehicleData.modelo}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #6B7280; font-weight: 500;">Año:</td>
          <td style="padding: 5px 0; color: #111827;">${vehicleData.año || 'No especificado'}</td>
        </tr>
      </table>
    </div>
  ` : `
    <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #92400E; font-size: 14px;">
        ⚠️ <strong>Datos del vehículo pendientes:</strong> El cliente aún no proporcionó la información completa.
      </p>
    </div>
  `;

  // Sección de fotos
  const photosSection = photoUrls && photoUrls.length > 0 ? `
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #374151; margin-top: 0; font-size: 16px; font-weight: 600;">📸 FOTOS DEL DAÑO (${photoUrls.length})</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 15px;">
        ${photoUrls.map((url, idx) => `
          <a href="${url}" style="text-decoration: none;">
            <div style="background: #F3F4F6; border: 2px solid #E5E7EB; border-radius: 8px; padding: 10px; text-align: center; transition: all 0.2s;">
              <p style="margin: 0; color: #4B5563; font-size: 13px;">📷 Foto ${idx + 1}</p>
              <p style="margin: 5px 0 0 0; color: #9CA3AF; font-size: 11px;">Ver imagen →</p>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  ` : '<p style="color: #6B7280; font-style: italic;">No se adjuntaron fotos en esta etapa.</p>';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🚨 Alerta: Colisión Grave</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
      
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header The PaintBull con Diana -->
        <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); text-align: center; padding: 40px 20px; position: relative;">
          
          <!-- Logo Diana (círculos concéntricos rojo y blanco) -->
          <div style="margin: 0 auto 20px; width: 120px; height: 120px; position: relative;">
            <div style="position: absolute; width: 120px; height: 120px; border-radius: 50%; background: white;"></div>
            <div style="position: absolute; top: 10px; left: 10px; width: 100px; height: 100px; border-radius: 50%; background: #DC2626;"></div>
            <div style="position: absolute; top: 20px; left: 20px; width: 80px; height: 80px; border-radius: 50%; background: white;"></div>
            <div style="position: absolute; top: 30px; left: 30px; width: 60px; height: 60px; border-radius: 50%; background: #DC2626;"></div>
            <div style="position: absolute; top: 45px; left: 45px; width: 30px; height: 30px; border-radius: 50%; background: white;"></div>
          </div>

          <div style="color: white; font-size: 36px; font-weight: 700; letter-spacing: -1px; margin-bottom: 8px;">
            The PaintBull
          </div>
          <div style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 400; letter-spacing: 1px; margin-bottom: 20px;">
            Expertos en Colisiones Vehiculares
          </div>

          <!-- Banner de alerta -->
          <div style="background: rgba(255,255,255,0.95); color: #7C2D12; padding: 20px 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.2); border: 3px solid #FEF3C7;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #DC2626;">🚨 ALERTA: COLISIÓN GRAVE</h1>
            <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 15px;">Requiere atención especializada</p>
          </div>
        </div>

        <div style="padding: 30px;">
          
          <!-- Saludo al Jefe -->
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #1F2937; font-size: 20px; margin: 0;">Hola Juan 👋</h2>
            <p style="color: #6B7280; font-size: 15px; margin: 8px 0 0 0;">
              Se detectó una colisión de categoría <strong style="color: #DC2626;">GRAVE</strong> que requiere tu evaluación experta.
            </p>
          </div>

          <!-- Datos del cliente -->
          <div style="background: linear-gradient(135deg, rgba(220,38,38,0.1), rgba(185,28,28,0.1)); border-left: 4px solid #DC2626; border-radius: 12px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(220,38,38,0.1);">
            <h3 style="color: #374151; margin-top: 0; font-size: 18px; font-weight: 600;">📞 INFORMACIÓN DEL CLIENTE</h3>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <table style="width: 100%; font-size: 15px;">
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Nombre:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 16px;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">WhatsApp:</td>
                  <td style="padding: 8px 0;">
                    <a href="https://wa.me/${userId}" style="color: #DC2626; text-decoration: none; font-weight: 600; font-family: monospace;">
                      +${userId}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6B7280; font-weight: 500;">Fecha/Hora:</td>
                  <td style="padding: 8px 0; color: #111827;">${formatTimestamp}</td>
                </tr>
              </table>
            </div>

            <div style="background: #DCFCE7; border: 1px solid #16A34A; border-radius: 8px; padding: 15px; margin-top: 15px;">
              <p style="margin: 0; color: #15803D; font-size: 14px;">
                ✅ <strong>El cliente ya tiene tu contacto directo.</strong> Espera su mensaje en WhatsApp.
              </p>
            </div>
          </div>

          ${vehicleSection}

          <!-- Análisis de colisión -->
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #FCA5A5;">
            <h3 style="color: #374151; margin-top: 0; font-size: 16px; font-weight: 600;">📋 ANÁLISIS PRELIMINAR (Vision AI)</h3>
            <div style="background: #FEF2F2; border-radius: 8px; padding: 15px; color: #7C2D12; font-size: 14px; line-height: 1.8;">
              ${analysis}
            </div>
            <div style="margin-top: 15px; padding: 12px; background: #FEF3C7; border-left: 3px solid #F59E0B; border-radius: 4px;">
              <p style="margin: 0; color: #92400E; font-size: 13px;">
                ⚠️ <strong>Nota:</strong> Este análisis es preliminar. Se recomienda inspección física para diagnóstico completo.
              </p>
            </div>
          </div>

          ${photosSection}

          <!-- Call to action -->
          <div style="background: linear-gradient(135deg, #DC2626, #B91C1C); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
            <h3 style="color: white; margin: 0 0 15px 0; font-size: 20px;">🔧 Siguiente Paso</h3>
            <p style="color: rgba(255,255,255,0.95); margin: 0 0 20px 0; font-size: 15px;">
              El cliente está esperando tu respuesta experta.<br>
              Coordina una inspección física para diagnóstico detallado.
            </p>
            <a href="https://wa.me/${userId}" style="display: inline-block; background: white; color: #DC2626; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
              📱 Contactar Cliente
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #E5E7EB; margin-top: 30px;">
            <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
              Este mensaje fue generado automáticamente por:<br>
              <strong style="color: #6B7280;">Axel - Experto en colisiones de The PaintBull</strong>
            </p>
            <p style="color: #D1D5DB; font-size: 12px; margin: 10px 0 0 0;">
              Sistema de análisis inteligente con Vision AI
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 📧 Envía email de alerta al jefe de taller
 */
export async function sendEmailToJefe({ userName, userId, vehicleData, analysis, timestamp, photoUrls = [] }) {
  try {
    console.log('[SEVERE-COLLISION] 📧 Enviando email a Juan...');

    const htmlContent = generateSevereCollisionEmailHTML({
      userName,
      userId,
      vehicleData,
      analysis,
      timestamp,
      photoUrls
    });

    const result = await sendEmail({
      to: JEFE_TALLER.email,
      subject: `🚨 Nueva Colisión Grave - ${userName}`,
      html: htmlContent
    });

    if (result.success) {
      console.log('[SEVERE-COLLISION] ✅ Email enviado exitosamente');
    } else {
      console.error('[SEVERE-COLLISION] ❌ Error enviando email:', result.error);
    }

    return result;

  } catch (error) {
    console.error('[SEVERE-COLLISION] ❌ Error en sendEmailToJefe:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🚨 Función principal: Procesa una colisión grave completa
 * Ejecuta todos los pasos: enlace al cliente, WhatsApp a Juan, Email a Juan
 */
export async function handleSevereCollision({ 
  userName, 
  userId, 
  vehicleData = null, 
  analysis, 
  photoUrls = [] 
}) {
  const timestamp = new Date().toISOString();
  
  console.log('[SEVERE-COLLISION] 🚨 Iniciando proceso de colisión grave');
  console.log(`[SEVERE-COLLISION] Cliente: ${userName} (${userId})`);

  try {
    // 1. Generar enlace de contacto
    const contactLink = generateJuanContactLink(userName);
    console.log('[SEVERE-COLLISION] 🔗 Enlace generado:', contactLink);

    // 2. Enviar WhatsApp a Juan (con fotos)
    const whatsappResult = await sendWhatsAppToJefe({
      userName,
      userId,
      vehicleData,
      analysis,
      timestamp,
      photoUrls
    });

    // 3. Enviar Email a Juan
    const emailResult = await sendEmailToJefe({
      userName,
      userId,
      vehicleData,
      analysis,
      timestamp,
      photoUrls
    });

    const success = whatsappResult.success && emailResult.success;
    
    console.log(`[SEVERE-COLLISION] ${success ? '✅' : '⚠️'} Proceso completado`);

    return {
      success,
      contactLink,
      whatsappSent: whatsappResult.success,
      emailSent: emailResult.success,
      errors: {
        whatsapp: whatsappResult.error,
        email: emailResult.error
      }
    };

  } catch (error) {
    console.error('[SEVERE-COLLISION] ❌ Error en handleSevereCollision:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
