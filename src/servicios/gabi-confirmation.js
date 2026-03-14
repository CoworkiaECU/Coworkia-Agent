/**
 * ⚖️ GABI - GR Consulting Legal/Accounting Confirmation Handler
 * 
 * Maneja la confirmación SI del usuario y completa el proceso de consultoría:
 * 1. Guarda la consulta en la base de datos (legal_leads)
 * 2. Envía email a admin con resumen + link WhatsApp
 * 3. Envía email al cliente confirmando recepción
 * 4. Agenda reunión inicial GRATUITA (30 min) 48h después
 * 5. Retorna mensaje de éxito con código de consulta
 * 
 * DIFERENCIAS con otros agentes:
 * - No usa AI Vision ni análisis de fotos
 * - No genera cotización automática (primera consulta gratis)
 * - RUC es opcional (personas naturales también consultan)
 * - Crea evento de calendario para reunión inicial
 * - Servicios especializados se cotizan después según alcance
 */

import { getPendingConfirmation, clearPendingConfirmation } from './reservation-state.js';
import databaseService from '../database/database.js';
import gabiRepository from '../database/gabiRepository.js';
import { generateEmailForAgent } from './generic-email-templates.js';
import { sendEmail } from './email.js';
import { createCalendarEvent } from './google-calendar.js';
import { generateSequentialCode } from '../utils/code-generator.js';

/**
 * ✅ Procesa confirmación SI de Gabi
 */
