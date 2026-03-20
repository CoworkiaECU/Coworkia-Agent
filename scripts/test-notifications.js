#!/usr/bin/env node
/**
 * 🧪 Test de Notificaciones Internas
 * 
 * Prueba el sistema de notificaciones WhatsApp a celular personal
 * 
 * Uso: node scripts/test-notifications.js [tipo]
 * 
 * Tipos disponibles:
 * - success (default)
 * - error
 * - question
 * - checkpoint
 * - all (prueba todos los tipos)
 */

import dotenv from 'dotenv';
import { notifyDiego, testNotification } from '../src/express-servidor/endpoints-api/internal-notifications.js';

// Cargar variables de entorno
dotenv.config();

const type = process.argv[2] || 'test';

console.log('🧪 Sistema de Test de Notificaciones\n');
console.log('📱 Configuración:');
console. log(`   NOTIFICATIONS_ENABLED: ${process.env.NOTIFICATIONS_ENABLED || 'false'}`);
console.log(`   DIEGO_PERSONAL_PHONE: ${process.env.DIEGO_PERSONAL_PHONE ? '✓ Configurado' : '❌ No configurado'}`);
console.log(`   NOTIFICATIONS_CHECKPOINT: ${process.env.NOTIFICATIONS_CHECKPOINT || 'false'}\n`);

if (!process.env.DIEGO_PERSONAL_PHONE) {
  console.error('❌ Error: DIEGO_PERSONAL_PHONE no está configurado en .env');
  console.log('\nAñade a tu .env:');
  console.log('DIEGO_PERSONAL_PHONE="+593xxxxxxxxx"');
  console.log('NOTIFICATIONS_ENABLED=true');
  process.exit(1);
}

if (process.env.NOTIFICATIONS_ENABLED !== 'true') {
  console.warn('⚠️  Advertencia: NOTIFICATIONS_ENABLED=false');
  console.log('Las notificaciones no se enviarán. Cambia a true en .env para habilitar.\n');
}

async function runTests() {
  try {
    console.log(`📤 Enviando notificación de tipo: ${type}\n`);
    
    let result;
    
    switch (type) {
      case 'test':
        console.log('🔵 Test básico del sistema...\n');
        result = await testNotification();
        break;
        
      case 'success':
        console.log('✅ Simulando plan completado...\n');
        result = await notifyDiego('success', 'Plan Completado', {
          plan: 'plan-vuelo-test.md',
          tasks: 8,
          tasksTotal: 8,
          time: '2h 15min',
          commits: ['v931: templates consolidados', 'v932: dashboard filters', 'v933: testing completo'],
          stats: {
            filesModified: 18,
            linesAdded: 342,
            linesRemoved: 587,
            testsRun: 12
          }
        });
        break;
        
      case 'error':
        console.log('🚨 Simulando error crítico...\n');
        result = await notifyDiego('error', 'Error Crítico', {
          error: 'Database unreachable',
          errorType: 'CONNECTION_ERROR',
          since: 'hace 12 minutos',
          attempts: 3,
          affectedUsers: '~8',
          context: 'Última petición exitosa: 14:23\nRequests fallidos: 47',
          action: 'Reinicio automático de dyno\nVerificación de DATABASE_URL'
        });
        break;
        
      case 'question':
        console.log('❓ Simulando pregunta...\n');
        result = await notifyDiego('question', 'Decisión Requerida', {
          task: 'Migrar formularios a Redis',
          taskNumber: 5,
          totalTasks: 12,
          reason: 'Cambio arquitectónico',
          context: 'Esto cambia la arquitectura de persistencia de PostgreSQL + memoria a Redis.',
          impact: 'Requiere REDIS_URL en Heroku',
          pros: [
            '40% más rápido',
            'Mejor manejo de concurrencia',
            'TTL automático para formularios'
          ],
          cons: [
            'Nueva dependencia',
            'Requiere migración de datos',
            'Más complejo de debuggear'
          ]
        });
        break;
        
      case 'checkpoint':
        console.log('🔵 Simulando checkpoint...\n');
        result = await notifyDiego('checkpoint', 'Checkpoint 2/3', {
          checkpoint: 2,
          totalCheckpoints: 3,
          block: 'Bloque 1 - Refactoring Templates',
          tasksCompleted: 4,
          time: '45 min',
          commit: 'v931',
          nextBlock: 'Bloque 2 - Dashboard',
          eta: '30-40 min',
          status: 'ok'
        });
        break;
        
      case 'all':
        console.log('🧪 Probando todos los tipos...\n');
        
        console.log('1️⃣ Test básico...');
        await testNotification();
        await sleep(3000);
        
        console.log('\n2️⃣ Success...');
        await notifyDiego('success', 'Test Success', { plan: 'test', tasks: 5, time: '1h' });
        await sleep(3000);
        
        console.log('\n3️⃣ Question...');
        await notifyDiego('question', 'Test Question', { task: 'Test', question: '¿Continuar?' });
        await sleep(3000);
        
        console.log('\n4️⃣ Error...');
        await notifyDiego('error', 'Test Error', { error: 'Test error', action: 'Nada crítico' });
        await sleep(3000);
        
        console.log('\n5️⃣ Checkpoint...');
        await notifyDiego('checkpoint', 'Test Checkpoint', { checkpoint: 1, totalCheckpoints: 1 });
        
        console.log('\n✅ Todos los tests enviados');
        return { success: true };
        
      default:
        console.error(`❌ Tipo de notificación desconocido: ${type}`);
        console.log('\nTipos válidos: test, success, error, question, checkpoint, all');
        process.exit(1);
    }
    
    console.log('📬 Resultado:', result);
    
    if (result.success) {
      console.log('\n✅ Notificación enviada exitosamente!');
      console.log('   Verifica tu WhatsApp personal.');
    } else {
      console.log(`\n⚠️  Notificación no enviada: ${result.reason || result.error || 'unknown'}`);
      if (result.fallback) {
        console.log(`   Fallback: ${result.fallback}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error en test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runTests();
