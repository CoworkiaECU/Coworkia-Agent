/**
 * Reenvía una cotización guardada en BD a un email específico
 * Uso: node scripts/resend-quote.mjs <QUOTE_CODE_O_LAST> <EMAIL>
 * Ej: node scripts/resend-quote.mjs AXEL-2026-0001 yo@diegovillota.com
 *     node scripts/resend-quote.mjs last yo@diegovillota.com
 */
import { config } from 'dotenv';
config();

const [,, quoteCodeArg, targetEmail] = process.argv;

if (!quoteCodeArg || !targetEmail) {
  console.error('Uso: node scripts/resend-quote.mjs <QUOTE_CODE|last> <EMAIL>');
  process.exit(1);
}

import databaseService from '../src/database/database.js';
const { sendQuoteEmail } = await import('../src/servicios/axel-quote-email.js');

await databaseService.initialize();

// Buscar cotización — soporta "last" o por id/código en columna id o buscando en quote_details
let quote;
if (quoteCodeArg.toLowerCase() === 'last') {
  console.log('\n🔍 Buscando última cotización...');
  quote = await databaseService.get(
    `SELECT * FROM collision_quotes ORDER BY created_at DESC LIMIT 1`
  );
} else {
  // Intentar por quote_code, luego por id, luego la más reciente
  console.log(`\n🔍 Buscando cotización ${quoteCodeArg}...`);
  quote = await databaseService.get(
    `SELECT * FROM collision_quotes WHERE quote_code = $1 OR id = $1 ORDER BY timestamp DESC NULLS LAST LIMIT 1`,
    [quoteCodeArg]
  ).catch(() => null);
  // Si no encontró, buscar en quote_details
  if (!quote) {
    quote = await databaseService.get(
      `SELECT * FROM collision_quotes WHERE CAST(quote_details AS TEXT) ILIKE $1 ORDER BY timestamp DESC NULLS LAST LIMIT 1`,
      [`%${quoteCodeArg}%`]
    ).catch(() => null);
  }
  // Si sigue sin encontrar, traer la más reciente
  if (!quote) {
    console.log(`⚠️  No encontré por código, usando la más reciente...`);
    quote = await databaseService.get(
      `SELECT * FROM collision_quotes ORDER BY id DESC LIMIT 1`
    );
  }
}

if (!quote) {
  console.error(`❌ No hay cotizaciones en la base de datos`);
  process.exit(1);
}

// Parsear campos JSON
const photoUrls = typeof quote.photo_urls === 'string' ? JSON.parse(quote.photo_urls) : (quote.photo_urls || []);
const damageAnalysis = typeof quote.damage_analysis === 'string' ? JSON.parse(quote.damage_analysis) : (quote.damage_analysis || {});
const quoteDetails = typeof quote.quote_details === 'string' ? (() => { try { return JSON.parse(quote.quote_details); } catch { return { raw_text: quote.quote_details }; } })() : (quote.quote_details || {});

const priceRange = (quote.price_min && quote.price_max)
  ? { min: parseFloat(quote.price_min), max: parseFloat(quote.price_max) }
  : null;

console.log(`✅ Encontrada: [${quote.id}]`);
console.log(`   Cliente: ${quote.client_name || '(sin nombre)'}`);
console.log(`   Vehículo: ${quote.vehicle_brand} ${quote.vehicle_model} ${quote.vehicle_year}`);
console.log(`   Precio: $${quote.price_min} - $${quote.price_max} USD`);
console.log(`   Fotos guardadas: ${photoUrls.length}`);
console.log(`   Creada: ${quote.created_at}`);
console.log(`\n📧 Enviando a ${targetEmail}...`);

const result = await sendQuoteEmail({
  customerEmail: targetEmail,
  customerName: quote.client_name || 'Cliente',
  vehicleData: {
    marca: quote.vehicle_brand || 'N/A',
    modelo: quote.vehicle_model || 'N/A',
    año: quote.vehicle_year || ''
  },
  damageAnalysis,
  quote: quoteDetails,
  priceRange,
  photoUrls,
  quoteCode: quoteCodeArg === 'last' ? `REENVIO-${quote.id?.slice(0,8)}` : quoteCodeArg
});

if (result.success) {
  console.log(`\n✅ Cotización reenviada exitosamente a ${targetEmail}`);
  console.log(`   (con copia a villotaj71@gmail.com y mktlab.ec@gmail.com)`);
} else {
  console.error(`\n❌ Error enviando: ${result.error}`);
}

process.exit(result.success ? 0 : 1);
