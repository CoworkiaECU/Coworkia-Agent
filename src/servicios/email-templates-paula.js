/**
 * 📧 Templates de Email para Paula - PropElite Bienes Raíces
 * Emails de confirmación de visitas a propiedades
 */

/**
 * ✉️ Email de confirmación de visita agendada
 */
export function generateVisitConfirmationEmail(visitData) {
  const {
    visitId,
    clientName,
    propertyName,
    propertyCode,
    propertyAddress,
    date,
    time,
    formatted
  } = visitData;
  
  const [year, month, day] = date.split('-');
  const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date(date).getDay()];
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visita Confirmada - PropElite</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background: #F7F5F0;">
  
  <!-- Container Principal -->
  <div style="max-width: 650px; margin: 0 auto; background: #FFFFFF;">
    
    <!-- Header con branding PropElite -->
    <div style="background: linear-gradient(135deg, #3D4436 0%, #52594B 100%); padding: 45px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
      <h1 style="color: #D4AF37; font-size: 32px; margin: 0; font-weight: 400; letter-spacing: 3px; font-family: 'Georgia', serif;">Prop Elite</h1>
      <p style="color: #EDE8D0; margin: 8px 0 0 0; font-size: 13px; letter-spacing: 1.5px; font-weight: 300;">BIENES RAÍCES DE LUJO</p>
    </div>
    
    <!-- Icono de confirmación -->
    <div style="text-align: center; margin: 35px 0 25px 0;">
      <div style="display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: #059669; line-height: 80px;">
        <span style="color: white; font-size: 42px;">✓</span>
      </div>
    </div>
    
    <!-- Título principal -->
    <div style="text-align: center; padding: 0 30px 30px 30px;">
      <h2 style="color: #3D4436; font-size: 28px; margin: 0 0 15px 0; font-weight: 400; letter-spacing: 2px;">Visita Confirmada</h2>
      <p style="color: #52594B; font-size: 15px; margin: 0;">
        ${clientName}, tu visita ha sido agendada exitosamente
      </p>
    </div>
    
    <!-- Detalles de la visita -->
    <div style="padding: 0 30px 30px 30px;">
      
      <!-- Código de visita -->
      <div style="background: #EDE8D0; border-radius: 0; padding: 18px 25px; margin: 20px 0; border-left: 4px solid #D4AF37;">
        <div style="color: #52594B; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Código de Visita</div>
        <div style="color: #3D4436; font-weight: 700; font-size: 22px; font-family: 'Georgia', serif;">${visitId}</div>
      </div>
      
      <!-- Grid de detalles -->
      <div style="background: #F7F5F0; border: 1px solid #E5E1D8; border-radius: 0; padding: 25px; margin: 20px 0;">
        
        <div style="margin-bottom: 22px;">
          <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Propiedad</div>
          <div style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${propertyName}</div>
          <div style="color: #798071; font-size: 13px; margin-top: 4px;">${propertyCode}</div>
        </div>
        
        <div style="margin-bottom: 22px;">
          <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Dirección</div>
          <div style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${propertyAddress}</div>
        </div>
        
        <div style="margin-bottom: 22px;">
          <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Fecha y Hora</div>
          <div style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${dayName} ${day}/${month}/${year}</div>
          <div style="color: #D4AF37; font-size: 16px; font-weight: 600; margin-top: 4px;">${time} (1 hora)</div>
        </div>
        
      </div>
      
      <!-- Instrucciones importantes -->
      <div style="background: #FFFFFF; border: 2px solid #D4AF37; border-radius: 0; padding: 25px; margin: 25px 0;">
        <h3 style="color: #D4AF37; font-size: 16px; margin: 0 0 18px 0; font-family: 'Georgia', serif; letter-spacing: 1px;">📋 INSTRUCCIONES PARA LA VISITA</h3>
        
        <div style="color: #3D4436; font-size: 14px; line-height: 1.8; font-family: 'Arial', sans-serif;">
          <p style="margin: 12px 0;">
            <span style="color: #D4AF37; font-weight: 700; font-size: 16px; font-family: 'Georgia', serif;">I.</span> &nbsp; Llega 5 minutos antes de la hora programada
          </p>
          <p style="margin: 12px 0;">
            <span style="color: #D4AF37; font-weight: 700; font-size: 16px; font-family: 'Georgia', serif;">II.</span> &nbsp; Trae tu identificación oficial (cédula o pasaporte)
          </p>
          <p style="margin: 12px 0;">
            <span style="color: #D4AF37; font-weight: 700; font-size: 16px; font-family: 'Georgia', serif;">III.</span> &nbsp; Un agente de PropElite te recibirá en la propiedad
          </p>
          <p style="margin: 12px 0;">
            <span style="color: #D4AF37; font-weight: 700; font-size: 16px; font-family: 'Georgia', serif;">IV.</span> &nbsp; Podrás hacer todas las preguntas que necesites
          </p>
        </div>
      </div>
      
      <!-- Nota de reagendamiento -->
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 18px 20px; margin: 20px 0;">
        <p style="color: #92400E; font-size: 13px; margin: 0; line-height: 1.6;">
          <strong>⚠️ ¿Necesitas reagendar?</strong><br>
          Avísanos por WhatsApp con mínimo 24 horas de anticipación.
        </p>
      </div>
      
      <!-- Botón de contacto WhatsApp -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://wa.me/593984455060?text=Hola%20Paula,%20tengo%20una%20pregunta%20sobre%20mi%20visita%20${visitId}" 
           style="display: inline-block; background: #059669; color: #FFFFFF; padding: 16px 40px; text-decoration: none; border-radius: 0; font-weight: 600; font-size: 15px; letter-spacing: 1px; font-family: 'Arial', sans-serif;">
          CONTACTAR A PAULA
        </a>
      </div>
      
      <!-- Separador -->
      <div style="height: 1px; background: linear-gradient(to right, transparent, #D4AF37, transparent); margin: 35px 0;"></div>
      
      <!-- Beneficios de PropElite -->
      <div style="padding: 20px 0;">
        <h3 style="color: #3D4436; font-size: 18px; margin: 0 0 20px 0; font-family: 'Georgia', serif; text-align: center; letter-spacing: 1px;">¿Por qué elegir PropElite?</h3>
        
        <div style="color: #52594B; font-size: 14px; line-height: 1.8;">
          <p style="margin: 12px 0;">✓ <strong>Asesoría 100% gratuita</strong> en todo el proceso</p>
          <p style="margin: 12px 0;">✓ <strong>Portafolio exclusivo</strong> de propiedades premium</p>
          <p style="margin: 12px 0;">✓ <strong>Due diligence legal</strong> incluido</p>
          <p style="margin: 12px 0;">✓ <strong>Acompañamiento</strong> hasta la escrituración</p>
        </div>
      </div>
      
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin: 45px 0 0 0; padding: 45px 30px; background: #3D4436; border-top: 1px solid rgba(212,175,55,0.3);">
      <p style="color: #D4AF37; font-size: 22px; font-weight: 700; margin: 0 0 10px 0; font-family: 'Georgia', serif; letter-spacing: 2px;">Prop Elite</p>
      <p style="color: #EDE8D0; font-size: 12px; margin: 0 0 18px 0; letter-spacing: 1.5px;">BIENES RAÍCES DE LUJO</p>
      
      <div style="margin: 20px 0;">
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">📱 WhatsApp: +593 98 445 5060</p>
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">📧 contacto@propelite.ec</p>
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">🇪🇨 Ecuador • 🇩🇴 República Dominicana</p>
      </div>
      
      <div style="margin: 25px 0 0 0; padding: 20px 0 0 0; border-top: 1px solid rgba(184,189,179,0.2);">
        <p style="color: #798071; font-size: 11px; margin: 0;">© 2025 PropElite Bienes Raíces. Todos los derechos reservados.</p>
      </div>
    </div>
    
  </div>
  
