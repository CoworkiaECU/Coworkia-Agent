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

// TTL del formulario: 2 horas (usuarios pueden distraerse, atender llamadas, etc.)
const FORM_TTL_SECONDS = 2 * 60 * 60;

// 🎉 Lista de feriados nacionales de Ecuador (2025-2026)
const FERIADOS_ECUADOR = [
  '2025-01-01', '2025-02-10', '2025-02-11', '2025-03-28', '2025-05-01',
  '2025-05-24', '2025-07-24', '2025-08-10', '2025-10-09', '2025-11-02',
  '2025-11-03', '2025-12-25', '2025-12-31',
  '2026-01-01', '2026-02-23', '2026-02-24', '2026-04-10', '2026-05-01',
  '2026-05-24', '2026-07-24', '2026-08-10', '2026-10-09', '2026-11-02',
  '2026-11-03', '2026-12-25', '2026-12-31'
];

const NOMBRES_FERIADOS = {
  '01-01': 'Año Nuevo', '12-25': 'Navidad', '12-31': 'Fin de Año',
  '05-01': 'Día del Trabajo', '05-24': 'Batalla de Pichincha',
  '07-24': 'Natalicio de Simón Bolívar', '08-10': 'Primer Grito de Independencia',
  '10-09': 'Independencia de Guayaquil', '11-02': 'Día de los Difuntos',
  '11-03': 'Independencia de Cuenca', '02-10': 'Carnaval', '02-11': 'Carnaval',
  '02-23': 'Carnaval', '02-24': 'Carnaval', '03-28': 'Viernes Santo',
  '04-10': 'Viernes Santo'
};

/**
 * 🎯 Clase que representa un formulario parcial de reserva
 */
export class PartialReservationForm {
  constructor(userId, existingData = {}, freeTrialUsed = false) {
    this.userId = userId;
    this.spaceType = existingData.spaceType || null;      // 'hotDesk' | 'meetingRoom'
    this.date = existingData.date || null;                // '2025-11-12'
    this.time = existingData.time || null;                // '10:00'
    this.email = existingData.email || null;              // 'yo@diegovillota.com'
    this.numPeople = existingData.numPeople || 1;         // default 1 (solo el usuario)
    this.durationHours = existingData.durationHours || 2; // default 2h
    this.paymentMethod = existingData.paymentMethod || null; // 'transferencia' | 'tarjeta' | 'efectivo' (bypass temporal)
    this.freeTrialUsed = freeTrialUsed;                   // ← Estado del free trial del usuario
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
    // 🎉 NO pedir paymentMethod si el usuario tiene free trial disponible (freeTrialUsed === false)
    if (!this.paymentMethod && this.freeTrialUsed !== false) missing.push('paymentMethod');
    
    return missing;
  }

  /**
   * ✅ Verifica si el formulario está completo
   */
  isComplete() {
    return this.getMissingFields().length === 0;
  }

  /**
   * 💰 Calcula el precio base según tipo de espacio
   */
  getBasePrice() {
    if (this.spaceType === 'hotDesk') {
      return 10; // $10 por 2 horas
    } else if (this.spaceType === 'meetingRoom') {
      return 29; // $29 por 2 horas
    }
    return 0;
  }

