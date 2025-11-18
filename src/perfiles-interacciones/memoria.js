/**
 * 🧠 Sistema de memoria: perfiles de usuarios e historial de interacciones
 * 🐘 PostgreSQL en Heroku - ÚNICA BASE DE DATOS
 */

import databaseService from '../database/database.js';
import userRepository from '../database/userRepository.js';
import reservationRepository from '../database/reservationRepository.js';
import {
  getPendingConfirmation as dbGetPendingConfirmation,
  setPendingConfirmation as dbSetPendingConfirmation,
  clearPendingConfirmation as dbClearPendingConfirmation,
  getJustConfirmedState
} from '../servicios/reservation-state.js';

/**
 * 🚀 Inicializar PostgreSQL
 */
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      await databaseService.initialize();
      dbInitialized = true;
      console.log('[MEMORIA] ✅ PostgreSQL inicializado');
    } catch (error) {
      console.error('[MEMORIA] ❌ Error inicializando PostgreSQL:', error);
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
    console.log('[MEMORIA DEBUG] Llamando userRepository.findByPhone...');
    const user = await userRepository.findByPhone(userId);
    console.log('[MEMORIA DEBUG] findByPhone completado, user:', user ? 'FOUND' : 'NULL');
    
    if (!user) {
      console.log('[MEMORIA DEBUG] Usuario no encontrado, retornando null');
      return null;
    }
    
    // Convertir formato SQLite a formato esperado por la aplicación
    const reservationHistory = await getReservationHistory(userId);
    const upcomingReservations = await getUpcomingReservations(userId);
    const pendingConfirmation = await dbGetPendingConfirmation(userId);
    const justState = await getJustConfirmedState(userId);

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
      activeAgent: user.active_agent || 'AURORA', // Agente activo actual
      reservationHistory,
      upcomingReservations, // 🆕 Reservas confirmadas futuras
      pendingConfirmation,
      justConfirmed: justState.isActive,
      justConfirmedUntil: justState.until
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
      last_message_at: partialProfile.lastMessageAt || new Date().toISOString(),
      active_agent: partialProfile.activeAgent
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
      startTime: reservation.start_time,
      endTime: reservation.end_time,
      time: `${reservation.start_time}-${reservation.end_time}`,
      type: reservation.service_type === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones',
      serviceType: reservation.service_type,
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
 * 📅 Obtiene reservas confirmadas futuras de un usuario
 */
async function getUpcomingReservations(userId) {
  try {
    const reservations = await reservationRepository.findUpcomingByUser(userId);
    
    return reservations.map(reservation => ({
      date: reservation.date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      time: `${reservation.start_time}-${reservation.end_time}`,
      space: reservation.service_type === 'hotDesk' ? 'Hot Desk' : 'Sala de Reuniones',
      service_type: reservation.service_type,
      people: reservation.num_people || 1,
      price: reservation.was_free ? 'GRATIS' : `$${parseFloat(reservation.total_amount).toFixed(2)}`,
      was_free: reservation.was_free
    }));
  } catch (error) {
    console.error('[MEMORIA] Error obteniendo reservas futuras:', error);
    return [];
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
    return true;
  } catch (error) {
    console.error('[MEMORIA] Error guardando interacción:', error);
    throw error;
  }
}

/**
 * 🔍 Busca confirmación pendiente
 */
export async function getPendingConfirmation(userId) {
  await ensureDbInitialized();
  return await dbGetPendingConfirmation(userId);
}

export async function savePendingConfirmation(userId, reservationData) {
  await ensureDbInitialized();
  try {
    await dbSetPendingConfirmation(userId, reservationData);
    return true;
  } catch (error) {
    console.error('[MEMORIA] Error guardando confirmación pendiente:', error);
    return false;
  }
}

export async function clearPendingConfirmation(userId) {
  await ensureDbInitialized();
  try {
    await dbClearPendingConfirmation(userId);
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

/**
 * 💾 Guardar formulario parcial cuando usuario cancela
 */
export async function savePartialForm(userId, formData, formType = 'reservation') {
  await ensureDbInitialized();
  try {
    await databaseService.run(
      `INSERT INTO partial_forms (user_phone, form_data, form_type, cancelled_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_phone) DO UPDATE SET
         form_data = excluded.form_data,
         form_type = excluded.form_type,
         cancelled_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(formData), formType]
    );
    console.log('[MEMORIA] ✅ Formulario parcial guardado:', { userId, formType });
    return true;
  } catch (error) {
    console.error('[MEMORIA] ❌ Error guardando formulario parcial:', error);
    return false;
  }
}

/**
 * 📋 Obtener último formulario parcial guardado
 */
export async function getPartialForm(userId) {
  await ensureDbInitialized();
  try {
    const row = await databaseService.get(
      'SELECT form_data, form_type, cancelled_at FROM partial_forms WHERE user_phone = ?',
      [userId]
    );
    if (!row) return null;
    return {
      formData: JSON.parse(row.form_data),
      formType: row.form_type,
      cancelledAt: row.cancelled_at
    };
  } catch (error) {
    console.error('[MEMORIA] Error obteniendo formulario parcial:', error);
    return null;
  }
}

/**
 * 🗑️ Eliminar formulario parcial
 */
export async function clearPartialForm(userId) {
  await ensureDbInitialized();
  try {
    await databaseService.run('DELETE FROM partial_forms WHERE user_phone = ?', [userId]);
    return true;
  } catch (error) {
    console.error('[MEMORIA] Error eliminando formulario parcial:', error);
    return false;
  }
}

export function calculateReservationCost(serviceType, hours, people = 1) {
  // HOT DESK: $10 por primeras 2 horas, luego $10 por hora adicional
  // SALA REUNIONES: $29 por sala (2h, 3-4 personas), luego $15 por hora adicional
  
  let basePrice = 0;
  let serviceName = '';
  
  if (serviceType === 'hotDesk') {
    serviceName = 'Hot Desk';
    // Mínimo 2 horas = $10
    if (hours <= 2) {
      basePrice = 10.00;
    } else {
      // $10 por primeras 2h + $10 por cada hora adicional
      const additionalHours = hours - 2;
      basePrice = 10.00 + (additionalHours * 10.00);
    }
  } else if (serviceType === 'meetingRoom') {
    serviceName = 'Sala de Reuniones';
    // Validar personas (mínimo 3, máximo 4)
    if (people < 3) {
      return { error: 'Sala de reuniones requiere mínimo 3 personas' };
    }
    if (people > 4) {
      return { error: 'Sala de reuniones tiene capacidad máxima de 4 personas' };
    }
    
    // $29 por primeras 2h, luego $15 por hora adicional
    if (hours <= 2) {
      basePrice = 29.00;
    } else {
      const additionalHours = hours - 2;
      basePrice = 29.00 + (additionalHours * 15.00);
    }
  } else {
    return { error: `Tipo de servicio no válido: ${serviceType}` };
  }

  const payphoneFee = basePrice * 0.05; // 5% fee
  const totalPrice = basePrice + payphoneFee;

  return {
    service: serviceName,
    hours,
    people,
    basePrice: basePrice.toFixed(2),
    payphoneFee: payphoneFee.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
    currency: 'USD'
  };
}

export function getPaymentInfo(profile, serviceType = 'hotDesk', hours = 2) {
  const BANK_ACCOUNT = process.env.COWORKIA_BANK_ACCOUNT || 'Produbanco\nCta Ahorros: 20059783069\nCédula: 1702683499\nGonzalo Villota Izurieta';
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

/**
 * 📜 Carga historial de conversación (stub temporal)
 * TODO: Implementar con tabla interactions
 */
export async function loadConversationHistory(userId, limit = 10) {
  try {
    const interactions = await databaseService.all(
      'SELECT * FROM interactions WHERE user_phone = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );
    return interactions.reverse(); // Orden cronológico
  } catch (error) {
    console.error('[MEMORIA-SQLITE] Error cargando historial:', error);
    return [];
  }
}

/**
 * 💬 Guarda mensaje de conversación (stub temporal)
 * TODO: Implementar almacenamiento estructurado
 */
export async function saveConversationMessage(userId, message, role = 'user') {
  try {
    await saveInteraction({
      userId: userId,  // Corregido: usar userId en lugar de user_phone
      agent: 'aurora',
      agentName: 'Aurora',
      intentReason: 'conversation',
      input: role === 'user' ? message : '',
      output: role === 'assistant' ? message : '',
      meta: { role, timestamp: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error('[MEMORIA-SQLITE] Error guardando mensaje:', error);
    return false;
  }
}

// Mantener exports para compatibilidad
export { saveProfile as updateProfile };
export { databaseService };
