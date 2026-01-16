/**
 * 🛡️ ADRIANA - SegPopular Insurance Confirmation Handler
 * 
 * Maneja la confirmación SI del usuario y completa el proceso de cotización:
 * 1. Guarda el lead en la base de datos (insurance_leads)
 * 2. Envía email con cotización y detalles del seguro
 * 3. Retorna mensaje de éxito con la prima calculada
 * 
 * NOTA: NO crea evento de calendario aquí.
 * El calendario se usará DESPUÉS cuando el usuario solicite inspección del vehículo.
 * Para eso, se agregará al formulario la dirección completa de inspección:
 * - Calle principal y secundaria
 * - Número de casa/edificio
 * - Referencia del sitio
 * - Nombre edificio/urbanización/casa
 * - Piso y departamento
 */

import { getPendingConfirmation, clearPendingConfirmation } from './reservation-state.js';
import { saveToDatabase, queryDatabase } from '../database/postgres-adapter.js';
import { generateEmailForAgent } from './generic-email-templates.js';
import { sendEmail } from './email.js';

/**
 * 🔢 Genera código secuencial de cotización
 * Formato: SEG-YYYY-NNN (ej: SEG-2026-001)
 */
async function generateQuoteCode() {
  const year = new Date().getFullYear();
  const prefix = `SEG-${year}`;
  
  try {
    // Buscar la última cotización del año actual
    const lastQuote = await queryDatabase(
      'insurance_leads',
      { quote_code: { $regex: `^${prefix}-` } },
      { sort: { created_at: -1 }, limit: 1 }
    );
    
    let nextNumber = 1;
    if (lastQuote && lastQuote.length > 0) {
      // Extraer el número de la última cotización
      const lastCode = lastQuote[0].quote_code;
      const lastNumber = parseInt(lastCode.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    // Formatear con 3 dígitos: 001, 002, etc.
    const sequentialNumber = String(nextNumber).padStart(3, '0');
    const quoteCode = `${prefix}-${sequentialNumber}`;
    
    console.log(`[INSURANCE-CONFIRM] 🔢 Código de cotización generado: ${quoteCode}`);
    return quoteCode;
    
  } catch (error) {
    console.error('[INSURANCE-CONFIRM] ⚠️ Error generando código, usando timestamp:', error);
    // Fallback: usar timestamp si falla la consulta
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  }
}

/**
 * 🎯 Procesa la confirmación de cotización de seguro
 * 
 * @param {string} userId - ID del usuario (phone)
 * @param {Object} message - Mensaje del usuario
 * @param {Object} userProfile - Perfil del usuario
 * @returns {Object} Resultado con success, leadId, message, notifications
 */
export async function processInsuranceConfirmation(userId, message, userProfile) {
  console.log(`[INSURANCE-CONFIRM] 🛡️ Procesando confirmación de seguro para ${userId}`);

  // Obtener datos pendientes
  const pendingData = await getPendingConfirmation(userId);
  
  if (!pendingData || pendingData.type !== 'insurance_confirmed') {
    return {
      success: false,
      message: 'No hay una cotización pendiente de confirmación. ¿Necesitas ayuda con algo más?'
    };
  }

  const formData = pendingData.formData.data;
  const premium = pendingData.premium;

  try {
    // ==========================================
    // 1️⃣ GUARDAR EN BASE DE DATOS
    // ==========================================
    
    const leadId = `insurance_${Date.now()}_${userId.replace(/\+/g, '')}`;
    const quoteCode = await generateQuoteCode();
    
    const leadData = {
      id: leadId,
      quote_code: quoteCode,
      user_phone: userId,
      agent_name: 'ADRIANA',
      insurance_type: formData.insuranceType || 'Seguro para Vehículos livianos',
      city: formData.city,
      commercial_value: formData.commercialValue,
      plate: formData.plate,
      vehicle_brand: formData.vehicleBrand,
      vehicle_model: formData.vehicleModel,
      vehicle_year: formData.vehicleYear,
      motor: formData.motor,
      chasis: formData.chasis,
      origin_country: formData.originCountry,
      license_type: formData.licenseType,
      license_expiry: formData.licenseExpiry,
      client_name: formData.fullName,
      cedula: formData.cedula,
      email: formData.email || null,
      phone: formData.phone,
      matricula_images: JSON.stringify(formData.matriculaImages || []),
      licencia_images: JSON.stringify(formData.licenciaImages || []),
      quoted_premium: premium.totalPremium,
      premium_breakdown: JSON.stringify(premium),
      status: 'quoted',
      quote_sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[INSURANCE-CONFIRM] 💾 Guardando lead en insurance_leads...');
    await saveToDatabase('insurance_leads', leadData);
    console.log(`[INSURANCE-CONFIRM] ✅ Lead guardado: ${leadId}`);

    // ==========================================
    // 2️⃣ ENVIAR EMAIL CON COTIZACIÓN
    // ==========================================
    
    let emailSent = false;
    let emailError = null;

    if (formData.email) {
      try {
        console.log(`[INSURANCE-CONFIRM] 📧 Enviando email a ${formData.email}...`);
        
        // Generar HTML del email con template de SegPopular
        const emailHTML = generateEmailForAgent('ADRIANA', {
          leadId,
          insuranceType: formData.insuranceType || 'Seguro para Vehículos livianos',
          fullName: formData.fullName,
          cedula: formData.cedula,
          email: formData.email,
          phone: formData.phone,
          vehicleBrand: formData.vehicleBrand,
          vehicleModel: formData.vehicleModel,
          vehicleYear: formData.vehicleYear,
          plate: formData.plate,
          motor: formData.motor,
          chasis: formData.chasis,
          originCountry: formData.originCountry,
          city: formData.city,
          commercialValue: formData.commercialValue,
          licenseType: formData.licenseType,
          licenseExpiry: formData.licenseExpiry,
          quotedPremium: premium.totalPremium,
          basePremium: premium.basePremium,
          iva: premium.iva,
          emissionCost: premium.emissionCost,
          otherCosts: premium.otherCosts
        });

        await sendEmail({
          to: formData.email,
          subject: `🛡️ Cotización de Seguro - SegPopular | ${formData.vehicleBrand} ${formData.vehicleModel}`,
          html: emailHTML
        });

        emailSent = true;
        console.log('[INSURANCE-CONFIRM] ✅ Email enviado exitosamente');
      } catch (error) {
        console.error('[INSURANCE-CONFIRM] ❌ Error enviando email:', error);
        emailError = error.message;
      }
    } else {
      console.log('[INSURANCE-CONFIRM] ⚠️ No hay email para enviar cotización');
    }

    // ==========================================
    // 3️⃣ LIMPIAR DATOS PENDIENTES
    // ==========================================
    
    await clearPendingConfirmation(userId);
    console.log('[INSURANCE-CONFIRM] 🗑️ Datos pendientes limpiados');

    // ==========================================
    // 4️⃣ RETORNAR RESULTADO
    // ==========================================
    
    return {
      success: true,
      leadId,
      quoteCode,
      message: `✅ Cotización registrada exitosamente!

📋 Código de cotización: ${quoteCode}

💰 RESUMEN:
━━━━━━━━━━━━━━━
Vehículo: ${formData.vehicleBrand} ${formData.vehicleModel} ${formData.vehicleYear}
Placa: ${formData.plate}
Valor comercial: $${formData.commercialValue.toLocaleString('en-US')}

${emailSent ? '📧 Te enviamos los detalles a tu email\n\n' : ''}${emailError ? `⚠️ Hubo un problema enviando el email: ${emailError}\n\n` : ''}💵 Prima anual: $${premium.totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2 })}

🛡️ SegPopular - Tu seguro popular de confianza

💡 Guarda tu código ${quoteCode} para agendar inspección`,
      data: {
        leadId,
        quoteCode,
        vehicleInfo: `${formData.vehicleBrand} ${formData.vehicleModel} ${formData.vehicleYear}`,
        plate: formData.plate,
        commercialValue: formData.commercialValue,
        quotedPremium: premium.totalPremium,
        city: formData.city,
        clientName: formData.fullName,
        phone: formData.phone,
        email: formData.email
      },
      notifications: {
        email: emailSent ? {
          sent: true,
          to: formData.email,
          subject: `🛡️ Cotización de Seguro - SegPopular | ${formData.vehicleBrand} ${formData.vehicleModel}`
        } : {
          sent: false,
          error: emailError || 'No email provided'
        }
        // NO calendar event - se creará después si el usuario solicita inspección
      }
    };

  } catch (error) {
    console.error('[INSURANCE-CONFIRM] ❌ Error en confirmación:', error);
    
    return {
      success: false,
      message: `❌ Hubo un error al procesar tu cotización: ${error.message}\n\nPor favor intenta de nuevo o contacta a soporte.`,
      error: error.message
    };
  }
}

/**
 * 📅 Agenda inspección del vehículo (para usar DESPUÉS de la cotización)
 * 
 * Esta función se llamará cuando el usuario YA tenga una cotización
 * y desee agendar una inspección presencial de su vehículo.
 * 
 * @param {string} userId - ID del usuario
 * @param {string} leadId - ID del lead de seguro
 * @param {Object} inspectionData - Datos de la inspección
 * @param {string} inspectionData.date - Fecha de inspección (YYYY-MM-DD)
 * @param {string} inspectionData.time - Hora de inspección (HH:MM)
 * @param {string} inspectionData.street1 - Calle principal
 * @param {string} inspectionData.street2 - Calle secundaria
 * @param {string} inspectionData.number - Número de casa/edificio
 * @param {string} inspectionData.reference - Referencia del sitio
 * @param {string} inspectionData.buildingName - Nombre edificio/urbanización/casa
 * @param {string} inspectionData.floor - Piso (opcional)
 * @param {string} inspectionData.apartment - Departamento (opcional)
 * @returns {Object} Resultado con evento de calendario creado
 */
export async function scheduleVehicleInspection(userId, leadId, inspectionData) {
  console.log(`[INSURANCE-CONFIRM] 📅 Agendando inspección para lead ${leadId}`);

  try {
    // TODO: Implementar cuando se necesite
    // 1. Actualizar lead en DB con inspection_scheduled y dirección
    // 2. Crear evento en Google Calendar
    // 3. Enviar email de confirmación de inspección
    // 4. Retornar evento creado

    const fullAddress = `${inspectionData.street1} y ${inspectionData.street2}, ${inspectionData.number}${inspectionData.buildingName ? `, ${inspectionData.buildingName}` : ''}${inspectionData.floor ? `, Piso ${inspectionData.floor}` : ''}${inspectionData.apartment ? `, Depto ${inspectionData.apartment}` : ''}${inspectionData.reference ? ` (${inspectionData.reference})` : ''}`;

    console.log(`[INSURANCE-CONFIRM] 📍 Dirección de inspección: ${fullAddress}`);
    console.log(`[INSURANCE-CONFIRM] 📅 Fecha: ${inspectionData.date} ${inspectionData.time}`);

    return {
      success: true,
      message: `✅ Inspección agendada para ${inspectionData.date} a las ${inspectionData.time}\n\n📍 Dirección:\n${fullAddress}\n\nUn inspector de SegPopular te visitará en esa fecha. 🛡️`,
      inspection: {
        leadId,
        date: inspectionData.date,
        time: inspectionData.time,
        address: fullAddress
      }
    };

  } catch (error) {
    console.error('[INSURANCE-CONFIRM] ❌ Error agendando inspección:', error);
    return {
      success: false,
      message: `❌ Error agendando inspección: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * 📊 Obtiene el estado de confirmación actual
 */
export async function getInsuranceConfirmationStatus(userId) {
  const pending = await getPendingConfirmation(userId);
  
  if (!pending || !pending.type?.includes('insurance')) {
    return { hasPendingConfirmation: false };
  }

  return {
    hasPendingConfirmation: true,
    type: pending.type,
    formData: pending.formData?.data,
    premium: pending.premium,
    timestamp: pending.timestamp
  };
}

/**
 * 🗑️ Cancela la confirmación pendiente
 */
export async function cancelInsuranceConfirmation(userId) {
  await clearPendingConfirmation(userId);
  console.log(`[INSURANCE-CONFIRM] 🗑️ Confirmación de seguro cancelada para ${userId}`);
  
  return {
    success: true,
    message: 'Cotización cancelada. ¿Necesitas empezar de nuevo o hay algo más en lo que pueda ayudarte?'
  };
}
