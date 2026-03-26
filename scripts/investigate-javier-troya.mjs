#!/usr/bin/env node
/**
 * 🔍 Script de investigación: Javier Troya
 * 
 * Todo #57: "ocultaste el prospecto de vehiculos de javier troya, agregar este prospecto"
 * 
 * Busca en todas las tablas posibles donde podría estar Javier Troya:
 * - leads (tabla principal)
 * - insurance_leads (Adriana específica)
 * - users (si fue contacto de coworking)
 * - arco_requests (LOPDP - podría haber pedido supresión)
 */

import databaseService from '../src/database/database.js';

async function investigateJavierTroya() {
  console.log('🔍 Investigando registros de Javier Troya...\n');

  try {
    await databaseService.initialize();

    // 1. Buscar en tabla leads (principal)
    console.log('📊 Buscando en tabla LEADS...');
    const leadsQuery = `
      SELECT id, name, phone, agent, status, interest_type, 
             metadata, created_at, updated_at, is_deleted
      FROM leads 
      WHERE (LOWER(name) LIKE '%troya%' OR LOWER(phone) LIKE '%troya%')
      ORDER BY created_at DESC;
    `;
    const leadsResults = await databaseService.all(leadsQuery);
    
    if (leadsResults.length > 0) {
      console.log(`✅ Encontrados ${leadsResults.length} registros en LEADS:`);
      leadsResults.forEach(lead => {
        console.log(`   - ID: ${lead.id}`);
        console.log(`     Nombre: ${lead.name}`);
        console.log(`     Teléfono: ${lead.phone}`);
        console.log(`     Agente: ${lead.agent}`);
        console.log(`     Status: ${lead.status}`);
        console.log(`     Tipo interés: ${lead.interest_type}`);
        console.log(`     Eliminado: ${lead.is_deleted ? 'SÍ' : 'NO'}`);
        console.log(`     Creado: ${lead.created_at}`);
        console.log(`     Metadata: ${JSON.stringify(lead.metadata, null, 2)}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron registros en LEADS\n');
    }

    // 2. Buscar en insurance_leads (Adriana específica)
    console.log('📊 Buscando en tabla INSURANCE_LEADS...');
    const insuranceQuery = `
      SELECT * 
      FROM insurance_leads 
      WHERE LOWER(name) LIKE '%troya%' OR LOWER(phone) LIKE '%troya%'
      ORDER BY created_at DESC;
    `;
    const insuranceResults = await databaseService.all(insuranceQuery);
    
    if (insuranceResults.length > 0) {
      console.log(`✅ Encontrados ${insuranceResults.length} registros en INSURANCE_LEADS:`);
      insuranceResults.forEach(lead => {
        console.log(`   - ID: ${lead.id}`);
        console.log(`     Nombre: ${lead.name}`);
        console.log(`     Teléfono: ${lead.phone}`);
        console.log(`     Status: ${lead.status}`);
        console.log(`     Creado: ${lead.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron registros en INSURANCE_LEADS\n');
    }

    // 3. Buscar en users (por si fue contacto de coworking)
    console.log('📊 Buscando en tabla USERS...');
    const usersQuery = `
      SELECT id, name, phone, email, created_at, profile
      FROM users 
      WHERE LOWER(name) LIKE '%troya%' OR LOWER(phone) LIKE '%troya%' OR LOWER(email) LIKE '%troya%'
      ORDER BY created_at DESC;
    `;
    const usersResults = await databaseService.all(usersQuery);
    
    if (usersResults.length > 0) {
      console.log(`✅ Encontrados ${usersResults.length} registros en USERS:`);
      usersResults.forEach(user => {
        console.log(`   - ID: ${user.id}`);
        console.log(`     Nombre: ${user.name}`);
        console.log(`     Teléfono: ${user.phone}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Creado: ${user.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron registros en USERS\n');
    }

    // 4. Buscar en arco_requests (LOPDP - solicitudes de supresión)
    console.log('📊 Buscando en tabla ARCO_REQUESTS (solicitudes LOPDP)...');
    const arcoQuery = `
      SELECT id, full_name, email, phone, request_type, status, 
             reason, resolved_at, created_at
      FROM arco_requests 
      WHERE LOWER(full_name) LIKE '%troya%' OR LOWER(email) LIKE '%troya%' OR LOWER(phone) LIKE '%troya%'
      ORDER BY created_at DESC;
    `;
    const arcoResults = await databaseService.all(arcoQuery);
    
    if (arcoResults.length > 0) {
      console.log(`⚠️  Encontrados ${arcoResults.length} registros en ARCO_REQUESTS:`);
      arcoResults.forEach(request => {
        console.log(`   - ID: ${request.id}`);
        console.log(`     Nombre: ${request.full_name}`);
        console.log(`     Email: ${request.email}`);
        console.log(`     Teléfono: ${request.phone}`);
        console.log(`     Tipo: ${request.request_type}`);
        console.log(`     Status: ${request.status}`);
        console.log(`     Razón: ${request.reason}`);
        console.log(`     Resuelto: ${request.resolved_at || 'Pendiente'}`);
        console.log(`     Creado: ${request.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron registros en ARCO_REQUESTS\n');
    }

    // 5. Resumen y recomendación
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📋 RESUMEN DE INVESTIGACIÓN');
    console.log('════════════════════════════════════════════════════════════════\n');
    
    const totalFound = leadsResults.length + insuranceResults.length + usersResults.length + arcoResults.length;
    
    if (totalFound === 0) {
      console.log('❌ NO SE ENCONTRÓ NINGÚN REGISTRO de Javier Troya en la BD');
      console.log('');
      console.log('🔧 ACCIÓN REQUERIDA:');
      console.log('   → Solicitar a Diego los datos del prospecto:');
      console.log('      - Nombre completo');
      console.log('      - Teléfono');
      console.log('      - Placa del vehículo');
      console.log('      - Marca/modelo del vehículo');
      console.log('   → Crear registro nuevo en tabla leads con agent="ADRIANA"');
    } else {
      console.log(`✅ Total de registros encontrados: ${totalFound}`);
      console.log('');
      
      if (arcoResults.length > 0 && arcoResults[0].status === 'resolved') {
        console.log('⚠️  ALERTA: Existe solicitud ARCO (LOPDP) resuelta');
        console.log('   → Javier Troya solicitó supresión/cancelación de datos');
        console.log('   → NO PODEMOS restaurar sin consentimiento explícito');
        console.log('   → ACCIÓN: Consultar a Diego si Javier dio nuevo consentimiento');
      } else if (leadsResults.length > 0 && leadsResults[0].is_deleted) {
        console.log('🔧 ACCIÓN: Restaurar registro existente');
        console.log(`   → UPDATE leads SET is_deleted = false, status = 'pending' WHERE id = ${leadsResults[0].id};`);
      } else if (leadsResults.length > 0) {
        console.log('✅ El prospecto YA EXISTE y está activo');
        console.log(`   → Status actual: ${leadsResults[0].status}`);
        console.log('   → Verificar dashboard Adriana para confirmar visibilidad');
      }
    }
    
    console.log('\n════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error durante la investigación:', error);
    process.exit(1);
  }
}

investigateJavierTroya();
