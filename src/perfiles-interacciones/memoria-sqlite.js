/**
 * 🧠 Sistema de memoria: perfiles de usuarios e historial de interacciones
 * MIGRADO A SQLite para mejor performance y escalabilidad
 */

import databaseService from '../database/database.js';
import userRepository from '../database/userRepository.js';
import reservationRepository from '../database/reservationRepository.js';
import fs from 'fs';
import path from 'path';

// Mantener compatibilidad con archivos JSON durante transición
const DATA_DIR = path.resolve(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const INTERACTIONS_FILE = path.join(DATA_DIR, 'interactions.jsonl');

// Asegurar que existe la carpeta data/
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * 🚀 Inicializar base de datos al importar el módulo
 */
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      await databaseService.initialize();
      dbInitialized = true;
      console.log('[MEMORIA] ✅ Base de datos SQLite inicializada');
    } catch (error) {
      console.error('[MEMORIA] ❌ Error inicializando SQLite:', error);
      throw error;
    }
  }
}

/**
 * 📋 Carga todos los perfiles (para compatibilidad)
 */
export async function loadAllProfiles() {
  await ensureDbInitialized();
  
  try {
    const users = await userRepository.list(1000, 0);
    const profiles = {};
    
    users.forEach(user => {
      profiles[user.phone_number] = {
        userId: user.phone_number,
        name: user.name,
        email: user.email,
        whatsappDisplayName: user.whatsapp_display_name,
        firstVisit: user.first_visit,
        freeTrialUsed: user.free_trial_used,
        freeTrialDate: user.free_trial_date,
        conversationCount: user.conversation_count,
        lastMessageAt: user.last_message_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    });
    
    return JSON.stringify(profiles, null, 2);
  } catch (error) {
    console.error('[MEMORIA] Error cargando perfiles desde SQLite:', error);
    
    // Fallback a archivo JSON si SQLite falla
    if (fs.existsSync(PROFILES_FILE)) {
      return fs.promises.readFile(PROFILES_FILE, 'utf-8');
    }
    
    return Promise.resolve('{}');
  }
}

/**
 * 👤 Carga un perfil de usuario
 */
export async function loadProfile(userId) {
  await ensureDbInitialized();
  
  try {
    const user = await userRepository.findByPhone(userId);
    
    if (!user) {
      return null;
    }
    
    // Convertir formato SQLite a formato esperado por la aplicación
    return {
      userId: user.phone_number,
      name: user.name,
      email: user.email,
      whatsappDisplayName: user.whatsapp_display_name,
      channel: 'whatsapp',
      firstVisit: user.first_visit,
      freeTrialUsed: user.free_trial_used,
      freeTrialDate: user.free_trial_date,
      conversationCount: user.conversation_count,
      lastMessageAt: user.last_message_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      // Agregar historial de reservas
      reservationHistory: await getReservationHistory(userId)
    };
  } catch (error) {
    console.error('[MEMORIA] Error cargando perfil desde SQLite:', error);
    
    // Fallback a archivo JSON
    try {
      if (fs.existsSync(PROFILES_FILE)) {
        const content = await fs.promises.readFile(PROFILES_FILE, 'utf-8');
        const profiles = JSON.parse(content);
        return profiles[userId] || null;
      }
    } catch (fallbackError) {
      console.error('[MEMORIA] Error en fallback JSON:', fallbackError);
    }
    
    return null;
  }
}

/**
 * 💾 Guarda un perfil de usuario
 */
export async function saveProfile(userId, partialProfile = {}) {
  await ensureDbInitialized();
  
  try {
    // Convertir formato de aplicación a formato SQLite
    const sqliteData = {
      name: partialProfile.name,
      email: partialProfile.email,
      whatsapp_display_name: partialProfile.whatsappDisplayName,
      first_visit: partialProfile.firstVisit,
      free_trial_used: partialProfile.freeTrialUsed,
      free_trial_date: partialProfile.freeTrialDate,
      conversation_count: partialProfile.conversationCount,
      last_message_at: partialProfile.lastMessageAt || new Date().toISOString()
    };
    
    // Remover campos undefined
    Object.keys(sqliteData).forEach(key => {
      if (sqliteData[key] === undefined) {
        delete sqliteData[key];
      }
    });
    
    await userRepository.createOrUpdate(userId, sqliteData);
    
    // También guardar en JSON para backup (temporal)
    await saveProfileToJson(userId, partialProfile);
    
    console.log(`[MEMORIA] ✅ Perfil guardado para ${userId}`);
    return true;
  } catch (error) {
    console.error('[MEMORIA] Error guardando perfil en SQLite:', error);
    
    // Fallback a JSON
    return await saveProfileToJson(userId, partialProfile);
  }
}

/**
 * 🔄 Actualiza un usuario (alias de saveProfile para compatibilidad)
 */
export async function updateUser(userId, updateData) {
  return await saveProfile(userId, updateData);
}

/**
 * 📅 Obtiene historial de reservas de un usuario
 */
async function getReservationHistory(userId) {
  try {
    const reservations = await reservationRepository.findByUser(userId, 10);
    
    return reservations.map(reservation => ({
      date: reservation.date,
      time: `${reservation.start_time}-${reservation.end_time}`,
      type: reservation.service_type === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones',
      status: reservation.status,
      wasFree: reservation.was_free,
      createdAt: reservation.created_at
    }));
  } catch (error) {
    console.error('[MEMORIA] Error obteniendo historial de reservas:', error);
    return [];
  }
}

/**
 * 💾 Guarda perfil en JSON (backup/fallback)
 */
async function saveProfileToJson(userId, partialProfile) {
  try {
    let profiles = {};
    if (fs.existsSync(PROFILES_FILE)) {
      const content = await fs.promises.readFile(PROFILES_FILE, 'utf-8');
      profiles = JSON.parse(content);
    }
    
    profiles[userId] = { ...profiles[userId], ...partialProfile };
    
    await fs.promises.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2));
    return true;
  } catch (error) {
    console.error('[MEMORIA] Error guardando perfil en JSON:', error);
    return false;
  }
}

