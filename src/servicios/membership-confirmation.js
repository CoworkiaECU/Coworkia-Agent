/**
 * 💼 ALUNA - Coworkia Membership Confirmation Handler
 * 
 * Maneja la confirmación SI del usuario y completa el proceso de venta:
 * 1. Guarda el lead en la base de datos (membership_leads)
 * 2. Envía email a admin de Coworkia con datos del prospecto
 * 3. Agenda tour del espacio en Google Calendar
 * 4. Envía email al cliente confirmando visita
 * 5. Retorna mensaje de éxito con link de pago y próximos pasos
 */

import { getPendingConfirmation, clearPendingConfirmation } from './reservation-state.js';
import databaseService from '../database/database.js';
import { generateEmailForAgent } from './generic-email-templates.js';
import { sendEmail } from './email.js';
import { createCalendarEvent } from './google-calendar.js';

/**
 * 🔢 Genera código secuencial de lead de membresía
 */
async function generateLeadCode() {
  const year = new Date().getFullYear();
  const prefix = `MB-${year}-`;
  
  const query = `
    SELECT id FROM membership_leads 
    WHERE id LIKE ? 
    ORDER BY id DESC 
    LIMIT 1
  `;
  
  const result = await databaseService.get(query, [`${prefix}%`]);
  
  if (result && result.id) {
    const lastNumber = parseInt(result.id.split('-')[2]);
    return `${prefix}${String(lastNumber + 1).padStart(3, '0')}`;
  }
  
  return `${prefix}001`;
}

/**
 * 💰 Obtiene precio y beneficios por tipo de membresía
 */
function getMembershipDetails(membershipType) {
  const plans = {
    'plan10': {
      name: 'Plan 10',
      price: '$140 USD/mes',
      days: '10+1 días gratis = 11 días completos',
      hours: 'Día completo por visita',
      benefits: [
        'Locker O cajonera privada',
        '2 invitados gratis/mes',
        '2 usos sala reuniones/mes',
        'WiFi + café incluido',
        'Secretaria Virtual IA (9+ meses)'
      ]
    },
    'plan20': {
      name: 'Plan 20',
      price: '$250 USD/mes',
      days: '20+2 días gratis = 22 días completos',
      hours: 'Día completo por visita',
      benefits: [
        'Locker O cajonera privada',
        '4 invitados gratis/mes',
        '4 usos sala reuniones/mes',
        'WiFi + café incluido',
        'Secretaria Virtual IA (9+ meses)'
      ]
    },
    'oficinavirtual': {
      name: 'Oficina Virtual',
      price: '$365 USD/año',
      days: 'Solo dirección comercial',
      hours: 'Sala reuniones incluida (una vez por mes por 2 horas)',
      benefits: [
        'Dirección comercial oficial',
        'Recepción y notificación de correspondencia',
        'Cumplimiento legal con SRI',
        'Ideal para empresas remotas',
        'Sala reuniones incluida sin adicional (una vez por mes por 2 horas)'
      ]
    },
    'salareuniones': {
      name: 'Sala de Reuniones',
      price: '$39 USD/sesión',
      days: 'Reserva por sesión',
      hours: '2 horas - capacidad 3-4 personas',
      benefits: [
        'WiFi de alta velocidad',
        'Pantalla para presentaciones',
        'Espacio profesional',
        'Reserva previa necesaria'
      ]
    }
  };

  const normalizedType = membershipType.toLowerCase().replace(/[\s-]/g, '');
  return plans[normalizedType] || plans['plan10'];
}

/**
 * ✅ Procesa confirmación SI de Aluna
 */
