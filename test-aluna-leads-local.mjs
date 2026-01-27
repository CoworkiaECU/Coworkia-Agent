#!/usr/bin/env node
/**
 * TEST LOCAL: Sistema de detección y creación de leads de Aluna
 * 
 * Simula el flujo completo:
 * 1. Aluna incluye [LEAD_DATA:] en su respuesta
 * 2. Sistema detecta el tag
 * 3. Parsea los datos estructurados
 * 4. Crea lead en membership_leads
 * 5. Remueve tag de respuesta visible
 */

import pg from 'pg';
const { Pool } = pg;

// ============================================
// CONFIGURACIÓN DATABASE
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🧪 TEST LOCAL: Sistema Aluna Leads\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ============================================
// CASOS DE PRUEBA
// ============================================
const testCases = [
  {
    nombre: 'Plan 10 horas - Datos completos',
    respuestaAluna: `¡Perfecto Diego! 

Tu Plan 10 es ideal para empezar. Te confirmo los datos:

📋 Plan: 10 horas mensuales
💰 Inversión: $140/mes
👤 Nombre: Diego Villota
📧 Email: diego@mail.com
📱 Teléfono: +593987770788

[LEAD_DATA:Plan10|140|Diego Villota|diego@mail.com|+593987770788]

Para activar tu membresía, envíame tu comprobante de pago. Lo reviso y activamos tu acceso inmediatamente. ¿Listo para enviar?`,
    esperado: {
      planType: 'Plan10',
      price: 140,
      fullName: 'Diego Villota',
      email: 'diego@mail.com',
      phone: '+593987770788',
      tagRemovido: true
    }
  },
  {
    nombre: 'Plan 20 horas - Datos completos',
    respuestaAluna: `¡Excelente elección María! 

El Plan 20 te da mayor flexibilidad:

📋 Plan: 20 horas mensuales
💰 Inversión: $220/mes
👤 Nombre: María Rodríguez
📧 Email: maria@empresa.com
📱 Teléfono: +593992320262

[LEAD_DATA:Plan20|220|María Rodríguez|maria@empresa.com|+593992320262]

Envíame tu comprobante cuando realices el pago y activo tu cuenta inmediatamente.`,
    esperado: {
      planType: 'Plan20',
      price: 220,
      fullName: 'María Rodríguez',
      email: 'maria@empresa.com',
      phone: '+593992320262',
      tagRemovido: true
    }
  },
  {
    nombre: 'Oficina Virtual - Datos completos',
    respuestaAluna: `¡Perfecto para tu empresa Carlos!

Oficina Virtual incluye dirección comercial + servicios:

📋 Plan: Oficina Virtual
💰 Inversión: $85/mes
👤 Nombre: Carlos López
📧 Email: carlos@startup.ec
📱 Teléfono: +593998765432

[LEAD_DATA:OficinaVirtual|85|Carlos López|carlos@startup.ec|+593998765432]

Envía tu comprobante y coordinamos la firma del contrato.`,
    esperado: {
      planType: 'OficinaVirtual',
      price: 85,
      fullName: 'Carlos López',
      email: 'carlos@startup.ec',
      phone: '+593998765432',
      tagRemovido: true
    }
  },
  {
    nombre: 'Sin tag - No debe crear lead',
    respuestaAluna: `Claro, te cuento sobre nuestros planes:

📊 Plan 10: $140/mes - 10 horas
📊 Plan 20: $220/mes - 20 horas
📊 Oficina Virtual: $85/mes

¿Cuál te interesa más?`,
    esperado: null
  }
];

