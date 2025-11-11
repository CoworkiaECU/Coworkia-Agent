/**
 * 🔧 Diagnóstico específico para problemas de reservas de Diego
 * Simula flujos completos y detecta fallos
 */

import dotenv from 'dotenv';
dotenv.config();

import { loadProfile, saveProfile } from '../perfiles-interacciones/memoria-sqlite.js';
import { procesarMensaje } from '../deteccion-intenciones/orquestador.js';
import { extractReservationData, shouldActivateConfirmation } from './aurora-confirmation-helper.js';
import { complete } from '../servicios-ia/openai.js';

/**
 * 🔍 Diagnosticar perfil específico de usuario
 */
export async function diagnoseUserReservationFlow(userId) {
  console.log(`\n🔍 DIAGNÓSTICO COMPLETO PARA USUARIO: ${userId}\n`);
  
  try {
    // 1. Cargar perfil
    const profile = await loadProfile(userId);
    console.log('📋 PERFIL ACTUAL:');
    console.log(JSON.stringify(profile, null, 2));
    
    if (!profile) {
      console.log('❌ Usuario no encontrado');
      return { error: 'Usuario no encontrado' };
    }
    
    // 2. Simular mensaje de reserva
    console.log('\n🎯 SIMULANDO MENSAJE: "quiero hacer una reserva para hoy 1pm"');
    
    const mensaje = "quiero hacer una reserva para hoy 1pm";
    
    // 3. Procesar con orquestador
    const resultado = procesarMensaje(mensaje, profile, []);
    
    console.log('\n📊 RESULTADO DEL ORQUESTADOR:');
    console.log(`- Agente seleccionado: ${resultado.agente}`);
    console.log(`- Razón: ${resultado.razonSeleccion}`);
    console.log(`- Tiene nombre en contexto: ${profile.name ? 'SÍ' : 'NO'}`);
    
    console.log('\n🤖 CONTEXTO ENVIADO A AURORA:');
    console.log(resultado.prompt);
    
    // 4. Generar respuesta con OpenAI
    console.log('\n🧠 GENERANDO RESPUESTA CON OPENAI...');
    const reply = await complete(resultado.prompt, {
      temperature: 0.4,
      max_tokens: 300,
      system: resultado.systemPrompt
    });
    
    console.log('\n💬 RESPUESTA DE AURORA:');
    console.log(reply);
    
    // 5. Verificar si activa confirmación
    const shouldConfirm = shouldActivateConfirmation(reply);
    console.log(`\n🔄 ¿Activa confirmación? ${shouldConfirm ? 'SÍ' : 'NO'}`);
    
    if (shouldConfirm) {
      console.log('\n📋 EXTRAYENDO DATOS DE RESERVA...');
      const reservationData = extractReservationData(reply, profile);
      
      if (reservationData) {
        console.log('✅ DATOS EXTRAÍDOS:');
        console.log(JSON.stringify(reservationData, null, 2));
        
        // Verificar si los horarios son correctos
        console.log('\n⏰ VERIFICACIÓN DE HORARIOS:');
        console.log(`- Mensaje original: "${mensaje}"`);
        console.log(`- Hora detectada inicio: ${reservationData.startTime}`);
        console.log(`- Hora detectada fin: ${reservationData.endTime}`);
        console.log(`- Duración: ${reservationData.durationHours} horas`);
        
        // Verificar si el horario está en el futuro y es lógico
        const now = new Date();
        const currentHour = now.getHours();
        const requestedHour = parseInt(reservationData.startTime.split(':')[0]);
        
        if (requestedHour > currentHour) {
          console.log('✅ HORARIO VÁLIDO - está en el futuro');
        } else {
          console.log('⚠️  HORARIO EN EL PASADO - podría necesitar ajuste');
        }
      } else {
        console.log('❌ No se pudieron extraer datos de reserva');
      }
    }
    
    // 6. Verificar configuración de email
    console.log('\n📧 VERIFICACIÓN DE EMAIL:');
    console.log(`- Email registrado: ${profile.email || 'NO CONFIGURADO'}`);
    console.log(`- ¿Recibirá confirmaciones? ${profile.email ? 'SÍ' : 'NO'}`);
    
    return {
      success: true,
      profile,
      auroraResponse: reply,
      willActivateConfirmation: shouldConfirm,
      reservationData: shouldConfirm ? extractReservationData(reply, profile) : null
    };
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    return { error: error.message };
  }
}

/**
 * 🧪 Probar flujo completo de reserva
 */
export async function testCompleteReservationFlow(userId) {
  console.log(`\n🚀 PRUEBA COMPLETA DE FLUJO RESERVA PARA: ${userId}\n`);
  
  const steps = [
    "hola quiero hacer una reserva para hoy a las 11am por favor",
    "yo@diegovillota.com",
    "si"
  ];
  
  let profile = await loadProfile(userId);
  
  for (let i = 0; i < steps.length; i++) {
    console.log(`\n--- PASO ${i + 1}: ${steps[i]} ---`);
    
    const resultado = procesarMensaje(steps[i], profile, []);
    const reply = await complete(resultado.prompt, {
      temperature: 0.4,
      max_tokens: 300,
      system: resultado.systemPrompt
    });
    
    console.log(`Aurora responde: ${reply}`);
    
    // Actualizar perfil si es necesario (simulado)
    if (i === 1 && steps[i].includes('@')) {
      profile.email = steps[i];
      console.log(`📧 Email actualizado: ${profile.email}`);
    }
  }
}

/**
 * 🎯 Función principal para ejecutar desde terminal
 */
if (process.argv[2] === 'run') {
  const userId = process.argv[3] || '593987770788';
  const testType = process.argv[4] || 'diagnose';
  
  if (testType === 'full') {
    testCompleteReservationFlow(userId)
      .then(() => console.log('\n✅ Prueba completada'))
      .catch(error => console.error('\n❌ Error:', error));
  } else {
    diagnoseUserReservationFlow(userId)
      .then(() => console.log('\n✅ Diagnóstico completado'))
      .catch(error => console.error('\n❌ Error:', error));
  }
}