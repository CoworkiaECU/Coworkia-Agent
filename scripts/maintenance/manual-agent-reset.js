#!/usr/bin/env node

/**
 * 🔄 T9: Manual Agent Reset
 * 
 * Script para resetear manualmente el agente activo de un usuario.
 * Uso: node scripts/maintenance/manual-agent-reset.js <phone_number>
 * 
 * Ejemplo: node scripts/maintenance/manual-agent-reset.js +593987770788
 * 
 * Flujo:
 * 1. Agente actual despide
 * 2. Delay 3s
 * 3. Mensaje transición a Aurora
 * 4. Delay 3s
 * 5. Aurora saluda
 * 6. Reset activeAgent a AURORA
 * 7. Limpia transacción pendiente
 */

import databaseService from '../../src/database/database.js';
import axios from 'axios';

const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
const WASSENGER_DEVICE = process.env.WASSENGER_DEVICE;

/**
 * Enviar mensaje por WhatsApp usando Wassenger API
 */
async function enviarWhatsApp(numero, mensaje) {
  try {
    const response = await axios.post(
      'https://api.wassenger.com/v1/messages',
      {
        phone: numero,
        message: mensaje,
        device: WASSENGER_DEVICE
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Token': WASSENGER_TOKEN
        }
      }
    );
    
    return { ok: response.status === 200 || response.status === 201, data: response.data };
  } catch (error) {
    console.error(`Error enviando WhatsApp:`, error.message);
    return { ok: false, error: error.message };
  }
}

// Perfiles de agentes
const AGENTES = {
  AURORA: {
    nombre: 'Aurora',
    despedida: (nombre) => `${nombre}, ha sido un placer ayudarte. Me despido por ahora. 👋`,
    saludo: (nombre) => `¡Hola ${nombre}! 👋\n\nSoy Aurora, tu asistente de Coworkia. ¿En qué puedo ayudarte hoy?`
  },
  AXEL: {
    nombre: 'Axel',
    despedida: (nombre) => `${nombre}, fue un gusto atenderte en The PaintBull. ¡Hasta la próxima! 🚗🔧`,
  },
  ALUNA: {
    nombre: 'Aluna',
    despedida: (nombre) => `${nombre}, gracias por considerar nuestros espacios de coworking. ¡Nos vemos pronto! ☕`,
  },
  ADRIANA: {
    nombre: 'Adriana',
    despedida: (nombre) => `${nombre}, fue un placer asesorarte en seguros. ¡Cuídate! 🛡️`,
  },
  ENZO: {
    nombre: 'Enzo',
    despedida: (nombre) => `${nombre}, excelente trabajar contigo en marketing visual. ¡Éxitos! 🎨`,
  },
  ANGELA: {
    nombre: 'Ángela',
    despedida: (nombre) => `${nombre}, gracias por confiar en OneMind IA. ¡Hasta pronto! 💰`,
  },
  GABI: {
    nombre: 'Gabi',
    despedida: (nombre) => `${nombre}, fue un placer asistirte. ¡Estamos en contacto! 📊`,
  },
  TOMI: {
    nombre: 'Tomi',
    despedida: (nombre) => `${nombre}, gracias por considerar nuestros servicios de inversión. ¡Éxito! 💼`,
  }
};

/**
 * Obtener perfil de usuario desde DB
 */
async function getUserProfile(phoneNumber) {
  const query = `
    SELECT phone_number, name, whatsapp_display_name, active_agent, 
           transaction_started_at, transaction_agent
    FROM users 
    WHERE phone_number = $1
  `;
  
  const user = await databaseService.get(query, [phoneNumber]);
  return user;
}

/**
 * Actualizar perfil de usuario
 */
