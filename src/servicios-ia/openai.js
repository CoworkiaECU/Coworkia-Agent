import 'dotenv/config';
import OpenAI from 'openai';
import { openaiBreaker } from '../utils/circuit-breaker.js';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('[OpenAI] Falta OPENAI_API_KEY en .env');
  process.exit(1);
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const client = new OpenAI({ apiKey });

export async function complete(prompt, opts = {}) {
  const {
    system = null,
    temperature = 0.4,
    max_tokens = 280,
    model = MODEL,
  } = opts;

  const messages = system
    ? [{ role: 'system', content: system }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  // 🛡️ Proteger con circuit breaker
  const fallback = () => {
    console.log('[OpenAI] ⚠️ Usando respuesta de fallback');
    return 'Lo siento, estoy experimentando dificultades técnicas en este momento. Por favor, intenta de nuevo en unos momentos o contacta directamente a nuestro equipo.';
  };

  return await openaiBreaker.execute(async () => {
    const res = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    });

    return res.choices?.[0]?.message?.content?.trim() || '';
  }, fallback);
}

/**
 * 👁️ Analiza imagen usando OpenAI Vision API
 */
export async function analyzeImage(imageUrl, prompt, opts = {}) {
  const {
    temperature = 0.2,
    max_tokens = 500,
    model = 'gpt-4o', // Modelo con capacidades de visión
    detail = 'high'
  } = opts;

  // 🛡️ Proteger con circuit breaker
  const fallback = () => {
    console.log('[OpenAI Vision] ⚠️ Usando respuesta de fallback');
    return {
      success: false,
      error: 'Servicio temporalmente no disponible. Por favor, intenta de nuevo.',
      content: null
    };
  };

  try {
    return await openaiBreaker.execute(async () => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: detail
                }
              }
            ]
          }
        ],
        temperature,
        max_tokens,
      });

      return {
        success: true,
        content: response.choices[0]?.message?.content?.trim() || '',
        usage: response.usage
      };
    }, fallback);

  } catch (error) {
    console.error('[OpenAI Vision] Error:', error);
    return {
      success: false,
      error: error.message,
      content: null
    };
  }
}

/**
 * 💳 Analiza comprobante de pago específicamente
 */
export async function analyzePaymentReceipt(imageUrl) {
  const prompt = `Analiza este comprobante de pago y extrae la siguiente información en formato JSON:

{
  "transactionNumber": "número de transacción/referencia",
  "amount": "monto en números (ej: 8.40)",
  "currency": "moneda (USD, EUR, etc)",
  "date": "fecha en formato YYYY-MM-DD",
  "time": "hora en formato HH:MM",
  "bank": "nombre del banco o método de pago",
  "paymentMethod": "transferencia/payphone/tarjeta/etc",
  "recipient": "nombre del destinatario/empresa",
  "isValid": true/false,
  "confidence": "porcentaje de confianza (0-100)"
}

IMPORTANTE:
- Si no encuentras algún dato, usa null
- Solo extrae información que esté claramente visible
- isValid debe ser true solo si es un comprobante legítimo
- confidence indica qué tan seguro estás de los datos extraídos

Responde SOLO con el JSON, sin texto adicional.`;

  const result = await analyzeImage(imageUrl, prompt, {
    temperature: 0.1, // Muy baja para consistencia
    max_tokens: 300
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      data: null
    };
  }

  try {
    // Extraer JSON de la respuesta
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON válido en la respuesta');
    }

    const paymentData = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      data: paymentData,
      rawResponse: result.content,
      usage: result.usage
    };

  } catch (parseError) {
    console.error('[OpenAI Vision] Error parsing JSON:', parseError);
    return {
      success: false,
      error: `Error parsing response: ${parseError.message}`,
      data: null,
      rawResponse: result.content
    };
  }
}
