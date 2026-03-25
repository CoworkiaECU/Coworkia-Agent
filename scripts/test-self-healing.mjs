/**
 * Test manual del sistema Self-Healing
 * Ejecuta una vez el análisis completo y muestra resultados
 */

import { runSelfHealing } from '../src/cron/self-healing-cron.js';
import databaseService from '../src/database/database.js';

console.log('🔧 Testing Self-Healing System...\n');

try {
  await databaseService.initialize();
  console.log('✅ Database inicializada\n');

  const result = await runSelfHealing();

  console.log('\n📊 RESULTADO:');
  console.log(JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('\n✅ Self-Healing ejecutado correctamente');
    console.log(`   - Errores encontrados: ${result.errorsFound}`);
    console.log(`   - Conversaciones fallidas: ${result.conversationsFailed}`);
    console.log(`   - Issues generados: ${result.issuesGenerated}`);
    if (result.planFile) {
      console.log(`   - Plan guardado: ${result.planFile}`);
    }
  } else {
    console.log('\n❌ Self-Healing falló');
    console.log(`   Error: ${result.error}`);
  }

  process.exit(0);
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
