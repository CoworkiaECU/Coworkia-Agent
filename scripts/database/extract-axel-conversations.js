/**
 * 🔍 Extractor detallado de conversaciones con Axel
 * Muestra el flujo completo usuario-agente
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function extractDetailedAxelLogs() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 CONVERSACIONES DETALLADAS CON AXEL\n');
    console.log('════════════════════════════════════════════════════════════\n');
    
    // Obtener todas las interacciones de Axel con datos completos
    const interactions = await client.query(`
      SELECT 
        i.id,
        i.user_phone,
        i.agent,
        i.intent_reason,
        i.input,
        i.output,
        i.meta,
        i.timestamp,
        u.name as user_name,
        u.email,
        u.active_agent,
        u.last_message_at
      FROM interactions i
      LEFT JOIN users u ON i.user_phone = u.phone_number
      WHERE i.agent = 'axel'
      ORDER BY i.timestamp DESC
    `);
    
    console.log(`✅ Encontradas ${interactions.rows.length} interacciones con Axel\n`);
    console.log('════════════════════════════════════════════════════════════\n');
    
    // Agrupar por usuario
    const byUser = {};
    interactions.rows.forEach(int => {
      if (!byUser[int.user_phone]) {
        byUser[int.user_phone] = {
          user: {
            phone: int.user_phone,
            name: int.user_name,
            email: int.email,
            active_agent: int.active_agent,
            last_message_at: int.last_message_at
          },
          interactions: []
        };
      }
      byUser[int.user_phone].interactions.push(int);
    });
    
    // Mostrar conversaciones por usuario
    Object.values(byUser).forEach((userData, userIdx) => {
      console.log(`\n👤 USUARIO ${userIdx + 1}: ${userData.user.name || userData.user.phone}`);
      console.log(`   📞 Teléfono: ${userData.user.phone}`);
      console.log(`   📧 Email: ${userData.user.email || 'N/A'}`);
      console.log(`   🤖 Agente activo: ${userData.user.active_agent || 'N/A'}`);
      console.log(`   🕐 Último mensaje: ${userData.user.last_message_at || 'N/A'}`);
      console.log(`   💬 Total interacciones: ${userData.interactions.length}`);
      console.log('\n   ════════════════════════════════════════════════════════\n');
      
      // Mostrar interacciones en orden cronológico (del más antiguo al más reciente)
      const sortedInteractions = [...userData.interactions].reverse();
      
      sortedInteractions.forEach((int, idx) => {
        console.log(`   ${idx + 1}. 🕐 ${int.timestamp}`);
        console.log(`      Intent: ${int.intent_reason}`);
        
        if (int.input && int.input.trim()) {
          console.log(`\n      👤 USUARIO:`);
          console.log(`      ${int.input}`);
        }
        
        if (int.output && int.output.trim()) {
          console.log(`\n      🤖 AXEL:`);
          console.log(`      ${int.output}`);
        }
        
        if (int.meta && int.meta !== '{}') {
          try {
            const metaObj = typeof int.meta === 'string' ? JSON.parse(int.meta) : int.meta;
            if (Object.keys(metaObj).length > 0) {
              console.log(`\n      📎 Metadata: ${JSON.stringify(metaObj, null, 2)}`);
            }
          } catch (e) {
            console.log(`\n      📎 Metadata: ${int.meta}`);
          }
        }
        
        console.log('\n   ────────────────────────────────────────────────────\n');
      });
      
      console.log('\n   ════════════════════════════════════════════════════════\n');
    });
    
    // Verificar formularios parciales
    console.log('\n📋 FORMULARIOS PARCIALES EN PROCESO:\n');
    console.log('════════════════════════════════════════════════════════════\n');
    
    const partialForms = await client.query(`
      SELECT 
        pf.*,
        u.name as user_name,
        u.email
      FROM partial_forms pf
      LEFT JOIN users u ON pf.user_phone = u.phone_number
      WHERE pf.agent = 'axel'
      ORDER BY pf.updated_at DESC
    `);
    
    if (partialForms.rows.length > 0) {
      partialForms.rows.forEach((form, idx) => {
        console.log(`${idx + 1}. Usuario: ${form.user_name || form.user_phone}`);
        console.log(`   Teléfono: ${form.user_phone}`);
        console.log(`   Email: ${form.email || 'N/A'}`);
        console.log(`   Contexto: ${form.context || 'N/A'}`);
        console.log(`   Creado: ${form.created_at}`);
        console.log(`   Actualizado: ${form.updated_at}`);
        
        if (form.form_data) {
          try {
            const formDataObj = typeof form.form_data === 'string' ? JSON.parse(form.form_data) : form.form_data;
            console.log(`\n   📝 Datos del formulario:`);
            console.log(JSON.stringify(formDataObj, null, 2));
          } catch (e) {
            console.log(`   Form Data: ${form.form_data}`);
          }
        }
        
        console.log('\n   ────────────────────────────────────────────────────\n');
      });
    } else {
      console.log('❌ No hay formularios parciales\n');
    }
    
    // Verificar axel_partial_quotes
    console.log('\n📋 AXEL PARTIAL QUOTES:\n');
    console.log('════════════════════════════════════════════════════════════\n');
    
    const axelQuotes = await client.query(`
      SELECT 
        apq.*,
        u.name as user_name,
        u.email
      FROM axel_partial_quotes apq
      LEFT JOIN users u ON apq.user_phone = u.phone_number
      ORDER BY apq.updated_at DESC
      LIMIT 10
    `);
    
    if (axelQuotes.rows.length > 0) {
      axelQuotes.rows.forEach((quote, idx) => {
        console.log(`${idx + 1}. Usuario: ${quote.user_name || quote.user_phone}`);
        console.log(`   Teléfono: ${quote.user_phone}`);
        console.log(`   Email: ${quote.email || 'N/A'}`);
        console.log(`   Sesión: ${quote.session_id || 'N/A'}`);
        console.log(`   Creado: ${quote.created_at}`);
        console.log(`   Actualizado: ${quote.updated_at}`);
        
        console.log(`\n   📝 Datos de la cotización:`);
        console.log(`   - Marca: ${quote.car_brand || 'N/A'}`);
        console.log(`   - Modelo: ${quote.car_model || 'N/A'}`);
        console.log(`   - Año: ${quote.car_year || 'N/A'}`);
        console.log(`   - Daño: ${quote.damage_description || 'N/A'}`);
        console.log(`   - Imágenes pendientes: ${quote.images_pending ? '✅' : '❌'}`);
        console.log(`   - Imágenes URL: ${quote.images_urls || 'N/A'}`);
        
        if (quote.additional_data) {
          try {
            const additionalObj = typeof quote.additional_data === 'string' ? JSON.parse(quote.additional_data) : quote.additional_data;
            console.log(`\n   📎 Datos adicionales:`);
            console.log(JSON.stringify(additionalObj, null, 2));
          } catch (e) {
            console.log(`   Datos adicionales: ${quote.additional_data}`);
          }
        }
        
        console.log('\n   ────────────────────────────────────────────────────\n');
      });
    } else {
      console.log('❌ No hay cotizaciones parciales de Axel\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
extractDetailedAxelLogs()
  .then(() => {
    console.log('\n✅ Extracción completada exitosamente\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
