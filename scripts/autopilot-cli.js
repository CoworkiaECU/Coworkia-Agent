#!/usr/bin/env node
/**
 * 🚀 Autopilot CLI
 * Comando para iniciar, pausar, resumir y monitorear autopilot
 * 
 * USAGE:
 *   node scripts/autopilot-cli.js start plan-vuelo-20mar.md
 *   node scripts/autopilot-cli.js pause
 *   node scripts/autopilot-cli.js resume
 *   node scripts/autopilot-cli.js status
 *   node scripts/autopilot-cli.js demo
 */

import { 
  startAutopilot, 
  pauseAutopilot, 
  resumeAutopilot, 
  getExecutionState,
  runAutopilotDemo
} from '../src/servicios/autopilot-engine.js';

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  console.log('🤖 Autopilot CLI\n');
  
  switch (command) {
    case 'start':
      if (!arg) {
        console.error('❌ Error: Especifica un archivo de plan');
        console.log('Ejemplo: node scripts/autopilot-cli.js start plan-vuelo-20mar.md');
        process.exit(1);
      }
      
      console.log(`🚀 Iniciando autopilot con plan: ${arg}`);
      const startResult = await startAutopilot(arg);
      
      if (startResult.success) {
        console.log(`✅ Autopilot iniciado correctamente`);
        console.log(`📋 Plan: ${startResult.plan}`);
        console.log(`📝 Tareas: ${startResult.tasks}`);
      } else {
        console.error(`❌ Error: ${startResult.reason || startResult.error}`);
        process.exit(1);
      }
      break;
      
    case 'pause':
      console.log('⏸️ Pausando autopilot...');
      const pauseResult = pauseAutopilot('manual_cli');
      
      if (pauseResult.success) {
        console.log('✅ Autopilot pausado');
        console.log(`📊 Progreso: ${pauseResult.state.tasksCompleted}/${pauseResult.state.tasksTotal}`);
      } else {
        console.error(`❌ Error: ${pauseResult.reason}`);
      }
      break;
      
    case 'resume':
      console.log('▶️ Resumiendo autopilot...');
      const resumeResult = resumeAutopilot();
      
      if (resumeResult.success) {
        console.log('✅ Autopilot resumido');
      } else {
        console.error(`❌ Error: ${resumeResult.reason}`);
      }
      break;
      
    case 'status':
      const state = getExecutionState();
      
      console.log('📊 Estado del Autopilot\n');
      console.log(`Estado: ${state.running ? '🟢 Ejecutando' : '⏸️ Pausado'}`);
      console.log(`Plan: ${state.currentPlan || 'N/A'}`);
      console.log(`Progreso: ${state.tasksCompleted}/${state.tasksTotal} tareas`);
      console.log(`Errores: ${state.errors.length}`);
      
      if (state.currentTask) {
        console.log(`\nTarea actual: ${state.currentTask.description}`);
      }
      
      if (state.startedAt) {
        const elapsed = Math.floor((Date.now() - state.startedAt.getTime()) / 1000 / 60);
        console.log(`Tiempo transcurrido: ${elapsed} minutos`);
      }
      
      if (state.errors.length > 0) {
        console.log('\n❌ Errores recientes:');
        state.errors.slice(-3).forEach(err => {
          console.log(`   - ${err.task}: ${err.error}`);
        });
      }
      break;
      
    case 'demo':
      console.log('🎭 Ejecutando demo...');
      await runAutopilotDemo();
      console.log('✅ Demo completado\n');
      console.log('Verifica tu WhatsApp para las notificaciones enviadas');
      // Esperar 5 segundos antes de salir para que se envíen las notificaciones
      await new Promise(resolve => setTimeout(resolve, 5000));
      break;
      
    default:
      console.log('❓ Comando no reconocido\n');
      console.log('Comandos disponibles:');
      console.log('  start <plan>  - Inicia autopilot con un plan');
      console.log('  pause         - Pausa la ejecución');
      console.log('  resume        - Resume la ejecución');
      console.log('  status        - Muestra estado actual');
      console.log('  demo          - Ejecuta demo con notificaciones');
      console.log('\nEjemplo:');
      console.log('  node scripts/autopilot-cli.js start plan-vuelo-20mar.md');
      process.exit(1);
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