  /**
   * 💵 Calcula el total con impuestos según método de pago
   * IMPORTANTE: IVA se aplica sobre el subtotal (base + ISD) en tarjetas
   */
  calculateTotalWithTaxes() {
    const basePrice = this.getBasePrice();
    
    if (!this.paymentMethod) {
      return { base: basePrice, total: basePrice, taxes: {} };
    }

    let total = basePrice;
    const taxes = {};

    // Normalizar método de pago para cálculo de impuestos
    const metodoPago = this.paymentMethod?.toLowerCase();
    
    // Métodos de pago con TARJETA (aplican ISD 5% + IVA 15%)
    const esPagoConTarjeta = [
      'tarjeta', 'payphone', 'visa', 'mastercard', 'diners', 'paypal',
      'credito', 'debito', 'american express', 'amex', 'alia'
    ].some(metodo => metodoPago?.includes(metodo));
    
    if (esPagoConTarjeta) {
      // TARJETAS (Visa, Mastercard, Diners, PayPal, Payphone, etc.)
      // +5% ISD (Impuesto Salida Divisas), luego +15% IVA sobre (base + ISD)
      const isd = basePrice * 0.05;
      taxes.isd = parseFloat(isd.toFixed(2));
      
      const subtotalConISD = basePrice + taxes.isd;
      const iva = subtotalConISD * 0.15;
      taxes.iva = Math.round(iva * 100) / 100;
      
      total = basePrice + taxes.isd + taxes.iva;
      console.log(`[FORM] 💳 Pago con tarjeta (${this.paymentMethod}): Base $${basePrice} + ISD $${taxes.isd} + IVA $${taxes.iva} = $${total}`);
    } else if (metodoPago === 'transferencia' || metodoPago?.includes('banco') || metodoPago?.includes('cooperativa')) {
      // TRANSFERENCIAS BANCARIAS (Ecuador - sin ISD)
      // Solo +15% IVA sobre base
      const iva = basePrice * 0.15;
      taxes.iva = parseFloat(iva.toFixed(2));
      total = basePrice + taxes.iva;
      console.log(`[FORM] 🏦 Transferencia bancaria: Base $${basePrice} + IVA $${taxes.iva} = $${total}`);
    } else if (this.paymentMethod === 'efectivo') {
      // 🔓 BYPASS TEMPORAL: Efectivo sin impuestos (para testing)
      // TODO: Remover cuando no se necesite más el bypass
      total = basePrice;
      console.log('[FORM] 🔓 Bypass efectivo activado - sin impuestos');
    }

    return {
      base: parseFloat(basePrice.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      taxes
    };
  }

  /**
   * 📋 Genera resumen de pago completo con impuestos
   */
  getPaymentSummary() {
    if (!this.spaceType || !this.paymentMethod) {
      return null;
    }

    const spaceName = this.spaceType === 'hotDesk' ? '📍 Hot Desk' : '🏢 Sala de Reuniones';
    const pricing = this.calculateTotalWithTaxes();
    
    let summary = `${spaceName} (${this.durationHours}h)\\n`;
    summary += `Subtotal: $${pricing.base.toFixed(2)}\\n`;

    const metodoPago = this.paymentMethod?.toLowerCase();
    const esPagoConTarjeta = [
      'tarjeta', 'payphone', 'visa', 'mastercard', 'diners', 'paypal',
      'credito', 'debito', 'american express', 'amex', 'alia'
    ].some(metodo => metodoPago?.includes(metodo));
    
    if (esPagoConTarjeta) {
      // Pagos con tarjeta (incluye Payphone, Visa, Mastercard, etc.)
      summary += `ISD (5%): $${pricing.taxes.isd.toFixed(2)}\\n`;
      summary += `IVA (15%): $${pricing.taxes.iva.toFixed(2)}\\n`;
      summary += `\\n💳 Total a pagar: $${pricing.total.toFixed(2)}`;
    } else if (metodoPago === 'transferencia' || metodoPago?.includes('banco') || metodoPago?.includes('cooperativa')) {
      // Transferencias bancarias Ecuador
      summary += `IVA (15%): $${pricing.taxes.iva.toFixed(2)}\\n`;
      summary += `\\n🏦 Total a pagar: $${pricing.total.toFixed(2)}`;
    } else if (this.paymentMethod === 'efectivo') {
      // 🔓 BYPASS TEMPORAL para testing
      summary += `\\n💵 Pago en efectivo: $${pricing.total.toFixed(2)}`;
      summary += `\\n\\n✅ Pagarás directamente en Coworkia`;
    }

    return summary;
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
        return `¿Qué espacio necesitas${userName}? Tenemos:\n\n📍 Hot Desk\n🏢 Sala de Reuniones (3-4 personas, $29/2h)`;
      
      case 'date':
        return `¿Para qué día${userName}? Puedes decir "hoy", "mañana" o una fecha específica 📅`;
      
      case 'time':
        return `¿A qué hora te gustaría venir? (horario: 7am - 8pm) ⏰`;
      
      case 'email':
        return `¿Cuál es tu correo electrónico? Lo necesito para enviarte la confirmación 📧`;
      
      case 'paymentMethod':
        // 🎉 Si tiene free trial disponible, no pedir método de pago
        if (this.freeTrialUsed === false) {
          return '✅ ¡Tu reserva será GRATIS! 🎉';
        }
        return `¿Cómo deseas pagar?\n\n💳 Tarjeta crédito/débito\n🏦 Transferencia bancaria\n\nEscribe "tarjeta" o "transferencia"`;
      
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

    let message = '¡Perfecto! Ya tengo algunos datos de tu reserva:\n\n';
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
      message += `❓ Solo necesito: ${missingNames.join(', ')}`;
    }
    
    message += '\n\n¿Te viene bien o prefieres cambiar algo?';
    return message;
  }

