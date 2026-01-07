/**
 * 📋 AXEL QUOTE FORM SERVICE
 * Sistema de formulario express para recopilar datos de cotización
 * Recopila progresivamente: marca, modelo, año, nombre, email
 */

import databaseService from '../database/database.js';

/**
 * 📝 Guarda/actualiza formulario parcial de Axel en DB
 */
export async function saveAxelForm(userPhone, formData) {
  try {
    console.log('[AXEL-FORM] 💾 Guardando formulario:', { userPhone, formData });

    await databaseService.run(
      `INSERT INTO partial_forms (user_phone, form_data, form_type, created_at, updated_at)
       VALUES (?, ?, 'axel_quote', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(user_phone) DO UPDATE SET 
         form_data = excluded.form_data,
         updated_at = CURRENT_TIMESTAMP`,
      [userPhone, JSON.stringify(formData)]
    );

    console.log('[AXEL-FORM] ✅ Formulario guardado exitosamente');
    return { success: true };

  } catch (error) {
    console.error('[AXEL-FORM] ❌ Error guardando formulario:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📖 Recupera formulario parcial de Axel
 */
export async function getAxelForm(userPhone) {
  try {
    const row = await databaseService.get(
      `SELECT form_data, created_at, updated_at 
       FROM partial_forms 
       WHERE user_phone = ? AND form_type = 'axel_quote'`,
      [userPhone]
    );

    if (!row) {
      return { exists: false, data: null };
    }

    const formData = JSON.parse(row.form_data);
    
    return {
      exists: true,
      data: formData,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

  } catch (error) {
    console.error('[AXEL-FORM] ❌ Error recuperando formulario:', error);
    return { exists: false, data: null, error: error.message };
  }
}

/**
 * 🗑️ Elimina formulario de Axel (cuando se completa la cotización)
 */
export async function deleteAxelForm(userPhone) {
  try {
    await databaseService.run(
      `DELETE FROM partial_forms WHERE user_phone = ? AND form_type = 'axel_quote'`,
      [userPhone]
    );
    console.log('[AXEL-FORM] 🗑️ Formulario eliminado');
    return { success: true };
  } catch (error) {
    console.error('[AXEL-FORM] ❌ Error eliminando formulario:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🔍 Extrae datos del vehículo del mensaje del usuario usando OpenAI
 */
export async function extractVehicleData(messageText, currentFormData = {}) {
  try {
    console.log('[AXEL-FORM] 🔍 Extrayendo datos del mensaje...');
    
    const { complete } = await import('../servicios-ia/openai.js');
    
    const extractionPrompt = `Eres un asistente que extrae información de vehículos de mensajes de WhatsApp.

DATOS ACTUALES DEL FORMULARIO:
${JSON.stringify(currentFormData, null, 2)}

MENSAJE DEL USUARIO:
"${messageText}"

TAREA:
Extrae SOLO los datos del vehículo que el usuario menciona en este mensaje y actualiza el formulario.

REGLAS:
- Solo extraer lo que el usuario dice EXPLÍCITAMENTE
- Si algo no está en el mensaje, déjalo como estaba (o null si no existía)
- La marca debe ser normalizada (ej: "toyota" → "Toyota", "chevrolet" → "Chevrolet")
- El año debe ser un número de 4 dígitos
- El nombre debe ser el nombre completo de la persona
- El email debe ser un email válido

RESPONDE EN FORMATO JSON:
{
  "marca": "string o null",
  "modelo": "string o null",
  "año": "number o null",
  "nombre": "string o null",
  "email": "string o null"
}

EJEMPLOS:
Mensaje: "es un toyota corolla 2015"
→ {"marca": "Toyota", "modelo": "Corolla", "año": 2015, "nombre": null, "email": null}

Mensaje: "mi nombre es Carlos Pérez, email carlos@gmail.com"
→ {"marca": null, "modelo": null, "año": null, "nombre": "Carlos Pérez", "email": "carlos@gmail.com"}

Mensaje: "año 2018"
→ {"marca": null, "modelo": null, "año": 2018, "nombre": null, "email": null}

RESPONDE SOLO EL JSON, SIN EXPLICACIONES:`;

    const response = await complete(extractionPrompt, {
      temperature: 0.1,
      max_tokens: 150,
      model: 'gpt-4o-mini'
    });

    // Parsear respuesta JSON
    const extracted = JSON.parse(response.trim());
    
    // Mergear con datos actuales (preservar lo que ya existía)
    const updatedData = {
      marca: extracted.marca || currentFormData.marca || null,
      modelo: extracted.modelo || currentFormData.modelo || null,
      año: extracted.año || currentFormData.año || null,
      nombre: extracted.nombre || currentFormData.nombre || null,
      email: extracted.email || currentFormData.email || null
    };

    console.log('[AXEL-FORM] ✅ Datos extraídos:', updatedData);

    return {
      success: true,
      data: updatedData
    };

  } catch (error) {
    console.error('[AXEL-FORM] ❌ Error extrayendo datos:', error);
    return {
      success: false,
      error: error.message,
      data: currentFormData // Devolver datos sin cambios si falla
    };
  }
}

/**
 * ✅ Verifica qué campos faltan en el formulario
 */
export function getMissingFields(formData) {
  const required = ['marca', 'modelo', 'año', 'nombre', 'email'];
  const missing = [];

  for (const field of required) {
    if (!formData[field]) {
      missing.push(field);
    }
  }

  return missing;
}

/**
 * 💬 Genera mensaje solicitando los campos faltantes (máximo 2-3 por vez)
 */
export function generateFormPrompt(missingFields, currentData = {}) {
  // Agrupar campos relacionados
  const groups = [
    ['marca', 'modelo', 'año'],  // Datos del vehículo
    ['nombre', 'email']           // Datos personales
  ];

  // Determinar qué grupo pedir
  let fieldsToAsk = [];
  
  for (const group of groups) {
    const missingInGroup = group.filter(f => missingFields.includes(f));
    if (missingInGroup.length > 0) {
      fieldsToAsk = missingInGroup.slice(0, 3); // Max 3 campos
      break;
    }
  }

  // Generar mensaje según los campos que faltan
  if (fieldsToAsk.includes('marca') || fieldsToAsk.includes('modelo') || fieldsToAsk.includes('año')) {
    // Pedir datos del vehículo
    let message = '🚗 *DATOS DEL VEHÍCULO*\n\n';
    message += 'Para preparar tu cotización, necesito:\n';
    
    const vehicleFields = [];
    if (fieldsToAsk.includes('marca')) vehicleFields.push('📌 Marca');
    if (fieldsToAsk.includes('modelo')) vehicleFields.push('📌 Modelo');
    if (fieldsToAsk.includes('año')) vehicleFields.push('📌 Año');
    
    message += vehicleFields.join('\n') + '\n\n';
    message += '_Ejemplo: Toyota Corolla 2018_';
    
    return message;
  }

  if (fieldsToAsk.includes('nombre') || fieldsToAsk.includes('email')) {
    // Pedir datos personales
    let message = '📋 *DATOS PERSONALES*\n\n';
    message += 'Para enviarte la cotización formal, necesito:\n';
    
    const personalFields = [];
    if (fieldsToAsk.includes('nombre')) personalFields.push('📌 Tu nombre completo');
    if (fieldsToAsk.includes('email')) personalFields.push('📌 Tu email');
    
    message += personalFields.join('\n') + '\n\n';
    message += '_Ejemplo: Carlos Pérez, carlos@gmail.com_';
    
    return message;
  }

  return null; // Formulario completo
}

/**
 * 🎯 Proceso principal: Actualiza formulario y retorna siguiente paso
 */
export async function processAxelFormMessage(userPhone, messageText) {
  try {
    console.log('[AXEL-FORM] 🎯 Procesando mensaje para formulario');

    // 1. Obtener formulario actual
    const { data: currentForm } = await getAxelForm(userPhone);
    const currentData = currentForm || {};

    // 2. Extraer nuevos datos del mensaje
    const extraction = await extractVehicleData(messageText, currentData);
    if (!extraction.success) {
      return {
        success: false,
        error: 'No pude procesar tu mensaje',
        needsMoreInfo: true,
        currentData: currentData
      };
    }

    const updatedData = extraction.data;

    // 3. Guardar formulario actualizado
    await saveAxelForm(userPhone, updatedData);

    // 4. Verificar qué campos faltan
    const missingFields = getMissingFields(updatedData);

    // 5. Si está completo, devolver datos
    if (missingFields.length === 0) {
      console.log('[AXEL-FORM] ✅ Formulario completo');
      return {
        success: true,
        complete: true,
        needsMoreInfo: false,
        data: updatedData
      };
    }

    // 6. Si faltan campos, generar prompt
    const prompt = generateFormPrompt(missingFields, updatedData);

    console.log(`[AXEL-FORM] ⏳ Formulario incompleto, faltan: ${missingFields.join(', ')}`);

    return {
      success: true,
      complete: false,
      needsMoreInfo: true,
      missingFields: missingFields,
      prompt: prompt,
      currentData: updatedData
    };

  } catch (error) {
    console.error('[AXEL-FORM] ❌ Error procesando formulario:', error);
    return {
      success: false,
      error: error.message,
      needsMoreInfo: true
    };
  }
}

/**
 * 📊 Genera resumen visual del formulario actual
 */
export function generateFormSummary(formData) {
  const fields = [
    { key: 'marca', label: 'Marca', emoji: '🏭' },
    { key: 'modelo', label: 'Modelo', emoji: '🚗' },
    { key: 'año', label: 'Año', emoji: '📅' },
    { key: 'nombre', label: 'Nombre', emoji: '👤' },
    { key: 'email', label: 'Email', emoji: '📧' }
  ];

  let summary = '*📋 INFORMACIÓN RECOPILADA:*\n\n';

  for (const field of fields) {
    const value = formData[field.key];
    const status = value ? '✅' : '⏳';
    const displayValue = value || '_pendiente_';
    summary += `${status} ${field.emoji} ${field.label}: ${displayValue}\n`;
  }

  return summary;
}
