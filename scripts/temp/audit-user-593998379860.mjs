#!/usr/bin/env node
/**
 * 🔍 AUDITORÍA USUARIO +593998379860
 * Analiza todas las interacciones y detecta problemas de agente
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function auditUser() {
  console.log('🔍 ════════════════════════════════════════════════');
  console.log('   AUDITORÍA USUARIO +593998379860');
  console.log('════════════════════════════════════════════════\n');

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    const userPhone = '+593998379860';

    // 1. PERFIL DEL USUARIO
    console.log('📋 1. PERFIL DEL USUARIO');
    console.log('─'.repeat(60));
    
    const userProfile = await client.query(
      `SELECT * FROM users WHERE phone_number = $1`,
      [userPhone]
    );

    if (userProfile.rows.length === 0) {
      console.log('❌ Usuario no encontrado en la base de datos');
      return;
    }

    const user = userProfile.rows[0];
    console.log(`Nombre: ${user.name || 'N/A'}`);
    console.log(`Email: ${user.email || 'N/A'}`);
    console.log(`WhatsApp Display Name: ${user.whatsapp_display_name || 'N/A'}`);
    console.log(`Agente Activo: ${user.active_agent || 'N/A'}`);
    console.log(`Idioma Preferido: ${user.preferred_language || 'N/A'}`);
    console.log(`Primera Visita: ${user.first_visit}`);
    console.log(`Free Trial Usado: ${user.free_trial_used}`);
    console.log(`Contador de Conversaciones: ${user.conversation_count}`);
    console.log(`Última Interacción: ${user.last_message_at || 'N/A'}`);
    console.log(`Creado: ${user.created_at}`);
    console.log(`Actualizado: ${user.updated_at}\n`);

    // 2. INTERACCIONES RECIENTES (último 7 días)
    console.log('💬 2. INTERACCIONES RECIENTES (Últimos 7 días)');
    console.log('─'.repeat(60));
    
    const interactions = await client.query(
      `SELECT * FROM interactions 
       WHERE user_phone = $1 
       AND timestamp >= NOW() - INTERVAL '7 days'
       ORDER BY timestamp DESC
       LIMIT 50`,
      [userPhone]
    );

    if (interactions.rows.length === 0) {
      console.log('⚠️  No hay interacciones recientes (últimos 7 días)');
    } else {
      console.log(`Total interacciones encontradas: ${interactions.rows.length}\n`);
      
      interactions.rows.forEach((interaction, idx) => {
        console.log(`[${idx + 1}] ${interaction.timestamp}`);
        console.log(`    Agente: ${interaction.agent || 'N/A'}`);
        console.log(`    Intent Reason: ${interaction.intent_reason || 'N/A'}`);
        console.log(`    Input: ${interaction.input?.substring(0, 80) || 'N/A'}${interaction.input?.length > 80 ? '...' : ''}`);
        console.log(`    Output: ${interaction.output?.substring(0, 100) || 'N/A'}${interaction.output?.length > 100 ? '...' : ''}\n`);
      });
    }

    // 3. CONVERSACIONES POR AGENTE
    console.log('🤖 3. CONVERSACIONES POR AGENTE');
    console.log('─'.repeat(60));
    
    const agentConversations = await client.query(
      `SELECT agent, conversation_topic, session_id, timestamp 
       FROM agent_conversations 
       WHERE user_phone = $1 
       ORDER BY timestamp DESC
       LIMIT 30`,
      [userPhone]
    );

    if (agentConversations.rows.length === 0) {
      console.log('⚠️  No hay conversaciones registradas en agent_conversations');
    } else {
      console.log(`Total conversaciones encontradas: ${agentConversations.rows.length}\n`);
      
      agentConversations.rows.forEach((conv, idx) => {
        console.log(`[${idx + 1}] ${conv.timestamp}`);
        console.log(`    Agente: ${conv.agent}`);
        console.log(`    Tópico: ${conv.conversation_topic || 'N/A'}`);
        console.log(`    Session: ${conv.session_id}\n`);
      });
    }

    // 4. HISTORIAL DE CAMBIOS DE AGENTE (interactions con agent y intent_reason)
    console.log('🔄 4. HISTORIAL DE CAMBIOS DE AGENTE');
    console.log('─'.repeat(60));
    
    const agentChanges = await client.query(
      `SELECT timestamp, agent, intent_reason, input
       FROM interactions 
       WHERE user_phone = $1 
       AND timestamp >= NOW() - INTERVAL '7 days'
       ORDER BY timestamp ASC`,
      [userPhone]
    );

    if (agentChanges.rows.length === 0) {
      console.log('⚠️  No hay cambios de agente registrados');
    } else {
      console.log(`Análisis de cambios de agente:\n`);
      
      let previousAgent = null;
      agentChanges.rows.forEach((change, idx) => {
        const currentAgent = change.agent || 'UNKNOWN';
        
        if (previousAgent && currentAgent !== previousAgent) {
          console.log(`⚠️  [CAMBIO DETECTADO] ${change.timestamp}`);
          console.log(`    De: ${previousAgent} → A: ${currentAgent}`);
          console.log(`    Razón: ${change.intent_reason || 'N/A'}`);
          console.log(`    Input: ${change.input?.substring(0, 100) || 'N/A'}\n`);
        }
        
        previousAgent = currentAgent;
      });
    }

    // 5. RESERVAS
    console.log('📅 5. RESERVAS');
    console.log('─'.repeat(60));
    
    const reservations = await client.query(
      `SELECT * FROM reservations 
       WHERE user_phone = $1 
       ORDER BY created_at DESC
       LIMIT 10`,
      [userPhone]
    );

    if (reservations.rows.length === 0) {
      console.log('⚠️  No hay reservas registradas');
    } else {
      console.log(`Total reservas encontradas: ${reservations.rows.length}\n`);
      
      reservations.rows.forEach((res, idx) => {
        console.log(`[${idx + 1}] ID: ${res.id}`);
        console.log(`    Servicio: ${res.service_type}`);
        console.log(`    Fecha: ${res.date} ${res.start_time} - ${res.end_time}`);
        console.log(`    Estado: ${res.status}`);
        console.log(`    Pago: ${res.payment_status}`);
        console.log(`    Creado: ${res.created_at}\n`);
      });
    }

    // 6. ESTADOS PENDIENTES
    console.log('⏳ 6. ESTADOS PENDIENTES');
    console.log('─'.repeat(60));
    
    const pendingConfirmations = await client.query(
      `SELECT * FROM pending_confirmations WHERE user_phone = $1`,
      [userPhone]
    );

    const reservationStates = await client.query(
      `SELECT * FROM reservation_state WHERE user_phone = $1`,
      [userPhone]
    );

    const partialForms = await client.query(
      `SELECT * FROM partial_forms WHERE user_phone = $1`,
      [userPhone]
    );

    console.log(`Confirmaciones Pendientes: ${pendingConfirmations.rows.length}`);
    if (pendingConfirmations.rows.length > 0) {
      pendingConfirmations.rows.forEach(pc => {
        console.log(`  - Tipo: ${pc.type}, Expira: ${pc.expires_at}`);
      });
    }

    console.log(`\nEstados de Reserva: ${reservationStates.rows.length}`);
    if (reservationStates.rows.length > 0) {
      reservationStates.rows.forEach(rs => {
        console.log(`  - Estado: ${rs.state_type}, Datos: ${JSON.stringify(rs.state_data).substring(0, 100)}`);
      });
    }

    console.log(`\nFormularios Parciales: ${partialForms.rows.length}`);
    if (partialForms.rows.length > 0) {
      partialForms.rows.forEach(pf => {
        console.log(`  - Tipo: ${pf.form_type}, Cancelado: ${pf.cancelled_at}`);
      });
    }

    console.log('\n════════════════════════════════════════════════');
    console.log('✅ Auditoría completada');
    console.log('════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
  } finally {
    await client.end();
  }
}

auditUser();
