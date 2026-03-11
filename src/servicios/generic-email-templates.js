/**
 * 📧 Templates de Email para Agentes Especializados
 * Cada empresa tiene su propio diseño HTML con branding
 * ✨ Con soporte para Dark Mode
 */

import { LOGOS_BASE64, DARK_MODE_CSS } from './email-assets.js';
import { ecosistemaTable } from './email-ecosystem.js';
import { calcularLeadScore, generarReporteLeadScore } from './paula-lead-scoring.js';

/**
 * 🛡️ ADRIANA - SegPopular (Seguros)
 * Colores: Azul profesional (#1E40AF, #3B82F6)
 */
export function generateAdrianaEmailHTML(leadData) {
  const {
    userName,
    insuranceType,
    cedula,
    email,
    phone,
    vehicleBrand,
    vehicleModel,
    vehicleYear,
    commercialValue,
    quotedPremium,
    leadId
  } = leadData;

  const monthlyPremium = quotedPremium ? Math.round(quotedPremium / 10) : null;
  const waLink = `https://wa.me/593994837117?text=%40adriana%2C+quiero+activar+mi+seguro`;

  const premiumSection = quotedPremium ? `
    <div style="background:linear-gradient(145deg,#1E3A8A 0%,#1D4ED8 100%);border-radius:18px;padding:32px;text-align:center;margin:25px 0;">
      <div style="color:#FFD700;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px;">Tu prima anual confirmada</div>
      <div style="color:white;font-size:46px;font-weight:900;line-height:1;margin-bottom:6px;">$${quotedPremium.toLocaleString()}</div>
      <div style="color:rgba(255,255,255,0.65);font-size:14px;margin-bottom:20px;">USD incluye IVA · Seguro ${insuranceType || 'Vehículo Liviano'}</div>
      <div style="background:rgba(255,215,0,0.12);border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:14px;display:inline-block;margin-bottom:22px;">
        <div style="color:#FFD700;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">O en cómodas cuotas</div>
        <div style="color:white;font-size:22px;font-weight:800;">$${monthlyPremium}/mes <span style="font-size:14px;font-weight:400;opacity:0.7;">× 10</span></div>
      </div>
      <a href="${waLink}" style="display:block;background:linear-gradient(135deg,#FFD700,#FFC200);color:#1E3A8A;padding:16px 36px;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;box-shadow:0 6px 22px rgba(255,215,0,0.45);">
        🛡️ Confirmar y activar seguro →
      </a>
    </div>
  ` : '';

  const specificDetails = vehicleBrand ? `
    <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(30,58,138,0.3);">
      <div style="display: flex; align-items: center;">
        <span style="color: #1E3A8A; font-size: 20px; margin-right: 12px;">🚗</span>
        <span style="color: #374151; font-weight: 600; font-size: 16px;">Vehículo: ${vehicleBrand} ${vehicleModel || ''}${vehicleYear ? ` ${vehicleYear}` : ''}</span>
      </div>
      ${commercialValue ? `<div style="margin-top:8px;color:#6B7280;font-size:13px;padding-left:32px;">Valor comercial declarado: <strong style="color:#1E3A8A;">$${Number(commercialValue).toLocaleString()} USD</strong></div>` : ''}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Solicitud de Seguro - SegPopular</title>
      ${DARK_MODE_CSS}
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
      
      <div class="email-container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header SegPopular - Fondo Amarillo Característico -->
        <div class="brand-yellow" style="background: #FFD700; text-align: center; padding: 40px 20px;">
          <!-- Logo SegPopular PNG embebido base64 -->
          <div style="margin-bottom: 25px;">
            <img src="data:image/png;base64,${LOGOS_BASE64.segpopular}" 
                 alt="SegPopular" 
                 style="max-width: 280px; height: auto; display: block; margin: 0 auto;" />
          </div>
          <div class="card-white shadow" style="background: white; color: #374151; padding: 20px 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.2); border: 3px solid #1E3A8A;">
            <h1 class="brand-blue" style="margin: 0; font-size: 22px; font-weight: 600; color: #1E3A8A;">✅ Solicitud Recibida</h1>
            <p class="text-gray" style="margin: 8px 0 0 0; color: #374151; font-size: 15px;">Adriana te contactará pronto</p>
          </div>
        </div>

        <div class="content-section" style="padding: 30px;">
          
          <!-- Saludo personalizado -->
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 class="text-dark" style="color: #1f2937; font-size: 20px; margin: 0;">¡Hola, ${userName}! 👋</h2>
            <p class="text-gray" style="color: #6B7280; font-size: 15px; margin: 10px 0 0 0;">
              Recibimos tu solicitud de seguro de <strong class="brand-blue" style="color: #1E3A8A;">${insuranceType}</strong>
            </p>
          </div>

          <!-- Detalles de la solicitud -->
          <div style="background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.3)); border-left: 4px solid #1E3A8A; border-radius: 12px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(30,58,138,0.2);">
            <h3 class="brand-blue" style="color: #1E3A8A; margin-top: 0; font-size: 18px; font-weight: 600;">📋 TUS DATOS</h3>
            
            <div style="margin: 20px 0;">
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(30,58,138,0.3);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #1E3A8A; font-size: 20px; margin-right: 12px;">🛡️</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Tipo: ${insuranceType}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(30,58,138,0.3);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #1E3A8A; font-size: 20px; margin-right: 12px;">🆔</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Cédula: ${cedula}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(30,58,138,0.3);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #1E3A8A; font-size: 20px; margin-right: 12px;">📧</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${email}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(30,58,138,0.3);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #1E3A8A; font-size: 20px; margin-right: 12px;">📱</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${phone}</span>
                </div>
              </div>

              ${specificDetails}
            </div>
          </div>

          ${premiumSection}

          <!-- Próximos pasos -->
          <div style="background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1)); border: 2px solid #10B981; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px; font-weight: 600;">✨ Próximos Pasos:</h3>
            <div style="color: #374151; font-size: 15px; line-height: 1.8;">
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">1.</strong> Adriana agendará tu inspección vehicular
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">2.</strong> Te contactará para coordinar fecha y lugar
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">3.</strong> Tu póliza se activa tras la inspección
              </p>
            </div>
          </div>

          <!-- Referencia -->
          <!-- Información adicional sobre servicios -->
          <div style="background: white; border: 2px solid #1E3A8A; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #1E3A8A; font-size: 18px; margin-bottom: 15px; font-weight: 600;">🛡️ Seguros que cotizamos:</h3>
            <div style="color: #374151; font-size: 15px; line-height: 1.8;">
              <p style="margin: 8px 0;">✓ Seguro para Vehículos livianos</p>
              <p style="margin: 8px 0;">✓ Seguro vida individual</p>
              <p style="margin: 8px 0;">✓ Ramos generales</p>
              <p style="margin: 8px 0;">✓ Asistencia médica popular - MedBeneficios</p>
            </div>
          </div>

          <!-- Ubicación y contacto -->
          <div style="background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.3)); border-radius: 12px; padding: 25px; margin: 25px 0; border: 2px solid #1E3A8A;">
            <h3 style="color: #1E3A8A; margin-top: 0; font-size: 18px; font-weight: 600;">📍 NUESTRA OFICINA</h3>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 15px 0;">
              <p style="margin: 5px 0; color: #1E3A8A; font-weight: 700; font-size: 18px;">SegPopular</p>
              <p style="margin: 5px 0; color: #374151; font-weight: 500;">Edificio Finistere - Planta Baja</p>
              <p style="margin: 5px 0; color: #374151;">Whymper 403, Quito</p>
              <p style="margin: 10px 0 5px 0; color: #1E3A8A; font-weight: 600;">🌐 www.segpopular.com</p>
            </div>
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://goo.gl/maps/9GD83LV3XRf23XK59" 
                 style="background: #1E3A8A; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(30,58,138,0.4);">
                📍 Ver en Google Maps
              </a>
            </div>
          </div>

          <!-- Referencia -->
          <div style="background: rgba(255,215,0,0.3); border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #1E3A8A;">
            <p style="color: #1E3A8A; font-size: 13px; margin: 0; font-weight: 600;">
              <strong>Referencia:</strong> ${leadId}
            </p>
          </div>

          <!-- Contacto -->
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #374151; font-size: 14px; margin: 5px 0 15px 0; font-weight: 600;">
              💬 Protege lo que más te importa hoy mismo
            </p>
            <a href="https://wa.me/593994837117?text=%40adriana%2C%20es%20exactamente%20lo%20que%20buscaba%20%C2%BFActivamos%20mi%20seguro%20ahora%3F" 
               style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(37,211,102,0.3); font-size: 14px;">
              � Activar Mi Seguro Ahora
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin: 35px 0 0 0; padding: 25px; background: #FFD700; border-radius: 12px; border: 3px solid #1E3A8A;">
            <p style="color: #1E3A8A; font-size: 18px; font-weight: 700; margin: 0;">¡Gracias por confiar en nosotros! 🛡️</p>
            <p style="color: #1E3A8A; font-size: 14px; margin: 8px 0; font-weight: 600;">Adriana - SegPopular</p>
            <p style="color: #1E3A8A; font-size: 13px; margin: 5px 0;">Asesores de Seguros Populares</p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 🔨 AXEL - PaintBull (Centro de Colisiones)
 * Colores: Naranja/Rojo (#DC2626, #F97316)
 */
export function generateAxelEmailHTML(leadData) {
  const {
    quoteCode,
    fullName,
    vehicleBrand,
    vehicleModel,
    vehicleYear,
    damageType,
    damageAnalysis,
    quoteDetails,
    priceMin,
    priceMax,
    photoCount,
    email,
    phone
  } = leadData;

  // Determinar color de severidad
  const severity = damageAnalysis?.severity || 'MODERADO';
  const severityColors = {
    'LEVE': { bg: '#10B981', text: 'DAÑO LEVE', icon: '🟢' },
    'MODERADO': { bg: '#F59E0B', text: 'DAÑO MODERADO', icon: '🟡' },
    'SEVERO': { bg: '#DC2626', text: 'DAÑO SEVERO', icon: '🔴' }
  };
  const severityConfig = severityColors[severity] || severityColors['MODERADO'];

  // Lista de trabajos requeridos
  const damageDetails = damageAnalysis?.details || quoteDetails || 'Reparación de daños identificados en fotos';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cotización PaintBull - ${quoteCode}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6; margin: 0; padding: 20px;">
      
      <div style="max-width: 650px; margin: 0 auto; background: #DC2626; border-radius: 0; overflow: hidden;">
        
        <!-- HEADER ROJO -->
        <div style="background: #DC2626; text-align: center; padding: 50px 30px;">
          <!-- Diana/Target Logo -->
          <div style="width: 120px; height: 120px; margin: 0 auto 20px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative;">
            <div style="width: 100px; height: 100px; border-radius: 50%; background: #DC2626; position: relative;">
              <div style="width: 70px; height: 70px; border-radius: 50%; background: white; position: absolute; top: 15px; left: 15px;"></div>
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #DC2626; position: absolute; top: 30px; left: 30px;"></div>
              <div style="width: 20px; height: 20px; border-radius: 50%; background: white; position: absolute; top: 40px; left: 40px;"></div>
            </div>
          </div>
          
          <h1 style="color: white; font-size: 48px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -1px;">The PaintBull</h1>
          <p style="color: rgba(255,255,255,0.95); font-size: 18px; margin: 0 0 30px 0; font-weight: 400;">Expertos en Enderezada y Pintura Vehicular</p>
          
          <!-- Cotización Personalizada Box -->
          <div style="background: rgba(255,255,255,0.98); border-radius: 12px; padding: 25px 30px; max-width: 450px; margin: 0 auto;">
            <div style="font-size: 32px; margin-bottom: 8px;">💰</div>
            <h2 style="color: #DC2626; font-size: 28px; margin: 0 0 12px 0; font-weight: 700;">Cotización Personalizada</h2>
            <p style="color: #6B7280; font-size: 15px; margin: 0 0 8px 0;">${new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p style="color: #374151; font-size: 17px; margin: 8px 0; font-weight: 600;">Cliente: ${fullName}</p>
            <p style="color: #DC2626; font-size: 19px; margin: 8px 0 0 0; font-weight: 700;">Código: ${quoteCode}</p>
          </div>
        </div>

        <!-- CONTENIDO PRINCIPAL -->
        <div style="background: #FEF2F2; padding: 30px;">
          
          <!-- VEHÍCULO -->
          <div style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; border-left: 4px solid #DC2626;">
            <h3 style="color: #1F2937; font-size: 20px; margin: 0 0 15px 0; font-weight: 700; display: flex; align-items: center;">
              <span style="font-size: 24px; margin-right: 10px;">🚗</span> VEHÍCULO
            </h3>
            <div style="background: #F9FAFB; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
              <p style="margin: 0; color: #4B5563; font-size: 14px;">Marca:</p>
              <p style="margin: 5px 0 0 0; color: #111827; font-size: 18px; font-weight: 700;">${vehicleBrand}</p>
            </div>
            <div style="background: #F9FAFB; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
              <p style="margin: 0; color: #4B5563; font-size: 14px;">Modelo:</p>
              <p style="margin: 5px 0 0 0; color: #111827; font-size: 18px; font-weight: 700;">${vehicleModel}</p>
            </div>
            <div style="background: #F9FAFB; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
              <p style="margin: 0; color: #4B5563; font-size: 14px;">Año:</p>
              <p style="margin: 5px 0 0 0; color: #111827; font-size: 18px; font-weight: 700;">${vehicleYear}</p>
            </div>
            <div style="background: ${severityConfig.bg}; border-radius: 8px; padding: 15px; text-align: center;">
              <p style="margin: 0; color: white; font-size: 14px; font-weight: 600;">${severityConfig.icon} ${severityConfig.text}</p>
            </div>
          </div>

          <!-- COTIZACIÓN DETALLADA -->
          <div style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; border: 2px solid #FCA5A5;">
            <h3 style="color: #DC2626; font-size: 20px; margin: 0 0 15px 0; font-weight: 700; display: flex; align-items: center;">
              <span style="font-size: 24px; margin-right: 10px;">📋</span> COTIZACIÓN DETALLADA
            </h3>
            
            <p style="color: #374151; font-size: 15px; margin-bottom: 15px; line-height: 1.6;">Basado en las fotos analizadas, el trabajo incluiría:</p>
            
            <div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
              <p style="margin: 0 0 10px 0; color: #374151; font-size: 15px; font-weight: 700;">🔧 TRABAJOS REQUERIDOS:</p>
              <p style="margin: 0; color: #4B5563; font-size: 14px; line-height: 1.8;">${damageDetails}</p>
            </div>

            ${damageAnalysis?.estimatedDays ? `
            <div style="background: #F9FAFB; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
              <p style="margin: 0; color: #374151; font-size: 15px; font-weight: 700; display: flex; align-items: center;">
                <span style="font-size: 18px; margin-right: 8px;">⏱️</span> TIEMPO ESTIMADO:
              </p>
              <p style="margin: 5px 0 0 0; color: #4B5563; font-size: 14px;">${damageAnalysis.estimatedDays}</p>
            </div>
            ` : ''}

            ${damageAnalysis?.parts ? `
            <div style="background: #F9FAFB; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
              <p style="margin: 0 0 8px 0; color: #374151; font-size: 15px; font-weight: 700;">📦 PROCESO:</p>
              <p style="margin: 0; color: #4B5563; font-size: 13px; line-height: 1.7;">
                1. Desmontaje de piezas afectadas<br>
                2. Enderezado y preparación de superficie<br>
                3. Masillado y lijado<br>
                4. Aplicación de pintura (color original)<br>
                5. Barniz y pulido final
              </p>
            </div>
            ` : ''}

            <div style="background: #F9FAFB; border-radius: 8px; padding: 15px;">
              <p style="margin: 0; color: #374151; font-size: 15px; font-weight: 700; display: flex; align-items: center;">
                <span style="font-size: 18px; margin-right: 8px;">✨</span> GARANTÍA:
              </p>
              <p style="margin: 5px 0 0 0; color: #4B5563; font-size: 14px;">• 6 meses en trabajos de enderezada<br>• 1 año en pintura aplicada</p>
            </div>
          </div>

          <!-- INVERSIÓN ESTIMADA -->
          <div style="background: #DC2626; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 20px;">
            <p style="color: white; font-size: 16px; margin: 0 0 10px 0; font-weight: 600; letter-spacing: 1px;">INVERSIÓN ESTIMADA</p>
            <p style="color: white; font-size: 42px; margin: 0; font-weight: 700; letter-spacing: -1px;">$${priceMin} - $${priceMax} USD</p>
          </div>

          <!-- FOTOS DEL VEHÍCULO -->
          ${photoCount ? `
          <div style="background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
            <h3 style="color: #1F2937; font-size: 20px; margin: 0 0 15px 0; font-weight: 700; display: flex; align-items: center;">
              <span style="font-size: 24px; margin-right: 10px;">📸</span> FOTOS DEL VEHÍCULO
            </h3>
            <p style="color: #6B7280; font-size: 14px; margin: 0;">Se analizaron ${photoCount} foto(s) del daño para esta cotización preliminar.</p>
          </div>
          ` : ''}

          <!-- IMPORTANTE (Amarillo) -->
          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0; color: #92400E; font-size: 16px; font-weight: 700; display: flex; align-items: center;">
              <span style="font-size: 20px; margin-right: 8px;">⚠️</span> IMPORTANTE
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #78350F; font-size: 14px; line-height: 1.8;">
              <li>Esta cotización es <strong>preliminar</strong> basada en análisis fotográfico con IA</li>
              <li>La <strong>inspección física</strong> puede revelar daños adicionales no visibles en fotos</li>
              <li>Los precios están sujetos a cambios según disponibilidad de repuestos</li>
              <li>El tiempo estimado puede variar según carga de trabajo del taller</li>
            </ul>
          </div>

          <!-- SIGUIENTE PASO (CTA Rojo) -->
          <div style="background: #DC2626; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 20px;">
            <p style="color: white; font-size: 22px; margin: 0 0 12px 0; font-weight: 700; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 28px; margin-right: 10px;">🔧</span> TU AUTO COMO NUEVO OTRA VEZ
            </p>
            <p style="color: rgba(255,255,255,0.95); font-size: 15px; margin: 0 0 20px 0;">La solución está lista<br>Solo falta que reserves tu fecha:</p>
            
            <a href="https://wa.me/593994837117?text=%40axel%2C%20perfecto!%20Mi%20auto%20necesita%20esto%20%C2%BFCu%C3%A1ndo%20agendamos%3F" 
               style="display: inline-block; background: rgba(220,38,38,0.2); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 700; margin-bottom: 15px; font-size: 16px; border: 2px solid rgba(255,255,255,0.4);">
              📱 WhatsApp: +593 99 483 7117
            </a>
            
            <div style="background: rgba(255,255,255,0.95); border-radius: 8px; padding: 15px; max-width: 400px; margin: 15px auto 0 auto;">
              <p style="margin: 0; color: #DC2626; font-size: 15px; font-weight: 600;">💬 Agenda tu reparación ahora</p>
            </div>
          </div>

          <!-- POR QUÉ THE PAINTBULL -->
          <div style="background: white; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 20px;">
            <p style="color: #1F2937; font-size: 18px; margin: 0 0 20px 0; font-weight: 700;">✨ Por qué The PaintBull</p>
            <div style="display: flex; justify-content: space-around; text-align: center;">
              <div style="flex: 1; padding: 10px;">
                <div style="font-size: 32px; margin-bottom: 8px;">🏆</div>
                <p style="margin: 0; color: #374151; font-size: 13px; font-weight: 600;">15 años<br>de experiencia</p>
              </div>
              <div style="flex: 1; padding: 10px;">
                <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                <p style="margin: 0; color: #374151; font-size: 13px; font-weight: 600;">Garantía<br>certificada</p>
              </div>
              <div style="flex: 1; padding: 10px;">
                <div style="font-size: 32px; margin-bottom: 8px;">⚡</div>
                <p style="margin: 0; color: #374151; font-size: 13px; font-weight: 600;">Trabajo<br>profesional</p>
              </div>
            </div>
          </div>

          <!-- VISÍTANOS -->
          <div style="background: white; border: 2px solid #DC2626; border-radius: 12px; padding: 25px; text-align: center;">
            <p style="color: #DC2626; font-size: 20px; margin: 0 0 12px 0; font-weight: 700; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px; margin-right: 8px;">📍</span> VISÍTANOS
            </p>
            <p style="color: #1F2937; font-size: 16px; margin: 0 0 8px 0; font-weight: 700;">The PaintBull - Taller de Colisiones</p>
            <p style="color: #6B7280; font-size: 14px; margin: 0 0 15px 0;">Calle N44-53 y, Quito 170124<br>Ecuador</p>
            
            <a href="https://maps.google.com/?q=The+PaintBull+Quito" 
               style="display: inline-block; background: #DC2626; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 15px;">
              🗺️ Cómo llegar →
            </a>
            
            <p style="color: #6B7280; font-size: 13px; margin: 15px 0 0 0; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 16px; margin-right: 6px;">🕒</span> <strong>Horarios:</strong> Lun-Vie 8:00-18:00 | Sáb 9:00-14:00
            </p>
          </div>

          <!-- FOOTER -->
          <div style="text-align: center; padding: 20px 0; margin-top: 20px; border-top: 2px solid rgba(220,38,38,0.2);">
            <p style="color: #6B7280; font-size: 13px; margin: 0 0 5px 0;">Esta cotización fue generada por:</p>
            <p style="color: #DC2626; font-size: 15px; margin: 0; font-weight: 700;">Axel - Experto en colisiones de The PaintBull</p>
            <p style="color: #9CA3AF; font-size: 12px; margin: 8px 0 0 0;">Sistema de análisis inteligente con Vision AI | ${new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 🎯 ENZO - MarketingLab
 * Paleta: Teal (#2DD4BF, #0D9488) + Fondo navy (#0A0F1E) — logo mantiene su color único
 */
export function generateEnzoEmailHTML(leadData) {
  const {
    userName,
    projectType,
    companyName,
    email,
    phone,
    budget,
    urgency,
    description,
    leadId
  } = leadData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cotización MarketingLab — ${leadId}</title>
      <meta name="color-scheme" content="light only">
      <meta name="supported-color-schemes" content="light">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #0D9488; margin: 0; padding: 0;">

      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 0; overflow: hidden;">

        <!-- ═══ HEADER DARK NAVY ═══ -->
        <div style="background: #0A0F1E; text-align: center; padding: 44px 20px 38px;">
          <div style="margin-bottom: 10px;">
            <img src="data:image/png;base64,${LOGOS_BASE64.marketinglab}"
                 alt="MarketingLab"
                 style="max-width: 320px; height: auto; display: block; margin: 0 auto;" />
          </div>
          <div style="color: rgba(255,255,255,0.45); font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 28px;">ESTRATEGIAS QUE FUNCIONAN</div>
          <!-- Tarjeta oscura métricas style -->
          <div style="background: #0D1520; border: 1px solid rgba(45,212,191,0.3); border-radius: 14px; padding: 24px; max-width: 340px; margin: 0 auto;">
            <div style="color: #2DD4BF; font-size: 9px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; text-align: center; margin-bottom: 16px;">· PROYECTO PARA ·</div>
            <div style="color: white; font-size: 22px; font-weight: 800; text-align: center; line-height: 1.2; margin-bottom: 16px;">${userName}</div>
            <div style="border-top: 1px solid rgba(45,212,191,0.2); margin-bottom: 16px;"></div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; padding: 0 4px 0 0;">
                  <div style="background: rgba(45,212,191,0.06); border: 1px solid rgba(45,212,191,0.2); border-radius: 10px; padding: 12px; text-align: center;">
                    <div style="color: #2DD4BF; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">PROYECTO</div>
                    <div style="color: white; font-size: 13px; font-weight: 700; line-height: 1.3;">${projectType}</div>
                  </div>
                </td>
                <td style="width: 50%; padding: 0 0 0 4px;">
                  <div style="background: rgba(45,212,191,0.06); border: 1px solid rgba(45,212,191,0.2); border-radius: 10px; padding: 12px; text-align: center;">
                    <div style="color: #2DD4BF; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">REFERENCIA</div>
                    <div style="color: white; font-size: 13px; font-weight: 700; line-height: 1.3;">${leadId}</div>
                  </div>
                </td>
              </tr>
            </table>
            ${companyName ? `<div style="text-align: center; margin-top: 12px; color: rgba(255,255,255,0.5); font-size: 12px;">${companyName}</div>` : ''}
            <div style="text-align: center; border-top: 1px solid rgba(45,212,191,0.2); margin-top: 16px; padding-top: 12px;">
              <span style="color: #2DD4BF; font-size: 12px; font-weight: 600;">Enzo · MarketingLab</span>
            </div>
          </div>
        </div>

        <!-- ═══ CUERPO ═══ -->
        <div style="padding: 32px 28px;">

          <!-- Intro -->
          <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
            Recibimos tu proyecto de <strong style="color: #2DD4BF;">${projectType}</strong>${companyName ? ` para <strong style="color: #374151;">${companyName}</strong>` : ''}.<br>
            <span style="color: #6B7280;">Aquí está nuestra propuesta personalizada.</span>
          </p>

          <!-- Resumen del proyecto -->
          <div style="background: #F8FFFE; border-left: 4px solid #2DD4BF; border-radius: 0 12px 12px 0; padding: 20px 24px; margin: 0 0 24px;">
            <div style="font-size: 11px; font-weight: 700; color: #2DD4BF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px;">📋 Resumen del proyecto</div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #6B7280; font-size: 13px; width: 40%;">Tipo</td><td style="padding: 6px 0; color: #1F2937; font-size: 13px; font-weight: 600;">${projectType}</td></tr>
              ${companyName ? `<tr><td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Empresa</td><td style="padding: 6px 0; color: #1F2937; font-size: 13px; font-weight: 600;">${companyName}</td></tr>` : ''}
              ${budget ? `<tr><td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Presupuesto</td><td style="padding: 6px 0; color: #1F2937; font-size: 13px; font-weight: 600;">${budget}</td></tr>` : ''}
              ${urgency ? `<tr><td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Urgencia</td><td style="padding: 6px 0; color: #1F2937; font-size: 13px; font-weight: 600;">${urgency}</td></tr>` : ''}
              <tr><td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Referencia</td><td style="padding: 6px 0; color: #2DD4BF; font-size: 13px; font-weight: 700;">${leadId}</td></tr>
            </table>
          </div>

          <!-- Servicios -->
          <div style="margin: 0 0 24px;">
            <div style="font-size: 11px; font-weight: 700; color: #2DD4BF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">⚡ Lo que activamos en tu proyecto</div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; padding: 0 8px 8px 0; vertical-align: top;">
                  <div style="background: #F0FDFC; border: 1px solid rgba(45,212,191,0.2); border-radius: 10px; padding: 14px;">
                    <div style="font-size: 22px; margin-bottom: 6px;">🤖</div>
                    <div style="font-size: 13px; font-weight: 700; color: #0D9488; margin-bottom: 4px;">IA con OpenAI</div>
                    <div style="color: #6B7280; font-size: 12px; line-height: 1.4;">Chatbots, automatizaciones y contenido generado con IA</div>
                  </div>
                </td>
                <td style="width: 50%; padding: 0 0 8px 0; vertical-align: top;">
                  <div style="background: #F0FDFC; border: 1px solid rgba(45,212,191,0.2); border-radius: 10px; padding: 14px;">
                    <div style="font-size: 22px; margin-bottom: 6px;">🎯</div>
                    <div style="font-size: 13px; font-weight: 700; color: #0D9488; margin-bottom: 4px;">Campañas Meta &amp; Google</div>
                    <div style="color: #6B7280; font-size: 12px; line-height: 1.4;">Ads optimizados para máximo ROAS y conversiones</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="width: 50%; padding: 0 8px 0 0; vertical-align: top;">
                  <div style="background: #F0FDFC; border: 1px solid rgba(45,212,191,0.2); border-radius: 10px; padding: 14px;">
                    <div style="font-size: 22px; margin-bottom: 6px;">📱</div>
                    <div style="font-size: 13px; font-weight: 700; color: #0D9488; margin-bottom: 4px;">Contenido &amp; Social</div>
                    <div style="color: #6B7280; font-size: 12px; line-height: 1.4;">Producción de contenido para IG, FB y TikTok</div>
                  </div>
                </td>
                <td style="width: 50%; padding: 0; vertical-align: top;">
                  <div style="background: #F0FDFC; border: 1px solid rgba(45,212,191,0.2); border-radius: 10px; padding: 14px;">
                    <div style="font-size: 22px; margin-bottom: 6px;">📊</div>
                    <div style="font-size: 13px; font-weight: 700; color: #0D9488; margin-bottom: 4px;">Analytics &amp; Reportes</div>
                    <div style="color: #6B7280; font-size: 12px; line-height: 1.4;">Dashboard semanal con KPIs y proyecciones</div>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Tabla de precios -->
          <div style="margin: 0 0 24px;">
            <div style="font-size: 11px; font-weight: 700; color: #2DD4BF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">💰 Inversión mensual detallada</div>
            <table style="width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden;">
              <tr style="background: #0A0F1E;">
                <td style="padding: 10px 14px; color: #2DD4BF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Servicio</td>
                <td style="padding: 10px 14px; color: #2DD4BF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: right;">Precio / mes</td>
              </tr>
              <tr style="background: #F9FAFB;"><td style="padding: 11px 14px; color: #374151; font-size: 13px; border-bottom: 1px solid #ECFDF5;">🎯 Gestión Meta Ads + Google Ads</td><td style="padding: 11px 14px; color: #1F2937; font-size: 13px; font-weight: 600; text-align: right; border-bottom: 1px solid #ECFDF5;">$900</td></tr>
              <tr style="background: white;"><td style="padding: 11px 14px; color: #374151; font-size: 13px; border-bottom: 1px solid #ECFDF5;">📱 Producción de contenido (IG / FB / TikTok)</td><td style="padding: 11px 14px; color: #1F2937; font-size: 13px; font-weight: 600; text-align: right; border-bottom: 1px solid #ECFDF5;">$600</td></tr>
              <tr style="background: #F9FAFB;"><td style="padding: 11px 14px; color: #374151; font-size: 13px; border-bottom: 1px solid #ECFDF5;">🤖 IA + Automatizaciones con OpenAI</td><td style="padding: 11px 14px; color: #1F2937; font-size: 13px; font-weight: 600; text-align: right; border-bottom: 1px solid #ECFDF5;">$350</td></tr>
              <tr style="background: white;"><td style="padding: 11px 14px; color: #374151; font-size: 13px; border-bottom: 1px solid #E5E7EB;">📊 Dashboard + Reportes semanales</td><td style="padding: 11px 14px; color: #1F2937; font-size: 13px; font-weight: 600; text-align: right; border-bottom: 1px solid #E5E7EB;">$150</td></tr>
              <tr style="background: #F9FAFB;"><td style="padding: 11px 14px; color: #6B7280; font-size: 13px; border-bottom: 1px solid #E5E7EB;">Total sin descuento</td><td style="padding: 11px 14px; color: #9CA3AF; font-size: 13px; text-align: right; text-decoration: line-through; border-bottom: 1px solid #E5E7EB;">$2,000</td></tr>
              <tr style="background: #FFF7ED;"><td style="padding: 11px 14px; color: #D97706; font-size: 13px; font-weight: 600; border-bottom: 1px solid #FDE68A;">🎉 Descuento lanzamiento (primeros 3 meses)</td><td style="padding: 11px 14px; color: #D97706; font-size: 13px; font-weight: 700; text-align: right; border-bottom: 1px solid #FDE68A;">- $500</td></tr>
              <tr style="background: #0A0F1E;">
                <td style="padding: 14px; color: white; font-size: 15px; font-weight: 800;">Total mes 1</td>
                <td style="padding: 14px; color: #2DD4BF; font-size: 20px; font-weight: 900; text-align: right;">$1,500 / mes</td>
              </tr>
            </table>
            <p style="color: #9CA3AF; font-size: 11px; margin: 8px 0 0; text-align: center;">Precio promocional aplicado automáticamente · Desde el mes 4 retorna a $2,000/mes</p>
          </div>

          <!-- CTA consultoría -->
          <div style="background: linear-gradient(135deg, #1F2937 0%, #0A0F1E 100%); border-radius: 14px; padding: 28px 24px; margin: 0 0 24px; text-align: center;">
            <div style="color: #2DD4BF; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">🎁 INCLUIDO SIN COSTO</div>
            <div style="color: white; font-size: 20px; font-weight: 800; margin-bottom: 6px;">Consultoría estratégica inicial</div>
            <div style="color: rgba(255,255,255,0.65); font-size: 13px; line-height: 1.7; margin-bottom: 22px;">30 minutos con Enzo para analizar tu proyecto, definir objetivos y presentarte un plan de acción con IA.</div>
            <a href="https://wa.me/593994837117?text=%40enzo%2C%20mejoremos%20el%20precio%20de%20tu%20oferta%20y%20cerremos%20este%20negocio%20en%20una%20reuni%C3%B3n%20en%20tu%20oficina"
               style="display: inline-block; background: linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%); color: #042f2e; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 15px; box-shadow: 0 6px 20px rgba(45,212,191,0.40); letter-spacing: 0.3px;">
              🤝 ¿Negociamos el precio?
            </a>
            <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin: 12px 0 0; letter-spacing: 0.3px;">Abre WhatsApp directo con Enzo · Responde en minutos</p>
          </div>

          <!-- Cronograma de implementación -->
          <div style="margin: 0 0 24px;">
            <div style="font-size: 11px; font-weight: 700; color: #2DD4BF; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">📅 Cronograma de implementación</div>
            <p style="color: #6B7280; font-size: 13px; margin: 0 0 16px; line-height: 1.6;">Así se verá <strong style="color: #374151;">${companyName || userName}</strong> en 30 días activa en redes, con campañas corriendo y datos reales:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 25%; padding: 0 4px 0 0; vertical-align: top; height: 175px;">
                  <div style="background: #0A0F1E; border-radius: 10px; padding: 14px 12px; text-align: center; min-height: 175px; height: 100%; box-sizing: border-box;">
                    <div style="color: #2DD4BF; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">Semana 1</div>
                    <div style="font-size: 22px; margin-bottom: 6px;">🚀</div>
                    <div style="color: white; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Setup</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 10px; line-height: 1.5;">Auditoría, pixel tracking, cuentas publicitarias configuradas</div>
                  </div>
                </td>
                <td style="width: 25%; padding: 0 4px; vertical-align: top; height: 175px;">
                  <div style="background: #0D1520; border: 1px solid rgba(45,212,191,0.2); border-radius: 10px; padding: 14px 12px; text-align: center; min-height: 175px; height: 100%; box-sizing: border-box;">
                    <div style="color: #2DD4BF; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">Semana 2</div>
                    <div style="font-size: 22px; margin-bottom: 6px;">📢</div>
                    <div style="color: white; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Lanzamiento</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 10px; line-height: 1.5;">Primeras campañas live, calendario editorial publicado</div>
                  </div>
                </td>
                <td style="width: 25%; padding: 0 4px; vertical-align: top; height: 175px;">
                  <div style="background: #0D1520; border: 1px solid rgba(45,212,191,0.2); border-radius: 10px; padding: 14px 12px; text-align: center; min-height: 175px; height: 100%; box-sizing: border-box;">
                    <div style="color: #2DD4BF; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">Semana 3</div>
                    <div style="font-size: 22px; margin-bottom: 6px;">📈</div>
                    <div style="color: white; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Optimización</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 10px; line-height: 1.5;">A/B testing, audiencias refinadas, primeros leads entrando</div>
                  </div>
                </td>
                <td style="width: 25%; padding: 0 0 0 4px; vertical-align: top; height: 175px;">
                  <div style="background: linear-gradient(135deg, #042f2e 0%, #0A0F1E 100%); border: 1px solid rgba(45,212,191,0.4); border-radius: 10px; padding: 14px 12px; text-align: center; min-height: 175px; height: 100%; box-sizing: border-box;">
                    <div style="color: #2DD4BF; font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">Semana 4</div>
                    <div style="font-size: 22px; margin-bottom: 6px;">🏆</div>
                    <div style="color: white; font-size: 12px; font-weight: 700; margin-bottom: 4px;">Resultados</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 10px; line-height: 1.5;">Reporte de KPIs: CAC, ROAS, engagement y proyección mes 2</div>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- CTA WhatsApp -->
          <div style="text-align: center; margin: 0 0 8px;">
            <p style="color: #6B7280; font-size: 14px; margin: 0 0 14px; font-weight: 500;">💬 ¿Tienes preguntas sobre tu proyecto?</p>
            <a href="https://wa.me/593994837117?text=%40enzo%20recib%C3%AD%20tu%20cotizaci%C3%B3n%20por%20correo%20(${encodeURIComponent(leadId)})%20y%20tengo%20algunas%20dudas"
               style="background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); color: white; padding: 13px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; display: inline-block; box-shadow: 0 5px 18px rgba(37,211,102,0.35); font-size: 14px;">
              📱 Habla con Enzo por WhatsApp
            </a>
            <p style="color: #9CA3AF; font-size: 11px; margin: 10px 0 0;">Respuesta instantánea · Lunes a sábado</p>
          </div>

        </div>
      </div>

      <!-- ═══ ECOSISTEMA DE AGENTES ═══ -->
      <div style="background:linear-gradient(180deg,#12121a 0%,#0d0d12 100%);padding:40px 24px 0;text-align:center;border-top:3px solid #0D9488;">
        <div style="max-width:480px;margin:0 auto 28px;">
          <h2 style="color:#2DD4BF;font-size:22px;font-weight:700;line-height:1.3;margin:0 0 12px;letter-spacing:-0.5px;">Tu próximo equipo no se contrata. Se activa.</h2>
          <p style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.7;margin:0;">OneMind conecta agentes especializados, memoria operativa y automatización inteligente para atender, vender, coordinar y ejecutar procesos empresariales <strong style="color:rgba(255,255,255,0.9);">24/7</strong> — sin turnos, sin tiempos de espera, sin límites.</p>
        </div>
        <div style="margin-bottom:22px;">${ecosistemaTable({aliados:['aurora','adriana','angela','axel','aluna','gabi','paula','custom'],theme:'dark'})}</div>
        <div style="background:rgba(13,148,136,0.06);border:1px solid rgba(13,148,136,0.12);border-radius:10px;padding:14px;margin-bottom:36px;">
          <p style="color:rgba(255,255,255,0.55);font-size:12px;line-height:1.8;margin:0;">
            Un solo ecosistema. Agentes especializados que se hablan entre sí.<br>
            <strong style="color:rgba(255,255,255,0.8);">Haz clic en cualquier agente para hablar directamente por WhatsApp.</strong>
          </p>
        </div>
        <!-- Brand footer -->
        <div style="border-top: 1px solid rgba(255,255,255,0.07); padding: 28px 20px 32px; text-align: center;">
          <img src="data:image/png;base64,${LOGOS_BASE64.marketinglab}" alt="MarketingLab" style="max-width: 180px; height: auto; display: block; margin: 0 auto 12px;" />
          <div style="color: rgba(255,255,255,0.35); font-size: 12px; letter-spacing: 1px; margin-bottom: 16px;">estrategia · digital · resultados</div>
          <div style="color: rgba(255,255,255,0.25); font-size: 11px; line-height: 1.8;">
            © 2026 Coworkia Ecuador — Espacios que inspiran<br>
            Whymper 403, Edificio Finistere - Planta Baja, Quito<br>
            <span style="font-size:10px;">coworkia.ec@gmail.com · +593 99 483 7117</span>
          </div>
        </div>
      </div>

    </body>
    </html>
  `;
}

