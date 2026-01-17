#!/usr/bin/env node
/**
 * 🔍 DEBUG USER PROFILE
 * Script para auditar el perfil de un usuario específico
 */

import dotenv from 'dotenv';
dotenv.config();

import { loadProfile } from '../../src/perfiles-interacciones/memoria-sqlite.js';
import userRepository from '../../src/database/userRepository.js';

const userId = process.argv[2];

if (!userId) {
  console.error('❌ Debes proporcionar un userId (número de teléfono)');
  console.error('Uso: node debug-user-profile.js +593994837117');
  process.exit(1);
}

console.log('🔍 AUDITORÍA DE PERFIL DE USUARIO\n');
console.log(`📱 userId: ${userId}\n`);

try {
  // 1. Cargar perfil completo
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 PERFIL COMPLETO (desde loadProfile)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const profile = await loadProfile(userId);
  
  if (!profile) {
    console.log('❌ No se encontró perfil para este usuario\n');
  } else {
    console.log('✅ Perfil encontrado:\n');
    console.log(`   userId: ${profile.userId}`);
    console.log(`   name: "${profile.name || 'NULL'}"`);
    console.log(`   whatsappDisplayName: "${profile.whatsappDisplayName || 'NULL'}"`);
    console.log(`   email: "${profile.email || 'NULL'}"`);
    console.log(`   channel: ${profile.channel}`);
    console.log(`   firstVisit: ${profile.firstVisit}`);
    console.log(`   freeTrialUsed: ${profile.freeTrialUsed}`);
    console.log(`   activeAgent: ${profile.activeAgent}`);
    console.log(`   preferredLanguage: ${profile.preferredLanguage}`);
    console.log(`   conversationCount: ${profile.conversationCount}`);
    console.log(`   lastMessageAt: ${profile.lastMessageAt}`);
    console.log(`   createdAt: ${profile.createdAt}`);
    console.log(`   updatedAt: ${profile.updatedAt}\n`);
    
    // Reservas
    console.log(`   📅 Reservas históricas: ${profile.reservationHistory?.length || 0}`);
    console.log(`   ⏰ Reservas futuras: ${profile.upcomingReservations?.length || 0}`);
    console.log(`   ⏳ Confirmación pendiente: ${profile.pendingConfirmation ? 'SÍ' : 'NO'}`);
    console.log(`   ✅ Recién confirmada: ${profile.justConfirmed ? 'SÍ' : 'NO'}\n`);
  }
  
  // 2. Consultar directo en BD
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🗄️  REGISTRO EN BASE DE DATOS (directo)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const user = await userRepository.findByPhone(userId);
  
  if (!user) {
    console.log('❌ No se encontró usuario en BD\n');
  } else {
    console.log('✅ Usuario encontrado en BD:\n');
    console.log(`   phone_number: ${user.phone_number}`);
    console.log(`   name: "${user.name || 'NULL'}"`);
    console.log(`   whatsapp_display_name: "${user.whatsapp_display_name || 'NULL'}"`);
    console.log(`   email: "${user.email || 'NULL'}"`);
    console.log(`   first_visit: ${user.first_visit}`);
    console.log(`   free_trial_used: ${user.free_trial_used}`);
    console.log(`   free_trial_date: ${user.free_trial_date || 'NULL'}`);
    console.log(`   conversation_count: ${user.conversation_count}`);
    console.log(`   last_message_at: ${user.last_message_at || 'NULL'}`);
    console.log(`   active_agent: ${user.active_agent || 'NULL'}`);
    console.log(`   preferred_language: ${user.preferred_language || 'NULL'}`);
    console.log(`   created_at: ${user.created_at}`);
    console.log(`   updated_at: ${user.updated_at}\n`);
  }
  
  // 3. Análisis
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔬 ANÁLISIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (profile && user) {
    // Comparar name vs whatsappDisplayName
    if (profile.name !== profile.whatsappDisplayName) {
      console.log('⚠️  INCONSISTENCIA: name ≠ whatsappDisplayName');
      console.log(`   name: "${profile.name}"`);
      console.log(`   whatsappDisplayName: "${profile.whatsappDisplayName}"`);
      console.log(`   → El sistema usa "name" para saludar\n`);
    } else {
      console.log('✅ name y whatsappDisplayName son iguales\n');
    }
    
    // Verificar idioma
    if (profile.preferredLanguage !== 'es') {
      console.log(`⚠️  IDIOMA: Usuario tiene preferredLanguage = "${profile.preferredLanguage}"`);
      console.log('   → Mensajes se envían en este idioma\n');
    } else {
      console.log('✅ Idioma configurado: Español (es)\n');
    }
    
    // Verificar agente activo
    if (profile.activeAgent !== 'AURORA') {
      console.log(`⚠️  AGENTE ACTIVO: ${profile.activeAgent}`);
      console.log('   → Próximo mensaje irá a este agente\n');
    } else {
      console.log('✅ Agente activo: AURORA\n');
    }
    
    // Verificar firstVisit
    if (!profile.firstVisit) {
      console.log('ℹ️  Usuario NO es primera visita (ya interactuó antes)\n');
    } else {
      console.log('✅ Usuario en primera visita\n');
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Auditoría completada\n');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error en auditoría:', error);
  process.exit(1);
}
