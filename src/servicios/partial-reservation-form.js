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
    
    // 🎉 LÓGICA CORRECTA:
    // - Cliente NUEVO (freeTrialUsed === false): NO pedir paymentMethod (es gratis)
    // - Cliente RECURRENTE (freeTrialUsed === true): SÍ pedir paymentMethod (debe pagar)
    if (!this.paymentMethod && this.freeTrialUsed === true) {
      missing.push('paymentMethod');
      console.log('[FORM] ⚠️ Cliente recurrente sin método de pago');
    }
    
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
        return `¿Qué espacio necesitas${userName}? Tenemos:\n\n📍 Hot Desk (individual, $10/2h)\n🏢 Sala de Reuniones (3-4 personas, $29/2h)`;
      
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
          case 'paymentMethod': return 'método de pago';
          default: return f;
        }
      });
      message += `❓ Solo necesito: ${missingNames.join(', ')}`;
    }
    
    message += '\n\n¿Te viene bien o prefieres cambiar algo?';
    return message;
  }

  /**
   * 📋 Genera mensaje de confirmación con precio ANTES de pedir método de pago
   */
  getConfirmationMessage() {
    const missing = this.getMissingFields();
    
    // Si solo falta paymentMethod, mostrar resumen completo con precio
    if (missing.length === 1 && missing[0] === 'paymentMethod') {
      const spaceName = this.spaceType === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones';
      const basePrice = this.getBasePrice();
      
      let message = `📋 *CONFIRMA TU RESERVA:*\n\n`;
      message += `🏢 Espacio: ${spaceName}\n`;
      message += `📅 Fecha: ${this.date}\n`;
      message += `⏰ Hora: ${this.time}\n`;
      message += `📧 Email: ${this.email}\n`;
      message += `⏱️ Duración: ${this.durationHours}h\n`;
      message += `💰 Precio base: $${basePrice}\n\n`;
      message += `¿Cómo deseas pagar?\n\n`;
      message += `💳 *Tarjeta* - $${(basePrice * 1.208).toFixed(2)} (incluye ISD 5% + IVA 15%)\n`;
      message += `🏦 *Transferencia* - $${(basePrice * 1.15).toFixed(2)} (incluye IVA 15%)\n\n`;
      message += `Escribe "tarjeta" o "transferencia" 👍`;
      
      return message;
    }
    
    return null;
  }

  /**
   * 💾 Convierte a objeto plano para almacenamiento
   */
  toJSON() {
    // Calcular precio con impuestos:
    // - Cliente nuevo (freeTrialUsed = false): totalPrice = 0
    // - Cliente recurrente (freeTrialUsed = true): calcular con impuestos
    let pricing = { total: 0 };
    
    if (this.freeTrialUsed === false) {
      // Cliente nuevo - GRATIS
      pricing = { total: 0 };
      console.log('[FORM] 💰 Cliente nuevo - Precio: GRATIS');
    } else if (this.paymentMethod) {
      // Cliente recurrente con método de pago
      pricing = this.calculateTotalWithTaxes();
      console.log('[FORM] 💰 Cliente recurrente - Precio calculado:', pricing.total);
    }
    
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
        // Si wasFree existe (true/false), significa que ya hizo una reserva → trial usado
        // Si wasFree es null, usar valor actual de freeTrialUsed del perfil
        freeTrialUsed: existing.wasFree !== null ? true : freeTrialUsed
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
  console.log('[FORM-EXTRACT] 🚀 INICIANDO extractDataFromMessage - mensaje:', message);
  console.log('[FORM-EXTRACT] 📋 Formulario actual:', { 
    time: currentForm.time, 
    date: currentForm.date,
    spaceType: currentForm.spaceType 
  });
  
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

  // 📅 Detectar fecha (SIEMPRE intentar, permite cambiar fecha)
  // 🌍 Obtener fecha actual en timezone Ecuador
  const formatter = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const todayStr = `${year}-${month}-${day}`;
  
  const today = new Date(`${year}-${month}-${day}T12:00:00-05:00`); // Ecuador timezone
  const relativeMatch = lowerMsg.match(/\b(hoy|ma[ñn]ana|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|lunes|martes)\b/);
  const isoMatch = message.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  const shortMatch = message.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  
  console.log('[FORM-DATE] 🕐 Buscando fecha en mensaje:', message);
  console.log('[FORM-DATE] 📋 Fecha actual en formulario:', currentForm.date);
  
  // 🆕 Detectar formato "18 de noviembre", "18 noviembre"
  const monthNames = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
  };
  const namedDateMatch = lowerMsg.match(/(\d{1,2})\s+(?:de\s+)?(\w+)/);
  
  // 🗓️ Detectar "lunes 19 enero 2026" o "lunes 19 enero" o "lunes 19"
  const fullDateMatch = lowerMsg.match(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+(\d{1,2})(?:\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))?(?:\s+(\d{4}))?\b/);
  
  if (fullDateMatch) {
    const [, dayName, dayNum, monthName, yearStr] = fullDateMatch;
    const day = parseInt(dayNum, 10);
    const currentMonth = parseInt(month);
    const currentYear = parseInt(year);
    const currentDay = parseInt(day);
    
    let targetMonth = currentMonth;
    let targetYear = yearStr ? parseInt(yearStr) : currentYear;
    
    // Si se especificó el nombre del mes, usarlo
    if (monthName) {
      const monthNames = {
        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
        'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
        'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
      };
      targetMonth = monthNames[monthName];
    } else {
      // Si no hay mes explícito, asumir mes actual
      // Si el día ya pasó este mes, usar mes siguiente
      if (day < currentDay) {
        targetMonth = currentMonth + 1;
        if (targetMonth > 12) {
          targetMonth = 1;
          targetYear = currentYear + 1;
        }
      }
    }
    
    updates.date = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    console.log('[FORM-DATE] 📅 Detectado día de semana completo:', updates.date);
  } else if (relativeMatch) {
      const keyword = relativeMatch[1];
      if (keyword === 'hoy') {
        updates.date = todayStr;
      } else {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const tomorrowParts = formatter.formatToParts(tomorrow);
        const tomorrowStr = `${tomorrowParts.find(p => p.type === 'year').value}-${tomorrowParts.find(p => p.type === 'month').value}-${tomorrowParts.find(p => p.type === 'day').value}`;
        updates.date = tomorrowStr;
      }
      console.log('[FORM] 📅 Detectado fecha relativa:', updates.date);
    } else if (namedDateMatch) {
      const [, dayStr, monthName] = namedDateMatch;
      const targetMonth = monthNames[monthName.toLowerCase()];
      if (targetMonth) {
        const targetDay = parseInt(dayStr, 10);
        const currentYear = parseInt(year);
        const currentMonth = parseInt(month);
        
        // Si el mes ya pasó este año, usar año siguiente
        let targetYear = currentYear;
        if (targetMonth < currentMonth || (targetMonth === currentMonth && targetDay < parseInt(day))) {
          targetYear = currentYear + 1;
        }
        
        updates.date = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${targetDay.toString().padStart(2, '0')}`;
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
  
  if (updates.date) {
    console.log('[FORM-DATE] 🔄 Sobrescribiendo fecha anterior:', currentForm.date, '→', updates.date);
  } else {
    console.log('[FORM-DATE] ❌ No se detectó fecha en el mensaje');
  }

  // ⏰ Detectar hora (SIEMPRE intentar, incluso si ya hay un time - permite cambiar hora)
  const timeRegex = /(?:\b(a\s+las|a\s+la|las|hora|hacia|sobre|desde\s+las|desde\s+la)\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;
  let detectedTime = null;

  console.log('[FORM-TIME] 🕐 Buscando hora en mensaje:', message);
  console.log('[FORM-TIME] 📋 Hora actual en formulario:', currentForm.time);

  for (const match of message.matchAll(timeRegex)) {
    const [fullMatch, prefix, hourStr, minuteStr, meridiemRaw] = match;
    const meridiem = meridiemRaw ? meridiemRaw.toLowerCase() : null;
    const hasExplicitMinutes = Boolean(minuteStr) || /:/.test(match[0]);
    const isTimeContext = Boolean(prefix);

    console.log('[FORM-TIME] 📊 Match encontrado:', {
      fullMatch,
      hourStr,
      minuteStr,
      meridiemRaw,
      meridiem,
      hasExplicitMinutes,
      isTimeContext
    });

    if (!isTimeContext && !meridiem && !hasExplicitMinutes) {
      console.log('[FORM-TIME] ⏭️ Saltando match (no es hora válida)');
      continue; // Evitar confundir números de personas con horas
    }

    let hour = parseInt(hourStr, 10);
    if (Number.isNaN(hour)) continue;
    const minute = minuteStr ? parseInt(minuteStr, 10) : 0;

    console.log('[FORM-TIME] 🔄 Antes de conversión: hour=%d, minute=%d, meridiem=%s', hour, minute, meridiem);

    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;

    console.log('[FORM-TIME] ✅ Después de conversión: hour=%d', hour);

      detectedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      console.log('[FORM-TIME] ✨ Tiempo detectado:', detectedTime);
      break;
    }

  if (detectedTime) {
    updates.time = detectedTime;
    console.log('[FORM] ⏰ Detectado hora:', updates.time);
    console.log('[FORM] 🔄 Sobrescribiendo hora anterior:', currentForm.time, '→', detectedTime);
  } else {
    console.log('[FORM-TIME] ❌ No se detectó hora en el mensaje');
  }  // 📧 Detectar email
  if (!currentForm.email) {
    const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      updates.email = emailMatch[1];
      console.log('[FORM] 📧 Detectado email:', updates.email);
    }
  }

  // 💳 Detectar método de pago (SIEMPRE intentar, permite cambiar método)
  const paymentMatch = lowerMsg.match(/\b(efectivo|tarjeta|transferencia|cash|credito|crédit|débito|debito|transfer)\b/);
  if (paymentMatch) {
    const term = paymentMatch[1];
    if (term === 'efectivo' || term === 'cash') {
      updates.paymentMethod = 'efectivo';
      console.log('[FORM] 💵 Detectado método: efectivo');
    } else if (term === 'transferencia' || term === 'transfer') {
      updates.paymentMethod = 'transferencia';
      console.log('[FORM] 🏦 Detectado método: transferencia');
    } else if (/tarjeta|credito|crédit|débito|debito/.test(term)) {
      updates.paymentMethod = 'tarjeta';
      console.log('[FORM] 💳 Detectado método: tarjeta');
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

  console.log('[FORM-EXTRACT] ✅ FIN extractDataFromMessage - updates:', updates);
  console.log('[FORM-EXTRACT] 📊 Campos detectados:', Object.keys(updates));
  
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
  const missingFields = form.getMissingFields();
  
  console.log('[FORM] 📊 Estado del formulario:', {
    isComplete,
    missingFields,
    freeTrialUsed: form.freeTrialUsed,
    hasPaymentMethod: !!form.paymentMethod,
    spaceType: form.spaceType,
    date: form.date,
    time: form.time,
    email: form.email
  });
  
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
  
  // 🎯 Generar pregunta siguiente o mensaje de confirmación
  let nextQuestion = null;
  let confirmationMessage = null;
  
  if (!isComplete && !validationError) {
    // Si solo falta paymentMethod, mostrar confirmación con precios
    confirmationMessage = form.getConfirmationMessage();
    
    if (!confirmationMessage) {
      // Preguntar por otros campos faltantes
      nextQuestion = form.getNextQuestion();
    }
  }

  return {
    form,
    updates,
    nextQuestion: confirmationMessage || nextQuestion,  // Usar confirmationMessage si existe
    needsMoreInfo: !isComplete,
    summary: form.getSummary(),
    userMessage: message, // Para detectar frustración
    validationError, // 🆕 Error de validación si el día está cerrado
    confirmationMessage, // 🆕 Mensaje especial de confirmación con precios
    canPauseAndResume: true // 🆕 Indica que el formulario soporta pausar/reanudar
  };
}
