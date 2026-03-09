/**
 * 🚗 AXEL DEMO QUOTE EMAIL SERVICE
 * Cotización de demostración para The PaintBull
 *
 * Flujo: el jefe ordena desde WhatsApp →
 *   1. Recupera el MEJOR caso real de la memoria (fotos + análisis + cotización)
 *   2. Reemplaza solo el nombre y email del interesado
 *   3. Genera un nuevo código de cotización
 *   4. Envía el email HTML con las fotos reales del caso
 *
 * Nunca expone datos del cliente original — solo usa sus fotos y análisis como demo.
 */

import databaseService from '../database/database.js';
import { complete } from '../servicios-ia/openai.js';
import { sendQuoteEmail } from './axel-quote-email.js';
import { generateQuoteCode } from './axel-quote-code.js';

// ─── CASOS DE DEMOSTRACIÓN ────────────────────────────────────────────────────
// Fotos reales alojadas en /public/images/axel-demo/ → servidas por express.static
// Se rota aleatoriamente cuando no hay casos reales en BD.

const BASE_URL = 'https://coworkia-agent-e97d15dac56f.herokuapp.com';

const DEMO_CASES = [
  // ── 1. Toyota RAV4 2010 ──────────────────────────────────────────────────
  {
    vehicleData: { marca: 'Toyota', modelo: 'RAV4', año: '2010' },
    damageAnalysis: {
      success: true,
      severity: 'MODERADO',
      affectedParts: ['Parachoques delantero', 'Guardafango izquierdo', 'Faro izquierdo', 'Capó'],
      hiddenDamageRisk: 'MEDIO',
      estimatedRepairDays: '5-7 días',
      analysis: {
        summary: 'Impacto lateral-frontal izquierdo con deformación en guardafango, parachoques desplazado y faro izquierdo fracturado. Capó con abolladuras y rayones que requieren masillado.',
      },
    },
    quoteDetails: `🔍 *RESUMEN DE DAÑOS*
Impacto lateral-frontal izquierdo: guardafango con abolladuras profundas, parachoques delantero desplazado, faro izquierdo fracturado y capó con rayones extensos.

🔧 *TRABAJOS REQUERIDOS*
• Enderezada y masillado de guardafango izquierdo (6-8 h) → $150-$200
• Reemplazo parachoques delantero (plástico + pintado) → $180-$280
• Reemplazo faro delantero izquierdo (original) → $120-$200
• Masillado y pintura de capó → $180-$250
• Preparación, imprimante y pintura 3 paneles → $280-$400
• Pulido y encerado de acabado → $60-$80

💰 *DESGLOSE*
Mano de obra:  $280 - $400
Materiales:    $160 - $250
Repuestos:     $120 - $200
━━━━━━━━━━━━━━━━━━━━━━━━
*TOTAL ESTIMADO: $700 - $1,200 USD*

⏱️ *TIEMPO ESTIMADO:* 5-7 días hábiles

⚠️ *NOTAS IMPORTANTES*
• Cotización preliminar basada en análisis fotográfico
• Inspección física puede revelar daños adicionales no visibles
• Precios sujetos a disponibilidad de repuestos en Ecuador`,
    priceRange: { min: 700, max: 1200 },
    photoUrls: [
      `${BASE_URL}/images/axel-demo/toyota-rav4-2010/foto1.JPG`,
      `${BASE_URL}/images/axel-demo/toyota-rav4-2010/foto2.JPG`,
      `${BASE_URL}/images/axel-demo/toyota-rav4-2010/foto3.JPG`,
      `${BASE_URL}/images/axel-demo/toyota-rav4-2010/foto4.JPG`,
    ],
  },

  // ── 2. Hyundai Sonata 2016 ───────────────────────────────────────────────
  {
    vehicleData: { marca: 'Hyundai', modelo: 'Sonata', año: '2016' },
    damageAnalysis: {
      success: true,
      severity: 'MODERADO-ALTO',
      affectedParts: ['Puerta delantera derecha', 'Puerta trasera derecha', 'Guardafango trasero derecho', 'Espejo derecho'],
      hiddenDamageRisk: 'ALTO',
      estimatedRepairDays: '6-8 días',
      analysis: {
        summary: 'Colisión lateral derecha con deformación en ambas puertas y guardafango trasero. Espejo fracturado. Alto riesgo de daño estructural en umbral de puertas.',
      },
    },
    quoteDetails: `🔍 *RESUMEN DE DAÑOS*
Colisión lateral derecha: puerta delantera y trasera con abolladuras severas, guardafango trasero deformado, espejo derecho fracturado. Se recomienda inspección de umbral y estructura lateral.

🔧 *TRABAJOS REQUERIDOS*
• Enderezada puerta delantera derecha (8-10 h) → $200-$280
• Enderezada puerta trasera derecha (8-10 h) → $200-$280
• Enderezada guardafango trasero derecho (5-7 h) → $130-$180
• Reemplazo espejo derecho completo → $90-$150
• Inspección y refuerzo de umbral lateral → $100-$180
• Pintura 3 paneles (puertas + guardafango) → $350-$500
• Pulido y encerado → $60-$80

💰 *DESGLOSE*
Mano de obra:  $380 - $520
Materiales:    $200 - $320
Repuestos:     $90 - $150
━━━━━━━━━━━━━━━━━━━━━━━━
*TOTAL ESTIMADO: $900 - $1,600 USD*

⏱️ *TIEMPO ESTIMADO:* 6-8 días hábiles

⚠️ *NOTAS IMPORTANTES*
• Cotización preliminar basada en análisis fotográfico
• Inspección física puede revelar daños adicionales no visibles
• Precios sujetos a disponibilidad de repuestos en Ecuador`,
    priceRange: { min: 900, max: 1600 },
    photoUrls: [
      `${BASE_URL}/images/axel-demo/hyundai-sonata-2016/foto1.JPG`,
      `${BASE_URL}/images/axel-demo/hyundai-sonata-2016/foto2.JPG`,
      `${BASE_URL}/images/axel-demo/hyundai-sonata-2016/foto3.JPG`,
      `${BASE_URL}/images/axel-demo/hyundai-sonata-2016/foto4.JPG`,
    ],
  },

  // ── 3. Kia Picanto 2019 ──────────────────────────────────────────────────
  {
    vehicleData: { marca: 'Kia', modelo: 'Picanto', año: '2019' },
    damageAnalysis: {
      success: true,
      severity: 'LEVE-MODERADO',
      affectedParts: ['Parachoques trasero', 'Tapa del maletero', 'Luz trasera derecha'],
      hiddenDamageRisk: 'BAJO',
      estimatedRepairDays: '3-4 días',
      analysis: {
        summary: 'Impacto trasero leve con deformación en parachoques y abolladuras menores en tapa de maletero. Luz trasera derecha con fisura. Sin indicios de daño estructural.',
      },
    },
    quoteDetails: `🔍 *RESUMEN DE DAÑOS*
Impacto trasero leve: parachoques con deformación y rayones, tapa de maletero con abolladuras menores, luz trasera derecha con fisura superficial.

🔧 *TRABAJOS REQUERIDOS*
• Reparación y masillado parachoques trasero → $100-$150
• Enderezada y masillado tapa de maletero (3-4 h) → $100-$140
• Reemplazo luz trasera derecha → $60-$100
• Pintura parachoques + maletero (2 paneles) → $180-$260
• Pulido y encerado → $40-$60

💰 *DESGLOSE*
Mano de obra:  $160 - $220
Materiales:    $100 - $160
Repuestos:     $60 - $100
━━━━━━━━━━━━━━━━━━━━━━━━
*TOTAL ESTIMADO: $400 - $700 USD*

⏱️ *TIEMPO ESTIMADO:* 3-4 días hábiles

⚠️ *NOTAS IMPORTANTES*
• Cotización preliminar basada en análisis fotográfico
• Inspección física puede revelar daños adicionales no visibles
• Precios sujetos a disponibilidad de repuestos en Ecuador`,
    priceRange: { min: 400, max: 700 },
    photoUrls: [
      `${BASE_URL}/images/axel-demo/kia-picanto-2019/foto1.JPG`,
    ],
  },
];