export async function confirmLegalConsultation(userId, userProfile) {
  console.log('[LEGAL-CONFIRM] ⚖️ Procesando confirmación de consulta...');

  // Obtener datos pendientes
  const pendingData = await getPendingConfirmation(userId);
  
  if (!pendingData || pendingData.agentName !== 'GABI') {
    console.log('[LEGAL-CONFIRM] ⚠️ No hay datos pendientes de GABI');
    return {
      success: false,
      message: 'No encontré datos pendientes de consulta. Por favor inicia el proceso nuevamente con @gabi.'
    };
  }

  const formData = pendingData.formData;

  try {
    // ==========================================
    // 1️⃣ GUARDAR EN BASE DE DATOS usando gabiRepository
    // ==========================================
    
    const consultationCode = await generateSequentialCode('GAB', 'legal_leads', 'consultation_code', 3);
    
    const leadData = {
      consultationCode: consultationCode,
      userId: userId,
      consultationType: formData.consultationType || 'General',
      company: formData.companyName || null,
      ruc: formData.ruc || null,
      clientName: formData.fullName,
      email: formData.email || null,
      phone: formData.phone || userId,
      description: formData.description || '',
      urgency: formData.urgency || 'Normal'
    };
    
    const { id: consultationId } = await gabiRepository.saveLegalLead(leadData);
    console.log(`[LEGAL-CONFIRM] ✅ Consulta guardada: ${consultationId}`);

    // ==========================================
    // 2️⃣ ENVIAR EMAIL A ADMIN
    // ==========================================
    
    const adminEmail = process.env.COWORKIA_ADMIN_EMAIL || 'coworkia.ec@gmail.com';
    
    // Preparar datos de RUC validado (si existe)
    const rucInfo = formData._rucValidated && formData._rucData 
      ? `${formData.ruc} - ${formData._rucData.razonSocial} (${formData._rucData.estado})` 
      : (formData.ruc || 'No proporcionado');
    
    const emailToAdmin = await generateEmailForAgent('GABI', 'admin', {
      consultationId: consultationCode,
      consultationType: formData.consultationType || 'General',
      clientName: formData.fullName,
      companyName: formData.companyName || 'Persona Natural',
      ruc: rucInfo,
      rucValidated: formData._rucValidated === true ? '✅ Validado en SRI' : (formData._rucValidated === false ? '⚠️ RUC inválido' : ''),
      email: formData.email || 'No proporcionado',
      phone: formData.phone || userId,
      description: formData.description || 'Sin descripción',
      urgency: formData.urgency || 'Normal',
      whatsappLink: `https://wa.me/${userId.replace('+', '')}`
    });

    await sendEmail({ to: adminEmail, subject: emailToAdmin.subject, html: emailToAdmin.html });
    console.log('[LEGAL-CONFIRM] 📧 Email enviado a admin');

    // ==========================================
    // 3️⃣ AGENDAR REUNIÓN INICIAL EN GOOGLE CALENDAR
    // ==========================================
    
    let calendarEventLink = null;
    
    try {
      // Calcular fecha para reunión inicial (48h después)
      const meetingDate = new Date();
      meetingDate.setDate(meetingDate.getDate() + 2);
      meetingDate.setHours(10, 0, 0, 0); // 10:00 AM

      const dateStr = meetingDate.toISOString().split('T')[0];
      
      const calendarEvent = await createCalendarEvent({
        userName: formData.fullName,
        email: formData.email || 'noemail@coworkia.com',
        date: dateStr,
        startTime: '10:00',
        endTime: '10:30',
        serviceType: 'Consultoría Legal/Contable',
        duration: '30 minutos',
        price: 0, // Primera consulta GRATUITA
        customDescription: `Consulta: ${formData.consultationType}\nEmpresa: ${formData.companyName || 'Persona Natural'}\nUrgencia: ${formData.urgency}\n\nCódigo: ${consultationCode}`,
        colorId: '6' // Naranja para consultas legales
      });

      calendarEventLink = calendarEvent?.eventUrl || null;
      console.log('[LEGAL-CONFIRM] 📅 Reunión agendada en calendario');
    } catch (calError) {
      console.error('[LEGAL-CONFIRM] ⚠️ Error al agendar reunión:', calError.message);
      // Continuar sin calendario
    }

    // ==========================================
    // 4️⃣ ENVIAR EMAIL AL CLIENTE
    // ==========================================
    
    let emailSent = false;
    
    if (formData.email) {
      try {
        const emailToClient = await generateEmailForAgent('GABI', 'client', {
          clientName: formData.fullName,
          consultationCode,
          consultationType: formData.consultationType || 'General',
          urgency: formData.urgency || 'Normal',
          meetingDate: calendarEventLink ? '48 horas' : 'A confirmar',
          calendarLink: calendarEventLink || null
        });

        await sendEmail({ to: formData.email, subject: emailToClient.subject, html: emailToClient.html });
        console.log('[LEGAL-CONFIRM] 📧 Email enviado a cliente');
        emailSent = true;
      } catch (emailError) {
        console.error('[LEGAL-CONFIRM] ⚠️ Error enviando email a cliente:', emailError.message);
        // Continuar sin email
      }
    }

    // ==========================================
    // 5️⃣ LIMPIAR DATOS PENDIENTES
    // ==========================================
    
    await clearPendingConfirmation(userId);

    // ==========================================
    // 6️⃣ RETORNAR MENSAJE DE ÉXITO
    // ==========================================
    
    const responseTimeMap = {
      'Urgente': '24 horas',
      'Normal': '72 horas',
      'Planificación': '1 semana'
    };
    
    const responseTime = responseTimeMap[formData.urgency] || '72 horas';
    
    return {
      success: true,
      consultationId: consultationCode,
      message: `✅ ¡Listo ${formData.fullName.split(' ')[0]}!

Tu consulta de *${formData.consultationType}* fue registrada exitosamente.

📋 Código de consulta: *${consultationCode}*
${formData.companyName ? `🏢 Empresa: ${formData.companyName}` : ''}
⏰ Tiempo de respuesta: ${responseTime}
💡 Primera consulta: *GRATUITA* (30 min)

${emailSent ? `📧 Te enviamos confirmación a ${formData.email}\n\n` : ''}${calendarEventLink ? '📅 Reunión inicial agendada para dentro de 48h\n\n' : ''}⚖️ GR Consulting
Gabi te contactará pronto para coordinar la reunión inicial.

💡 Guarda tu código ${consultationCode} como referencia`,
      data: {
        consultationId: consultationCode,
        consultationType: formData.consultationType,
        companyName: formData.companyName,
        ruc: formData.ruc,
        urgency: formData.urgency,
        responseTime,
        emailSent,
        calendarScheduled: !!calendarEventLink
      }
    };

  } catch (error) {
    console.error('[LEGAL-CONFIRM] ❌ Error en confirmación:', error);
    
    return {
      success: false,
      message: 'Hubo un error procesando tu consulta. Por favor intenta nuevamente o contacta directamente a soporte.',
      error: error.message
    };
  }
}

export default {
  confirmLegalConsultation
};
