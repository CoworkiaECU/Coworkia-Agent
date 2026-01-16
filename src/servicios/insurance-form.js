/**
 * 🛡️ ADRIANA - SegPopular Insurance Form Handler
 * 
 * Sistema especializado de formularios para seguros vehiculares.
 * 
 * CARACTERÍSTICAS:
 * - Validación de ciudades Sierra Ecuador (cobertura geográfica)
 * - Validación de valor comercial ($30k-$55k rango permitido)
 * - Análisis automático de imágenes (matrícula + licencia)
 * - Recopilación inteligente con delay de 30 segundos
 * - Cotización automática con fórmula: Valor × 3.27% + IVA + costos
 * - Resumen dividido en 2-3 mensajes con delays de 3 segundos
 * 
 * FLUJO:
 * 1. Usuario consulta seguro para vehículo
 * 2. Adriana pregunta ciudad → valida Sierra
 * 3. Pregunta valor comercial → valida $30k-$55k
 * 4. Solicita matrícula (2 lados) → progresivo
 * 5. Solicita licencia (2 lados) → juntos
 * 6. Espera 30 seg → analiza TODO con AI Vision
 * 7. Muestra resumen en 2-3 mensajes (3 seg separación)
 * 8. Usuario confirma SI → cotiza y guarda
 */

import { processGenericFormMessage, FORM_SCHEMAS } from './generic-form-handler.js';
import { getPendingConfirmation, setPendingConfirmation } from './reservation-state.js';
import { analyzeImage } from '../servicios-ia/openai.js';

// ==========================================
// 🏔️ CIUDADES SIERRA ECUADOR (COBERTURA)
// ==========================================

const SIERRA_CITIES = {
  norte: ['quito', 'ibarra', 'cayambe', 'tulcán', 'tulcan', 'tabacundo', 'cotacachi', 'pedro moncayo'],
  centro: ['latacunga', 'ambato', 'riobamba', 'guaranda', 'baños', 'banos', 'saquisilí', 'saquisili', 'pujilí', 'pujili', 'pelileo', 'guano', 'alausí', 'alausi'],
  sur: ['cuenca', 'loja', 'azogues', 'cariamanga', 'catamayo', 'gualaceo', 'paute']
};

const ALL_SIERRA_CITIES = [...SIERRA_CITIES.norte, ...SIERRA_CITIES.centro, ...SIERRA_CITIES.sur];

// ==========================================
// 💰 RANGOS Y TARIFAS
// ==========================================

const MIN_COMMERCIAL_VALUE = 30000; // $30,000 USD
const MAX_COMMERCIAL_VALUE = 55000; // $55,000 USD
const INSURANCE_RATE = 0.0327; // 3.27% (NO mostrar al cliente)
const IVA_RATE = 0.15; // 15% IVA Ecuador
const EMISSION_COST = 25; // $25 USD costo emisión promedio
const OTHER_COSTS = 15; // $15 USD otros costos administrativos

/**
 * 🔍 Valida si la ciudad está en zona de cobertura Sierra
 */
function isSierraCityValid(city) {
  if (!city) return false;
  const cityLower = city.toLowerCase().trim();
  return ALL_SIERRA_CITIES.some(validCity => cityLower.includes(validCity));
}

/**
 * 💵 Calcula la prima de seguro con todos los costos
 * Formula: (Valor × 3.27%) + IVA + Costos emisión + Otros
 */
