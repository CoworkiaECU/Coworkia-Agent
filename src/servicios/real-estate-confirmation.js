/**
 * 🏡 PAULA - PropElite Real Estate Confirmation Handler
 * 
 * Maneja DOS tipos de confirmaciones:
 * 
 * A) LEADS DE BÚSQUEDA (property_lead):
 *    1. Guarda el lead en real_estate_leads
 *    2. Envía email con resumen de búsqueda
 *    3. NO agenda visita automáticamente
 * 
 * B) VISITAS A PROPIEDADES (property_visit):
 *    1. Valida disponibilidad de horario
 *    2. Crea evento en calendario
 *    3. Guarda visita en property_visits
 *    4. Envía email de confirmación con detalles
 * 
 * El tipo se detecta automáticamente desde pendingConfirmation.type
 */

import { getPendingConfirmation, clearPendingConfirmation } from './reservation-state.js';
import databaseService from '../database/database.js';
import paulaRepository from '../database/paulaRepository.js';
import { generateEmailForAgent } from './generic-email-templates.js';
import { sendEmail } from './email.js';
import { confirmPropertyVisit } from './paula-confirmation-helper.js';
import { generateSequentialCode } from '../utils/code-generator.js';

/**
 * ✅ Procesa confirmación SI de Paula (Router principal)
 * Detecta tipo de confirmación y delega al handler correcto
 */
export async function confirmRealEstateLead(userId, userProfile) {
  try {
    console.log('[REAL-ESTATE-CONFIRM] 📝 Iniciando confirmación para:', userId);
    
    // Obtener confirmación pendiente
    const pendingConfirmation = await getPendingConfirmation(userId);
    
    if (!pendingConfirmation) {
      return {
        success: false,
        message: '❌ No hay ninguna confirmación pendiente.'
      };
    }
    
    const confirmationType = pendingConfirmation.type;
    console.log('[REAL-ESTATE-CONFIRM] 🎯 Tipo de confirmación:', confirmationType);
    
    // Router: Delegar según tipo
    switch (confirmationType) {
      case 'property_visit':
        // Confirmar visita a propiedad específica
        return await confirmPropertyVisit(userId, userProfile);
        
      case 'property_lead':
      default:
        // Confirmar lead de búsqueda general
        return await confirmPropertyLead(userId, userProfile);
    }
    
  } catch (error) {
    console.error('[REAL-ESTATE-CONFIRM] ❌ Error en router de confirmación:', error);
    return {
      success: false,
      message: '❌ Hubo un error al procesar tu confirmación. Por favor intenta nuevamente.'
    };
  }
}

/**
 * ✅ Confirma lead de búsqueda de propiedad
 * (La función original confirmRealEstateLead ahora se llama confirmPropertyLead)
 */
async function confirmPropertyLead(userId, userProfile) {
  console.log('[REAL-ESTATE-CONFIRM] 🏡 Procesando confirmación de búsqueda...');

  // Obtener datos pendientes
  const pendingData = await getPendingConfirmation(userId);
  
  if (!pendingData || pendingData.agentName !== 'PAULA') {
    console.log('[REAL-ESTATE-CONFIRM] ⚠️ No hay datos pendientes de PAULA');
    return {
      success: false,
      message: 'No encontré datos pendientes de búsqueda inmobiliaria. Por favor inicia el proceso nuevamente con @paula.'
    };
  }

  const formData = pendingData.formData;

  try {
    // ==========================================
    // 1️⃣ GUARDAR EN BASE DE DATOS usando paulaRepository
    // ==========================================
    
    const leadId = await generateSequentialCode('PAU', 'real_estate_leads', 'id', 3);
    
    // Construir objeto requirements con campos opcionales
    const requirements = {
      bedrooms: formData.bedrooms || null,
      bathrooms: formData.bathrooms || null,
      preferredZone: formData.preferredZone || null,
      financing: formData.financing || 'flexible',
      urgency: formData.urgency || 'flexible',
      specialRequirements: formData.specialRequirements || null
    };

    const leadData = {
      id: leadId,
      userId: userId,
      operationType: formData.operationType || 'compra',
      propertyType: formData.propertyType,
      preferredZone: formData.city,
      budgetRange: formData.budgetRange,
      clientName: formData.fullName,
      email: formData.email || null,
      phone: formData.phone || null,
      requirements: requirements
    };
    
    await paulaRepository.saveRealEstateLead(leadData);
    console.log(`[REAL-ESTATE-CONFIRM] ✅ Lead guardado: ${leadId}`);

    // ==========================================
    // 2️⃣ PREPARAR DATOS PARA EMAIL
    // ==========================================

    const emailData = {
      leadCode: leadId,
      operationType: formData.operationType || 'compra',
      propertyType: formData.propertyType,
      country: formData.country,
      city: formData.city,
      budgetRange: formData.budgetRange,
      fullName: formData.fullName,
      email: formData.email || 'No proporcionado',
      phone: formData.phone || userId,
      bedrooms: formData.bedrooms || 'Flexible',
      bathrooms: formData.bathrooms || 'Flexible',
      preferredZone: formData.preferredZone || 'Por definir',
      financing: formData.financing || 'Por definir',
      urgency: formData.urgency || 'Flexible',
      specialRequirements: formData.specialRequirements || 'Ninguno',
      agentName: 'Paula',
      agentCompany: 'PropElite Bienes Raíces'
    };

    // ==========================================
    // 3️⃣ GENERAR Y ENVIAR EMAIL
    // ==========================================

    const emailContent = generateEmailForAgent('PAULA', 'client', { clientName: emailData.fullName, ...emailData });
    
    const emailResult = await sendEmail(
      emailData.email !== 'No proporcionado' ? emailData.email : process.env.SMTP_USER,
      emailContent.subject,
      emailContent.html
    );

    if (emailResult.success) {
      console.log('[REAL-ESTATE-CONFIRM] ✅ Email enviado correctamente');
    } else {
      console.warn('[REAL-ESTATE-CONFIRM] ⚠️ Email no enviado:', emailResult.error);
    }

    // ==========================================
    // 4️⃣ LIMPIAR ESTADO Y RETORNAR
    // ==========================================

    await clearPendingConfirmation(userId);

    // Mensaje de éxito personalizado según tipo de operación
    const operationMessages = {
      'compra': 'buscar propiedades disponibles',
      'venta': 'evaluar tu propiedad',
      'alquiler': 'buscar opciones de alquiler'
    };

    const nextStep = operationMessages[formData.operationType] || 'iniciar la búsqueda';

    return {
      success: true,
      message: `✅ **Búsqueda registrada exitosamente**

📋 Código: ${leadId}

Perfecto ${formData.fullName}, ya tengo toda la información para ${nextStep}.

📞 **Próximos pasos:**
1. Revisaré propiedades que coincidan con tus necesidades
2. Te enviaré las mejores opciones por WhatsApp (fotos + detalles)
3. Agendaremos visitas a las que te interesen
4. Te acompañaré en todo el proceso hasta la compra

⏱️ **Tiempo estimado:** Te contacto en las próximas 4-8 horas con opciones.

💡 **Recuerda:** Asesoría 100% GRATUITA, solo pagas comisión si compras (y normalmente la paga el vendedor).

¿Hay algo más que deba saber sobre tu búsqueda?`
    };

  } catch (error) {
    console.error('[REAL-ESTATE-CONFIRM] ❌ Error procesando confirmación:', error);
    
    return {
      success: false,
      message: `❌ Hubo un error al procesar tu búsqueda.

Por favor intenta nuevamente o contáctame directamente.`
    };
  }
}

export default {
  confirmRealEstateLead
};
