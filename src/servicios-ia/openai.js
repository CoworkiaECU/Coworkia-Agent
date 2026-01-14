import 'dotenv/config';
import OpenAI from 'openai';
import { openaiBreaker } from '../utils/circuit-breaker.js';
import { loggers } from '../utils/logger.js';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  const errorMsg = '[OpenAI] CRÍTICO: Falta OPENAI_API_KEY en .env';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export const client = new OpenAI({ apiKey });

export async function complete(prompt, opts = {}) {
  const {
    system = null,
    temperature = 0.6,
    max_tokens = 400,
    model = MODEL,
    timeout = 55000, // 🔥 FIX: Timeout de 55s (antes de H12 de Heroku a 30s, dejamos margen)
  } = opts;

  const messages = system
    ? [{ role: 'system', content: system }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];
  
  // Debug logs solo en modo desarrollo
  if (process.env.DEBUG_MODE === 'true' && system && system.includes('Aurora')) {
    console.log('[DEBUG] ===== SYSTEM PROMPT =====');
    console.log(system.substring(0, 300));
    console.log('[DEBUG] ===== USER CONTEXT =====');
    console.log(prompt.substring(0, 500));
    console.log('[DEBUG] ========================');
  }

  const startTime = Date.now();

  // 🛡️ Proteger con circuit breaker + timeout
  const fallback = () => {
    loggers.openai.warn('Using fallback response', { action: 'complete', model });
    return 'Lo siento, estoy experimentando dificultades técnicas en este momento. Por favor, intenta de nuevo en unos momentos o contacta directamente a nuestro equipo.';
  };

  return await openaiBreaker.execute(async () => {
    // 🕐 Implementar timeout manual
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OpenAI timeout')), timeout)
    );
    
    const apiPromise = client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    });

    // Race entre API call y timeout
    const res = await Promise.race([apiPromise, timeoutPromise]);
    const duration = Date.now() - startTime;
    
    loggers.openai.timing('OpenAI completion', duration, { model, tokens: max_tokens });

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
    loggers.openai.warn('Vision API fallback used', { action: 'analyzeImage' });
    return {
      success: false,
      error: 'Servicio temporalmente no disponible. Por favor, intenta de nuevo.',
      content: null
    };
  };

  try {
    const startTime = Date.now();
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

      const duration = Date.now() - startTime;
      loggers.openai.timing('Vision API analysis', duration, { model, detail });

      return {
        success: true,
        content: response.choices[0]?.message?.content?.trim() || '',
        usage: response.usage
      };
    }, fallback);

  } catch (error) {
    loggers.openai.error('Vision API error', { action: 'analyzeImage' }, error);
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
    
    // Node.js no tiene File, pero OpenAI SDK acepta Blob directamente
    console.log('[Whisper] Tamaño del audio:', audioBuffer.byteLength, 'bytes');

    // Transcribir con Whisper
    const transcription = await client.audio.transcriptions.create({
      file: audioBlob,
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

/**
 * 🚗 Analiza imagen de vehículo dañado para cotización de enderezada/pintura
 * Identifica daños visibles, evalúa calidad de imagen y genera estructura para cotización
 */
export async function analyzeVehicleDamage(imageUrl, opts = {}) {
  const {
    temperature = 0.2,
    max_tokens = 800,
    model = 'gpt-4o'
  } = opts;

  const prompt = `Eres un experto técnico en análisis de daños automotrices con 15 años de experiencia en enderezada y pintura.

Analiza esta imagen de vehículo y proporciona un análisis técnico estructurado en formato JSON:

{
  "imageQuality": {
    "isAcceptable": true/false,
    "score": 0-10,
    "issues": ["lista de problemas: borrosa, oscura, ángulo malo, muy lejana, etc"],
    "recommendation": "qué mejorar si la calidad es mala"
  },
  "vehicleInfo": {
    "type": "tipo de vehículo (sedán, SUV, camioneta, etc)",
    "color": "color aproximado",
    "visibleParts": ["partes visibles en la foto"]
  },
  "damageAnalysis": {
    "visibleDamages": [
      {
        "part": "nombre de pieza (puerta, capó, parachoques, etc)",
        "damageType": "tipo (abolladura, rayón, rotura, deformación)",
        "severity": "leve/moderada/severa",
        "approximateArea": "área afectada en cm o descripción",
        "description": "descripción técnica detallada del daño",
        "paintAffected": true/false
      }
    ],
    "hiddenDamageRisks": [
      {
        "area": "zona donde puede haber daño oculto",
        "risk": "tipo de daño potencial",
        "reason": "por qué existe este riesgo"
      }
    ]
  },
  "estimationFactors": {
    "complexity": "simple/moderada/compleja",
    "requiresDisassembly": true/false,
    "structuralConcerns": true/false,
    "electricalRisk": true/false,
    "specialPaintType": "estándar/metalizado/perlado/mate"
  },
  "recommendations": {
    "needsPhysicalInspection": true/false,
    "additionalPhotosNeeded": ["qué fotos adicionales se necesitan"],
    "urgencyLevel": "bajo/medio/alto"
  },
  "technicalNotes": "observaciones técnicas adicionales importantes"
}

REGLAS CRÍTICAS:
1. Si la imagen es borrosa, oscura o de mala calidad: marca imageQuality.isAcceptable = false
2. Solo identifica daños CLARAMENTE VISIBLES en la foto
3. Para daños cerca de estructura/motor/chasis: marcar structuralConcerns = true
4. Si no puedes ver bien el alcance del daño: incluir en hiddenDamageRisks
5. Sé conservador en el análisis - mejor subestimar que sobreestimar
6. Si la foto no muestra un vehículo dañado: indicarlo claramente

Analiza la imagen ahora:`;

  try {
    const result = await analyzeImage(imageUrl, prompt, { temperature, max_tokens, model, detail: 'high' });
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        analysis: null
      };
    }

    // Intentar parsear el JSON de la respuesta
    let analysis = null;
    try {
      // Extraer JSON de la respuesta (puede venir con texto adicional)
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Si no hay JSON, devolver el contenido como texto
        analysis = { rawResponse: result.content };
      }
    } catch (parseError) {
      console.warn('[Vehicle Analysis] No se pudo parsear JSON, usando respuesta raw');
      analysis = { rawResponse: result.content };
    }

    return {
      success: true,
      analysis,
      rawContent: result.content,
      usage: result.usage
    };

  } catch (error) {
    console.error('[Vehicle Analysis] Error:', error);
    return {
      success: false,
      error: error.message,
      analysis: null
    };
  }
}