function calculateInsurancePremium(commercialValue) {
  const basePremium = commercialValue * INSURANCE_RATE; // Prima base
  const iva = basePremium * IVA_RATE; // IVA sobre prima
  const totalPremium = basePremium + iva + EMISSION_COST + OTHER_COSTS;
  
  return {
    basePremium: Math.round(basePremium * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    emissionCost: EMISSION_COST,
    otherCosts: OTHER_COSTS,
    totalPremium: Math.round(totalPremium * 100) / 100
  };
}

/**
 * 📸 Analiza matrícula con AI Vision
 * Extrae: placa, marca, modelo, año, motor, chasis, país origen
 */
async function analyzeMatriculaImages(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    return null;
  }

  const prompt = `Analiza esta matrícula vehicular ecuatoriana y extrae EXACTAMENTE estos datos en formato JSON:

{
  "plate": "ABC-1234",
  "brand": "TOYOTA",
  "model": "COROLLA",
  "year": 2020,
  "motor": "2ZR-FE-12345",
  "chasis": "9BR-ABC123XYZ",
  "originCountry": "Japón"
}

IMPORTANTE:
- Si no encuentras un campo, déjalo como null
- Año debe ser número (ej: 2020, no "2020")
- Marca y modelo en MAYÚSCULAS
- Motor y chasis tal como aparecen
- País de origen del vehículo (donde fue fabricado)

Responde SOLO con el JSON, sin texto adicional.`;

  try {
    console.log('[INSURANCE-FORM] 🔍 Analizando matrícula con AI Vision...');
    
    // Usar la primera imagen (o todas si quieres analizar múltiples)
    const imageUrl = Array.isArray(imageUrls) ? imageUrls[0] : imageUrls;
    const result = await analyzeImage(imageUrl, prompt, { detail: 'high', max_tokens: 800 });
    
    if (!result.success) {
      console.error('[INSURANCE-FORM] ❌ Error en AI Vision:', result.error);
      return null;
    }
    
    const analysisText = result.content;
    
    // Extraer JSON de la respuesta
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[INSURANCE-FORM] ❌ No se pudo extraer JSON de la respuesta AI');
      return null;
    }

    const data = JSON.parse(jsonMatch[0]);
    console.log('[INSURANCE-FORM] ✅ Matrícula analizada:', data);
    return data;
  } catch (error) {
    console.error('[INSURANCE-FORM] ❌ Error analizando matrícula:', error);
    return null;
  }
}

/**
 * 🪪 Analiza licencia de conducir con AI Vision
 * Extrae: nombre, cédula, tipo licencia, fecha expiración
 */
async function analyzeLicenciaImages(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    return null;
  }

  const prompt = `Analiza esta licencia de conducir ecuatoriana y extrae EXACTAMENTE estos datos en formato JSON:

{
  "fullName": "JUAN PÉREZ GARCÍA",
  "cedula": "1234567890",
  "licenseType": "C",
  "licenseExpiry": "2026-09-15"
}

IMPORTANTE:
- fullName: Nombre completo en MAYÚSCULAS
- cedula: Solo dígitos, sin guiones ni espacios
- licenseType: Tipo de licencia (A, B, C, D, E, etc.)
- licenseExpiry: Fecha en formato YYYY-MM-DD

Si no encuentras un campo, déjalo como null.
Responde SOLO con el JSON, sin texto adicional.`;

  try {
    console.log('[INSURANCE-FORM] 🔍 Analizando licencia con AI Vision...');
    
    // Usar la primera imagen (o todas si quieres analizar múltiples)
    const imageUrl = Array.isArray(imageUrls) ? imageUrls[0] : imageUrls;
    const result = await analyzeImage(imageUrl, prompt, { detail: 'high', max_tokens: 800 });
    
    if (!result.success) {
      console.error('[INSURANCE-FORM] ❌ Error en AI Vision:', result.error);
      return null;
    }
    
    const analysisText = result.content;
    
    // Extraer JSON de la respuesta
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[INSURANCE-FORM] ❌ No se pudo extraer JSON de la respuesta AI');
      return null;
    }

    const data = JSON.parse(jsonMatch[0]);
    console.log('[INSURANCE-FORM] ✅ Licencia analizada:', data);
    return data;
  } catch (error) {
    console.error('[INSURANCE-FORM] ❌ Error analizando licencia:', error);
    return null;
  }
}

/**
 * ⏰ Valida que la licencia tenga mínimo 60 días de vigencia
 */
function validateLicenseExpiry(expiryDate) {
  if (!expiryDate) return { valid: false, message: 'No se pudo leer la fecha de expiración' };
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 60) {
    return {
      valid: false,
      message: `Tu licencia expira en ${diffDays} días. Necesitamos mínimo 60 días de vigencia. Por favor renueva tu licencia primero.`
    };
  }
  
  return {
    valid: true,
    daysRemaining: diffDays,
    message: `Vigente por ${Math.floor(diffDays / 30)} meses`
  };
}

