/**
 * 📅 Reservation Repository - Operaciones de base de datos para reservas
 */

import databaseService from './database.js';
import { generateSequentialCode } from '../utils/code-generator.js';
import {
  normalizeHotDeskNumbers,
  serializeHotDeskNumbers
} from '../utils/hot-desk-assignments.js';

function parseReservationRecord(reservation) {
  if (!reservation) return reservation;

  if (reservation.payment_data && typeof reservation.payment_data === 'string') {
    try {
      reservation.payment_data = JSON.parse(reservation.payment_data);
    } catch (e) {
      console.error('[RESERVATION] Error parsing payment_data:', e);
    }
  }

  const hotDeskNumbers = normalizeHotDeskNumbers(
    reservation.hot_desk_numbers,
    reservation.hot_desk_number
  );

  reservation.hot_desk_numbers = hotDeskNumbers;
  reservation.hot_desk_number = reservation.hot_desk_number ?? hotDeskNumbers[0] ?? null;
  reservation.desks_quantity = Number.parseInt(reservation.desks_quantity, 10) || hotDeskNumbers.length || 1;
  reservation.was_free = Boolean(reservation.was_free);

  return reservation;
}

class ReservationRepository {
  /**
   * 🔍 Busca una reserva por ID
   */
  async findById(reservationId) {
    databaseService.ensureInitialized();
    
    const query = `
      SELECT r.*, u.name as user_name, u.email as user_email
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.id = ?
    `;
    
    const reservation = await databaseService.get(query, [reservationId]);

    return parseReservationRecord(reservation);
  }

  /**
   * ✨ Crea una nueva reserva
   */
  async create(reservationData) {
    databaseService.ensureInitialized();
    
    const {
      id, // Si no se pasa, se genera automáticamente
      user_phone,
      service_type,
      date,
      start_time,
      end_time,
      duration_hours,
      guest_count = 0,
      total_price = 0,
      was_free = false,
      status = 'pending',
      payment_status = 'pending',
      payment_data = null,
      hot_desk_number = null, // Nuevo: número de Hot Desk (1-4)
      hot_desk_numbers = null, // Multi-hotdesk: números asignados
      payment_method = null, // Nuevo: método de pago
      calendar_event_id = null, // Nuevo: ID de evento en Google Calendar
      desks_quantity = 1 // Multi-hotdesk: cantidad de escritorios
    } = reservationData;

    // Generar código secuencial si no se provee ID
    const reservationId = id || await generateSequentialCode('AUR', 'reservations', 'id', 4);

    const query = `
      INSERT INTO reservations (
        id, user_phone, service_type, date, start_time, end_time,
        duration_hours, guest_count, total_price, was_free,
        status, payment_status, payment_data, hot_desk_number,
        hot_desk_numbers, payment_method, calendar_event_id, desks_quantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      reservationId, user_phone, service_type, date, start_time, end_time,
      duration_hours, guest_count, total_price, was_free ? 1 : 0,
      status, payment_status, payment_data ? JSON.stringify(payment_data) : null,
      hot_desk_number, serializeHotDeskNumbers(hot_desk_numbers, hot_desk_number),
      payment_method, calendar_event_id, desks_quantity
    ];

    await databaseService.run(query, params);
    return await this.findById(reservationId);
  }

  /**
   * 🔄 Actualiza una reserva existente
   */
  async update(reservationId, updateData) {
    databaseService.ensureInitialized();
    
    const updates = [];
    const params = [];
    
    // Construir query dinámicamente
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updates.push(`${key} = ?`);
        
        // Manejar campos especiales
        if (key === 'payment_data' && typeof value === 'object') {
          params.push(JSON.stringify(value));
        } else if (key === 'hot_desk_numbers') {
          params.push(serializeHotDeskNumbers(value));
        } else if (typeof value === 'boolean') {
          params.push(value ? 1 : 0);
        } else {
          params.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return await this.findById(reservationId);
    }

    params.push(reservationId);

    const query = `
      UPDATE reservations 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    await databaseService.run(query, params);
    return await this.findById(reservationId);
  }

