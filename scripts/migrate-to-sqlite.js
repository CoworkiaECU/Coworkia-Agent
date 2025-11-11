#!/usr/bin/env node

/**
 * 🔄 Script de migración de datos JSON a SQLite
 * Migra perfiles e interacciones existentes a la nueva base de datos
 */

import fs from 'fs';
import path from 'path';
import databaseService from '../src/database/database.js';
import userRepository from '../src/database/userRepository.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const INTERACTIONS_FILE = path.join(DATA_DIR, 'interactions.jsonl');

console.log('🔄 INICIANDO MIGRACIÓN JSON → SQLite');
console.log('=====================================');

async function migrateProfiles() {
  console.log('\n📁 Migrando perfiles de usuarios...');
  
  if (!fs.existsSync(PROFILES_FILE)) {
    console.log('⚠️ No se encontró profiles.json - saltando migración de perfiles');
    return;
  }
  
  try {
    const content = await fs.promises.readFile(PROFILES_FILE, 'utf-8');
    const profiles = JSON.parse(content);
    
    let migrated = 0;
    let errors = 0;
    
    for (const [phoneNumber, profile] of Object.entries(profiles)) {
      try {
        // Convertir formato JSON a formato SQLite
        const userData = {
          name: profile.name || null,
          email: profile.email || null,
          whatsapp_display_name: profile.whatsappDisplayName || null,
          first_visit: profile.firstVisit !== false, // Default true
          free_trial_used: profile.freeTrialUsed || false,
          free_trial_date: profile.freeTrialDate || null,
          conversation_count: profile.conversationCount || 0,
          last_message_at: profile.lastMessageAt || new Date().toISOString()
        };
        
        await userRepository.createOrUpdate(phoneNumber, userData);
        migrated++;
        
        console.log(`  ✅ ${phoneNumber} (${profile.name || 'Sin nombre'})`);
      } catch (error) {
        errors++;
        console.error(`  ❌ Error migrando ${phoneNumber}:`, error.message);
      }
    }
    
    console.log(`\n📊 Perfiles migrados: ${migrated}`);
    console.log(`❌ Errores: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error leyendo profiles.json:', error);
  }
}

async function migrateInteractions() {
  console.log('\n💬 Migrando interacciones...');
  
  if (!fs.existsSync(INTERACTIONS_FILE)) {
    console.log('⚠️ No se encontró interactions.jsonl - saltando migración de interacciones');
    return;
  }
  
  try {
    const content = await fs.promises.readFile(INTERACTIONS_FILE, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    let migrated = 0;
    let errors = 0;
    
    for (const line of lines) {
      try {
        const interaction = JSON.parse(line);
        
        const query = `
          INSERT INTO interactions (
            user_phone, agent, agent_name, intent_reason,
            input, output, meta, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          interaction.userId,
          interaction.agent,
          interaction.agentName,
          interaction.intentReason,
          interaction.input,
          interaction.output,
          JSON.stringify(interaction.meta || {}),
          interaction.timestamp || new Date().toISOString()
        ];
        
        await databaseService.run(query, params);
        migrated++;
        
        if (migrated % 100 === 0) {
          console.log(`  📈 ${migrated} interacciones migradas...`);
        }
        
      } catch (error) {
        errors++;
        if (errors < 5) { // Solo mostrar primeros 5 errores
          console.error(`  ❌ Error migrando interacción:`, error.message);
        }
      }
    }
    
    console.log(`\n📊 Interacciones migradas: ${migrated}`);
    console.log(`❌ Errores: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error leyendo interactions.jsonl:', error);
  }
}

async function createBackup() {
  console.log('\n💾 Creando backup de archivos JSON...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(DATA_DIR, 'backup', timestamp);
  
  try {
    await fs.promises.mkdir(backupDir, { recursive: true });
    
    if (fs.existsSync(PROFILES_FILE)) {
      await fs.promises.copyFile(
        PROFILES_FILE, 
        path.join(backupDir, 'profiles.json')
      );
      console.log('  ✅ profiles.json respaldado');
    }
    
    if (fs.existsSync(INTERACTIONS_FILE)) {
      await fs.promises.copyFile(
        INTERACTIONS_FILE, 
        path.join(backupDir, 'interactions.jsonl')
      );
      console.log('  ✅ interactions.jsonl respaldado');
    }
    
    console.log(`📁 Backup guardado en: ${backupDir}`);
    
  } catch (error) {
    console.error('❌ Error creando backup:', error);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verificando migración...');
  
  try {
    const stats = await userRepository.getStats();
    console.log(`👤 Usuarios en SQLite: ${stats.total_users}`);
    console.log(`🆕 Usuarios nuevos: ${stats.new_users}`);
    console.log(`✅ Trial usado: ${stats.trial_used_users}`);
    
    const interactionCount = await databaseService.get('SELECT COUNT(*) as count FROM interactions');
    console.log(`💬 Interacciones en SQLite: ${interactionCount.count}`);
    
  } catch (error) {
    console.error('❌ Error verificando migración:', error);
  }
}

// Script principal
async function main() {
  try {
    // Inicializar base de datos
    console.log('🚀 Inicializando SQLite...');
    await databaseService.initialize();
    console.log('✅ SQLite inicializada');
    
    // Crear backup antes de migrar
    await createBackup();
    
    // Migrar datos
    await migrateProfiles();
    await migrateInteractions();
    
    // Verificar resultado
    await verifyMigration();
    
    console.log('\n🎉 MIGRACIÓN COMPLETADA');
    console.log('=======================');
    console.log('La aplicación ahora puede usar SQLite.');
    console.log('Los archivos JSON originales han sido respaldados.');
    
  } catch (error) {
    console.error('\n💥 ERROR EN MIGRACIÓN:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await databaseService.close();
    process.exit(0);
  }
}

// Ejecutar migración si es llamado directamente
if (process.argv[1].endsWith('migrate-to-sqlite.js')) {
  main();
}

export default main;