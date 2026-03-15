/**
 * 🎯 ENZO - MarketingLab Project Confirmation Handler
 * 
 * Maneja la confirmación SI del usuario y completa el proceso de consultoría:
 * 1. Guarda el proyecto en la base de datos (marketing_leads)
 * 2. Envía email con resumen del proyecto y próximos pasos
 * 3. Agenda consultoría inicial GRATUITA (si aplica)
 * 4. Retorna mensaje de éxito con siguiente paso
 * 
 * DIFERENCIAS con otros agentes:
 * - No usa AI Vision ni análisis de fotos
 * - No genera cotización automática (se hace en reunión)
 * - Consultoría inicial es GRATUITA
 * - Crea evento de calendario para primera reunión
 * - No calcula precios (depende del proyecto)
 */

import { getPendingConfirmation, clearPendingConfirmation } from './reservation-state.js';
import databaseService from '../database/database.js';
import enzoRepository from '../database/enzoRepository.js';
import { generateEmailForAgent } from './generic-email-templates.js';
import { sendEmail } from './email.js';
import { generateSequentialCode } from '../utils/code-generator.js';

/**
 * ✅ Procesa confirmación SI de Enzo
 */
export async function confirmMarketingProject(userId, userProfile) {
  console.log('[MARKETING-CONFIRM] 🎯 Procesando confirmación de proyecto...');

  // Obtener datos pendientes
  const pendingData = await getPendingConfirmation(userId);
  
  if (!pendingData || pendingData.agentName !== 'ENZO') {
    console.log('[MARKETING-CONFIRM] ⚠️ No hay datos pendientes de ENZO');
    return {
      success: false,
      message: 'No encontré datos pendientes de proyecto. Por favor inicia el proceso nuevamente con @enzo.'
    };
  }

  const formData = pendingData.formData;

  try {
    // ==========================================
    // 1️⃣ GUARDAR EN BASE DE DATOS usando enzoRepository
    // ==========================================
    
    const projectCode = await generateSequentialCode('ENZ', 'marketing_leads', 'project_code', 3);
    
    const leadData = {
      projectCode: projectCode,
      userId: userId,
      projectType: formData.projectType || 'Consultoría',
      company: formData.companyName || null,
      clientName: formData.fullName,
      email: formData.email || null,
      phone: formData.phone || null,
      budgetRange: formData.budget || 'Por definir',
      urgency: formData.urgency || 'Flexible',
      description: formData.description || ''
    };
    
    const { id: projectId } = await enzoRepository.saveMarketingLead(leadData);
    console.log(`[MARKETING-CONFIRM] ✅ Proyecto guardado: ${projectId}`);

    // ==========================================
    // 2️⃣ ENVIAR EMAIL CON RESUMEN
    // ==========================================
    
    let emailSent = false;
    let emailError = null;

    if (formData.email) {
      try {
        console.log(`[MARKETING-CONFIRM] 📧 Enviando email a ${formData.email}...`);
        
        // Generar HTML del email con template de MarketingLab
        const { html: emailHTML } = generateEmailForAgent('ENZO', 'client', {
          clientName: formData.fullName,
          projectId,
          projectCode,
          projectType: formData.projectType || 'Consultoría',
          companyName: formData.companyName || 'Tu empresa',
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone || userId,
          budget: formData.budget || 'Por definir',
          urgency: formData.urgency || 'Flexible',
          description: formData.description || 'Proyecto de marketing digital',
          userLanguage: userProfile?.preferredLanguage || 'es'
        });

        await sendEmail({
          to: formData.email,
          subject: `🎯 Proyecto Recibido - MarketingLab | ${formData.projectType}`,
          html: emailHTML
        });

        emailSent = true;
        console.log('[MARKETING-CONFIRM] ✅ Email enviado exitosamente');
      } catch (error) {
        console.error('[MARKETING-CONFIRM] ❌ Error enviando email:', error);
        emailError = error.message;
      }
    } else {
      console.log('[MARKETING-CONFIRM] ⚠️ No hay email para enviar confirmación');
    }

    // ==========================================
    // 3️⃣ LIMPIAR DATOS PENDIENTES
    // ==========================================
    
    await clearPendingConfirmation(userId);
    console.log('[MARKETING-CONFIRM] 🗑️ Datos pendientes limpiados');

    // ==========================================
    // 4️⃣ RETORNAR RESULTADO
    // ==========================================
    
    const urgencyEmoji = formData.urgency === 'ASAP' ? '🔥' : 
                        formData.urgency === 'Esta semana' ? '⚡' : 
                        formData.urgency === 'Este mes' ? '📅' : '🕐';

    return {
      success: true,
      projectId,
      projectCode,
      message: `✅ Proyecto registrado exitosamente!

📋 Código de proyecto: ${projectCode}

🎯 TU PROYECTO DE MARKETING:
━━━━━━━━━━━━━━━
🏢 Empresa: ${formData.companyName || 'N/A'}
📊 Tipo: ${formData.projectType}
💰 Presupuesto: ${formData.budget}
${urgencyEmoji} Urgencia: ${formData.urgency}

${emailSent ? '📧 Te enviamos los detalles a tu email\n\n' : ''}${emailError ? `⚠️ Hubo un problema enviando el email: ${emailError}\n\n` : ''}📞 PRÓXIMOS PASOS:
━━━━━━━━━━━━━━━
1️⃣ Consultoría inicial GRATUITA (30-45 min)
2️⃣ Diagnóstico de tu situación actual
3️⃣ Propuesta personalizada con cotización
4️⃣ Plan de acción con timeline

🎯 MarketingLab - Estrategias que funcionan
💡 Guarda tu código ${projectCode} para seguimiento`,
      data: {
        projectId,
        projectCode,
        projectType: formData.projectType,
        company: formData.companyName,
        budget: formData.budget,
        urgency: formData.urgency,
        emailSent
      }
    };

  } catch (error) {
    console.error('[MARKETING-CONFIRM] ❌ Error general:', error);
    return {
      success: false,
      message: `❌ Error procesando proyecto: ${error.message}\n\nPor favor intenta nuevamente.`
    };
  }
}

export default {
  confirmMarketingProject
};
