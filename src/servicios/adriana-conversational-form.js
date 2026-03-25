/**
 * 🛡️ Adriana Conversational Form Service
 * 
 * Maneja el flujo conversacional de 6 pasos para cotizaciones automáticas:
 * 1. Tipo vehículo + marca
 * 2. Modelo + año
 * 3. Upload cédula (WhatsApp media)
 * 4. Confirmación datos extraídos
 * 5. Coberturas deseadas  
 * 6. Email + envío cotización
 * 
 * Estados guardados en tabla adriana_conversations
 */

import databaseService from '../database/database-service.js';
import { analyzeImage } from '../servicios-ia/openai.js';
import { generateAndSendComparisonQuote } from './adriana-quote-generator.js';
import { loggers } from '../utils/logger.js';

// Estados posibles del formulario
export const FORM_STEPS = {
  VEHICLE_TYPE: 'vehicle_type',    // Paso 1: Tipo + marca
  VEHICLE_DETAILS: 'vehicle_details', // Paso 2: Modelo + año
  ID_CARD_UPLOAD: 'id_card_upload',   // Paso 3: Upload cédula
  CONFIRM_DATA: 'confirm_data',       // Paso 4: Confirmar datos
  SELECT_COVERAGE: 'select_coverage', // Paso 5: Coberturas
  EMAIL_AND_SEND: 'email_and_send',   // Paso 6: Email + envío
  COMPLETED: 'completed'               // Finalizado
};

/**
 * Obtiene o crea conversación activa
 */
