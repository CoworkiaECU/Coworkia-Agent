/**
 * 🛡️ Adriana Multi-Quote Engine
 * 
 * Genera cotizaciones simultáneas de N aseguradoras a partir de datos del vehículo.
 * Consulta insurance_providers + insurance_rates en BD para obtener tasas vigentes.
 * Fallback: si no hay providers en BD, usa solo el calculador VAZ local.
 *
 * USO:
 *   const quotes = await generateMultiQuotes({
 *     commercialValue: 16000,
 *     vehicleYear: 2022,
 *     vehicleCategory: 'liviano',
 *   });
 *   // → [{ provider, plan, annualPremium, monthlyPremium, deductible, coverages, isRecommended }, ...]
 */

import databaseService from '../database/database.js';
import { calculateVehiclePremium } from './adriana-quote-calculator.js';

const IVA_RATE = 0.15;
const FIXED_FEES = 25; // emisión + superintendencia + admin aprox

/**
 * Obtiene todos los proveedores activos con sus tasas aplicables
 */
async function getActiveProviderRates(vehicleCategory, vehicleYear) {
  try {
    await databaseService.initialize();
    const currentYear = new Date().getFullYear();
    const vehicleAge = vehicleYear ? currentYear - vehicleYear : 0;

    const rows = await databaseService.all(`
      SELECT 
        p.id AS provider_id, p.name, p.slug, p.logo_url, p.contact_info,
        r.base_rate, r.deductible_pct, r.has_roadside, r.has_replacement_vehicle,
        r.plan_name, r.coverages
      FROM insurance_providers p
      JOIN insurance_rates r ON r.provider_id = p.id
      WHERE p.active = true
        AND r.active = true
        AND r.vehicle_category = $1
        AND $2 BETWEEN r.year_range_min AND r.year_range_max
      ORDER BY r.base_rate ASC
    `, [vehicleCategory, vehicleAge]);

    return rows || [];
  } catch (err) {
    console.error('[MULTI-QUOTE] ❌ Error consultando providers:', err.message);
    return [];
  }
}

/**
 * Calcula prima a partir de base_rate, valor comercial, IVA y fees
 */
function calculatePremiumFromRate(commercialValue, baseRate) {
  const basePremium = commercialValue * baseRate;
  const iva = basePremium * IVA_RATE;
  const annual = Math.round(basePremium + iva + FIXED_FEES);
  const monthly = Math.round(annual / 12);
  return { annual, monthly, basePremium: Math.round(basePremium), iva: Math.round(iva) };
}

/**
 * Genera cotizaciones de todas las aseguradoras activas
 *
 * @param {object} params
 * @param {number} params.commercialValue — Valor comercial USD
 * @param {number} params.vehicleYear    — Año del vehículo
 * @param {string} [params.vehicleCategory='liviano'] — Categoría
 * @returns {Promise<Array>} Array de cotizaciones ordenadas por prima anual ASC
 */
