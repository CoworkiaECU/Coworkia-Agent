// Sistema de memoria: perfiles de usuarios e historial de interacciones
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const INTERACTIONS_FILE = path.join(DATA_DIR, 'interactions.jsonl');

// Asegurar que existe la carpeta data/
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadAllProfiles() {
  if (!fs.existsSync(PROFILES_FILE)) return Promise.resolve('{}');
  return fs.promises.readFile(PROFILES_FILE, 'utf-8');
}

export async function loadProfile(userId) {
  try {
    // Leer del archivo profiles.json centralizado
    if (!fs.existsSync(PROFILES_FILE)) {
      return null;
    }
    
    const content = await fs.promises.readFile(PROFILES_FILE, 'utf-8');
    const profiles = JSON.parse(content);
    
    return profiles[userId] || null;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

export async function saveProfile(userId, partialProfile = {}) {
  try {
    // Leer perfiles existentes
    let profiles = {};
    if (fs.existsSync(PROFILES_FILE)) {
      const content = await fs.promises.readFile(PROFILES_FILE, 'utf-8');
      profiles = JSON.parse(content);
    }
    
    // Actualizar perfil específico
    profiles[userId] = { ...profiles[userId], ...partialProfile };
    
    // Guardar archivo actualizado
    await fs.promises.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error saving profile:', error);
    return false;
  }
}

export function saveInteraction(event = {}) {
  return fs.promises.appendFile(INTERACTIONS_FILE, JSON.stringify(event) + '\n');
}

/**
 * 🆕 Carga el historial de conversación de un usuario (últimos N mensajes)
 */
export async function loadConversationHistory(userId, limit = 10) {
  const filePath = path.join(DATA_DIR, `${userId}_history.jsonl`);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line);
    const messages = lines.map(line => JSON.parse(line));
    
    // Retornar últimos N mensajes
    return messages.slice(-limit);
  } catch (error) {
    console.error('[MEMORIA] Error cargando historial:', error);
    return [];
  }
}

/**
 * 🆕 Guarda un mensaje en el historial de conversación
 */
export async function saveConversationMessage(userId, message) {
  const filePath = path.join(DATA_DIR, `${userId}_history.jsonl`);
  
  const entry = {
    timestamp: new Date().toISOString(),
    role: message.role, // 'user' o 'assistant'
    content: message.content,
    agent: message.agent || null
  };

  return fs.promises.appendFile(filePath, JSON.stringify(entry) + '\n');
}

/**
 * 🆕 Actualiza el perfil con datos de reservas y uso del día gratis
 */
export async function updateReservationHistory(userId, reservation) {
  const profile = await loadProfile(userId) || { userId };
  
  // Inicializar arrays si no existen
  if (!profile.reservationHistory) {
    profile.reservationHistory = [];
  }

  // Agregar nueva reserva
  profile.reservationHistory.push({
    date: reservation.date,
    time: reservation.time,
    type: reservation.type || 'Hot Desk',
    status: reservation.status || 'pending',
    wasFree: reservation.wasFree || false,
    createdAt: new Date().toISOString()
  });

  // Marcar que usó el día gratis si aplica
  if (reservation.wasFree) {
    profile.freeTrialUsed = true;
    profile.freeTrialDate = reservation.date;
  }

  // Actualizar contador de conversaciones
  profile.conversationCount = (profile.conversationCount || 0) + 1;
  profile.lastMessageAt = new Date().toISOString();

  await saveProfile(userId, profile);
  return profile;
}

/**
 * 🆕 Tarifario de Coworkia (precios base por hora)
 */
const TARIFARIO = {
  hotDesk: {
    name: 'Hot Desk',
    pricePerHour: 4.00, // $4 USD por hora
    minHours: 1,
    maxHours: 8
  },
  meetingRoom: {
    name: 'Sala de Reuniones',
    pricePerHour: 8.00, // $8 USD por hora
    minHours: 1,
    maxHours: 6
  },
  privateOffice: {
    name: 'Oficina Privada',
    pricePerHour: 12.00, // $12 USD por hora
    minHours: 2,
    maxHours: 8
  }
};