export async function getOrCreateConversation(userPhone) {
  await databaseService.ensureInitialized();
  
  let conversation = await databaseService.get(
    `SELECT * FROM adriana_conversations 
     WHERE user_phone = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [userPhone]
  );
  
  if (!conversation) {
    // Crear nueva conversación
    await databaseService.run(
      `INSERT INTO adriana_conversations 
       (user_phone, step, status, created_at, updated_at)
       VALUES ($1, 1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userPhone]
    );
    
    conversation = await databaseService.get(
      `SELECT * FROM adriana_conversations 
       WHERE user_phone = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [userPhone]
    );
  }
  
  return conversation;
}

/**
 * Actualiza estado de conversación
 */
export async function updateConversationStep(userPhone, step, data = {}) {
  await databaseService.ensureInitialized();
  
  const updates = [];
  const values = [];
  let idx = 1;
  
  updates.push(`step = $${idx++}`);
  values.push(step);
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  
  // Datos opcionales según el paso
  if (data.vehicleType) {
    updates.push(`vehicle_type = $${idx++}`);
    values.push(data.vehicleType);
  }
  if (data.vehicleBrand) {
    updates.push(`vehicle_brand = $${idx++}`);
    values.push(data.vehicleBrand);
  }
  if (data.vehicleModel) {
    updates.push(`vehicle_model = $${idx++}`);
    values.push(data.vehicleModel);
  }
  if (data.vehicleYear) {
    updates.push(`vehicle_year = $${idx++}`);
    values.push(data.vehicleYear);
  }
  if (data.cedulaImageUrl) {
    updates.push(`cedula_image_url = $${idx++}`);
    values.push(data.cedulaImageUrl);
  }
  if (data.extractedData) {
    updates.push(`extracted_data = $${idx++}`);
    values.push(JSON.stringify(data.extractedData));
  }
  if (data.selectedCoverage) {
    updates.push(`selected_coverage = $${idx++}`);
    values.push(data.selectedCoverage);
  }
  if (data.email) {
    updates.push(`email = $${idx++}`);
    values.push(data.email);
  }
  if (data.quoteCode) {
    updates.push(`quote_code = $${idx++}`);
    values.push(data.quoteCode);
  }
  if (data.status) {
    updates.push(`status = $${idx++}`);
    values.push(data.status);
  }
  
  values.push(userPhone);
  
  await databaseService.run(
    `UPDATE adriana_conversations 
     SET ${updates.join(', ')}
     WHERE user_phone = $${idx} AND status = 'active'`,
    values
  );
}

/**
 * Marca conversación como completada
 */
export async function completeConversation(userPhone) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    `UPDATE adriana_conversations 
     SET status = 'completed', updated_at = CURRENT_TIMESTAMP
     WHERE user_phone = $1 AND status = 'active'`,
    [userPhone]
  );
}

/**
 * Marca conversación como abandonada
 */
export async function abandonConversation(userPhone) {
  await databaseService.ensureInitialized();
  
  await databaseService.run(
    `UPDATE adriana_conversations 
     SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP
     WHERE user_phone = $1 AND status = 'active'`,
    [userPhone]
  );
}

/**
 * Procesa mensaje del usuario según el paso actual del formulario
 */
export async function processFormMessage(userPhone, message, mediaUrl = null) {
  try {
    const conversation = await getOrCreateConversation(userPhone);
    const currentStep = conversation.step;
    
    loggers.adriana.info('Processing form message', {
      userPhone,
      step: currentStep,
      hasMedia: !!mediaUrl
    });
    
    // Procesar según el paso actual
    switch (currentStep) {
      case 1: // VEHICLE_TYPE
        return await processStep1VehicleType(userPhone, message);
      
      case 2: // VEHICLE_DETAILS
        return await processStep2VehicleDetails(userPhone, message, conversation);
      
      case 3: // ID_CARD_UPLOAD
        return await processStep3IdCardUpload(userPhone, mediaUrl, conversation);
      
      case 4: // CONFIRM_DATA
        return await processStep4ConfirmData(userPhone, message, conversation);
      
      case 5: // SELECT_COVERAGE
        return await processStep5SelectCoverage(userPhone, message, conversation);
      
      case 6: // EMAIL_AND_SEND
        return await processStep6EmailAndSend(userPhone, message, conversation);
      
      default:
        return {
          success: false,
          message: 'Estado de formulario inválido. Empecemos de nuevo.',
          resetForm: true
        };
    }
    
  } catch (error) {
    loggers.adriana.error('Error processing form message', { userPhone }, error);
    return {
      success: false,
      message: 'Ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.',
      error: error.message
    };
  }
}

/**
 * PASO 1: Tipo de vehículo + marca
 */
async function processStep1VehicleType(userPhone, message) {
  // Extraer tipo y marca del mensaje
  // Patrón: "auto toyota", "camioneta chevrolet", etc.
  const lowerMessage = message.toLowerCase();
  
  let vehicleType = 'auto'; // default
  if (lowerMessage.includes('camioneta') || lowerMessage.includes('pickup')) {
    vehicleType = 'camioneta';
  } else if (lowerMessage.includes('suv')) {
    vehicleType = 'suv';
  }
  
  // Extraer marca (simplificado - en prod usar OpenAI para parsing más robusto)
  const commonBrands = ['toyota', 'chevrolet', 'nissan', 'mazda', 'hyundai', 'kia', 'ford', 'volkswagen', 'honda'];
  let brand = commonBrands.find(b => lowerMessage.includes(b));
  
  if (!brand) {
    // Asumir que el último word es la marca
    const words = message.trim().split(' ');
    brand = words[words.length - 1];
  }
  
  await updateConversationStep(userPhone, 2, {
    vehicleType,
    vehicleBrand: brand.toUpperCase()
  });
  
  return {
    success: true,
    message: `Perfecto, un ${vehicleType} ${brand.toUpperCase()} 🚗\n\n¿Qué modelo y año es?\n\nEjemplo: "RAV4 2020" o "Aveo 2019"`,
    step: 2
  };
}

/**
 * PASO 2: Modelo + año
 */
async function processStep2VehicleDetails(userPhone, message, conversation) {
  // Extraer modelo y año
  const yearMatch = message.match(/20\d{2}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : null;
  
  if (!year || year < 2010 || year > 2026) {
    return {
      success: false,
      message: 'No pude identificar el año válido. Por favor dímelo así:\n\n"[Modelo] [Año]"\n\nEjemplo: "Corolla 2020"'
    };
  }
  
  const model = message.replace(year.toString(), '').trim();
  
  await updateConversationStep(userPhone, 3, {
    vehicleModel: model.toUpperCase(),
    vehicleYear: year
  });
  
  const vehicleDesc = `${conversation.vehicle_brand} ${model.toUpperCase()} ${year}`;
  
  return {
    success: true,
    message: `Excelente! ${vehicleDesc} 🚗✅\n\nAhora necesito una foto de tu **cédula** (lado frontal donde está tu foto) para extraer tus datos.\n\n📸 Envía la foto clara y completa 👍`,
    step: 3
  };
}

/**
 * PASO 3: Upload de cédula
 */
async function processStep3IdCardUpload(userPhone, mediaUrl, conversation) {
  if (!mediaUrl) {
    return {
      success: false,
      message: 'No recibí ninguna imagen 😕\n\nPor favor envía la foto de tu cédula (cara frontal con tu foto)'
    };
  }
  
  // Analizar imagen con Vision AI
  try {
    const response = await fetch(`${process.env.APP_URL || 'https://coworkia-agent-e97d15dac56f.herokuapp.com'}/api/adriana/extract-cedula`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: mediaUrl })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      return {
        success: false,
        message: result.error || 'No pude leer la cédula. ¿Puedes enviar una foto más clara?'
      };
    }
    
    const extractedData = result.data;
   
    await updateConversationStep(userPhone, 4, {
      cedulaImageUrl: mediaUrl,
      extractedData
    });
    
    return {
      success: true,
      message: `Perfecto! Extraído de tu cédula:\n\n👤 ${extractedData.nombres}\n🆔 ${extractedData.cedula}\n🎂 ${extractedData.edad} años\n📍 ${extractedData.provincia}\n\n¿Los datos son correctos?\n\nResponde "sí" para continuar o "no" si hay algún error.`,
      step: 4,
      extractedData
    };
    
  } catch (error) {
    loggers.adriana.error('Error extracting cedula', {}, error);
    return {
      success: false,
      message: 'Hubo un error al procesar la imagen. Por favor intenta de nuevo.'
    };
  }
}

/**
 * PASO 4: Confirmar datos extraídos
 */
async function processStep4ConfirmData(userPhone, message, conversation) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('no') || lowerMessage.includes('incorrecto')) {
    return {
      success: false,
      message: 'Entendido. Por favor envía nuevamente la foto de tu cédula más clara 📸'
    };
  }
  
  if (lowerMessage.includes('si') || lowerMessage.includes('sí') || lowerMessage.includes('correcto')) {
    await updateConversationStep(userPhone, 5, {});
    
    return {
      success: true,
      message: `Genial! 🎉\n\n¿Qué tipo de cobertura prefieres?\n\n1️⃣ **Plan Básico** - Terceros + Robo\n2️⃣ **Plan Elemental** 🔥 (Recomendado) - Todo Riesgo 7% deducible\n3️⃣ **Plan Premium** - Todo Riesgo sin deducible\n\nResponde con el número (1, 2 o 3)`,
      step: 5
    };
  }
  
  return {
    success: false,
    message: 'Por favor responde "sí" o "no" para continuar.'
  };
}

/**
 * PASO 5: Selección de cobertura
 */
async function processStep5SelectCoverage(userPhone, message, conversation) {
  const choice = message.trim();
  
  let coverage;
  if (choice === '1' || message.toLowerCase().includes('básico')) {
    coverage = 'basico';
  } else if (choice === '2' || message.toLowerCase().includes('elemental')) {
    coverage = 'elemental';
  } else if (choice === '3' || message.toLowerCase().includes('premium')) {
    coverage = 'premium';
  } else {
    return {
      success: false,
      message: 'Por favor elige una opción válida:\n\n1 = Básico\n2 = Elemental\n3 = Premium'
    };
  }
  
  await updateConversationStep(userPhone, 6, {
    selectedCoverage: coverage
  });
  
  const coverageName = coverage === 'basico' ? 'Plan Básico' : 
                       coverage === 'elemental' ? 'Plan VAZ Elemental' : 
                       'Plan Premium';
  
  return {
    success: true,
    message: `Perfecto! ${coverageName} ✅\n\n¿A qué email te envío la cotización detallada?\n\n📧 Escribe tu email (ej: nombre@gmail.com)`,
    step: 6
  };
}

/**
 * PASO 6: Email y envío de cotización
 */
async function processStep6EmailAndSend(userPhone, message, conversation) {
  const email = message.trim();
  
  // Validación básica de email
  if (!email.includes('@') || !email.includes('.')) {
    return {
      success: false,
      message: 'El email no parece válido. Por favor verifica y envíalo nuevamente.\n\nEjemplo: nombre@gmail.com'
    };
  }
  
  try {
    // Construir datos completos del vehículo y cliente
    const extractedData = conversation.extracted_data ? 
      (typeof conversation.extracted_data === 'string' ? JSON.parse(conversation.extracted_data) : conversation.extracted_data) :
      {};
    
    const vehicleData = {
      type: conversation.vehicle_type || 'auto',
      brand: conversation.vehicle_brand,
      model: conversation.vehicle_model,
      year: conversation.vehicle_year,
      commercialValue: 40000 // Default - se puede mejorar pidiendo valor específico
    };
    
    const customerData = {
      nombres: extractedData.nombres || 'Cliente',
      email: email,
      cedula: extractedData.cedula,
      edad: extractedData.edad,
      provincia: extractedData.provincia,
      telefono: userPhone
    };
    
    // Generar quote code
    const quoteCode = `VAZ-FORM-${Date.now().toString(36).toUpperCase()}`;
    
    // Llamar al endpoint de envío (interno)
    const appUrl = process.env.APP_URL || 'https://coworkia-agent-e97d15dac56f.herokuapp.com';
    const response = await fetch(`${appUrl}/api/adriana/send-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleData,
        customerData,
        options: {
          quoteCode,
          includeCompetitors: false
        }
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error al generar cotización');
    }
    
    // Marcar como completado
    await updateConversationStep(userPhone, 6, {
      email,
      quoteCode,
      status: 'completed'
    });
    
    await completeConversation(userPhone);
    
    const vehicleDesc = `${vehicleData.brand} ${vehicleData.model} ${vehicleData.year}`;
    
    return {
      success: true,
      message: `¡Listo! 🎉\n\nTu cotización para el ${vehicleDesc} ha sido enviada a:\n📧 ${email}\n\n💰 Prima mensual: $${result.monthlyPremium}\n📄 Código: ${quoteCode}\n\nRevisa tu bandeja de entrada (y spam por las dudas) 📬\n\n¿Tienes alguna pregunta?`,
      step: 6,
      completed: true,
      quoteCode,
      monthlyPremium: result.monthlyPremium
    };
    
  } catch (error) {
    loggers.adriana.error('Error sending quote', {}, error);
    return {
      success: false,
      message: 'Hubo un error al enviar la cotización. Por favor intenta de nuevo o contacta a nuestro equipo.'
    };
  }
}

/**
 * Reinicia formulario (cuando usuario quiere empezar de nuevo)
 */
export async function resetForm(userPhone) {
  await abandonConversation(userPhone);
  
  // Crear nueva conversación
  await databaseService.run(
    `INSERT INTO adriana_conversations 
     (user_phone, step, status, created_at, updated_at)
     VALUES ($1, 1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [userPhone]
  );
  
  return {
    success: true,
    message: 'Formulario reiniciado ✅\n\nEmpecemos de nuevo:\n\n¿Qué tipo de vehículo quieres asegurar?\n\nEjemplo: "auto toyota" o "camioneta chevrolet"'
  };
}
