#!/usr/bin/env node
/**
 * 🚀 Script de restauración: Javier Troya como prospecto Adriana
 * 
 * Todo #57: "ocultaste el prospecto de vehiculos de javier troya, agregar este prospecto"
 * 
 * CONTEXTO:
 * - Javier Troya existe en tabla users con agente AURORA (coworking)
 * - Ahora también quiere cotizar seguro de vehículos
 * - Cre</p>aremos registro en adriana_quote_leads para que aparezca en dashboard
 */

import databaseService from '../src/database/database.js';

async function restoreJavierTroyaProspect() {
  console.log('🚀 Restaurando prospecto Javier Troya en Adriana...\n');

  try {
    await databaseService.initialize();

    const phone = '+593983765432';
    const clientName = 'Javier Troya';
    const email = 'jota@nube.ec';

    // 1. Verificar si YA existe en adriana_quote_leads (por si acaso)
    console.log('📊 Verificando si ya existe en adriana_quote_leads...');
    const existingQuery = `
      SELECT * FROM adriana_quote_leads WHERE phone = $1
    `;
    const existing = await databaseService.get(existingQuery, [phone]);

    if (existing) {
      console.log(`✅ El prospecto YA EXISTE en adriana_quote_leads:`);
      console.log(`   - ID: ${existing.id}`);
      console.log(`   - Status: ${existing.status}`);
      console.log(`   - Creado: ${existing.created_at}`);
      console.log('\n🎯 No hay nada que hacer. El prospecto ya está visible en el dashboard.\n');
      return;
    }

    // 2. Crear registro nuevo en adriana_quote_leads
    console.log(`📝 Creando prospecto en adriana_quote_leads...`);
    const insertQuery = `
      INSERT INTO adriana_quote_leads (
        phone,
        client_name,
        client_email,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;

    const newLead = await databaseService.get(insertQuery, [
      phone,
      clientName,
      email,
      'gathering_vehicle' // Status inicial por defecto
    ]);

    console.log('\n✅ PROSPECTO CREADO EXITOSAMENTE:');
    console.log(`   - ID: ${newLead.id}`);
    console.log(`   - Nombre: ${newLead.client_name}`);
    console.log(`   - Teléfono: ${newLead.phone}`);
    console.log(`   - Email: ${newLead.client_email}`);
    console.log(`   - Status: ${newLead.status}`);
    console.log(`   - Creado: ${newLead.created_at}`);
    console.log('');

    console.log('🎯 SIGUIENTE PASO:');
    console.log('   → Verificar en dashboard Adriana: https://coworkia-agent-e97d15dac56f.herokuapp.com/adriana-seguros.html');
    console.log('   → Javier Troya debería aparecer en la lista de prospectos');
    console.log('   → Si Diego tiene sus datos de vehículo, puede continuar con la cotización\n');

    console.log('════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
    process.exit(1);
  }
}

restoreJavierTroyaProspect();