// ============================================
// FUNCIÓN PARA DETECTAR Y CREAR LEAD
// ============================================
async function procesarRespuestaAluna(respuesta, userPhone) {
  const leadMatch = respuesta.match(/\[LEAD_DATA:([^|]+)\|(\d+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/);
  
  if (!leadMatch) {
    return { leadCreado: false, respuestaFinal: respuesta };
  }

  const [, planType, price, fullName, email, phone] = leadMatch;
  
  // Generar leadId único
  const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Crear lead en BD
  const client = await pool.connect();
  try {
    const query = `INSERT INTO membership_leads (
        id, user_phone, membership_type, client_name, email, phone, monthly_fee, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`;
    const values = [leadId, userPhone, planType, fullName, email, phone, parseFloat(price), 'pending'];
    
    console.log('Query:', query);
    console.log('Values:', values);
    
    await client.query(query, values);
    
    console.log(`✅ Lead creado: ${leadId}`);
    
    // Remover tag de respuesta visible
    const respuestaLimpia = respuesta.replace(/\[LEAD_DATA:[^\]]+\]/, '').trim();
    
    return { 
      leadCreado: true, 
      leadId, 
      planType, 
      price: parseInt(price),
      fullName,
      email,
      phone,
      respuestaFinal: respuestaLimpia 
    };
  } finally {
    client.release();
  }
}

// ============================================
// CREAR USUARIOS DE PRUEBA
// ============================================
async function crearUsuariosPrueba() {
  console.log('👤 Creando usuarios de prueba...');
  const client = await pool.connect();
  try {
    for (let i = 1; i <= 3; i++) {
      const userPhone = `+593999${String(i).padStart(6, '0')}`;
      await client.query(
        `INSERT INTO users (phone_number, name, created_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (phone_number) DO NOTHING`,
        [userPhone, `Test User ${i}`]
      );
    }
    console.log('✅ Usuarios creados\n');
  } finally {
    client.release();
  }
}

// ============================================
// EJECUTAR TESTS
// ============================================
async function ejecutarTests() {
  let testsPasados = 0;
  let testsFallados = 0;

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`\n📝 TEST ${i + 1}: ${test.nombre}`);
    console.log('─'.repeat(50));
    
    const userPhone = `+593999${String(i + 1).padStart(6, '0')}`;
    
    try {
      const resultado = await procesarRespuestaAluna(test.respuestaAluna, userPhone);
      
      // Validar resultado
      if (test.esperado === null) {
        // No debería crear lead
        if (!resultado.leadCreado) {
          console.log('✅ PASS: No creó lead (correcto)');
          testsPasados++;
        } else {
          console.log('❌ FAIL: Creó lead cuando no debía');
          testsFallados++;
        }
      } else {
        // Debería crear lead
        if (resultado.leadCreado) {
          console.log(`✅ Lead creado: ${resultado.leadId}`);
          console.log(`   Plan: ${resultado.planType}`);
          console.log(`   Precio: $${resultado.price}`);
          console.log(`   Nombre: ${resultado.fullName}`);
          console.log(`   Email: ${resultado.email}`);
          console.log(`   Teléfono: ${resultado.phone}`);
          
          // Verificar datos
          const errores = [];
          if (resultado.planType !== test.esperado.planType) errores.push(`planType: ${resultado.planType} !== ${test.esperado.planType}`);
          if (resultado.price !== test.esperado.price) errores.push(`price: ${resultado.price} !== ${test.esperado.price}`);
          if (resultado.fullName !== test.esperado.fullName) errores.push(`fullName: ${resultado.fullName} !== ${test.esperado.fullName}`);
          if (resultado.email !== test.esperado.email) errores.push(`email: ${resultado.email} !== ${test.esperado.email}`);
          if (resultado.phone !== test.esperado.phone) errores.push(`phone: ${resultado.phone} !== ${test.esperado.phone}`);
          
          // Verificar tag removido
          if (resultado.respuestaFinal.includes('[LEAD_DATA:')) {
            errores.push('Tag no fue removido de respuesta visible');
          }
          
          if (errores.length === 0) {
            console.log('✅ PASS: Todos los datos correctos');
            testsPasados++;
          } else {
            console.log('❌ FAIL: Errores en datos:');
            errores.forEach(e => console.log(`   - ${e}`));
            testsFallados++;
          }
        } else {
          console.log('❌ FAIL: No creó lead cuando debía');
          testsFallados++;
        }
      }
      
      // Mostrar respuesta final
      console.log('\n📱 Respuesta visible al usuario:');
      console.log(resultado.respuestaFinal.substring(0, 200) + (resultado.respuestaFinal.length > 200 ? '...' : ''));
      
    } catch (error) {
      console.log(`❌ FAIL: Error en test - ${error.message}`);
      testsFallados++;
    }
  }

  // Resumen
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMEN DE TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Tests pasados: ${testsPasados}`);
  console.log(`❌ Tests fallados: ${testsFallados}`);
  console.log(`📈 Total: ${testsPasados + testsFallados}`);
  
  if (testsFallados === 0) {
    console.log('\n🎉 TODOS LOS TESTS PASARON - Sistema listo para producción\n');
  } else {
    console.log('\n⚠️  HAY TESTS FALLIDOS - Revisar antes de producción\n');
  }
}

// ============================================
// LIMPIAR LEADS DE PRUEBA
// ============================================
async function limpiarLeadsPrueba() {
  console.log('\n🧹 Limpiando leads de prueba...');
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM membership_leads WHERE user_phone LIKE '+593999%'`
    );
    console.log(`✅ Eliminados ${result.rowCount} leads de prueba\n`);
  } finally {
    client.release();
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  try {
    await limpiarLeadsPrueba();
    await crearUsuariosPrueba();
    await ejecutarTests();
  } catch (error) {
    console.error('❌ Error fatal:', error);
  } finally {
    await pool.end();
    console.log('👋 Pool cerrado\n');
  }
}

main();
