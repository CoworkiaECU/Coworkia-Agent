/**
 * 🎯 Prompts Prediseñados para Campañas Publicitarias
 * Mensajes específicos para Instagram/Facebook y otras campañas
 * 🌍 MULTIIDIOMA: Respeta preferredLanguage del usuario
 */

// 🚀 CAMPAÑA PRINCIPAL: 2 HORAS GRATIS
export const CAMPAIGN_PROMPTS = {
  
  // Mensaje 1: ¡Hola Coworkia! quiero probar el servicio
  PROBAR_SERVICIO: {
    trigger: "quiero probar el servicio|want to try the service|essayer le service",
    getResponse: (userLanguage = 'es') => ({
      es: `¡Hola {nombre}! 👋🏼 Soy Aurora, déjame coordinar tu espacio de inmediato.

¿Qué prefieres?

📍 Hot Desk (2 horas gratis en tu primera visita 🎁)
🏢 Sala de Reuniones (3-4 personas, $29 por 2h)

Dime cuál te interesa y agendamos 😊`,
      en: `Hello {nombre}! 👋🏼 I'm Aurora, let me coordinate your space right away.

What do you prefer?

📍 Hot Desk (2 free hours on your first visit 🎁)
🏢 Meeting Room (3-4 people, $29 for 2h)

Tell me which one interests you and we'll schedule it 😊`,
      fr: `Bonjour {nombre}! 👋🏼 Je suis Aurora, je coordonne votre espace immédiatement.

Que préférez-vous?

📍 Hot Desk (2 heures gratuites lors de votre première visite 🎁)
🏢 Salle de Réunion (3-4 personnes, $29 pour 2h)

Dites-moi ce qui vous intéresse et nous planifierons 😊`
    })
  },

  // Mensaje 2: ¡Hola coWorkia! Quiero un espacio privado, con locker propio y pago mensual
  ESPACIO_PRIVADO_MENSUAL: {
    trigger: "espacio privado.*locker.*mensual|private space.*locker.*monthly|espace privé.*casier.*mensuel",
    getResponse: (userLanguage = 'es') => ({
      es: `¡Hola {nombre}! Soy Aurora 👋🏼

Entiendo que buscas un espacio privado con locker y membresía mensual.

Para planes con todo incluido, te conecto con *Aluna* 📋, nuestra especialista en membresías.

O si prefieres, puedes conocer el espacio primero (tu primera visita es gratis 🎁).

¿Qué prefieres?
• Hablar con Aluna sobre planes mensuales
• Agendar una visita para conocer el espacio

Dime y coordinamos 😊`,
      en: `Hello {nombre}! I'm Aurora 👋🏼

I understand you're looking for a private space with a locker and monthly membership.

For all-inclusive plans, I'll connect you with *Aluna* 📋, our membership specialist.

Or if you prefer, you can visit the space first (your first visit is free 🎁).

What do you prefer?
• Talk to Aluna about monthly plans
• Schedule a visit to see the space

Let me know and we'll coordinate 😊`,
      fr: `Bonjour {nombre}! Je suis Aurora 👋🏼

Je comprends que vous cherchez un espace privé avec casier et abonnement mensuel.

Pour les plans tout compris, je vous connecte avec *Aluna* 📋, notre spécialiste des adhésions.

Ou si vous préférez, vous pouvez visiter l'espace d'abord (votre première visite est gratuite 🎁).

Que préférez-vous?
• Parler à Aluna des plans mensuels
• Planifier une visite pour voir l'espace

Dites-moi et nous coordonnerons 😊`
    })
  },

  // Mensaje 3: ¡Hola Paula! Me interesa Casa Jardín (Campaña PropElite)
  CASA_JARDIN_PAULA: {
    trigger: "hola paula.*casa jard[ií]n|hello paula.*casa jard[ií]n",
    targetAgent: 'PAULA', // Activar Paula directamente
    getResponse: (userLanguage = 'es') => ({
      es: `¡Hola {nombre}! Soy Paula de PropElite Bienes Raíces 🏡

¡Excelente elección! *Casas Jardín* en El Morenal es uno de nuestros proyectos más exclusivos 💎

🏗️ Constructor premium: G.M.A. Arquitectos
📍 Urbanización privada exclusiva
✨ YA CONSTRUIDAS - Listas para habitar

Te envío la información de las 4 casas disponibles con sus fichas completas.

📋 ¿Prefieres que te envíe:
• Todas las fichas juntas para comparar
• Una por una con detalles específicos

Dime cómo prefieres y te las envío de inmediato 😊`,
      en: `Hello {nombre}! I'm Paula from PropElite Real Estate 🏡

Excellent choice! *Casas Jardín* in El Morenal is one of our most exclusive projects 💎

🏗️ Premium builder: G.M.A. Arquitectos
📍 Exclusive private urbanization
✨ ALREADY BUILT - Ready to move in

I'll send you information on the 4 available houses with complete details.

📋 Do you prefer that I send you:
• All files together to compare
• One by one with specific details

Let me know how you prefer and I'll send them right away 😊`
    })
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
        getTemplate: campaign.getResponse
      };
    }
  }
  
  return { detected: false };
}

/**
 * 🎨 Personaliza respuesta de campaña con nombre del usuario y respeta idioma
 * 🔍 Detecta si es cliente recurrente y NO ofrece trial gratis
 * @param {Function} getTemplate - Función que retorna templates por idioma
 * @param {Object} userProfile - Perfil del usuario con preferredLanguage
 */
export function personalizeCampaignResponse(getTemplate, userProfile) {
  const userName = userProfile?.name || '';
  const userLanguage = userProfile?.preferredLanguage || 'es';
  
  // Obtener template en el idioma correcto
  const templates = getTemplate(userLanguage);
  const template = templates[userLanguage] || templates.es; // Fallback a español
  
  console.log('[CAMPAIGN] 🎯 Template personalizado:', { userName, userLanguage });
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

¿Cuál prefieres? te agendo de inmediato 😊`;
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
    // Hot Desk es INDIVIDUAL - solo 1 persona, precio fijo $10
    return 10;
  } else if (serviceType === 'meetingRoom') {
    return 29; // $29 fijo por sala
  }
  
  return 0;
}