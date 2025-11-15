/**
 * 🧠 Formulario Parcial de Reserva Inteligente
 * 
 * Permite a Aurora "recordar" datos entre mensajes y completar
 * progresivamente la información de reserva sin obligar al usuario
 * a seguir un orden estricto.
 * 
 * El usuario puede mencionar datos en cualquier orden:
 * - "quiero un hot desk para hoy, mi correo es yo@diegovillota.com"
 * - "mañana a las 3pm"
 * - "voy con 2 personas más"
 * 
 * Aurora completa el formulario progresivamente y pregunta solo
 * lo que falta.
 */

import { getPendingConfirmation, setPendingConfirmation, clearPendingConfirmation } from './reservation-state.js';

// TTL del formulario: 15 minutos (tiempo razonable para completar reserva)
const FORM_TTL_SECONDS = 15 * 60;

/**
 * 🎯 Clase que representa un formulario parcial de reserva
 */
export class PartialReservationForm {
  constructor(userId, existingData = {}) {
    this.userId = userId;
    this.spaceType = existingData.spaceType || null;      // 'hotDesk' | 'meetingRoom'
    this.date = existingData.date || null;                // '2025-11-12'
    this.time = existingData.time || null;                // '10:00'
    this.email = existingData.email || null;              // 'yo@diegovillota.com'
    this.numPeople = existingData.numPeople || 1;         // default 1 (solo el usuario)
    this.durationHours = existingData.durationHours || 2; // default 2h
    this.updatedAt = new Date();
  }

  /**
   * 📋 Actualiza un campo del formulario
   */
  updateField(field, value) {
    if (this[field] !== undefined) {
      this[field] = value;
      this.updatedAt = new Date();
      console.log(`[FORM] 📝 Campo actualizado: ${field} = ${value}`);
    }
  }

  /**
   * 📊 Actualiza múltiples campos a la vez
   */
  updateFields(data) {
    Object.keys(data).forEach(key => {
      if (this[key] !== undefined && data[key] !== null && data[key] !== undefined) {
        this[key] = data[key];
      }
    });
    this.updatedAt = new Date();
    console.log('[FORM] 📝 Múltiples campos actualizados:', Object.keys(data));
  }

  /**
   * ❓ Obtiene lista de campos faltantes
   */
  getMissingFields() {
    const missing = [];
    
    if (!this.spaceType) missing.push('spaceType');
    if (!this.date) missing.push('date');
    if (!this.time) missing.push('time');
    if (!this.email) missing.push('email');
    
    return missing;
  }

  /**
   * ✅ Verifica si el formulario está completo
   */
  isComplete() {
    return this.getMissingFields().length === 0;
  }

  /**
   * 🎯 Genera pregunta inteligente para el siguiente campo faltante
   */
  getNextQuestion() {
    const missing = this.getMissingFields();
    
    if (missing.length === 0) {
      return null; // Formulario completo
    }

    const field = missing[0];
    const userName = this.userName || '';

    switch(field) {
      case 'spaceType':
        return `¿Qué espacio necesitas${userName}? Tenemos:\n\n📍 Hot Desk ($10/2h)\n🏢 Sala de Reuniones (3-4 personas, $29/2h)`;
      
      case 'date':
        return `¿Para qué día${userName}? Puedes decir "hoy", "mañana" o una fecha específica 📅`;
      
      case 'time':
        return `¿A qué hora te gustaría venir? (horario: 7am - 8pm) ⏰`;
      
      case 'email':
        return `¿Cuál es tu correo electrónico? Lo necesito para enviarte la confirmación 📧`;
      
      default:
        return `¿Podrías darme más detalles sobre tu reserva${userName}?`;
    }
  }

  /**
   * 📄 Genera resumen del formulario actual
   */
  getSummary() {
    const parts = [];
    
    if (this.spaceType) {
      const spaceName = this.spaceType === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones';
      parts.push(`🏢 Espacio: ${spaceName}`);
    }
    
    if (this.date) {
      parts.push(`📅 Fecha: ${this.date}`);
    }
    
    if (this.time) {
      parts.push(`⏰ Hora: ${this.time}`);
    }
    
    if (this.numPeople > 1) {
      parts.push(`👥 Personas: ${this.numPeople}`);
    }
    
    if (this.email) {
      parts.push(`📧 Email: ${this.email}`);
    }

    return parts.join('\n');
  }