  /**
   * 💾 Convierte a objeto plano para almacenamiento
   */
  toJSON() {
    // Calcular precio con impuestos si hay método de pago
    const pricing = this.paymentMethod ? this.calculateTotalWithTaxes() : { total: 0 };
    
    return {
      userId: this.userId,
      spaceType: this.spaceType,
      date: this.date,
      time: this.time,
      email: this.email,
      numPeople: this.numPeople,
      durationHours: this.durationHours,
      paymentMethod: this.paymentMethod,
      totalPrice: pricing.total,  // ← Calcular total con impuestos
      freeTrialUsed: this.freeTrialUsed,  // ← Preservar estado del free trial
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * 📂 Crea formulario desde objeto almacenado
   */
  static fromJSON(data, freeTrialUsed = false) {
    return new PartialReservationForm(data.userId, {
      spaceType: data.spaceType,
      date: data.date,
      time: data.time,
      email: data.email,
      numPeople: data.numPeople,
      durationHours: data.durationHours,
      paymentMethod: data.paymentMethod
    }, data.freeTrialUsed !== undefined ? data.freeTrialUsed : freeTrialUsed);  // ← Preferir valor almacenado
  }
}

/**
 * 🔍 Obtiene o crea formulario parcial para un usuario
 * 
 * IMPORTANTE: Detecta si pending_confirmations contiene datos normalizados
 * (formato {date, startTime, serviceType}) y los convierte a formato de formulario
 * para preservar información ya capturada.
 */
export async function getOrCreateForm(userId, freeTrialUsed = false) {
  try {
    const existing = await getPendingConfirmation(userId);
    
    // 🔄 CASO 1: Ya existe un formulario parcial guardado
    if (existing && existing._type === 'partial_form' && existing._formData) {
      console.log('[FORM] 📂 Formulario parcial existente cargado para:', userId);
      return PartialReservationForm.fromJSON(existing._formData, freeTrialUsed);
    }
    
    // 🔄 CASO 2: Hay datos normalizados (de confirmación previa) - convertir a formulario
    if (existing && existing._type === 'direct') {
      console.log('[FORM] 🔄 Detectado formato normalizado, convirtiendo a formulario...');
      
      const formData = {
        userId: existing.userId,
        spaceType: existing.serviceType,        // serviceType → spaceType
        date: existing.date,
        time: existing.startTime,               // startTime → time
        email: existing.email,
        numPeople: (existing.guestCount || 0) + 1,  // guestCount → numPeople
        durationHours: existing.durationHours || 2,
        paymentMethod: existing.paymentMethod,
        freeTrialUsed: existing.wasFree !== null ? existing.wasFree : freeTrialUsed
      };
      
      console.log('[FORM] ✅ Datos preservados:', Object.keys(formData).filter(k => formData[k]));
      return PartialReservationForm.fromJSON(formData, formData.freeTrialUsed);
    }
    
    // 🆕 CASO 3: No hay datos previos - crear formulario nuevo
    console.log('[FORM] ✨ Nuevo formulario creado para:', userId);
    return new PartialReservationForm(userId, {}, freeTrialUsed);
  } catch (error) {
    console.error('[FORM] ❌ Error obteniendo formulario:', error);
    return new PartialReservationForm(userId, {}, freeTrialUsed);
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

  // 💳 Detectar método de pago
  if (!currentForm.paymentMethod) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('tarjeta') || lowerMsg.includes('credito') || lowerMsg.includes('debito')) {
      updates.paymentMethod = 'tarjeta';
      console.log('[FORM] 💳 Detectado método: tarjeta');
    } else if (lowerMsg.includes('transferencia') || lowerMsg.includes('transfer')) {
      updates.paymentMethod = 'transferencia';
      console.log('[FORM] 🏦 Detectado método: transferencia');
    } else if (lowerMsg.includes('efectivo') || lowerMsg.includes('cash')) {
      // 🔓 BYPASS TEMPORAL para testing
      updates.paymentMethod = 'efectivo';
      console.log('[FORM] 💵 Detectado método: efectivo (bypass)');
    }
  }

  // 👥 Detectar número de personas
  const peoplePatterns = [
    /(?:somos|vamos|iremos|voy con)\s+(\d+)/i,
    /(\d+)\s+personas?/i,
    /con\s+(\d+)\s+(?:personas?|acompa[ñn]antes?)/i,
    /(?:yo y|para)\s+(\d+)\s+(?:m[aá]s|personas?)/i,  // "yo y 3 más", "para 4 personas"
    /(\d+)\s+en total/i,  // "4 en total"
    /(?:reservar? para|necesito para)\s+(\d+)/i  // "reservar para 4"
  ];

  for (const pattern of peoplePatterns) {
    const match = message.match(pattern);
    if (match) {
      let num = parseInt(match[1]);
      
      // Si dice "yo y X más", sumar 1 (el usuario + los demás)
      if (/yo y\s+\d+\s+m[aá]s/i.test(message)) {
        num = num + 1;
        console.log('[FORM] 👥 Detectado "yo y X más", ajustando total:', num);
      }
      
      updates.numPeople = num;
      console.log('[FORM] 👥 Detectado personas:', num);
      break;
    }
  }

  return updates;
}

/**
 * 🤖 Procesa mensaje y actualiza formulario automáticamente
 * Retorna: { form, updates, nextQuestion, needsMoreInfo, validationError }
 */
export async function processMessageWithForm(userId, message, userProfile = null, freeTrialUsed = false) {
  // 1. Obtener o crear formulario (pasando si tiene free trial disponible)
  const form = await getOrCreateForm(userId, freeTrialUsed);

  // 2. Si el perfil tiene email y el formulario no, auto-completar
  if (userProfile?.email && !form.email) {
    form.email = userProfile.email;
    console.log('[FORM] 📧 Email auto-completado desde perfil:', userProfile.email);
  }

  // 3. Extraer datos del mensaje
  const updates = extractDataFromMessage(message, form);

  // 4. Actualizar formulario si hay datos nuevos
  if (Object.keys(updates).length > 0) {
    form.updateFields(updates);
    await saveForm(form);
  }

  // 4. Verificar si está completo
  const isComplete = form.isComplete();
  
  // 🚨 5. VALIDAR DOMINGOS Y FERIADOS SI EL FORMULARIO ESTÁ COMPLETO
  let validationError = null;
  
  if (isComplete && form.date) {
    const requestedDate = new Date(form.date + 'T00:00:00-05:00');
    const dayOfWeek = requestedDate.getDay();
    
    // Validar domingo (day === 0)
    if (dayOfWeek === 0) {
      // Calcular próximo lunes
      const nextMonday = new Date(requestedDate);
      nextMonday.setDate(requestedDate.getDate() + 1);
      const nextMondayStr = nextMonday.toISOString().split('T')[0];
      
      validationError = {
        type: 'closed_sunday',
        message: `🚫 Los domingos Coworkia está cerrado, lo siento 😊

Estamos abiertos:
📅 Lunes a viernes: 8:30 AM - 6:00 PM
📅 Sábado: 9:00 AM - 2:00 PM

¿Qué tal si reservas para el lunes ${nextMondayStr}? 🗓️`,
        suggestedDate: nextMondayStr
      };
      
      console.log('[FORM] 🚫 Validación: Domingo detectado -', form.date);
    }
    // Validar feriado
    else if (FERIADOS_ECUADOR.includes(form.date)) {
      const monthDay = form.date.substring(5);
      const nombreFeriado = NOMBRES_FERIADOS[monthDay] || 'Feriado';
      
      // Buscar próximo día hábil (no domingo, no feriado)
      let nextWorkingDay = new Date(requestedDate);
      let daysToAdd = 1;
      
      while (daysToAdd <= 7) {
        nextWorkingDay.setDate(requestedDate.getDate() + daysToAdd);
        const nextDateStr = nextWorkingDay.toISOString().split('T')[0];
        const nextDayOfWeek = nextWorkingDay.getDay();
        
        // Si no es domingo Y no es feriado, es día hábil
        if (nextDayOfWeek !== 0 && !FERIADOS_ECUADOR.includes(nextDateStr)) {
          validationError = {
            type: 'closed_holiday',
            message: `🎉 ${nombreFeriado} - Coworkia está cerrado ese día 😊

Estamos abiertos:
📅 Lunes a viernes: 8:30 AM - 6:00 PM
📅 Sábado: 9:00 AM - 2:00 PM

¿Qué tal si reservas para el ${nextDateStr}? 🗓️`,
            suggestedDate: nextDateStr,
            holidayName: nombreFeriado
          };
          break;
        }
        
        daysToAdd++;
      }
      
      console.log('[FORM] 🎉 Validación: Feriado detectado -', nombreFeriado, form.date);
    }
  }
  
  const nextQuestion = (isComplete || validationError) ? null : form.getNextQuestion();

  return {
    form,
    updates,
    nextQuestion,
    needsMoreInfo: !isComplete,
    summary: form.getSummary(),
    userMessage: message, // Para detectar frustración
    validationError, // 🆕 Error de validación si el día está cerrado
    canPauseAndResume: true // 🆕 Indica que el formulario soporta pausar/reanudar
  };
}
