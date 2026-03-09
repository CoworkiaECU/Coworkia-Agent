/**
 * 🗄️ Database Service para Coworkia Agent
 * 🚨 ÚNICA BASE DE DATOS: PostgreSQL en Heroku (producción y desarrollo)
 * 
 * CAMPOS EN PRODUCCIÓN (PostgreSQL Heroku):
 * 
 * USERS:
 * - phone_number, name, email, whatsapp_display_name
 * - first_visit, free_trial_used, free_trial_date
 * - conversation_count, last_message_at, active_agent, preferred_language
 * - active_agents (JSONB), context_preferences (JSONB)
 * - created_at, updated_at
 * 
 * RESERVATIONS:
 * - id, user_phone, service_type, date, start_time, end_time
 * - duration_hours, guest_count, total_price, was_free
 * - status, payment_status, payment_data, payment_method
 * - hot_desk_number, calendar_event_id
 * - created_at, confirmed_at
 * 
 * AGENT_CONVERSATIONS (NUEVO - Sistema Unificado):
 * - id, user_phone, agent, conversation_topic, session_id
 * - role, content, metadata (JSONB), parent_message_id
 * - timestamp
 * 
 * CONVERSATION_FILES (NUEVO - Archivos adjuntos):
 * - id, message_id, user_phone, agent, file_type
 * - file_url, file_data, processed, analysis_result (JSONB)
 * - uploaded_at
 * 
 * ACTIVE_TOPICS (NUEVO - Tracking de temas):
 * - user_phone, agent, topic, session_id, status
 * - last_interaction, context_summary
 * 
 * LEGACY TABLES (se mantienen como respaldo):
 * - INTERACTIONS, CONVERSATION_HISTORY
 * - PENDING_CONFIRMATIONS, RESERVATION_STATE, PARTIAL_FORMS
 */

import postgresAdapter from './postgres-adapter.js';

const NODE_ENV = process.env.NODE_ENV || 'production';
const IS_TEST = NODE_ENV === 'test';

if (!IS_TEST) {
  console.log(`[DATABASE] 🐘 Usando PostgreSQL en Heroku (ÚNICA BASE DE DATOS)`);
}

// Sencillo adaptador en memoria para entorno de tests (sin Postgres)
class InMemoryDB {
  constructor() {
    this.tables = {
      users: new Map(),
      reservations: new Map(),
      reservation_state: new Map(),
      pending_confirmations: new Map()
    };
  }

  async run(query, params = []) {
    const lower = (query || '').toLowerCase();
    const lowerTrim = lower.trimStart();

    if (lowerTrim.startsWith('delete from pending_confirmations')) {
      // Soportar distintos WHERE
      if (lowerTrim.includes('where user_phone')) {
        const target = params[0];
        if (target) {
          this.tables.pending_confirmations.delete(target);
          return true;
        }
      }

      // Limpieza por expiración
      if (lowerTrim.includes('expires_at') && params.length > 0) {
        const cutoff = params[0];
        for (const [user, row] of this.tables.pending_confirmations.entries()) {
          if (row.expires_at && row.expires_at < cutoff) {
            this.tables.pending_confirmations.delete(user);
          }
        }
        return true;
      }

      // Fallback: limpiar todo (uso de tests legacy)
      this.tables.pending_confirmations.clear();
      return true;
    }

    if (lowerTrim.startsWith('delete from reservation_state')) {
      this.tables.reservation_state.clear();
      return true;
    }

    if (lowerTrim.startsWith('delete from reservations')) {
      this.tables.reservations.clear();
      return true;
    }

    if (lowerTrim.startsWith('delete from users')) {
      this.tables.users.clear();
      return true;
    }

    if (lowerTrim.startsWith('insert or ignore into users') || lowerTrim.startsWith('insert into users')) {
      const [phoneNumber, freeTrialUsed] = params;
      if (!this.tables.users.has(phoneNumber)) {
        this.tables.users.set(phoneNumber, {
          phone_number: phoneNumber,
          free_trial_used: freeTrialUsed ?? 0,
          name: null,
          email: null
        });
      }
      return true;
    }

    if (lowerTrim.startsWith('update users')) {
      const [name, email, phone] = params;
      const existing = this.tables.users.get(phone) || {};
      this.tables.users.set(phone, { ...existing, name, email });
      return true;
    }

    if (lowerTrim.startsWith('insert into reservations')) {
      // Soportar ambos contratos: 8 params (tests directos) y 16 params (repositorio)
      let record = {};
      if (params.length === 8) {
        const [id, user_phone, service_type, date, start_time, end_time, duration_hours, status] = params;
        record = {
          id,
          user_phone,
          service_type,
          date,
          start_time,
          end_time,
          duration_hours,
          guest_count: 0,
          total_price: 0,
          was_free: false,
          status: status || 'pending',
          payment_status: 'pending'
        };
      } else {
        const [id, user_phone, service_type, date, start_time, end_time, duration_hours, guest_count, total_price, was_free, status, payment_status, payment_data, hot_desk_number, payment_method, calendar_event_id] = params;
        record = {
          id,
          user_phone,
          service_type,
          date,
          start_time,
          end_time,
          duration_hours,
          guest_count: guest_count ?? 0,
          total_price: total_price ?? 0,
          was_free: Boolean(was_free),
          status: status || 'pending',
          payment_status: payment_status || 'pending',
          payment_data,
          hot_desk_number,
          payment_method,
          calendar_event_id
        };
      }

      this.tables.reservations.set(record.id, {
        ...record,
        created_at: new Date().toISOString()
      });
      return true;
    }

    if (lowerTrim.startsWith('update reservations')) {
      const [status, statusAgain, reservationId] = params;
      const existing = this.tables.reservations.get(reservationId);
      if (existing) {
        this.tables.reservations.set(reservationId, { ...existing, status });
      }
      return true;
    }

    if (lowerTrim.startsWith('insert into reservation_state')) {
      const [user_phone, just_confirmed_until, last_reservation_id, updated_at] = params;
      this.tables.reservation_state.set(user_phone, {
        user_phone,
        just_confirmed_until,
        last_reservation_id,
        updated_at
      });
      return true;
    }

    if (lowerTrim.startsWith('update reservation_state')) {
      const [just_confirmed_until, user_phone] = params;
      const existing = this.tables.reservation_state.get(user_phone) || {};
      this.tables.reservation_state.set(user_phone, { ...existing, just_confirmed_until });
      return true;
    }

    if (lowerTrim.startsWith('insert into pending_confirmations')) {
      const [user_phone, reservation_data, expires_at] = params;
      this.tables.pending_confirmations.set(user_phone, {
        user_phone,
        reservation_data,
        expires_at,
        created_at: new Date().toISOString()
      });
      return true;
    }

    return true;
  }