// ─── DETECCIÓN ────────────────────────────────────────────────────────────────

/**
 * Detecta si el mensaje del jefe es un comando de cotización para Axel.
 * Acepta lenguaje natural: "cotización", "coti", "manda", "envía", "demo", etc.
 */
export function isAxelBossQuoteCommand(mensaje) {
  if (!mensaje) return false;
  const hasEmail   = /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/.test(mensaje);
  const hasKeyword = /cotiz[ao]ci[oó]n|coti\b|manda|env[ií]a|demo|brochure|propuesta|proforma|para\s+\w/i.test(mensaje);
  return hasEmail && hasKeyword;
}

// ─── PARSING ─────────────────────────────────────────────────────────────────

/**
 * Parsea los datos del interesado desde el comando natural del jefe usando OpenAI.
 * Acepta cualquier construcción natural sin orden fijo.
 */
export async function parseAxelDemoQuoteData(mensaje) {
  const emailMatch = mensaje.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  if (!emailMatch) return null;

  try {
    const raw = await complete(mensaje, {
      system: `El jefe de The PaintBull te envía un mensaje de WhatsApp para mandar una cotización demo a un cliente. Extrae ÚNICAMENTE este JSON (sin markdown):
{
  "nombre": "nombre completo del cliente (solo nombre, sin palabras como teléfono/cel/email)",
  "email": "email@ejemplo.com",
  "telefono": "número de teléfono o null"
}
REGLAS:
- nombre: solo el nombre de la persona, nunca descripciones adicionales
- Si no hay nombre explícito, usa "Cliente"
- telefono: cualquier número de 7+ dígitos que parezca teléfono`,
      temperature: 0.1,
      max_tokens: 120,
      model: 'gpt-4o',
    });
    const data = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    return {
      nombre:   data.nombre   || 'Cliente',
      email:    data.email    || emailMatch[0],
      telefono: data.telefono || '',
    };
  } catch {
    // Fallback regex si OpenAI falla
    const phoneMatch = mensaje.match(/(?<!\d)(?:\+?593[0-9]{9}|0[0-9]{9})(?!\d)/);
    const nombre = mensaje
      .replace(/cotiz[ao]ci[oó]n|coti\b|manda|env[ií]a|demo|para\b/gi, '')
      .replace(emailMatch[0], '')
      .replace(phoneMatch ? phoneMatch[0] : '', '')
      .replace(/\b\d{7,}\b/g, '')
      .replace(/\btelefono\b|\btel\b|\bcel\b|\bmovil\b/gi, '')
      .replace(/[,|;:]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Cliente';
    return { nombre, email: emailMatch[0], telefono: phoneMatch?.[0] || '' };
  }
}

// ─── RECUPERAR CASO DEMO DE LA MEMORIA ───────────────────────────────────────

/**
 * Recupera el mejor caso real almacenado en la BD para usarlo como demo.
 * Prioriza casos con fotos + análisis completo.
 * Fallback absoluto: caso estático si no hay historial.
 */
async function fetchBestDemoCase() {
  // 1. Intentar axel_quotes (tabla principal, tiene quote_details completo)
  try {
    await databaseService.initialize();
    const res = await databaseService.all(`
      SELECT
        vehicle_brand, vehicle_model, vehicle_year,
        damage_analysis, quote_details,
        price_min, price_max, photo_urls
      FROM axel_quotes
      WHERE photo_urls IS NOT NULL
        AND photo_urls::text != '[]'
        AND photo_urls::text != 'null'
        AND quote_details IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);

    // databaseService.all() devuelve array directamente
    const rows = Array.isArray(res) ? res : (res?.rows || []);
    if (rows.length > 0) {
      const r = rows[0];
      const photoUrls = Array.isArray(r.photo_urls) ? r.photo_urls
        : (typeof r.photo_urls === 'string' ? JSON.parse(r.photo_urls) : []);

      if (photoUrls.length > 0) {
        console.log('[AXEL-DEMO] ✅ Caso real recuperado de axel_quotes, fotos:', photoUrls.length);
        return {
          vehicleData: {
            marca: r.vehicle_brand || 'Toyota',
            modelo: r.vehicle_model || 'Hilux',
            año: r.vehicle_year   || '2022',
          },
          damageAnalysis: typeof r.damage_analysis === 'string'
            ? JSON.parse(r.damage_analysis)
            : r.damage_analysis || DEMO_FALLBACK.damageAnalysis,
          quoteDetails: r.quote_details,
          priceRange: (r.price_min && r.price_max)
            ? { min: r.price_min, max: r.price_max }
            : DEMO_FALLBACK.priceRange,
          photoUrls,
        };
      }
    }
  } catch (err) {
    console.warn('[AXEL-DEMO] axel_quotes no disponible:', err.message);
  }

  // 2. Intentar collision_quotes (tabla secundaria, upsert del mismo flujo)
  try {
    await databaseService.initialize();
    const res2 = await databaseService.all(`
      SELECT
        vehicle_brand, vehicle_model, vehicle_year,
        quote_details,
        price_min, price_max, photo_urls
      FROM collision_quotes
      WHERE photo_urls IS NOT NULL
        AND photo_urls::text != '[]'
        AND photo_urls::text != 'null'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const rows2 = Array.isArray(res2) ? res2 : (res2?.rows || []);
    if (rows2.length > 0) {
      const r = rows2[0];
      const photoUrls = Array.isArray(r.photo_urls) ? r.photo_urls
        : (typeof r.photo_urls === 'string' ? JSON.parse(r.photo_urls) : []);

      if (photoUrls.length > 0) {
        console.log('[AXEL-DEMO] ✅ Caso real recuperado de collision_quotes, fotos:', photoUrls.length);
        return {
          vehicleData: {
            marca: r.vehicle_brand || 'Toyota',
            modelo: r.vehicle_model || 'Hilux',
            año: r.vehicle_year   || '2022',
          },
          damageAnalysis: typeof r.damage_analysis === 'string'
            ? JSON.parse(r.damage_analysis)
            : r.damage_analysis || DEMO_FALLBACK.damageAnalysis,
          quoteDetails: r.quote_details || DEMO_FALLBACK.quoteDetails,
          priceRange: (r.price_min && r.price_max)
            ? { min: r.price_min, max: r.price_max }
            : DEMO_FALLBACK.priceRange,
          photoUrls,
        };
      }
    }
  } catch (err2) {
    console.warn('[AXEL-DEMO] collision_quotes no disponible:', err2.message);
  }

  // 3. Fallback a casos demo con fotos reales (rotación aleatoria)
  const randomCase = DEMO_CASES[Math.floor(Math.random() * DEMO_CASES.length)];
  console.log(`[AXEL-DEMO] ℹ️ Sin casos en BD — usando demo: ${randomCase.vehicleData.marca} ${randomCase.vehicleData.modelo} ${randomCase.vehicleData.año}`);
  return randomCase;
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────

/**
 * 🚀 Genera y envía cotización demo de The PaintBull al interesado
 * Usa un caso real de la memoria, reemplazando solo el nombre y email.
 *
 * @param {{ nombre: string, email: string, telefono: string }} datos
 */
export async function sendAxelDemoCotizacion({ nombre, email, telefono }) {
  console.log(`[AXEL-DEMO] 📧 Cotización demo para ${nombre} → ${email}`);

  // 1. Recuperar caso real de la memoria
  const demoCase = await fetchBestDemoCase();
  const hasRealPhotos = demoCase.photoUrls.length > 0;

  // 2. Nuevo código de cotización para este interesado
  let quoteCode;
  try {
    const gen = await generateQuoteCode();
    quoteCode = gen.code;
  } catch {
    quoteCode = `AXEL-${new Date().getFullYear()}-DEMO`;
  }

  console.log(`[AXEL-DEMO] 📋 Código: ${quoteCode} | Fotos reales: ${demoCase.photoUrls.length}`);

  // 3. Enviar email usando el template HTML completo de Axel
  const result = await sendQuoteEmail({
    customerEmail: email,
    customerName: nombre,
    vehicleData: demoCase.vehicleData,
    damageAnalysis: demoCase.damageAnalysis,
    quote: demoCase.quoteDetails,
    priceRange: demoCase.priceRange,
    photoUrls: demoCase.photoUrls,   // fotos reales del caso en memoria
    quoteCode,
  });

  return {
    ...result,
    nombre,
    email,
    quoteCode,
    vehicleData: demoCase.vehicleData,
    hasRealPhotos,
  };
}
