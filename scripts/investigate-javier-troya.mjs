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

    // 1. Buscar en tabla adriana_quote_leads (cotizaciones Adriana)
    console.log('📊 Buscando en tabla ADRIANA_QUOTE_LEADS...');
    const adrianaQuotesQuery = `
      SELECT * 
      FROM adriana_quote_leads 
      WHERE LOWER(client_name) LIKE '%troya%' OR LOWER(phone) LIKE '%troya%'
      ORDER BY created_at DESC;
    `;
    const adrianaQuotesResults = await databaseService.all(adrianaQuotesQuery);
    
    if (adrianaQuotesResults.length > 0) {
      console.log(`✅ Encontrados ${adrianaQuotesResults.length} registros en ADRIANA_QUOTE_LEADS:`);
      adrianaQuotesResults.forEach(lead => {
        console.log(`   - ID: ${lead.id}`);
        console.log(`     Nombre: ${lead.client_name}`);
        console.log(`     Teléfono: ${lead.phone}`);
        console.log(`     Status: ${lead.status}`);
        console.log(`     Vehículo: ${JSON.stringify(lead.vehicle_data)}`);
        console.log(`     Creado: ${lead.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron registros en ADRIANA_QUOTE_LEADS\n');
    }

    // 2. Buscar en insurance_leads (Adriana específica - tabla antigua)
    console.log('📊 Buscando en tabla INSURANCE_LEADS...');
    const insuranceQuery = `
      SELECT * 
      FROM insurance_leads 
      WHERE LOWER(client_name) LIKE '%troya%' OR LOWER(phone) LIKE '%troya%' OR LOWER(user_phone) LIKE '%troya%'
      ORDER BY created_at DESC;
    `;
    const insuranceResults = await databaseService.all(insuranceQuery);
    
    if (insuranceResults.length > 0) {
      console.log(`✅ Encontrados ${insuranceResults.length} registros en INSURANCE_LEADS:`);
      insuranceResults.forEach(lead => {
        console.log(`   - ID: ${lead.id}`);
        console.log(`     Nombre: ${lead.client_name}`);
        console.log(`     Teléfono: ${lead.phone || lead.user_phone}`);
        console.log(`     Placa: ${lead.plate}`);
        console.log(`     Vehículo: ${lead.vehicle_brand} ${lead.vehicle_model} ${lead.vehicle_year}`);
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
      SELECT phone_number, name, email, created_at, active_agent
      FROM users 
      WHERE LOWER(name) LIKE '%troya%' OR LOWER(phone_number) LIKE '%troya%' OR LOWER(email) LIKE '%troya%'
      ORDER BY created_at DESC;
    `;
    const usersResults = await databaseService.all(usersQuery);
    
    if (usersResults.length > 0) {
      console.log(`✅ Encontrados ${usersResults.length} registros en USERS:`);
      usersResults.forEach(user => {
        console.log(`   - Teléfono: ${user.phone_number}`);
        console.log(`     Nombre: ${user.name}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Agente activo: ${user.active_agent}`);
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
             description, notes, resolved_at, created_at
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
        console.log(`     Descripción: ${request.description}`);
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
    
    const totalFound = adrianaQuotesResults.length + insuranceResults.length + usersResults.length + arcoResults.length;
    
    if (totalFound === 0) {
      console.log('❌ NO SE ENCONTRÓ NINGÚN REGISTRO de Javier Troya en la BD');
      console.log('');
      console.log('🔧 ACCIÓN REQUERIDA:');
      console.log('   → Solicitar a Diego los datos del prospecto:');
      console.log('      - Nombre completo');
      console.log('      - Teléfono');
      console.log('      - Placa del vehículo');
      console.log('      - Marca/modelo del vehículo');
      console.log('   → Crear registro nuevo en tabla adriana_quote_leads');
    } else {
      console.log(`✅ Total de registros encontrados: ${totalFound}`);
      console.log('');
      
      if (arcoResults.length > 0 && arcoResults[0].status === 'resolved') {
        console.log('⚠️  ALERTA: Existe solicitud ARCO (LOPDP) resuelta');
        console.log('   → Javier Troya solicitó supresión/cancelación de datos');
        console.log('   → NO PODEMOS restaurar sin consentimiento explícito');
        console.log('   → ACCIÓN: Consultar a Diego si Javier dio nuevo consentimiento');
      } else if (adrianaQuotesResults.length > 0) {
        console.log('✅ El prospecto YA EXISTE en ADRIANA_QUOTE_LEADS');
        console.log(`   → Status actual: ${adrianaQuotesResults[0].status}`);
        console.log('   → Verificar dashboard Adriana para confirmar visibilidad');
      } else if (insuranceResults.length > 0) {
        console.log('✅ El prospecto YA EXISTE en INSURANCE_LEADS');
        console.log(`   → Status actual: ${insuranceResults[0].status}`);
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
