/**
 * 🎯 Prompts Prediseñados para Campañas Publicitarias
 * Mensajes específicos para Instagram/Facebook y otras campañas
 */

// 🚀 CAMPAÑA PRINCIPAL: DÍA GRATIS
export const CAMPAIGN_PROMPTS = {
  
  // Mensaje 1: ¡Hola Coworkia! quiero probar el servicio
  PROBAR_SERVICIO: {
    trigger: "quiero probar el servicio",
    response: `¡Hola {nombre}, soy Aurora! 👩🏼‍💼✨ 

¡Perfecto! Como es tu primera vez en Coworkia, puedes disfrutar de un DÍA COMPLETAMENTE GRATIS 🎉

📋 **Tu día gratis incluye:**
• Hot Desk (espacio compartido)
• WiFi de alta velocidad
• Café ilimitado ☕
• Acceso a todas nuestras instalaciones

📅 Para activar tu día gratis, solo necesito que me digas:
¿Qué día te gustaría venir? (lunes a sábado)
¿A qué hora prefieres llegar? (8am-6pm)

¡Es súper fácil! ¿Cuándo te gustaría probar Coworkia? 🚀`
  },

  // Mensaje 2: ¡Hola coWorkia! Quiero un espacio privado, con locker propio y pago mensual
  ESPACIO_PRIVADO_MENSUAL: {
    trigger: "espacio privado.*locker.*mensual",
    response: `¡Hola {nombre}, soy Aurora! 👩🏼‍💼✨ 

Genial, veo que buscas una solución completa y profesional. Para espacios privados con locker y pago mensual, te conecto con **Aluna**, nuestra especialista en membresías 👱🏼‍♀️

Pero antes... ¡como es tu primera vez, puedes probar GRATIS por un día! Así conoces nuestras instalaciones antes de decidir 🎉

¿Te gustaría que te conecte directamente con Aluna para los planes mensuales, o prefieres primero probar tu día gratis?

**Para día gratis:** Solo dime cuándo quieres venir
**Para planes mensuales:** Te derivo con Aluna ahora mismo

¿Qué prefieres? 😊`
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
 */
export function personalizeCampaignResponse(template, userProfile) {
  const userName = userProfile?.name || 'nuevo usuario';
  return template.replace(/{nombre}/g, userName);
}