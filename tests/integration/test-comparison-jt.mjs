/**
 * Test: enviar email de comparación a Javier Andrade (ADR-DEMO-011)
 * Simula exactamente lo que hace el botón "📧 Comparación" del dashboard
 */
import dotenv from 'dotenv';
dotenv.config();

import { buildEmailTemplate } from '../src/servicios/email-template-system.js';
import { sendEmail, AGENT_FROM_NAMES, DEFAULT_FROM_EMAIL } from '../src/servicios/email.js';

const primaAnual   = 830;
const primaMensual = Math.round(primaAnual / 12);
const adminCC      = process.env.COWORKIA_ADMIN_EMAIL || '';

const html = buildEmailTemplate('adriana', 'COMPARISON_V2', {
  nombre:           'Javier Andrade',
  marca:            'Hyundai',
  modelo:           'Creta',
  anio:             2022,
  placa:            '-',
  valor_asegurado:  '$16,000',
  vaz_prima_anual:  `$${primaAnual}`,
  vaz_prima_mensual:`$${primaMensual}`,
  vaz_deducible:    '7%',
  analisis_broker:  'Hola Javier, analicé el mercado ecuatoriano para tu Hyundai Creta 2022 y el Plan Elemental de VAZ Seguros ofrece la mejor relación precio-cobertura. Con $830/año cuentas con cobertura amplia, taller propio en Quito y asistencia 24/7. Además puedes pagarlo en hasta 12 cuotas cómodas.',
  competitors:      [],
  fecha_cotizacion: 'marzo 22, 2026',
  bot_phone:        (process.env.BOT_PHONE || '593994837117').replace('+', ''),
  adriana_email:    process.env.COWORKIA_ADMIN_EMAIL || 'adriana@segpopular.com.ec',
  adriana_phone:    process.env.ADRIANA_PHONE || process.env.BOT_PHONE || '',
});

const result = await sendEmail({
  to:      'jota@nube.ec',
  cc:      adminCC || undefined,
  subject: '🛡️ Tu cotización de seguro · Hyundai Creta 2022 · ADR-JT-001',
  html,
  from:    { name: AGENT_FROM_NAMES.adriana || 'Adriana · SegPopular', address: DEFAULT_FROM_EMAIL },
});

console.log('✅ Email enviado a: jota@nube.ec');
if (adminCC) console.log('📋 CC a admin:', adminCC);
console.log('Result:', JSON.stringify(result));
