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
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL no está configurado');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false // Heroku Postgres requiere SSL
      }
    });

    console.log('[POSTGRES] ✅ Pool de conexiones creado');

    // Crear tablas
    await this.createTables();
    
    this.isInitialized = true;
    console.log('[POSTGRES] ✅ Base de datos inicializada');
  }

  /**
   * 🏗️ Crea las tablas si no existen
   */
  async createTables() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Tabla de usuarios
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de confirmaciones pendientes
      await client.query(`
        CREATE TABLE IF NOT EXISTS pending_confirmations (
          id SERIAL PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP
        )
      `);

      // Tabla de flags justConfirmed
      await client.query(`
        CREATE TABLE IF NOT EXISTS just_confirmed (
          user_id TEXT PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP
        )
      `);

      // Tabla de reservas
      await client.query(`
        CREATE TABLE IF NOT EXISTS reservations (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          date DATE NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          service_type TEXT NOT NULL,
          total_price DECIMAL(10, 2),
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          confirmed_at TIMESTAMP,
          cancelled_at TIMESTAMP
        )
      `);

      // Tabla de interacciones
      await client.query(`
        CREATE TABLE IF NOT EXISTS interactions (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          agent TEXT NOT NULL,
          agent_name TEXT,
          intent_reason TEXT,
          input TEXT,
          output TEXT,
          meta JSONB,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de formularios temporales
      await client.query(`
        CREATE TABLE IF NOT EXISTS form_data (
          user_id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de historial de conversaciones
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversation_history (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          agent TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Índices para mejorar performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_reservations_user_date ON reservations(user_id, date);
        CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_user ON conversation_history(user_id);
      `);

      await client.query('COMMIT');
      console.log('[POSTGRES] ✅ Esquema de tablas creado');
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
   * 📝 Ejecutar query (compatible con SQLite API)
   */
  async run(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * 📖 Obtener una fila (compatible con SQLite API)
   */
  async get(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * 📚 Obtener todas las filas (compatible con SQLite API)
   */
  async all(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

// Instancia singleton
const postgresAdapter = new PostgresAdapter();

export default postgresAdapter;
export { PostgresAdapter };