/**
 * 📋 Genera resumen del formulario en múltiples mensajes
 * Se divide en 2-3 partes con delay de 3 segundos entre cada uno
 */
function generateFormSummaryMessages(formData) {
  const messages = [];

  // Mensaje 1: DATOS DEL VEHÍCULO
  messages.push({
    delay: 0,
    content: `✅ ¡Listo! He extraído la información.

📋 DATOS DEL VEHÍCULO
━━━━━━━━━━━━━━━
🚗 ${formData.vehicleBrand} ${formData.vehicleModel} ${formData.vehicleYear}
🔢 Placa: ${formData.plate}
🌍 Origen: ${formData.originCountry || 'N/A'}`
  });

  // Mensaje 2: DATOS TÉCNICOS
  messages.push({
    delay: 3000, // 3 segundos
    content: `🔧 DATOS TÉCNICOS
━━━━━━━━━━━━━━━
Motor: ${formData.motor || 'N/A'}
Chasis: ${formData.chasis || 'N/A'}

💰 Avalúo: $${formData.commercialValue.toLocaleString('en-US')}
📍 Ciudad: ${formData.city}`
  });

  // Mensaje 3: TU INFORMACIÓN
  const licenseValidation = validateLicenseExpiry(formData.licenseExpiry);
  messages.push({
    delay: 6000, // 6 segundos (3 + 3)
    content: `👤 TU INFORMACIÓN
━━━━━━━━━━━━━━━
Nombre: ${formData.fullName}
🆔 Cédula: ${formData.cedula}
🪪 Licencia: Tipo ${formData.licenseType}
⏰ Vigente hasta: ${formData.licenseExpiry} ✅
${licenseValidation.message}
📱 Teléfono: ${formData.phone}`
  });

  return messages;
}

/**
 * 🎯 Procesa el formulario de seguros de Adriana
 * 
 * LÓGICA ESPECIAL:
 * 1. Valida ciudad Sierra antes de continuar
 * 2. Valida rango de valor comercial $30k-$55k
 * 3. Recopila imágenes con delay de 30 segundos
 * 4. Analiza imágenes con AI Vision
 * 5. Genera resumen en múltiples mensajes
 * 6. Cotiza automáticamente al confirmar
 */
