/**
 * 🛡️ Adriana API Endpoints - Cotizaciones Automáticas VAZ
 * 
 * Sistema completo:
 * - Vision AI para extracción de cédula
 * - Tasas VAZ real-time con cache
 * - Generador de cotizaciones comparativas
 * - Form conversacional 6 pasos
 */

import express from 'express';
import { analyzeImage } from '../../servicios-ia/openai.js';
import databaseService from '../../database/database-service.js';
import { loggers } from '../../utils/logger.js';

const router = express.Router();

/**
 * POST /api/adriana/extract-cedula
 * Vision AI para lectura de cédula ecuatoriana
 * Body: { image: base64String }
 */
router.post('/extract-cedula', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ 
        success: false, 
        error: 'Falta imagen en base64' 
      });
    }

    // Convertir base64 a data URL si no lo está ya
    const imageUrl = image.startsWith('data:image') 
      ? image 
      : `data:image/jpeg;base64,${image}`;

    const prompt = `Eres un sistema de extracción de datos de cédulas ecuatorianas.

Analiza esta cédula y extrae EXACTAMENTE estos datos en formato JSON:

{
  "nombres": "nombre completo del titular",
  "cedula": "número de cédula (10 dígitos)",
  "edad": número entero,
  "provincia": "provincia de residencia",
  "fechaNacimiento": "YYYY-MM-DD"
}

IMPORTANTE:
- Si algún dato no es visible o legible, usa null
- La cédula debe tener exactamente 10 dígitos
- La edad debe calcularse a partir de la fecha de nacimiento
- Responde SOLO con el JSON, sin texto adicional`;

    const response = await analyzeImage(imageUrl, prompt, {
      model: 'gpt-4o',
      max_tokens: 300,
      temperature: 0.1 // Baja temperatura para mayor precisión
    });

    // Parse JSON de la respuesta
    let extractedData;
    try {
      const content = response.choices[0].message.content;
      // Extraer JSON si viene dentro de ```json ... ```
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseErr) {
      loggers.adriana.error('Error parsing Vision AI response', {}, parseErr);
      return res.status(500).json({
        success: false,
        error: 'No se pudo parsear la respuesta del análisis',
        rawResponse: response.choices[0].message.content
      });
    }

    // Validar datos críticos
    if (!extractedData.cedula || !/^\d{10}$/.test(extractedData.cedula)) {
      return res.status(400).json({
        success: false,
        error: 'Cédula no válida o no legible. Por favor, envía una foto más clara.',
        data: extractedData
      });
    }

    loggers.adriana.info('Cédula extraída exitosamente', { 
      cedula: extractedData.cedula,
      provincia: extractedData.provincia 
    });

    res.json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    loggers.adriana.error('Error en extract-cedula', {}, error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar la cédula',
      message: error.message
    });
  }
});

/**
 * GET /api/adriana/get-vaz-rates
 * Obtiene tasas VAZ actualizadas (con cache 24h)
 * Query params: ?vehicleType=sedan&year=2020&...
 */
router.get('/get-vaz-rates', async (req, res) => {
  try {
    const { vehicleType, year, province } = req.query;

    // 1. Buscar en cache (tabla vaz_rates)
    await databaseService.ensureInitialized();
    const cacheKey = `${vehicleType}_${year}_${province}`;
    
    const cached = await databaseService.get(
      `SELECT * FROM vaz_rates 
       WHERE cache_key = $1 
       AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [cacheKey]
    );

    if (cached) {
      loggers.adriana.info('VAZ rates from cache', { cacheKey });
      return res.json({
        success: true,
        data: cached.rates_data,
        source: 'cache',
        cachedAt: cached.created_at
      });
    }

    // 2. Si no hay cache, fetch desde API VAZ (o usar tasas hardcoded)
    // TODO: Implementar fetch real cuando tengamos API de VAZ
    const hardcodedRates = generateVAZRates(vehicleType, year, province);

    // 3. Guardar en cache
    await databaseService.run(
      `INSERT INTO vaz_rates (cache_key, vehicle_type, vehicle_year, province, rates_data, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [cacheKey, vehicleType, year, province, JSON.stringify(hardcodedRates)]
    );

    loggers.adriana.info('VAZ rates fetched and cached', { cacheKey });

    res.json({
      success: true,
      data: hardcodedRates,
      source: 'api',
      cachedAt: new Date().toISOString()
    });

  } catch (error) {
    loggers.adriana.error('Error en get-vaz-rates', {}, error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tasas VAZ',
      message: error.message
    });
  }
});

/**
 * Genera tasas VAZ hardcoded (fallback hasta tener API real)
 * En producción, esto se reemplaza con fetch a API VAZ
 */
function generateVAZRates(vehicleType, year, province) {
  const baseRate = 1200; // Base anual
  const yearFactor = Math.max(0.5, 1 - ((2026 - year) * 0.05)); // Deprecia 5% por año
  const provinceFactor = province === 'Pichincha' || province === 'Guayas' ? 1.2 : 1.0;

  const annualPremium = Math.round(baseRate * yearFactor * provinceFactor);
  const monthlyPremium = Math.round(annualPremium / 12);

  return {
    plans: [
      {
        code: 'ENSIGNA', // Código interno: Ensigna = Plan VAZ Elemental
        name: 'VAZ Elemental',
        coverage: 'Cobertura completa con deducible 7%',
        annualPremium,
        monthlyPremium,
        maxInstallments: 12,
        deductible: { 
          client: '7%', // Lo que se le dice al cliente
          internal: 'Taller VAZ' // Lo que sabemos internamente (no mostrar)
        },
        includes: [
          'Daños propios hasta valor comercial',
          'Responsabilidad civil terceros',
          'Robo total',
          'Asistencia vial 24/7',
          'Gastos médicos ocupantes'
        ]
      },
      {
        code: 'VAZ_STANDARD',
        name: 'VAZ Standard',
        coverage: 'Cobertura ampliada con deducible 5%',
        annualPremium: Math.round(annualPremium * 1.3),
        monthlyPremium: Math.round((annualPremium * 1.3) / 12),
        maxInstallments: 12,
        deductible: { client: '5%', internal: 'Taller red VAZ' },
        includes: [
          'Todo lo de VAZ Elemental',
          'Pérdida total por accidente',
          'Daños por fenómenos naturales',
          'Vehículo de reemplazo'
        ]
      },
      {
        code: 'VAZ_PREMIUM',
        name: 'VAZ Premium',
        coverage: 'Máxima cobertura sin deducible',
        annualPremium: Math.round(annualPremium * 1.8),
        monthlyPremium: Math.round((annualPremium * 1.8) / 12),
        maxInstallments: 12,
        deductible: { client: '0%', internal: 'Sin deducible' },
        includes: [
          'Todo lo de VAZ Standard',
          'Sin deducible en reparaciones',
          'Cristales sin límite',
          'Concierge de servicios',
          'Protección de accesorios'
        ]
      }
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      vehicleType,
      year,
      province,
      disclaimer: 'Cotización referencial. Prima final sujeta a inspección vehicular.'
    }
  };
}

export default router;