  /**
   * 🔄 Genera resumen con pregunta de confirmación al retomar
   */
  getResumeMessage() {
    const missing = this.getMissingFields();
    const hasSomeData = this.spaceType || this.date || this.time || this.email;
    
    if (!hasSomeData) {
      return null; // No hay datos para resumir
    }

    let message = '¡Perfecto! Veo que tenías una reserva en proceso. Déjame verificar los datos:\n\n';
    message += this.getSummary();
    
    if (missing.length > 0) {
      message += '\n\n';
      const missingNames = missing.map(f => {
        switch(f) {
          case 'spaceType': return 'tipo de espacio';
          case 'date': return 'fecha';
          case 'time': return 'hora';
          case 'email': return 'email';
          default: return f;
        }
      });
      message += `❓ Falta: ${missingNames.join(', ')}`;
    }
    
    message += '\n\n¿Deseas mantener estos datos o hacer algún cambio?';
    return message;
  }

  /**
   * 💾 Convierte a objeto plano para almacenamiento
   */
  toJSON() {
    return {
      userId: this.userId,
      spaceType: this.spaceType,
      date: this.date,
      time: this.time,
      email: this.email,
      numPeople: this.numPeople,
      durationHours: this.durationHours,
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * 📂 Crea formulario desde objeto almacenado
   */
  static fromJSON(data) {
    return new PartialReservationForm(data.userId, {
      spaceType: data.spaceType,
      date: data.date,
      time: data.time,
      email: data.email,
      numPeople: data.numPeople,
      durationHours: data.durationHours
    });
  }
}

/**
 * 🔍 Obtiene o crea formulario parcial para un usuario
 */
export async function getOrCreateForm(userId) {
  try {
    const existing = await getPendingConfirmation(userId);
    
    if (existing && existing.formData) {
      console.log('[FORM] 📂 Formulario existente cargado para:', userId);
      return PartialReservationForm.fromJSON(existing.formData);
    }
    
    console.log('[FORM] ✨ Nuevo formulario creado para:', userId);
    return new PartialReservationForm(userId);
  } catch (error) {
    console.error('[FORM] ❌ Error obteniendo formulario:', error);
    return new PartialReservationForm(userId);
  }
}

/**
 * 💾 Guarda formulario parcial en BD
 */
export async function saveForm(form) {
  try {
    await setPendingConfirmation(form.userId, {
      formData: form.toJSON(),
      type: 'partial_form'
    }, FORM_TTL_SECONDS / 60); // Convertir segundos a minutos
    
    console.log('[FORM] 💾 Formulario guardado para:', form.userId);
    return true;
  } catch (error) {
    console.error('[FORM] ❌ Error guardando formulario:', error);
    return false;
  }
}

/**
 * 🗑️ Limpia formulario parcial (cuando se completa o cancela)
 */
export async function clearForm(userId) {
  try {
    await clearPendingConfirmation(userId);
    console.log('[FORM] 🗑️ Formulario limpiado para:', userId);
    return true;
  } catch (error) {
    console.error('[FORM] ❌ Error limpiando formulario:', error);
    return false;
  }
}

/**
 * 🎯 Extrae datos del mensaje del usuario y actualiza formulario
 * 
 * Detecta menciones de:
 * - Tipo de espacio: "hot desk", "sala de reuniones"
 * - Fecha: "hoy", "mañana", "lunes", "12/11/2025"
 * - Hora: "10am", "3:30pm", "15:00"
 * - Email: "yo@diegovillota.com"
 * - Número de personas: "voy con 2 personas", "somos 3"
 */
export function extractDataFromMessage(message, currentForm) {
  const updates = {};
  const lowerMsg = message.toLowerCase();

  // 🏢 Detectar tipo de espacio
  if (!currentForm.spaceType) {
    if (/hot\s*desk|escritorio|puesto/i.test(message)) {
      updates.spaceType = 'hotDesk';
      console.log('[FORM] 🏢 Detectado: Hot Desk');
    } else if (/sala|meeting\s*room|reuni[oó]n/i.test(message)) {
      updates.spaceType = 'meetingRoom';
      console.log('[FORM] 🏢 Detectado: Sala de Reuniones');
    }
  }

  // 📅 Detectar fecha
  if (!currentForm.date) {
    const today = new Date();
    const relativeMatch = lowerMsg.match(/\b(hoy|ma[ñn]ana)\b/);
    const isoMatch = message.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    const shortMatch = message.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    
    // 🆕 Detectar formato "18 de noviembre", "18 noviembre"
    const monthNames = {
      'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
      'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
      'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
    };
    const namedDateMatch = lowerMsg.match(/(\d{1,2})\s+(?:de\s+)?(\w+)/);

    if (relativeMatch) {
      const keyword = relativeMatch[1];
      if (keyword === 'hoy') {
        updates.date = today.toISOString().split('T')[0];
      } else {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        updates.date = tomorrow.toISOString().split('T')[0];
      }
      console.log('[FORM] 📅 Detectado fecha relativa:', updates.date);
    } else if (namedDateMatch) {
      const [, dayStr, monthName] = namedDateMatch;
      const month = monthNames[monthName.toLowerCase()];
      if (month) {
        const day = parseInt(dayStr, 10);
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        
        // Si el mes ya pasó este año, usar año siguiente
        let year = currentYear;
        if (month < currentMonth || (month === currentMonth && day < today.getDate())) {
          year = currentYear + 1;
        }
        
        updates.date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        console.log('[FORM] 📅 Detectado fecha con nombre de mes:', updates.date);
      }
    } else if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const normalizedYear = year.padStart(4, '0');
      updates.date = `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log('[FORM] 📅 Detectado fecha ISO:', updates.date);
    } else if (shortMatch) {
      const [, day, month, yearPart] = shortMatch;
      let year = yearPart;
      if (yearPart.length === 2) {
        const century = today.getFullYear().toString().slice(0, 2);
        year = `${century}${yearPart.padStart(2, '0')}`;
      } else if (yearPart.length === 3) {
        year = `2${yearPart.padStart(3, '0')}`;
      }
      updates.date = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log('[FORM] 📅 Detectado fecha con barras:', updates.date);
    }
  }

  // ⏰ Detectar hora
  if (!currentForm.time) {
    const timeRegex = /(?:\b(a\s+las|a\s+la|las|hora|hacia|sobre|desde\s+las|desde\s+la)\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;
    let detectedTime = null;

    for (const match of message.matchAll(timeRegex)) {
      const [, prefix, hourStr, minuteStr, meridiemRaw] = match;
      const meridiem = meridiemRaw ? meridiemRaw.toLowerCase() : null;
      const hasExplicitMinutes = Boolean(minuteStr) || /:/.test(match[0]);
      const isTimeContext = Boolean(prefix);

      if (!isTimeContext && !meridiem && !hasExplicitMinutes) {
        continue; // Evitar confundir números de personas con horas
      }

      let hour = parseInt(hourStr, 10);
      if (Number.isNaN(hour)) continue;
      const minute = minuteStr ? parseInt(minuteStr, 10) : 0;

      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;

      detectedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      break;
    }

    if (detectedTime) {
      updates.time = detectedTime;
      console.log('[FORM] ⏰ Detectado hora:', updates.time);
    }
  }

  // 📧 Detectar email
  if (!currentForm.email) {
    const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      updates.email = emailMatch[1];
      console.log('[FORM] 📧 Detectado email:', updates.email);
    }
  }

  // 👥 Detectar número de personas
  const peoplePatterns = [
    /(?:somos|vamos|iremos|voy con)\s+(\d+)/i,
    /(\d+)\s+personas?/i,
    /con\s+(\d+)\s+(?:personas?|acompa[ñn]antes?)/i
  ];

  for (const pattern of peoplePatterns) {
    const match = message.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      updates.numPeople = num;
      console.log('[FORM] 👥 Detectado personas:', num);
      break;
    }
  }

  return updates;
}

/**
 * 🤖 Procesa mensaje y actualiza formulario automáticamente
 * Retorna: { form, updates, nextQuestion, needsMoreInfo }
 */
export async function processMessageWithForm(userId, message) {
  // 1. Obtener o crear formulario
  const form = await getOrCreateForm(userId);

  // 2. Extraer datos del mensaje
  const updates = extractDataFromMessage(message, form);

  // 3. Actualizar formulario si hay datos nuevos
  if (Object.keys(updates).length > 0) {
    form.updateFields(updates);
    await saveForm(form);
  }

  // 4. Verificar si está completo
  const isComplete = form.isComplete();
  const nextQuestion = isComplete ? null : form.getNextQuestion();

  return {
    form,
    updates,
    nextQuestion,
    needsMoreInfo: !isComplete,
    summary: form.getSummary(),
    userMessage: message // Para detectar frustración
  };
}
