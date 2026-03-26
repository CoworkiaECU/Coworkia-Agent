/**
 * 🛡️ Adriana API Endpoints - Cotizaciones Automáticas VAZ
 * 
 * Sistema completo:
 * - Vision AI para extracción multi-documento (cédula, matrícula, licencia)
 * - Tasas VAZ real-time con cache
 * - Generador de cotizaciones comparativas
 * - Form conversacional 6 pasos
 */

import express from 'express';
import { analyzeImage } from '../../servicios-ia/openai.js';
import { analyzeDocument } from '../../servicios/adriana-document-analyzer.js';
import { generateAndSendComparisonQuote } from '../../servicios/adriana-quote-generator.js';
import databaseService from '../../database/database.js';
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
 * POST /api/adriana/extract-document
 * 🆕 Vision AI genérico para análisis multi-documento
 * Detecta automáticamente el tipo (cédula, matrícula, licencia)
 * Body: { image: base64String, expectedType?: 'cedula'|'matricula'|'licencia', userPhone?: string, quoteCode?: string }
 */
router.post('/extract-document', async (req, res) => {
  try {
    const { image, expectedType, userPhone, quoteCode } = req.body;

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

    loggers.adriana.info('Analizando documento...', {
      expectedType,
      userPhone,
      hasImage: !!imageUrl
    });

    // Análisis automático con Vision AI
    const analysisResult = await analyzeDocument(imageUrl, expectedType);

    // Si no fue exitoso, devolver error
    if (!analysisResult.success) {
      return res.status(400).json(analysisResult);
    }

    // Guardar en BD si se proporcionó userPhone
    if (userPhone) {
      try {
        await databaseService.saveAdrianaDocument(
          userPhone,
          analysisResult.documentType,
          analysisResult.data,
          analysisResult.confidence,
          null, // No guardamos la imagen para ahorrar espacio
          quoteCode || null
        );
        loggers.adriana.info('Documento guardado en BD', {
          user: userPhone,
          type: analysisResult.documentType
        });
      } catch (dbError) {
        // Log pero no bloquear si falla el guardado
        loggers.adriana.error('Error guardando documento en BD (no bloqueante)', {}, dbError);
      }
    }

    // Response exitoso
    res.json({
      success: true,
      documentType: analysisResult.documentType,
      data: analysisResult.data,
      confidence: parseFloat(analysisResult.confidence),
      validations: analysisResult.validations
    });

  } catch (error) {
    loggers.adriana.error('Error en extract-document', {}, error);
    res.status(500).json({
      success: false,
      error: 'Error al analizar el documento',
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
 * POST /api/adriana/send-quote
 * Genera y envía cotización comparativa completa
 * Body: { vehicleData, customerData, options }
 */
router.post('/send-quote', async (req, res) => {
  try {
    const { vehicleData, customerData, options = {} } = req.body;

    // Validaciones
    if (!vehicleData || !customerData) {
      return res.status(400).json({
        success: false,
        error: 'Faltan vehicleData o customerData'
      });
    }

    if (!customerData.email || !customerData.nombres) {
      return res.status(400).json({
        success: false,
        error: 'Email y nombres del cliente son obligatorios'
      });
    }

    if (!vehicleData.brand || !vehicleData.model || !vehicleData.year) {
      return res.status(400).json({
        success: false,
        error: 'Marca, modelo y año del vehículo son obligatorios'
      });
    }

    // 1. Obtener tasas VAZ
    const cacheKey = `${vehicleData.type || 'sedan'}_${vehicleData.year}_${customerData.provincia || 'Pichincha'}`;
    
    let vazRates;
    const cached = await databaseService.get(
      `SELECT * FROM vaz_rates 
       WHERE cache_key = $1 
       AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [cacheKey]
    );

    if (cached) {
      vazRates = cached.rates_data;
    } else {
      // Generar tasas si no hay cache
      vazRates = generateVAZRates(
        vehicleData.type || 'sedan',
        vehicleData.year,
        customerData.provincia || 'Pichincha'
      );
      
      // Guardar en cache
      await databaseService.run(
        `INSERT INTO vaz_rates (cache_key, vehicle_type, vehicle_year, province, rates_data, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          cacheKey,
          vehicleData.type || 'sedan',
          vehicleData.year,
          customerData.provincia || 'Pichincha',
          JSON.stringify(vazRates)
        ]
      );
    }

    // 2. Generar código de cotización
    const quoteCode = options.quoteCode || `VAZ-AUTO-${Date.now().toString(36).toUpperCase()}`;

    // 3. Generar y enviar cotización
    const result = await generateAndSendComparisonQuote(
      vehicleData,
      customerData,
      vazRates,
      { ...options, quoteCode }
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    // 4. Guardar en insurance_leads (tracking)
    try {
      // Crear usuario si no existe (para cumplir FOREIGN KEY constraint)
      const userPhone = customerData.telefono || '';
      if (userPhone) {
        await databaseService.run(
          `INSERT INTO users (phone_number, name, email, active_agent, last_message_at)
           VALUES ($1, $2, $3, 'ADRIANA', CURRENT_TIMESTAMP)
           ON CONFLICT (phone_number) DO UPDATE SET
             name = COALESCE(EXCLUDED.name, users.name),
             email = COALESCE(EXCLUDED.email, users.email),
             last_message_at = CURRENT_TIMESTAMP`,
          [userPhone, customerData.nombres, customerData.email]
        );
      }

      const leadId = `IL-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await databaseService.run(
        `INSERT INTO insurance_leads (
          id, quote_code, user_phone, agent_name, insurance_type,
          client_name, email, phone, cedula,
          vehicle_brand, vehicle_model, vehicle_year, commercial_value,
          city, quoted_premium, status, quote_sent_at, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`,
        [
          leadId,
          quoteCode,
          userPhone,
          'ADRIANA',
          'Vehículo Liviano',
          customerData.nombres,
          customerData.email,
          userPhone,
          customerData.cedula || '',
          vehicleData.brand,
          vehicleData.model,
          vehicleData.year,
          vehicleData.commercialValue || 40000,
          customerData.provincia || '',
          result.annualPremium,
          'quoted',
        ]
      );
      loggers.adriana.info('Lead guardado exitosamente', { leadId, quoteCode });
    } catch (dbError) {
      loggers.adriana.warn('Error guardando lead (no crítico)', {}, dbError);
    }

    loggers.adriana.info('Cotización automática enviada', {
      quoteCode,
      email: customerData.email,
      vehicle: `${vehicleData.brand} ${vehicleData.model}`
    });

    res.json({
      success: true,
      quoteCode,
      emailSent: result.emailSent,
      annualPremium: result.annualPremium,
      monthlyPremium: result.monthlyPremium
    });

  } catch (error) {
    loggers.adriana.error('Error en send-quote', {}, error);
    res.status(500).json({
      success: false,
      error: 'Error al generar cotización',
      message: error.message
    });
  }
});

/**
 * GET /api/adriana/leads
 * Lista todas las cotizaciones de seguros (para dashboard)
 * Query params: ?limit=500&status=quoted
 */
router.get('/leads', async (req, res) => {
  try {
    await databaseService.ensureInitialized();
    const { limit = 500, status } = req.query;

    let query = 'SELECT * FROM insurance_leads';
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const leads = await databaseService.all(query, params);

    loggers.adriana.info('Leads fetched for dashboard', { count: leads.length, status });

    res.json({
      success: true,
      data: leads,
      count: leads.length
    });

  } catch (error) {
    loggers.adriana.error('Error fetching leads', {}, error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cotizaciones',
      message: error.message
    });
  }
});

/**
 * GET /api/adriana/leads-stats
 * Estadísticas para dashboard (totales, aceptados, prima acumulada)
 */
router.get('/leads-stats', async (req, res) => {
  try {
    await databaseService.ensureInitialized();

    // Total leads histórico
    const totalResult = await databaseService.get(
      'SELECT COUNT(*) as count FROM insurance_leads'
    );

    // Leads este mes
    const thisMonthResult = await databaseService.get(
      `SELECT COUNT(*) as count FROM insurance_leads 
       WHERE TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')`
    );

    // Aceptados (conversion rate)
    const acceptedResult = await databaseService.get(
      'SELECT COUNT(*) as count FROM insurance_leads WHERE status = \'accepted\''
    );

    // Prima total acumulada (solo aceptados)
    const premiumResult = await databaseService.get(
      'SELECT SUM(quoted_premium) as total FROM insurance_leads WHERE status = \'accepted\''
    );

    const total = parseInt(totalResult?.count || 0);
    const thisMonth = parseInt(thisMonthResult?.count || 0);
    const accepted = parseInt(acceptedResult?.count || 0);
    const totalPremium = parseFloat(premiumResult?.total || 0);
    const conversionRate = total > 0 ? ((accepted / total) * 100).toFixed(1) : 0;

    loggers.adriana.info('Stats fetched', { total, accepted, conversionRate });

    res.json({
      success: true,
      data: {
        total,
        thisMonth,
        accepted,
        conversionRate: `${conversionRate}%`,
        totalPremium: Math.round(totalPremium)
      }
    });

  } catch (error) {
    loggers.adriana.error('Error fetching stats', {}, error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
});

/**
 * Genera tasas VAZ hardcoded (fallback hasta tener API real)
 * En producción, esto se reemplaza con fetch a API VAZ
 */
function generateVAZRates(vehicleType, year, province) {
  const baseRate = 1200;
  const yearFactor = Math.max(0.5, 1 - ((2026 - year) * 0.05));
  const provinceFactor = province === 'Pichincha' || province === 'Guayas' ? 1.2 : 1.0;

  const annualPremium = Math.round(baseRate * yearFactor * provinceFactor);
  const monthlyPremium = Math.round(annualPremium / 12);

  return {
    plans: [
      {
        code: 'ENSIGNA',
        name: 'VAZ Elemental',
        coverage: 'Cobertura completa con deducible 7%',
        annualPremium,
        monthlyPremium,
        maxInstallments: 12,
        deductible: { 
          client: '7%',
          internal: 'Taller VAZ'
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
