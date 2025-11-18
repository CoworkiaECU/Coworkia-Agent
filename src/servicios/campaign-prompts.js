/**
 * 🎯 Prompts Prediseñados para Campañas Publicitarias
 * Mensajes específicos para Instagram/Facebook y otras campañas
 */

// 🚀 CAMPAÑA PRINCIPAL: 2 HORAS GRATIS
export const CAMPAIGN_PROMPTS = {
  
  // Mensaje 1: ¡Hola Coworkia! quiero probar el servicio
  PROBAR_SERVICIO: {
    trigger: "quiero probar el servicio",
    response: `¡Hola {nombre}, soy Aurora! 👩🏼‍💼✨

Qué bueno que quieres conocer Coworkia. Como es tu primera vez, te regalo 2 horas gratis para que pruebes el espacio 🎉

📋 *Tus 2 horas gratis incluyen:*
🪑 Hot Desk (espacio compartido)
📶 WiFi de alta velocidad
☕ Café ilimitado

¿Qué día te gustaría venir?
¿A qué hora prefieres llegar?

Solo necesito esos dos datos y tu email para enviarte la confirmación 😊`
  },

  // Mensaje 2: ¡Hola coWorkia! Quiero un espacio privado, con locker propio y pago mensual
  ESPACIO_PRIVADO_MENSUAL: {
    trigger: "espacio privado.*locker.*mensual",
    response: `¡Hola {nombre}, soy Aurora! 👩🏼‍💼✨

Perfecto, entiendo que buscas un espacio privado con todo incluido. Para planes mensuales con locker, te puedo conectar con *Aluna*, ella es nuestra especialista en membresías y te va a dar todos los detalles 👱🏼‍♀️

Y mira, como es tu primera vez, también tienes 2 horas gratis para que conozcas Coworkia antes de decidirte 🎉

¿Qué prefieres?
• Hablar con Aluna sobre planes mensuales
• Probar gratis primero (solo dime cuándo quieres venir)

Como gustes, estoy para ayudarte 😊`
  }
};

/**
 * 🎯 Detecta si un mensaje coincide con campaña publicitaria
 */
export function detectCampaignMessage(message) {
  const messageLower = message.toLowerCase();
  
  for (const [key, campaign] of Object.entries(CAMPAIGN_PROMPTS)) {
    const regex = new RegExp(campaign.trigger, 'i');
    if (regex.test(messageLower)) {
      return {
        detected: true,
        campaign: key,
        template: campaign.response
      };
    }
  }
  
  return { detected: false };
}

/**
 * 🎨 Personaliza respuesta de campaña con nombre del usuario
 * 🔍 Detecta si es cliente recurrente y NO ofrece trial gratis
 */
export function personalizeCampaignResponse(template, userProfile) {
  const userName = userProfile?.name || 'nuevo usuario';
  
  // 🔍 VERIFICAR SI ES CLIENTE RECURRENTE
  const hasHistory = userProfile?.reservationHistory?.length > 0;
  const notFirstVisit = userProfile?.firstVisit === false;
  const usedTrial = userProfile?.freeTrialUsed;
  
  // Si NO es primera visita O ya usó trial O tiene historial → Cliente recurrente
  if (notFirstVisit || usedTrial || hasHistory) {
    console.log('[CAMPAIGN] 🔄 Cliente recurrente detectado - NO ofrecer trial gratis', {
      notFirstVisit,
      usedTrial,
      hasHistory
    });
    
    return `¡Hola ${userName}, qué bueno que estás de vuelta! 😊

Como eres cliente recurrente, ya no aplica la prueba gratis. Tus opciones son:

📍 *Hot Desk* → $10 por 2 horas (1-2 personas)
🏢 *Sala Reuniones* → $29 por 2 horas (3-4 personas)

¿Cuál te reservo?`;
  }
  
  // Cliente nuevo - aplicar campaña normal
  console.log('[CAMPAIGN] ✨ Cliente nuevo detectado - Aplicar trial gratis');
  return template.replace(/{nombre}/g, userName);
}

/**
 * 🔍 Genera respuesta especial si ya usó el trial gratis
 * FLUJO PERSUASIVO: Reconocer → Informar → Cobrar → Validar → Agendar
 */
export function getTrialUsedResponse(userProfile) {
  const userName = userProfile?.name || '';
  const lastReservation = userProfile?.lastReservation;
  
  if (!lastReservation) {
    return null;
  }
  
  const fecha = lastReservation.date || 'fecha anterior';
  const hora = lastReservation.startTime || '';
  const email = userProfile.email || 'tu email';
  const serviceType = lastReservation.serviceType === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones';
  const wasFree = lastReservation.wasFree;
  
  return `¡Hola${userName ? ' ' + userName : ''}, soy Aurora! 😊

Qué bueno verte de nuevo. Veo que el *${fecha}* a las *${hora}* disfrutaste tu *${serviceType}${wasFree ? ' GRATIS* 🎉' : '*'}

📋 *Para tu próxima visita:*

📍 *Hot Desk* → $10 por 2 horas
🏢 *Sala de Reuniones* → $29 por 2 horas (3-4 personas)

¿Cuál prefieres?

Te envío el link de pago 💳 y cuando me muestres tu comprobante, te agendo de inmediato 😊`;
}

