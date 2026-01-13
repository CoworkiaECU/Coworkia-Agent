#!/usr/bin/env node
/**
 * Script para limpiar PostgreSQL en Heroku (ÚNICA BASE DE DATOS)
 * Uso: node scripts/clear-database.js
 * 
 * ⚠️ LIMPIA LA BASE DE DATOS EN HEROKU - USAR CON PRECAUCIÓN
 */

import databaseService from '../src/database/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function clearDatabase() {
  try {
    console.log('🗑️  Limpiando PostgreSQL en Heroku...');
    console.log('⚠️  Esta operación limpia la ÚNICA base de datos de producción');
    
    await databaseService.initialize();
    
    const tables = [
      'partial_forms',
      'reservation_state',
      'interactions',
      'pending_confirmations',
      'reservations',
      'users'
    ];
    
    for (const table of tables) {
      console.log(`   Limpiando tabla: ${table}`);
      try {
        await databaseService.run(`DELETE FROM ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Error limpiando ${table}:`, error.message);
      }
    }
    
    // 🗑️ Limpiar archivo interactions.jsonl (si existe localmente)
    const interactionsFile = path.join(__dirname, '../data/interactions.jsonl');
    if (fs.existsSync(interactionsFile)) {
      console.log('   Limpiando archivo local: interactions.jsonl');
      fs.writeFileSync(interactionsFile, '', 'utf-8');
      console.log('   ✅ interactions.jsonl vaciado');
    }
    
    console.log('✅ PostgreSQL limpiado exitosamente');
    console.log('📊 Todas las tablas vaciadas en Heroku:');
    tables.forEach(t => console.log(`   - ${t}`));
    
    await databaseService.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
    process.exit(1);
  }
}

clearDatabase();
