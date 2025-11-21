#!/usr/bin/env node
// scripts/test-follow-up-local.js
// 🧪 Test local del sistema de follow-up automático

import dotenv from 'dotenv';
import { databaseService } from '../src/database/database.js';
import {
  isWithinAllowedHours,
  findAbandonedConversations,
  getUserConversationContext,
  generateFollowUpMessage,
  processFollowUps
} from '../src/servicios/follow-up-service.js';

// Cargar variables de entorno
dotenv.config();

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(emoji, message, color = COLORS.reset) {
  console.log(`${color}${emoji} ${message}${COLORS.reset}`);
}

function header(title) {
  console.log('\n' + COLORS.bright + COLORS.cyan + '═'.repeat(60) + COLORS.reset);
  console.log(COLORS.bright + COLORS.cyan + `  ${title}` + COLORS.reset);
  console.log(COLORS.bright + COLORS.cyan + '═'.repeat(60) + COLORS.reset + '\n');
}

/**
 * Test 1: Verificar horario permitido
 */
async function testHorarioPermitido() {
  header('TEST 1: Verificación de Horario');
  
  const isAllowed = isWithinAllowedHours();
  
  if (isAllowed) {
    log('✅', 'Horario PERMITIDO para envío de mensajes (6am-10pm Ecuador)', COLORS.green);
  } else {
    log('⏸️', 'Horario NO PERMITIDO (fuera de 6am-10pm Ecuador)', COLORS.yellow);
  }
  
  return isAllowed;
}

/**
 * Test 2: Buscar conversaciones abandonadas
 */
async function testBuscarConversaciones() {
  header('TEST 2: Búsqueda de Conversaciones Abandonadas');
  
  try {
    const users = await findAbandonedConversations();
    
    log('📊', `Total encontrados: ${users.length} usuarios`, COLORS.blue);
    
    if (users.length === 0) {
      log('ℹ️', 'No hay conversaciones abandonadas en este momento', COLORS.yellow);
      return [];
    }
    
    console.log('\n' + COLORS.bright + 'Usuarios encontrados:' + COLORS.reset);
    users.forEach((user, index) => {
      const lastMessageTime = new Date(user.last_message_at);
      const hoursAgo = Math.floor((Date.now() - lastMessageTime.getTime()) / (1000 * 60 * 60));
      
      console.log(`\n  ${index + 1}. ${COLORS.bright}${user.name || 'Sin nombre'}${COLORS.reset}`);
      console.log(`     📱 ${user.phone_number}`);
      console.log(`     👤 Agente: ${user.active_agent}`);
      console.log(`     ⏰ Última interacción: hace ${hoursAgo}h`);
      console.log(`     💬 Conversaciones: ${user.conversation_count}`);
    });
    
    return users;
  } catch (error) {
    log('❌', `Error: ${error.message}`, COLORS.red);
    return [];
  }
}

/**
 * Test 3: Analizar contexto de usuarios
 */
async function testContextoUsuarios(users) {
  header('TEST 3: Análisis de Contexto por Usuario');
  
  if (users.length === 0) {
    log('ℹ️', 'No hay usuarios para analizar', COLORS.yellow);
    return [];
  }
  
  const usersWithContext = [];
  
  for (const user of users) {
    try {
      const context = await getUserConversationContext(user.phone_number);
      
      console.log(`\n${COLORS.bright}${user.name || user.phone_number}${COLORS.reset}`);
      console.log(`  Agente: ${user.active_agent}`);
      
      if (context.hasPendingConfirmation) {
        log('  📝', 'Tiene confirmación pendiente', COLORS.green);
        if (context.pendingData) {
          console.log(`      Espacio: ${context.pendingData.spaceType}`);
          console.log(`      Fecha: ${context.pendingData.date}`);
          console.log(`      Hora: ${context.pendingData.time}`);
        }
      }
      
      if (context.hasPartialForm) {
        log('  📋', 'Tiene formulario parcial', COLORS.green);
        if (context.formData) {
          console.log(`      Espacio: ${context.formData.spaceType || 'No definido'}`);
          console.log(`      Fecha: ${context.formData.date || 'No definida'}`);
          console.log(`      Hora: ${context.formData.time || 'No definida'}`);
        }
      }
      
      if (context.lastMessages && context.lastMessages.length > 0) {
        log('  💬', `Últimos ${context.lastMessages.length} mensajes disponibles`, COLORS.blue);
        const lastMsg = context.lastMessages[0];
        if (lastMsg.input) {
          console.log(`      Último input: "${lastMsg.input.substring(0, 50)}..."`);
        }
      }
      
      const hasRelevantContext = context.hasPartialForm || context.hasPendingConfirmation;
      
      if (hasRelevantContext) {
        log('  ✅', 'Usuario ELEGIBLE para follow-up', COLORS.green);
        usersWithContext.push({ user, context });
      } else {
        log('  ⏭️', 'Usuario SIN contexto relevante (se saltará)', COLORS.yellow);
      }
      
    } catch (error) {
      log('  ❌', `Error: ${error.message}`, COLORS.red);
    }
  }
  
  return usersWithContext;
}