export async function confirmMembershipLead(userId, userProfile) {
  console.log('[MEMBERSHIP-CONFIRM] 💼 Procesando confirmación de membresía...');

  // Obtener datos pendientes
  const pendingData = await getPendingConfirmation(userId);
  
  if (!pendingData || pendingData.agentName !== 'ALUNA') {
    console.log('[MEMBERSHIP-CONFIRM] ⚠️ No hay datos pendientes de ALUNA');
    return {
      success: false,
      message: 'No encontré datos pendientes de membresía. Por favor inicia el proceso nuevamente con @aluna.'
    };
  }

  const formData = pendingData.formData;

  try {
    // ==========================================
    // 1️⃣ GUARDAR EN BASE DE DATOS
    // ==========================================
    
    const leadId = await generateLeadCode();
    const membershipDetails = getMembershipDetails(formData.membershipType);
    
    const insertQuery = `
      INSERT INTO membership_leads (
        id, user_phone, membership_type, start_date, client_name, 
        email, phone, special_requirements, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = new Date().toISOString();

    const insertParams = [
      leadId,
      userId,
      membershipDetails.name,
      formData.startDate || null,
      formData.fullName,
      formData.email || null,
      formData.phone,
      formData.specialRequirements || null,
      'pending_visit',
      now,
      now
    ];

    await databaseService.run(insertQuery, insertParams);
    console.log(`[MEMBERSHIP-CONFIRM] ✅ Lead guardado: ${leadId}`);

    // ==========================================
    // 2️⃣ ENVIAR EMAIL A ADMIN COWORKIA
    // ==========================================
    
    const adminEmail = process.env.COWORKIA_ADMIN_EMAIL || 'admin@coworkia.com';
    
    const emailToAdmin = await generateEmailForAgent('ALUNA', 'admin', {
      leadId,
      membershipType: membershipDetails.name,
      price: membershipDetails.price,
      clientName: formData.fullName,
      email: formData.email || 'No proporcionado',
      phone: formData.phone,
      startDate: formData.startDate || 'Flexible',
      specialRequirements: formData.specialRequirements || 'Ninguno',
      whatsappLink: `https://wa.me/${userId.replace('+', '')}`
    });

    await sendEmail(adminEmail, emailToAdmin.subject, emailToAdmin.html);
    console.log('[MEMBERSHIP-CONFIRM] 📧 Email enviado a admin');

    // ==========================================
    // 3️⃣ AGENDAR TOUR EN GOOGLE CALENDAR
    // ==========================================
    
    let calendarEventLink = null;
    
    try {
      // Calcular fecha del tour (mañana a las 10am o fecha preferida)
      const tourDate = formData.startDate 
        ? new Date(formData.startDate)
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana
      
      tourDate.setHours(10, 0, 0, 0); // 10:00 AM

      const calendarEvent = await createCalendarEvent({
        summary: `Tour Coworkia - ${formData.fullName} (${membershipDetails.name})`,
        description: `Tour del espacio con prospecto de ${membershipDetails.name}\n\nCliente: ${formData.fullName}\nTeléfono: ${formData.phone}\nEmail: ${formData.email || 'No proporcionado'}\n\nLead ID: ${leadId}\nWhatsApp: https://wa.me/${userId.replace('+', '')}`,
        start: tourDate.toISOString(),
        durationMinutes: 60,
        attendees: formData.email ? [formData.email] : []
      });

      calendarEventLink = calendarEvent?.link || null;
      console.log('[MEMBERSHIP-CONFIRM] 📅 Tour agendado en calendario');
    } catch (calError) {
      console.error('[MEMBERSHIP-CONFIRM] ⚠️ Error al agendar tour:', calError.message);
      // Continuar sin calendario
    }

    // ==========================================
    // 4️⃣ ENVIAR EMAIL AL CLIENTE
    // ==========================================
    
    if (formData.email) {
      const emailToClient = await generateEmailForAgent('ALUNA', 'client', {
        clientName: formData.fullName,
        membershipType: membershipDetails.name,
        price: membershipDetails.price,
        benefits: membershipDetails.benefits,
        tourDate: formData.startDate || 'Te contactaremos en 24h',
        calendarLink: calendarEventLink
      });

      await sendEmail(formData.email, emailToClient.subject, emailToClient.html);
      console.log('[MEMBERSHIP-CONFIRM] 📧 Email de confirmación enviado al cliente');
    }

    // ==========================================
    // 5️⃣ LIMPIAR DATOS PENDIENTES
    // ==========================================
    
    await clearPendingConfirmation(userId);

    // ==========================================
    // 6️⃣ GENERAR RESPUESTA DE ÉXITO
    // ==========================================
    
    const nextStep = formData.startDate 
      ? `visitarnos el ${new Date(formData.startDate).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}`
      : 'coordinar tu visita';

    return {
      success: true,
      message: `¡Excelente ${formData.fullName}! 🎉

Tu solicitud de **${membershipDetails.name}** ha sido confirmada.

📋 **Resumen:**
• Plan: ${membershipDetails.name}
• Precio: ${membershipDetails.price}
• Días: ${membershipDetails.days}
• Horario: ${membershipDetails.hours}

✨ **Beneficios incluidos:**
${membershipDetails.benefits.map(b => `• ${b}`).join('\n')}

📞 **Próximos pasos:**
1. Te contacto en las próximas 4-8 horas para ${nextStep}
2. Haremos un tour del espacio (30-45 min)
3. Responderé todas tus preguntas en persona
4. Si todo está bien, procesamos el pago y ¡empiezas!

💳 **Link de pago:** (Te lo envío después del tour)

💡 **Recuerda:** 
• Garantía devolución dinero primeros 15 días
• Tu precio se congela mientras seas miembro
• Sin compromiso de permanencia (cancelas cuando quieras)

🏢 **Ubicación:** Coworkia Business Center, [dirección exacta en el tour]

¿Hay algo más que quieras saber antes del tour?`
    };

  } catch (error) {
    console.error('[MEMBERSHIP-CONFIRM] ❌ Error:', error);
    return {
      success: false,
      message: `Hubo un error al procesar tu solicitud: ${error.message}. Por favor intenta de nuevo o contáctanos directamente.`
    };
  }
}

export default {
  confirmMembershipLead
};
