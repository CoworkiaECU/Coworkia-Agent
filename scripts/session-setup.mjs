#!/usr/bin/env node
/**
 * 🚀 Setup de Sesión Coworkia Agent
 * 
 * Este script configura el workspace al iniciar una sesión de trabajo:
 * - Encuentra el plan de vuelo más reciente
 * - Sugiere archivos a abrir en dos paneles
 * - Muestra resumen del estado del proyecto
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(emoji, text, color = '') {
  console.log(`${color}${emoji} ${text}${colors.reset}`);
}

function findLatestFlightPlan() {
  const planesDir = path.join(ROOT_DIR, 'planes-de-vuelo');
  
  if (!fs.existsSync(planesDir)) {
    return null;
  }

  const files = fs.readdirSync(planesDir)
    .filter(f => f.startsWith('plan-vuelo-') && f.endsWith('.md'))
    .sort()
    .reverse();

  return files.length > 0 ? files[0] : null;
}

function getTodayFlightPlan() {
  const today = new Date();
  const day = today.getDate();
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const month = monthNames[today.getMonth()];
  
  // Intentar varios formatos
  const formats = [
    `plan-vuelo-${day}${month}.md`,
    `plan-vuelo-${String(day).padStart(2, '0')}${month}.md`,
    `plan-vuelo-${day}mar.md`, // Específico para marzo
  ];

  const planesDir = path.join(ROOT_DIR, 'planes-de-vuelo');
  
  for (const format of formats) {
    const filePath = path.join(planesDir, format);
    if (fs.existsSync(filePath)) {
      return format;
    }
  }

  return null;
}

function getQueueStatus() {
  const queuePath = path.join(ROOT_DIR, 'planes-de-vuelo', 'queue.json');
  
  if (!fs.existsSync(queuePath)) {
    return null;
  }

  try {
    const queueData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    return queueData;
  } catch (error) {
    return null;
  }
}

function main() {
  console.clear();
  
  log('🚀', '═══════════════════════════════════════════════', colors.bright + colors.cyan);
  log('🤖', '  COWORKIA AGENT - SESSION SETUP', colors.bright + colors.cyan);
  log('📋', '  Configuración de Workspace Dual Panel', colors.cyan);
  log('🚀', '═══════════════════════════════════════════════\n', colors.bright + colors.cyan);

  // 1. Plan de vuelo del día
  const todayPlan = getTodayFlightPlan();
  const latestPlan = findLatestFlightPlan();

  if (todayPlan) {
    log('✅', `Plan del día encontrado: ${todayPlan}`, colors.green);
  } else if (latestPlan) {
    log('⚠️', `Plan del día no encontrado, usando el más reciente: ${latestPlan}`, colors.yellow);
  } else {
    log('❌', 'No hay planes de vuelo disponibles', colors.yellow);
  }

  const planToOpen = todayPlan || latestPlan;

  // 2. Queue status
  const queue = getQueueStatus();
  if (queue && queue.queue) {
    const current = queue.queue.find(p => p.status === 'in-progress');
    const pending = queue.queue.filter(p => p.status === 'pending').length;
    
    if (current) {
      log('🔄', `Trabajo en progreso: ${current.plan}`, colors.blue);
    }
    if (pending > 0) {
      log('📊', `Planes pendientes en cola: ${pending}`, colors.blue);
    }
  }

  // 3. Archivos sugeridos para abrir
  console.log('');
  log('📂', '═══ ARCHIVOS A ABRIR ═══', colors.bright);
  console.log('');

  log('📄', 'PANEL IZQUIERDO (Contexto):', colors.magenta);
  if (planToOpen) {
    console.log(`   ${colors.cyan}→ planes-de-vuelo/${planToOpen}${colors.reset}`);
  } else {
    console.log(`   ${colors.cyan}→ .github/skills/coworkia-memory/SKILL.md${colors.reset}`);
  }

  console.log('');
  log('💬', 'PANEL DERECHO:', colors.magenta);
  console.log(`   ${colors.cyan}→ Chat de Copilot (activo)${colors.reset}`);

  // 4. Comandos VS Code
  console.log('');
  log('⌨️', '═══ COMANDOS VS CODE ═══', colors.bright);
  console.log('');
  
  if (planToOpen) {
    console.log(`   ${colors.yellow}# Abrir plan de vuelo:${colors.reset}`);
    console.log(`   code planes-de-vuelo/${planToOpen}`);
  }
  
  console.log('');
  console.log(`   ${colors.yellow}# Split editor vertical (⌘+\\):${colors.reset}`);
  console.log(`   cmd+shift+p → "View: Split Editor Right"`);
  
  console.log('');
  console.log(`   ${colors.yellow}# Abrir chat en panel derecho:${colors.reset}`);
  console.log(`   GitHub Copilot Chat ya debe estar visible`);

  // 5. Resumen del proyecto
  console.log('');
  log('📊', '═══ ESTADO DEL PROYECTO ═══', colors.bright);
  console.log('');
  
  log('✅', 'Aluna: Follow-ups D+1 y D+3 funcionando', colors.green);
  log('✅', 'Aurora: Sistema estable 100%', colors.green);
  log('⏳', 'Pendiente: Tracking de respuestas Aluna', colors.yellow);
  log('⏳', 'Pendiente: Métricas dashboard', colors.yellow);

  // 6. Siguiente paso
  console.log('');
  log('🎯', '═══ LISTO PARA TRABAJAR ═══', colors.bright + colors.green);
  console.log('');
  console.log(`   ${colors.cyan}¿Continuamos con el plan o hay algo nuevo?${colors.reset}`);
  console.log('');
  
  log('🚀', '═══════════════════════════════════════════════\n', colors.bright + colors.cyan);
}

main();
