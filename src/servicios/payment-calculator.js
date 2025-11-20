/**
 * 💰 PAYMENT CALCULATOR - FUENTE ÚNICA DE VERDAD
 * 
 * Este módulo centraliza toda la lógica de cálculo de precios y pagos.
 * Usado por: memoria-sqlite.js, confirmation-flow.js, wassenger.js
 * 
 * Consolidado desde múltiples implementaciones duplicadas en v256.
 */

// 🏦 CONFIGURACIÓN BANCARIA Y LINKS DE PAGO
const BANK_ACCOUNT = process.env.COWORKIA_BANK_ACCOUNT || 
  'Produbanco\nCta Ahorros: 20059783069\nCédula: 1702683499\nGonzalo Villota Izurieta';

const PAYMENT_LINK = process.env.COWORKIA_PAYMENT_LINK || 
  'https://ppls.me/hnMI9yMRxbQ6rgIVi6L2DA';

// 💵 TARIFAS BASE
const PRICING = {
  hotDesk: {
    baseHours: 2,
    basePrice: 10.00,
    additionalHourPrice: 10.00,
    minPeople: 1,
    maxPeople: 1
  },
  meetingRoom: {
    baseHours: 2,
    basePrice: 29.00,
    additionalHourPrice: 15.00,
    minPeople: 3,
    maxPeople: 4
  }
};

const PAYPHONE_FEE_PERCENTAGE = 0.05; // 5%

/**
 * 💰 Calcula el costo de una reserva
 * @param {string} serviceType - 'hotDesk' o 'meetingRoom'
 * @param {number} hours - Duración en horas (mínimo 2)
 * @param {number} people - Número de personas (default: 1)
 * @returns {Object} Breakdown completo del costo o error
 */
export function calculateReservationCost(serviceType, hours, people = 1) {
  // Validar tipo de servicio
  const config = PRICING[serviceType];
  if (!config) {
    return { error: `Tipo de servicio no válido: ${serviceType}` };
  }

  // Validar número de personas (debe ser al menos 1)
  if (people < 1 || !Number.isInteger(people)) {
    return { 
      error: `Número de personas debe ser al menos 1` 
    };
  }
  if (people < config.minPeople) {
    return { 
      error: `${serviceType === 'meetingRoom' ? 'Sala de reuniones' : 'Hot Desk'} requiere mínimo ${config.minPeople} persona${config.minPeople > 1 ? 's' : ''}` 
    };
  }
  if (people > config.maxPeople) {
    return { 
      error: `${serviceType === 'meetingRoom' ? 'Sala de reuniones' : 'Hot Desk'} tiene capacidad máxima de ${config.maxPeople} persona${config.maxPeople > 1 ? 's' : ''}` 
    };
  }

  // Calcular precio base
  let basePrice = 0;
  if (hours <= config.baseHours) {
    basePrice = config.basePrice;
  } else {
    const additionalHours = hours - config.baseHours;
    basePrice = config.basePrice + (additionalHours * config.additionalHourPrice);
  }

  // Calcular fee de Payphone (5%)
  const payphoneFee = basePrice * PAYPHONE_FEE_PERCENTAGE;
  const totalPrice = basePrice + payphoneFee;

  // Calcular precio por hora efectivo
  const pricePerHour = (basePrice / hours).toFixed(2);

  return {
    service: serviceType === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones',
    hours,
    people,
    basePrice: basePrice.toFixed(2),
    payphoneFee: payphoneFee.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
    pricePerHour,
    currency: 'USD'
  };
}

/**
 * 🧾 Genera mensaje de información de pago
 * @param {Object} profile - Perfil del usuario con freeTrialUsed y freeTrialDate
 * @param {string} serviceType - 'hotDesk' o 'meetingRoom'
 * @param {number} hours - Duración en horas
 * @returns {Object|null} Mensaje de pago formateado o null si no necesita pagar
 */
export function getPaymentInfo(profile, serviceType = 'hotDesk', hours = 2) {
  // Si no usó free trial, no necesita pagar
  if (!profile.freeTrialUsed) {
    return null;
  }

  // Calcular costo
  const costInfo = calculateReservationCost(serviceType, hours);
  
  if (costInfo.error) {
    return {
      error: costInfo.error,
      message: `❌ ${costInfo.error}`
    };
  }

  // Construir mensaje de pago
  const paymentMessage = `✅ Ya usaste tu día gratis el ${profile.freeTrialDate || 'anteriormente'}.\n\n🧾 Costo de tu reserva:\n• ${costInfo.service}: ${costInfo.hours}h × $${costInfo.pricePerHour} = $${costInfo.basePrice}\n• Fee Payphone (5%): $${costInfo.payphoneFee}\n• TOTAL A PAGAR: $${costInfo.totalPrice} USD\n\n💳 **PAGO FÁCIL CON TARJETA:**\n${PAYMENT_LINK}\n• Ingresa → Coloca número de tarjeta → Paga $${costInfo.totalPrice}\n\n🏦 **Transferencia Bancaria:**\n${BANK_ACCOUNT}\n\nEnvía tu comprobante para confirmar ✅`;

  return {
    message: paymentMessage,
    freeTrialDate: profile.freeTrialDate,
    costBreakdown: costInfo,
    paymentMethods: {
      payphone: PAYMENT_LINK,
      bank: BANK_ACCOUNT
    }
  };
}

/**
 * 🏦 Obtiene información bancaria para transferencias
 * @returns {string} Datos bancarios formateados
 */
export function getBankAccountInfo() {
  return BANK_ACCOUNT;
}

/**
 * 💳 Obtiene link de pago Payphone
 * @returns {string} URL de Payphone
 */
export function getPayphoneLink() {
  return PAYMENT_LINK;
}

/**
 * 📊 Obtiene configuración de precios (para debugging/testing)
 * @returns {Object} Configuración de pricing completa
 */
export function getPricingConfig() {
  return {
    ...PRICING,
    payphoneFeePercentage: PAYPHONE_FEE_PERCENTAGE
  };
}

export default {
  calculateReservationCost,
  getPaymentInfo,
  getBankAccountInfo,
  getPayphoneLink,
  getPricingConfig
};