export async function processInsuranceForm(userId, message, userProfile) {
  console.log(`[INSURANCE-FORM] 📝 Procesando formulario de seguro para ${userId}`);

  // Obtener formulario pendiente si existe
  const pendingData = await getPendingConfirmation(userId);
  let currentForm = pendingData?.formData;

  // Si no hay formulario, usar el sistema genérico
  if (!currentForm || currentForm.agentName !== 'ADRIANA') {
    const result = await processGenericFormMessage(userId, message, 'ADRIANA');
    
    // VALIDACIÓN 1: Ciudad Sierra
    if (result.data?.city && !currentForm?.data?.cityValidated) {
      if (!isSierraCityValid(result.data.city)) {
        return {
          ...result,
          updates: {
            message: `😔 Lo siento, por el momento no ofrecemos cobertura en ${result.data.city}.\n\nSegPopular solo cotiza seguros vehiculares en ciudades de la Sierra: Quito, Cuenca, Ambato, Riobamba, Loja, Ibarra y otras ciudades serranas.\n\nLas ciudades costeras tienen tarifas diferentes que no manejamos. ¿Hay algo más en lo que pueda ayudarte?`,
            shouldStop: true
          }
        };
      }
      // Marcar como validada
      result.data.cityValidated = true;
      result.updates = { message: `¡Perfecto! ${result.data.city} está dentro de nuestra zona de cobertura ✅\n\nAhora cuéntame, ¿cuál es el valor comercial aproximado de tu vehículo? (avalúo actual)` };
    }

    // VALIDACIÓN 2: Valor comercial
    if (result.data?.commercialValue && !currentForm?.data?.valueValidated) {
      const value = parseFloat(result.data.commercialValue);
      
      if (value < MIN_COMMERCIAL_VALUE) {
        return {
          ...result,
          updates: {
            message: `😔 Lo siento, por el momento SegPopular solo cotiza seguros para vehículos con valor comercial entre $${MIN_COMMERCIAL_VALUE.toLocaleString('en-US')} y $${MAX_COMMERCIAL_VALUE.toLocaleString('en-US')}.\n\nTu vehículo ($${value.toLocaleString('en-US')}) está por debajo de nuestro rango. Te recomiendo buscar aseguradoras especializadas en vehículos de menor valor.\n\n¿Hay algo más en lo que pueda ayudarte?`,
            shouldStop: true
          }
        };
      }
      
      if (value > MAX_COMMERCIAL_VALUE) {
        return {
          ...result,
          updates: {
            message: `😔 Lo siento, por el momento SegPopular solo cotiza seguros para vehículos con valor comercial entre $${MIN_COMMERCIAL_VALUE.toLocaleString('en-US')} y $${MAX_COMMERCIAL_VALUE.toLocaleString('en-US')}.\n\nTu vehículo ($${value.toLocaleString('en-US')}) está por encima de nuestro rango. Te recomiendo buscar aseguradoras especializadas en vehículos de alta gama.\n\n¿Hay algo más en lo que pueda ayudarte?`,
            shouldStop: true
          }
        };
      }
      
      // Valor válido!
      result.data.valueValidated = true;
      result.updates = { message: `¡Excelente! 👌 Ese rango sí lo podemos cotizar.\n\nPara hacer tu cotización necesito que me envíes:\n\n📄 Matrícula del vehículo (ambos lados)` };
    }

    // Detectar imágenes de matrícula
    if (message.type === 'image' && result.data?.matriculaImages) {
      const imageCount = result.data.matriculaImages.length;
      
      if (imageCount === 1) {
        result.updates = { message: `📸 Recibida! Ahora envía el otro lado por favor` };
      } else if (imageCount === 2) {
        result.updates = { message: `¡Genial! 📄✅\n\nAhora necesito tu 🪪 Licencia de conducir (ambos lados)` };
      }
    }

    // Detectar imágenes de licencia (INICIO DE ANÁLISIS)
    if (message.type === 'image' && result.data?.licenciaImages) {
      const licCount = result.data.licenciaImages.length;
      
      if (licCount >= 2) {
        // ACTIVAR RECOPILACIÓN DE 30 SEGUNDOS
        result.updates = {
          message: `📸 Fotos recibidas!\n\nDame unos 30 segundos para analizar toda la información de tus documentos 🔍\n\nTe respondo con todo en un momento 😊`,
          triggerAnalysis: true,
          analysisDelay: 30000 // 30 segundos
        };
        
        // Guardar estado para análisis posterior
        await setPendingConfirmation(userId, {
          type: 'insurance_analysis',
          formData: result.form,
          timestamp: Date.now()
        });
      } else if (licCount === 1) {
        result.updates = { message: `📸 Recibida! Envía el otro lado de la licencia por favor` };
      }
    }

    return result;
  }

  // SI HAY ANÁLISIS PENDIENTE (después de 30 segundos)
  if (pendingData?.type === 'insurance_analysis') {
    console.log('[INSURANCE-FORM] ⏰ Ejecutando análisis de documentos...');

    try {
      // Analizar matrícula
      const matriculaData = await analyzeMatriculaImages(currentForm.data.matriculaImages);
      if (!matriculaData) {
        return {
          success: false,
          message: '❌ No pude analizar la matrícula correctamente. ¿Puedes enviar fotos más claras?'
        };
      }

      // Analizar licencia
      const licenciaData = await analyzeLicenciaImages(currentForm.data.licenciaImages);
      if (!licenciaData) {
        return {
          success: false,
          message: '❌ No pude analizar la licencia correctamente. ¿Puedes enviar fotos más claras?'
        };
      }

      // Validar vigencia de licencia
      const licenseValidation = validateLicenseExpiry(licenciaData.licenseExpiry);
      if (!licenseValidation.valid) {
        return {
          success: false,
          message: `⚠️ ${licenseValidation.message}\n\nUna vez renovada, con gusto te ayudo con la cotización.`
        };
      }

      // Fusionar todos los datos
      const completeData = {
        ...currentForm.data,
        ...matriculaData,
        ...licenciaData,
        phone: userProfile.phone || userId, // Teléfono automático de WhatsApp
        analysisCompleted: true
      };

      // Actualizar formulario
      currentForm.data = completeData;
      await setPendingConfirmation(userId, {
        type: 'insurance_ready_to_confirm',
        formData: currentForm,
        timestamp: Date.now()
      });

      // Generar mensajes de resumen
      const summaryMessages = generateFormSummaryMessages(completeData);

      return {
        success: true,
        isComplete: true,
        data: completeData,
        summaryMessages, // Se enviarán con delays
        nextQuestion: '¿Todo está correcto? 😊\n\nResponde SI para que prepare tu cotización'
      };

    } catch (error) {
      console.error('[INSURANCE-FORM] ❌ Error en análisis:', error);
      return {
        success: false,
        message: '❌ Hubo un error al analizar los documentos. Por favor intenta de nuevo.'
      };
    }
  }

  // SI ESPERAMOS CONFIRMACIÓN FINAL
  if (pendingData?.type === 'insurance_ready_to_confirm') {
    const lowerMsg = message.text?.toLowerCase().trim() || '';
    
    // Respuestas positivas
    if (['si', 'sí', 'ok', 'dale', 'confirmar', 'correcto', 'exacto', 'perfecto', '✅', '👍'].includes(lowerMsg)) {
      // CALCULAR COTIZACIÓN
      const premium = calculateInsurancePremium(currentForm.data.commercialValue);
      
      currentForm.data.quotedPremium = premium.totalPremium;
      currentForm.data.premiumBreakdown = premium;

      // Guardar en pending para que insurance-confirmation.js lo procese
      await setPendingConfirmation(userId, {
        type: 'insurance_confirmed',
        formData: currentForm,
        premium,
        timestamp: Date.now()
      });

      return {
        success: true,
        isComplete: true,
        confirmed: true,
        data: currentForm.data,
        premium,
        message: `🎉 ¡Excelente!

💰 TU COTIZACIÓN:
━━━━━━━━━━━━━━━
Valor del vehículo: $${currentForm.data.commercialValue.toLocaleString('en-US')}

Prima anual estimada:
💵 $${premium.totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2 })}

Esta cotización incluye cobertura completa para tu ${currentForm.data.vehicleBrand} ${currentForm.data.vehicleModel} ${currentForm.data.vehicleYear}

📧 Te he enviado un email con todos los detalles y términos de la póliza.

🛡️ SegPopular
Tu seguro popular de confianza
📞 02-XXX-XXXX`
      };
    }
    
    // Respuestas negativas
    if (['no', 'cancelar', 'mal', 'incorrecto', '❌', '👎'].includes(lowerMsg)) {
      return {
        success: false,
        message: 'De acuerdo, dime qué necesitas corregir y empezamos de nuevo 😊'
      };
    }

    // No entendió
    return {
      success: false,
      message: 'Por favor responde SI para confirmar o NO si necesitas corregir algo'
    };
  }

  // Caso por defecto: continuar con formulario genérico
  return await processGenericFormMessage(userId, message, 'ADRIANA');
}

/**
 * 📊 Obtiene el estado actual del formulario
 */
export async function getInsuranceFormStatus(userId) {
  const pending = await getPendingConfirmation(userId);
  
  if (!pending || pending.formData?.agentName !== 'ADRIANA') {
    return { hasForm: false };
  }

  return {
    hasForm: true,
    type: pending.type,
    data: pending.formData.data,
    isComplete: pending.formData.isComplete?.(),
    timestamp: pending.timestamp
  };
}

/**
 * 🗑️ Cancela el formulario actual
 */
export async function cancelInsuranceForm(userId) {
  await clearPendingConfirmation(userId);
  console.log(`[INSURANCE-FORM] 🗑️ Formulario de seguro cancelado para ${userId}`);
}