export async function generateMultiQuotes({
  commercialValue,
  vehicleYear,
  vehicleCategory = 'liviano',
}) {
  const quotes = [];

  // 1) Obtener providers de BD
  const providerRates = await getActiveProviderRates(vehicleCategory, vehicleYear);

  for (const pr of providerRates) {
    // Si es VAZ, usar el calculador local (más preciso, tiene tramos por valor)
    if (pr.slug === 'vaz') {
      const vazResult = calculateVehiclePremium({
        commercialValue,
        vehicleYear,
        vehicleCategory: vehicleCategory === 'liviano' ? 'light' : vehicleCategory,
        coverage: 'standard',
        insurer: 'VAZ',
      });

      if (vazResult.success) {
        quotes.push({
          provider_id: pr.provider_id,
          provider: pr.name,
          slug: pr.slug,
          logo_url: pr.logo_url,
          plan: vazResult.coverageLabel || 'Elemental',
          annualPremium: vazResult.annual_total,
          monthlyPremium: vazResult.monthly_installment,
          deductiblePct: 7,
          deductible: vazResult.deductible_option || 'Taller Designado 7%',
          hasRoadside: true,
          hasReplacementVehicle: true,
          coverages: pr.coverages || vazResult.includes || [],
          isRecommended: true,
          source: 'calculator',
        });
        continue;
      }
    }

    // Para otras aseguradoras, calcular con base_rate de BD
    const premium = calculatePremiumFromRate(commercialValue, parseFloat(pr.base_rate));
    quotes.push({
      provider_id: pr.provider_id,
      provider: pr.name,
      slug: pr.slug,
      logo_url: pr.logo_url,
      plan: pr.plan_name || 'Estándar',
      annualPremium: premium.annual,
      monthlyPremium: premium.monthly,
      deductiblePct: parseFloat(pr.deductible_pct),
      deductible: `${pr.deductible_pct}%`,
      hasRoadside: pr.has_roadside,
      hasReplacementVehicle: pr.has_replacement_vehicle,
      coverages: pr.coverages || [],
      isRecommended: false,
      source: 'db_rate',
    });
  }

  // Fallback: si no encontramos nada en BD, usar calculador VAZ local
  if (quotes.length === 0) {
    const vazResult = calculateVehiclePremium({
      commercialValue,
      vehicleYear,
      vehicleCategory: vehicleCategory === 'liviano' ? 'light' : vehicleCategory,
      coverage: 'standard',
      insurer: 'VAZ',
    });
    if (vazResult.success) {
      quotes.push({
        provider_id: null,
        provider: 'VAZ Seguros',
        slug: 'vaz',
        logo_url: 'https://coworkia-agent-e97d15dac56f.herokuapp.com/assets/logos/segpopular.png',
        plan: vazResult.coverageLabel || 'Elemental',
        annualPremium: vazResult.annual_total,
        monthlyPremium: vazResult.monthly_installment,
        deductiblePct: 7,
        deductible: 'Taller Designado 7%',
        hasRoadside: true,
        hasReplacementVehicle: true,
        coverages: [],
        isRecommended: true,
        source: 'calculator_fallback',
      });
    }
  }

  // Ordenar por prima anual (más barata primero)
  quotes.sort((a, b) => a.annualPremium - b.annualPremium);

  // Marcar la más barata como recomendada (si no es VAZ, actualizar)
  if (quotes.length > 0 && quotes[0].slug === 'vaz') {
    quotes[0].isRecommended = true;
  }

  return quotes;
}

/**
 * Persiste las cotizaciones en insurance_lead_quotes
 */
export async function saveLeadQuotes(leadId, quotes) {
  if (!quotes?.length) return;

  try {
    await databaseService.initialize();
    for (const q of quotes) {
      if (!q.provider_id) continue; // Skip fallback sin provider_id
      await databaseService.run(`
        INSERT INTO insurance_lead_quotes (lead_id, provider_id, plan_name, annual_premium, monthly_premium, deductible_pct, coverages, is_recommended)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [leadId, q.provider_id, q.plan, q.annualPremium, q.monthlyPremium, q.deductiblePct, JSON.stringify(q.coverages), q.isRecommended]);
    }
    console.log(`[MULTI-QUOTE] ✅ ${quotes.length} cotizaciones guardadas para lead ${leadId}`);
  } catch (err) {
    console.error(`[MULTI-QUOTE] ❌ Error guardando quotes para lead ${leadId}:`, err.message);
  }
}

/**
 * Formatea quotes para el template COMPARISON_V2
 * @returns {{ vazQuote, competitors }} — Datos listos para el template
 */
export function formatQuotesForTemplate(quotes) {
  const vazQuote = quotes.find(q => q.slug === 'vaz') || quotes[0];
  const competitors = quotes
    .filter(q => q.slug !== 'vaz')
    .map(q => ({
      nombre: q.provider,
      plan: q.plan,
      prima_anual: `$${q.annualPremium.toLocaleString()}`,
      prima_mensual: `$${q.monthlyPremium}/mes`,
      deducible: q.deductible,
      asistencia: q.hasRoadside ? '✅ 24/7' : '❌',
    }));

  return {
    vaz_prima_anual: vazQuote ? `$${vazQuote.annualPremium.toLocaleString()}` : '',
    vaz_prima_mensual: vazQuote ? `$${vazQuote.monthlyPremium}/mes` : '',
    vaz_deducible: vazQuote ? `${vazQuote.deductiblePct}%` : '7%',
    competitors,
  };
}
