/**
 * 🧹 Limpieza diaria automática - 00:00 Ecuador
 * 
 * Limpia datos temporales que ya no son necesarios:
 * - Formularios incompletos de reservas (>24h)
 * - Cotizaciones pendientes de Axel (>24h)
 * - Confirmaciones expiradas
 * - Estados de reserva antiguos (>48h)
 * 
 * Ejecutar:
 * - Automático: via cron-scheduler.js a las 00:00 diario
 * - Manual: node scripts/maintenance/daily-cleanup.js
 */

import databaseService from '../../src/database/database.js';

/**
 * 🧹 Ejecuta limpieza diaria de datos temporales
 */
export async function dailyCleanup() {
  const ecuadorNow = new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' });
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧹 [DAILY-CLEANUP] Iniciando limpieza diaria`);
  console.log(`📅 Fecha/hora Ecuador: ${ecuadorNow}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const results = {
    partialForms: 0,
    expiredConfirmations: 0,
    oldReservationStates: 0,
    axelQuoteForms: 0
  };
  
  try {
    // 1️⃣ Limpiar formularios parciales de reservas (>24h)
    console.log('[1/4] 🗑️  Limpiando formularios parciales de reservas...');
    const formsResult = await databaseService.run(`
      DELETE FROM partial_forms 
      WHERE form_type = 'reservation'
        AND created_at < datetime('now', '-1 day')
    `);
    results.partialForms = formsResult?.changes || 0;
    console.log(`      ✅ Formularios de reserva limpiados: ${results.partialForms}`);
    
    // 2️⃣ Limpiar formularios de cotización de Axel (>24h)
    console.log('[2/4] 🗑️  Limpiando formularios de cotización Axel...');
    const axelFormsResult = await databaseService.run(`
      DELETE FROM partial_forms 
      WHERE form_type = 'axel_quote'
        AND created_at < datetime('now', '-1 day')
    `);
    results.axelQuoteForms = axelFormsResult?.changes || 0;
    console.log(`      ✅ Formularios Axel limpiados: ${results.axelQuoteForms}`);
    
    // 3️⃣ Limpiar confirmaciones pendientes expiradas
    console.log('[3/4] 🗑️  Limpiando confirmaciones expiradas...');
    const confirmResult = await databaseService.run(`
      DELETE FROM pending_confirmations 
      WHERE expires_at IS NOT NULL 
        AND expires_at < datetime('now')
    `);
    results.expiredConfirmations = confirmResult?.changes || 0;
    console.log(`      ✅ Confirmaciones expiradas limpiadas: ${results.expiredConfirmations}`);
    
    // 4️⃣ Limpiar estados de reserva antiguos (>48h)
    console.log('[4/4] 🗑️  Limpiando estados de reserva antiguos...');
    const stateResult = await databaseService.run(`
      DELETE FROM reservation_state 
      WHERE created_at < datetime('now', '-2 days')
    `);
    results.oldReservationStates = stateResult?.changes || 0;
    console.log(`      ✅ Estados antiguos limpiados: ${results.oldReservationStates}`);
    
    // 📊 Resumen
    const totalCleaned = Object.values(results).reduce((sum, val) => sum + val, 0);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ [DAILY-CLEANUP] Limpieza completada exitosamente`);
    console.log(`📊 Total de registros limpiados: ${totalCleaned}`);
    console.log(`   - Formularios reservas: ${results.partialForms}`);
    console.log(`   - Formularios Axel: ${results.axelQuoteForms}`);
    console.log(`   - Confirmaciones: ${results.expiredConfirmations}`);
    console.log(`   - Estados: ${results.oldReservationStates}`);
    console.log(`${'='.repeat(60)}\n`);
    
    return { 
      success: true, 
      results,
      totalCleaned
    };
    
  } catch (error) {
    console.error('\n❌ [DAILY-CLEANUP] Error durante limpieza:', error);
    console.error('Stack trace:', error.stack);
    
    return { 
      success: false, 
      error: error.message,
      results
    };
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Ejecutando limpieza manual...\n');
  
  const result = await dailyCleanup();
  
  if (result.success) {
    console.log('✅ Limpieza manual completada exitosamente');
    process.exit(0);
  } else {
    console.error('❌ Limpieza manual falló:', result.error);
    process.exit(1);
  }
}

export default dailyCleanup;
