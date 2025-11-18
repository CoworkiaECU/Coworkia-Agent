/**
 * 🗄️ Database Service para Coworkia Agent
 * 🚨 ÚNICA BASE DE DATOS: PostgreSQL en Heroku (producción y desarrollo)
 * 
 * CAMPOS EN PRODUCCIÓN (PostgreSQL Heroku):
 * 
 * USERS:
 * - phone_number, name, email, whatsapp_display_name
 * - first_visit, free_trial_used, free_trial_date
 * - conversation_count, last_message_at, active_agent
 * - created_at, updated_at
 * 
 * RESERVATIONS:
 * - id, user_phone, service_type, date, start_time, end_time
 * - duration_hours, guest_count, total_price, was_free
 * - status, payment_status, payment_data, payment_method
 * - hot_desk_number, calendar_event_id
 * - created_at, confirmed_at
 * 
 * INTERACTIONS, PENDING_CONFIRMATIONS, RESERVATION_STATE, PARTIAL_FORMS
 */

import postgresAdapter from './postgres-adapter.js';

console.log(`[DATABASE] 🐘 Usando PostgreSQL en Heroku (ÚNICA BASE DE DATOS)`);

/**
 * 🔧 Clase principal del servicio de base de datos
 * ⚠️ SOLO PostgreSQL - SQLite completamente eliminado
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * 🚀 Inicializa la conexión a PostgreSQL
   */
  async initialize() {
    // Ya está inicializado - return early
    if (this.isInitialized) {
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

export default databaseService;
export { DatabaseService };
