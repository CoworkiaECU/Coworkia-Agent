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

// ─── FALLBACK: caso de demostración estático ─────────────────────────────────
// Se usa cuando no hay casos reales en la BD (ambiente nuevo / sin historial)

const DEMO_FALLBACK = {
  vehicleData: {
    marca: 'Toyota',
    modelo: 'Hilux 4x4',
    año: '2022',
  },
  damageAnalysis: {
    success: true,
    severity: 'MODERADO',
    affectedParts: ['Parachoques delantero', 'Capó', 'Guardafango derecho', 'Faro derecho'],
    hiddenDamageRisk: 'MEDIO',
    estimatedRepairDays: '4-6 días',
    analysis: {
      summary: 'Impacto frontal moderado con deformación en capó, daño estructural leve en parachoques y faro derecho fracturado. Guardafango con abolladuras y rayones profundos.',
    },
  },
  quoteDetails: `🔍 *RESUMEN DE DAÑOS*
Impacto frontal moderado: capó con deformación central, parachoques delantero desplazado, guardafango derecho con abolladuras profundas y faro derecho fracturado.

🔧 *TRABAJOS REQUERIDOS*
• Enderezada y masillado de capó (8-10 h) → $200-$250
• Reemplazo parachoques delantero (plástico + pintado) → $180-$280
• Enderezada guardafango derecho (4-6 h) → $100-$150
• Reemplazo faro delantero derecho (original) → $150-$250
• Preparación, imprimante y pintura 3 paneles → $300-$450
• Pulido y encerado de acabado → $60-$80

💰 *DESGLOSE*
Mano de obra:  $300 - $430
Materiales:    $180 - $280
Repuestos:     $150 - $250
━━━━━━━━━━━━━━━━━━━━━━━━
*TOTAL ESTIMADO: $800 - $1,500 USD*

⏱️ *TIEMPO ESTIMADO:* 4-6 días hábiles

⚠️ *NOTAS IMPORTANTES*
• Cotización preliminar basada en análisis fotográfico
• Inspección física puede revelar daños adicionales no visibles
• Precios sujetos a disponibilidad de repuestos en Ecuador`,
  priceRange: { min: 800, max: 1500 },
  photoUrls: [],
};

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

  // 3. Fallback estático — funciona siempre, sin fotos
  console.log('[AXEL-DEMO] ℹ️ Sin casos reales en BD — usando demo estático sin fotos');
  return DEMO_FALLBACK;
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