  async get(query, params = []) {
    const lower = (query || '').toLowerCase();

    if (lower.includes('from reservation_state')) {
      return this.tables.reservation_state.get(params[0]) || null;
    }

    if (lower.includes('from pending_confirmations')) {
      const row = this.tables.pending_confirmations.get(params[0]);
      if (!row) return null;
      return {
        reservation_data: row.reservation_data,
        expires_at: row.expires_at,
        created_at: row.created_at
      };
    }

    if (lower.includes('from reservations')) {
      const id = params[0];
      return this.tables.reservations.get(id) || null;
    }

    if (lower.includes('from users')) {
      return this.tables.users.get(params[0]) || null;
    }

    return null;
  }

  async all(query, params = []) {
    const lower = (query || '').toLowerCase();

    if (lower.includes('from reservations')) {
      const date = params[0];
      const serviceType = params[1];
      const list = Array.from(this.tables.reservations.values())
        .filter(r => r.date === date && (!serviceType || r.service_type === serviceType))
        .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
      return list;
    }

    return [];
  }

  async transaction(work) {
    return work();
  }
}

/**
 * 🔧 Clase principal del servicio de base de datos
 * ⚠️ SOLO PostgreSQL - SQLite completamente eliminado
 */
class DatabaseService {
  constructor() {
    this.db = IS_TEST ? new InMemoryDB() : null;
    this.isInitialized = IS_TEST;
  }

  /**
   * 🚀 Inicializa la conexión a PostgreSQL
   */
  async initialize() {
    // Ya está inicializado - return early
    if (this.isInitialized) {
      return;
    }

    // En tests usamos adaptador en memoria, no Postgres
    if (IS_TEST) {
      this.db = new InMemoryDB();
      this.isInitialized = true;
      return;
    }

    await postgresAdapter.initialize();
    this.db = postgresAdapter;
    this.isInitialized = true;
  }

  /**
   * 🔄 Wrapper para db.run con Promesas
   */
  run(query, params = []) {
    return this.db.run(query, params);
  }

  /**
   * 🔍 Wrapper para db.get con Promesas
   */
  get(query, params = []) {
    return this.db.get(query, params);
  }

  /**
   * 📋 Wrapper para db.all con Promesas
   */
  all(query, params = []) {
    return this.db.all(query, params);
  }

  /**
   * 🔒 Cierra la conexión a la base de datos
   */
  async close() {
    if (this.db && this.db.close) {
      await this.db.close();
      console.log('[DATABASE] ✅ Conexión cerrada');
    }
  }

  /**
   * 🚨 Verifica si la base de datos está inicializada
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

  /**
   * 🔁 Ejecuta operaciones dentro de una transacción
   */
  async transaction(work) {
    this.ensureInitialized();
    return this.db.transaction(work);
  }
}

// Instancia singleton
const databaseService = new DatabaseService();

// Exports principales
export default databaseService;
export { DatabaseService };

// Helper exports para queries directas
export const query = async (sql, params) => {
  await databaseService.ensureInitialized();
  const rows = await databaseService.db.all(sql, params);
  return { rows };
};

export const getClient = async () => {
  await databaseService.ensureInitialized();
  // El pool de PostgreSQL tiene el método connect() que retorna un client
  return databaseService.db.pool.connect();
};
