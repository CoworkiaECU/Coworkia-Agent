/**
 * 🛡️ Adriana Conversational Form Service
 * 
 * Maneja el flujo conversacional de 6 pasos para cotizaciones automáticas:
 * 1. Tipo vehículo + marca
 * 2. Modelo + año
 * 3. 🆕 Upload multi-documento (matrícula + cédula + licencia opcional) con Vision AI
 * 4. Confirmación datos extraídos
 * 5. Coberturas deseadas  
 * 6. Email + envío cotización
 * 
 * Estados guardados en tabla adriana_conversations
 */

import databaseService from '../database/database.js';
import { analyzeImage } from '../servicios-ia/openai.js';
import { analyzeDocument, calculateRiskScore } from './adriana-document-analyzer.js';
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
    message: `Excelente! ${vehicleDesc} 🚗✅\n\n📸 **Ahora necesito 2 fotos:**\n\n1️⃣ **Matrícula del vehículo** (documento completo)\n2️⃣ **Tu cédula** (lado frontal con foto)\n3️⃣ Licencia de conducir (opcional)\n\n🤖 **Auto-detección:** Mi sistema reconocerá automáticamente cada documento.\n\nEnvía las fotos una por una 📸`,
    step: 3
  };
}

/**
 * PASO 3: 🆕 Upload multi-documento (matrícula + cédula + licencia opcional)
 * Sistema inteligente que detecta automáticamente el tipo de documento
 */
