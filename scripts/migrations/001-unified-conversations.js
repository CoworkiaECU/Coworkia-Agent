/**
 * 🔄 MIGRACIÓN: Sistema Unificado de Conversaciones Multi-Agente
 * 
 * Crea las nuevas tablas para la arquitectura de conversaciones unificada:
 * - agent_conversations: Conversaciones estructuradas por tema/contexto
 * - conversation_files: Archivos adjuntos (imágenes, PDFs)
 * - active_topics: Tracking de temas activos por usuario
 * 
 * ⚠️ IMPORTANTE: Esta migración NO elimina tablas existentes
 * Las tablas 'interactions' y 'conversation_history' se mantienen como respaldo
 * 
 * @version 1.0.0
 * @date 2026-01-11
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('\n🚀 Iniciando migración: Sistema Unificado de Conversaciones\n');
    
    await client.query('BEGIN');
    
    // ===================================================================
    // TABLA 1: agent_conversations
    // Almacena todas las conversaciones estructuradas por tema/contexto
    // ===================================================================
    
    console.log('📝 Creando tabla: agent_conversations...');
    
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
    
    console.log('✅ Tabla agent_conversations creada');
    
    // ===================================================================
    // TABLA 2: conversation_files
    // Almacena archivos adjuntos (imágenes, PDFs) de todos los agentes
    // ===================================================================
    
    console.log('📝 Creando tabla: conversation_files...');
    
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
    
    console.log('✅ Tabla conversation_files creada');
    
    // ===================================================================
    // TABLA 3: active_topics
    // Tracking de temas activos por usuario y agente
    // ===================================================================
    
    console.log('📝 Creando tabla: active_topics...');
    
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
    
    console.log('✅ Tabla active_topics creada');
    
    // ===================================================================
    // ÍNDICES PARA PERFORMANCE
    // ===================================================================
    
    console.log('📝 Creando índices para optimización...');
    
    await client.query(`
      -- Índices para agent_conversations
      CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_agent 
        ON agent_conversations(user_phone, agent);
      
      CREATE INDEX IF NOT EXISTS idx_agent_conversations_topic 
        ON agent_conversations(conversation_topic);
      
      CREATE INDEX IF NOT EXISTS idx_agent_conversations_session 
        ON agent_conversations(session_id);
      
      CREATE INDEX IF NOT EXISTS idx_agent_conversations_timestamp 
        ON agent_conversations(timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_agent_topic 
        ON agent_conversations(user_phone, agent, conversation_topic);
      
      -- Índices para conversation_files
      CREATE INDEX IF NOT EXISTS idx_conversation_files_message 
        ON conversation_files(message_id);
      
      CREATE INDEX IF NOT EXISTS idx_conversation_files_user 
        ON conversation_files(user_phone);
      
      CREATE INDEX IF NOT EXISTS idx_conversation_files_agent 
        ON conversation_files(agent);
      
      CREATE INDEX IF NOT EXISTS idx_conversation_files_type 
        ON conversation_files(file_type);
      
      CREATE INDEX IF NOT EXISTS idx_conversation_files_processed 
        ON conversation_files(processed);
      
      -- Índices para active_topics
      CREATE INDEX IF NOT EXISTS idx_active_topics_user 
        ON active_topics(user_phone);
      
      CREATE INDEX IF NOT EXISTS idx_active_topics_status 
        ON active_topics(status);
      
      CREATE INDEX IF NOT EXISTS idx_active_topics_last_interaction 
        ON active_topics(last_interaction DESC);
    `);
    
    console.log('✅ Índices creados exitosamente');
    
    // ===================================================================
    // MIGRACIÓN DE DATOS EXISTENTES (OPCIONAL)
    // Comenta esta sección si prefieres empezar desde cero
    // ===================================================================
    
    console.log('\n📊 Migrando datos existentes de interactions...');
    
    const countQuery = await client.query(
      'SELECT COUNT(*) as count FROM interactions'
    );
    const existingCount = parseInt(countQuery.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`   Encontrados ${existingCount} registros en 'interactions'`);
      console.log('   Migrando a agent_conversations...');
      
      // Migrar interactions a agent_conversations
      await client.query(`
        INSERT INTO agent_conversations (
          user_phone, agent, conversation_topic, session_id,
          role, content, metadata, timestamp
        )
        SELECT 
          user_phone,
          COALESCE(agent, 'aurora'),
          COALESCE(intent_reason, 'general'),
          COALESCE(meta::jsonb->>'session_id', gen_random_uuid()::text),
          CASE 
            WHEN output IS NOT NULL AND output != '' THEN 'assistant'
            WHEN input IS NOT NULL AND input != '' THEN 'user'
            ELSE 'system'
          END as role,
          COALESCE(output, input, '') as content,
          COALESCE(meta::jsonb, '{}'::jsonb),
          timestamp
        FROM interactions
        WHERE user_phone IS NOT NULL
        ON CONFLICT DO NOTHING
      `);
      
      const migratedQuery = await client.query(
        'SELECT COUNT(*) as count FROM agent_conversations'
      );
      const migratedCount = parseInt(migratedQuery.rows[0].count);
      
      console.log(`   ✅ Migrados ${migratedCount} mensajes a agent_conversations`);
    } else {
      console.log('   ℹ️  No hay datos para migrar');
    }
    
    // ===================================================================
    // ACTUALIZAR TABLA USERS - Agregar columna para múltiples agentes activos
    // ===================================================================
    
    console.log('\n📝 Actualizando tabla users...');
    
    await client.query(`
      DO $$ 
      BEGIN
        -- Agregar columna active_agents si no existe
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'active_agents'
        ) THEN
          ALTER TABLE users ADD COLUMN active_agents JSONB DEFAULT '[]'::jsonb;
          
          -- Migrar active_agent actual a active_agents
          UPDATE users 
          SET active_agents = jsonb_build_array(UPPER(COALESCE(active_agent, 'AURORA')))
          WHERE active_agents IS NULL OR active_agents = '[]'::jsonb;
          
          RAISE NOTICE 'Columna active_agents creada y migrada';
        END IF;
        
        -- Agregar columna context_preferences si no existe
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'context_preferences'
        ) THEN
          ALTER TABLE users ADD COLUMN context_preferences JSONB DEFAULT '{}'::jsonb;
          RAISE NOTICE 'Columna context_preferences creada';
        END IF;
      END $$;
    `);
    
    console.log('✅ Tabla users actualizada');
    
    // ===================================================================
    // COMMIT
    // ===================================================================
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Migración completada exitosamente!\n');
    console.log('📋 Resumen:');
    console.log('   ✅ agent_conversations - Conversaciones estructuradas por tema');
    console.log('   ✅ conversation_files - Archivos adjuntos (imágenes, PDFs)');
    console.log('   ✅ active_topics - Tracking de temas activos');
    console.log('   ✅ Índices optimizados para performance');
    console.log('   ✅ Datos migrados desde interactions');
    console.log('   ✅ users.active_agents y context_preferences agregados');
    console.log('\n💡 Las tablas antiguas (interactions, conversation_history) se mantienen como respaldo');
    console.log('   Puedes eliminarlas manualmente cuando confirmes que todo funciona correctamente.\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error en la migración:', error);
    console.error('   Todos los cambios han sido revertidos.\n');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar migración
runMigration()
  .then(() => {
    console.log('✅ Script de migración finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script de migración falló:', error);
    process.exit(1);
  });
