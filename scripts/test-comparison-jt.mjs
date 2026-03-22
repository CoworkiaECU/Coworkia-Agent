/**
 * Test: enviar email de comparación a Javier Troya (ADR-JT-001)
 * Simula exactamente lo que hace el botón "📧 Comparación" del dashboard
 */
import dotenv from 'dotenv';
dotenv.config();

import { buildEmailTemplate } from '../src/servicios/email-template-system.js';
import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from '../src/servicios/email.js';

const primaAnual   = 830;
const primaMensual = Math.round(primaAnual / 10);
const adminCC      = process.env.COWORKIA_ADMIN_EMAIL || '';

const html = buildEmailTemplate('adriana', 'COMPARISON_V2', {
  nombre:           'Javier Troya',
  marca:            'Hyundai',
  modelo:           'Creta',
  anio:             2022,
  placa:            '-',
  valor_asegurado:  '$16,000',
  vaz_prima_anual:  `$${primaAnual}`,
  vaz_prima_mensual:`$${primaMensual}`,
  vaz_deducible:    '7% (Taller VAZ)',
  analisis_broker:  'Hola Javier, tras analizar el mercado ecuatoriano para tu Hyundai Creta 2022, VAZ Seguros ofrece la mejor relación cobertura-precio con prima de $830/año y asistencia 24/7.',
  competitors:      [],
  fecha_cotizacion: 'marzo 22, 2026',
  bot_phone:        (process.env.BOT_PHONE || '593994837117').replace('+', ''),
  adriana_email:    process.env.COWORKIA_ADMIN_EMAIL || 'adriana@segpopular.com.ec',
  adriana_phone:    process.env.ADRIANA_PHONE || process.env.BOT_PHONE || '',
});

const result = await sendEmail({
  to:      'javier.troya@gmail.com',
  cc:      adminCC || undefined,
  subject: '🛡️ Tu cotización de seguro · Hyundai Creta 2022 · ADR-JT-001',
  html,
  from:    { name: AGENT_FROM_NAMES.adriana || 'Adriana · SegPopular', address: DEFAULT_FROM_EMAIL },
});

console.log('✅ Email enviado a: javier.troya@gmail.com');
if (adminCC) console.log('📋 CC a admin:', adminCC);
console.log('Result:', JSON.stringify(result));
