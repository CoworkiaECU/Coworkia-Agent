/**
 * 🗄️ Database Service para Coworkia Agent
 * Usa PostgreSQL en producción (Heroku) y SQLite en desarrollo
 */

import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import postgresAdapter from './postgres-adapter.js';

// Detectar entorno
const USE_POSTGRES = process.env.DATABASE_URL && process.env.NODE_ENV === 'production';

// Configuración de la base de datos SQLite
const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'coworkia.db');
const DATA_DIR = path.dirname(DB_PATH);

if (USE_POSTGRES) {
  console.log(`[DATABASE] 🐘 Usando PostgreSQL en producción`);
} else {
  console.log(`[DATABASE] 📁 Usando SQLite: ${DB_PATH}`);
}

// Asegurar que existe la carpeta data/
try {
  await fs.mkdir(DATA_DIR, { recursive: true });
} catch (error) {
  // Carpeta ya existe, continuar
}

/**
 * 🔧 Clase principal del servicio de base de datos
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * 🚀 Inicializa la conexión a la base de datos
   */
  async initialize() {
    // Si estamos en producción con DATABASE_URL, usar PostgreSQL
    if (USE_POSTGRES) {
      await postgresAdapter.initialize();
      this.db = postgresAdapter; // Usar el adapter como interfaz
      this.isInitialized = true;
      return;
    }

    // En desarrollo, usar SQLite
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('[DATABASE] Error conectando a SQLite:', err);
          reject(err);
          return;
        }
        
        console.log('[DATABASE] ✅ Conectado a SQLite:', DB_PATH);
        
        // Configuración de seguridad/concurrencia
        this.db.run('PRAGMA foreign_keys = ON');
        this.db.run('PRAGMA journal_mode = WAL');
        this.db.run('PRAGMA busy_timeout = 5000');
        
        this.createTables()
          .then(() => {
            this.isInitialized = true;
            console.log('[DATABASE] ✅ Esquema de base de datos inicializado');
            resolve();
          })
          .catch(reject);
      });
    });
  }

  /**
   * 🏗️ Crea las tablas si no existen
   */
  async createTables() {
    const schemas = [
      // Tabla de usuarios
      `CREATE TABLE IF NOT EXISTS users (
        phone_number TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        whatsapp_display_name TEXT,
        first_visit BOOLEAN DEFAULT 1,
        free_trial_used BOOLEAN DEFAULT 0,
        free_trial_date DATE,
        conversation_count INTEGER DEFAULT 0,
        last_message_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabla de reservas
      `CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        user_phone TEXT NOT NULL,
        service_type TEXT NOT NULL,
        date DATE NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_hours INTEGER NOT NULL,
        guest_count INTEGER DEFAULT 0,
        total_price DECIMAL(10,2) DEFAULT 0,
        was_free BOOLEAN DEFAULT 0,
        status TEXT DEFAULT 'pending',
        payment_status TEXT DEFAULT 'pending',
        payment_data TEXT, -- JSON stringified
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        confirmed_at DATETIME,
        FOREIGN KEY (user_phone) REFERENCES users(phone_number)
      )`,

      // Tabla de interacciones/conversaciones
      `CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_phone TEXT NOT NULL,
        agent TEXT,
        agent_name TEXT,
        intent_reason TEXT,
        input TEXT,
        output TEXT,
        meta TEXT, -- JSON stringified
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_phone) REFERENCES users(phone_number)
      )`,

      // Tabla para confirmaciones pendientes
      `CREATE TABLE IF NOT EXISTS pending_confirmations (
        user_phone TEXT PRIMARY KEY,
        reservation_data TEXT NOT NULL, -- JSON stringified
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (user_phone) REFERENCES users(phone_number)
      )`,

      `CREATE TABLE IF NOT EXISTS reservation_state (
        user_phone TEXT PRIMARY KEY,
        just_confirmed_until DATETIME,
        last_reservation_id TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_phone) REFERENCES users(phone_number)
      )`
    ];

    // Crear índices para mejorar performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_phone)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date)',
      'CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_slot ON reservations(date, start_time, end_time, service_type)',
      'CREATE INDEX IF NOT EXISTS idx_pending_confirmations_expires ON pending_confirmations(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_reservation_state_just_confirmed ON reservation_state(just_confirmed_until)',
      'CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_phone)',
      'CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp)'
    ];

    // Ejecutar schemas
    for (const schema of schemas) {
      await this.run(schema);
    }

    // Ejecutar índices
    for (const index of indexes) {
      await this.run(index);
    }
  }

  /**
   * 🔄 Wrapper para db.run con Promesas
   */
  run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('[DATABASE] Error ejecutando query:', err);
          console.error('[DATABASE] Query:', query);
          console.error('[DATABASE] Params:', params);
          reject(err);
        } else {
          resolve({ changes: this.changes, lastID: this.lastID });
        }
      });
    });
  }

  /**
   * 🔍 Wrapper para db.get con Promesas
   */
  get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          console.error('[DATABASE] Error en get:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * 📋 Wrapper para db.all con Promesas
   */
  all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          console.error('[DATABASE] Error en all:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * 🔒 Cierra la conexión a la base de datos
   */
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('[DATABASE] Error cerrando DB:', err);
          } else {
            console.log('[DATABASE] ✅ Conexión cerrada');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
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
  async transaction(work, mode = 'IMMEDIATE') {
    this.ensureInitialized();
    await this.run(`BEGIN ${mode} TRANSACTION`);

    try {
      const result = await work();
      await this.run('COMMIT');
      return result;
    } catch (error) {
      try {
        await this.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('[DATABASE] ❌ Error realizando rollback:', rollbackError);
      }
      throw error;
    }
  }
}

// Instancia singleton
const databaseService = new DatabaseService();

export default databaseService;
export { DatabaseService };