</body>
</html>
  `;
  
  return {
    subject: `✅ Visita Confirmada: ${propertyName} - ${formatted}`,
    html
  };
}

/**
 * ✉️ Email de reagendamiento de visita
 */
export function generateRescheduleEmail(visitData) {
  const {
    visitId,
    clientName,
    propertyName,
    newDate,
    newTime,
    formatted
  } = visitData;

  return {
    subject: `🔄 Visita Reagendada: ${propertyName} — ${formatted}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visita Reagendada - PropElite</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background: #F7F5F0;">
  <div style="max-width: 650px; margin: 0 auto; background: #FFFFFF;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3D4436 0%, #52594B 100%); padding: 45px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
      <h1 style="color: #D4AF37; font-size: 32px; margin: 0; font-weight: 400; letter-spacing: 3px; font-family: 'Georgia', serif;">Prop Elite</h1>
      <p style="color: #EDE8D0; margin: 8px 0 0 0; font-size: 13px; letter-spacing: 1.5px; font-weight: 300;">BIENES RAÍCES DE LUJO</p>
    </div>

    <!-- Status icon -->
    <div style="text-align: center; margin: 35px 0 25px 0;">
      <div style="display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: #1D4ED8; line-height: 80px;">
        <span style="color: white; font-size: 38px;">🔄</span>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; padding: 0 30px 30px 30px;">
      <h2 style="color: #3D4436; font-size: 28px; margin: 0 0 15px 0; font-weight: 400; letter-spacing: 2px;">Visita Reagendada</h2>
      <p style="color: #52594B; font-size: 15px; margin: 0;">${clientName}, tu visita ha sido confirmada en la nueva fecha</p>
    </div>

    <!-- Details -->
    <div style="padding: 0 30px 30px 30px;">

      <!-- Visit code -->
      <div style="background: #EDE8D0; padding: 18px 25px; margin: 20px 0; border-left: 4px solid #D4AF37;">
        <div style="color: #52594B; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Código de Visita</div>
        <div style="color: #3D4436; font-weight: 700; font-size: 22px; font-family: 'Georgia', serif;">${visitId}</div>
      </div>

      <!-- New schedule -->
      <div style="background: #F7F5F0; border: 1px solid #E5E1D8; padding: 25px; margin: 20px 0;">
        <div style="margin-bottom: 22px;">
          <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Propiedad</div>
          <div style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${propertyName}</div>
        </div>
        <div>
          <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Nueva Fecha y Hora</div>
          <div style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${formatted}</div>
          <div style="color: #D4AF37; font-size: 14px; font-weight: 600; margin-top: 4px;">1 hora de visita</div>
        </div>
      </div>

      <!-- Note -->
      <div style="background: #EFF6FF; border-left: 4px solid #1D4ED8; padding: 18px 20px; margin: 20px 0;">
        <p style="color: #1e40af; font-size: 13px; margin: 0; line-height: 1.6;">
          <strong>✅ Todo listo</strong> — hemos registrado el cambio de fecha. Si necesitas hacer otro ajuste, escríbenos con mínimo 24 horas de anticipación.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://wa.me/593984455060?text=Hola%20Paula,%20tengo%20una%20pregunta%20sobre%20mi%20visita%20reagendada%20${visitId}"
           style="display: inline-block; background: #059669; color: #FFFFFF; padding: 16px 40px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 1px; font-family: 'Arial', sans-serif;">
          CONTACTAR A PAULA
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 45px 30px; background: #3D4436; border-top: 1px solid rgba(212,175,55,0.3);">
      <p style="color: #D4AF37; font-size: 22px; font-weight: 700; margin: 0 0 10px 0; font-family: 'Georgia', serif; letter-spacing: 2px;">Prop Elite</p>
      <p style="color: #EDE8D0; font-size: 12px; margin: 0 0 18px 0; letter-spacing: 1.5px;">BIENES RAÍCES DE LUJO</p>
      <div style="margin: 20px 0;">
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">📱 WhatsApp: +593 98 445 5060</p>
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">📧 contacto@propelite.ec</p>
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">🇪🇨 Ecuador • 🇩🇴 República Dominicana</p>
      </div>
      <div style="margin: 25px 0 0 0; padding: 20px 0 0 0; border-top: 1px solid rgba(184,189,179,0.2);">
        <p style="color: #798071; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} PropElite Bienes Raíces. Todos los derechos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>`
  };
}

