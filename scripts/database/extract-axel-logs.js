/**
 * 🔍 Extractor de logs de conversaciones con Axel
 * Obtiene las conversaciones más recientes con el agente Axel
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

async function extractAxelLogs() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Extrayendo logs de conversaciones con Axel...\n');
    
    // Obtener las conversaciones más recientes con Axel (últimas 2 horas)
    const result = await client.query(`
      SELECT 
        ac.id,
        ac.user_phone,
        ac.agent,
        ac.conversation_topic,
        ac.session_id,
        ac.role,
        ac.content,
        ac.metadata,
        ac.parent_message_id,
        ac.timestamp,
        u.name as user_name,
        u.email as user_email
      FROM agent_conversations ac
      LEFT JOIN users u ON ac.user_phone = u.phone_number
      WHERE ac.agent = 'axel'
        AND ac.timestamp > NOW() - INTERVAL '2 hours'
      ORDER BY ac.timestamp ASC
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No se encontraron conversaciones con Axel en las últimas 2 horas');
      console.log('\n🔍 Buscando las conversaciones más recientes con Axel (últimas 24 horas)...\n');
      
      const resultExpanded = await client.query(`
        SELECT 
          ac.id,
          ac.user_phone,
          ac.agent,
          ac.conversation_topic,
          ac.session_id,
          ac.role,
          ac.content,
          ac.metadata,
          ac.parent_message_id,
          ac.timestamp,
          u.name as user_name,
          u.email as user_email
        FROM agent_conversations ac
        LEFT JOIN users u ON ac.user_phone = u.phone_number
        WHERE ac.agent = 'axel'
          AND ac.timestamp > NOW() - INTERVAL '24 hours'
        ORDER BY ac.timestamp ASC
      `);
      
      if (resultExpanded.rows.length === 0) {
        console.log('❌ No se encontraron conversaciones con Axel en las últimas 24 horas');
        return;
      }
      
      printConversations(resultExpanded.rows);
      return;
    }
    
    printConversations(result.rows);
    
    // Obtener información adicional de intentos de cotización
    console.log('\n\n📊 Información adicional de cotizaciones pendientes:\n');
    console.log('════════════════════════════════════════════════════════════\n');
    
    const quotes = await client.query(`
      SELECT 
        pf.*,
        u.name as user_name,
        u.email as user_email
      FROM partial_forms pf
      LEFT JOIN users u ON pf.user_phone = u.phone_number
      WHERE pf.agent = 'axel'
        AND pf.updated_at > NOW() - INTERVAL '24 hours'
      ORDER BY pf.updated_at DESC
    `);
    
    if (quotes.rows.length > 0) {
      quotes.rows.forEach((quote, index) => {
        console.log(`${index + 1}. Usuario: ${quote.user_name || quote.user_phone}`);
        console.log(`   Teléfono: ${quote.user_phone}`);
        console.log(`   Contexto: ${quote.context || 'N/A'}`);
        console.log(`   Form Data: ${JSON.stringify(quote.form_data, null, 2)}`);
        console.log(`   Última actualización: ${quote.updated_at}`);
        console.log('   ────────────────────────────────────────\n');
      });
    } else {
      console.log('❌ No se encontraron cotizaciones pendientes recientes\n');
    }
    
    // Obtener archivos asociados
    console.log('\n📸 Archivos/Imágenes asociados a conversaciones con Axel:\n');
    console.log('════════════════════════════════════════════════════════════\n');
    
    const files = await client.query(`
      SELECT 
        cf.*,
        ac.content as message_content
      FROM conversation_files cf
      JOIN agent_conversations ac ON cf.message_id = ac.id
      WHERE cf.agent = 'axel'
        AND cf.uploaded_at > NOW() - INTERVAL '24 hours'
      ORDER BY cf.uploaded_at DESC
    `);
    
    if (files.rows.length > 0) {
      files.rows.forEach((file, index) => {
        console.log(`${index + 1}. Tipo: ${file.file_type}`);
        console.log(`   Usuario: ${file.user_phone}`);
        console.log(`   URL: ${file.file_url || 'N/A'}`);
        console.log(`   Procesado: ${file.processed ? '✅' : '❌'}`);
        console.log(`   Mensaje: ${file.message_content}`);
        console.log(`   Subido: ${file.uploaded_at}`);
        if (file.analysis_result) {
          console.log(`   Análisis: ${JSON.stringify(file.analysis_result, null, 2)}`);
        }
        console.log('   ────────────────────────────────────────\n');
      });
    } else {
      console.log('❌ No se encontraron archivos recientes\n');
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
  console.log(`✅ Se encontraron ${conversations.length} mensajes\n`);
  console.log('════════════════════════════════════════════════════════════\n');
  
  let currentSession = null;
  let messageCount = 0;
  
  conversations.forEach((msg, index) => {
    // Separar por sesión
    if (currentSession !== msg.session_id) {
      if (currentSession !== null) {
        console.log('\n════════════════════════════════════════════════════════════\n');
      }
      currentSession = msg.session_id;
      messageCount = 0;
      console.log(`📋 SESIÓN: ${msg.session_id}`);
      console.log(`👤 Usuario: ${msg.user_name || msg.user_phone}`);
      console.log(`📞 Teléfono: ${msg.user_phone}`);
      if (msg.user_email) console.log(`📧 Email: ${msg.user_email}`);
      console.log(`🏷️  Tema: ${msg.conversation_topic || 'N/A'}`);
      console.log(`🕐 Inicio: ${msg.timestamp}`);
      console.log('\n💬 MENSAJES:\n');
    }
    
    messageCount++;
    const roleEmoji = msg.role === 'user' ? '👤' : (msg.role === 'assistant' ? '🤖' : '⚙️');
    const roleName = msg.role === 'user' ? 'USUARIO' : (msg.role === 'assistant' ? 'AXEL' : 'SISTEMA');
    
    console.log(`${messageCount}. ${roleEmoji} [${roleName}] - ${msg.timestamp}`);
    console.log(`   ${msg.content}`);
    
    // Mostrar metadata si existe
    if (msg.metadata && Object.keys(msg.metadata).length > 0) {
      console.log(`   📎 Metadata: ${JSON.stringify(msg.metadata, null, 2)}`);
    }
    
    console.log('');
  });
  
  console.log('════════════════════════════════════════════════════════════\n');
}

// Ejecutar extracción
extractAxelLogs()
  .then(() => {
    console.log('✅ Extracción completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
