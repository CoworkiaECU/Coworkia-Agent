#!/usr/bin/env node
/**
 * 🔍 Monitor de pending_confirmations
 * 
 * Muestra estado actual de todas las confirmaciones pendientes
 * con detalles de formato, tipo y datos normalizados.
 * 
 * USO:
 *   node scripts/monitor-pending.js
 *   node scripts/monitor-pending.js +593987770788  # Usuario específico
 */

import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurada en .env');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');
    
    const userPhone = process.argv[2]; // Usuario específico opcional
    
    let query = `
      SELECT 
        user_phone,
        reservation_data,
        created_at,
        expires_at,
        CASE 
          WHEN expires_at < NOW() THEN '🔴 EXPIRADO'
          WHEN expires_at < NOW() + INTERVAL '10 minutes' THEN '🟡 POR EXPIRAR'
          ELSE '🟢 ACTIVO'
        END as status
      FROM pending_confirmations
    `;
    
    const params = [];
    if (userPhone) {
      query += ' WHERE user_phone = $1';
      params.push(userPhone);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      console.log('📭 No hay confirmaciones pendientes');
      return;
    }
    
    console.log(`📋 ${result.rows.length} confirmación(es) pendiente(s):\n`);
    console.log('='.repeat(80));
    
    for (const row of result.rows) {
      const data = JSON.parse(row.reservation_data);
      
      console.log(`\n${row.status} Usuario: ${row.user_phone}`);
      console.log(`   Creado: ${new Date(row.created_at).toLocaleString('es-EC')}`);
      console.log(`   Expira: ${new Date(row.expires_at).toLocaleString('es-EC')}`);
      console.log(`   Tipo: ${data.type || 'unknown'}`);
      
      // Mostrar datos según tipo
      if (data.type === 'partial_form' && data.formData) {
        const form = data.formData;
        console.log('\n   📝 DATOS DEL FORMULARIO:');
        console.log(`      • Espacio: ${form.spaceType || '❓'}`);
        console.log(`      • Fecha: ${form.date || '❓'}`);
        console.log(`      • Hora: ${form.time || '❓'}`);
        console.log(`      • Email: ${form.email || '❓'}`);
        console.log(`      • Personas: ${form.numPeople || 1}`);
        console.log(`      • Duración: ${form.durationHours || 2}h`);
        console.log(`      • Método pago: ${form.paymentMethod || '❓'}`);
        console.log(`      • Free trial usado: ${form.freeTrialUsed === false ? '❌ NO (GRATIS)' : '✅ SÍ'}`);
        
        // Mostrar formato normalizado
        const esGratis = form.freeTrialUsed === false;
        console.log('\n   🔄 FORMATO NORMALIZADO (getPendingConfirmation):');
        console.log(`      • userId: ${form.userId}`);
        console.log(`      • userName: ${form.userName || '❓'}`);
        console.log(`      • date: ${form.date || '❓'}`);
        console.log(`      • startTime: ${form.time || '❓'} (time → startTime)`);
        console.log(`      • serviceType: ${form.spaceType || '❓'} (spaceType → serviceType)`);
        console.log(`      • guestCount: ${form.numPeople ? form.numPeople - 1 : 0} (numPeople - 1)`);
        console.log(`      • totalPrice: ${esGratis ? 0 : (form.totalPrice || 0)} ${esGratis ? '(GRATIS)' : ''}`);
        console.log(`      • wasFree: ${esGratis} (calculado de freeTrialUsed)`);
        console.log(`      • paymentMethod: ${esGratis ? null : form.paymentMethod}`);
      } else {
        console.log('\n   📊 DATOS NORMALIZADOS:');
        console.log(`      • userId: ${data.userId || '❓'}`);
        console.log(`      • date: ${data.date || '❓'}`);
        console.log(`      • startTime: ${data.startTime || '❓'}`);
        console.log(`      • serviceType: ${data.serviceType || '❓'}`);
        console.log(`      • wasFree: ${data.wasFree}`);
        console.log(`      • totalPrice: $${data.totalPrice || 0}`);
      }
      
      console.log('\n' + '-'.repeat(80));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
