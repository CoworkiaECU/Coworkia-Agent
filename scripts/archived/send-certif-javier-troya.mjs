#!/usr/bin/env node
/**
 * Envío único del Certificado de Supresión de Datos — Javier Troya
 * Para: coworkia.ec@gmail.com (Diego lo reenvía al cliente)
 */
import { config } from 'dotenv';
config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from '../src/servicios/email.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const certHtml = fs.readFileSync(
  path.join(__dirname, 'certificado-supresion-datos-javier-troya.html'),
  'utf-8'
);

const result = await sendEmail({
  to: 'coworkia.ec@gmail.com',
  subject: '🛡️ Certificado de Supresión de Datos — javier.troya@gmail.com',
  html: certHtml,
  from: { name: 'Coworkia Agent — Sistema', address: process.env.EMAIL_USER || process.env.GMAIL_USER },
});

if (result.success) {
  console.log('✅ Certificado enviado a coworkia.ec@gmail.com');
  console.log('   MessageId:', result.messageId);
} else {
  console.error('❌ Error al enviar:', result.error);
  process.exit(1);
}