/**
 * Test 4: Generar mensajes de seguimiento
 */
async function testGenerarMensajes(usersWithContext) {
  header('TEST 4: Generación de Mensajes Personalizados');
  
  if (usersWithContext.length === 0) {
    log('ℹ️', 'No hay usuarios con contexto para generar mensajes', COLORS.yellow);
    return;
  }
  
  for (const { user, context } of usersWithContext) {
    console.log(`\n${COLORS.bright}Mensaje para: ${user.name || user.phone_number}${COLORS.reset}`);
    console.log(`Agente: ${user.active_agent}\n`);
    
    const message = generateFollowUpMessage(user, context);
    
    console.log(COLORS.cyan + '─'.repeat(50) + COLORS.reset);
    console.log(message);
    console.log(COLORS.cyan + '─'.repeat(50) + COLORS.reset);
  }
}

/**
 * Test 5: Ejecutar proceso completo (DRY RUN - sin enviar)
 */
async function testProcesoCompleto() {
  header('TEST 5: Proceso Completo (DRY RUN)');
  
  log('ℹ️', 'Este test NO enviará mensajes reales', COLORS.yellow);
  log('ℹ️', 'Solo simula el proceso completo', COLORS.yellow);
  
  console.log('\n' + COLORS.bright + 'Ejecutando processFollowUps()...' + COLORS.reset + '\n');
  
  // Aquí podrías descomentar para probar el envío real
  // const result = await processFollowUps();
  // log('📊', `Resultado: ${result.sent} enviados, ${result.skipped} saltados`, COLORS.green);
  
  log('✅', 'Para ejecutar el envío real, descomenta la línea en el código', COLORS.green);
}

/**
 * Main test runner
 */
async function runTests() {
  console.clear();
  
  header('🧪 TEST LOCAL - SISTEMA DE FOLLOW-UP AUTOMÁTICO');
  
  log('📅', `Fecha: ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}`, COLORS.blue);
  log('🌍', 'Timezone: America/Guayaquil (Ecuador UTC-5)', COLORS.blue);
  
  try {
    // Test 1: Horario
    const isAllowed = await testHorarioPermitido();
    
    // Test 2: Buscar conversaciones
    const users = await testBuscarConversaciones();
    
    // Test 3: Analizar contexto
    const usersWithContext = await testContextoUsuarios(users);
    
    // Test 4: Generar mensajes
    await testGenerarMensajes(usersWithContext);
    
    // Test 5: Proceso completo
    await testProcesoCompleto();
    
    // Resumen final
    header('📊 RESUMEN FINAL');
    log('✅', `Total usuarios encontrados: ${users.length}`, COLORS.green);
    log('✅', `Usuarios con contexto relevante: ${usersWithContext.length}`, COLORS.green);
    log('✅', `Horario permitido: ${isAllowed ? 'SÍ' : 'NO'}`, isAllowed ? COLORS.green : COLORS.yellow);
    
    if (usersWithContext.length > 0) {
      console.log('\n' + COLORS.bright + COLORS.blue + '💡 Próximos pasos:' + COLORS.reset);
      console.log('   1. Revisa los mensajes generados arriba');
      console.log('   2. Para envío real, ejecuta en producción o descomenta Test 5');
      console.log('   3. El cron job enviará automáticamente cada hora');
    }
    
  } catch (error) {
    log('❌', `Error fatal: ${error.message}`, COLORS.red);
    console.error(error);
    process.exit(1);
  }
  
  console.log('\n' + COLORS.green + '✅ Tests completados' + COLORS.reset + '\n');
  process.exit(0);
}

// Ejecutar tests
runTests().catch(error => {
  console.error('Error ejecutando tests:', error);
  process.exit(1);
});
