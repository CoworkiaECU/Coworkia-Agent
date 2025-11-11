#!/usr/bin/env node
/**
 * 🔄 Sistema de Backup Automático para SQLite
 * Crea copias de seguridad periódicas de la base de datos
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../data/coworkia.db');
const BACKUP_DIR = path.join(__dirname, '../data/backups');
const MAX_BACKUPS = 7; // Mantener últimos 7 backups

/**
 * 📁 Asegura que existe la carpeta de backups
 */
async function ensureBackupDir() {
  try {
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`[BACKUP] 📁 Directorio de backups listo: ${BACKUP_DIR}`);
  } catch (error) {
    console.error('[BACKUP] ❌ Error creando directorio de backups:', error);
    throw error;
  }
}

/**
 * 💾 Crea una copia de seguridad de la base de datos
 */
async function createBackup() {
  try {
    // Verificar que existe la DB
    if (!fs.existsSync(DB_PATH)) {
      console.warn('[BACKUP] ⚠️ Base de datos no encontrada en:', DB_PATH);
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
    const backupFilename = `coworkia_backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // Copiar archivo
    await fs.promises.copyFile(DB_PATH, backupPath);

    const stats = await fs.promises.stat(backupPath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`[BACKUP] ✅ Backup creado: ${backupFilename} (${sizeKB} KB)`);
    
    return {
      filename: backupFilename,
      path: backupPath,
      size: stats.size,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('[BACKUP] ❌ Error creando backup:', error);
    throw error;
  }
}

/**
 * 🧹 Limpia backups antiguos manteniendo solo los últimos MAX_BACKUPS
 */
async function cleanOldBackups() {
  try {
    const files = await fs.promises.readdir(BACKUP_DIR);
    const backups = files
      .filter(f => f.startsWith('coworkia_backup_') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        stat: fs.statSync(path.join(BACKUP_DIR, f))
      }))
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

    if (backups.length <= MAX_BACKUPS) {
      console.log(`[BACKUP] 📊 Total backups: ${backups.length}/${MAX_BACKUPS} - No se requiere limpieza`);
      return;
    }

    const toDelete = backups.slice(MAX_BACKUPS);
    
    for (const backup of toDelete) {
      await fs.promises.unlink(backup.path);
      console.log(`[BACKUP] 🗑️ Eliminado backup antiguo: ${backup.name}`);
    }

    console.log(`[BACKUP] 🧹 Limpieza completada: ${toDelete.length} backups eliminados`);
  } catch (error) {
    console.error('[BACKUP] ❌ Error limpiando backups:', error);
  }
}

/**
 * 📋 Lista todos los backups disponibles
 */
async function listBackups() {
  try {
    const files = await fs.promises.readdir(BACKUP_DIR);
    const backups = files
      .filter(f => f.startsWith('coworkia_backup_') && f.endsWith('.db'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          size: (stat.size / 1024).toFixed(2) + ' KB',
          date: stat.mtime.toLocaleString()
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(`\n[BACKUP] 📋 Backups disponibles (${backups.length}):\n`);
    backups.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.name}`);
      console.log(`     Tamaño: ${b.size}, Fecha: ${b.date}\n`);
    });

    return backups;
  } catch (error) {
    console.error('[BACKUP] ❌ Error listando backups:', error);
    return [];
  }
}

/**
 * 🚀 Ejecuta el proceso completo de backup
 */
async function runBackup() {
  console.log('[BACKUP] 🚀 Iniciando proceso de backup...\n');

  try {
    await ensureBackupDir();
    const backup = await createBackup();
    
    if (backup) {
      await cleanOldBackups();
      console.log('\n[BACKUP] ✅ Proceso completado exitosamente');
      return backup;
    } else {
      console.log('\n[BACKUP] ⚠️ No se creó backup (DB no encontrada)');
      return null;
    }
  } catch (error) {
    console.error('\n[BACKUP] ❌ Proceso de backup falló:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (process.argv[1] === __filename) {
  const command = process.argv[2];

  if (command === 'list') {
    listBackups();
  } else {
    runBackup()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

export { runBackup, createBackup, cleanOldBackups, listBackups };