/**
 * 💬 Guarda una interacción en la base de datos
 */
export async function saveInteraction(interactionData) {
  await ensureDbInitialized();
  
  try {
    const query = `
      INSERT INTO interactions (
        user_phone, agent, agent_name, intent_reason,
        input, output, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      interactionData.userId,
      interactionData.agent,
      interactionData.agentName,
      interactionData.intentReason,
      interactionData.input,
      interactionData.output,
      JSON.stringify(interactionData.meta || {})
    ];
    
    await databaseService.run(query, params);
    
    // También guardar en JSONL para backup
    await saveInteractionToJsonl(interactionData);
    
    return true;
  } catch (error) {
    console.error('[MEMORIA] Error guardando interacción en SQLite:', error);
    
    // Fallback a JSONL
    return await saveInteractionToJsonl(interactionData);
  }
}

/**
 * 💬 Guarda interacción en JSONL (backup)
 */
async function saveInteractionToJsonl(interactionData) {
  try {
    const interactionJson = JSON.stringify({
      ...interactionData,
      timestamp: new Date().toISOString()
    });
    
    await fs.promises.appendFile(INTERACTIONS_FILE, interactionJson + '\n');
    return true;
  } catch (error) {
    console.error('[MEMORIA] Error guardando interacción en JSONL:', error);
    return false;
  }
}

/**
 * 🔍 Busca confirmación pendiente
 */
export async function getPendingConfirmation(userId) {
  await ensureDbInitialized();
  
  try {
    const query = `
      SELECT * FROM pending_confirmations 
      WHERE user_phone = ?
    `;
    
    const result = await databaseService.get(query, [userId]);
    
    if (result) {
      try {
        return JSON.parse(result.reservation_data);
      } catch (e) {
        console.error('[MEMORIA] Error parsing confirmation data:', e);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[MEMORIA] Error obteniendo confirmación pendiente:', error);
    return null;
  }
}

/**
 * 💾 Guarda confirmación pendiente
 */
export async function savePendingConfirmation(userId, reservationData) {
  await ensureDbInitialized();
  
  try {
    // Eliminar confirmación existente si hay una
    await databaseService.run('DELETE FROM pending_confirmations WHERE user_phone = ?', [userId]);
    
    // Insertar nueva confirmación
    const query = `
      INSERT INTO pending_confirmations (user_phone, reservation_data, expires_at)
      VALUES (?, ?, ?)
    `;
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // Expira en 30 minutos
    
    const params = [
      userId,
      JSON.stringify(reservationData),
      expiresAt.toISOString()
    ];
    
    await databaseService.run(query, params);
    return true;
  } catch (error) {
    console.error('[MEMORIA] Error guardando confirmación pendiente:', error);
    return false;
  }
}

/**
 * 🗑️ Elimina confirmación pendiente
 */
export async function clearPendingConfirmation(userId) {
  await ensureDbInitialized();
  
  try {
    await databaseService.run('DELETE FROM pending_confirmations WHERE user_phone = ?', [userId]);
    return true;
  } catch (error) {
    console.error('[MEMORIA] Error eliminando confirmación pendiente:', error);
    return false;
  }
}

/**
 * 🆕 Las siguientes funciones mantienen compatibilidad con el código existente
 */

export async function updateReservationHistory(userId, reservation) {
  // Esta función ahora es manejada automáticamente por reservationRepository
  // Mantener para compatibilidad
  console.log('[MEMORIA] updateReservationHistory llamada - ahora manejada por SQLite automáticamente');
  return await loadProfile(userId);
}

export function calculateReservationCost(serviceType, hours) {
  const PRICING = {
    hotDesk: { name: 'Hot Desk', pricePerHour: 4.00 },
    meetingRoom: { name: 'Sala de Reuniones', pricePerHour: 8.00 }
  };

  const service = PRICING[serviceType];
  if (!service) {
    return { error: `Tipo de servicio no válido: ${serviceType}` };
  }

  const basePrice = service.pricePerHour * hours;
  const payphoneFee = basePrice * 0.05; // 5% fee
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

export function getPaymentInfo(profile, serviceType = 'hotDesk', hours = 2) {
  const BANK_ACCOUNT = process.env.COWORKIA_BANK_ACCOUNT || 'Banco Pichincha\nCta Ahorros: 2207158516\nCoworkia Ecuador\nRUC: 1792954078001';
  const PAYMENT_LINK = 'https://ppls.me/hnMI9yMRxbQ6rgIVi6L2DA';

  if (!profile.freeTrialUsed) {
    return null; // No necesita pagar aún
  }

  const costInfo = calculateReservationCost(serviceType, hours);
  
  if (costInfo.error) {
    return {
      error: costInfo.error,
      message: `❌ ${costInfo.error}`
    };
  }

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

// Mantener exports para compatibilidad
export { saveProfile as updateProfile };
export { databaseService };