/**
 * ✉️ Email de cancelación de visita
 */
export function generateCancellationEmail(visitData) {
  const {
    visitId,
    clientName,
    propertyName
  } = visitData;

  return {
    subject: `Visita Cancelada: ${propertyName} — ${visitId}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visita Cancelada - PropElite</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background: #F7F5F0;">
  <div style="max-width: 650px; margin: 0 auto; background: #FFFFFF;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3D4436 0%, #52594B 100%); padding: 45px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
      <h1 style="color: #D4AF37; font-size: 32px; margin: 0; font-weight: 400; letter-spacing: 3px; font-family: 'Georgia', serif;">Prop Elite</h1>
      <p style="color: #EDE8D0; margin: 8px 0 0 0; font-size: 13px; letter-spacing: 1.5px; font-weight: 300;">BIENES RAÍCES DE LUJO</p>
    </div>

    <!-- Status icon -->
    <div style="text-align: center; margin: 35px 0 25px 0;">
      <div style="display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: #6B7280; line-height: 80px;">
        <span style="color: white; font-size: 38px;">✕</span>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; padding: 0 30px 30px 30px;">
      <h2 style="color: #3D4436; font-size: 28px; margin: 0 0 15px 0; font-weight: 400; letter-spacing: 2px;">Visita Cancelada</h2>
      <p style="color: #52594B; font-size: 15px; margin: 0;">
        ${clientName}, hemos procesado la cancelación de tu visita
      </p>
    </div>

    <!-- Details -->
    <div style="padding: 0 30px 30px 30px;">

      <!-- Visit code -->
      <div style="background: #EDE8D0; padding: 18px 25px; margin: 20px 0; border-left: 4px solid #D4AF37;">
        <div style="color: #52594B; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Código de Visita</div>
        <div style="color: #3D4436; font-weight: 700; font-size: 22px; font-family: 'Georgia', serif;">${visitId}</div>
      </div>

      <!-- Property -->
      <div style="background: #F7F5F0; border: 1px solid #E5E1D8; padding: 25px; margin: 20px 0;">
        <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Propiedad</div>
        <div style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${propertyName}</div>
      </div>

      <!-- Reschedule CTA -->
      <div style="background: #FFFBEB; border: 2px solid #D4AF37; padding: 25px; margin: 25px 0;">
        <h3 style="color: #D4AF37; font-size: 16px; margin: 0 0 12px 0; font-family: 'Georgia', serif;">¿Deseas agendar en otra fecha?</h3>
        <p style="color: #52594B; font-size: 14px; margin: 0 0 16px 0; line-height: 1.7;">
          Nuestro portafolio El Morenal sigue disponible. Escríbenos por WhatsApp y te ayudamos a encontrar el momento ideal.
        </p>
        <div style="text-align: center;">
          <a href="https://wa.me/593984455060?text=Hola%20Paula,%20quisiera%20reagendar%20mi%20visita%20a%20${encodeURIComponent(propertyName)}"
             style="display: inline-block; background: #059669; color: #FFFFFF; padding: 14px 32px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 1px; font-family: 'Arial', sans-serif;">
            REAGENDAR VISITA
          </a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 45px 30px; background: #3D4436; border-top: 1px solid rgba(212,175,55,0.3);">
      <p style="color: #D4AF37; font-size: 22px; font-weight: 700; margin: 0 0 10px 0; font-family: 'Georgia', serif; letter-spacing: 2px;">Prop Elite</p>
      <p style="color: #EDE8D0; font-size: 12px; margin: 0 0 18px 0; letter-spacing: 1.5px;">BIENES RAÍCES DE LUJO</p>
      <div style="margin: 20px 0;">
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">📱 WhatsApp: +593 98 445 5060</p>
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">📧 contacto@propelite.ec</p>
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">🇪🇨 Ecuador • 🇩🇴 República Dominicana</p>
      </div>
      <div style="margin: 25px 0 0 0; padding: 20px 0 0 0; border-top: 1px solid rgba(184,189,179,0.2);">
        <p style="color: #798071; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} PropElite Bienes Raíces. Todos los derechos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>`
  };
}

