#!/usr/bin/env node
/**
 * Test manual del flujo de Aluna - captura de keyword
 */
import dotenv from 'dotenv';
import { captureAlunaLeadFromKeywords } from '../src/database/alunaRepository.js';
import databaseService from '../src/database/database.js';

dotenv.config();

(async () => {
  try {
    await databaseService.initialize();
    console.log('✅ Conexión establecida\n');

    const testPhone = '+593999TEST123';
    const testName = 'Test Usuario Plan20';
    const testMessage = 'Hola, quiero información sobre los planes de membresía mensual';

    console.log('═══ TEST DE CAPTURA DE KEYWORD ═══');
    console.log(`📱 Teléfono: ${testPhone}`);
    console.log(`👤 Nombre: ${testName}`);
    console.log(`💬 Mensaje: "${testMessage}"\n`);

    // Primero crear el usuario (requerido por foreign key)
    console.log('📝 Creando usuario de prueba...');
    await databaseService.run(
      `INSERT INTO users (phone_number, name, active_agent) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (phone_number) DO UPDATE SET name = EXCLUDED.name`,
      [testPhone, testName, 'ALUNA']
    );
    console.log('✅ Usuario creado\n');

    console.log('🔍 Ejecutando captureAlunaLeadFromKeywords...\n');
    await captureAlunaLeadFromKeywords(testPhone, testName, testMessage);

    // Verificar que se creó el lead
    console.log('\n🔎 Verificando lead creado...');
    const lead = await databaseService.get(
      `SELECT * FROM membership_leads WHERE user_phone = $1 ORDER BY created_at DESC LIMIT 1`,
      [testPhone]
    );

    if (lead) {
      console.log('✅ Lead capturado correctamente:');
      console.log(`   ID: ${lead.id}`);
      console.log(`   Nombre: ${lead.client_name}`);
      console.log(`   Teléfono: ${lead.user_phone}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Creado: ${new Date(lead.created_at).toLocaleString('es-EC')}`);
    } else {
      console.log('❌ No se encontró el lead');
    }

    // Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    await databaseService.run(
      `DELETE FROM membership_leads WHERE user_phone = $1`,
      [testPhone]
    );
    await databaseService.run(
      `DELETE FROM aluna_prospect_followups WHERE user_phone = $1`,
      [testPhone]
    );
    await databaseService.run(
      `DELETE FROM users WHERE phone_number = $1`,
      [testPhone]
    );
    console.log('✅ Datos de prueba eliminados\n');

    console.log('═══ TEST COMPLETADO EXITOSAMENTE ═══');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
