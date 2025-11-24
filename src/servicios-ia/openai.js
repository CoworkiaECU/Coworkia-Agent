import 'dotenv/config';
import OpenAI from 'openai';
import { openaiBreaker } from '../utils/circuit-breaker.js';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('[OpenAI] Falta OPENAI_API_KEY en .env');
  process.exit(1);
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export const client = new OpenAI({ apiKey });

export async function complete(prompt, opts = {}) {
  const {
    system = null,
    temperature = 0.6,
    max_tokens = 400,
    model = MODEL,
  } = opts;

  const messages = system
    ? [{ role: 'system', content: system }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];
  
  // 🔍 DEBUG TEMPORAL v234
  if (system && system.includes('Aurora')) {
    console.log('[DEBUG v234] ===== SYSTEM PROMPT =====');
    console.log(system.substring(0, 300));
    console.log('[DEBUG v234] ===== USER CONTEXT =====');
    console.log(prompt.substring(0, 500));
    console.log('[DEBUG v234] ========================');
  }

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
// 🆕 v283: Updated Payphone format recognition based on actual ppls.me receipts
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

1. PAYPHONE (Ecuador) - FORMATO OFICIAL ppls.me:
   CARACTERÍSTICAS VISUALES EXACTAS:
   - Logo "payphone" en la parte superior
   - Estado de la transacción: "Aprobada" en color VERDE (es texto verde, no un banner)
   - Monto: "USD 12.08" (o cualquier valor) en grande, centrado
   - Descripción principal: "PAGO APROBADO" en texto grande
   - Descripción secundaria: "Coworkia hoy desk" o "Coworkia sala" (el concepto de pago)
   
   SECCIÓN "Detalle de transacción":
   - Fecha: formato "DD/MM/YYYY HH:MM" (ej: "18/11/2025 14:12")
   - No. Transacción: número de 8 dígitos (ej: "70613140")
   - No. Autorización: empieza con "W" + número (ej: "W70613140")
   - Persona: nombre del pagador en mayúsculas (ej: "DIEGO VILLOTA")
   
   PIE DE PÁGINA:
   - Logos de seguridad: Verified by VISA, MasterCard SecureCode, PCI DSS
   - Texto: "Powered by payphone" al final
   
   REGLAS DE VALIDACIÓN:
   - Si ves "Aprobada" (en verde) + monto "USD X.XX" + "PAGO APROBADO" → ES 100% VÁLIDO
   - transactionNumber = el valor de "No. Transacción" (8 dígitos)
   - receiptNumber = el valor de "No. Autorización" (W + 8 dígitos)
   - paymentMethod = "payphone"
   - bank = "Payphone"
   - isValid = true
   - confidence = 95
   - Fecha debe convertirse de DD/MM/YYYY a YYYY-MM-DD

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
