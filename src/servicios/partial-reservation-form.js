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
import { detectarSaludoConInteresServicio } from '../deteccion-intenciones/detectar-intencion.js';
import userRepository from '../database/userRepository.js';

// 📲 Enlace genérico para referir amigos al sistema de Coworkia
const REFERRAL_LINK = `https://wa.me/593994837117?text=${encodeURIComponent('¡Hola Coworkia! quiero probar el servicio')}`;

// TTL del formulario: 2 horas (usuarios pueden distraerse, atender llamadas, etc.)
const FORM_TTL_SECONDS = 2 * 60 * 60;

// 🎉 Lista de feriados nacionales de Ecuador (2026)
const FERIADOS_ECUADOR = [
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
  constructor(userId, existingData = {}, freeTrialUsed = null) {
    this.userId = userId;
    this.spaceType = existingData.spaceType || null;      // 'hotDesk' | 'meetingRoom'
    this.date = existingData.date || null;                // '2025-11-12'
    this.time = existingData.time || null;                // '10:00'
    this.email = existingData.email || null;              // 'yo@diegovillota.com'
    this.numPeople = existingData.numPeople || 1;         // default 1 (solo el usuario)
    this.durationHours = existingData.durationHours || 2; // default 2h
    this.paymentMethod = existingData.paymentMethod || null; // 'transferencia' | 'tarjeta' | 'efectivo' (bypass temporal)
    this.freeTrialUsed = freeTrialUsed;                   // ← Estado del free trial del usuario (null = por cargar)
    this.updatedAt = new Date();
  }

  /**
   * � Inicializa freeTrialUsed consultando BD (llamar antes de getMissingFields)
   */
  async initializeFreeTrialStatus() {
    if (this.freeTrialUsed !== null) {
      console.log('[FORM] ✅ freeTrialUsed ya inicializado:', this.freeTrialUsed);
      return;
    }

    try {
      const user = await userRepository.findByPhone(this.userId);
      this.freeTrialUsed = user?.free_trial_used ?? false;
      console.log('[FORM] 🔍 freeTrialUsed cargado desde BD:', {
        userId: this.userId,
        freeTrialUsed: this.freeTrialUsed,
        userFound: !!user
      });
    } catch (error) {
      console.error('[FORM] ❌ Error cargando freeTrialUsed, default false:', error);
      this.freeTrialUsed = false;
    }
  }

  /**
   * �📋 Actualiza un campo del formulario
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
    // - Cliente NUEVO con HOT DESK (freeTrialUsed === false): NO pedir paymentMethod (es gratis)
    // - Cliente RECURRENTE (freeTrialUsed === true): SÍ pedir paymentMethod (debe pagar)
    // - Meeting Room SIEMPRE paga: SÍ pedir paymentMethod
    const isHotDeskFreeTrial = this.freeTrialUsed === false && this.spaceType === 'hotDesk';
    
    if (!this.paymentMethod && !isHotDeskFreeTrial) {
      missing.push('paymentMethod');
      console.log('[FORM] ⚠️ Cliente debe pagar - requiere paymentMethod:', {
        freeTrialUsed: this.freeTrialUsed,
        spaceType: this.spaceType
      });
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
      return { 
        base: basePrice, 
        total: basePrice, 
        iva: 0,
        cardFee: 0,
        taxes: {} 
      };
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
      // +3.5% comisión tarjeta + 15% IVA sobre base
      const cardFee = basePrice * 0.035;
      taxes.cardFee = parseFloat(cardFee.toFixed(2));
      
      const iva = basePrice * 0.15;
      taxes.iva = parseFloat(iva.toFixed(2));
      
      total = basePrice + taxes.cardFee + taxes.iva;
      console.log(`[FORM] 💳 Pago con tarjeta (${this.paymentMethod}): Base $${basePrice} + Comisión $${taxes.cardFee} + IVA $${taxes.iva} = $${total}`);
    } else if (metodoPago === 'transferencia' || metodoPago?.includes('banco') || metodoPago?.includes('cooperativa')) {
      // TRANSFERENCIAS BANCARIAS (Ecuador - sin comisión)
      // Solo +15% IVA sobre base
      const iva = basePrice * 0.15;
      taxes.iva = parseFloat(iva.toFixed(2));
      total = basePrice + taxes.iva;
      console.log(`[FORM] 🏦 Transferencia bancaria: Base $${basePrice} + IVA $${taxes.iva} = $${total}`);
    } else if (this.paymentMethod === 'efectivo') {
      // EFECTIVO: Solo +15% IVA sobre base
      const iva = basePrice * 0.15;
      taxes.iva = parseFloat(iva.toFixed(2));
      total = basePrice + taxes.iva;
      console.log(`[FORM] 💵 Efectivo: Base $${basePrice} + IVA $${taxes.iva} = $${total}`);
    }

    return {
      base: parseFloat(basePrice.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      iva: parseFloat((taxes.iva || 0).toFixed(2)),
      cardFee: parseFloat((taxes.cardFee || 0).toFixed(2)),
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

    // ✅ Si no falta nada, NO enviar mensaje de resumen (ya está completo)
    if (missing.length === 0) {
      return null;
    }

    let message = 'Ya tengo:\n\n';
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
    
    return message;
  }

  /**
   * 📋 Genera mensaje de confirmación con precio ANTES de pedir método de pago
   */
  getConfirmationMessage() {
    const missing = this.getMissingFields();
    
    // ✅ CASO 1: Formulario COMPLETO - Confirmación final
    if (missing.length === 0) {
      const spaceName = this.spaceType === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones';
      const isFreeTrial = this.freeTrialUsed === false && this.spaceType === 'hotDesk';
      
      // ✅ Formatear fecha para mostrar día de semana + mes en español
      const formattedDate = this.formatDate(this.date);
      
      let message = `📋 *CONFIRMA TU RESERVA:*\n\n`;
      message += `📅 Fecha: ${formattedDate}\n`;
      message += `⏰ Horario: ${this.time} (${this.durationHours}h)\n`;
      message += `💻 Espacio: ${spaceName}\n`;
      message += `📧 Email: ${this.email}\n`;
      
      // 🎁 BRANCH 1: Cliente NUEVO con Hot Desk - GRATIS
      if (isFreeTrial) {
        message += `💰 Total: *GRATIS* 🎉 (Primera visita - 2h gratis)\n\n`;
        message += `¿*Confirmas esta reserva?*\n\n`;
        message += `Responde *SI* para confirmar o *NO* para cancelar 👍`;
        message += `\n\n[CONFIRMAR]`;
        
        console.log('[FORM] ✅ Confirmación GRATIS generada (primera visita hotDesk)');
        return message;
      }
      
      // 💰 BRANCH 2: Cliente RECURRENTE o Meeting Room - CON COSTO
      const pricing = this.calculateTotalWithTaxes();
      
      // Mapear método de pago a texto legible
      const metodoPagoDisplay = {
        'tarjeta': 'Tarjeta 💳',
        'transferencia': 'Transferencia 🏦',
        'efectivo': 'Efectivo 💵'
      };
      const metodoPago = metodoPagoDisplay[this.paymentMethod] || this.paymentMethod;
      
      message += `\n💰 *Costo:*\n`;
      message += `Base: $${pricing.base.toFixed(2)}\n`;
      message += `IVA (12%): $${pricing.iva.toFixed(2)}\n`;
      if (pricing.cardFee > 0) {
        message += `Comisión tarjeta (3.5%): $${pricing.cardFee.toFixed(2)}\n`;
      }
      message += `*TOTAL: $${pricing.total.toFixed(2)} USD*\n\n`;
      message += `💳 Pago: ${metodoPago}\n\n`;
      
      // Si es segunda reserva de hotDesk, agregar referral
      if (this.freeTrialUsed === true && this.spaceType === 'hotDesk') {
        message += `───────────────────\n\n`;
        message += `💡 *¿Sabías que...?*\n\n`;
        message += `Tu amigo o colega TAMBIÉN puede registrarse y disfrutar de *2 horas gratis* 🎁\n\n`;
        message += `📲 *Envíale este enlace:*\n`;
        message += `${REFERRAL_LINK}\n\n`;
        message += `Dile: _"Amigo, regístrate aquí para recibir tus dos horas gratis"_ 😊\n\n`;
        message += `───────────────────\n\n`;
      }
      
      message += `¿*Confirmas esta reserva?*\n\n`;
      message += `Responde *SI* para continuar con el pago o *NO* para cancelar 👍`;
      message += `\n\n[CONFIRMAR]`;
      
      console.log('[FORM] ✅ Confirmación final generada - formulario completo');
      return message;
    }
    
    // ❌ CASO 2: Faltan campos - No generar confirmación, usar getNextQuestion()
    console.log('[FORM] ❌ No generar confirmación - faltan campos:', missing);
    return null;
  }

  /**
   * � Formatea fecha para mostrar al usuario
   * @param {string} date - Fecha en formato '2026-01-27'
   * @returns {string} - Fecha formateada como "Domingo 27 de enero 2026"
   */
  formatDate(date) {
    if (!date) return '';
    
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const dateObj = new Date(dateStr + 'T12:00:00-05:00');
    
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    const dayName = dayNames[dateObj.getDay()];
    const [year, month, day] = dateStr.split('-');
    const monthName = monthNames[parseInt(month, 10) - 1];
    
    return `${dayName} ${parseInt(day, 10)} de ${monthName} ${year}`;
  }

  /**
   * �💾 Convierte a objeto plano para almacenamiento
   */
  toJSON() {
    // Calcular precio con impuestos:
    // - Cliente nuevo HOT DESK (freeTrialUsed = false + hotDesk): totalPrice = 0
    // - Sala reuniones SIEMPRE paga (meetingRoom): calcular precio
    // - Cliente recurrente (freeTrialUsed = true): calcular con impuestos
    let pricing = { total: 0 };
    
    // ✅ REGLA: Solo Hot Desk puede ser gratis para nuevos clientes
    const isHotDeskFreeTrial = this.freeTrialUsed === false && this.spaceType === 'hotDesk';
    
    if (isHotDeskFreeTrial) {
      // Cliente nuevo con Hot Desk - GRATIS
      pricing = { total: 0 };
      console.log('[FORM] 💰 Cliente nuevo Hot Desk - Precio: GRATIS');
    } else if (this.paymentMethod) {
      // Sala reuniones O cliente recurrente - CALCULAR PRECIO
      pricing = this.calculateTotalWithTaxes();
      console.log('[FORM] 💰 Precio calculado:', {
        spaceType: this.spaceType,
        freeTrialUsed: this.freeTrialUsed,
        total: pricing.total
      });
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
 * NUEVO: Soporta form existente del sistema unificado (agent_forms)
 * Si se proporciona existingFormData, lo usa directamente
 * Esto permite que wassenger pase el form cargado de agent_forms
 */
export async function getOrCreateForm(userId, freeTrialUsed = false, existingFormData = null) {
  try {
    // 🎯 CASO 1: Form existente del sistema unificado (prioridad)
    if (existingFormData) {
      console.log('[FORM] 📜 Form existente del sistema unificado cargado para:', userId);
      const form = PartialReservationForm.fromJSON(existingFormData, freeTrialUsed);
      await form.initializeFreeTrialStatus();
      return form;
    }
    
    // 🔄 CASO 2: Buscar en pending_confirmations (legacy, por compatibilidad)
    const existing = await getPendingConfirmation(userId);
    
    if (existing && existing._type === 'partial_form' && existing._formData) {
      console.log('[FORM] 📂 Formulario legacy cargado desde pending_confirmations:', userId);
      const form = PartialReservationForm.fromJSON(existing._formData, freeTrialUsed);
      await form.initializeFreeTrialStatus();
      return form;
    }
    
    if (existing && existing._type === 'direct') {
      console.log('[FORM] 🔄 Detectado formato normalizado, convirtiendo a formulario...');
      
      const formData = {
        userId: existing.userId,
        spaceType: existing.serviceType,
        date: existing.date,
        time: existing.startTime,
        email: existing.email,
        numPeople: (existing.guestCount || 0) + 1,
        durationHours: existing.durationHours || 2,
        paymentMethod: existing.paymentMethod,
        freeTrialUsed: existing.wasFree !== null ? true : freeTrialUsed
      };
      
      console.log('[FORM] ✅ Datos preservados:', Object.keys(formData).filter(k => formData[k]));
      const form = PartialReservationForm.fromJSON(formData, formData.freeTrialUsed);
      await form.initializeFreeTrialStatus();
      return form;
    }
    
    // 🆕 CASO 3: No hay datos previos - crear formulario nuevo
    console.log('[FORM] ✨ Nuevo formulario creado para:', userId);
    const form = new PartialReservationForm(userId, {}, freeTrialUsed);
    await form.initializeFreeTrialStatus();
    return form;
  } catch (error) {
    console.error('[FORM] ❌ Error obteniendo formulario:', error);
    const form = new PartialReservationForm(userId, {}, freeTrialUsed);
    await form.initializeFreeTrialStatus();
    return form;
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
  // ✅ CAMBIO: Permitir sobrescribir si usuario menciona explícitamente un espacio
  // Esto permite cambiar de hotDesk → meetingRoom o viceversa
  const mentionsSala = /sala|meeting\s*room|reuni[oó]n/i.test(message);
  const mentionsHotDesk = /hot\s*desk|escritorio|puesto/i.test(message);
  
  if (mentionsSala) {
    updates.spaceType = 'meetingRoom';
    console.log('[FORM] 🏢 Usuario menciona sala/reunión → meetingRoom');
  } else if (mentionsHotDesk) {
    updates.spaceType = 'hotDesk';
    console.log('[FORM] 🏢 Usuario menciona hot desk → hotDesk');
  } else if (!currentForm.spaceType) {
    // Si no menciona ninguno y no hay spaceType, no hacer nada (Aurora preguntará)
    console.log('[FORM] 🏢 No se detectó mención de espacio');
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
  }  // 📧 Detectar email (SIEMPRE permitir actualizar, incluso si ya existe)
  const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    updates.email = emailMatch[1];
    console.log('[FORM] 📧 Detectado email:', updates.email);
    if (currentForm.email && currentForm.email !== emailMatch[1]) {
      console.log('[FORM] 🔄 Sobrescribiendo email anterior:', currentForm.email, '→', emailMatch[1]);
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
      
      // ✅ VALIDACIÓN: Hot Desk es SOLO individual (1 persona)
      // Si numPeople > 1 y spaceType es hotDesk, cambiar a meetingRoom
      if (num > 1 && currentForm.spaceType === 'hotDesk') {
        updates.spaceType = 'meetingRoom';
        console.log('[FORM] ⚠️ CORRECCIÓN AUTOMÁTICA: Hot Desk no permite múltiples personas');
        console.log('[FORM] 🔄 Cambiando de hotDesk → meetingRoom (para', num, 'personas)');
      }
      
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
export async function processMessageWithForm(userId, message, userProfile = null, existingFormData = null) {
  // 🎉 DETECCIÓN: Saludo inicial "quiero probar el servicio" (función unificada)
  const isSpecialWelcome = detectarSaludoConInteresServicio(message);
  
  // 1. Obtener o crear formulario (prioriza existingFormData del sistema unificado)
  const freeTrialUsed = userProfile?.freeTrialUsed || false;
  const form = await getOrCreateForm(userId, freeTrialUsed, existingFormData);

  // 2. Si es el saludo especial Y no hay datos en el formulario, generar mensaje de bienvenida
  if (isSpecialWelcome && !form.spaceType && !form.date && !form.time) {
    console.log('[FORM] 🎊 Detectado saludo especial "probar el servicio"');
    
    const userName = userProfile?.name ? ` ${userProfile.name}` : '';
    const hotDeskInfo = freeTrialUsed
      ? `💻 Hot Desk (Escritorio compartido - 1 persona)
• 2 horas: $10
• WiFi + café ☕`
      : `💻 Hot Desk (Escritorio compartido - 1 persona)
• 2 horas: $10
• WiFi + café ☕
• Primera visita GRATIS 🎁`;
    
    const welcomeMessage = `¡Hola${userName}! 👋 Perfecto, tenemos:

${hotDeskInfo}

🏢 Sala Reuniones (3-4 personas) - 2h: $29

¿Qué día y hora prefieres? 📅`;
    
    return {
      form,
      updates: {},
      nextQuestion: welcomeMessage,
      needsMoreInfo: true,
      summary: form.getSummary(),
      userMessage: message,
      validationError: null,
      confirmationMessage: null,
      canPauseAndResume: true,
      isSpecialWelcome: true // Flag para que wassenger sepa que es bienvenida especial
    };
  }

  // 3. Si el perfil tiene email y el formulario no, auto-completar
  if (userProfile?.email && !form.email) {
    form.email = userProfile.email;
    console.log('[FORM] 📧 Email auto-completado desde perfil:', userProfile.email);
  }

  // 4. Extraer datos del mensaje
  const updates = extractDataFromMessage(message, form);

  // 5. Actualizar formulario si hay datos nuevos
  if (Object.keys(updates).length > 0) {
    form.updateFields(updates);
    console.log('[FORM] 📝 Campos actualizados:', Object.keys(updates));
  }

  // 6. Verificar si está completo
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
  
  // ✅ FIX: Si está completo, generar confirmación final
  if (isComplete && !validationError) {
    confirmationMessage = form.getConfirmationMessage();
    console.log('[FORM] ✅ Formulario completo - generando confirmación final');
  }
  // Si no está completo, mostrar pregunta siguiente
  else if (!isComplete && !validationError) {
    // Si solo falta paymentMethod, getConfirmationMessage ya maneja ese caso
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
