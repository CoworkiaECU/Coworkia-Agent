#!/usr/bin/env node
/**
 * Script para resolver caso ARCO de Javier Troya
 * Solicitud de cancelación ejercida 23 Mar 2026
 * 
 * Acciones:
 * 1. Buscar registro en insurance_leads
 * 2. Registrar solicitud en arco_requests
 * 3. Borrar datos personales
 * 4. Confirmar ejecución
 */

import databaseService from '../src/database/database.js';

async function resolveJavierTroyaCase() {
  try {
    // Inicializar conexión a BD
    await databaseService.initialize();
    
    console.log('\n🔍 Buscando registro de Javier Troya...');
    
    // 1. Buscar en insurance_leads
    const existingRecords = await databaseService.all(
      `SELECT * FROM insurance_leads WHERE client_name ILIKE '%troya%'`
    );

    console.log(`✅ Encontrados ${existingRecords.length} registro(s):`);
    existingRecords.forEach(record => {
      console.log(`   - ID: ${record.id}, Nombre: ${record.client_name}, Email: ${record.client_email || 'N/A'}, Fecha: ${record.created_at}`);
    });

    if (existingRecords.length === 0) {
      console.log('⚠️ No se encontraron registros. Posible que ya hayan sido eliminados.');
      console.log('✅ Registrando solicitud ARCO de todas formas...\n');
    }

    // 2. Registrar en arco_requests
    console.log('📝 Registrando solicitud ARCO...');
    const arcoRecord = await databaseService.get(
      `INSERT INTO arco_requests 
       (request_type, full_name, email, description, status, resolved_at, notes)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id, created_at`,
      [
        'cancelacion',
        'Javier Troya',
        existingRecords[0]?.client_email || 'no-email-provided@coworkia.ec',
        'Solicitud de cancelación ejercida el 23 Mar 2026. Cliente solicitó borrar todos sus datos personales del sistema.',
        'resolved',
        `Datos eliminados de insurance_leads. ${existingRecords.length} registro(s) encontrado(s) y procesado(s).`
      ]
    );

    console.log(`✅ Solicitud ARCO registrada - ID: ${arcoRecord.id}\n`);

    // 3. Borrar registros
    if (existingRecords.length > 0) {
      console.log('🗑️ Eliminando datos personales...');
      const result = await databaseService.run(
        `DELETE FROM insurance_leads WHERE client_name ILIKE '%troya%'`
      );
      console.log(`✅ ${result.changes || existingRecords.length} registro(s) eliminado(s)\n`);
    }

    // 4. Verificar eliminación
    console.log('🔍 Verificando eliminación...');
    const verification = await databaseService.all(
      `SELECT * FROM insurance_leads WHERE client_name ILIKE '%troya%'`
    );

    if (verification.length === 0) {
      console.log('✅ Verificado: No quedan registros de Javier Troya\n');
    } else {
      console.error('❌ ERROR: Aún existen registros:', verification);
      process.exit(1);
    }

    // 5. Resumen final
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ CASO JAVIER TROYA RESUELTO');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📋 Solicitud ARCO ID: ${arcoRecord.id}`);
    console.log(`📅 Fecha resolución: ${new Date().toISOString()}`);
    console.log(`🗑️ Registros eliminados: ${existingRecords.length}`);
    console.log(`✅ Status: RESOLVED`);
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR ejecutando script:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
resolveJavierTroyaCase();
