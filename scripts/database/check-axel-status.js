#!/usr/bin/env node
/**
 * 🔍 Verifica el estado de mensajes y configuración de Axel
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function checkAxelStatus() {
  try {
    console.log('🔍 DIAGNÓSTICO DE AXEL\n');
    console.log('═'.repeat(60));
    
    // 1. Estado del usuario
    console.log('\n📊 1. ESTADO DEL USUARIO');
    const user = await pool.query(`
      SELECT phone_number, name, active_agent, last_message_at, conversation_count
      FROM users 
      WHERE phone_number = '+593987770788'
    `);
    
    if (user.rows[0]) {
      console.log(`   Nombre: ${user.rows[0].name}`);
      console.log(`   Agente activo: ${user.rows[0].active_agent}`);
      console.log(`   Último mensaje: ${user.rows[0].last_message_at}`);
      console.log(`   Total conversaciones: ${user.rows[0].conversation_count}`);
    } else {
      console.log('   ❌ Usuario no encontrado');
    }
    
    // 2. Últimas interacciones
    console.log('\n💬 2. ÚLTIMAS 10 INTERACCIONES');
    const interactions = await pool.query(`
      SELECT agent, agent_name, intent_reason, 
             LEFT(output, 80) as output_preview,
             timestamp
      FROM interactions 
      WHERE user_phone = '+593987770788'
      ORDER BY timestamp DESC
      LIMIT 10
    `);
    
    interactions.rows.forEach((row, i) => {
      const time = new Date(row.timestamp).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });
      console.log(`\n   ${i + 1}. [${row.agent.toUpperCase()}] ${time}`);
      console.log(`      Razón: ${row.intent_reason}`);
      console.log(`      Salida: ${row.output_preview}...`);
    });
    
    // 3. Follow-ups programados
    console.log('\n\n🔔 3. FOLLOW-UPS PENDIENTES');
    const followUps = await pool.query(`
      SELECT user_phone, message_type, sent_at, success
      FROM follow_up_history 
      WHERE user_phone = '+593987770788'
      ORDER BY sent_at DESC
      LIMIT 5
    `);
    
    if (followUps.rows.length === 0) {
      console.log('   ✅ No hay historial de follow-ups');
    } else {
      followUps.rows.forEach((row, i) => {
        const time = new Date(row.sent_at).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' });
        console.log(`   ${i + 1}. ${time} - ${row.message_type} - ${row.success ? '✅' : '❌'}`);
      });
    }
    
    // 4. Formularios de Axel en progreso
    console.log('\n\n📋 4. FORMULARIOS DE AXEL');
    const forms = await pool.query(`
      SELECT form_type, form_data, created_at, updated_at
      FROM partial_forms 
      WHERE user_phone = '+593987770788'
    `);
    
    if (forms.rows.length === 0) {
      console.log('   ✅ No hay formularios en progreso');
    } else {
      forms.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. Tipo: ${row.form_type}`);
        console.log(`      Creado: ${new Date(row.created_at).toLocaleString('es-EC')}`);
        console.log(`      Actualizado: ${new Date(row.updated_at).toLocaleString('es-EC')}`);
        console.log(`      Datos:`, JSON.stringify(JSON.parse(row.form_data), null, 6));
      });
    }
    
    // 5. Configuración del sistema
    console.log('\n\n⚙️  5. CONFIGURACIÓN DEL SISTEMA');
    console.log(`   WASSENGER_ENABLED: ${process.env.WASSENGER_ENABLED || 'no definido (default: true)'}`);
    console.log(`   FOLLOW_UP_ENABLED: ${process.env.FOLLOW_UP_ENABLED || 'no definido (default: true)'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    
    // 6. Mensajes recientes por agente
    console.log('\n\n📈 6. CONTEO DE MENSAJES POR AGENTE (ÚLTIMAS 24H)');
    const counts = await pool.query(`
      SELECT agent, COUNT(*) as count
      FROM interactions 
      WHERE user_phone = '+593987770788'
        AND timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY agent
      ORDER BY count DESC
    `);
    
    counts.rows.forEach(row => {
      console.log(`   ${row.agent.toUpperCase()}: ${row.count} mensajes`);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Diagnóstico completado\n');
    
  } catch (error) {
    console.error('\n❌ Error en diagnóstico:', error.message);
  } finally {
    await pool.end();
  }
}

checkAxelStatus();
