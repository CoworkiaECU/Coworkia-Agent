/**
 * Preview de correos HTML de todos los agentes
 * Genera archivos HTML en /tmp/email-previews/ para revisión en navegador
 *
 * Uso: node scripts/preview-emails.mjs
 *      node scripts/preview-emails.mjs --open   (abre en navegador)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Agregar el directorio raíz al path para que los imports funcionen
process.chdir(ROOT);

// ─── Imports de templates ────────────────────────────────────────────────────
const {
  generateAdrianaEmailHTML,
  generateAxelEmailHTML,
  generateEnzoEmailHTML,
  generateAlunaEmailHTML,
  generateGabiEmailHTML,
  generatePaulaEmailHTML,
  generateAlunaProformaHTML,
} = await import('../src/servicios/generic-email-templates.js');

const { generatePaymentReceiptHTML } = await import('../src/servicios/payment-receipt-email.js').catch(() => {
  console.warn('⚠️  payment-receipt-email.js no exporta generatePaymentReceiptHTML — se omite');
  return { generatePaymentReceiptHTML: null };
});

// ─── Mock data por agente ────────────────────────────────────────────────────

const adrianaConfirmData = {
  userName: 'Carlos Mendoza',
  insuranceType: 'Auto',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Corolla',
  vehicleYear: '2020',
  cedula: '1712345678',
  email: 'carlos@ejemplo.com',
  phone: '0991234567',
  commercialValue: '18,500',
  quotedPremium: '420',
  leadId: 'SEG-2024-0142',
};

// Datos para _adrianaQuoteHTML (boss-cmd — usa campos distintos al confirmation)
const adrianaQuoteData = {
  nombre: 'María Fernanda López',
  vehicleBrand: 'Toyota',
  vehicleModel: 'RAV4',
  vehicleYear: '2021',
  cedula: '1756789012',
  commercialValue: 28000,
  quotedPremium: 680,
  quotedMonthly: 68,
  quoteCode: 'SEG-2024-0143',
  waNumber: '593994837117',
  intro_personalizada: 'Estimada María Fernanda, hemos analizado el perfil de riesgo de su Toyota RAV4 2021 y preparamos la cotización más competitiva del mercado ecuatoriano para proteger su inversión.',
  detalles: [
    { label: 'Cobertura', value: 'Todo Riesgo + Responsabilidad Civil' },
    { label: 'Valor asegurado', value: '$28,000 USD' },
    { label: 'Deducible', value: '$500 USD o 1% del valor asegurado' },
    { label: 'Vigencia', value: '1 año' },
  ],
};

const axelData = {
  customerName: 'Roberto Villalba',
  quoteCode: 'AXL-2024-0721',
  userLanguage: 'es',
  vehicleData: {
    marca: 'Hyundai',
    modelo: 'Tucson',
    anio: '2019',
    color: 'Gris Plata',
    placa: 'PBP-1234',
  },
  damageAnalysis: {
    areas: ['Parachoques delantero', 'Capó'],
    severity: 'Moderado',
    estimatedRepairDays: '4-6 días hábiles',
  },
  quote: {
    total_min: 480,
    total_max: 650,
    nota_inspeccion: 'Se requiere inspección presencial para confirmar daños en estructura interna.',
    dias_entrega: '5 días hábiles',
    garantia: '1 año en pintura y trabajos de hojalatería',
    items: [
      { concepto: 'Reparación parachoques delantero', min: 180, max: 240 },
      { concepto: 'Pintura capó (3 capas + barniz)', min: 220, max: 290 },
      { concepto: 'Trabajos de hojalatería', min: 80, max: 120 },
    ],
  },
  priceRange: { min: '480', max: '650' },
  photoAssets: [], // Sin fotos para preview simplificado
};

const enzoConfirmData = {
  userName: 'Valentina Ramos',
  projectType: 'Marketing Digital',
  company: 'FoodTech EC',
  budgetRange: '$800–1,200/mes',
  urgency: 'Alta',
  email: 'valentina@foodtech.ec',
  phone: '0999887766',
  leadId: 'MKT-2024-0339',
};

// Datos específicos para _enzoProposalHTML (boss-cmd)
const enzoProposalData = {
  empresa: 'Buildex Constructora',
  contacto: 'Jorge Palacios',
  waNumber: '593994837117',
  quoteCode: 'MKT-2024-0340',
  nivel_agente: 'avanzado',
  intro_personalizada: 'Analizamos el perfil de Buildex Constructora y diseñamos un agente IA que captura leads de compradores de propiedades residenciales en tiempo real, califica su presupuesto y agenda visitas automáticamente.',
  casos_uso: [
    'Responde consultas sobre disponibilidad de departamentos 24/7',
    'Califica prospectos por presupuesto y zona de interés',
    'Agenda visitas y envía recordatorios automáticos por WhatsApp',
    'Integra CRM con seguimiento de pipeline de ventas',
  ],
  precio_desarrollo: 1800,
  aplica_descuento: true,
  precio_con_descuento: 1500,
  sector: 'Construcción y Real Estate',
  necesidad: 'Generación de leads calificados para proyectos residenciales',
};

const alunaData = {
  userName: 'Sofía Herrera',
  membershipType: 'Mensual Flex',
  startDate: '2024-02-01',
  email: 'sofia@startup.ec',
  phone: '0994567890',
  companyName: 'Herrera Consulting',
  leadId: 'ALU-2024-0589',
};

const gabiData = {
  userName: 'Andrés Caicedo',
  consultationType: 'Asesoría Tributaria',
  company: 'Importadora Andina S.A.',
  rucNumber: '1791234560001',
  urgency: 'Normal',
  email: 'andres@importadora.ec',
  phone: '0993456789',
  leadId: 'GR-2024-0204',
  consultationCode: 'CONS-20240204',
  recipientType: 'client',
};

const paulaData = {
  userName: 'Diego Villota',
  operationType: 'Arriendo',
  propertyType: 'Departamento',
  zone: 'La Carolina',
  budgetRange: '$600–900/mes',
  propertySize: '80–100m²',
  bedrooms: '2–3',
  features: ['Parqueadero', 'Terraza', 'Gimnasio'],
  email: 'diego@ejemplo.com',
  phone: '0991234567',
  leadId: 'PROP-2024-1042',
  visitDate: '2024-02-10',
  visitTime: '15:00',
  propertyAddress: 'Av. Amazonas N36-152',
};

const alunaProformaData = {
  userName: 'Laura Suárez',
  email: 'laura@empresa.ec',
  phone: '0992345678',
  company: 'Suárez & Asociados',
  membershipType: 'Anual Premium',
  price: '2,400',
  period: 'anual',
  startDate: '2024-02-01',
  endDate: '2025-01-31',
  leadId: 'PRO-2024-0077',
  items: [
    { description: 'Membresía Coworkia Premium Anual', quantity: 1, unitPrice: '2,400', total: '2,400' },
  ],
  subtotal: '2,400',
  iva: '312',
  total: '2,712',
};

// ─── Generar todos los HTML ──────────────────────────────────────────────────

const previews = [];

function add(slug, label, agent, html) {
  previews.push({ slug, label, agent, html });
}

// Adriana — confirmación y cotización
add('adriana-confirm-es', 'Adriana – Confirmación ES', 'adriana',
  generateAdrianaEmailHTML(adrianaConfirmData, { type: 'confirmation', userLanguage: 'es' }));
add('adriana-confirm-en', 'Adriana – Confirmación EN', 'adriana',
  generateAdrianaEmailHTML(adrianaConfirmData, { type: 'confirmation', userLanguage: 'en' }));
add('adriana-quote-es', 'Adriana – Cotización (boss-cmd) ES', 'adriana',
  generateAdrianaEmailHTML(adrianaQuoteData, { type: 'quote', userLanguage: 'es' }));

// Axel
add('axel-quote-es', 'Axel – Cotización Automotriz ES', 'axel',
  generateAxelEmailHTML({ ...axelData, userLanguage: 'es' }));
add('axel-quote-en', 'Axel – Cotización Automotriz EN', 'axel',
  generateAxelEmailHTML({ ...axelData, userLanguage: 'en' }));

// Enzo — confirmación y propuesta
add('enzo-confirm-es', 'Enzo – Confirmación ES', 'enzo',
  generateEnzoEmailHTML(enzoConfirmData, { type: 'confirmation', userLanguage: 'es' }));
add('enzo-proposal-es', 'Enzo – Propuesta (boss-cmd) ES', 'enzo',
  generateEnzoEmailHTML(enzoProposalData, { type: 'proposal', userLanguage: 'es' }));

// Aluna
add('aluna-confirm-es', 'Aluna – Membresía Coworkia ES', 'aluna',
  generateAlunaEmailHTML(alunaData, 'es'));
add('aluna-confirm-en', 'Aluna – Membresía Coworkia EN', 'aluna',
  generateAlunaEmailHTML(alunaData, 'en'));
add('aluna-confirm-fr', 'Aluna – Membresía Coworkia FR', 'aluna',
  generateAlunaEmailHTML(alunaData, 'fr'));

// Gabi
add('gabi-consult-es', 'Gabi – Consultoría GR ES', 'gabi',
  generateGabiEmailHTML(gabiData, 'es'));
add('gabi-consult-en', 'Gabi – Consultoría GR EN', 'gabi',
  generateGabiEmailHTML(gabiData, 'en'));

// Paula
add('paula-search-es', 'Paula – Búsqueda PropElite ES', 'paula',
  generatePaulaEmailHTML(paulaData, { userLanguage: 'es' }));
add('paula-search-en', 'Paula – Búsqueda PropElite EN', 'paula',
  generatePaulaEmailHTML(paulaData, { userLanguage: 'en' }));

// Aluna Proforma
add('aluna-proforma-es', 'AlunaProforma – Proforma Membresía ES', 'proforma',
  generateAlunaProformaHTML(alunaProformaData, 'es'));

// ─── Escribir archivos ───────────────────────────────────────────────────────

const outDir = '/tmp/email-previews';
mkdirSync(outDir, { recursive: true });

for (const p of previews) {
  const filePath = `${outDir}/${p.slug}.html`;
  writeFileSync(filePath, p.html, 'utf8');
}

// ─── Generar index.html ──────────────────────────────────────────────────────

const agentColors = {
  adriana:  { bg: '#FEF3C7', border: '#FDE68A', dot: '#D97706', label: 'SegPopular' },
  axel:     { bg: '#FEE2E2', border: '#FECACA', dot: '#DC2626', label: 'PaintBull' },
  enzo:     { bg: '#D1FAE5', border: '#A7F3D0', dot: '#059669', label: 'MarketingLab' },
  aluna:    { bg: '#CCFBF1', border: '#99F6E4', dot: '#0D9488', label: 'Coworkia' },
  gabi:     { bg: '#DBEAFE', border: '#BFDBFE', dot: '#2563EB', label: 'GR Consulting' },
  paula:    { bg: '#F3E8FF', border: '#E9D5FF', dot: '#7C3AED', label: 'PropElite' },
  proforma: { bg: '#E0F2FE', border: '#BAE6FD', dot: '#0284C7', label: 'Proformas' },
};

const cards = previews.map(p => {
  const c = agentColors[p.agent] || { bg: '#F9FAFB', border: '#E5E7EB', dot: '#6B7280', label: p.agent };
  return `
    <a href="${p.slug}.html" target="_blank"
       style="display:block;background:${c.bg};border:1.5px solid ${c.border};border-radius:14px;padding:18px 20px;text-decoration:none;color:inherit;transition:box-shadow .15s;"
       onmouseover="this.style.boxShadow='0 4px 14px rgba(0,0,0,.12)'"
       onmouseout="this.style.boxShadow='none'">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${c.dot};flex-shrink:0;"></div>
        <span style="font-size:11px;font-weight:700;color:${c.dot};letter-spacing:.8px;text-transform:uppercase;">${c.label}</span>
      </div>
      <div style="font-size:14px;font-weight:600;color:#111827;line-height:1.4;">${p.label}</div>
      <div style="font-size:12px;color:#6B7280;margin-top:4px;">${p.slug}.html →</div>
    </a>`;
}).join('\n');

const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Preview Correos — Coworkia Agentes</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           background: #F9FAFB; color: #111827; padding: 40px 20px; }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 6px; }
    .sub { color: #6B7280; font-size: 14px; margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .section { margin-bottom: 10px; font-size: 12px; font-weight: 700; color: #9CA3AF;
               letter-spacing: 1.5px; text-transform: uppercase; padding-top: 20px; }
    .count { background: #111827; color: white; font-size: 12px; font-weight: 700;
             padding: 2px 8px; border-radius: 20px; margin-left: 8px; }
  </style>
</head>
<body>
  <h1>📧 Preview Correos — Coworkia Agentes</h1>
  <p class="sub">
    ${previews.length} plantillas generadas · Generado ${new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}
    · <code style="background:#E5E7EB;padding:2px 6px;border-radius:4px;font-size:12px;">node scripts/preview-emails.mjs</code>
  </p>
  <div class="grid">
    ${cards}
  </div>
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #E5E7EB;color:#9CA3AF;font-size:12px;">
    Archivos en <code>${outDir}/</code> · Abre en Chrome/Safari y redimensiona a 375px, 600px, 1200px para simular dispositivos
  </div>
</body>
</html>`;

writeFileSync(`${outDir}/index.html`, indexHtml, 'utf8');

console.log(`\n✅ ${previews.length} templates generados en ${outDir}/\n`);
previews.forEach(p => console.log(`   · ${p.label}`));
console.log(`\n📂 Índice: file://${outDir}/index.html\n`);

// Abrir automáticamente si se pasa --open
if (process.argv.includes('--open')) {
  try {
    execSync(`open file://${outDir}/index.html`);
  } catch {
    console.log('💡 Abre manualmente: file:///tmp/email-previews/index.html');
  }
}
