#!/usr/bin/env node
/**
 * 🔄 Migración de esquema PostgreSQL
 * Aplica cambios al esquema existente sin perder datos
 * 
 * Uso: 
 *   Local: DATABASE_URL=postgresql://... node scripts/migrate-postgres-schema.js
 *   Heroku: heroku run node scripts/migrate-postgres-schema.js -a coworkia-agent
 */

import pkg from 'pg';
const { Pool } = pkg;

const migrations = [
  {
    name: 'Add active_agent to users',
    check: async (client) => {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'active_agent'
      `);
      return result.rows.length === 0; // Ejecutar si NO existe
    },
    execute: async (client) => {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS active_agent TEXT DEFAULT 'AURORA'
      `);
      console.log('  ✅ Agregada columna active_agent a users');
    }
  },

  {
    name: 'Change reservations.id to TEXT',
    check: async (client) => {
      const result = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' AND column_name = 'id'
      `);
      return result.rows[0]?.data_type === 'integer'; // Ejecutar si es integer
    },
    execute: async (client) => {
      // ⚠️ Esto es destructivo - requiere recrear tabla
      console.log('  ⚠️  ADVERTENCIA: Cambiar tipo de id requiere recrear tabla');
      console.log('  📝 Respaldando datos existentes...');
      
      // Crear tabla temporal
      await client.query(`
        CREATE TABLE reservations_backup AS 
        SELECT 
          CONCAT('res_', id::text) as id,
          user_phone, service_type, date, start_time, end_time,
          total_price, status, created_at, confirmed_at
        FROM reservations
      `);
      
      // Eliminar tabla original
      await client.query('DROP TABLE reservations CASCADE');
      
      // Crear nueva tabla con esquema correcto
      await client.query(`
        CREATE TABLE reservations (
          id TEXT PRIMARY KEY,
          user_phone TEXT NOT NULL,
          service_type TEXT NOT NULL,
          date DATE NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          duration_hours INTEGER NOT NULL DEFAULT 2,
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
      
      // Restaurar datos
      await client.query(`
        INSERT INTO reservations (
          id, user_phone, service_type, date, start_time, end_time,
          total_price, status, created_at, confirmed_at
        )
        SELECT 
          id, user_phone, service_type, date, start_time, end_time,
          total_price, status, created_at, confirmed_at
        FROM reservations_backup
      `);
      
      // Eliminar backup
      await client.query('DROP TABLE reservations_backup');
      
      console.log('  ✅ Tabla reservations migrada a nuevo esquema');
    }
  },

  {
    name: 'Add new columns to reservations',
    check: async (client) => {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' AND column_name IN 
        ('duration_hours', 'guest_count', 'was_free', 'payment_status', 
         'payment_data', 'payment_method', 'hot_desk_number', 'calendar_event_id')
      `);
      return result.rows.length < 8; // Ejecutar si faltan columnas
    },
    execute: async (client) => {
      await client.query(`
        ALTER TABLE reservations
        ADD COLUMN IF NOT EXISTS duration_hours INTEGER NOT NULL DEFAULT 2,
        ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS was_free BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS payment_data TEXT,
        ADD COLUMN IF NOT EXISTS payment_method TEXT,
        ADD COLUMN IF NOT EXISTS hot_desk_number INTEGER,
        ADD COLUMN IF NOT EXISTS calendar_event_id TEXT
      `);
      console.log('  ✅ Agregadas columnas nuevas a reservations');
    }
  },

  {
    name: 'Create reservation_state table',
    check: async (client) => {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'reservation_state'
      `);
      return result.rows.length === 0;
    },
    execute: async (client) => {
      await client.query(`
        CREATE TABLE reservation_state (
          user_phone TEXT PRIMARY KEY,
          just_confirmed_until TIMESTAMP,
          last_reservation_id TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number)
        )
      `);
      console.log('  ✅ Tabla reservation_state creada');
    }
  },

  {
    name: 'Create partial_forms table',
    check: async (client) => {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'partial_forms'
      `);
      return result.rows.length === 0;
    },
    execute: async (client) => {
      await client.query(`
        CREATE TABLE partial_forms (
          user_phone TEXT PRIMARY KEY,
          form_data TEXT NOT NULL,
          form_type TEXT,
          cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number)
        )
      `);
      console.log('  ✅ Tabla partial_forms creada');
    }
  },

  {
    name: 'Fix pending_confirmations structure',
    check: async (client) => {
      const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'pending_confirmations' AND column_name = 'id'
      `);
      return result.rows.length > 0; // Ejecutar si tiene columna id (estructura vieja)
    },
    execute: async (client) => {
      console.log('  📝 Migrando pending_confirmations...');
      
      // Respaldar datos
      await client.query(`
        CREATE TABLE pending_confirmations_backup AS 
        SELECT user_phone, reservation_data::text as reservation_data, created_at, expires_at
        FROM pending_confirmations
      `);
      
      // Recrear tabla
      await client.query('DROP TABLE pending_confirmations CASCADE');
      await client.query(`
        CREATE TABLE pending_confirmations (
          user_phone TEXT PRIMARY KEY,
          reservation_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number)
        )
      `);
      
      // Restaurar datos
      await client.query(`
        INSERT INTO pending_confirmations 
        SELECT * FROM pending_confirmations_backup
        ON CONFLICT (user_phone) DO NOTHING
      `);
      
      await client.query('DROP TABLE pending_confirmations_backup');
      console.log('  ✅ pending_confirmations migrada');
    }
  },

  {
    name: 'Change interactions.meta to TEXT',
    check: async (client) => {
      const result = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'interactions' AND column_name = 'meta'
      `);
      return result.rows[0]?.data_type === 'jsonb';
    },
    execute: async (client) => {
      await client.query(`
        ALTER TABLE interactions 
        ALTER COLUMN meta TYPE TEXT USING meta::text
      `);
      console.log('  ✅ Columna meta convertida a TEXT');
    }
  },

  {
    name: 'Add missing indexes',
    check: async (client) => {
      const result = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'reservations' AND indexname = 'idx_reservations_status'
      `);
      return result.rows.length === 0;
    },
    execute: async (client) => {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_phone);
        CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
        CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
        CREATE INDEX IF NOT EXISTS idx_reservations_slot ON reservations(date, start_time, end_time, service_type);
      `);
      console.log('  ✅ Índices creados');
    }
  }
];

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL no está configurado');
    console.log('Uso:');
    console.log('  Local: DATABASE_URL=postgresql://... node scripts/migrate-postgres-schema.js');
    console.log('  Heroku: heroku run node scripts/migrate-postgres-schema.js -a coworkia-agent');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando migración de esquema PostgreSQL...\n');

    await client.query('BEGIN');

    for (const migration of migrations) {
      console.log(`📝 Verificando: ${migration.name}`);
      
      const shouldRun = await migration.check(client);
      
      if (shouldRun) {
        console.log(`  ▶️  Ejecutando migración...`);
        await migration.execute(client);
      } else {
        console.log(`  ⏭️  Ya aplicada, saltando`);
      }
      console.log('');
    }

    await client.query('COMMIT');
    console.log('✅ Migración completada exitosamente\n');

    // Mostrar resumen del esquema
    console.log('📊 Resumen del esquema actual:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    for (const row of tables.rows) {
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [row.table_name]);
      
      console.log(`\n  📋 ${row.table_name} (${columns.rows.length} columnas)`);
      columns.rows.forEach(col => {
        console.log(`     - ${col.column_name}: ${col.data_type}`);
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
