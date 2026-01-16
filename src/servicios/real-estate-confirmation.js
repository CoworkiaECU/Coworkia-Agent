/**
 * 🏡 PAULA - PropElite Real Estate Confirmation Handler
 * 
 * Maneja la confirmación SI del usuario y completa el proceso de búsqueda:
 * 1. Guarda el lead en la base de datos (real_estate_leads)
 * 2. Envía email con resumen de búsqueda y próximos pasos
 * 3. NO agenda visita automáticamente (se coordina después según disponibilidad)
 * 4. NO calcula precio (asesoría gratuita, comisión pagada por vendedor)
 * 5. Retorna mensaje de éxito con siguiente paso
 * 
 * DIFERENCIAS con otros agentes:
 * - No usa AI Vision ni análisis de fotos
 * - No genera cotización automática (Paula busca propiedades manualmente)
 * - No crea evento de calendario (visitas se agendan después)
 * - No calcula precios (asesoría sin costo)
 * - Focus en iniciar relación y entender necesidades
 */

import { getPendingConfirmation, clearPendingConfirmation } from './reservation-state.js';
import databaseService from '../database/database.js';
import { generateEmailForAgent } from './generic-email-templates.js';
import { sendEmail } from './email.js';

/**
 * 🔢 Genera código secuencial de lead inmobiliario
 */
async function generateLeadCode() {
  const year = new Date().getFullYear();
  const prefix = `PE-${year}-`;
  
  const query = `
    SELECT id FROM real_estate_leads 
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
 * ✅ Procesa confirmación SI de Paula
 */
export async function confirmRealEstateLead(userId, userProfile) {
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
    // 1️⃣ GUARDAR EN BASE DE DATOS
    // ==========================================
    
    const leadId = await generateLeadCode();
    
    // Construir objeto requirements con campos opcionales
    const requirements = {
      bedrooms: formData.bedrooms || null,
      bathrooms: formData.bathrooms || null,
      preferredZone: formData.preferredZone || null,
      financing: formData.financing || 'flexible',
      urgency: formData.urgency || 'flexible',
      specialRequirements: formData.specialRequirements || null
    };

    const insertQuery = `
      INSERT INTO real_estate_leads (
        id, user_phone, operation_type, property_type, preferred_zone,
        budget_range, client_name, email, phone, requirements,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertParams = [
      leadId,
      userId,
      formData.operationType || 'compra',
      formData.propertyType,
      formData.city,
      formData.budgetRange,
      formData.fullName,
      formData.email || null,
      formData.phone || null,
      JSON.stringify(requirements),
      'pending',
      new Date().toISOString(),
      new Date().toISOString()
    ];
    
    await databaseService.run(insertQuery, insertParams);
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

    const emailContent = generateEmailForAgent('PAULA', emailData);
    
    if (emailContent.success) {
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