/**
 * 🆕 Calcula el costo total de una reserva (incluye 5% fee de Payphone)
 */
export function calculateReservationCost(serviceType, hours) {
  const service = TARIFARIO[serviceType] || TARIFARIO.hotDesk;
  
  if (hours < service.minHours || hours > service.maxHours) {
    return {
      error: `${service.name} debe reservarse entre ${service.minHours}-${service.maxHours} horas`
    };
  }

  const basePrice = service.pricePerHour * hours;
  const payphoneFee = basePrice * 0.05; // 5% fee de Payphone
  const totalPrice = basePrice + payphoneFee;

  return {
    service: service.name,
    hours,
    pricePerHour: service.pricePerHour,
    basePrice: basePrice.toFixed(2),
    payphoneFee: payphoneFee.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
    currency: 'USD'
  };
}

/**
 * 🆕 Obtiene información de pago si el usuario ya usó su día gratis
 */
export function getPaymentInfo(profile, serviceType = 'hotDesk', hours = 2) {
  const BANK_ACCOUNT = process.env.COWORKIA_BANK_ACCOUNT || 'Banco Pichincha\nCta Ahorros: 2207158516\nCoworkia Ecuador\nRUC: 1792954078001';
  const PAYMENT_LINK = 'https://ppls.me/hnMI9yMRxbQ6rgIVi6L2DA';

  if (!profile.freeTrialUsed) {
    return null; // No necesita pagar aún
  }

  // Calcular costo de la reserva
  const costInfo = calculateReservationCost(serviceType, hours);
  
  if (costInfo.error) {
    return {
      error: costInfo.error,
      message: `❌ ${costInfo.error}`
    };
  }

  const paymentMessage = `✅ Ya usaste tu día gratis el ${profile.freeTrialDate || 'anteriormente'}.\n\n� Costo de tu reserva:\n• ${costInfo.service}: ${costInfo.hours}h × $${costInfo.pricePerHour} = $${costInfo.basePrice}\n• Fee Payphone (5%): $${costInfo.payphoneFee}\n• TOTAL A PAGAR: $${costInfo.totalPrice} USD\n\n💳 **PAGO FÁCIL CON TARJETA:**\n${PAYMENT_LINK}\n• Ingresa → Coloca número de tarjeta → Paga $${costInfo.totalPrice}\n\n🏦 **Transferencia Bancaria:**\n${BANK_ACCOUNT}\n\nEnvía tu comprobante para confirmar ✅`;

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
 * 🔄 Guarda confirmación pendiente en el perfil del usuario
 */
export async function savePendingConfirmation(userId, reservationData) {
  try {
    const profile = await loadProfile(userId) || { userId };
    
    profile.pendingConfirmation = {
      ...reservationData,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutos
    };
    
    await saveProfile(userId, profile);
    return profile;
  } catch (error) {
    console.error('[Memoria] Error guardando confirmación pendiente:', error);
    return null;
  }
}

/**
 * 🔄 Actualiza perfil del usuario (función genérica)
 */
export async function updateUser(userId, updates) {
  try {
    const profile = await loadProfile(userId) || { userId };
    
    // Aplicar actualizaciones
    Object.assign(profile, updates);
    
    await saveProfile(userId, profile);
    return profile;
  } catch (error) {
    console.error('[Memoria] Error actualizando usuario:', error);
    return null;
  }
}

/**
 * 🔄 Limpia confirmaciones expiradas
 */
export async function cleanExpiredConfirmations(userId) {
  try {
    const profile = await loadProfile(userId);
    if (!profile || !profile.pendingConfirmation) return;
    
    const expiresAt = new Date(profile.pendingConfirmation.expiresAt);
    if (expiresAt < new Date()) {
      profile.pendingConfirmation = null;
      await saveProfile(userId, profile);
      console.log(`[Memoria] Confirmación expirada eliminada para ${userId}`);
    }
  } catch (error) {
    console.error('[Memoria] Error limpiando confirmaciones:', error);
  }
}

/**
 * 🆕 Obtiene información de pago si el usuario ya usó su día gratis (FUNCIÓN ANTERIOR - ELIMINADA)
 */