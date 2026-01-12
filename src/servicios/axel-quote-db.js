/**
 * 🗄️ AXEL QUOTE DATABASE SERVICE
 * Sistema de cotizaciones PaintBull con PostgreSQL
 * Independiente de user_id - búsqueda por código de cotización
 */

import { query, getClient } from '../database/database.js';

/**
 * 💾 Guardar cotización completa en base de datos
 * @param {Object} quoteData - Datos completos de la cotización
 * @returns {Promise<Object>} - {success, quoteCode, error}
 */
export async function saveQuote(quoteData) {
  try {
    const {
      quoteCode,
      userPhone,
      vehicleData,
      damageAnalysis,
      quoteDetails,
      priceRange,
      customerName,
      customerEmail,
      photoUrls = []
    } = quoteData;

    console.log('[AXEL-DB] 💾 Guardando cotización:', quoteCode);

    const sql = `
      INSERT INTO axel_quotes (
        quote_code,
        original_user_phone,
        vehicle_brand,
        vehicle_model,
        vehicle_year,
        damage_analysis,
        quote_details,
        price_min,
        price_max,
        currency,
        customer_name,
        customer_email,
        photo_urls,
        email_sent,
        email_sent_at,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15)
      ON CONFLICT (quote_code) 
      DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        customer_email = EXCLUDED.customer_email,
        email_sent = EXCLUDED.email_sent,
        email_sent_at = EXCLUDED.email_sent_at,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      quoteCode,
      userPhone,
      vehicleData?.marca || null,
      vehicleData?.modelo || null,
      vehicleData?.año || null,
      JSON.stringify(damageAnalysis),
      quoteDetails,
      priceRange?.min || null,
      priceRange?.max || null,
      priceRange?.currency || 'USD',
      customerName,
      customerEmail,
      JSON.stringify(photoUrls),
      true, // email_sent
      'sent' // status inicial
    ];

    const result = await query(sql, values);
    
    console.log('[AXEL-DB] ✅ Cotización guardada exitosamente');
    return {
      success: true,
      quoteCode: result.rows[0].quote_code,
      data: result.rows[0]
    };

  } catch (error) {
    console.error('[AXEL-DB] ❌ Error guardando cotización:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🔍 Buscar cotización por código (independiente de userId)
 * @param {string} quoteCode - Código AXEL-YYYY-NNNN
 * @returns {Promise<Object>} - {success, quote, error}
 */
export async function findQuoteByCode(quoteCode) {
  try {
    console.log('[AXEL-DB] 🔍 Buscando cotización:', quoteCode);

    const sql = `
      SELECT *
      FROM axel_quotes
      WHERE quote_code = $1
    `;

    const result = await query(sql, [quoteCode]);

    if (result.rows.length === 0) {
      console.log('[AXEL-DB] ⚠️ Cotización no encontrada:', quoteCode);
      return {
        success: false,
        found: false,
        message: 'Cotización no encontrada'
      };
    }

    const quote = result.rows[0];
    console.log('[AXEL-DB] ✅ Cotización encontrada:', {
      code: quote.quote_code,
      phone: quote.original_user_phone,
      status: quote.status
    });

    return {
      success: true,
      found: true,
      quote: {
        ...quote,
        damage_analysis: typeof quote.damage_analysis === 'string' 
          ? JSON.parse(quote.damage_analysis) 
          : quote.damage_analysis,
        photo_urls: typeof quote.photo_urls === 'string'
          ? JSON.parse(quote.photo_urls)
          : quote.photo_urls
      }
    };

  } catch (error) {
    console.error('[AXEL-DB] ❌ Error buscando cotización:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🔄 Actualizar estado de cotización
 * @param {string} quoteCode - Código AXEL-YYYY-NNNN
 * @param {string} status - 'sent', 'confirmed', 'scheduled', 'completed', 'cancelled'
 * @returns {Promise<Object>} - {success, error}
 */
export async function updateQuoteStatus(quoteCode, status) {
  try {
    console.log('[AXEL-DB] 🔄 Actualizando estado:', quoteCode, '→', status);

    const validStatuses = ['sent', 'confirmed', 'scheduled', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Estado inválido: ${status}. Válidos: ${validStatuses.join(', ')}`);
    }

    const sql = `
      UPDATE axel_quotes
      SET status = $1, updated_at = NOW()
      WHERE quote_code = $2
      RETURNING *
    `;

    const result = await query(sql, [status, quoteCode]);

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Cotización no encontrada'
      };
    }

    console.log('[AXEL-DB] ✅ Estado actualizado exitosamente');
    return {
      success: true,
      quote: result.rows[0]
    };

  } catch (error) {
    console.error('[AXEL-DB] ❌ Error actualizando estado:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📅 Agendar cita para cotización
 * @param {string} quoteCode - Código AXEL-YYYY-NNNN
 * @param {string} date - Fecha ISO (YYYY-MM-DD)
 * @param {string} time - Hora (HH:MM)
 * @param {string} notes - Notas adicionales
 * @returns {Promise<Object>} - {success, error}
 */
export async function scheduleAppointment(quoteCode, date, time, notes = '') {
  try {
    console.log('[AXEL-DB] 📅 Agendando cita:', quoteCode, date, time);

    const sql = `
      UPDATE axel_quotes
      SET 
        appointment_date = $1,
        appointment_time = $2,
        appointment_notes = $3,
        appointment_confirmed = true,
        status = 'scheduled',
        updated_at = NOW()
      WHERE quote_code = $4
      RETURNING *
    `;

    const result = await query(sql, [date, time, notes, quoteCode]);

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Cotización no encontrada'
      };
    }

    console.log('[AXEL-DB] ✅ Cita agendada exitosamente');
    return {
      success: true,
      appointment: {
        date: result.rows[0].appointment_date,
        time: result.rows[0].appointment_time,
        confirmed: result.rows[0].appointment_confirmed
      }
    };

  } catch (error) {
    console.error('[AXEL-DB] ❌ Error agendando cita:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📋 Listar cotizaciones de un cliente (por teléfono)
 * @param {string} phone - Número de teléfono
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Object>} - {success, quotes, error}
 */
export async function getQuotesByPhone(phone, limit = 10) {
  try {
    console.log('[AXEL-DB] 📋 Listando cotizaciones de:', phone);

    const sql = `
      SELECT *
      FROM axel_quotes
      WHERE original_user_phone = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await query(sql, [phone, limit]);

    console.log('[AXEL-DB] ✅ Encontradas', result.rows.length, 'cotizaciones');

    return {
      success: true,
      count: result.rows.length,
      quotes: result.rows.map(quote => ({
        ...quote,
        damage_analysis: typeof quote.damage_analysis === 'string'
          ? JSON.parse(quote.damage_analysis)
          : quote.damage_analysis,
        photo_urls: typeof quote.photo_urls === 'string'
          ? JSON.parse(quote.photo_urls)
          : quote.photo_urls
      }))
    };

  } catch (error) {
    console.error('[AXEL-DB] ❌ Error listando cotizaciones:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📊 Obtener estadísticas de cotizaciones
 * @returns {Promise<Object>} - {success, stats, error}
 */
export async function getQuoteStats() {
  try {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days
      FROM axel_quotes
    `;

    const result = await query(sql);
    
    return {
      success: true,
      stats: result.rows[0]
    };

  } catch (error) {
    console.error('[AXEL-DB] ❌ Error obteniendo estadísticas:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
