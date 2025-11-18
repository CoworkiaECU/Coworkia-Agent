#!/usr/bin/env node
/**
 * Script para limpiar toda la base de datos
 * Uso: node scripts/clear-database.js
 */

import databaseService from '../src/database/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function clearDatabase() {
  try {
    console.log('🗑️  Limpiando base de datos...');
    
    await databaseService.initialize();
    
    const tables = [
      'interactions',
      'conversation_history',
      'reservation_state',
      'pending_confirmations',
      'reservations',
      'users'
    ];
    
    for (const table of tables) {
      console.log(`   Limpiando tabla: ${table}`);
      try {
        await databaseService.run(`DELETE FROM ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Tabla ${table} no existe o ya está vacía`);
      }
    }
    
    // 🗑️ Limpiar archivo interactions.jsonl
    const interactionsFile = path.join(__dirname, '../data/interactions.jsonl');
    if (fs.existsSync(interactionsFile)) {
      console.log('   Limpiando archivo: interactions.jsonl');
      fs.writeFileSync(interactionsFile, '', 'utf-8');
      console.log('   ✅ interactions.jsonl vaciado');
    }
    
    console.log('✅ Base de datos limpiada exitosamente');
    console.log('📊 Todas las tablas vaciadas:');
    tables.forEach(t => console.log(`   - ${t}`));
    console.log('   - interactions.jsonl');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
    process.exit(1);
  }
}

clearDatabase();
