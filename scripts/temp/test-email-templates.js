/**
 * 📧 Script de prueba para enviar emails de todos los agentes
 * Enviará 5 emails a yo@diegovillota.com para revisión de diseño
 */

import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';
import {
  generateAdrianaEmailHTML,
  generateAxelEmailHTML,
  generateEnzoEmailHTML,
  generatePaulaEmailHTML,
  generateAlunaEmailHTML
} from '../../src/servicios/generic-email-templates.js';

async function createEmailTransporter() {
  const EMAIL_USER = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS || process.env.GMAIL_PASS;
  
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('EMAIL_USER o EMAIL_PASS no configurado en .env');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  await transporter.verify();
  return transporter;
}

async function sendTestEmails() {
  console.log('📧 Iniciando envío de emails de prueba...\n');
  
  const transporter = await createEmailTransporter();
  const recipientEmail = 'yo@diegovillota.com';
  
  // 1. Email de Adriana - SegPopular
  console.log('1️⃣ Enviando email de Adriana (SegPopular)...');
  const adrianaData = {
    userName: 'Diego',
    insuranceType: 'Seguro para Vehículos livianos',
    cedula: '1234567890',
    email: recipientEmail,
    phone: '+593 99 999 9999',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla 2020',
    leadId: 'adriana_test_001'
  };
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: '🛡️ [PRUEBA] Solicitud de Seguro - SegPopular',
    html: generateAdrianaEmailHTML(adrianaData)
  });
  console.log('✅ Email de Adriana enviado\n');

  // 2. Email de Axel - PaintBull
  console.log('2️⃣ Enviando email de Axel (PaintBull)...');
  const axelData = {
    userName: 'Diego',
    damageType: 'Rayón en puerta',
    vehicleBrand: 'Honda',
    vehicleModel: 'Civic',
    vehicleYear: 2021,
    email: recipientEmail,
    phone: '+593 99 999 9999',
    damageDescription: 'Rayón de 15cm en la puerta del conductor, necesita repintar',
    leadId: 'axel_test_001'
  };
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: '🔨 [PRUEBA] Cotización de Colisión - PaintBull',
    html: generateAxelEmailHTML(axelData)
  });
  console.log('✅ Email de Axel enviado\n');

  // 3. Email de Enzo - MarketingLab
  console.log('3️⃣ Enviando email de Enzo (MarketingLab)...');
  const enzoData = {
    userName: 'Diego',
    projectType: 'Campaña en redes sociales',
    companyName: 'Mi Empresa S.A.',
    email: recipientEmail,
    phone: '+593 99 999 9999',
    budget: '$1000-$2000 USD',
    urgency: 'Flexible - 2-3 semanas',
    description: 'Necesito lanzar una campaña para promocionar mi nuevo producto',
    leadId: 'enzo_test_001'
  };
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: '🎯 [PRUEBA] Proyecto de Marketing - MarketingLab',
    html: generateEnzoEmailHTML(enzoData)
  });
  console.log('✅ Email de Enzo enviado\n');

  // 4. Email de Paula - PropElite
  console.log('4️⃣ Enviando email de Paula (PropElite)...');
  const paulaData = {
    userName: 'Diego',
    operationType: 'Comprar',
    propertyType: 'Departamento',
    zone: 'La Carolina, Quito',
    budgetRange: '$100,000 - $150,000',
    email: recipientEmail,
    phone: '+593 99 999 9999',
    leadId: 'paula_test_001'
  };
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: '🏘️ [PRUEBA] Búsqueda de Propiedad - PropElite',
    html: generatePaulaEmailHTML(paulaData)
  });
  console.log('✅ Email de Paula enviado\n');

  // 5. Email de Aluna - Coworkia Membresías
  console.log('5️⃣ Enviando email de Aluna (Coworkia)...');
  const alunaData = {
    userName: 'Diego',
    membershipType: 'Hot Desk Mensual',
    startDate: '2026-02-01',
    email: recipientEmail,
    phone: '+593 99 999 9999',
    companyName: 'Mi Startup Tech',
    leadId: 'aluna_test_001'
  };
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: '🎫 [PRUEBA] Membresía Coworkia',
    html: generateAlunaEmailHTML(alunaData)
  });
  console.log('✅ Email de Aluna enviado\n');

  console.log('🎉 ¡Todos los emails enviados exitosamente!');
  console.log(`📬 Revisa tu bandeja: ${recipientEmail}`);
  console.log('📤 Los emails quedaron registrados en: secretaria.coworkia@gmail.com (Enviados)\n');
}

// Ejecutar
sendTestEmails().catch(error => {
  console.error('❌ Error enviando emails:', error);
  process.exit(1);
});
