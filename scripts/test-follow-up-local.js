#!/usr/bin/env node
// scripts/test-follow-up-local.js
// 🧪 Script de prueba completo para sistema de follow-up

import dotenv from 'dotenv';
import { databaseService } from '../src/database/database.js';
import {
  isWithinAllowedHours,
  findAbandonedConversations,
  getUserConversationContext,
  generateFollowUpMessage
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
  red: '\x1b[31m',
  magenta: '\x1b[35m'
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
  header('TEST 1: Verificación de Horario (6am-10pm Ecuador)');
  
  const now = new Date();
  const ecuadorTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const hour = ecuadorTime.getHours();
  
  log('⏰', `Hora actual Ecuador: ${ecuadorTime.toLocaleTimeString('es-EC')} (${hour}:00)`, COLORS.blue);
  
  const isAllowed = isWithinAllowedHours();
  
  if (isAllowed) {
    log('✅', 'Horario PERMITIDO para envío de follow-ups', COLORS.green);
  } else {
    log('🚫', 'Horario NO PERMITIDO (fuera de 6am-10pm)', COLORS.red);
  }
  
  // Simulación de diferentes horas
  log('', '\nSimulación de horarios:', COLORS.yellow);
  const testHours = [5, 6, 12, 18, 21, 22, 23];
  testHours.forEach(h => {
    const allowed = h >= 6 && h < 22;
    const status = allowed ? '✅ Permitido' : '🚫 Bloqueado';
    console.log(`  ${h}:00 → ${status}`);
  });
  
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
 * Test 3: Analizar contexto y generar mensajes
 */
async function testContextoYMensajes(users) {
  header('TEST 3: Contexto y Generación de Mensajes');
  
  if (users.length === 0) {
    log('ℹ️', 'No hay usuarios para analizar', COLORS.yellow);
    return [];
  }
  
  const results = [];
  
  for (const user of users.slice(0, 3)) { // Máximo 3 ejemplos
    try {
      const context = await getUserConversationContext(user.phone_number);
      
      // Determinar si debe enviarse según reglas
      const isAluna = user.active_agent === 'ALUNA';
      const shouldSend = isAluna || context.hasPartialForm || context.hasPendingConfirmation;
      
      log('👤', `\n${user.name || user.phone_number} (${user.active_agent})`, COLORS.blue);
      console.log(`  Formulario parcial: ${context.hasPartialForm ? '✅' : '❌'}`);
      console.log(`  Confirmación pendiente: ${context.hasPendingConfirmation ? '✅' : '❌'}`);
      console.log(`  Total mensajes: ${context.messageCount}`);
      
      if (!shouldSend) {
        log('⏭️', 'SALTADO - Sin contexto relevante para Aurora', COLORS.yellow);
        results.push({ user, shouldSend: false, reason: 'no_context' });
        continue;
      }
      
      // Generar mensaje
      const message = generateFollowUpMessage(user, context);
      
      console.log(COLORS.bright + '\n  📨 Mensaje generado:' + COLORS.reset);
      console.log(COLORS.cyan + '  ' + '─'.repeat(50) + COLORS.reset);
      message.split('\n').forEach(line => {
        console.log(`  ${COLORS.green}${line}${COLORS.reset}`);
      });
      console.log(COLORS.cyan + '  ' + '─'.repeat(50) + COLORS.reset);
      
      // Analizar personalidad
      if (user.active_agent === 'ALUNA') {
        log('💼', 'Personalidad: SALES CLOSER (urgencia, exclusividad)', COLORS.magenta);
      } else {
        log('💚', 'Personalidad: SERVICIAL (empática, sin presión)', COLORS.green);
      }
      
      results.push({ user, context, message, shouldSend: true });
      
    } catch (error) {
      log('❌', `Error: ${error.message}`, COLORS.red);
    }
  }
  
  return results;
}

/**
 * Test 4: Simulación de proceso completo
 */
async function testSimulacionCompleta(users) {
  header('TEST 4: Simulación de Proceso Completo');
  
  log('ℹ️', 'MODO SIMULACIÓN - No se enviarán mensajes reales', COLORS.yellow);
  
  if (users.length === 0) {
    log('✅', 'No hay follow-ups pendientes', COLORS.green);
    return;
  }
  
  let wouldSend = 0;
  let wouldSkip = 0;
  
  for (const user of users) {
    try {
      const context = await getUserConversationContext(user.phone_number);
      const isAluna = user.active_agent === 'ALUNA';
      const shouldSend = isAluna || context.hasPartialForm || context.hasPendingConfirmation;
      
      if (shouldSend) {
        wouldSend++;
        log('✉️', `ENVIARÍA → ${user.phone_number} (${user.active_agent})`, COLORS.green);
      } else {
        wouldSkip++;
        log('⏭️', `SALTARÍA → ${user.phone_number} (${user.active_agent}, sin contexto)`, COLORS.yellow);
      }
    } catch (error) {
      log('❌', `Error con ${user.phone_number}: ${error.message}`, COLORS.red);
    }
  }
  
  // Resumen
  console.log('\n' + COLORS.bright + COLORS.cyan + '📊 RESUMEN:' + COLORS.reset);
  console.log(`  Conversaciones encontradas: ${users.length}`);
  console.log(`  ${COLORS.green}✉️  Mensajes que se enviarían: ${wouldSend}${COLORS.reset}`);
  console.log(`  ${COLORS.yellow}⏭️  Conversaciones que se saltarían: ${wouldSkip}${COLORS.reset}`);
  
  // Por agente
  const byAgent = users.reduce((acc, user) => {
    acc[user.active_agent] = (acc[user.active_agent] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n  Distribución por agente:');
  Object.entries(byAgent).forEach(([agent, count]) => {
    console.log(`    ${agent}: ${count}`);
  });
}

/**
 * Test 5: Validación de base de datos
 */
async function testDatabase() {
  header('TEST 5: Validación de Base de Datos');
  
  try {
    const result = await databaseService.query('SELECT NOW() as time, current_database() as db');
    log('✅', 'Conexión exitosa a PostgreSQL', COLORS.green);
    log('⏰', `Hora servidor: ${result.rows[0].time}`, COLORS.blue);
    log('💾', `Base de datos: ${result.rows[0].db}`, COLORS.blue);
    
    // Estadísticas
    const stats = await databaseService.query(`
      SELECT 
        active_agent,
        COUNT(*) as total,
        COUNT(CASE WHEN last_message_at > NOW() - INTERVAL '3 hours' THEN 1 END) as recent,
        COUNT(CASE WHEN last_message_at BETWEEN NOW() - INTERVAL '24 hours' AND NOW() - INTERVAL '3 hours' THEN 1 END) as abandoned
      FROM users
      WHERE active_agent IN ('AURORA', 'ALUNA')
      GROUP BY active_agent
    `);
    
    console.log('\n' + COLORS.bright + 'Estadísticas:' + COLORS.reset);
    stats.rows.forEach(stat => {
      console.log(`\n  ${COLORS.magenta}${stat.active_agent}:${COLORS.reset}`);
      console.log(`    Total: ${stat.total}`);
      console.log(`    Activos (< 3h): ${stat.recent}`);
      console.log(`    Abandonados (3-24h): ${stat.abandoned}`);
    });
    
  } catch (error) {
    log('❌', `Error: ${error.message}`, COLORS.red);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.clear();
  
  console.log(COLORS.bright + COLORS.blue);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║         🧪 TEST SUITE: FOLLOW-UP SERVICE                  ║');
  console.log('║              Sistema de Seguimiento Automático            ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);
  
  const startTime = Date.now();
  
  try {
    await testDatabase();
    await testHorarioPermitido();
    const users = await testBuscarConversaciones();
    await testContextoYMensajes(users);
    await testSimulacionCompleta(users);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + COLORS.bright + COLORS.green);
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║                  ✅ TESTS COMPLETADOS                      ║');
    console.log(`║               Tiempo: ${duration}s                             `.padEnd(61) + '║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(COLORS.reset);
    
  } catch (error) {
    log('❌', `Error crítico: ${error.message}`, COLORS.red);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await databaseService.closeConnection();
    log('👋', 'Conexión cerrada', COLORS.cyan);
  }
}

// Ejecutar tests
runTests().catch(error => {
  console.error('Error ejecutando tests:', error);
  process.exit(1);
});