  /**
   * 📋 Obtiene reservas de un usuario
   */
  async findByUser(phoneNumber, limit = 10) {
    databaseService.ensureInitialized();
    
    const query = `
      SELECT * FROM reservations 
      WHERE user_phone = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    
    const reservations = await databaseService.all(query, [phoneNumber, limit]);

    return reservations.map(parseReservationRecord);
  }

  /**
   * 📅 Obtiene reservas confirmadas futuras de un usuario
   * Útil para detectar conflictos y mostrar agenda
   */
  async findUpcomingByUser(phoneNumber) {
    databaseService.ensureInitialized();
    
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT * FROM reservations 
      WHERE user_phone = ?
        AND status = 'confirmed'
        AND date >= ?
      ORDER BY date ASC, start_time ASC
    `;
    
    const reservations = await databaseService.all(query, [phoneNumber, today]);

    return reservations.map(parseReservationRecord);
  }

  /**
   * 📅 Obtiene reservas por fecha
   */
  async findByDate(date, serviceType = null) {
    databaseService.ensureInitialized();
    
    let query = `
      SELECT r.*, u.name as user_name
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.date = ?
    `;
    
    const params = [date];
    
    if (serviceType) {
      query += ` AND r.service_type = ?`;
      params.push(serviceType);
    }
    
    query += ` ORDER BY r.start_time`;

    const reservations = await databaseService.all(query, params);
    return reservations.map(parseReservationRecord);
  }

