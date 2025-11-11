/**
 * 🔧 Diagnóstico completo del sistema de email y Google Calendar
 * Herramienta para identificar problemas con notificaciones
 */

import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';
import { sendReservationConfirmation, sendPaymentConfirmationEmail, generateGoogleCalendarLink } from './email.js';
import { testCalendarConnection } from './google-calendar.js';
import { loadProfile } from '../perfiles-interacciones/memoria-sqlite.js';

/**
 * 🧪 Prueba de configuración de email
 */
export async function testEmailConfiguration() {
  console.log('=== 🔬 DIAGNÓSTICO DE EMAIL ===\n');
  
  // 1. Verificar variables de entorno actuales
  console.log('1. 📋 Variables de entorno (actualizadas):');
  console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ ' + process.env.EMAIL_USER : '❌ No configurado'}`);
  console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Configurado (App Password)' : '❌ No configurado'}`);
  console.log(`   EMAIL_SERVICE: ${process.env.EMAIL_SERVICE ? '✅ ' + process.env.EMAIL_SERVICE : '❌ No configurado'}`);
  
  // 2. Verificar Google Calendar
  console.log('\n2. 📅 Google Calendar:');
  console.log(`   GOOGLE_CALENDAR_ID: ${process.env.GOOGLE_CALENDAR_ID ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`   GOOGLE_SERVICE_ACCOUNT_JSON: ${process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? '✅ Configurado' : '❌ No configurado'}`);
  
  // 3. Crear transportador (solo con variables actuales)
  console.log('\n3. 🚀 Prueba de transportador:');
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    await transporter.verify();
    console.log('   ✅ Transportador funcional');
    
    // 4. Prueba de Google Calendar
    console.log('\n4. 📅 Prueba de Google Calendar:');
    try {
      const calendarResult = await testCalendarConnection();
      if (calendarResult.success) {
        console.log('   ✅ Google Calendar conectado exitosamente');
        console.log(`   📊 Calendarios disponibles: ${calendarResult.calendars?.length || 0}`);
      } else {
        console.log(`   ⚠️ Google Calendar no disponible: ${calendarResult.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Error probando Google Calendar: ${error.message}`);
    }
    
    return { success: true, transporter };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 📧 Prueba de envío de email real
 */
export async function testEmailSending(testEmail = 'test@example.com') {
  console.log('\n=== 📧 PRUEBA DE ENVÍO ===\n');
  
  const testData = {
    email: testEmail,
    userName: 'Usuario Prueba',
    date: '2024-11-08',
    startTime: '09:00',
    endTime: '10:00',
    serviceType: 'hotDesk',
    wasFree: false,
    totalPrice: 15,
    durationHours: 1
  };
  
  console.log(`Enviando email de prueba a: ${testEmail}`);
  
  try {
    const result = await sendReservationConfirmation(testData);
    console.log('Resultado:', result);
    return result;
  } catch (error) {
    console.error('Error enviando email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📅 Prueba de Google Calendar
 */
export function testGoogleCalendar() {
  console.log('\n=== 📅 PRUEBA GOOGLE CALENDAR ===\n');
  
  const testData = {
    userName: 'Usuario Prueba',
    date: '2024-11-08',
    startTime: '09:00',
    endTime: '10:00'
  };
  
  try {
    const calendarLink = generateGoogleCalendarLink(testData);
    console.log('📅 Link de Google Calendar generado:');
    console.log(calendarLink);
    
    if (calendarLink && calendarLink.includes('calendar.google.com')) {
      console.log('✅ Generación exitosa');
      return { success: true, link: calendarLink };
    } else {
      console.log('❌ Link inválido');
      return { success: false, error: 'Link inválido generado' };
    }
  } catch (error) {
    console.log(`❌ Error generando link: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 🔍 Diagnóstico de usuario específico
 */
export async function diagnoseUserNotifications(userPhone) {
  console.log(`\n=== 🔍 DIAGNÓSTICO USUARIO ${userPhone} ===\n`);
  
  try {
    const profile = await loadProfile(userPhone);
    
    console.log('📋 Datos del usuario:');
    console.log(`   Teléfono: ${profile.userId || 'No definido'}`);
    console.log(`   Nombre: ${profile.name || 'No definido'}`);
    console.log(`   Email: ${profile.email || '❌ NO CONFIGURADO'}`);
    
    if (!profile.email) {
      console.log('\n❌ PROBLEMA IDENTIFICADO: Usuario no tiene email registrado');
      console.log('   Solución: El usuario debe proporcionar su email');
      return { issue: 'no_email', profile };
    }
    
    console.log('\n📝 Reservas pendientes:');
    if (profile.pendingConfirmation) {
      console.log('   ✅ Tiene confirmación pendiente:', profile.pendingConfirmation);
    } else {
      console.log('   ℹ️  No tiene confirmaciones pendientes');
    }
    
    console.log('\n📋 Última reserva:');
    if (profile.lastReservation) {
      console.log('   Fecha:', profile.lastReservation.date);
      console.log('   Estado:', profile.lastReservation.status);
      console.log('   Email enviado:', profile.lastReservation.emailSent ? '✅' : '❌');
    } else {
      console.log('   ℹ️  No tiene reservas registradas');
    }
    
    return { success: true, profile };
    
  } catch (error) {
    console.error('❌ Error cargando perfil:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🎯 Diagnóstico completo
 */
export async function fullDiagnosis(userPhone = null, testEmail = null) {
  console.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO...\n');
  
  const results = {
    emailConfig: await testEmailConfiguration(),
    googleCalendar: testGoogleCalendar(),
    user: userPhone ? await diagnoseUserNotifications(userPhone) : null,
    emailTest: testEmail ? await testEmailSending(testEmail) : null
  };
  
  console.log('\n=== 📊 RESUMEN DE DIAGNÓSTICO ===');
  console.log(`Email configurado: ${results.emailConfig.success ? '✅' : '❌'}`);
  console.log(`Google Calendar: ${results.googleCalendar.success ? '✅' : '❌'}`);
  
  if (results.user) {
    const hasEmail = results.user.profile?.email ? '✅' : '❌';
    console.log(`Usuario tiene email: ${hasEmail}`);
  }
  
  if (results.emailTest) {
    console.log(`Prueba de envío: ${results.emailTest.success ? '✅' : '❌'}`);
  }
  
  return results;
}

// Función principal para usar desde terminal
if (process.argv[2] === 'run') {
  const userPhone = process.argv[3];
  const testEmail = process.argv[4];
  
  fullDiagnosis(userPhone, testEmail)
    .then(results => {
      console.log('\n✅ Diagnóstico completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error en diagnóstico:', error);
      process.exit(1);
    });
}