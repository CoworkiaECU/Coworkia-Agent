/**
 * 🐘 PostgreSQL Adapter para Coworkia Agent
 * Wrapper compatible con SQLite que usa PostgreSQL en producción
 */

import pkg from 'pg';
const { Pool } = pkg;
import { metricsCollector } from '../utils/observability.js';

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
      max: 10, // Reducido de 20 → 10 para ahorrar memoria
      connectionTimeoutMillis: 10000, // Timeout al obtener conexión
      idleTimeoutMillis: 30000 // Tiempo antes de cerrar conexión idle
    });

    // Configurar statement_timeout para todas las conexiones
    this.pool.on('connect', (client) => {
      client.query('SET statement_timeout = 15000'); // 15 segundos
    });

    // Event handlers para monitoring
    this.pool.on('error', (err, client) => {
      console.error('[POSTGRES POOL ERROR]', err.message);
    });

    this.pool.on('acquire', (client) => {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[POSTGRES] ⚡ Conexión adquirida del pool');
      }
    });

    this.pool.on('release', (client) => {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[POSTGRES] 🔓 Conexión liberada al pool');
      }
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
          preferred_language TEXT DEFAULT 'es' CHECK (preferred_language IN ('es', 'en', 'fr', 'it', 'pt', 'qu')),
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
            ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'es' CHECK (preferred_language IN ('es', 'en', 'fr', 'it', 'pt', 'qu'));
          END IF;
        END $$;
      `);
      
      // Agregar CHECK constraint si no existe (migración para tablas existentes)
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage 
            WHERE table_name = 'users' 
            AND constraint_name = 'users_preferred_language_check'
          ) THEN
            ALTER TABLE users ADD CONSTRAINT users_preferred_language_check 
            CHECK (preferred_language IN ('es', 'en', 'fr', 'it', 'pt', 'qu'));
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

      // Tabla de confirmaciones pendientes (MEJORADA - con tipo de agente)
      await client.query(`
        CREATE TABLE IF NOT EXISTS pending_confirmations (
          user_phone TEXT PRIMARY KEY,
          agent_type TEXT NOT NULL DEFAULT 'AURORA',
          agent_name TEXT,
          reservation_data TEXT NOT NULL,
          confirmation_type TEXT, -- 'reservation', 'membership', 'visit', 'quote'
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);
      
      // Agregar columnas nuevas si la tabla ya existe
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'pending_confirmations' AND column_name = 'agent_type'
          ) THEN
            ALTER TABLE pending_confirmations ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'AURORA';
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'pending_confirmations' AND column_name = 'agent_name'
          ) THEN
            ALTER TABLE pending_confirmations ADD COLUMN agent_name TEXT;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'pending_confirmations' AND column_name = 'confirmation_type'
          ) THEN
            ALTER TABLE pending_confirmations ADD COLUMN confirmation_type TEXT;
          END IF;
        END $$;
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

      // ===================================================================
      // TABLAS DE FORMULARIOS PARCIALES: Especializadas por agente
      // Reemplaza partial_forms genérica para mejor calidad de datos
      // ===================================================================

      // Aurora - Reservas parciales/canceladas
      await client.query(`
        CREATE TABLE IF NOT EXISTS aurora_partial_reservations (
          user_phone TEXT PRIMARY KEY,
          service_type TEXT NOT NULL,
          date DATE,
          start_time TEXT,
          end_time TEXT,
          duration_hours INTEGER,
          guest_count INTEGER,
          total_price DECIMAL(10,2),
          was_free BOOLEAN DEFAULT FALSE,
          form_progress TEXT, -- 'date_selected', 'time_selected', 'guests_selected', etc.
          cancellation_reason TEXT,
          cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Aluna - Membresías parciales/canceladas
      await client.query(`
        CREATE TABLE IF NOT EXISTS aluna_partial_memberships (
          user_phone TEXT PRIMARY KEY,
          membership_type TEXT NOT NULL,
          start_date TEXT,
          client_name TEXT,
          email TEXT,
          phone TEXT,
          company_name TEXT,
          special_requirements TEXT,
          monthly_fee DECIMAL(10,2),
          form_progress TEXT,
          cancellation_reason TEXT,
          cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Axel - Cotizaciones parciales/canceladas
      await client.query(`
        CREATE TABLE IF NOT EXISTS axel_partial_quotes (
          user_phone TEXT PRIMARY KEY,
          damage_type TEXT NOT NULL,
          client_name TEXT,
          vehicle_brand TEXT,
          vehicle_model TEXT,
          vehicle_year INTEGER,
          email TEXT,
          phone TEXT,
          damage_description TEXT,
          photo_count INTEGER DEFAULT 0,
          form_progress TEXT,
          cancellation_reason TEXT,
          cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Paula - Visitas parciales/canceladas
      await client.query(`
        CREATE TABLE IF NOT EXISTS paula_partial_visits (
          user_phone TEXT PRIMARY KEY,
          property_code TEXT NOT NULL,
          property_name TEXT,
          property_address TEXT,
          date DATE,
          start_time TEXT,
          client_name TEXT,
          client_email TEXT,
          client_phone TEXT,
          form_progress TEXT,
          cancellation_reason TEXT,
          cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // ===================================================================
      // TABLA UNIFICADA DE FORMULARIOS: Sistema multi-agente
      // Reemplaza partial_forms, pending_confirmations parcialmente
      // ===================================================================
      await client.query(`
        CREATE TABLE IF NOT EXISTS agent_forms (
          user_phone TEXT NOT NULL,
          agent_type TEXT NOT NULL,
          form_data JSONB NOT NULL,
          form_progress TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          cancelled_at TIMESTAMP,
          PRIMARY KEY (user_phone, agent_type),
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_agent_forms_active 
        ON agent_forms(user_phone, is_active)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_agent_forms_expires 
        ON agent_forms(expires_at) WHERE expires_at IS NOT NULL
      `);

      // Tabla de formularios parciales guardados (LEGACY - mantener para migración)
      await client.query(`
        CREATE TABLE IF NOT EXISTS partial_forms (
          user_phone TEXT PRIMARY KEY,
          form_data TEXT NOT NULL,
          form_type TEXT,
          cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number)
        )
      `);

      // Tabla de historial de conversaciones (LEGACY - se mantiene como respaldo)
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

      // ===================================================================
      // TABLAS DE LEADS: Sistema de captura para agentes especializados
      // ===================================================================

      // Tabla de leads de seguros (Adriana - SegPopular)
      await client.query(`
        CREATE TABLE IF NOT EXISTS insurance_leads (
          id TEXT PRIMARY KEY,
          quote_code TEXT UNIQUE NOT NULL,
          user_phone TEXT NOT NULL,
          agent_name TEXT DEFAULT 'ADRIANA',
          insurance_type TEXT DEFAULT 'Seguro para Vehículos livianos',
          city TEXT,
          commercial_value DECIMAL(10,2),
          plate TEXT,
          vehicle_brand TEXT,
          vehicle_model TEXT,
          vehicle_year INTEGER,
          motor TEXT,
          chasis TEXT,
          origin_country TEXT,
          license_type TEXT,
          license_expiry DATE,
          client_name TEXT,
          cedula TEXT,
          email TEXT,
          phone TEXT,
          matricula_images JSONB DEFAULT '[]'::jsonb,
          licencia_images JSONB DEFAULT '[]'::jsonb,
          quoted_premium DECIMAL(10,2),
          premium_breakdown JSONB DEFAULT '{}'::jsonb,
          competitor_quotes JSONB DEFAULT '[]'::jsonb,
          competitor_quote_amount DECIMAL(10,2),
          competitor_insurer TEXT,
          kyc_cedula TEXT,
          kyc_matricula TEXT,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'rejected', 'cancelled')),
          assigned_to TEXT,
          notes TEXT,
          quote_sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Tabla de cotizaciones de colisiones (Axel - PaintBull)
      await client.query(`
        CREATE TABLE IF NOT EXISTS collision_quotes (
          id TEXT PRIMARY KEY,
          quote_code TEXT UNIQUE,
          user_phone TEXT NOT NULL,
          damage_type TEXT NOT NULL,
          client_name TEXT,
          vehicle_brand TEXT,
          vehicle_model TEXT,
          vehicle_year INTEGER,
          email TEXT,
          phone TEXT,
          damage_description TEXT,
          photo_urls JSONB DEFAULT '[]'::jsonb,
          damage_analysis JSONB,
          quote_details TEXT,
          price_min DECIMAL(10,2),
          price_max DECIMAL(10,2),
          currency TEXT DEFAULT 'USD',
          session_fingerprint TEXT,
          inspection_scheduled TIMESTAMP,
          inspection_completed BOOLEAN DEFAULT FALSE,
          quote_amount DECIMAL(10,2),
          quote_sent_at TIMESTAMP,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'inspecting', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled')),
          assigned_to TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // 🔄 Compatibilidad: agregar columnas si tabla existente no las tiene
      await client.query(`
        ALTER TABLE collision_quotes
        ADD COLUMN IF NOT EXISTS session_fingerprint TEXT;
      `);

      await client.query(`
        ALTER TABLE collision_quotes
        ADD COLUMN IF NOT EXISTS quote_code TEXT;
      `);

      await client.query(`
        ALTER TABLE collision_quotes
        ADD COLUMN IF NOT EXISTS damage_analysis JSONB;
      `);

      await client.query(`
        ALTER TABLE collision_quotes
        ADD COLUMN IF NOT EXISTS quote_details TEXT;
      `);

      await client.query(`
        ALTER TABLE collision_quotes
        ADD COLUMN IF NOT EXISTS price_min DECIMAL(10,2);
      `);

      await client.query(`
        ALTER TABLE collision_quotes
        ADD COLUMN IF NOT EXISTS price_max DECIMAL(10,2);
      `);

      await client.query(`
        ALTER TABLE collision_quotes
        ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
      `);

      // 🔔 Columnas de recordatorios automáticos (Axel follow-up 24h + 7d)
      await client.query(`
        ALTER TABLE collision_quotes
        ADD COLUMN IF NOT EXISTS reminder_1_sent_at TIMESTAMP;
      `);

      await client.query(`
        ALTER TABLE collision_quotes
        ADD COLUMN IF NOT EXISTS reminder_2_sent_at TIMESTAMP;
      `);

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_collision_quotes_quote_code
        ON collision_quotes(quote_code)
        WHERE quote_code IS NOT NULL;
      `);

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_collision_quotes_fingerprint
        ON collision_quotes(session_fingerprint)
        WHERE session_fingerprint IS NOT NULL;
      `);

      // 📸 Tabla de sesiones de fotos AXEL (backup y recuperación)
      // Nota: Sin FK a users - AXEL puede recibir fotos de usuarios nuevos
      await client.query(`
        CREATE TABLE IF NOT EXISTS axel_photo_sessions (
          user_phone TEXT PRIMARY KEY,
          photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
          photo_count INTEGER DEFAULT 0,
          session_status TEXT DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'expired')),
          quote_code TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_photo_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 days')
        )
      `);

      // Tabla de leads de marketing (Enzo - MarketingLab)
      await client.query(`
        CREATE TABLE IF NOT EXISTS marketing_leads (
          id TEXT PRIMARY KEY,
          project_code TEXT UNIQUE NOT NULL,
          user_phone TEXT NOT NULL,
          project_type TEXT NOT NULL,
          company TEXT,
          client_name TEXT,
          email TEXT,
          phone TEXT,
          budget_range TEXT,
          urgency TEXT,
          description TEXT,
          meeting_scheduled TIMESTAMP,
          meeting_completed BOOLEAN DEFAULT FALSE,
          proposal_sent_at TIMESTAMP,
          proposal_amount DECIMAL(10,2),
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'meeting_scheduled', 'proposal_sent', 'negotiating', 'accepted', 'rejected', 'cancelled')),
          assigned_to TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);
      
      // Agregar project_code si no existe (migración)
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'marketing_leads' AND column_name = 'project_code'
          ) THEN
            ALTER TABLE marketing_leads ADD COLUMN project_code TEXT UNIQUE;
          END IF;
        END $$;
      `);

      // Tabla de leads legal/contable (Gabi - GR Consulting) 🆕
      await client.query(`
        CREATE TABLE IF NOT EXISTS legal_leads (
          id TEXT PRIMARY KEY,
          consultation_code TEXT UNIQUE NOT NULL,
          user_phone TEXT NOT NULL,
          consultation_type TEXT NOT NULL CHECK (consultation_type IN ('Contabilidad', 'Legal', 'RRHH', 'Fiscal', 'Otro')),
          company TEXT,
          ruc TEXT,
          client_name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          description TEXT,
          urgency TEXT DEFAULT 'Normal' CHECK (urgency IN ('Urgente', 'Normal', 'Planificación')),
          meeting_scheduled TIMESTAMP,
          meeting_completed BOOLEAN DEFAULT FALSE,
          quote_sent_at TIMESTAMP,
          quote_amount DECIMAL(10,2),
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'meeting_scheduled', 'quote_sent', 'negotiating', 'service_in_progress', 'completed', 'cancelled')),
          assigned_to TEXT DEFAULT 'Gabi',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Tabla de leads inmobiliarios (Paula - PropElite)
      await client.query(`
        CREATE TABLE IF NOT EXISTS real_estate_leads (
          id TEXT PRIMARY KEY,
          user_phone TEXT NOT NULL,
          operation_type TEXT NOT NULL,
          property_type TEXT,
          preferred_zone TEXT,
          budget_range TEXT,
          client_name TEXT,
          email TEXT,
          phone TEXT,
          requirements JSONB DEFAULT '{}'::jsonb,
          properties_shown JSONB DEFAULT '[]'::jsonb,
          viewing_scheduled TIMESTAMP,
          viewing_completed BOOLEAN DEFAULT FALSE,
          offer_made BOOLEAN DEFAULT FALSE,
          offer_amount DECIMAL(10,2),
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'searching', 'viewing_scheduled', 'negotiating', 'offer_made', 'accepted', 'rejected', 'cancelled')),
          assigned_to TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Tabla de visitas a propiedades (Paula - PropElite)
      await client.query(`
        CREATE TABLE IF NOT EXISTS property_visits (
          id TEXT PRIMARY KEY,
          user_phone TEXT NOT NULL,
          property_code TEXT NOT NULL,
          property_name TEXT NOT NULL,
          property_address TEXT NOT NULL,
          date DATE NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          duration_minutes INTEGER DEFAULT 60,
          client_name TEXT NOT NULL,
          client_email TEXT,
          client_phone TEXT,
          status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
          calendar_event_id TEXT,
          cancellation_reason TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          confirmed_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Tabla de leads de membresías (Aluna - Coworkia Internal)
      await client.query(`
        CREATE TABLE IF NOT EXISTS membership_leads (
          id TEXT PRIMARY KEY,
          user_phone TEXT NOT NULL,
          membership_type TEXT NOT NULL,
          start_date TEXT,
          client_name TEXT,
          email TEXT,
          phone TEXT,
          special_requirements TEXT,
          company_name TEXT,
          tour_scheduled TIMESTAMP,
          tour_completed BOOLEAN DEFAULT FALSE,
          membership_activated BOOLEAN DEFAULT FALSE,
          activation_date TIMESTAMP,
          monthly_fee DECIMAL(10,2),
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending_payment', 'tour_scheduled', 'negotiating', 'accepted', 'active', 'cancelled', 'expired')),
          assigned_to TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Tabla de pagos de membresías (VisionAI - 20 parámetros)
      await client.query(`
        CREATE TABLE IF NOT EXISTS membership_payments (
          id TEXT PRIMARY KEY,
          membership_lead_id TEXT NOT NULL,
          user_phone TEXT NOT NULL,
          
          -- PARÁMETROS CRÍTICOS (OBLIGATORIOS)
          amount DECIMAL(10,2) NOT NULL,
          transaction_date DATE NOT NULL,
          transaction_time TIME,
          transaction_number TEXT NOT NULL,
          payment_method TEXT NOT NULL,
          
          -- PARÁMETROS IMPORTANTES
          bank_sender TEXT,
          bank_receiver TEXT,
          account_number_destination TEXT,
          account_number_source TEXT,
          account_holder_source TEXT,
          authorization_number TEXT,
          receipt_number TEXT,
          
          -- PARÁMETROS ADICIONALES
          currency TEXT DEFAULT 'USD',
          transaction_description TEXT,
          transaction_status TEXT DEFAULT 'approved',
          payment_channel TEXT,
          card_type TEXT,
          card_last_four TEXT,
          transaction_fee DECIMAL(10,2) DEFAULT 0,
          
          -- METADATA DE ANÁLISIS
          confidence_score INTEGER,
          image_url TEXT,
          raw_vision_data JSONB,
          validation_warnings JSONB,
          
          -- ESTADO DE PROCESAMIENTO
          status TEXT DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected', 'flagged', 'manual_review')),
          verification_method TEXT DEFAULT 'vision_ai',
          verified_by TEXT,
          verified_at TIMESTAMP,
          rejection_reason TEXT,
          
          -- AUDITORÍA
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP,
          
          FOREIGN KEY (membership_lead_id) REFERENCES membership_leads(id) ON DELETE CASCADE,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Tabla de pagos de reservas (mismo esquema para Aurora)
      await client.query(`
        CREATE TABLE IF NOT EXISTS reservation_payments (
          id TEXT PRIMARY KEY,
          reservation_id TEXT NOT NULL,
          user_phone TEXT NOT NULL,
          
          -- Mismos campos que membership_payments
          amount DECIMAL(10,2) NOT NULL,
          transaction_date DATE NOT NULL,
          transaction_time TIME,
          transaction_number TEXT NOT NULL,
          payment_method TEXT NOT NULL,
          bank_sender TEXT,
          bank_receiver TEXT,
          account_number_destination TEXT,
          account_number_source TEXT,
          account_holder_source TEXT,
          authorization_number TEXT,
          receipt_number TEXT,
          currency TEXT DEFAULT 'USD',
          transaction_description TEXT,
          transaction_status TEXT DEFAULT 'approved',
          payment_channel TEXT,
          card_type TEXT,
          card_last_four TEXT,
          transaction_fee DECIMAL(10,2) DEFAULT 0,
          confidence_score INTEGER,
          image_url TEXT,
          raw_vision_data JSONB,
          validation_warnings JSONB,
          status TEXT DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected', 'flagged', 'manual_review')),
          verification_method TEXT DEFAULT 'vision_ai',
          verified_by TEXT,
          verified_at TIMESTAMP,
          rejection_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP,
          
          FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Crear índice único para evitar duplicados por transaction_number
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_payments_transaction_unique 
        ON membership_payments(transaction_number);
        
        CREATE UNIQUE INDEX IF NOT EXISTS idx_reservation_payments_transaction_unique 
        ON reservation_payments(transaction_number);
      `);

      // ===================================================================
      // NUEVAS TABLAS: Sistema Unificado de Conversaciones Multi-Agente
      // ===================================================================

      // Tabla de conversaciones estructuradas por tema/contexto
      await client.query(`
        CREATE TABLE IF NOT EXISTS agent_conversations (
          id SERIAL PRIMARY KEY,
          user_phone TEXT NOT NULL,
          agent TEXT NOT NULL,
          conversation_topic TEXT,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          parent_message_id INTEGER,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE,
          FOREIGN KEY (parent_message_id) REFERENCES agent_conversations(id) ON DELETE SET NULL
        )
      `);

      // Tabla de archivos adjuntos (imágenes, PDFs)
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversation_files (
          id SERIAL PRIMARY KEY,
          message_id INTEGER NOT NULL,
          user_phone TEXT NOT NULL,
          agent TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_url TEXT,
          file_data TEXT,
          processed BOOLEAN DEFAULT FALSE,
          analysis_result JSONB,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (message_id) REFERENCES agent_conversations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Tabla de tracking de temas activos
      await client.query(`
        CREATE TABLE IF NOT EXISTS active_topics (
          user_phone TEXT NOT NULL,
          agent TEXT NOT NULL,
          topic TEXT NOT NULL,
          session_id TEXT NOT NULL,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
          last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          context_summary TEXT,
          
          PRIMARY KEY (user_phone, agent, topic),
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
      `);

      // Agregar columnas nuevas a users si no existen
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'active_agents'
          ) THEN
            ALTER TABLE users ADD COLUMN active_agents JSONB DEFAULT '[]'::jsonb;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'context_preferences'
          ) THEN
            ALTER TABLE users ADD COLUMN context_preferences JSONB DEFAULT '{}'::jsonb;
          END IF;
        END $$;
      `);

      // Agregar columnas de tracking de automatizaciones e interacciones a membership_leads
      await client.query(`
        DO $$ 
        BEGIN
          -- Campos de automatizaciones
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'membership_leads' AND column_name = 'membership_code'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN membership_code TEXT;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'membership_leads' AND column_name = 'followup_24h_sent_at'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN followup_24h_sent_at TIMESTAMP;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'membership_leads' AND column_name = 'followup_3d_sent_at'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN followup_3d_sent_at TIMESTAMP;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'membership_leads' AND column_name = 'automation_d1_sent'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN automation_d1_sent BOOLEAN DEFAULT FALSE;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'membership_leads' AND column_name = 'automation_d3_sent'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN automation_d3_sent BOOLEAN DEFAULT FALSE;
          END IF;
          
          -- Campos de interacción con cliente
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'membership_leads' AND column_name = 'last_interaction_at'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN last_interaction_at TIMESTAMP;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'membership_leads' AND column_name = 'client_response_at'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN client_response_at TIMESTAMP;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'membership_leads' AND column_name = 'client_whatsapp_reply'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN client_whatsapp_reply BOOLEAN DEFAULT FALSE;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'membership_leads' AND column_name = 'client_email_reply'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN client_email_reply BOOLEAN DEFAULT FALSE;
          END IF;
          
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'membership_leads' AND column_name = 'quote_sent_at'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN quote_sent_at TIMESTAMP;
          END IF;
        END $$;
      `);

      // Índices para mejorar performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_phone);
        CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
        CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
        CREATE INDEX IF NOT EXISTS idx_reservations_slot ON reservations(date, start_time, end_time, service_type);
        CREATE INDEX IF NOT EXISTS idx_pending_confirmations_expires ON pending_confirmations(expires_at);
        CREATE INDEX IF NOT EXISTS idx_pending_confirmations_agent ON pending_confirmations(agent_type);
        CREATE INDEX IF NOT EXISTS idx_reservation_state_just_confirmed ON reservation_state(just_confirmed_until);
        
        -- Índices para tablas de formularios parciales especializadas
        CREATE INDEX IF NOT EXISTS idx_aurora_partial_expires ON aurora_partial_reservations(expires_at);
        CREATE INDEX IF NOT EXISTS idx_aurora_partial_cancelled ON aurora_partial_reservations(cancelled_at);
        CREATE INDEX IF NOT EXISTS idx_aluna_partial_expires ON aluna_partial_memberships(expires_at);
        CREATE INDEX IF NOT EXISTS idx_aluna_partial_cancelled ON aluna_partial_memberships(cancelled_at);
        CREATE INDEX IF NOT EXISTS idx_axel_partial_expires ON axel_partial_quotes(expires_at);
        CREATE INDEX IF NOT EXISTS idx_axel_partial_cancelled ON axel_partial_quotes(cancelled_at);
        CREATE INDEX IF NOT EXISTS idx_paula_partial_expires ON paula_partial_visits(expires_at);
        CREATE INDEX IF NOT EXISTS idx_paula_partial_cancelled ON paula_partial_visits(cancelled_at);
        
        -- Índice legacy (mantener para migración)
        CREATE INDEX IF NOT EXISTS idx_partial_forms_cancelled ON partial_forms(cancelled_at);
        
        CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_phone);
        CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_conversation_user ON conversation_history(user_phone);
        
        -- Índices para tablas de leads
        CREATE INDEX IF NOT EXISTS idx_insurance_leads_user ON insurance_leads(user_phone);
        CREATE INDEX IF NOT EXISTS idx_insurance_leads_status ON insurance_leads(status);
        CREATE INDEX IF NOT EXISTS idx_insurance_leads_created ON insurance_leads(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_insurance_leads_type ON insurance_leads(insurance_type);
        
        CREATE INDEX IF NOT EXISTS idx_collision_quotes_user ON collision_quotes(user_phone);
        CREATE INDEX IF NOT EXISTS idx_collision_quotes_status ON collision_quotes(status);
        CREATE INDEX IF NOT EXISTS idx_collision_quotes_created ON collision_quotes(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_collision_quotes_inspection ON collision_quotes(inspection_scheduled);
        
        CREATE INDEX IF NOT EXISTS idx_marketing_leads_user ON marketing_leads(user_phone);
        CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON marketing_leads(status);
        CREATE INDEX IF NOT EXISTS idx_marketing_leads_created ON marketing_leads(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_marketing_leads_meeting ON marketing_leads(meeting_scheduled);
        
        CREATE INDEX IF NOT EXISTS idx_real_estate_leads_user ON real_estate_leads(user_phone);
        CREATE INDEX IF NOT EXISTS idx_real_estate_leads_status ON real_estate_leads(status);
        CREATE INDEX IF NOT EXISTS idx_real_estate_leads_created ON real_estate_leads(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_real_estate_leads_operation ON real_estate_leads(operation_type);
        CREATE INDEX IF NOT EXISTS idx_real_estate_leads_viewing ON real_estate_leads(viewing_scheduled);
        
        CREATE INDEX IF NOT EXISTS idx_membership_leads_user ON membership_leads(user_phone);
        CREATE INDEX IF NOT EXISTS idx_membership_leads_status ON membership_leads(status);
        CREATE INDEX IF NOT EXISTS idx_membership_leads_created ON membership_leads(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_membership_leads_tour ON membership_leads(tour_scheduled);
      `); // end large index block

      // Migration: add proforma columns to membership_leads (safe, idempotent)
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'membership_leads' AND column_name = 'membership_code'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN membership_code TEXT;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'membership_leads' AND column_name = 'quote_sent_at'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN quote_sent_at TIMESTAMP;
          END IF;
        END $$;
      `);

      // Migration: add renewal reminder columns to membership_leads (safe, idempotent)
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'membership_leads' AND column_name = 'renewal_reminder_1_sent_at'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN renewal_reminder_1_sent_at TIMESTAMP;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'membership_leads' AND column_name = 'renewal_reminder_2_sent_at'
          ) THEN
            ALTER TABLE membership_leads ADD COLUMN renewal_reminder_2_sent_at TIMESTAMP;
          END IF;
        END $$;
      `);

      // Migration: add rebook reminder column to reservations (safe, idempotent)
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reservations' AND column_name = 'rebook_reminder_sent_at'
          ) THEN
            ALTER TABLE reservations ADD COLUMN rebook_reminder_sent_at TIMESTAMP;
          END IF;
        END $$;
      `);

      // Migration: Aurora follow-up +1h post-reserva
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reservations' AND column_name = 'followup_1h_sent_at'
          ) THEN
            ALTER TABLE reservations ADD COLUMN followup_1h_sent_at TIMESTAMP;
          END IF;
        END $$;
      `);

      // Migration: Enzo follow-up columns en marketing_leads
      await client.query(`ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS followup_d1_sent_at TIMESTAMP`).catch(() => {});
      await client.query(`ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS followup_d3_sent_at TIMESTAMP`).catch(() => {});
      await client.query(`ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS followup_d7_sent_at TIMESTAMP`).catch(() => {});

      // Tabla de cotizaciones Adriana — formulario conversacional WA
      await client.query(`
        CREATE TABLE IF NOT EXISTS adriana_quote_leads (
          id SERIAL PRIMARY KEY,
          phone VARCHAR(20) NOT NULL UNIQUE,
          status VARCHAR(50) DEFAULT 'gathering_vehicle',
          client_name VARCHAR(255),
          client_email VARCHAR(255),
          vehicle_data JSONB DEFAULT '{}'::jsonb,
          id_card_data JSONB DEFAULT '{}'::jsonb,
          selected_coverage VARCHAR(20),
          premium_data JSONB DEFAULT '{}'::jsonb,
          quote_code VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(` -- resume index block placeholder
        
        -- Índices para tablas de pagos
        CREATE INDEX IF NOT EXISTS idx_membership_payments_lead ON membership_payments(membership_lead_id);
        CREATE INDEX IF NOT EXISTS idx_membership_payments_user ON membership_payments(user_phone);
        CREATE INDEX IF NOT EXISTS idx_membership_payments_date ON membership_payments(transaction_date DESC);
        CREATE INDEX IF NOT EXISTS idx_membership_payments_status ON membership_payments(status);
        CREATE INDEX IF NOT EXISTS idx_membership_payments_confidence ON membership_payments(confidence_score);
        
        CREATE INDEX IF NOT EXISTS idx_reservation_payments_reservation ON reservation_payments(reservation_id);
        CREATE INDEX IF NOT EXISTS idx_reservation_payments_user ON reservation_payments(user_phone);
        CREATE INDEX IF NOT EXISTS idx_reservation_payments_date ON reservation_payments(transaction_date DESC);
        CREATE INDEX IF NOT EXISTS idx_reservation_payments_status ON reservation_payments(status);
        
        -- Índices para nuevas tablas
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_agent ON agent_conversations(user_phone, agent);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_topic ON agent_conversations(conversation_topic);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_session ON agent_conversations(session_id);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_timestamp ON agent_conversations(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_agent_topic ON agent_conversations(user_phone, agent, conversation_topic);
        
        CREATE INDEX IF NOT EXISTS idx_conversation_files_message ON conversation_files(message_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_files_agent ON conversation_files(agent);
        CREATE INDEX IF NOT EXISTS idx_conversation_files_processed ON conversation_files(processed);
        
        CREATE INDEX IF NOT EXISTS idx_active_topics_user ON active_topics(user_phone);
        CREATE INDEX IF NOT EXISTS idx_active_topics_status ON active_topics(status);
        CREATE INDEX IF NOT EXISTS idx_active_topics_last_interaction ON active_topics(last_interaction DESC);
      `);

      // ===================================================================
      // TABLA: Códigos WiFi (integración portal cautivo Mac Mini)
      // Aurora genera un código por cada reserva pagada/gratuita
      // El Mac Mini sincroniza estos códigos cada 5 minutos via API
      // ===================================================================
      await client.query(`
        CREATE TABLE IF NOT EXISTS wifi_codes (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          reservation_id TEXT,
          user_phone TEXT NOT NULL,
          duration_hours INTEGER NOT NULL DEFAULT 2,
          valid_for_date DATE NOT NULL,
          status TEXT NOT NULL DEFAULT 'available'
            CHECK (status IN ('available', 'synced', 'used', 'expired', 'cancelled')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          synced_at TIMESTAMP,
          used_at TIMESTAMP,
          expires_at TIMESTAMP,
          FOREIGN KEY (user_phone) REFERENCES users(phone_number) ON DELETE CASCADE,
          FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_wifi_codes_reservation ON wifi_codes(reservation_id);
        CREATE INDEX IF NOT EXISTS idx_wifi_codes_user ON wifi_codes(user_phone);
        CREATE INDEX IF NOT EXISTS idx_wifi_codes_status ON wifi_codes(status);
        CREATE INDEX IF NOT EXISTS idx_wifi_codes_date ON wifi_codes(valid_for_date);
        CREATE INDEX IF NOT EXISTS idx_wifi_codes_available ON wifi_codes(status, valid_for_date)
          WHERE status IN ('available', 'synced');
      `);

      // Migración: columna membership_code para vincular códigos a membresías
      await client.query(`
        ALTER TABLE wifi_codes ADD COLUMN IF NOT EXISTS membership_code TEXT;
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_wifi_codes_membership ON wifi_codes(membership_code)
          WHERE membership_code IS NOT NULL;
      `).catch(() => {/* índice puede ya existir */});

      // ===================================================================
      // TABLA: Seguimiento de prospectos Aluna (sistema de follow-up 24h/3d)
      // Registra TODOS los usuarios que consultaron sobre membresías,
      // independientemente de si completaron el formulario.
      // ===================================================================
      await client.query(`
        CREATE TABLE IF NOT EXISTS aluna_prospect_followups (
          user_phone TEXT PRIMARY KEY,
          user_name TEXT,
          membership_type TEXT,
          membership_code TEXT,
          email TEXT,
          interest_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          followup_24h_sent_at TIMESTAMP,
          followup_24h_email_sent_at TIMESTAMP,
          followup_3d_sent_at TIMESTAMP,
          followup_3d_email_sent_at TIMESTAMP,
          converted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Migraciones sin romper: añadir columnas si la tabla ya existe
      await client.query(`ALTER TABLE aluna_prospect_followups ADD COLUMN IF NOT EXISTS membership_code TEXT`).catch(()=>{});
      await client.query(`ALTER TABLE aluna_prospect_followups ADD COLUMN IF NOT EXISTS email TEXT`).catch(()=>{});
      await client.query(`ALTER TABLE aluna_prospect_followups ADD COLUMN IF NOT EXISTS followup_24h_email_sent_at TIMESTAMP`).catch(()=>{});
      await client.query(`ALTER TABLE aluna_prospect_followups ADD COLUMN IF NOT EXISTS followup_3d_email_sent_at TIMESTAMP`).catch(()=>{});
      // Tracking de respuestas del cliente (20 Mar 2026)
      await client.query(`ALTER TABLE aluna_prospect_followups ADD COLUMN IF NOT EXISTS client_response_at TIMESTAMP`).catch(()=>{});
      await client.query(`ALTER TABLE aluna_prospect_followups ADD COLUMN IF NOT EXISTS client_whatsapp_reply BOOLEAN DEFAULT FALSE`).catch(()=>{});

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_aluna_prospects_followup_24h
          ON aluna_prospect_followups(interest_at)
          WHERE followup_24h_sent_at IS NULL AND converted_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_aluna_prospects_followup_3d
          ON aluna_prospect_followups(followup_24h_sent_at)
          WHERE followup_3d_sent_at IS NULL AND converted_at IS NULL;
      `);

      // ===================================================================
      // TABLA: Cotizaciones del Big Boss (boss_quotes)
      // Registra cada cotización enviada por orden directa del jefe desde WA.
      // Cubre GABI, ENZO, PAULA, AXEL y ALUNA boss commands.
      // ===================================================================
      await client.query(`
        CREATE TABLE IF NOT EXISTS boss_quotes (
          id           SERIAL PRIMARY KEY,
          agent        VARCHAR(20) NOT NULL,
          client_name  VARCHAR(200),
          client_email VARCHAR(200),
          client_phone VARCHAR(50),
          company_name VARCHAR(200),
          service_info VARCHAR(300),
          amount_min   DECIMAL(12,2),
          amount_max   DECIMAL(12,2),
          quote_code   VARCHAR(100),
          email_sent   BOOLEAN DEFAULT TRUE,
          quoted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_boss_quotes_agent     ON boss_quotes(agent);
        CREATE INDEX IF NOT EXISTS idx_boss_quotes_email     ON boss_quotes(client_email);
        CREATE INDEX IF NOT EXISTS idx_boss_quotes_quoted_at ON boss_quotes(quoted_at DESC);
      `);

      // =================================================================== 
      // TABLA: Campañas masivas de Aluna (campaigns)
      // Permite crear y enviar mensajes personalizados a múltiples leads
      // con filtros de audiencia (status, fecha, etc.)
      // ===================================================================
      await client.query(`
        CREATE TABLE IF NOT EXISTS campaigns (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          message_template TEXT NOT NULL,
          target_filter TEXT NOT NULL,
          channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sent_at TIMESTAMP,
          sent_count INTEGER DEFAULT 0,
          status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed'))
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
        CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_campaigns_sent ON campaigns(sent_at DESC);
      `);

      // Migration: Adriana KYC + competitor_quotes columns (safe, idempotent)
      await client.query(`ALTER TABLE insurance_leads ADD COLUMN IF NOT EXISTS competitor_quotes JSONB DEFAULT '[]'::jsonb`).catch(()=>{});
      await client.query(`ALTER TABLE insurance_leads ADD COLUMN IF NOT EXISTS competitor_quote_amount DECIMAL(10,2)`).catch(()=>{});
      await client.query(`ALTER TABLE insurance_leads ADD COLUMN IF NOT EXISTS competitor_insurer TEXT`).catch(()=>{});
      await client.query(`ALTER TABLE insurance_leads ADD COLUMN IF NOT EXISTS kyc_cedula TEXT`).catch(()=>{});
      await client.query(`ALTER TABLE insurance_leads ADD COLUMN IF NOT EXISTS kyc_matricula TEXT`).catch(()=>{});

      // Migration: fix membership_leads status CHECK constraint to include 'quoted' (safe, idempotent)
      await client.query(`
        DO $$ BEGIN
          BEGIN
            ALTER TABLE membership_leads DROP CONSTRAINT IF EXISTS membership_leads_status_check;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
          BEGIN
            ALTER TABLE membership_leads ADD CONSTRAINT membership_leads_status_check
              CHECK (status IN ('pending', 'pending_payment', 'tour_scheduled', 'negotiating',
                                'accepted', 'active', 'cancelled', 'expired', 'quoted'));
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END $$;
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
   * 
   * ⚠️ CRÍTICO: En Heroku NO cerramos el pool
   * - Heroku mata el proceso en SIGTERM sin esperar graceful shutdown
   * - Cerrar pool causa "Cannot use a pool after calling end" en restarts
   * - El pool se limpia automáticamente cuando el proceso termina
   * 
   * Este método existe solo para compatibilidad de interfaz.
   */
  async close() {
    if (this.pool) {
      // NO ejecutar pool.end() - causa crashes en Heroku
      console.log('[POSTGRES] ℹ️ close() llamado - ignorando (Heroku no requiere graceful pool shutdown)');
      // await this.pool.end(); // DESHABILITADO - Ver comentario arriba
    }
  }
  /**
   * 🔁 Ejecutar operaciones dentro de una transacción
   */
  async transaction(work) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[POSTGRES TRANSACTION] Rollback ejecutado:', error.message);
      throw error;
    } finally {
      client.release();
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
      const _t0 = Date.now();
      const result = await this.pool.query(pgSql, params);
      const _dur = Date.now() - _t0;
      const _slow = _dur > 500;
      metricsCollector.recordQuery(true, _dur, _slow);
      if (_slow) console.warn(`[POSTGRES SLOW] run() ${_dur}ms — ${sql.slice(0, 80)}`);
      return {
        changes: result.rowCount || 0,
        lastID: result.rows[0]?.id || null
      };
    } catch (error) {
      // Categorizar errores comunes de PostgreSQL
      if (error.code === '23505') {
        throw new Error(`Duplicate key violation: ${error.detail || error.message}`);
      } else if (error.code === '23503') {
        throw new Error(`Foreign key violation: ${error.detail || error.message}`);
      } else if (error.code === '57014') {
        throw new Error('Query timeout exceeded 15s');
      } else if (error.code === '42P01') {
        throw new Error(`Table does not exist: ${error.message}`);
      }
      
      console.error('[POSTGRES ERROR] run() failed:', error.code, error.message);
      console.error('[POSTGRES ERROR] SQL:', sql);
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
      const isSlow = duration > 500;
      metricsCollector.recordQuery(true, duration, isSlow);
      if (isSlow) console.warn(`[POSTGRES SLOW] get() ${duration}ms — ${sql.slice(0, 80)}`);
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
      const isSlow = duration > 500;
      metricsCollector.recordQuery(true, duration, isSlow);
      if (isSlow) console.warn(`[POSTGRES SLOW] all() ${duration}ms — ${sql.slice(0, 80)}`);
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

  /**
   * 💾 Guardar confirmación pendiente
   */
  async savePendingConfirmation(userId, reservationData) {
    await this.initialize();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expira en 10 minutos
    
    try {
      await this.run(
        `INSERT INTO pending_confirmations (user_phone, reservation_data, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_phone) 
         DO UPDATE SET reservation_data = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP`,
        [userId, JSON.stringify(reservationData), expiresAt.toISOString()]
      );
      console.log('[POSTGRES] ✅ Confirmación pendiente guardada para:', userId);
      return true;
    } catch (error) {
      console.error('[POSTGRES] ❌ Error guardando confirmación pendiente:', error);
      throw error;
    }
  }

  /**
   * 📖 Obtener confirmación pendiente
   */
  async getPendingConfirmation(userId) {
    await this.initialize();
    
    try {
      const row = await this.get(
        `SELECT reservation_data, expires_at FROM pending_confirmations WHERE user_phone = ?`,
        [userId]
      );
      
      if (!row) {
        return null;
      }

      // Verificar si expiró
      const expiresAt = new Date(row.expires_at);
      if (expiresAt < new Date()) {
        // Expirada, eliminar
        await this.clearPendingConfirmation(userId);
        console.log('[POSTGRES] ⏰ Confirmación pendiente expirada y eliminada:', userId);
        return null;
      }

      return JSON.parse(row.reservation_data);
    } catch (error) {
      console.error('[POSTGRES] ❌ Error obteniendo confirmación pendiente:', error);
      return null;
    }
  }

  /**
   * 🗑️ Limpiar confirmación pendiente
   */
  async clearPendingConfirmation(userId) {
    await this.initialize();
    
    try {
      await this.run(
        `DELETE FROM pending_confirmations WHERE user_phone = ?`,
        [userId]
      );
      console.log('[POSTGRES] 🗑️ Confirmación pendiente eliminada para:', userId);
      return true;
    } catch (error) {
      console.error('[POSTGRES] ❌ Error eliminando confirmación pendiente:', error);
      return false;
    }
  }
}

// Instancia singleton
const postgresAdapter = new PostgresAdapter();

export default postgresAdapter;
export { PostgresAdapter };