async function processStep3IdCardUpload(userPhone, mediaUrl, conversation) {
  if (!mediaUrl) {
    return {
      success: false,
      message: 'No recibí ninguna imagen 😕\n\nPor favor envía las fotos de:\n\n1️⃣ **Matrícula del vehículo** (obligatoria)\n2️⃣ **Tu cédula** (obligatoria)\n3️⃣ Licencia de conducir (opcional)\n\nEnvía una por una 📸'
    };
  }
  
  try {
    // 1. Analizar documento automáticamente con Vision AI
    loggers.adriana.info('Analizando documento multi-type...', { userPhone });
    
    const analysisResult = await analyzeDocument(mediaUrl);
    
    if (!analysisResult.success) {
      return {
        success: false,
        message: analysisResult.validations?.errors?.[0] || 'No pude reconocer el documento. Por favor envía una foto más clara 📸'
      };
    }
    
    const { documentType, data, confidence, validations } = analysisResult;
    
    loggers.adriana.info('Documento reconocido', {
      type: documentType,
      confidence,
      userPhone
    });
    
    // 2. Guardar documento en BD
    await databaseService.saveAdrianaDocument(
      userPhone,
      documentType,
      data,
      confidence,
      mediaUrl,
      null // quoteCode agregado después
    );
    
    // 3. Obtener estado actual de documentos
    const currentConversation = await databaseService.get(
      `SELECT documents_state, vehicle_brand, vehicle_model, vehicle_year FROM adriana_conversations 
       WHERE user_phone = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [userPhone]
    );
    
    let documentsState = currentConversation.documents_state || {
      cedula: { received: false, data: null },
      matricula: { received: false, data: null },
      licencia: { received: false, data: null }
    };
    
    // Parse si viene como string
    if (typeof documentsState === 'string') {
      documentsState = JSON.parse(documentsState);
    }
    
    // 4. Actualizar estado del documento recibido
    documentsState[documentType] = {
      received: true,
      data,
      confidence: parseFloat(confidence)
    };
    
    // 5. Auto-fill datos del vehículo desde matrícula
    let vehicleAutoFilled = false;
    let vehicleData = null;
    
    if (documentType === 'matricula') {
      vehicleData = {
        vehicleBrand: data.marca,
        vehicleModel: data.modelo,
        vehicleYear: data.anio,
        vehicleType: data.tipo?.toLowerCase() === 'liviano' ? 'auto' : 'camioneta'
      };
      
      await updateConversationStep(userPhone, 3, {
        ...vehicleData,
        extractedData: documentsState
      });
      
      vehicleAutoFilled = true;
      
      loggers.adriana.info('Vehículo auto-completado desde matrícula', {
        userPhone,
        vehiculo: `${data.marca} ${data.modelo} ${data.anio}`
      });
    } else {
      // Solo actualizar documents_state
      await databaseService.run(
        `UPDATE adriana_conversations 
         SET documents_state = $1, extracted_data = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_phone = $2 AND status = 'active'`,
        [JSON.stringify(documentsState), userPhone]
      );
    }
    
    // 6. Verificar qué documentos faltan
    const hasCedula = documentsState.cedula.received;
    const hasMatricula = documentsState.matricula.received;
    const hasLicencia = documentsState.licencia.received;
    
    // 7. Generar mensaje de confirmación personalizado
    let responseMessage = '';
    
    if (documentType === 'cedula') {
      const cedulaData = data;
      responseMessage = `✅ **Cédula recibida**\n\n👤 ${cedulaData.nombres}\n🆔 ${cedulaData.cedula}\n🎂 ${cedulaData.edad} años\n📍 ${cedulaData.provincia}`;
    } else if (documentType === 'matricula') {
      const matriculaData = data;
      responseMessage = `✅ **Matrícula recibida**\n\n🚗 ${matriculaData.marca} ${matriculaData.modelo}\n📅 Año: ${matriculaData.anio}\n🔖 Placa: ${matriculaData.placa}`;
      
      if (vehicleAutoFilled) {
        responseMessage += `\n\n🎯 **Datos del vehículo auto-completados!**`;
      }
    } else if (documentType === 'licencia') {
      const licenciaData = data;
      const vencida = licenciaData.vencida ? '⚠️ VENCIDA' : '✅ Vigente';
      responseMessage = `✅ **Licencia recibida**\n\n👤 ${licenciaData.nombres}\n🪪 Tipo: ${licenciaData.tipoLicencia}\n📅 ${vencida}`;
      
      // Advertencia si está vencida
      if (licenciaData.vencida) {
        responseMessage += `\n\n⚠️ **Tu licencia está vencida.** Deberás renovarla antes de contratar el seguro.`;
      }
      
      // Advertencia si es tipo A (motos)
      if (licenciaData.tipoLicencia === 'A') {
        responseMessage += `\n\n⚠️ **Licencia tipo A** (motos) solo. Para seguros de auto necesitas licencia tipo B.`;
      }
    }
    
    // 8. Indicar qué documentos faltan
    const missingDocs = [];
    if (!hasMatricula) missingDocs.push('1️⃣ Matrícula del vehículo');
    if (!hasCedula) missingDocs.push('2️⃣ Tu cédula');
    
    if (missingDocs.length > 0) {
      responseMessage += `\n\n📋 **Faltan:**\n${missingDocs.join('\n')}`;
      responseMessage += `\n\n📸 Envía la siguiente foto...`;
      
      return {
        success: true,
        message: responseMessage,
        step: 3, // Sigue en paso 3
        documentsState
      };
    }
    
    // 9. Si ya tiene matrícula Y cédula → avanzar a Paso 4
    responseMessage += `\n\n✅ **Documentos completos!**`;
    
    if (hasLicencia) {
      responseMessage += ` (incluida licencia)`;
    } else {
      responseMessage += `\n\n💡 Si tienes tu licencia de conducir también puedes enviarla (opcional).`;
    }
    
    await updateConversationStep(userPhone, 4, {
      extractedData: documentsState
    });
    
    // Preparar mensaje de confirmación final
    const cedulaData = documentsState.cedula.data;
    const matriculaData = documentsState.matricula.data;
    
    responseMessage += `\n\n---\n📝 **Resumen:**\n\n👤 Conductor: ${cedulaData.nombres} (${cedulaData.edad} años)\n🚗 Vehículo: ${matriculaData.marca} ${matriculaData.modelo} ${matriculaData.anio}\n🔖 Placa: ${matriculaData.placa}`;
    
    responseMessage += `\n\n¿Los datos son correctos?\n\nResponde "sí" para continuar o "no" si hay algún error.`;
    
    return {
      success: true,
      message: responseMessage,
      step: 4,
      documentsState
    };
    
  } catch (error) {
    loggers.adriana.error('Error processing multi-document upload', {}, error);
    return {
      success: false,
      message: 'Hubo un error al procesar la imagen. Por favor intenta de nuevo 📸'
    };
  }
}

/**
 * PASO 4: 🆕 Confirmar datos extraídos + Cálculo de Risk Score
 */
async function processStep4ConfirmData(userPhone, message, conversation) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('no') || lowerMessage.includes('incorrecto')) {
    // Resetear documentos y volver a Paso 3
    await updateConversationStep(userPhone, 3, {});
    return {
      success: false,
      message: 'Entendido. Por favor envía nuevamente las fotos de tus documentos 📸\n\n1️⃣ Matrícula del vehículo\n2️⃣ Tu cédula\n3️⃣ Licencia (opcional)'
    };
  }
  
  if (lowerMessage.includes('si') || lowerMessage.includes('sí') || lowerMessage.includes('correcto')) {
    // ═══════════════════════════════════════════════════════════════════════
    // CALCULAR RISK SCORE
    // ═══════════════════════════════════════════════════════════════════════
    const documentsState = conversation.documents_state || conversation.extracted_data;
    let docs = documentsState;
    
    // Parse si viene como string
    if (typeof docs === 'string') {
      docs = JSON.parse(docs);
    }
    
    const cedulaData = docs.cedula?.data;
    const matriculaData = docs.matricula?.data;
    const licenciaData = docs.licencia?.data;
    
    if (!cedulaData || !matriculaData) {
      return {
        success: false,
        message: 'Faltan datos de documentos. Por favor reinicia el formulario.'
      };
    }
    
    // Calcular score de riesgo
    const riskAnalysis = calculateRiskScore(cedulaData, matriculaData, licenciaData);
    
    loggers.adriana.info('Risk score calculado', {
      userPhone,
      score: riskAnalysis.score,
      classification: riskAnalysis.classification,
      hasBlockingIssues: riskAnalysis.hasBlockingIssues
    });
    
    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICAR ISSUES BLOQUEANTES
    // ═══════════════════════════════════════════════════════════════════════
    if (riskAnalysis.hasBlockingIssues) {
      const blockingAlerts = riskAnalysis.alerts.filter(a => a.blocking);
      let errorMessage = `⛔ **No podemos proceder con la cotización:**\n\n`;
      
      blockingAlerts.forEach(alert => {
        errorMessage += `• ${alert.message}\n`;
      });
      
      errorMessage += `\n💬 Por favor contacta a nuestro equipo para resolver estos problemas.`;
      
      await abandonConversation(userPhone);
      
      return {
        success: false,
        message: errorMessage,
        riskAnalysis
      };
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // MOSTRAR ANÁLISIS DE RIESGO Y RECOMENDACIÓN
    // ═══════════════════════════════════════════════════════════════════════
    let analysisMessage = `✅ **Datos confirmados!**\n\n`;
    
    // Score visual
    const scoreEmoji = riskAnalysis.score >= 80 ? '🟢' :
                      riskAnalysis.score >= 60 ? '🟡' :
                      riskAnalysis.score >= 40 ? '🟠' : '🔴';
    
    analysisMessage += `📊 **Perfil de Riesgo:** ${scoreEmoji} ${riskAnalysis.classification} (${riskAnalysis.score}/100)\n\n`;
    
    // Recomendación de cobertura
    analysisMessage += `🎯 **Cobertura recomendada:** ${riskAnalysis.recommendedCoverage}\n\n`;
    
    // Mostrar alertas no bloqueantes si existen
    const warnings = riskAnalysis.alerts.filter(a => !a.blocking && a.severity !== 'low');
    if (warnings.length > 0) {
      analysisMessage += `⚠️ **Consideraciones:**\n`;
      warnings.forEach(alert => {
        analysisMessage += `• ${alert.message}\n`;
      });
      analysisMessage += `\n`;
    }
    
    await updateConversationStep(userPhone, 5, {});
    
    analysisMessage += `---\n\n¿Qué tipo de cobertura prefieres?\n\n1️⃣ **Plan Básico** - Terceros + Robo\n2️⃣ **Plan Elemental** 🔥 (Recomendado) - Todo Riesgo 7% deducible\n3️⃣ **Plan Premium** - Todo Riesgo sin deducible\n\nResponde con el número (1, 2 o 3)`;
    
    return {
      success: true,
      message: analysisMessage,
      step: 5,
      riskAnalysis
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
