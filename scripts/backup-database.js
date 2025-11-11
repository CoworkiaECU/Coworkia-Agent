#!/usr/bin/env node
/**
 * 🔄 Sistema de Backup Automático para SQLite
 * Crea copias de seguridad periódicas de la base de datos
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../data/coworkia.db');
const BACKUP_DIR = path.join(__dirname, '../data/backups');
const MAX_BACKUPS = 7; // Mantener últimos 7 backups
const REMOTE_MIRROR_DIR = process.env.BACKUP_REMOTE_DIR;
const UPLOAD_COMMAND_TEMPLATE = process.env.BACKUP_UPLOAD_COMMAND || process.env.BACKUP_SYNC_COMMAND;
const exec = promisify(execCallback);

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

    const backupInfo = {
      filename: backupFilename,
      path: backupPath,
      size: stats.size,
      timestamp: new Date()
    };

    // Copiar a carpeta espejo si se configuró
    if (REMOTE_MIRROR_DIR) {
      const mirrorPath = path.join(REMOTE_MIRROR_DIR, backupFilename);
      await fs.promises.mkdir(REMOTE_MIRROR_DIR, { recursive: true });
      await fs.promises.copyFile(backupPath, mirrorPath);
      console.log(`[BACKUP] 📦 Copia espejo guardada en: ${mirrorPath}`);
    }

    // Ejecutar comando de subida (ej. aws s3 cp)
    if (UPLOAD_COMMAND_TEMPLATE) {
      await uploadBackup(backupInfo);
    }

    return backupInfo;
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
 * ☁️ Sube el backup usando un comando externo (ej. AWS CLI, rclone)
 */
async function uploadBackup(backupInfo) {
  if (!UPLOAD_COMMAND_TEMPLATE) {
    console.log('[BACKUP] ⚠️ BACKUP_UPLOAD_COMMAND no configurado, saltando subida remota');
    return null;
  }
  
  // Construir comando con placeholders
  let command = UPLOAD_COMMAND_TEMPLATE
    .replace('{file}', backupInfo.path)
    .replace('{filename}', backupInfo.filename);
  
  // Si hay destino remoto, agregarlo al comando
  if (REMOTE_MIRROR_DIR) {
    command += ` ${REMOTE_MIRROR_DIR}/${backupInfo.filename}`;
  }
  
  console.log(`[BACKUP] ☁️ Subiendo backup...`);
  console.log(`[BACKUP] 📤 Comando: ${command}`);
  
  try {
    const { stdout, stderr } = await exec(command, { 
      env: process.env,
      timeout: 60000 // 1 minuto timeout
    });
    
    if (stdout) console.log(`[BACKUP] ☁️ Resultado: ${stdout.trim()}`);
    if (stderr && !stderr.includes('warning')) {
      console.warn(`[BACKUP] ⚠️ Avisos: ${stderr.trim()}`);
    }
    
    console.log('[BACKUP] ✅ Backup cargado correctamente al destino remoto');
    return true;
  } catch (error) {
    console.error('[BACKUP] ❌ Error subiendo backup remoto:', error.message);
    console.error('[BACKUP] 💡 Tip: Verifica que las credenciales (AWS_*, GOOGLE_*) estén configuradas');
    throw error;
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
