#!/usr/bin/env node
/**
 * 🧪 TEST SIMPLE: Verificación Gmail y envío básico
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function testSimpleEmail() {
  console.log('🔍 ════════════════════════════════════════════════');
  console.log('   DIAGNÓSTICO EMAIL - GMAIL CONFIGURATION');
  console.log('════════════════════════════════════════════════\n');

  const EMAIL_USER = process.env.EMAIL_USER || 'secretaria.coworkia@gmail.com';
  const EMAIL_PASS = process.env.EMAIL_PASS || 'yoby yprw ogjk ftkv';

  console.log('📋 CONFIGURACIÓN:');
  console.log(`   Usuario: ${EMAIL_USER}`);
  console.log(`   Password: ${EMAIL_PASS ? '***' + EMAIL_PASS.slice(-4) : 'NO CONFIGURADO'}\n`);

  try {
    // Crear transportador
    console.log('1️⃣ Creando transportador...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });

    // Verificar conexión
    console.log('2️⃣ Verificando conexión SMTP...');
    await transporter.verify();
    console.log('   ✅ Conexión SMTP OK\n');

    // Enviar email de prueba simple
    console.log('3️⃣ Enviando email de prueba...');
    
    const timestamp = new Date().toLocaleString('es-EC');
    
    const info = await transporter.sendMail({
      from: `"Test Coworkia Agent" <${EMAIL_USER}>`,
      to: 'yo@diegovillota.com',
      subject: '🧪 Test Email - Coworkia Agent',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #DC2626;">🧪 Email de Prueba</h1>
            <p>Este es un email de prueba enviado desde <strong>Coworkia Agent</strong></p>
            <p>Si recibes este mensaje, la configuración de Gmail está funcionando correctamente.</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Enviado el: ${timestamp}<br>
              Desde: ${EMAIL_USER}
            </p>
          </div>
        </div>
      `,
      text: 'Email de prueba - Coworkia Agent'
    });

    console.log('   ✅ Email enviado exitosamente!\n');
    console.log('📬 DETALLES:');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}\n`);

    console.log('✅ ════════════════════════════════════════════════');
    console.log('   TEST COMPLETADO - EMAIL ENVIADO');
    console.log('════════════════════════════════════════════════');
    console.log('\n📧 Revisa estos lugares:');
    console.log('   1. Inbox de yo@diegovillota.com');
    console.log('   2. Carpeta SPAM/Correo no deseado');
    console.log('   3. Carpeta Promociones (si Gmail)');
    console.log('   4. Espera 1-2 minutos (puede demorar)\n');

    // Esperar 5 segundos antes de salir
    console.log('⏳ Esperando 5 segundos antes de finalizar...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error(error);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 SOLUCIÓN:');
      console.log('   El error de autenticación puede deberse a:');
      console.log('   1. Password incorrecta');
      console.log('   2. App Password no configurada en Gmail');
      console.log('   3. 2FA no activado en la cuenta Gmail\n');
    }
    
    process.exit(1);
  }
}

testSimpleEmail();
