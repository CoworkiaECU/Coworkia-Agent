/**
 * 🔍 Extractor COMPLETO de logs de conversaciones con Axel
 * Busca en TODAS las tablas disponibles (nuevo sistema + legacy)
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

async function extractAllAxelLogs() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 BÚSQUEDA COMPLETA DE LOGS DE AXEL\n');
    console.log('════════════════════════════════════════════════════════════\n');
    
    // 1. Verificar qué tablas existen
    console.log('📋 Verificando tablas disponibles...\n');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('Tablas encontradas:', tables.rows.map(r => r.table_name).join(', '));
    console.log('\n════════════════════════════════════════════════════════════\n');
    
    // 2. Buscar en agent_conversations (sistema nuevo)
    console.log('📊 1. AGENT_CONVERSATIONS (Sistema Nuevo)\n');
    const agentConv = await client.query(`
      SELECT COUNT(*) as total,
             MIN(timestamp) as primera,
             MAX(timestamp) as ultima
      FROM agent_conversations
      WHERE agent = 'axel'
    `);
    
    if (agentConv.rows[0].total > 0) {
      console.log(`✅ Total registros: ${agentConv.rows[0].total}`);
      console.log(`   Primera conversación: ${agentConv.rows[0].primera}`);
      console.log(`   Última conversación: ${agentConv.rows[0].ultima}`);
      
      // Obtener últimas conversaciones
      const recent = await client.query(`
        SELECT 
          ac.id,
          ac.user_phone,
          ac.conversation_topic,
          ac.session_id,
          ac.role,
          ac.content,
          ac.metadata,
          ac.timestamp,
          u.name as user_name
        FROM agent_conversations ac
        LEFT JOIN users u ON ac.user_phone = u.phone_number
        WHERE ac.agent = 'axel'
        ORDER BY ac.timestamp DESC
        LIMIT 100
      `);
      
      console.log(`\n📝 Últimas ${recent.rows.length} conversaciones:\n`);
      printConversations(recent.rows);
    } else {
      console.log('❌ No hay registros en agent_conversations para Axel\n');
    }
    
    console.log('\n════════════════════════════════════════════════════════════\n');
    
    // 3. Buscar en interactions (sistema legacy)
    console.log('📊 2. INTERACTIONS (Sistema Legacy)\n');
    const interactions = await client.query(`
      SELECT COUNT(*) as total,
             MIN(timestamp) as primera,
             MAX(timestamp) as ultima
      FROM interactions
      WHERE agent = 'axel'
    `);
    
    if (interactions.rows[0].total > 0) {
      console.log(`✅ Total registros: ${interactions.rows[0].total}`);
      console.log(`   Primera interacción: ${interactions.rows[0].primera}`);
      console.log(`   Última interacción: ${interactions.rows[0].ultima}`);
      
      // Obtener últimas interacciones
      const recentInt = await client.query(`
        SELECT 
          i.*,
          u.name as user_name
        FROM interactions i
        LEFT JOIN users u ON i.user_phone = u.phone_number
        WHERE i.agent = 'axel'
        ORDER BY i.timestamp DESC
        LIMIT 100
      `);
      
      console.log(`\n📝 Últimas ${recentInt.rows.length} interacciones:\n`);
      printInteractions(recentInt.rows);
    } else {
      console.log('❌ No hay registros en interactions para Axel\n');
    }
    
    console.log('\n════════════════════════════════════════════════════════════\n');
    
    // 4. Buscar usuarios activos con Axel
    console.log('📊 3. USUARIOS CON ACTIVE_AGENT = AXEL\n');
    const activeUsers = await client.query(`
      SELECT 
        phone_number,
        name,
        email,
        active_agent,
        last_message_at
      FROM users
      WHERE active_agent = 'AXEL'
      ORDER BY last_message_at DESC
      LIMIT 20
    `);
    
    if (activeUsers.rows.length > 0) {
      console.log(`✅ ${activeUsers.rows.length} usuarios tienen a Axel como agente activo:\n`);
      activeUsers.rows.forEach((user, idx) => {
        console.log(`${idx + 1}. ${user.name || 'Sin nombre'} (${user.phone_number})`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Último mensaje: ${user.last_message_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No hay usuarios con Axel como agente activo\n');
    }
    
    console.log('\n════════════════════════════════════════════════════════════\n');
    
    // 5. Formularios parciales de Axel
    console.log('📊 4. PARTIAL_FORMS (Cotizaciones en proceso)\n');
    const partialForms = await client.query(`
      SELECT 
        pf.*,
        u.name as user_name
      FROM partial_forms pf
      LEFT JOIN users u ON pf.user_phone = u.phone_number
      WHERE pf.agent = 'axel'
      ORDER BY pf.updated_at DESC
      LIMIT 20
    `);
    
    if (partialForms.rows.length > 0) {
      console.log(`✅ ${partialForms.rows.length} cotizaciones en proceso:\n`);
      partialForms.rows.forEach((form, idx) => {
        console.log(`${idx + 1}. Usuario: ${form.user_name || form.user_phone}`);
        console.log(`   Contexto: ${form.context || 'N/A'}`);
        console.log(`   Form Data: ${JSON.stringify(form.form_data, null, 2)}`);
        console.log(`   Actualizado: ${form.updated_at}`);
        console.log('   ────────────────────────────────────────\n');
      });
    } else {
      console.log('❌ No hay formularios parciales de Axel\n');
    }
    
    console.log('\n════════════════════════════════════════════════════════════\n');
    
    // 6. Archivos/Imágenes
    console.log('📊 5. CONVERSATION_FILES (Imágenes y archivos)\n');
    const files = await client.query(`
      SELECT 
        cf.*,
        u.name as user_name
      FROM conversation_files cf
      LEFT JOIN users u ON cf.user_phone = u.phone_number
      WHERE cf.agent = 'axel'
      ORDER BY cf.uploaded_at DESC
      LIMIT 20
    `);
    
    if (files.rows.length > 0) {
      console.log(`✅ ${files.rows.length} archivos encontrados:\n`);
      files.rows.forEach((file, idx) => {
        console.log(`${idx + 1}. Tipo: ${file.file_type}`);
        console.log(`   Usuario: ${file.user_name || file.user_phone}`);
        console.log(`   URL: ${file.file_url || 'N/A'}`);
        console.log(`   Procesado: ${file.processed ? '✅' : '❌'}`);
        console.log(`   Subido: ${file.uploaded_at}`);
        console.log('   ────────────────────────────────────────\n');
      });
    } else {
      console.log('❌ No hay archivos de Axel\n');
    }
    
    console.log('\n════════════════════════════════════════════════════════════\n');
    
    // 7. Active Topics
    console.log('📊 6. ACTIVE_TOPICS (Temas activos)\n');
    const topics = await client.query(`
      SELECT *
      FROM active_topics
      WHERE agent = 'axel'
      ORDER BY last_interaction DESC
      LIMIT 20
    `);
    
    if (topics.rows.length > 0) {
      console.log(`✅ ${topics.rows.length} temas activos:\n`);
      topics.rows.forEach((topic, idx) => {
        console.log(`${idx + 1}. Usuario: ${topic.user_phone}`);
        console.log(`   Tema: ${topic.topic}`);
        console.log(`   Status: ${topic.status}`);
        console.log(`   Sesión: ${topic.session_id}`);
        console.log(`   Última interacción: ${topic.last_interaction}`);
        console.log('   ────────────────────────────────────────\n');
      });
    } else {
      console.log('❌ No hay temas activos de Axel\n');
    }
    
  } catch (error) {
    console.error('❌ Error extrayendo logs:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function printConversations(conversations) {
  let currentSession = null;
  let messageCount = 0;
  
  conversations.forEach((msg) => {
    if (currentSession !== msg.session_id) {
      if (currentSession !== null) {
        console.log('\n   ────────────────────────────────────────\n');
      }
      currentSession = msg.session_id;
      messageCount = 0;
      console.log(`   📋 SESIÓN: ${msg.session_id}`);
      console.log(`   👤 Usuario: ${msg.user_name || msg.user_phone}`);
      console.log(`   🏷️  Tema: ${msg.conversation_topic || 'N/A'}`);
      console.log(`   🕐 Inicio: ${msg.timestamp}\n`);
    }
    
    messageCount++;
    const roleEmoji = msg.role === 'user' ? '👤' : (msg.role === 'assistant' ? '🤖' : '⚙️');
    const roleName = msg.role === 'user' ? 'USER' : (msg.role === 'assistant' ? 'AXEL' : 'SYS');
    
    console.log(`      ${messageCount}. ${roleEmoji} [${roleName}] ${msg.timestamp}`);
    console.log(`         ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}`);
    
    if (msg.metadata && Object.keys(msg.metadata).length > 0) {
      console.log(`         📎 ${JSON.stringify(msg.metadata)}`);
    }
    console.log('');
  });
}

function printInteractions(interactions) {
  interactions.forEach((int, idx) => {
    console.log(`   ${idx + 1}. Usuario: ${int.user_name || int.user_phone}`);
    console.log(`      Timestamp: ${int.timestamp}`);
    console.log(`      Intent: ${int.intent_reason}`);
    if (int.input) {
      console.log(`      📥 Input: ${int.input.substring(0, 100)}${int.input.length > 100 ? '...' : ''}`);
    }
    if (int.output) {
      console.log(`      📤 Output: ${int.output.substring(0, 100)}${int.output.length > 100 ? '...' : ''}`);
    }
    if (int.meta) {
      console.log(`      📎 Meta: ${JSON.stringify(int.meta)}`);
    }
    console.log('   ────────────────────────────────────────\n');
  });
}

// Ejecutar extracción completa
extractAllAxelLogs()
  .then(() => {
    console.log('✅ Extracción completa finalizada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