/**
 * 🏘️ PAULA - PropElite Bienes Raíces (Real Estate Expert)
 * Colores: Rosa elegante (#DB2777, #EC4899) + Verde esmeralda (#059669)
 */
export function generatePaulaEmailHTML(leadData, leadScoreData = null) {
  const {
    userName,
    operationType,
    propertyType,
    zone,
    budgetRange,
    email,
    phone,
    leadId
  } = leadData;

  // Calcular lead score si los datos están disponibles
  let leadScoreHTML = '';
  if (leadScoreData) {
    const score = calcularLeadScore(leadScoreData);
    const reporte = generarReporteLeadScore(leadScoreData, score);
    leadScoreHTML = reporte.html;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Búsqueda de Propiedad - PropElite</title>
      <style>
        ${DARK_MODE_CSS}
      </style>
    </head>
    <body style="font-family: 'Georgia', serif; line-height: 1.6; color: #EDE8D0; background-color: #3D4436; margin: 0; padding: 20px;">
      
      <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #F5F5DC; border: 2px solid #D4AF37; border-radius: 0; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);">
        
        <!-- Header PropElite - Diseño Ultra Minimalista Wordmark -->
        <div style="background: #3D4436; text-align: center; padding: 60px 20px 50px 20px; border-bottom: 1px solid rgba(212,175,55,0.3);">
          <!-- Logo Wordmark Ultra Minimalista -->
          <div style="margin-bottom: 45px;">
            <!-- Prop Elite - Wordmark principal con potencia -->
            <div style="font-family: 'Georgia', serif; color: #D4AF37; font-size: 64px; font-weight: 700; letter-spacing: 2px; margin-bottom: 15px; line-height: 1.1; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
              Prop Elite
            </div>
            <!-- Prime Living - Tagline -->
            <div style="font-family: 'Helvetica Neue', 'Arial', sans-serif; color: #EDE8D0; font-size: 13px; font-weight: 400; letter-spacing: 5px; text-transform: uppercase; opacity: 0.9; margin-top: 20px;">
              PRIME LIVING
            </div>
          </div>
          
          <!-- Línea divisoria sutil -->
          <div style="height: 1px; width: 80px; background: rgba(212,175,55,0.4); margin: 35px auto 40px auto;"></div>
          
          <!-- Card de confirmación -->
          <div class="card-white shadow" style="background: #EDE8D0; color: #3D4436; padding: 28px 40px; border-radius: 0; display: inline-block; box-shadow: 0 8px 30px rgba(0,0,0,0.25); border: 1px solid #D4AF37;">
            <h1 class="text-dark" style="margin: 0; font-size: 20px; font-weight: 600; color: #3D4436; letter-spacing: 3px; font-family: 'Georgia', serif; text-transform: uppercase;">Búsqueda Iniciada</h1>
            <p class="text-gray" style="margin: 10px 0 0 0; color: #52594B; font-size: 13px; font-family: 'Arial', sans-serif; letter-spacing: 1px;">Su búsqueda exclusiva ha comenzado</p>
          </div>
        </div>

        <div class="content-section" style="padding: 45px 40px; background: #F5F5DC;">
          
          <!-- Saludo personalizado -->
          <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #D4AF37; padding-bottom: 30px;">
            <h2 class="text-dark" style="color: #3D4436; font-size: 28px; margin: 0 0 15px 0; font-weight: 400; font-family: 'Georgia', serif; letter-spacing: 2px;">${userName}</h2>
            <p class="text-gray" style="color: #52594B; font-size: 15px; margin: 0; font-family: 'Arial', sans-serif;">
              Iniciamos la búsqueda de su <span style="color: #D4AF37; font-weight: 700; font-family: 'Georgia', serif;">${propertyType}</span>
            </p>
          </div>

          <!-- Detalles de la búsqueda -->
          <div class="card-white-border" style="background: #4A5241; border: 2px solid #D4AF37; border-radius: 0; padding: 35px; margin: 35px 0; box-shadow: 0 4px 20px rgba(74,82,65,0.3);">
            <h3 class="text-dark" style="color: #D4AF37; margin-top: 0; font-size: 15px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; font-family: 'Arial', sans-serif; border-bottom: 2px solid #D4AF37; padding-bottom: 15px; margin-bottom: 25px;">Especificaciones</h3>
            
            <div style="margin: 25px 0;">
              <div class="card-white-border" style="background: #EDE8D0; border-radius: 0; padding: 18px 25px; margin: 15px 0; border-left: 4px solid #D4AF37;">
                <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Operación</div>
                <div class="text-dark" style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${operationType}</div>
              </div>
              
              <div class="card-white-border" style="background: #EDE8D0; border-radius: 0; padding: 18px 25px; margin: 15px 0; border-left: 4px solid #D4AF37;">
                <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Tipo de Propiedad</div>
                <div class="text-dark" style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${propertyType}</div>
              </div>
              
              <div class="card-white-border" style="background: #EDE8D0; border-radius: 0; padding: 18px 25px; margin: 15px 0; border-left: 4px solid #D4AF37;">
                <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Zona</div>
                <div class="text-dark" style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${zone}</div>
              </div>
              
              <div class="card-white-border" style="background: #EDE8D0; border-radius: 0; padding: 18px 25px; margin: 15px 0; border-left: 4px solid #D4AF37;">
                <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Presupuesto</div>
                <div class="text-dark" style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${budgetRange}</div>
              </div>
            </div>
          </div>

          <!-- Contacto -->
          <div class="card-white-border" style="background: #EDE8D0; border: 2px solid #D4AF37; border-radius: 0; padding: 30px; margin: 30px 0;">
            <div style="margin: 12px 0;">
              <span class="text-muted" style="color: #52594B; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Email</span>
              <div class="text-dark" style="color: #3D4436; font-weight: 600; font-size: 15px; font-family: 'Arial', sans-serif; margin-top: 6px;">${email}</div>
            </div>
            <div style="height: 2px; background: #D4AF37; margin: 20px 0;"></div>
            <div style="margin: 12px 0;">
              <span class="text-muted" style="color: #52594B; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Teléfono</span>
              <div class="text-dark" style="color: #3D4436; font-weight: 600; font-size: 15px; font-family: 'Arial', sans-serif; margin-top: 6px;">${phone}</div>
            </div>
          </div>

          <!-- Próximos pasos -->
          <div class="card-white-border" style="background: #4A5241; border: 2px solid #D4AF37; border-radius: 0; padding: 35px; margin: 35px 0;">
            <h3 style="color: #D4AF37; font-size: 15px; margin-bottom: 25px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; font-family: 'Arial', sans-serif;">Proceso Elite</h3>
            <div style="color: #EDE8D0; font-size: 15px; line-height: 2.2; font-family: 'Georgia', serif;">
              <p style="margin: 15px 0;">
                <span style="color: #D4AF37; font-weight: 700; font-size: 18px; font-family: 'Georgia', serif;">I.</span> &nbsp; Selección personalizada de propiedades exclusivas
              </p>
              <p style="margin: 15px 0;">
                <span style="color: #D4AF37; font-weight: 700; font-size: 18px; font-family: 'Georgia', serif;">II.</span> &nbsp; Presentación detallada con documentación completa
              </p>
              <p style="margin: 15px 0;">
                <span style="color: #D4AF37; font-weight: 700; font-size: 18px; font-family: 'Georgia', serif;">III.</span> &nbsp; Visitas privadas coordinadas a su conveniencia
              </p>
              <p style="margin: 15px 0;">
                <span style="color: #D4AF37; font-weight: 700; font-size: 18px; font-family: 'Georgia', serif;">IV.</span> &nbsp; Asesoría completa hasta la transacción final
              </p>
            </div>
          </div>

          <!-- Referencia -->
          <div style="background: #EDE8D0; border-radius: 0; padding: 25px; margin: 35px 0 0 0; border-top: 2px solid #D4AF37;">
            <p class="text-muted" style="color: #52594B; font-size: 11px; margin: 0; font-family: 'Arial', sans-serif; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
              <strong>Referencia:</strong> ${leadId}
            </p>
          </div>

          <!-- Lead Score - Internal Qualification -->
          ${leadScoreHTML}

          <!-- Footer Elite Minimalista -->
          <div style="text-align: center; margin: 45px 0 0 0; padding: 45px 30px; background: #3D4436; border-top: 1px solid rgba(212,175,55,0.3);">
            <!-- Wordmark pequeño -->
            <p style="color: #D4AF37; font-size: 22px; font-weight: 700; margin: 0 0 10px 0; font-family: 'Georgia', serif; letter-spacing: 2px;">Prop Elite</p>
            <p style="color: #EDE8D0; font-size: 10px; margin: 8px 0 15px 0; font-family: 'Helvetica Neue', 'Arial', sans-serif; letter-spacing: 4px; text-transform: uppercase; opacity: 0.8;">PRIME LIVING</p>
            <div style="height: 1px; width: 60px; background: rgba(212,175,55,0.3); margin: 20px auto;"></div>
            <p style="color: #EDE8D0; font-size: 11px; margin: 8px 0 0 0; font-family: 'Arial', sans-serif; opacity: 0.7;">Paula - Real Estate Advisor</p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 🎫 ALUNA - Coworkia Membresías
 * Colores: Turquesa Coworkia (#4ECDC4, #44A08D)
 */
export function generateAlunaEmailHTML(leadData) {
  const {
    userName,
    membershipType,
    startDate,
    email,
    phone,
    companyName,
    leadId
  } = leadData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Membresía Coworkia</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
      
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header Coworkia -->
        <div style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); text-align: center; padding: 40px 20px;">
          <!-- Placeholder para logo Coworkia -->
          <div style="background: white; width: 120px; height: 120px; margin: 0 auto 20px; border-radius: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="color: #4ECDC4; font-size: 48px; font-weight: 700;">🎫</div>
          </div>
          
          <div style="color: white; font-size: 42px; font-weight: 700; letter-spacing: -1px; margin-bottom: 6px;">
            Coworkia
          </div>
          <div style="color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 500; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">
            Business Center
          </div>
          <div style="background: rgba(255,255,255,0.95); color: #374151; padding: 20px 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #374151;">✅ Solicitud de Membresía</h1>
            <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 15px;">El equipo te contactará pronto</p>
          </div>
        </div>

        <div style="padding: 30px;">
          
          <!-- Saludo personalizado -->
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #1f2937; font-size: 20px; margin: 0;">¡Hola, ${userName}! 👋</h2>
            <p style="color: #6B7280; font-size: 15px; margin: 10px 0 0 0;">
              Recibimos tu interés en <strong style="color: #4ECDC4;">${membershipType}</strong>
            </p>
          </div>

          <!-- Detalles de la membresía -->
          <div style="background: linear-gradient(135deg, rgba(78,205,196,0.1), rgba(68,160,141,0.1)); border-left: 4px solid #4ECDC4; border-radius: 12px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(78,205,196,0.1);">
            <h3 style="color: #374151; margin-top: 0; font-size: 18px; font-weight: 600;">🎫 TU MEMBRESÍA</h3>
            
            <div style="margin: 20px 0;">
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(78,205,196,0.2);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #4ECDC4; font-size: 20px; margin-right: 12px;">🎫</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Tipo: ${membershipType}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(78,205,196,0.2);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #4ECDC4; font-size: 20px; margin-right: 12px;">📅</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Inicio: ${startDate}</span>
                </div>
              </div>

              ${companyName ? `
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(78,205,196,0.2);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #4ECDC4; font-size: 20px; margin-right: 12px;">🏢</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${companyName}</span>
                </div>
              </div>
              ` : ''}
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(78,205,196,0.2);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #4ECDC4; font-size: 20px; margin-right: 12px;">📧</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${email}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(78,205,196,0.2);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #4ECDC4; font-size: 20px; margin-right: 12px;">📱</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${phone}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Próximos pasos -->
          <div style="background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1)); border: 2px solid #10B981; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px; font-weight: 600;">✨ Próximos Pasos:</h3>
            <div style="color: #374151; font-size: 15px; line-height: 1.8;">
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">1.</strong> Te contactaremos para agendar un tour de las instalaciones
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">2.</strong> Conocerás todos los beneficios y amenidades
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">3.</strong> Revisaremos el plan que mejor se ajuste a tus necesidades
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">4.</strong> ¡Activa tu membresía y comienza a crecer!
              </p>
            </div>
          </div>

          <!-- Beneficios -->
          <div style="background: rgba(78,205,196,0.05); border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px; font-weight: 600;">🌟 Lo que incluye:</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div style="background: white; border-radius: 8px; padding: 15px; border: 1px solid rgba(78,205,196,0.2);">
                <span style="color: #4ECDC4; font-size: 18px; margin-right: 8px;">☕</span>
                <span style="color: #374151; font-weight: 500;">Café ilimitado</span>
              </div>
              <div style="background: white; border-radius: 8px; padding: 15px; border: 1px solid rgba(78,205,196,0.2);">
                <span style="color: #4ECDC4; font-size: 18px; margin-right: 8px;">🌐</span>
                <span style="color: #374151; font-weight: 500;">Internet 300 Mbps</span>
              </div>
              <div style="background: white; border-radius: 8px; padding: 15px; border: 1px solid rgba(78,205,196,0.2);">
                <span style="color: #4ECDC4; font-size: 18px; margin-right: 8px;">🖨️</span>
                <span style="color: #374151; font-weight: 500;">Impresiones incluidas</span>
              </div>
              <div style="background: white; border-radius: 8px; padding: 15px; border: 1px solid rgba(78,205,196,0.2);">
                <span style="color: #4ECDC4; font-size: 18px; margin-right: 8px;">🤝</span>
                <span style="color: #374151; font-weight: 500;">Networking</span>
              </div>
            </div>
          </div>

          <!-- Referencia -->
          <div style="background: rgba(78,205,196,0.05); border-radius: 12px; padding: 20px; margin: 25px 0;">
            <p style="color: #6B7280; font-size: 13px; margin: 0;">
              <strong>Referencia:</strong> ${leadId}
            </p>
          </div>

          <!-- Contacto -->
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 15px 0;">
              💬 Tu espacio ideal te está esperando
            </p>
            <a href="https://wa.me/593994837117?text=%40paula%2C%20%C2%A1este%20es%20el%20lugar%20perfecto!%20%C2%BFCu%C3%A1ndo%20lo%20veo%3F" 
               style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(37,211,102,0.3); font-size: 14px;">
              🏢 Quiero Ver Mi Espacio Ideal
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin: 35px 0 0 0; padding: 25px; background: linear-gradient(135deg, rgba(78,205,196,0.1), rgba(68,160,141,0.1)); border-radius: 12px;">
            <p style="color: #4ECDC4; font-size: 18px; font-weight: 700; margin: 0;">¡Bienvenido a la comunidad! 🚀</p>
            <p style="color: #374151; font-size: 14px; margin: 8px 0;">Equipo Coworkia</p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
}

/** * ⚖️ GABI - GR Consulting (Consultoría Legal y Contable)
 * Colores: Azul profesional (#1E3A8A, #3B82F6, #1E40AF)
 */
export function generateGabiEmailHTML(leadData) {
  const {
    userName,
    consultationType,
    company,
    ruc,
    email,
    phone,
    description,
    urgency,
    consultationCode,
    recipientType = 'client',
    aiAnalysis = null, // OpenAI-generated persuasion text (pass from confirmation flow)
  } = leadData;

  const gabiWaNumber = '593994837117';

  const urgencyMap = {
    'Urgente':       { text: '#DC2626', icon: '🚨' },
    'Normal':        { text: '#D97706', icon: '📅' },
    'Planificación': { text: '#2563EB', icon: '📋' },
  };
  const urgencyStyle = urgencyMap[urgency] || urgencyMap['Normal'];

  // WA links
  const adminWaLink  = `https://wa.me/${(phone||'').replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${userName}, soy del equipo de GR Consulting. Tu consulta ${consultationCode} ha sido recibida. ¿Cuándo podemos coordinar la sesión inicial gratuita?`)}`;
  // CTA 1: triggers $100 / 90-min advisory payment flow in backend
  const clientWaCTA1 = `https://wa.me/${gabiWaNumber}?text=${encodeURIComponent('@gabi ya tengo claro el camino, quiero seguir con la asesoría')}`;
  // CTA 2: questions about the offer
  const clientWaCTA2 = `https://wa.me/${gabiWaNumber}?text=${encodeURIComponent(`@gabi recibí su correo y tengo algunas preguntas - (${consultationCode})`)}`;

  // Opening: AI-personalized if provided, else persuasive default
  const openingText = aiAnalysis
    ? aiAnalysis
    : `Hemos revisado tu solicitud de asesoría en <strong style="color:#1B3358;">${consultationType}</strong>${company ? ` para <strong>${company}</strong>` : ''}. Gabi ya tiene el camino trazado para tu caso. La primera sesión de diagnóstico (30 min) es completamente gratuita y sin compromiso — ahí mapeamos tu situación, identificamos riesgos y definimos el alcance exacto. Si decides avanzar, la <strong style="color:#1B3358;">asesoría profunda de 90 minutos por $100</strong> es donde construimos juntos el plan de acción completo con informe profesional listo para ejecutar.`;

  // 6-area services grid
  const services = [
    { icon: '🏛️', title: 'Cumplimiento UAFE',         desc: 'Oficial de Cumplimiento certificado (LOPDLAFT), reportes ROS/RUI, matrices AML/CFT y políticas KYC.' },
    { icon: '💰', title: 'Finanzas & Tributación SRI', desc: 'Declaraciones IVA y Renta, conciliaciones bancarias, estados financieros y optimización fiscal.' },
    { icon: '👥', title: 'RRHH & Nómina',              desc: 'Décimos, IESS, afiliaciones, contratos laborales, reglamentos internos y liquidaciones de ley.' },
    { icon: '⚖️', title: 'Legal Empresarial',           desc: 'Constitución de compañías, contratos societarios, trámites Registro Mercantil, SRI e IESS.' },
    { icon: '🔍', title: 'Due Diligence & KYC',         desc: 'Auditorías internas, políticas antilavado, debida diligencia mejorada y gestión de riesgos.' },
    { icon: '🛡️', title: 'Ley de Datos / LOPDLAFT',     desc: 'Políticas privacidad, registro SENADI, derechos ARCO y cumplimiento normativo digital.' },
  ];

  const servicesHTML = [0, 2, 4].map(i => `
    <tr>
      <td style="width:50%;padding:0 6px 10px 0;vertical-align:top;">
        <div style="background:#FFF9E6;border:1px solid rgba(255,224,51,0.45);border-radius:10px;padding:16px;">
          <div style="font-size:22px;margin-bottom:8px;">${services[i].icon}</div>
          <div style="font-size:13px;font-weight:700;color:#1B3358;margin-bottom:5px;">${services[i].title}</div>
          <div style="color:#6B7280;font-size:12px;line-height:1.5;">${services[i].desc}</div>
        </div>
      </td>
      <td style="width:50%;padding:0 0 10px 0;vertical-align:top;">
        <div style="background:#FFF9E6;border:1px solid rgba(255,224,51,0.45);border-radius:10px;padding:16px;">
          <div style="font-size:22px;margin-bottom:8px;">${services[i+1].icon}</div>
          <div style="font-size:13px;font-weight:700;color:#1B3358;margin-bottom:5px;">${services[i+1].title}</div>
          <div style="color:#6B7280;font-size:12px;line-height:1.5;">${services[i+1].desc}</div>
        </div>
      </td>
    </tr>`).join('');

  const clientBodyContent = `
    <!-- Opening paragraph: AI or default persuasive -->
    <div style="background:#FFFBEB;border-left:4px solid #FFE033;border-radius:0 12px 12px 0;padding:20px 24px;margin:0 0 24px;">
      <p style="color:#374151;font-size:15px;line-height:1.8;margin:0;">${openingText}</p>
    </div>

    <!-- Summary card -->
    <div style="background:#F9FAFB;border-left:4px solid #C9A82A;border-radius:0 12px 12px 0;padding:20px 24px;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:700;color:#1B3358;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">📋 Tu solicitud en resumen</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;width:40%;">Tipo de consultoría</td><td style="padding:6px 0;color:#1B3358;font-size:13px;font-weight:700;">${consultationType}</td></tr>
        ${company ? `<tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Empresa</td><td style="padding:6px 0;color:#1F2937;font-size:13px;font-weight:600;">${company}</td></tr>` : ''}
        ${ruc ? `<tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">RUC</td><td style="padding:6px 0;color:#1F2937;font-size:13px;font-weight:600;">${ruc}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Urgencia</td><td style="padding:6px 0;color:${urgencyStyle.text};font-size:13px;font-weight:700;">${urgencyStyle.icon} ${urgency||'Normal'}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Código</td><td style="padding:6px 0;color:#1B3358;font-size:13px;font-weight:700;">${consultationCode}</td></tr>
      </table>
    </div>

    <!-- Services: 6-area grid -->
    <div style="margin:0 0 24px;">
      <div style="font-size:11px;font-weight:700;color:#1B3358;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">⚖️ TODO LO QUE GABI MANEJA EN TU EMPRESA</div>
      <p style="color:#6B7280;font-size:13px;margin:0 0 14px;line-height:1.6;">Cada empresa en Ecuador carga con obligaciones legales, fiscales y laborales. Gabi las convierte en <strong style="color:#1B3358;">ventajas competitivas</strong>.</p>
      <table style="width:100%;border-collapse:collapse;">${servicesHTML}</table>
    </div>

    <!-- OFFER: clear 2-tier pitch -->
    <div style="background:linear-gradient(145deg,#1B3358 0%,#0D2137 100%);border-radius:16px;padding:32px 24px;margin:0 0 24px;text-align:center;">
      <div style="background:rgba(255,224,51,0.1);border:1px solid rgba(255,224,51,0.3);border-radius:20px;padding:5px 18px;display:inline-block;margin-bottom:20px;">
        <span style="color:#FFE033;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">🎁 TU RUTA HACIA LA SOLUCIÓN</span>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="width:50%;padding:0 6px 0 0;vertical-align:top;">
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:18px;text-align:center;">
              <div style="color:rgba(255,255,255,0.45);font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">DIAGNÓSTICO INICIAL</div>
              <div style="color:#FFE033;font-size:38px;font-weight:900;line-height:1;margin-bottom:4px;">$0</div>
              <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:10px;">30 minutos · Gratis</div>
              <div style="color:rgba(255,255,255,0.45);font-size:11px;line-height:1.5;">Mapeamos tu situación e identificamos riesgos y el camino a seguir</div>
            </div>
          </td>
          <td style="width:50%;padding:0 0 0 6px;vertical-align:top;">
            <div style="background:rgba(255,224,51,0.07);border:2px solid rgba(255,224,51,0.5);border-radius:12px;padding:18px;text-align:center;">
              <div style="color:#FFE033;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">ASESORÍA PROFUNDA</div>
              <div style="color:#FFE033;font-size:38px;font-weight:900;line-height:1;margin-bottom:4px;">$100</div>
              <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-bottom:10px;">90 minutos · Plan de acción</div>
              <div style="color:rgba(255,255,255,0.6);font-size:11px;line-height:1.5;">Plan completo + informe profesional entregable listo para ejecutar</div>
            </div>
          </td>
        </tr>
      </table>
      <div style="color:rgba(255,255,255,0.65);font-size:14px;line-height:1.8;margin-bottom:26px;max-width:380px;margin-left:auto;margin-right:auto;">
        Empieza gratis, sin compromiso. Cuando decidas avanzar, <strong style="color:#FFE033;">$100 te da 90 minutos de asesoría profunda</strong> más el informe profesional que define tu plan de acción.
      </div>
      <a href="${clientWaCTA1}"
         style="display:inline-block;background:linear-gradient(135deg,#FFE033 0%,#E8B800 100%);color:#0D2137;padding:16px 36px;text-decoration:none;border-radius:50px;font-weight:900;font-size:15px;box-shadow:0 6px 22px rgba(255,224,51,0.5);letter-spacing:0.3px;">
        ✨ Quiero seguir con la asesoría
      </a>
      <p style="color:rgba(255,255,255,0.35);font-size:11px;margin:12px 0 0;letter-spacing:0.3px;">Abre WhatsApp con Gabi · Activa el pago seguro por $100</p>
    </div>

    <!-- Process: 3 steps -->
    <div style="margin:0 0 24px;">
      <div style="font-size:11px;font-weight:700;color:#1B3358;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">🗺️ LO QUE OCURRE DESPUÉS</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:33.3%;padding:0 5px 0 0;vertical-align:top;">
            <div style="background:#0A0F1E;border-radius:10px;padding:16px 12px;text-align:center;">
              <div style="color:#FFE033;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Hoy</div>
              <div style="font-size:24px;margin-bottom:8px;">📞</div>
              <div style="color:white;font-size:12px;font-weight:700;margin-bottom:4px;">Diagnóstico</div>
              <div style="color:rgba(255,255,255,0.45);font-size:11px;">30 min gratuitos</div>
            </div>
          </td>
          <td style="width:33.3%;padding:0 5px;vertical-align:top;">
            <div style="background:#0D1520;border:1px solid rgba(255,224,51,0.2);border-radius:10px;padding:16px 12px;text-align:center;">
              <div style="color:#FFE033;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Paso 2</div>
              <div style="font-size:24px;margin-bottom:8px;">💳</div>
              <div style="color:white;font-size:12px;font-weight:700;margin-bottom:4px;">Pago $100</div>
              <div style="color:rgba(255,255,255,0.45);font-size:11px;">PayPal · seguro</div>
            </div>
          </td>
          <td style="width:33.3%;padding:0 0 0 5px;vertical-align:top;">
            <div style="background:linear-gradient(135deg,#2a1a00 0%,#0A0F1E 100%);border:1px solid rgba(255,224,51,0.4);border-radius:10px;padding:16px 12px;text-align:center;">
              <div style="color:#FFE033;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Resultado</div>
              <div style="font-size:24px;margin-bottom:8px;">📋</div>
              <div style="color:white;font-size:12px;font-weight:700;margin-bottom:4px;">Plan de Acción</div>
              <div style="color:rgba(255,255,255,0.45);font-size:11px;">90 min + informe</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA 2: WhatsApp questions -->
    <div style="text-align:center;margin:0 0 8px;">
      <p style="color:#6B7280;font-size:14px;margin:0 0 14px;font-weight:500;">💬 ¿Tienes preguntas sobre la propuesta?</p>
      <a href="${clientWaCTA2}"
         style="background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);color:white;padding:13px 32px;text-decoration:none;border-radius:50px;font-weight:700;display:inline-block;box-shadow:0 5px 18px rgba(37,211,102,0.35);font-size:14px;">
        📱 Habla con Gabi por WhatsApp
      </a>
      <p style="color:#9CA3AF;font-size:11px;margin:10px 0 0;">Respuesta instantánea 24/7</p>
    </div>
  `;

  const adminBodyContent = `
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Nueva solicitud de consultoría de <strong style="color:#1B3358;">${userName}</strong> en <strong style="color:#1B3358;">${consultationType}</strong>.
    </p>
    <div style="background:#F9FAFB;border-left:4px solid #C9A82A;border-radius:0 12px 12px 0;padding:20px 24px;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:700;color:#1B3358;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">👤 Datos del cliente</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;width:35%;">Nombre</td><td style="padding:6px 0;color:#1F2937;font-size:13px;font-weight:600;">${userName}</td></tr>
        ${company ? `<tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Empresa</td><td style="padding:6px 0;color:#1F2937;font-size:13px;font-weight:600;">${company}</td></tr>` : ''}
        ${ruc ? `<tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">RUC</td><td style="padding:6px 0;color:#1F2937;font-size:13px;font-weight:600;">${ruc}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Email</td><td style="padding:6px 0;color:#1F2937;font-size:13px;font-weight:600;">${email}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Teléfono</td><td style="padding:6px 0;color:#1F2937;font-size:13px;font-weight:600;">${phone}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Urgencia</td><td style="padding:6px 0;color:${urgencyStyle.text};font-size:13px;font-weight:700;">${urgencyStyle.icon} ${urgency||'Normal'}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Código</td><td style="padding:6px 0;color:#1B3358;font-size:13px;font-weight:700;">${consultationCode}</td></tr>
      </table>
    </div>
    <div style="background:white;border:1px solid rgba(27,51,88,0.15);border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:700;color:#1B3358;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">📝 Descripción del caso</div>
      <p style="color:#374151;margin:0;line-height:1.7;font-size:14px;">${description}</p>
    </div>
    <div style="text-align:center;margin:0 0 8px;">
      <p style="color:#6B7280;font-size:14px;margin:0 0 14px;">💬 Contactar al cliente</p>
      <a href="${adminWaLink}"
         style="background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);color:white;padding:13px 32px;text-decoration:none;border-radius:50px;font-weight:700;display:inline-block;box-shadow:0 5px 18px rgba(37,211,102,0.35);font-size:14px;">
        📱 Abrir WhatsApp con ${userName}
      </a>
    </div>
  `;

  const ecosistemaItems = ecosistemaTable({
    aliados: ['aurora', 'adriana', 'angela', 'axel', 'aluna', 'enzo', 'paula', 'custom'],
    theme: 'dark',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light only">
      <meta name="supported-color-schemes" content="light">
      <title>${recipientType === 'admin' ? 'Nueva Consultoría' : `Cotización ${consultationCode}`} — GR Consulting</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;background-color:#0D2137;margin:0;padding:0;">

      <div style="max-width:600px;margin:0 auto;background:white;border-radius:0;overflow:hidden;">

        <!-- ═══ HEADER: dark navy + fluorescent gold ═══ -->
        <div style="background:linear-gradient(145deg,#1B3358 0%,#0D2137 55%,#14293F 100%);text-align:center;padding:48px 20px 40px;position:relative;overflow:hidden;">

          <div style="color:white;font-size:32px;font-weight:900;letter-spacing:-0.5px;margin-bottom:5px;font-family:Georgia,serif;">GR Consulting</div>
          <div style="color:#FFE033;font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;margin-bottom:28px;">FINANZAS · LEGAL · RRHH · COMPLIANCE</div>

          <!-- Metrics card -->
          <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,224,51,0.35);border-radius:14px;padding:20px 26px;max-width:340px;margin:0 auto;">
            <div style="color:#FFE033;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;text-align:center;margin-bottom:12px;">· PROPUESTA PERSONALIZADA ·</div>
            <div style="color:white;font-size:22px;font-weight:800;text-align:center;line-height:1.2;margin-bottom:14px;">${userName}</div>
            <div style="border-top:1px solid rgba(255,224,51,0.2);margin-bottom:14px;"></div>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="width:50%;padding:0 4px 0 0;">
                  <div style="background:rgba(255,224,51,0.06);border:1px solid rgba(255,224,51,0.2);border-radius:10px;padding:12px;text-align:center;">
                    <div style="color:#FFE033;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">TIPO</div>
                    <div style="color:white;font-size:12px;font-weight:700;line-height:1.3;">${consultationType}</div>
                  </div>
                </td>
                <td style="width:50%;padding:0 0 0 4px;">
                  <div style="background:rgba(255,224,51,0.06);border:1px solid rgba(255,224,51,0.2);border-radius:10px;padding:12px;text-align:center;">
                    <div style="color:#FFE033;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">REFERENCIA</div>
                    <div style="color:white;font-size:12px;font-weight:700;line-height:1.3;">${consultationCode}</div>
                  </div>
                </td>
              </tr>
            </table>
            ${company ? `<div style="text-align:center;margin-top:12px;color:rgba(255,255,255,0.5);font-size:12px;">${company}</div>` : ''}
            <div style="text-align:center;border-top:1px solid rgba(255,224,51,0.2);margin-top:14px;padding-top:12px;">
              <span style="color:#FFE033;font-size:12px;font-weight:600;">Gabi · GR Consulting</span>
            </div>
          </div>
        </div>

        <!-- ═══ BODY ═══ -->
        <div style="padding:32px 28px;">
          ${recipientType === 'admin' ? adminBodyContent : clientBodyContent}
        </div>
      </div>

      <!-- ═══ ECOSISTEMA ═══ -->
      <div style="background:linear-gradient(180deg,#12121a 0%,#0d0d12 100%);padding:40px 24px 0;text-align:center;border-top:3px solid #FFE033;">
        <div style="max-width:480px;margin:0 auto 28px;">
          <h2 style="color:#FFE033;font-size:22px;font-weight:700;line-height:1.3;margin:0 0 12px;letter-spacing:-0.5px;">Tu próximo equipo no se contrata. Se activa.</h2>
          <p style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.7;margin:0;">OneMind conecta agentes especializados, memoria operativa y automatización inteligente para atender, vender, coordinar y ejecutar procesos empresariales <strong style="color:rgba(255,255,255,0.9);">24/7</strong> — sin turnos, sin tiempos de espera, sin límites.</p>
        </div>
        <div style="margin-bottom:22px;">${ecosistemaItems}</div>
        <div style="background:rgba(255,224,51,0.04);border:1px solid rgba(255,224,51,0.1);border-radius:10px;padding:14px;margin-bottom:36px;">
          <p style="color:rgba(255,255,255,0.55);font-size:12px;line-height:1.8;margin:0;">
            Un solo ecosistema. Agentes especializados que se hablan entre sí.<br>
            <strong style="color:rgba(255,255,255,0.8);">Haz clic en cualquier agente para hablar directamente por WhatsApp.</strong>
          </p>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.07);padding:28px 20px 32px;text-align:center;">
          <h2 style="color:white;font-size:24px;font-weight:900;margin:0 0 6px;letter-spacing:1px;font-family:Georgia,serif;">GR CONSULTING</h2>
          <div style="color:rgba(255,255,255,0.35);font-size:12px;letter-spacing:1px;margin-bottom:16px;">financiero · legal · cumplimiento</div>
          <div style="color:rgba(255,255,255,0.25);font-size:11px;line-height:1.8;">
            © 2026 Coworkia Ecuador — Espacios que inspiran<br>
            Whymper 403, Edificio Finistere - Planta Baja, Quito<br>
            <span style="font-size:10px;">coworkia.ec@gmail.com · +593 99 483 7117</span>
          </div>
        </div>
      </div>

    </body>
    </html>
  `;
}


/**
 * � ALUNA PROFORMA — Email de propuesta de membresía específica
 * Solo muestra el plan elegido. Colores: Verde Oscuro (#047857 → #065F46)
 */
export function generateAlunaProformaHTML(data) {
  const {
    clientName,
    planName,
    planPrice,
    planDays,
    planHours,
    planBenefits = [],
    planIdeal = '',
    proformaCode = '',
    nota = null,
    coworkiaWhatsApp = '593994837117'
  } = data;

  // Paleta Aluna — Verde Oscuro Elegante
  // Primary: #047857 (emerald-700)  Accent: #065F46 (emerald-800)  Light: #059669
  // BG light: #ECFDF5  BG mid: #D1FAE5  Border: #A7F3D0
  // Static glow: rgba(4,120,87,0.35)

  const benefitsList = planBenefits.map(b => `
    <div style="margin:10px 0;line-height:1.5;">
      <span style="color:#059669;font-size:18px;margin-right:8px;vertical-align:top;">✦</span><span style="color:#374151;font-size:15px;line-height:1.5;">${b}</span>
    </div>`).join('');

  const waText = encodeURIComponent(`@aluna, el ${planName} es justo lo que necesito ¿Cuándo empiezo?`);
  const waComboText = encodeURIComponent(`@aluna, quiero el combo ${planName} + Oficina Virtual con descuento`);

  // Upsell solo para planes Hot Desk (Plan 10 y Plan 20)
  const isHotDeskPlan = planName && (planName.includes('Plan 10') || planName.includes('Plan 20'));
  const comboLabel = planName?.includes('Plan 20') ? 'Plan 20 + Oficina Virtual (1 año)' : 'Plan 10 + Oficina Virtual (1 año)';
  const comboDiscount = planName?.includes('Plan 20') ? '15%' : '10%';
  const comboPrice = planName?.includes('Plan 20') ? '$310' : '$328';

  const upsellSection = isHotDeskPlan ? `
  <!-- POTENCIA TU MEMBRESÍA -->
  <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:16px;padding:28px;margin:28px 0;">
    <div style="text-align:center;margin-bottom:20px;">
      <div style="background:#065F46;color:white;display:inline-block;padding:8px 18px;border-radius:8px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px;">🏢 POTENCIA TU MEMBRESÍA</div>
      <div style="color:#111827;font-size:22px;font-weight:800;margin-bottom:6px;">🏢 Oficina Virtual + Presencia Legal</div>
      <div style="color:#047857;font-size:14px;font-weight:600;">Muchas empresas lo necesitan sin saberlo</div>
    </div>
    <div style="background:white;border:1px solid #E5E7EB;border-radius:12px;padding:18px 22px;margin-bottom:20px;">
      ${[
        '<strong>Dirección comercial oficial</strong> para tu empresa (Whymper 403, Quito)',
        '<strong>Cumplimiento legal Ecuador:</strong> SRI, IESS, permisos municipales',
        '<strong>Recepción de correspondencia</strong> y notificaciones oficiales',
        '<strong>Sala de Reuniones incluida</strong> (1 vez al mes, 2 horas)',
      ].map(item => `<div style="padding:8px 0;border-bottom:1px solid #F3F4F6;"><span style="color:#047857;font-size:16px;margin-right:10px;vertical-align:top;">✓</span><span style="color:#374151;font-size:14px;">${item}</span></div>`).join('')}
    </div>
    <div style="background:#FFFBEB;border:2px dashed #F59E0B;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <div style="color:#D97706;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">⚡ OFERTA ESPECIAL COMBO</div>
      <div style="color:#111827;font-size:18px;font-weight:800;margin-bottom:6px;">${comboLabel}</div>
      <div style="color:#DC2626;font-size:32px;font-weight:900;line-height:1;margin-bottom:6px;">${comboDiscount} DESCUENTO</div>
      <div style="color:#6B7280;font-size:13px;">en Oficina Virtual ($365 → ${comboPrice} USD/año)</div>
    </div>
    <div style="text-align:center;">
      <a href="https://wa.me/${coworkiaWhatsApp}?text=${waComboText}" style="background:linear-gradient(135deg,#047857,#065F46);color:white;padding:14px 32px;text-decoration:none;border-radius:25px;font-weight:600;display:inline-block;box-shadow:0 4px 12px rgba(4,120,87,0.35);font-size:15px;">🏢 Quiero el Combo con Descuento</a>
      <div style="color:#9CA3AF;font-size:12px;margin-top:8px;">Solo válido al contratar por 1 año</div>
    </div>
  </div>` : '';

  const ecosistemaItems = ecosistemaTable({
    aliados: ['aurora', 'enzo', 'angela', 'axel', 'adriana', 'gabi', 'paula', 'custom'],
    theme: 'dark',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Tu propuesta de membresía — Coworkia</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">

  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

    <!-- Header Coworkia Verde Oscuro -->
    <div style="background: linear-gradient(135deg, #047857 0%, #065F46 100%); text-align: center; padding: 40px 20px 35px;">
      <!-- Logo texto simple -->
      <div style="color: white; font-size: 70px; font-weight: 700; margin-bottom: 8px; line-height: 0.9;">Coworkia</div>
      <div style="color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 600; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 30px;">
        BUSINESS CENTER
      </div>
      
      <!-- Tarjeta membresía preparada para —— diseño aprobado -->
      <div style="background:rgba(255,255,255,0.97);border-radius:16px;padding:24px 32px;display:inline-block;min-width:300px;text-align:left;box-shadow:0 4px 20px rgba(0,0,0,0.18);">
        <div style="color:#9CA3AF;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:14px;text-align:center;">· MEMBRESÍA PREPARADA PARA ·</div>
        <div style="color:#111827;font-size:26px;font-weight:800;margin-bottom:14px;text-align:center;">${clientName}</div>
        <div style="border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;padding:12px 0;margin-bottom:12px;text-align:center;">
          <span style="font-size:18px;vertical-align:middle;">🎫</span>&nbsp;&nbsp;<strong style="color:#111827;font-size:16px;font-weight:700;vertical-align:middle;">${planName}</strong>&nbsp;&nbsp;${proformaCode ? `<span style="background:#047857;color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;letter-spacing:0.5px;vertical-align:middle;">${proformaCode}</span>` : ''}
        </div>
        <div style="color:#047857;font-size:13px;font-weight:600;text-align:center;">Aluna · Especialista en Membresías</div>
      </div>
    </div>

    <div style="padding: 30px 30px 0;">

      <!-- Saludo -->
      <div style="text-align: center; margin-bottom: 25px;">
        <h2 style="color: #1f2937; font-size: 20px; margin: 0;">¡Hola, ${clientName}! 👋</h2>
        <p style="color: #6B7280; font-size: 15px; margin: 10px 0 0 0;">
          Aquí tienes los detalles del plan que mejor se ajusta a lo que buscas.
        </p>
      </div>

      <!-- Card del Plan -->
      <div style="background: linear-gradient(135deg, rgba(4,120,87,0.08), rgba(6,95,70,0.12)); border-left: 4px solid #047857; border-radius: 12px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(4,120,87,0.15);">
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;width:100%;">
          <tr>
            <td style="width:62px;vertical-align:middle;padding-right:14px;">
              <div style="background:linear-gradient(135deg,#047857,#065F46);border-radius:10px;width:48px;height:48px;text-align:center;line-height:48px;box-shadow:0 4px 12px rgba(4,120,87,0.3);">
                <span style="font-size:24px;">🎫</span>
              </div>
            </td>
            <td style="vertical-align:middle;">
              <div style="color:#047857;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">MEMBRESÍA COWORKIA</div>
              <div style="color:#1f2937;font-size:24px;font-weight:800;line-height:1;">${planName}</div>
            </td>
          </tr>
        </table>

        <!-- Precio destacado -->
        <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid rgba(4,120,87,0.2); margin-bottom: 15px; text-align: center; box-shadow: 0 2px 6px rgba(4,120,87,0.08);">
          <div style="color: #6B7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">INVERSIÓN</div>
          <div style="color: #047857; font-size: 36px; font-weight: 800; letter-spacing: -1px;">${planPrice}</div>
        </div>

        <!-- Detalles -->
        <div style="background: white; border-radius: 10px; padding: 14px 18px; border: 1px solid rgba(4,120,87,0.15); margin-bottom: 10px;">
          <span style="color: #059669; font-size: 16px; margin-right: 8px;">📅</span>
          <span style="color: #374151; font-size: 15px; font-weight: 600;">${planDays}</span>
        </div>

        ${planHours ? `
        <div style="background: white; border-radius: 10px; padding: 14px 18px; border: 1px solid rgba(4,120,87,0.15); margin-bottom: 10px;">
          <span style="color: #059669; font-size: 16px; margin-right: 8px;">⏱️</span>
          <span style="color: #374151; font-size: 15px; font-weight: 600;">${planHours}</span>
        </div>` : ''}

        ${planIdeal ? `
        <div style="background: linear-gradient(135deg, rgba(4,120,87,0.06), rgba(5,150,105,0.06)); border-radius: 10px; padding: 14px 18px; border: 1px solid rgba(4,120,87,0.2);">
          <span style="color: #059669; font-size: 15px; margin-right: 8px;">🎯</span>
          <span style="color: #047857; font-size: 14px; font-weight: 600;">Ideal para: </span>
          <span style="color: #374151; font-size: 14px;">${planIdeal}</span>
        </div>` : ''}
      </div>

      <!-- Beneficios -->
      ${planBenefits.length > 0 ? `
      <div style="margin-bottom: 25px;">
        <h3 style="color: #1f2937; font-size: 18px; font-weight: 700; margin: 0 0 15px 0;">✨ Todo lo que incluye</h3>
        <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; border: 1px solid #D1FAE5;">
          ${benefitsList}
        </div>
      </div>` : ''}

      <!-- Diferenciador IA -->
      <div style="background: linear-gradient(135deg, #047857, #065F46); border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; box-shadow: 0 4px 16px rgba(4,120,87,0.25);">
        <div style="color: rgba(255,255,255,0.8); font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">SOLO EN COWORKIA</div>
        <div style="color: white; font-size: 22px; font-weight: 800; margin-bottom: 10px;">🤖 Secretaria Virtual con IA</div>
        <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; line-height: 1.6;">Disponible en contratos de 9+ meses. Tu asistente IA 24/7 para agenda, reservas y recordatorios.</p>
      </div>

      <!-- CTA WhatsApp -->
      <div style="text-align: center; margin: 25px 0;">
        <p style="color: #374151; font-size: 14px; margin: 5px 0 15px 0; font-weight: 600;">
          💬 Tu espacio ideal te está esperando
        </p>
        <a href="https://wa.me/${coworkiaWhatsApp}?text=${waText}"
           style="background: linear-gradient(135deg, #047857, #065F46); color: white; padding: 14px 32px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(4,120,87,0.35); font-size: 15px;">
          &#10003; Quiero Empezar Ahora
        </a>
        <p style="color: #9CA3AF; font-size: 12px; margin: 12px 0 0 0;">También puedes responder este correo</p>
      </div>

      ${upsellSection}

      <!-- Ubicación -->
      <div style="background:#ECFDF5;border-radius:12px;padding:16px;margin:25px 0;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td style="width:50%;vertical-align:middle;padding-right:8px;">
              <div style="background:white;border-radius:10px;padding:16px 18px;">
                <div style="color:#047857;font-size:15px;font-weight:700;margin-bottom:6px;">Coworkia</div>
                <div style="color:#6B7280;font-size:13px;line-height:1.7;">Edificio Finistere — Planta Baja<br>Whymper 403, Quito</div>
              </div>
            </td>
            <td style="width:50%;vertical-align:middle;padding-left:8px;text-align:center;">
              <div style="background:white;border-radius:10px;padding:16px 18px;text-align:center;">
                <a href="https://maps.app.goo.gl/Nqy6YeGuxo3czEt66" style="background:#047857;color:white;padding:12px 18px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;font-size:13px;box-shadow:0 4px 10px rgba(4,120,87,0.3);">📍 Ver en Google Maps</a>
              </div>
            </td>
          </tr>
        </table>
      </div>

      ${nota ? `
      <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td style="width:30px;vertical-align:top;padding-right:10px;padding-top:2px;"><span style="font-size:20px;">📝</span></td>
            <td style="vertical-align:top;">
              <div style="color:#92400E;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Nota del equipo</div>
              <div style="color:#78350F;font-size:14px;line-height:1.6;">${nota}</div>
            </td>
          </tr>
        </table>
      </div>` : ''}

    </div>

    <!-- ECOSISTEMA 8 AGENTES + FOOTER -->
    <div style="background:linear-gradient(180deg,#0C0F14 0%,#0A0D12 100%);padding:36px 32px;text-align:center;">
      <div style="color:#4ECDC4;font-size:22px;font-weight:800;margin-bottom:12px;line-height:1.3;">Tu próximo equipo no se contrata. Se activa.</div>
      <div style="color:rgba(255,255,255,0.55);font-size:12px;line-height:1.7;max-width:480px;margin:0 auto 28px;">OneMind conecta agentes especializados, memoria operativa y automatización inteligente para atender, vender, coordinar y ejecutar procesos empresariales 24/7 — sin turnos, sin tiempos de espera, sin límites.</div>
      <div style="margin-bottom:22px;">${ecosistemaItems}</div>
      <!-- texto conector -->
      <div style="margin-bottom:28px;padding:0 8px;">
        <p style="color:rgba(255,255,255,0.45);font-size:12px;line-height:1.8;margin:0;">Un solo ecosistema. Agentes especializados que se hablan entre sí.<br><strong style="color:rgba(255,255,255,0.75);">Haz clic en cualquier agente para hablar directamente por WhatsApp.</strong></p>
      </div>
      <!-- footer dentro del dark section -->
      <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:24px;margin-top:8px;">
        <div style="color:#4ECDC4;font-size:22px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;">Coworkia</div>
        <div style="color:rgba(255,255,255,0.35);font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">work · connect · grow</div>
        <div style="color:rgba(255,255,255,0.4);font-size:11px;line-height:1.8;">
          © 2026 Coworkia Ecuador — Espacios que inspiran<br>
          Whymper 403, Edificio Finistere, Planta Baja, Quito<br>
          coworkia.ec@gmail.com &nbsp;·&nbsp; +593 99 483 7117
        </div>
      </div>
    </div>

  </div>
</body>
</html>`;
}

/**
 * 🔀 Dispatcher universal de emails por agente
 * Centraliza la generación de emails para todos los agentes.
 * @param {string} agentName - Nombre del agente (ALUNA, GABI, AXEL, ENZO, PAULA, ADRIANA)
 * @param {string} type - Tipo de email: 'admin' | 'client' | 'proforma'
 * @param {Object} data - Datos del email
 * @returns {{ subject: string, html: string }}
 */
export function generateEmailForAgent(agentName, type, data) {
  const clientName = data.clientName || data.userName || 'Cliente';

  switch (agentName) {
    case 'ALUNA': {
      if (type === 'proforma') {
        return {
          subject: `Tu propuesta de ${data.planName} — Coworkia`,
          html: generateAlunaProformaHTML(data)
        };
      }
      if (type === 'admin') {
        const adminHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; background:#f9fafb; padding: 24px;">
<div style="max-width:560px; margin:0 auto; background:white; border-radius:12px; padding:28px; border:1px solid #EDE9FE;">
<h2 style="color:#5B21B6; margin-top:0;">🎫 Nuevo Lead de Membresía</h2>
<table style="width:100%; font-size:14px; border-collapse:collapse;">
<tr><td style="padding:8px 0; color:#6B7280; font-weight:600; width:160px;">Nombre</td><td style="padding:8px 0; color:#1F2937;">${clientName}</td></tr>
<tr><td style="padding:8px 0; color:#6B7280; font-weight:600;">Membresía</td><td style="padding:8px 0; color:#1F2937;">${data.membershipType || '—'}</td></tr>
<tr><td style="padding:8px 0; color:#6B7280; font-weight:600;">Precio</td><td style="padding:8px 0; color:#5B21B6; font-weight:700;">${data.price || '—'}</td></tr>
<tr><td style="padding:8px 0; color:#6B7280; font-weight:600;">Email</td><td style="padding:8px 0; color:#1F2937;">${data.email || '—'}</td></tr>
<tr><td style="padding:8px 0; color:#6B7280; font-weight:600;">Teléfono</td><td style="padding:8px 0; color:#1F2937;">${data.phone || '—'}</td></tr>
<tr><td style="padding:8px 0; color:#6B7280; font-weight:600;">Inicio</td><td style="padding:8px 0; color:#1F2937;">${data.startDate || 'Flexible'}</td></tr>
<tr><td style="padding:8px 0; color:#6B7280; font-weight:600;">Notas</td><td style="padding:8px 0; color:#1F2937;">${data.specialRequirements || 'Ninguna'}</td></tr>
${data.leadId ? `<tr><td style="padding:8px 0; color:#6B7280; font-weight:600;">Ref. Lead</td><td style="padding:8px 0; color:#1F2937; font-family:monospace;">${data.leadId}</td></tr>` : ''}
${data.whatsappLink ? `<tr><td style="padding:8px 0; color:#6B7280; font-weight:600;">WhatsApp</td><td style="padding:8px 0;"><a href="${data.whatsappLink}" style="color:#7C3AED;">${data.whatsappLink}</a></td></tr>` : ''}
</table>
</div></body></html>`;
        return {
          subject: `🎫 Nuevo lead membresía: ${clientName} — ${data.membershipType || 'Plan'}`,
          html: adminHtml
        };
      }
      // type === 'client'
      return {
        subject: `✅ Solicitud de membresía confirmada — Coworkia`,
        html: generateAlunaEmailHTML({ ...data, userName: clientName })
      };
    }

    case 'GABI':
      return {
        subject: type === 'admin'
          ? `💼 Nueva consultoría: ${clientName} · ${data.consultationType}`
          : `Cotización 💼 ${data.consultationCode} — ${data.consultationType} · ${data.company || clientName} | Gabi - GR Consulting`,
        html: generateGabiEmailHTML({ ...data, userName: clientName })
      };

    case 'AXEL':
      return {
        subject: `🚗 Cotización de colisión — ${clientName}`,
        html: generateAxelEmailHTML({ ...data, userName: clientName })
      };

    case 'ENZO':
      return {
        subject: type === 'admin'
          ? `📊 Nueva propuesta marketing: ${clientName}`
          : `Cotización 🚀 ${data.leadId} — ${data.projectType} · ${data.companyName || clientName} | Enzo - MarketingLab`,
        html: generateEnzoEmailHTML({ ...data, userName: clientName })
      };

    case 'PAULA':
      return {
        subject: type === 'admin'
          ? `🏡 Nuevo lead inmobiliario: ${clientName}`
          : `✅ Búsqueda confirmada — El Morenal`,
        html: generatePaulaEmailHTML({ ...data, userName: clientName })
      };

    case 'ADRIANA':
      return {
        subject: `🛡️ Solicitud de seguro — ${clientName}`,
        html: generateAdrianaEmailHTML({ ...data, userName: clientName })
      };

    default:
      throw new Error(`[generateEmailForAgent] Agente desconocido: ${agentName}`);
  }
}
