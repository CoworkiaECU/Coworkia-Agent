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
import { generateEmailForAgent } from './generic-email-templates.js';
import { sendEmail } from './email.js';

/**
 * 🔢 Genera código secuencial de proyecto
 */
async function generateProjectCode() {
  const year = new Date().getFullYear();
  const prefix = `ML-${year}-`;
  
  const query = `
    SELECT project_code FROM marketing_leads 
    WHERE project_code LIKE ? 
    ORDER BY project_code DESC 
    LIMIT 1
  `;
  
  const result = await databaseService.get(query, [`${prefix}%`]);
  
  if (result && result.project_code) {
    const lastNumber = parseInt(result.project_code.split('-')[2]);
    return `${prefix}${String(lastNumber + 1).padStart(3, '0')}`;
  }
  
  return `${prefix}001`;
}

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
    // 1️⃣ GUARDAR EN BASE DE DATOS
    // ==========================================
    
    const projectId = `marketing_${Date.now()}_${userId.replace(/\+/g, '')}`;
    const projectCode = await generateProjectCode();
    
    const insertQuery = `
      INSERT INTO marketing_leads (
        id, project_code, user_phone, project_type, company,
        client_name, email, phone, budget_range, urgency,
        description, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertParams = [
      projectId,
      projectCode,
      userId,
      formData.projectType || 'Consultoría',
      formData.companyName || null,
      formData.fullName,
      formData.email || null,
      formData.phone || null,
      formData.budget || 'Por definir',
      formData.urgency || 'Flexible',
      formData.description || '',
      'pending',
      new Date().toISOString(),
      new Date().toISOString()
    ];
    
    await databaseService.run(insertQuery, insertParams);
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
        const emailHTML = generateEmailForAgent('ENZO', {
          projectId,
          projectCode,
          projectType: formData.projectType || 'Consultoría',
          companyName: formData.companyName || 'Tu empresa',
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone || userId,
          budget: formData.budget || 'Por definir',
          urgency: formData.urgency || 'Flexible',
          description: formData.description || 'Proyecto de marketing digital'
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
