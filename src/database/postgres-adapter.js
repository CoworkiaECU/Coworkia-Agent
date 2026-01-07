/**
 * 🐘 PostgreSQL Adapter para Coworkia Agent
 * Wrapper compatible con SQLite que usa PostgreSQL en producción
 */

import pkg from 'pg';
const { Pool } = pkg;

class PostgresAdapter {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  /**
   * 🚀 Inicializa conexión a PostgreSQL
   */
  async initialize() {
    // Ya está inicializado - return early
    if (this.isInitialized) {
      return;
    }

    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL no está configurado');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false // Heroku Postgres requiere SSL
      },
      max: 20, // Máximo de conexiones
      connectionTimeoutMillis: 10000, // Timeout al obtener conexión
      idleTimeoutMillis: 30000 // Tiempo antes de cerrar conexión idle
    });

    // Configurar statement_timeout para todas las conexiones
    this.pool.on('connect', (client) => {
      client.query('SET statement_timeout = 15000'); // 15 segundos
    });

    console.log('[POSTGRES] ✅ Pool de conexiones creado');

    // Crear tablas
    await this.createTables();
    
    this.isInitialized = true;
    console.log('[POSTGRES] ✅ Base de datos inicializada');
  }

  /**
   * 🏗️ Crea las tablas si no existen (ALINEADO CON SQLite)
   */
  async createTables() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Tabla de usuarios (COMPLETA - incluye active_agent + preferred_language)
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          phone_number TEXT PRIMARY KEY,
          name TEXT,
          email TEXT,
          whatsapp_display_name TEXT,
          first_visit BOOLEAN DEFAULT TRUE,
          free_trial_used BOOLEAN DEFAULT FALSE,
          free_trial_date TIMESTAMP,
          conversation_count INTEGER DEFAULT 0,
          last_message_at TIMESTAMP,
          active_agent TEXT DEFAULT 'AURORA',
          preferred_language TEXT DEFAULT 'es',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Agregar columna preferred_language si no existe (migración)
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'preferred_language'
          ) THEN
            ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'es';
          END IF;
        END $$;
      `);

      // Tabla de reservas (COMPLETA - todas las columnas de SQLite)
      await client.query(`
        CREATE TABLE IF NOT EXISTS reservations (
          id TEXT PRIMARY KEY,
          user_phone TEXT NOT NULL,
          service_type TEXT NOT NULL,
          date DATE NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          duration_hours INTEGER NOT NULL,
          guest_count INTEGER DEFAULT 0,
          total_price DECIMAL(10,2) DEFAULT 0,
          was_free BOOLEAN DEFAULT FALSE,
          status TEXT DEFAULT 'pending',
          payment_status TEXT DEFAULT 'pending',
          payment_data TEXT,
          payment_method TEXT,
          hot_desk_number INTEGER,
          calendar_event_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          confirmed_at TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number)
        )
      `);

      // Tabla de interacciones
      await client.query(`
        CREATE TABLE IF NOT EXISTS interactions (
          id SERIAL PRIMARY KEY,
          user_phone TEXT NOT NULL,
          agent TEXT,
          agent_name TEXT,
          intent_reason TEXT,
          input TEXT,
          output TEXT,
          meta TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number)
        )
      `);

      // Tabla de confirmaciones pendientes (ALINEADA CON SQLite)
      await client.query(`
        CREATE TABLE IF NOT EXISTS pending_confirmations (
          user_phone TEXT PRIMARY KEY,
          reservation_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number)
        )
      `);

      // Tabla de estado de reservas (justConfirmed flag)
      await client.query(`
        CREATE TABLE IF NOT EXISTS reservation_state (
          user_phone TEXT PRIMARY KEY,
          just_confirmed_until TIMESTAMP,
          last_reservation_id TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number)
        )
      `);

      // Tabla de formularios parciales guardados (para cancelaciones)
      await client.query(`
        CREATE TABLE IF NOT EXISTS partial_forms (
          user_phone TEXT PRIMARY KEY,
          form_data TEXT NOT NULL,
          form_type TEXT,
          cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number)
        )
      `);

      // Tabla de historial de conversaciones
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversation_history (
          id SERIAL PRIMARY KEY,
          user_phone TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          agent TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Índices para mejorar performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_phone);
        CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
        CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
        CREATE INDEX IF NOT EXISTS idx_reservations_slot ON reservations(date, start_time, end_time, service_type);
        CREATE INDEX IF NOT EXISTS idx_pending_confirmations_expires ON pending_confirmations(expires_at);
        CREATE INDEX IF NOT EXISTS idx_reservation_state_just_confirmed ON reservation_state(just_confirmed_until);
        CREATE INDEX IF NOT EXISTS idx_partial_forms_cancelled ON partial_forms(cancelled_at);
        CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_phone);
        CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_conversation_user ON conversation_history(user_phone);
      `);

      await client.query('COMMIT');
      console.log('[POSTGRES] ✅ Esquema de tablas creado/actualizado');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[POSTGRES] ❌ Error creando tablas:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 🔌 Cierra la conexión
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('[POSTGRES] ✅ Conexiones cerradas');
    }
  }

  /**
   * 🔄 Convertir placeholders ? a $1, $2, $3...
   */
  convertPlaceholders(sql) {
    let index = 1;
    // Normalizar espacios en blanco y saltos de línea
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();
    return normalizedSql.replace(/\?/g, () => `$${index++}`);
  }

  /**
   * 📝 Ejecutar query (compatible con SQLite API)
   */
  async run(sql, params = []) {
    try {
      const pgSql = this.convertPlaceholders(sql);
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[POSTGRES DEBUG] run() SQL:', pgSql, 'Params:', params);
      }
      const result = await this.pool.query(pgSql, params);
      return {
        changes: result.rowCount || 0,
        lastID: result.rows[0]?.id || null
      };
    } catch (error) {
      console.error('[POSTGRES ERROR] run() failed:', error.message);
      console.error('[POSTGRES ERROR] SQL:', sql);
      console.error('[POSTGRES ERROR] Converted SQL:', this.convertPlaceholders(sql));
      console.error('[POSTGRES ERROR] Params:', params);
      throw error;
    }
  }

  /**
   * 📖 Obtener una fila (compatible con SQLite API)
   */
  async get(sql, params = []) {
    try {
      const pgSql = this.convertPlaceholders(sql);
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[POSTGRES DEBUG] get() SQL:', pgSql, 'Params:', params);
      }
      const startTime = Date.now();
      const result = await this.pool.query(pgSql, params);
      const duration = Date.now() - startTime;
      if (process.env.DEBUG_MODE === 'true') {
        console.log(`[POSTGRES DEBUG] get() completado en ${duration}ms, rows:`, result.rows.length);
      }
      return result.rows[0] || null;
    } catch (error) {
      console.error('[POSTGRES ERROR] get() failed:', error.message);
      console.error('[POSTGRES ERROR] SQL:', sql);
      console.error('[POSTGRES ERROR] Converted SQL:', this.convertPlaceholders(sql));
      console.error('[POSTGRES ERROR] Params:', params);
      throw error;
    }
  }

  /**
   * 📚 Obtener todas las filas (compatible con SQLite API)
   */
  async all(sql, params = []) {
    try {
      const pgSql = this.convertPlaceholders(sql);
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[POSTGRES DEBUG] all() SQL:', pgSql, 'Params:', params);
      }
      const startTime = Date.now();
      const result = await this.pool.query(pgSql, params);
      const duration = Date.now() - startTime;
      if (process.env.DEBUG_MODE === 'true') {
        console.log(`[POSTGRES DEBUG] all() completado en ${duration}ms, rows:`, result.rows.length);
      }
      return result.rows;
    } catch (error) {
      console.error('[POSTGRES ERROR] all() failed:', error.message);
      console.error('[POSTGRES ERROR] SQL:', sql);
      console.error('[POSTGRES ERROR] Converted SQL:', this.convertPlaceholders(sql));
      console.error('[POSTGRES ERROR] Params:', params);
      throw error;
    }
  }
}

// Instancia singleton
const postgresAdapter = new PostgresAdapter();

export default postgresAdapter;
export { PostgresAdapter };