  /**
   * 🔍 Busca reserva pendiente de un usuario
   */
  async findPendingByUser(phoneNumber) {
    databaseService.ensureInitialized();
    
    const query = `
      SELECT * FROM reservations 
      WHERE user_phone = ? AND status IN ('pending', 'pending_payment')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const reservation = await databaseService.get(query, [phoneNumber]);
    return parseReservationRecord(reservation);
  }

  /**
   * ✅ Confirma una reserva
   */
  async confirm(reservationId) {
    return await this.update(reservationId, {
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    });
  }

  /**
   * 🔄 Actualiza solo el estado de una reserva
   */
  async updateStatus(reservationId, status) {
    databaseService.ensureInitialized();
    await databaseService.run(
      `UPDATE reservations 
       SET status = ?, confirmed_at = CASE WHEN ? = 'confirmed' THEN COALESCE(confirmed_at, CURRENT_TIMESTAMP) ELSE confirmed_at END
       WHERE id = ?`,
      [status, status, reservationId]
    );
    return await this.findById(reservationId);
  }

  /**
   * 💳 Marca reserva como pagada
   * @param {boolean} autoConfirm - Si true, confirma automáticamente. Si false, solo guarda payment info
   */
  async markAsPaid(reservationId, paymentData, autoConfirm = true) {
    const updates = {
      payment_status: 'paid',
      payment_data: paymentData,
      // Nuevos campos PayPhone
      payment_transaction_number: paymentData.transactionNumber || null,
      payment_authorization_code: paymentData.authorizationCode || null,
      payment_date: paymentData.paymentDate || null,
      payment_receipt_url: paymentData.receiptUrl || null,
      payment_verified_at: paymentData.verifiedAt || new Date().toISOString()
    };
    
    // Solo confirmar si autoConfirm es true (default para compatibilidad)
    if (autoConfirm) {
      updates.status = 'confirmed';
      updates.confirmed_at = new Date().toISOString();
    }
    
    return await this.update(reservationId, updates);
  }

  /**
   * 📊 Obtiene estadísticas de reservas
   */
  async getStats(startDate = null, endDate = null) {
    databaseService.ensureInitialized();
    
    let query = `
      SELECT 
        COUNT(*) as total_reservations,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_reservations,
        COUNT(CASE WHEN was_free = 1 THEN 1 END) as free_reservations,
        SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) as total_revenue,
        service_type,
        COUNT(CASE WHEN service_type = 'hotDesk' THEN 1 END) as hotdesk_count,
        COUNT(CASE WHEN service_type = 'meetingRoom' THEN 1 END) as meetingroom_count
      FROM reservations
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += ` WHERE date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    query += ` GROUP BY service_type`;
    
    return await databaseService.all(query, params);
  }

  /**
   * 💳 Obtiene todas las reservas con pago pendiente
   * Usado por /health/queues para monitorear reservas atascadas
   */
  async getPendingPaymentReservations() {
    databaseService.ensureInitialized();
    
    const query = `
      SELECT 
        r.*,
        u.name as user_name,
        u.email as user_email
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.payment_status = 'pending'
        AND r.status = 'pending_payment'
      ORDER BY r.created_at ASC
    `;
    
    const reservations = await databaseService.all(query);

    return reservations.map(parseReservationRecord);
  }

  /**
   * 🔢 Asigna números de Hot Desk automáticamente (1-6)
   * Excluye desks permanentes + reservas confirmadas en el slot
   */
  async assignHotDeskNumbers(date, startTime, endTime, quantity = 1) {
    databaseService.ensureInitialized();
    
    // 1. Obtener desks permanentes ocupados en esa fecha
    const permanentDesks = await this.getPermanentDeskNumbers(date);
    const permanentNumbers = permanentDesks.map(d => d.hot_desk_number);
    
    // 2. Obtener reservas confirmadas en el slot
    const query = `
      SELECT hot_desk_number, hot_desk_numbers, desks_quantity
      FROM reservations
      WHERE service_type = 'hotDesk'
        AND status = 'confirmed'
        AND date = ?
        AND (
          (start_time < ? AND end_time > ?)
          OR (start_time >= ? AND start_time < ?)
          OR (start_time <= ? AND end_time > ?)
        )
      ORDER BY hot_desk_number ASC
    `;
    
    const occupiedDesks = await databaseService.all(query, [
      date,
      endTime, startTime,
      startTime, endTime,
      startTime, startTime
    ]);
    
    const reservedNumbers = occupiedDesks.flatMap(r =>
      normalizeHotDeskNumbers(r.hot_desk_numbers, r.hot_desk_number)
    );
    const unknownReservedCount = occupiedDesks.reduce((sum, r) => {
      const explicitNumbers = normalizeHotDeskNumbers(r.hot_desk_numbers, r.hot_desk_number);
      if (explicitNumbers.length > 0) return sum;
      return sum + (Number.parseInt(r.desks_quantity, 10) || 1);
    }, 0);
    const allOccupied = new Set([...permanentNumbers, ...reservedNumbers]);
    
    const candidateNumbers = [];
    for (let i = 1; i <= 6; i++) {
      if (!allOccupied.has(i)) {
        candidateNumbers.push(i);
      }
    }

    return candidateNumbers.slice(unknownReservedCount, unknownReservedCount + quantity);
  }

  async assignHotDeskNumber(date, startTime, endTime) {
    const numbers = await this.assignHotDeskNumbers(date, startTime, endTime, 1);
    return numbers[0] ?? null;
  }

  /**
   * 📊 Cuenta cuántos Hot Desks están ocupados en un slot específico
   * Incluye desks permanentes + reservas confirmadas
   */
  async countOccupiedHotDesks(date, startTime, endTime) {
    databaseService.ensureInitialized();
    
    const TOTAL_DESKS = 6;
    
    // 1. Desks permanentes activos en esa fecha
    const permanentDesks = await this.getPermanentDeskNumbers(date);
    const permanentNumbers = permanentDesks.map(d => d.hot_desk_number);
    
    // 2. Reservas confirmadas en el slot
    const query = `
      SELECT hot_desk_number, hot_desk_numbers, desks_quantity
      FROM reservations
      WHERE service_type = 'hotDesk'
        AND status = 'confirmed'
        AND date = ?
        AND (
          (start_time < ? AND end_time > ?)
          OR (start_time >= ? AND start_time < ?)
          OR (start_time <= ? AND end_time > ?)
        )
    `;
    
    const results = await databaseService.all(query, [
      date,
      endTime, startTime,
      startTime, endTime,
      startTime, startTime
    ]);
    
    const reservedNumbers = results.flatMap(r =>
      normalizeHotDeskNumbers(r.hot_desk_numbers, r.hot_desk_number)
    );
    const allOccupied = [...new Set([...permanentNumbers, ...reservedNumbers])];
    const unknownReservedCount = results.reduce((sum, r) => {
      const explicitNumbers = normalizeHotDeskNumbers(r.hot_desk_numbers, r.hot_desk_number);
      if (explicitNumbers.length > 0) return sum;
      return sum + (Number.parseInt(r.desks_quantity, 10) || 1);
    }, 0);
    const occupiedCount = Math.min(TOTAL_DESKS, allOccupied.length + unknownReservedCount);
    
    return {
      occupiedCount,
      availableCount: TOTAL_DESKS - occupiedCount,
      occupiedNumbers: allOccupied,
      permanentCount: permanentNumbers.length,
      permanentNumbers,
      isFull: occupiedCount >= TOTAL_DESKS
    };
  }

  /**
   * 🔁 Reservas candidatas para recordatorio de re-reserva (AURORA)
   * Retorna reservas confirmadas y pagadas de hace exactamente 7 días
   * que aún no tienen recordatorio enviado y cuyo usuario no tiene
   * reserva confirmada esta semana.
   */
  async findReservationsForRebookReminder() {
    databaseService.ensureInitialized();

    // Calcular la fecha de hace 7 días en Ecuador (UTC-5)
    const nowEcuador = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    const sevenDaysAgo = new Date(nowEcuador);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const targetDate = sevenDaysAgo.toISOString().split('T')[0];

    // Lunes de la semana actual (para detectar reservas existentes esta semana)
    const startOfWeek = new Date(nowEcuador);
    const day = startOfWeek.getDay(); // 0=dom
    startOfWeek.setDate(startOfWeek.getDate() - day);
    const weekStart = startOfWeek.toISOString().split('T')[0];

    const query = `
      SELECT r.id, r.user_phone, r.service_type, r.date, r.start_time, r.end_time,
             u.name AS user_name
      FROM reservations r
      LEFT JOIN users u ON r.user_phone = u.phone_number
      WHERE r.date = $1
        AND r.status = 'confirmed'
        AND r.payment_status = 'paid'
        AND r.service_type IN ('hotDesk', 'meetingRoom')
        AND r.rebook_reminder_sent_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM reservations r2
          WHERE r2.user_phone = r.user_phone
            AND r2.status = 'confirmed'
            AND r2.date >= $2
        )
      ORDER BY r.date ASC
      LIMIT 50
    `;

    const reservations = await databaseService.all(query, [targetDate, weekStart]);
    return reservations.map(r => ({ ...r, was_free: false }));
  }

  /**
   * ✅ Marca una reserva como recordatorio de re-reserva enviado
   */
  async markRebookReminderSent(reservationId) {
    databaseService.ensureInitialized();
    await databaseService.run(
      `UPDATE reservations SET rebook_reminder_sent_at = $1 WHERE id = $2`,
      [new Date().toISOString(), reservationId]
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🔒 PERMANENT DESKS — Hot Desks asignados a miembros con membresía
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Obtiene los números de hot desk ocupados permanentemente para una fecha
   */
  async getPermanentDeskNumbers(date) {
    databaseService.ensureInitialized();
    const results = await databaseService.all(
      `SELECT hot_desk_number, client_name, user_phone
       FROM permanent_desks
       WHERE status = 'active'
         AND start_date <= $1
         AND (end_date IS NULL OR end_date >= $1)
       ORDER BY hot_desk_number ASC`,
      [date]
    );
    return results;
  }

  /**
   * Crea o reactiva un desk permanente para un miembro
   */
  async createPermanentDesk({ userPhone, clientName, hotDeskNumber, membershipLeadId, startDate, endDate, notes }) {
    databaseService.ensureInitialized();
    
    // Si ya tiene uno activo con ese número, solo actualizar fechas
    const existing = await databaseService.get(
      `SELECT id FROM permanent_desks WHERE user_phone = $1 AND status = 'active'`,
      [userPhone]
    );

    if (existing) {
      await databaseService.run(
        `UPDATE permanent_desks 
         SET end_date = $1, updated_at = NOW(), notes = COALESCE($2, notes)
         WHERE id = $3`,
        [endDate, notes, existing.id]
      );
      return existing;
    }

    return await databaseService.get(
      `INSERT INTO permanent_desks (user_phone, client_name, hot_desk_number, membership_lead_id, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userPhone, clientName, hotDeskNumber, membershipLeadId, startDate, endDate, notes]
    );
  }

  /**
   * Lista todos los desks permanentes activos
   */
  async getActivePermanentDesks() {
    databaseService.ensureInitialized();
    return await databaseService.all(
      `SELECT * FROM permanent_desks WHERE status = 'active' ORDER BY hot_desk_number ASC`
    );
  }
}

export default new ReservationRepository();
