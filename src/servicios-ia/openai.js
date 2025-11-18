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
  "transactionNumber": "número de transacción/referencia/comprobante",
  "amount": "monto en números (ej: 8.40)",
  "currency": "moneda (USD, EUR, etc)",
  "date": "fecha en formato YYYY-MM-DD",
  "time": "hora en formato HH:MM",
  "bank": "nombre del banco o método de pago",
  "paymentMethod": "transferencia/payphone/tarjeta/etc",
  "recipient": "nombre del destinatario/empresa",
  "receiptNumber": "número de comprobante si existe (ej: Comprobante Nro. 590709020900)",
  "isValid": true/false,
  "confidence": "porcentaje de confianza (0-100)"
}

FORMATOS DE COMPROBANTES RECONOCIDOS:

1. PAYPHONE (Ecuador):
   - Tiene logo naranja de Payphone arriba
   - Dice "PAGO APROBADO" o "Aprobada" en verde
   - Monto grande en el centro (ej: "USD 12.08")
   - Sección "Detalle de transacción" abajo con:
     * Fecha (formato: DD/MM/YYYY HH:MM)
     * No. Transacción (ej: 7061340)
     * No. Autorización (ej: W7061340)
     * Persona (nombre del pagador)
   - Descripción puede decir "Coworkia hoy desk", "Coworkia sala", etc.
   - Logos de pago: Verified by VISA, MasterCard SecureCode, PCI DSS
   - Dice "Powered by payphone" abajo
   - ES UN COMPROBANTE 100% VÁLIDO Y OFICIAL

2. TRANSFERENCIAS BANCARIAS (Ecuador):
   - Logo del banco o cooperativa
   - "Comprobante de transferencia" o "Transacción exitosa"
   - Monto, fecha, cuenta origen/destino
   - Número de referencia bancaria
   - Bancos aceptados: Pichincha, Guayaquil, Pacífico, Produbanco, Bolivariano, Internacional, 
     Austro, Procredit, Solidario, BanEcuador, y todas las cooperativas reguladas
   - ES VÁLIDO si es de un banco/cooperativa ecuatoriano

3. TARJETAS DE CRÉDITO/DÉBITO:
   - Visa, Mastercard, Diners Club, American Express, Alia
   - Terminal de pago (POS) físico o digital
   - Últimos 4 dígitos de tarjeta
   - Código de autorización
   - Monto y fecha
   
4. PAYPAL:
   - Logo de PayPal
   - "Payment Successful" o "Pago exitoso"
   - Email del destinatario
   - Transaction ID
   - Monto en USD

REGLAS CRÍTICAS:
- Si ves logo de PAYPHONE + "PAGO APROBADO" → ES VÁLIDO (isValid: true, confidence: 95)
- El "transactionNumber" puede estar como "No. Transacción" o "No. Autorización"
- El "receiptNumber" es el número visible del comprobante digital
- Para Payphone: paymentMethod = "payphone", bank = "Payphone"
- Si no encuentras algún dato, usa null
- Solo extrae información que esté claramente visible
- Fecha de Payphone viene en formato DD/MM/YYYY HH:MM, conviértela a YYYY-MM-DD

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

/**
 * 🎤 Transcribe audio usando Whisper
 * @param {string} audioUrl - URL del archivo de audio
 * @returns {Promise<{success: boolean, text: string, error?: string}>}
 */
export async function transcribeAudio(audioUrl) {
  try {
    console.log('[Whisper] 🎤 Transcribiendo audio...');
    console.log('[Whisper] URL:', audioUrl);

    // Descargar el audio desde la URL
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Error descargando audio: ${response.status}`);
    }

    // Obtener el buffer del audio
    const audioBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
    
    // Crear un File object (Whisper requiere File, no Blob)
    const audioFile = new File([audioBlob], 'audio.ogg', { type: 'audio/ogg' });

    console.log('[Whisper] Tamaño del audio:', audioBuffer.byteLength, 'bytes');

    // Transcribir con Whisper
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es', // Español
      response_format: 'text'
    });

    console.log('[Whisper] ✅ Transcripción exitosa:', transcription.substring(0, 100) + '...');

    return {
      success: true,
      text: transcription
    };

  } catch (error) {
    console.error('[Whisper] ❌ Error transcribiendo:', error);
    return {
      success: false,
      text: '',
      error: error.message
    };
  }
}