/**
 * 💳 Detecta si usuario recurrente eligió espacio y debe recibir link de pago
 */
export function shouldSendPaymentLink(message, profile) {
  // Solo para usuarios recurrentes que ya usaron trial
  const hasHistory = profile?.reservationHistory?.length > 0;
  const usedTrial = profile?.freeTrialUsed || hasHistory;
  
  if (!usedTrial) return null;

  const msgLower = message.toLowerCase().trim();
  
  // Patrones de elección de Hot Desk
  const hotDeskPatterns = [
    'hot desk',
    'hotdesk',
    'escritorio',
    'hot-desk',
    'el hot',
    'prefiero hot',
    'quiero hot'
  ];
  
  // Patrones de elección de Sala
  const meetingRoomPatterns = [
    'sala',
    'reunion',
    'reunión',
    'meeting',
    'la sala',
    'prefiero sala',
    'quiero sala'
  ];
  
  // Detectar elección de Hot Desk
  if (hotDeskPatterns.some(p => msgLower.includes(p))) {
    return {
      serviceType: 'hotDesk',
      price: 10,
      message: `¡Perfecto! 😊

📍 *Hot Desk* (2 horas) = *$10*

💳 *Paga aquí:*
https://ppls.me/hnMI9yMRxbQ6rgIVi6L2DA

Cuando hayas pagado, envíame la captura del comprobante 📸 y te agendo de inmediato`
    };
  }
  
  // Detectar elección de Sala
  if (meetingRoomPatterns.some(p => msgLower.includes(p))) {
    return {
      serviceType: 'meetingRoom',
      price: 29,
      message: `¡Perfecto! 😊

🏢 *Sala de Reuniones* (2 horas, 3-4 personas) = *$29*

💳 *Paga aquí:*
https://ppls.me/hnMI9yMRxbQ6rgIVi6L2DA

Cuando hayas pagado, envíame la captura del comprobante 📸 y te agendo de inmediato`
    };
  }
  
  return null;
}

/**
 * 🎫 Genera ticket consolidado para múltiples reservas
 */
export function generateConsolidatedTicket(reservations) {
  if (!reservations || reservations.length === 0) return null;
  
  let ticket = `📋 *RESUMEN DE TUS RESERVAS:*\n\n`;
  let total = 0;
  let hasFreeReservation = false;
  
  reservations.forEach((res, index) => {
    const num = index + 1;
    const emoji = num === 1 ? '1️⃣' : num === 2 ? '2️⃣' : num === 3 ? '3️⃣' : `${num}️⃣`;
    
    // Formatear fecha
    const fecha = res.date || 'Fecha pendiente';
    const hora = res.time || res.startTime || 'Hora pendiente';
    
    // Determinar tipo de espacio
    const espacio = res.serviceType === 'hotDesk' ? 'Hot Desk' :
                    res.serviceType === 'meetingRoom' ? 'Sala de Reuniones' :
                    res.spaceType === 'hotDesk' ? 'Hot Desk' :
                    res.spaceType === 'meetingRoom' ? 'Sala de Reuniones' : 'Hot Desk';
    
    // Determinar número de personas
    const personas = res.numPeople || res.guestCount || 1;
    const personasTexto = personas === 1 ? 'solo tú' : `${personas} personas`;
    
    // Calcular precio
    let precio;
    if (res.wasFree || res.isFree) {
      precio = 'GRATIS 🎉';
      hasFreeReservation = true;
    } else {
      // Lógica de precios
      if (espacio === 'Hot Desk') {
        precio = `$${personas * 10}`;
        total += personas * 10;
      } else if (espacio === 'Sala de Reuniones') {
        precio = '$29';
        total += 29;
      } else {
        precio = res.price ? `$${res.price}` : 'Precio pendiente';
        if (res.price) total += res.price;
      }
    }
    
    ticket += `${emoji} ${fecha} ${hora} - ${espacio} (${personasTexto}) = ${precio}\n`;
  });
  
  // Agregar total
  if (total > 0) {
    ticket += `\n💰 *TOTAL A PAGAR: $${total.toFixed(2)}*\n\n`;
    
    // Calcular recargo 5% para tarjeta
    const totalConRecargo = (total * 1.05).toFixed(2);
    
    ticket += `💳 *FORMAS DE PAGO:*\n`;
    ticket += `• Transferencia/Payphone: *$${total.toFixed(2)}*\n`;
    ticket += `• Tarjeta débito/crédito: *$${totalConRecargo}* (+5% recargo)\n\n`;
    
    ticket += `📸 Envíame el comprobante cuando hayas pagado`;
  } else if (hasFreeReservation && reservations.length === 1) {
    ticket += `\n🎉 ¡Tu primera visita es totalmente gratis!\n`;
    ticket += `Solo necesito confirmar tu email y estarás listo`;
  }
  
  return ticket;
}

/**
 * 📊 Calcula precio individual de una reserva
 */
export function calculateReservationPrice(serviceType, numPeople = 1, wasFree = false) {
  if (wasFree) return 0;
  
  if (serviceType === 'hotDesk') {
    return numPeople * 10; // $10 por persona
  } else if (serviceType === 'meetingRoom') {
    return 29; // $29 fijo por sala
  }
  
  return 0;
}