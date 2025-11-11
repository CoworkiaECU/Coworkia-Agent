import 'dotenv/config';
import { fileURLToPath } from 'url';
import databaseService from '../src/database/database.js';
import {
  cleanupExpiredConfirmations as cleanupExpiredConfirmationsCore,
  cleanupJustConfirmedFlags as cleanupJustConfirmedFlagsCore
} from '../src/servicios/reservation-state.js';

const DEFAULT_INTERACTION_RETENTION_DAYS = parseInt(process.env.INTERACTIONS_RETENTION_DAYS || '90', 10);

async function ensureDatabaseReady() {
  if (!databaseService.isInitialized) {
    await databaseService.initialize();
  }
}

async function countExpiredConfirmations() {
  const row = await databaseService.get(
    'SELECT COUNT(*) as total FROM pending_confirmations WHERE expires_at IS NOT NULL AND expires_at < ?',
    [new Date().toISOString()]
  );
  return row?.total || 0;
}

async function countExpiredJustConfirmedFlags() {
  const row = await databaseService.get(
    'SELECT COUNT(*) as total FROM reservation_state WHERE just_confirmed_until IS NOT NULL AND just_confirmed_until < ?',
    [new Date().toISOString()]
  );
  return row?.total || 0;
}

async function countOldInteractions(retentionDays = DEFAULT_INTERACTION_RETENTION_DAYS) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - retentionDays);
  const row = await databaseService.get(
    'SELECT COUNT(*) as total FROM interactions WHERE timestamp IS NOT NULL AND timestamp < ?',
    [threshold.toISOString()]
  );
  return row?.total || 0;
}

export async function cleanupExpiredConfirmations({ dryRun = false } = {}) {
  await ensureDatabaseReady();
  if (dryRun) {
    return await countExpiredConfirmations();
  }
  return await cleanupExpiredConfirmationsCore();
}

export async function cleanupJustConfirmedFlags({ dryRun = false } = {}) {
  await ensureDatabaseReady();
  if (dryRun) {
    return await countExpiredJustConfirmedFlags();
  }
  return await cleanupJustConfirmedFlagsCore();
}

export async function cleanupOldInteractions({ retentionDays = DEFAULT_INTERACTION_RETENTION_DAYS, dryRun = false } = {}) {
  await ensureDatabaseReady();
  if (dryRun) {
    return await countOldInteractions(retentionDays);
  }
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - retentionDays);
  const result = await databaseService.run(
    'DELETE FROM interactions WHERE timestamp IS NOT NULL AND timestamp < ?',
    [threshold.toISOString()]
  );
  return result?.changes || 0;
}

export async function runAllCleanups({ dryRun = false, retentionDays = DEFAULT_INTERACTION_RETENTION_DAYS } = {}) {
  const confirmations = await cleanupExpiredConfirmations({ dryRun });
  const justConfirmed = await cleanupJustConfirmedFlags({ dryRun });
  const interactions = await cleanupOldInteractions({ dryRun, retentionDays });
  return { confirmations, justConfirmed, interactions };
}

async function cli() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const daysArg = args.find(arg => arg.startsWith('--days='));
  const retentionDays = daysArg ? parseInt(daysArg.split('=')[1], 10) : DEFAULT_INTERACTION_RETENTION_DAYS;

  try {
    const summary = await runAllCleanups({ dryRun, retentionDays });
    const verb = dryRun ? 'Detectadas' : 'Eliminadas';
    console.log(`[CLEANUP] ${verb} ${summary.confirmations} confirmaciones expiradas`);
    console.log(`[CLEANUP] ${verb} ${summary.justConfirmed} flags justConfirmed`);
    console.log(`[CLEANUP] ${verb} ${summary.interactions} interacciones (> ${retentionDays} días)`);
    process.exit(0);
  } catch (error) {
    console.error('[CLEANUP] ❌ Error ejecutando limpieza:', error);
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  cli();
}