async function updateUserProfile(phoneNumber, updates) {
  const query = `
    UPDATE users 
    SET active_agent = $1,
        transaction_started_at = $2,
        transaction_agent = $3,
        follow_up_sent_at = $4
    WHERE phone_number = $5
  `;
  
  await databaseService.run(query, [
    updates.activeAgent,
    updates.transactionStartedAt,
    updates.transactionAgent,
    updates.followUpSentAt,
    phoneNumber
  ]);
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ejecutar reset manual de agente
 */
async function executeManualReset(phoneNumber) {
  console.log(`\n🔄 [T9] Iniciando reset manual para ${phoneNumber}...\n`);
  
  try {
    // 1. Obtener perfil actual
    const user = await getUserProfile(phoneNumber);
    
    if (!user) {
      console.error(`❌ Usuario ${phoneNumber} no encontrado en base de datos.`);
      process.exit(1);
    }
    
    const currentAgent = user.active_agent || 'AURORA';
    const userName = user.name || user.whatsapp_display_name || 'amigo';
    
    console.log(`📋 Usuario: ${userName}`);
    console.log(`🤖 Agente actual: ${currentAgent}`);
    
    if (currentAgent === 'AURORA') {
      console.log(`⚠️  Usuario ya está con AURORA. No se requiere reset.`);
      process.exit(0);
    }
    
    // 2. Mensaje despedida del agente actual
    const agenteActual = AGENTES[currentAgent];
    if (agenteActual && agenteActual.despedida) {
      const mensajeDespedida = agenteActual.despedida(userName);
      console.log(`\n💬 [${agenteActual.nombre}] Despedida: "${mensajeDespedida.substring(0, 50)}..."`);
      
      await enviarWhatsApp(phoneNumber, mensajeDespedida);
      console.log(`✅ Mensaje 1/3 enviado`);
      
      // Delay 3 segundos
      console.log(`⏱️  Esperando 3 segundos...`);
      await delay(3000);
    }
    
    // 3. Mensaje de transición
    const mensajeTransicion = `Transferiendo tu conversación a Aurora, nuestro coordinador principal...`;
    console.log(`\n💬 [Sistema] Transición: "${mensajeTransicion}"`);
    
    await enviarWhatsApp(phoneNumber, mensajeTransicion);
    console.log(`✅ Mensaje 2/3 enviado`);
    
    // Delay 3 segundos
    console.log(`⏱️  Esperando 3 segundos...`);
    await delay(3000);
    
    // 4. Mensaje saludo de Aurora
    const mensajeSaludo = AGENTES.AURORA.saludo(userName);
    console.log(`\n💬 [Aurora] Saludo: "${mensajeSaludo.substring(0, 50)}..."`);
    
    await enviarWhatsApp(phoneNumber, mensajeSaludo);
    console.log(`✅ Mensaje 3/3 enviado`);
    
    // 5. Actualizar perfil en DB
    await updateUserProfile(phoneNumber, {
      activeAgent: 'AURORA',
      transactionStartedAt: null,
      transactionAgent: null,
      followUpSentAt: null
    });
    
    console.log(`\n✅ [T9] Reset completado exitosamente!`);
    console.log(`📊 Resumen:`);
    console.log(`   - Agente anterior: ${currentAgent}`);
    console.log(`   - Agente nuevo: AURORA`);
    console.log(`   - Transacción limpiada: Sí`);
    console.log(`   - Mensajes enviados: 3`);
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error ejecutando reset manual:`, error);
    process.exit(1);
  }
}

// Main execution
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error(`
❌ Error: Número de teléfono requerido

Uso: node scripts/maintenance/manual-agent-reset.js <phone_number>

Ejemplo:
  node scripts/maintenance/manual-agent-reset.js +593987770788

Este script resetea manualmente el agente activo de un usuario a AURORA.
Útil para casos donde un usuario está "atascado" con un agente especializado.
  `);
  process.exit(1);
}

// Validar formato
if (!phoneNumber.startsWith('+')) {
  console.error(`❌ Error: Número debe incluir código de país (ejemplo: +593987770788)`);
  process.exit(1);
}

// Ejecutar reset
executeManualReset(phoneNumber);
