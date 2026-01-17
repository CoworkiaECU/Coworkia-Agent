/**
 * 📧 Templates de Email para Agentes Especializados
 * Cada empresa tiene su propio diseño HTML con branding
 */

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
    leadId
  } = leadData;

  const specificDetails = vehicleBrand ? `
    <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(30,58,138,0.3);">
      <div style="display: flex; align-items: center;">
        <span style="color: #1E3A8A; font-size: 20px; margin-right: 12px;">🚗</span>
        <span style="color: #374151; font-weight: 600; font-size: 16px;">Vehículo: ${vehicleBrand} ${vehicleModel || ''}</span>
      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Solicitud de Seguro - SegPopular</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
      
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header SegPopular - Fondo Amarillo Característico -->
        <div style="background: #FFD700; text-align: center; padding: 40px 20px;">
          <!-- Logo SegPopular inline -->
          <div style="margin-bottom: 20px;">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" 
                 alt="SegPopular" 
                 style="max-width: 240px; height: auto; display: block; margin: 0 auto;" />
          </div>
          <!-- Fallback text logo si imagen no carga -->
          <div style="margin-bottom: 20px;">
            <div style="font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; color: #1E3A8A; font-size: 58px; font-weight: 400; letter-spacing: 2px; margin-bottom: -5px; font-style: italic; text-shadow: 3px 3px 6px rgba(0,0,0,0.15); line-height: 1;">
              SegPopular
            </div>
            <div style="font-family: 'Helvetica Neue', 'Arial', sans-serif; color: #1E3A8A; font-size: 13px; font-weight: 500; letter-spacing: 3px; text-transform: lowercase; margin-top: 8px;">
              asesores de seguros populares
            </div>
          </div>
          <div style="background: white; color: #374151; padding: 20px 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.2); border: 3px solid #1E3A8A;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #1E3A8A;">✅ Solicitud Recibida</h1>
            <p style="margin: 8px 0 0 0; color: #374151; font-size: 15px;">Adriana te contactará pronto</p>
          </div>
        </div>

        <div style="padding: 30px;">
          
          <!-- Saludo personalizado -->
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #1f2937; font-size: 20px; margin: 0;">¡Hola, ${userName}! 👋</h2>
            <p style="color: #6B7280; font-size: 15px; margin: 10px 0 0 0;">
              Recibimos tu solicitud de seguro de <strong style="color: #1E3A8A;">${insuranceType}</strong>
            </p>
          </div>

          <!-- Detalles de la solicitud -->
          <div style="background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.3)); border-left: 4px solid #1E3A8A; border-radius: 12px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(30,58,138,0.2);">
            <h3 style="color: #1E3A8A; margin-top: 0; font-size: 18px; font-weight: 600;">📋 TUS DATOS</h3>
            
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

          <!-- Próximos pasos -->
          <div style="background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1)); border: 2px solid #10B981; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px; font-weight: 600;">✨ Próximos Pasos:</h3>
            <div style="color: #374151; font-size: 15px; line-height: 1.8;">
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">1.</strong> Adriana revisará tu solicitud en las próximas 24 horas
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">2.</strong> Te contactará para conocer más detalles
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">3.</strong> Recibirás tu cotización personalizada
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
              💬 ¿Tienes dudas?
            </p>
            <a href="https://wa.me/593994837117?text=Hola%20Adriana,%20tengo%20dudas%20sobre%20mi%20solicitud%20${leadId}" 
               style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(37,211,102,0.3); font-size: 14px;">
              📱 Contactar a Adriana por WhatsApp
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
              <span style="font-size: 28px; margin-right: 10px;">🔧</span> SIGUIENTE PASO
            </p>
            <p style="color: rgba(255,255,255,0.95); font-size: 15px; margin: 0 0 20px 0;">Para confirmar y agendar la reparación,<br>contáctanos por WhatsApp o teléfono:</p>
            
            <a href="https://wa.me/593994837117?text=Confirmar%20Cotización%20${quoteCode}" 
               style="display: inline-block; background: rgba(220,38,38,0.2); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: 700; margin-bottom: 15px; font-size: 16px; border: 2px solid rgba(255,255,255,0.4);">
              📱 WhatsApp: +593 99 483 7117
            </a>
            
            <div style="background: rgba(255,255,255,0.95); border-radius: 8px; padding: 15px; max-width: 400px; margin: 15px auto 0 auto;">
              <p style="margin: 0; color: #DC2626; font-size: 15px; font-weight: 600;">💬 Confirmar Cotización ${quoteCode}</p>
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
 * Colores: Verde Lime (#84CC16, #65A30D) + Gris (#6B7280, #4B5563)
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
      <title>Proyecto de Marketing - MarketingLab</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
      
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header MarketingLab -->
        <div style="background: linear-gradient(135deg, #84CC16 0%, #65A30D 100%); text-align: center; padding: 40px 20px;">
          <!-- Logo MarketingLab inline -->
          <div style="margin-bottom: 20px;">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" 
                 alt="MarketingLab" 
                 style="max-width: 220px; height: auto; display: block; margin: 0 auto; margin-bottom: 15px;" />
          </div>
          <!-- Fallback text logo -->
          <div style="margin-bottom: 20px;">
            <div style="font-family: 'Impact', 'Haettenschweiler', 'Arial Black', sans-serif; color: #F9FAFB; font-size: 52px; font-weight: 900; letter-spacing: -2px; margin-bottom: 5px; text-transform: lowercase; text-shadow: 3px 3px 6px rgba(0,0,0,0.3); line-height: 0.9;">
              marketinglab
            </div>
          </div>
          <div style="color: rgba(255,255,255,0.95); font-size: 16px; font-weight: 600; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">
            Estrategias que funcionan
          </div>
          <div style="background: rgba(255,255,255,0.95); color: #374151; padding: 20px 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #374151;">✅ Proyecto Registrado</h1>
            <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 15px;">Enzo revisará tu caso</p>
          </div>
        </div>

        <div style="padding: 30px;">
          
          <!-- Saludo personalizado -->
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #1f2937; font-size: 20px; margin: 0;">¡Hola, ${userName}! 👋</h2>
            <p style="color: #6B7280; font-size: 15px; margin: 10px 0 0 0;">
              Tu proyecto de <strong style="color: #65A30D;">${projectType}</strong> está en buenas manos
            </p>
          </div>

          <!-- Detalles del proyecto -->
          <div style="background: linear-gradient(135deg, rgba(132,204,22,0.12), rgba(101,163,13,0.12)); border-left: 4px solid #84CC16; border-radius: 12px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(132,204,22,0.15);">
            <h3 style="color: #374151; margin-top: 0; font-size: 18px; font-weight: 600;">🎯 TU PROYECTO</h3>
            
            <div style="margin: 20px 0;">
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(132,204,22,0.25);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #84CC16; font-size: 20px; margin-right: 12px;">🎯</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Tipo: ${projectType}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(132,204,22,0.25);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #84CC16; font-size: 20px; margin-right: 12px;">🏢</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${companyName}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(132,204,22,0.25);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #84CC16; font-size: 20px; margin-right: 12px;">💰</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Presupuesto: ${budget}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(132,204,22,0.25);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #84CC16; font-size: 20px; margin-right: 12px;">⏰</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Urgencia: ${urgency}</span>
                </div>
              </div>

              ${description ? `
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(132,204,22,0.25);">
                <div style="display: flex; align-items: flex-start;">
                  <span style="color: #84CC16; font-size: 20px; margin-right: 12px;">📝</span>
                  <span style="color: #374151; font-weight: 500; font-size: 15px;">${description}</span>
                </div>
              </div>
              ` : ''}
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(132,204,22,0.25);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #84CC16; font-size: 20px; margin-right: 12px;">📧</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${email}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(132,204,22,0.25);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #84CC16; font-size: 20px; margin-right: 12px;">📱</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${phone}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Próximos pasos -->
          <div style="background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1)); border: 2px solid #10B981; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px; font-weight: 600;">✨ Proceso:</h3>
            <div style="color: #374151; font-size: 15px; line-height: 1.8;">
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">1.</strong> Enzo analizará tu proyecto y objetivos
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">2.</strong> Agendaremos una reunión para conocer más detalles
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">3.</strong> Desarrollaremos una propuesta personalizada
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #10B981;">4.</strong> ¡Ejecutaremos estrategias que funcionen!
              </p>
            </div>
          </div>

          <!-- Referencia -->
          <div style="background: rgba(132,204,22,0.08); border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid rgba(132,204,22,0.2);">
            <p style="color: #4B5563; font-size: 13px; margin: 0; font-weight: 600;">
              <strong>Referencia:</strong> ${leadId}
            </p>
          </div>

          <!-- Contacto -->
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 15px 0;">
              💬 ¿Quieres agendar reunión?
            </p>
            <a href="https://wa.me/593994837117?text=Hola%20Enzo,%20quiero%20agendar%20reunión%20${leadId}" 
               style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(37,211,102,0.3); font-size: 14px;">
              📱 Contactar a Enzo por WhatsApp
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin: 35px 0 0 0; padding: 25px; background: linear-gradient(135deg, rgba(132,204,22,0.15), rgba(101,163,13,0.15)); border-radius: 12px; border: 2px solid #84CC16;">
            <p style="color: #65A30D; font-size: 18px; font-weight: 700; margin: 0;">¡Hagamos crecer tu marca! 🎯</p>
            <p style="color: #4B5563; font-size: 14px; margin: 8px 0; font-weight: 600;">Enzo - MarketingLab</p>
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
export function generatePaulaEmailHTML(leadData) {
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Búsqueda de Propiedad - PropElite</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; margin: 0; padding: 0;">
      
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header PropElite - Diseño elegante para Paula -->
        <div style="background: linear-gradient(135deg, #DB2777 0%, #059669 100%); text-align: center; padding: 40px 20px;">
          <!-- Logo PropElite con diseño elegante -->
          <div style="margin-bottom: 20px;">
            <div style="background: white; width: 140px; height: 140px; margin: 0 auto 15px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(0,0,0,0.2); border: 4px solid rgba(255,255,255,0.3);">
              <div style="font-family: 'Georgia', serif; color: #DB2777; font-size: 48px; font-weight: 700; margin-bottom: -5px;">P</div>
              <div style="font-family: 'Georgia', serif; color: #059669; font-size: 24px; font-weight: 400; font-style: italic;">Elite</div>
            </div>
            <div style="font-family: 'Georgia', serif; color: white; font-size: 38px; font-weight: 700; letter-spacing: 1px; margin-bottom: 5px;">
              PropElite
            </div>
            <div style="font-family: 'Arial', sans-serif; color: rgba(255,255,255,0.95); font-size: 16px; font-weight: 400; letter-spacing: 2px; margin-bottom: 10px;">
              Bienes Raíces
            </div>
          </div>
          <div style="color: rgba(255,255,255,0.95); font-size: 15px; font-weight: 400; letter-spacing: 1px; margin-bottom: 20px; font-style: italic;">
            Tu hogar perfecto te espera
          </div>
          <div style="background: rgba(255,255,255,0.95); color: #374151; padding: 20px 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #374151;">✅ Búsqueda Iniciada</h1>
            <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 15px;">Paula encontrará opciones para ti</p>
          </div>
        </div>

        <div style="padding: 30px;">
          
          <!-- Saludo personalizado -->
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #1f2937; font-size: 20px; margin: 0;">¡Hola, ${userName}! 👋</h2>
            <p style="color: #6B7280; font-size: 15px; margin: 10px 0 0 0;">
              Iniciamos la búsqueda de tu <strong style="color: #DB2777;">${propertyType}</strong>
            </p>
          </div>

          <!-- Detalles de la búsqueda -->
          <div style="background: linear-gradient(135deg, rgba(219,39,119,0.1), rgba(5,150,105,0.1)); border-left: 4px solid #DB2777; border-radius: 12px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(219,39,119,0.2);">
            <h3 style="color: #374151; margin-top: 0; font-size: 18px; font-weight: 600;">🏘️ TU BÚSQUEDA</h3>
            
            <div style="margin: 20px 0;">
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(219,39,119,0.3);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #DB2777; font-size: 20px; margin-right: 12px;">🏠</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Operación: ${operationType}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(219,39,119,0.3);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #DB2777; font-size: 20px; margin-right: 12px;">🏘️</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Tipo: ${propertyType}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(219,39,119,0.3);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #059669; font-size: 20px; margin-right: 12px;">📍</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Zona: ${zone}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(219,39,119,0.3);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #DB2777; font-size: 20px; margin-right: 12px;">💰</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">Presupuesto: ${budgetRange}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(219,39,119,0.3);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #059669; font-size: 20px; margin-right: 12px;">📧</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${email}</span>
                </div>
              </div>
              
              <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid rgba(219,39,119,0.3);">
                <div style="display: flex; align-items: center;">
                  <span style="color: #DB2777; font-size: 20px; margin-right: 12px;">📱</span>
                  <span style="color: #374151; font-weight: 600; font-size: 16px;">${phone}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Próximos pasos -->
          <div style="background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1)); border: 2px solid #059669; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px; font-weight: 600;">✨ Proceso:</h3>
            <div style="color: #374151; font-size: 15px; line-height: 1.8;">
              <p style="margin: 10px 0;">
                <strong style="color: #DB2777;">1.</strong> Paula buscará propiedades que coincidan con tus criterios
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #DB2777;">2.</strong> Te enviaremos opciones con fotos y detalles
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #DB2777;">3.</strong> Agendaremos visitas a las que te interesen
              </p>
              <p style="margin: 10px 0;">
                <strong style="color: #DB2777;">4.</strong> Te acompañaremos hasta cerrar el trato
              </p>
            </div>
          </div>

          <!-- Referencia -->
          <div style="background: rgba(219,39,119,0.1); border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #DB2777;">
            <p style="color: #374151; font-size: 13px; margin: 0;">
              <strong>Referencia:</strong> ${leadId}
            </p>
          </div>

          <!-- Contacto -->
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 15px 0;">
              💬 ¿Quieres más detalles?
            </p>
            <a href="https://wa.me/593994837117?text=Hola%20Paula,%20quiero%20ver%20opciones%20${leadId}" 
               style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(37,211,102,0.3); font-size: 14px;">
              📱 Contactar a Paula por WhatsApp
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin: 35px 0 0 0; padding: 25px; background: linear-gradient(135deg, rgba(219,39,119,0.15), rgba(5,150,105,0.15)); border-radius: 12px; border: 2px solid #DB2777;">
            <p style="color: #DB2777; font-size: 18px; font-weight: 700; margin: 0;">¡Encontraremos tu hogar ideal! 🏘️</p>
            <p style="color: #374151; font-size: 14px; margin: 8px 0; font-weight: 600;">Paula - PropElite Bienes Raíces</p>
            <p style="color: #059669; font-size: 13px; margin: 5px 0; font-style: italic;">Real Estate Expert</p>
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
          
          <div style="color: white; font-size: 42px; font-weight: 700; letter-spacing: -1px; margin-bottom: 8px;">
            Coworkia
          </div>
          <div style="color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400; letter-spacing: 1px; margin-bottom: 20px;">
            work · connect · grow
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
              💬 ¿Quieres agendar tu tour?
            </p>
            <a href="https://wa.me/593994837117?text=Hola,%20quiero%20agendar%20tour%20${leadId}" 
               style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(37,211,102,0.3); font-size: 14px;">
              📱 Agendar por WhatsApp
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

/**
 * 📧 Función helper para elegir el template correcto según el agente
 */
export function generateEmailForAgent(agentName, leadData) {
  switch (agentName) {
    case 'ADRIANA':
      return generateAdrianaEmailHTML(leadData);
    case 'AXEL':
      return generateAxelEmailHTML(leadData);
    case 'ENZO':
      return generateEnzoEmailHTML(leadData);
    case 'PAULA':
      return generatePaulaEmailHTML(leadData);
    case 'ALUNA':
      return generateAlunaEmailHTML(leadData);
    default:
      throw new Error(`Template no encontrado para agente: ${agentName}`);
  }
}

export default {
  generateAdrianaEmailHTML,
  generateAxelEmailHTML,
  generateEnzoEmailHTML,
  generatePaulaEmailHTML,
  generateAlunaEmailHTML,
  generateEmailForAgent
};