/**
 * ✉️ Email recordatorio 24h antes
 */
export function generateReminderEmail(visitData) {
  const {
    visitId,
    clientName,
    propertyName,
    propertyAddress,
    formatted
  } = visitData;

  return {
    subject: `🔔 Recordatorio: Tu visita mañana — ${propertyName}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Visita - PropElite</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background: #F7F5F0;">
  <div style="max-width: 650px; margin: 0 auto; background: #FFFFFF;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3D4436 0%, #52594B 100%); padding: 45px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
      <h1 style="color: #D4AF37; font-size: 32px; margin: 0; font-weight: 400; letter-spacing: 3px; font-family: 'Georgia', serif;">Prop Elite</h1>
      <p style="color: #EDE8D0; margin: 8px 0 0 0; font-size: 13px; letter-spacing: 1.5px; font-weight: 300;">BIENES RAÍCES DE LUJO</p>
    </div>

    <!-- Status icon -->
    <div style="text-align: center; margin: 35px 0 25px 0;">
      <div style="display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: #D4AF37; line-height: 80px;">
        <span style="color: #3D4436; font-size: 38px;">🔔</span>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; padding: 0 30px 30px 30px;">
      <h2 style="color: #3D4436; font-size: 28px; margin: 0 0 15px 0; font-weight: 400; letter-spacing: 2px;">Recordatorio de Visita</h2>
      <p style="color: #52594B; font-size: 15px; margin: 0;">
        ${clientName}, mañana es tu visita. ¡Te esperamos!
      </p>
    </div>

    <!-- Details -->
    <div style="padding: 0 30px 30px 30px;">

      <!-- Visit code -->
      <div style="background: #EDE8D0; padding: 18px 25px; margin: 20px 0; border-left: 4px solid #D4AF37;">
        <div style="color: #52594B; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Código de Visita</div>
        <div style="color: #3D4436; font-weight: 700; font-size: 22px; font-family: 'Georgia', serif;">${visitId}</div>
      </div>

      <!-- Visit info -->
      <div style="background: #F7F5F0; border: 1px solid #E5E1D8; padding: 25px; margin: 20px 0;">
        <div style="margin-bottom: 22px;">
          <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Propiedad</div>
          <div style="color: #3D4436; font-weight: 700; font-size: 17px; font-family: 'Georgia', serif;">${propertyName}</div>
        </div>
        <div style="margin-bottom: 22px;">
          <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Dirección</div>
          <div style="color: #3D4436; font-weight: 700; font-size: 15px; font-family: 'Georgia', serif;">${propertyAddress}</div>
        </div>
        <div>
          <div style="color: #52594B; font-weight: 600; font-size: 12px; font-family: 'Arial', sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Fecha y Hora</div>
          <div style="color: #D4AF37; font-size: 18px; font-weight: 700; font-family: 'Georgia', serif;">${formatted}</div>
        </div>
      </div>

      <!-- Reminders -->
      <div style="background: #FFFFFF; border: 2px solid #D4AF37; padding: 25px; margin: 25px 0;">
        <h3 style="color: #D4AF37; font-size: 16px; margin: 0 0 18px 0; font-family: 'Georgia', serif; letter-spacing: 1px;">📋 PARA MAÑANA</h3>
        <div style="color: #3D4436; font-size: 14px; line-height: 1.8; font-family: 'Arial', sans-serif;">
          <p style="margin: 12px 0;">
            <span style="color: #D4AF37; font-weight: 700; font-size: 16px; font-family: 'Georgia', serif;">I.</span> &nbsp; Llega 5 minutos antes de la hora programada
          </p>
          <p style="margin: 12px 0;">
            <span style="color: #D4AF37; font-weight: 700; font-size: 16px; font-family: 'Georgia', serif;">II.</span> &nbsp; Trae tu cédula o pasaporte
          </p>
          <p style="margin: 12px 0;">
            <span style="color: #D4AF37; font-weight: 700; font-size: 16px; font-family: 'Georgia', serif;">III.</span> &nbsp; Un agente de PropElite te recibirá en la propiedad
          </p>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://wa.me/593984455060?text=Hola%20Paula,%20confirmo%20asistencia%20a%20mi%20visita%20${visitId}%20mañana"
           style="display: inline-block; background: #059669; color: #FFFFFF; padding: 16px 40px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 1px; font-family: 'Arial', sans-serif;">
          CONFIRMAR ASISTENCIA
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 45px 30px; background: #3D4436; border-top: 1px solid rgba(212,175,55,0.3);">
      <p style="color: #D4AF37; font-size: 22px; font-weight: 700; margin: 0 0 10px 0; font-family: 'Georgia', serif; letter-spacing: 2px;">Prop Elite</p>
      <p style="color: #EDE8D0; font-size: 12px; margin: 0 0 18px 0; letter-spacing: 1.5px;">BIENES RAÍCES DE LUJO</p>
      <div style="margin: 20px 0;">
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">📱 WhatsApp: +593 98 445 5060</p>
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">📧 contacto@propelite.ec</p>
        <p style="color: #B8BDB3; font-size: 13px; margin: 5px 0;">🇪🇨 Ecuador • 🇩🇴 República Dominicana</p>
      </div>
      <div style="margin: 25px 0 0 0; padding: 20px 0 0 0; border-top: 1px solid rgba(184,189,179,0.2);">
        <p style="color: #798071; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} PropElite Bienes Raíces. Todos los derechos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>`
  };
}
