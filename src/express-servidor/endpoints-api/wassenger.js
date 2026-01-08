// src/express-servidor/endpoints-api/wassenger.js
import { Router } from 'express';
import { procesarMensaje } from '../../deteccion-intenciones/orquestador.js';
import { complete } from '../../servicios-ia/openai.js';
import { processPaymentReceipt, isReceiptImage, generatePaymentRequest } from '../../servicios/payment-receipts.js';
import { processConfirmationResponse, hasPendingConfirmation, isPositiveResponse, isNegativeResponse } from '../../servicios/confirmation-flow.js';
import { enhanceAuroraResponse } from '../../servicios/aurora-confirmation-helper.js';
import { detectCampaignMessage, personalizeCampaignResponse, getTrialUsedResponse, shouldSendPaymentLink } from '../../servicios/campaign-prompts.js';
import { validateWebhookSignature, rateLimitByPhone } from '../middleware/webhook-security.js';
import { processMessageWithForm, clearForm as clearPartialForm } from '../../servicios/partial-reservation-form.js';
import { buildReplyContext, getReplyContextMetadata } from '../../servicios/reply-context-handler.js';
import { getUserLanguage, detectLanguageCommand, getLanguageChangeConfirmation } from '../../utils/language-detector.js';
import { 
  loadProfile,
  saveProfile,
  saveInteraction,
  loadConversationHistory,
  saveConversationMessage,
  savePartialForm
} from '../../perfiles-interacciones/memoria-sqlite.js';
import { getPaymentInfo, calculateReservationCost } from '../../servicios/payment-calculator.js';
import { dispatchHttpRequest } from '../../servicios/external-dispatcher.js';
import { clearJustConfirmed, clearPendingConfirmation } from '../../servicios/reservation-state.js';

const router = Router();

/**
 * 🧹 Limpia nombres de WhatsApp Business para extraer nombre real
 */
function cleanWhatsAppName(whatsappName) {
  if (!whatsappName || typeof whatsappName !== 'string') return null;
  
  let cleaned = whatsappName.trim();
  
  // Remover emojis comunes
  cleaned = cleaned.replace(/[🏠🏢💼🔥⭐🎯💪👑🚀💯😊😎🤝🌟❤️🎉💻📱🏆]/g, '');
  
  // Remover texto común de WhatsApp Business
  const businessKeywords = [
    'whatsapp business', 'business', 'empresa', 'company', 
    'servicio', 'service', 'oficial', 'official', '\\+593', '\\+1',
    'contacto', 'contact', 'ventas', 'sales', 'info', 'atención'
  ];
  
  for (const keyword of businessKeywords) {
    const regex = new RegExp(keyword, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remover números de teléfono
  cleaned = cleaned.replace(/\+?\d{1,4}[\s-]?\d{6,}/g, '');
  
  // Limpiar espacios y caracteres especiales (mantener acentos españoles)
  cleaned = cleaned.replace(/[^\w\sñáéíóúüÑÁÉÍÓÚÜ]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Solo tomar el primer nombre si es muy largo
  if (cleaned.length > 20) {
    cleaned = cleaned.split(' ')[0];
  }
  
  // Capitalizar cada palabra (Title Case)
  if (cleaned.length > 0) {
    cleaned = cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return cleaned.length > 1 ? cleaned : null;
}

/**
 * 🔍 Detecta nombre desde mensaje de presentación
 */
function extractNameFromMessage(message) {
  if (!message) return null;
  
  // Patrones comunes de presentación
  const patterns = [
    /(?:soy|me llamo|mi nombre es|soy de)\\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)/i,
    /(?:hola|buenos días|buenas tardes|buenas noches),?\\s*(?:soy)?\\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1].length > 1) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }
  
  return null;
}

/**
 * 🛡️ Detecta si un mensaje proviene de un bot
 * Retorna { detected: boolean, reason: string }
 */
function detectarBot(data, text, name) {
  // 🚨 FILTROS TEMPORALMENTE DESHABILITADOS PARA TESTING
  // TODO: Reactivar filtros una vez confirmado que Aurora responde
  
  // 1. ÚNICO FILTRO ACTIVO: Detectar por campo isBot explícito
  if (data.isBot === true || data.type === 'bot' || data.fromBot === true) {
    return { detected: true, reason: 'campo_isBot_true' };
  }

  // 2. ÚNICO FILTRO ACTIVO: Detectar grupos
  const userId = data.fromNumber || data.from || '';
  if (userId.includes('@g.us') || userId.includes('@broadcast')) {
    return { detected: true, reason: 'mensaje_de_grupo_o_broadcast' };
  }

  // ⚠️ FILTROS COMENTADOS TEMPORALMENTE:
  
  // 3. Detectar números sospechosos de bots (números muy largos o con patrones)
  /*
  const numeros = userId.replace(/\D/g, '');
  if (numeros.length > 15 || numeros.startsWith('000000')) {
    return { detected: true, reason: 'numero_invalido_o_sospechoso' };
  }
  */

  // 4. Detectar nombres típicos de bots
  /*
  const nombreLower = (name || '').toLowerCase();
  const botKeywords = ['bot', 'automated', 'auto-reply', 'no-reply', 'noreply', 'system', 'whatsapp business'];
  if (botKeywords.some(keyword => nombreLower.includes(keyword))) {
    return { detected: true, reason: 'nombre_contiene_keyword_bot' };
  }
  */

  // 5. Detectar mensajes con estructura típica de bot (muy cortos o solo comandos)
  /*
  const textLower = text.toLowerCase().trim();
  if (textLower.startsWith('/') || textLower.startsWith('!') || textLower.startsWith('.')) {
    // Comandos de bots, pero permitimos si parece humano
    if (text.length < 5) {
      return { detected: true, reason: 'comando_bot_detectado' };
    }
  }
  */

  // 6. Detectar mensajes con URLs acortadas repetitivas (spam bots)
  /*
  const urlPattern = /(bit\.ly|tinyurl|goo\.gl|t\.co|ow\.ly)/gi;
  const urlMatches = text.match(urlPattern);
  if (urlMatches && urlMatches.length > 2) {
    return { detected: true, reason: 'multiples_urls_acortadas_spam' };
  }
  */

  // No es bot
  return { detected: false, reason: null };
}

/**
 * Envía mensaje a WhatsApp vía Wassenger API
 */
async function enviarWhatsApp(numero, mensaje) {
  const WASSENGER_TOKEN = process.env.WASSENGER_TOKEN;
  const WASSENGER_DEVICE = process.env.WASSENGER_DEVICE || process.env.WASSENGER_DEVICE_ID;
  const BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || process.env.WASSENGER_DEVICE_ID || process.env.WASSENGER_DEVICE;

  if (!WASSENGER_TOKEN || !WASSENGER_DEVICE) {
    console.warn('[WASSENGER] Token o Device no configurado');
    return { ok: false, error: 'NO_WASSENGER_CONFIG' };
  }

  // 🛡️ SEGURIDAD: Nunca enviar mensaje al propio bot
  if (BOT_NUMBER && numero.includes(BOT_NUMBER.replace(/\D/g, ''))) {
    console.warn('[WASSENGER] Intento de enviar mensaje al propio bot bloqueado');
    return { ok: false, error: 'SELF_MESSAGE_BLOCKED' };
  }

  try {
    const response = await dispatchHttpRequest({
      url: 'https://api.wassenger.com/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': WASSENGER_TOKEN
      },
      body: JSON.stringify({
        phone: numero,
        message: mensaje,
        device: WASSENGER_DEVICE
      }),
      circuitId: 'wassenger:messages',
      timeoutMs: 5000,
      maxRetries: 2
    });

    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch (error) {
    console.error('[WASSENGER] Error enviando mensaje:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Wassenger Webhook (POST)
 * Configura esta URL en Wassenger como Webhook de mensajes entrantes.
 * Body esperado:
 * {
 *   "event": "message:in:text" | "message:in",
 *   "data": {
 *      "fromNumber": "593987654321",
 *      "body": "texto del mensaje",
 *      "fromName": "Nombre Contacto"
 *   }
 * }
 */
router.post('/webhooks/wassenger', validateWebhookSignature, rateLimitByPhone, async (req, res) => {
  try {
    // 🚫 CONTROL: Desactivación temporal de Wassenger vía variable de entorno
    const wassengerEnabled = process.env.WASSENGER_ENABLED !== 'false';
    
    if (!wassengerEnabled) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] ⏸️ DESACTIVADO TEMPORALMENTE - Webhook ignorado');
      }
      return res.json({ 
        ok: true, 
        ignored: true, 
        reason: 'wassenger_disabled',
        message: 'Wassenger está temporalmente desactivado'
      });
    }

    const body = req.body || {};
    const evt = body.event || '';
    const data = body.data || {};
    const isProd = process.env.NODE_ENV === 'production';

    if (process.env.DEBUG_MODE === 'true') {
      if (isProd) {
        console.log('[WASSENGER] Webhook recibido', {
          event: evt,
          from: data.fromNumber || data.from || 'unknown'
        });
      } else {
        console.log('[WASSENGER] Webhook recibido:', JSON.stringify(body, null, 2));
      }
    }

    if (!evt || !data) {
      return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' });
    }

    // 🛡️ FILTRO 1: Ignorar mensajes salientes o eventos no relevantes
    if (!evt.includes('message:in') || evt.includes('message:out')) {
      return res.json({ ok: true, ignored: true, reason: 'not_incoming_message' });
    }

    // Extraer datos (compatibilidad con diferentes formatos de Wassenger)
    const userId = (data.fromNumber || data.from || '').trim();
    let text = (data.body || data.message || '').trim();
    // 🔧 FIX: Extraer nombre desde la estructura correcta de Wassenger
    const name = data.chat?.name || data.contact?.name || data.fromName || data.name || '';
    const messageType = data.type || 'text';
    const mediaUrl = data.mediaUrl || data.media?.url || null;

    if (!userId) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'no_user_id' });
    }

    // 📸 PROCESAMIENTO DE IMÁGENES/DOCUMENTOS
    if (messageType === 'image' || messageType === 'document' || messageType === 'pdf') {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 📸 Procesando imagen/documento...');
        console.log('[WASSENGER] 📸 DEBUG - Type:', messageType, 'MediaURL:', mediaUrl ? 'PRESENTE' : 'AUSENTE');
        console.log('[WASSENGER] 📸 DEBUG - Full data structure:', JSON.stringify(data, null, 2));
      }
      
      const messageData = { type: messageType, media: { url: mediaUrl } };
      
      // Cargar perfil para saber el agente activo
      const userProfile = await loadProfile(userId);
      const activeAgent = userProfile?.activeAgent || 'AURORA';
      
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 📸 DEBUG - Active agent:', activeAgent, 'MediaURL exists:', !!mediaUrl);
      }
      
      // 🚗 SI ES AXEL SIN IMAGEN: Verificar si tiene formulario en progreso
      if (activeAgent === 'AXEL' && !mediaUrl) {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] 🚗 AXEL activo - mensaje de texto recibido');
        }
        
        const responseText = text.toLowerCase();
        
        // Importar servicios del formulario
        const { processAxelFormMessage, getAxelForm } = await import('../../servicios/axel-quote-form.js');
          
          // Verificar si tiene formulario en progreso
          const { exists, data: currentForm } = await getAxelForm(userId);
          
          // Si NO tiene formulario y saluda/mensaje inicial → pedir fotos
          if (!exists && (responseText.includes('hola') || responseText.includes('buenos') || responseText.includes('buenas') || responseText.length < 20)) {
            await enviarWhatsApp(userId, 
              '¡Hola! Soy Axel de PaintBull 🚗💥 Especialista en enderezada y pintura con 15 años de experiencia.\n\nEnvíame fotos de los daños de tu vehículo y te cotizo de inmediato. 📸\n\nIdealmente:\n• Foto general del vehículo\n• Close-up de cada zona dañada\n• Desde varios ángulos\n• Con buena luz natural'
            );
            return res.json({ ok: true, processed: true, type: 'axel_greeting' });
          }
          
          // Si NO tiene formulario y escribe algo → recordar fotos
          if (!exists) {
            await enviarWhatsApp(userId, 
              'Para poder ayudarte con la cotización necesito que me envíes fotos del daño. 📸\n\nAsegúrate de que:\n✅ Tengan buena iluminación\n✅ Muestren el daño desde varios ángulos\n✅ Sean claras (sin blur)\n\n¿Listo? Envíame las fotos 👍'
            );
            return res.json({ ok: true, processed: true, type: 'axel_awaiting_photo' });
          }
          
          // 📋 SI TIENE FORMULARIO EN PROGRESO → Procesar datos
          if (process.env.DEBUG_MODE === 'true') {
            console.log('[WASSENGER] 📋 Procesando datos del formulario...');
          }
          const formResult = await processAxelFormMessage(userId, text);
          
          if (!formResult.success) {
            await enviarWhatsApp(userId, 
              '⚠️ No pude procesar tu mensaje. ¿Puedes intentar de nuevo?\n\nRecuerda enviarlo como: _Marca Modelo Año_'
            );
            return res.json({ ok: true, processed: true, type: 'axel_form_error' });
          }
          
          // Si formulario completo → Generar cotización
          if (formResult.complete) {
            if (process.env.DEBUG_MODE === 'true') {
              console.log('[WASSENGER] ✅ Formulario completo - generando cotización');
            }
            
            await enviarWhatsApp(userId, 
              '✅ *¡Perfecto!* Ya tengo toda la información.\n\n' +
              '🔄 Estoy preparando tu cotización personalizada...\n\n' +
              '_Esto tomará unos segundos_ ⏱️'
            );
            
            // Importar generador de cotizaciones
            const { processQuoteGeneration } = await import('../../servicios/axel-quote-generator.js');
            
            // Obtener análisis de daños del perfil
            const damageAnalysis = profile.axelData?.damageAnalysis;
            
            if (!damageAnalysis) {
              console.error('[WASSENGER] ❌ No se encontró análisis de daños en el perfil');
              await enviarWhatsApp(userId, 
                '⚠️ Hubo un problema recuperando el análisis de daños.\n\n' +
                'Por favor, envíame nuevamente las fotos del vehículo para poder cotizar. 📸'
              );
              return res.json({ ok: true, processed: true, type: 'axel_missing_analysis' });
            }
            
            // Generar cotización con OpenAI
            const quoteResult = await processQuoteGeneration({
              userId,
              vehicleData: formResult.data,
              damageAnalysis: damageAnalysis,
              photoUrls: damageAnalysis.photoUrls || []
            });
            
            if (!quoteResult.success) {
              console.error('[WASSENGER] ❌ Error generando cotización:', quoteResult.error);
              await enviarWhatsApp(userId, quoteResult.fallbackMessage);
              
              await saveInteraction({
                userId,
                agent: 'axel',
                agentName: 'Axel',
                intentReason: 'quote_generation_error',
                input: text,
                output: quoteResult.fallbackMessage,
                meta: {
                  route: '/webhooks/wassenger',
                  via: 'whatsapp',
                  error: quoteResult.error
                }
              });
              
              return res.json({ ok: true, processed: true, type: 'axel_quote_error' });
            }
            
            // Enviar cotización por WhatsApp
            await enviarWhatsApp(userId, quoteResult.whatsappMessage);
            
            // Guardar cotización completa
            profile.axelData = profile.axelData || {};
            profile.axelData.latestQuote = {
              vehicleData: formResult.data,
              damageAnalysis: damageAnalysis,
              quoteData: quoteResult.emailData,
              quotedAt: new Date().toISOString()
            };
            await saveProfile(userId, profile);
            
            if (process.env.DEBUG_MODE === 'true') {
              console.log('[WASSENGER] ✅ Cotización enviada y guardada');
            }
            
            // Enviar email con cotización HTML
            const { sendQuoteEmail } = await import('../../servicios/axel-quote-email.js');
            const emailResult = await sendQuoteEmail({
              customerEmail: formResult.data.email,
              customerName: formResult.data.nombre,
              vehicleData: formResult.data,
              damageAnalysis: damageAnalysis,
              quote: quoteResult.emailData.quote,
              priceRange: quoteResult.emailData.priceRange,
              photoUrls: damageAnalysis.photoUrls || []
            });
            
            if (emailResult.success) {
              if (process.env.DEBUG_MODE === 'true') {
                console.log('[WASSENGER] ✅ Email de cotización enviado');
              }
            } else {
              console.error('[WASSENGER] ⚠️ Error enviando email de cotización:', emailResult.error);
            }
            
            // Guardar interacción
            await saveInteraction({
              userId,
              agent: 'axel',
              agentName: 'Axel',
              intentReason: 'quote_generated',
              input: text,
              output: quoteResult.whatsappMessage,
              meta: {
                route: '/webhooks/wassenger',
                via: 'whatsapp',
                formData: formResult.data,
                quoteData: quoteResult.emailData,
                emailSent: emailResult.success
              }
            });
            
            return res.json({ 
              ok: true, 
              processed: true, 
              type: 'axel_quote_sent',
              quoteData: quoteResult.emailData
            });
          }
          
          // Si formulario incompleto → Enviar prompt
          if (formResult.needsMoreInfo && formResult.prompt) {
            await enviarWhatsApp(userId, formResult.prompt);
            
            await saveInteraction({
              userId,
              agent: 'axel',
              agentName: 'Axel',
              intentReason: 'quote_form_progress',
              input: text,
              output: formResult.prompt,
              meta: {
                route: '/webhooks/wassenger',
                via: 'whatsapp',
                currentData: formResult.currentData,
                missingFields: formResult.missingFields
              }
            });
            
            return res.json({ ok: true, processed: true, type: 'axel_form_progress' });
          }
      }
      
      // 🚗 SI ES AXEL CON IMAGEN: Análisis de vehículo dañado con Vision AI especializado
      if (activeAgent === 'AXEL' && mediaUrl) {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] 🚗 AXEL activo + imagen detectada - iniciando análisis de colisión');
        }
        
        try {
          // Importar servicio de análisis de colisiones
          const { analyzeCollisionPhoto } = await import('../../servicios/collision-analysis.js');
          
          // Analizar imagen con Vision AI especializado
          const analysis = await analyzeCollisionPhoto(mediaUrl, { photoType: 'general' });
          
          if (!analysis.success) {
            console.error('[WASSENGER] ❌ Error en análisis Vision:', analysis.error);
            await enviarWhatsApp(userId,
              '⚠️ Hubo un problema al analizar la imagen. ¿Podrías enviarla de nuevo? Asegúrate de que tenga buena luz y enfoque. 📸'
            );
            return res.json({ ok: true, processed: true, type: 'vision_error' });
          }

          console.log(`[WASSENGER] ✅ Análisis completado - Severidad: ${analysis.severity}, Apto: ${analysis.isAcceptable}`);
          
          // Generar respuesta basada en el análisis
          let response = `🔍 *ANÁLISIS COMPLETADO*\n\n`;
          response += analysis.analysis + '\n\n';
          
          if (!analysis.isAcceptable) {
            // 🚨 COLISIÓN GRAVE - Activar proceso especial con Jefe de Taller
            if (process.env.DEBUG_MODE === 'true') {
              console.log('[WASSENGER] 🚨 Colisión GRAVE detectada - activando proceso con Juan');
            }
            
            const { handleSevereCollision } = await import('../../servicios/severe-collision-alert.js');
            
            // Obtener datos del vehículo del perfil (si existen)
            const vehicleData = profile.axelData?.vehicle || null;
            
            // Ejecutar proceso completo: WhatsApp + Email a Juan
            const alertResult = await handleSevereCollision({
              userName: profile.name || 'Cliente',
              userId: userId,
              vehicleData: vehicleData,
              analysis: analysis.analysis,
              photoUrls: [mediaUrl]
            });
            
            // Mensaje al usuario con enlace a Juan
            response += `\n⚠️ *ATENCIÓN:* Este tipo de daño requiere evaluación especializada.\n\n`;
            response += `Te voy a conectar con *Juan*, nuestro Jefe de Taller, quien tiene experiencia en este tipo de reparaciones:\n\n`;
            response += `👉 *Contactar a Juan directamente:*\n`;
            response += `${alertResult.contactLink}\n\n`;
            response += `Él te responderá en breve para coordinar una inspección personalizada. 👍`;
            
            console.log(`[WASSENGER] ${alertResult.success ? '✅' : '⚠️'} Proceso de colisión grave completado`);
            
          } else {
            // ✅ Colisión LEVE/MODERADA - iniciar formulario de cotización
            const { processAxelFormMessage } = await import('../../servicios/axel-quote-form.js');
            
            // Procesar formulario con los datos del análisis inicial
            const initialData = `Vehículo con daño ${analysis.severity.toLowerCase()}`;
            const formResult = await processAxelFormMessage(userId, initialData);
            
            response += `\n✅ *Buenas noticias:* Este tipo de daño ${analysis.severity === 'LEVE' ? 'leve' : 'moderado'} SÍ lo podemos reparar.\n\n`;
            
            // Agregar prompt del formulario
            if (formResult.needsMoreInfo && formResult.prompt) {
              response += formResult.prompt;
            } else {
              response += `Para darte una cotización precisa, necesito:\n`;
              response += `1️⃣ Marca y modelo del vehículo\n`;
              response += `2️⃣ Año del vehículo\n`;
              response += `3️⃣ Tu nombre y email\n\n`;
              response += `Envíame estos datos 📋`;
            }
          }

          await enviarWhatsApp(userId, response);
          
          // Guardar análisis en el perfil para usar en cotización posterior
          if (!analysis.isAcceptable) {
            // Colisión grave - no guardar análisis (ya se manejó con Juan)
          } else {
            // Colisión leve/moderada - guardar para cotización
            profile.axelData = profile.axelData || {};
            profile.axelData.damageAnalysis = {
              severity: analysis.severity,
              analysis: analysis.analysis,
              damageDetails: analysis.damageDetails,
              isAcceptable: analysis.isAcceptable,
              photoUrls: [mediaUrl],
              analyzedAt: new Date().toISOString()
            };
            await saveProfile(userId, profile);
            if (process.env.DEBUG_MODE === 'true') {
              console.log('[WASSENGER] 💾 Análisis guardado en perfil para cotización');
            }
          }
          
          // Guardar interacción
          await saveInteraction({
            userId,
            agent: 'axel',
            agentName: 'Axel',
            intentReason: 'collision_photo_analysis',
            input: '[IMAGEN: Análisis de colisión vehicular]',
            output: response,
            meta: {
              route: '/webhooks/wassenger',
              via: 'whatsapp',
              mediaUrl,
              severity: analysis.severity,
              isAcceptable: analysis.isAcceptable,
              damageDetails: analysis.damageDetails
            }
          });
          
          return res.json({ 
            ok: true, 
            processed: true, 
            type: 'collision_analysis',
            severity: analysis.severity,
            isAcceptable: analysis.isAcceptable
          });
          
        } catch (error) {
          console.error('[WASSENGER] ❌ Error en análisis de Axel:', error);
          await enviarWhatsApp(userId, 
            '⚠️ Hubo un error al analizar la imagen. Por favor, intenta nuevamente o contacta directamente con nosotros.'
          );
          return res.json({ ok: true, processed: true, type: 'analysis_error' });
        }
      }
      
      // 🎯 SI ES ENZO/ADRIANA/ALUNA: Análisis de documento con Vision AI
      if (['ENZO', 'ADRIANA', 'ALUNA'].includes(activeAgent) && mediaUrl) {
        console.log(`[WASSENGER] 🧠 ${activeAgent} analizando documento/imagen...`);
        
        const { analyzeImage } = await import('../../servicios-ia/openai.js');
        const { AGENTES } = await import('../../deteccion-intenciones/orquestador.js');
        const agente = AGENTES[activeAgent];
        
        try {
          // Prompt según el tipo de archivo y agente
          const fileType = messageType === 'document' ? 'documento/PDF' : 'imagen';
          const analysisPrompt = `Analiza este ${fileType} que el Sensei acaba de enviar. 
          
Contexto: Eres ${agente.nombre}, ${agente.rol}.
Tarea: Identifica insights clave, datos importantes, oportunidades o problemas según tu expertise.

Responde en tu estilo característico con:
- Análisis rápido de lo que viste
- Insights accionables
- Recomendaciones específicas
- Usa emojis estratégicos`;

          const analysisResult = await analyzeImage(mediaUrl, analysisPrompt, {
            max_tokens: 800,
            temperature: 0.7
          });
          
          if (analysisResult.success) {
            const reply = analysisResult.content;
            
            // Enviar respuesta
            await enviarWhatsApp(userId, reply);
            
            // Guardar interacción
            await saveInteraction({
              userId,
              agent: activeAgent.toLowerCase(),
              agentName: agente.nombre,
              intentReason: 'document_analysis',
              input: `[${fileType.toUpperCase()}]`,
              output: reply,
              meta: {
                route: '/webhooks/wassenger',
                via: 'whatsapp',
                mediaUrl,
                fileType: messageType
              }
            });
            
            return res.json({ 
              ok: true, 
              processed: true, 
              type: 'document_analysis',
              agent: activeAgent
            });
          }
        } catch (error) {
          console.error('[WASSENGER] ❌ Error analizando documento:', error);
          await enviarWhatsApp(userId, 'Gomen Sensei 🙏 Tuve un problema analizando tu archivo. ¿Puedes intentar de nuevo?');
          return res.json({ ok: true, processed: true, type: 'analysis_error' });
        }
      }
      
      // 💳 SI ES AURORA: Verificar si es comprobante de pago
      if (activeAgent === 'AURORA' && isReceiptImage(messageData)) {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] 💳 Imagen detectada como posible comprobante de pago');
        }
        
        if (!userProfile) {
          await enviarWhatsApp(userId, '❌ No encontré tu perfil. ¿Puedes intentar hacer una reserva primero?');
          return res.json({ ok: true, processed: true, type: 'profile_error' });
        }
        
        // Procesar comprobante de pago
        const paymentResult = await processPaymentReceipt(messageData, userProfile);
        
        // Enviar respuesta
        await enviarWhatsApp(userId, paymentResult.message);
        
        // Guardar interacción
        await saveInteraction({
          userId,
          agent: 'aurora',
          agentName: 'Aurora',
          intentReason: 'payment_verification',
          input: `[IMAGEN: Comprobante de pago]`,
          output: paymentResult.message,
          meta: {
            route: '/webhooks/wassenger',
            via: 'whatsapp',
            mediaUrl,
            paymentVerified: paymentResult.success,
            paymentData: paymentResult.data
          }
        });
        
        return res.json({ 
          ok: true, 
          processed: true, 
          type: 'payment_verification',
          success: paymentResult.success 
        });
      } else {
        // Imagen/documento enviado a Aurora pero no es comprobante
        await enviarWhatsApp(userId, 
          '📷 He recibido tu archivo. Si es un comprobante de pago, procesalo. ' +
          'Si necesitas ayuda técnica, habla con @Enzo. ' +
          'Si necesitas ayuda con seguros, habla con @Adriana.'
        );
        
        return res.json({ 
          ok: true, 
          processed: true, 
          type: 'image_received' 
        });
      }
    }

    // 🎤 PROCESAMIENTO DE MENSAJES DE VOZ
    if (messageType === 'audio' || messageType === 'voice' || messageType === 'ptt') {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🎤 Procesando mensaje de voz...');
      }
      
      if (!mediaUrl) {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] ❌ No se encontró URL de audio');
        }
        return res.json({ ok: true, ignored: true, reason: 'no_audio_url' });
      }

      // Importar función de transcripción
      const { transcribeAudio } = await import('../../servicios-ia/openai.js');
      
      // Transcribir audio
      const transcription = await transcribeAudio(mediaUrl);
      
      if (!transcription.success) {
        await enviarWhatsApp(userId, 
          '🎤 Lo siento, no pude procesar tu mensaje de voz. ¿Podrías escribirlo por texto? 😊'
        );
        return res.json({ 
          ok: true, 
          processed: true, 
          type: 'audio_transcription_failed' 
        });
      }

      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] ✅ Audio transcrito:', transcription.text);
      }
      
      // Actualizar el texto con la transcripción
      text = transcription.text;
      
      // Notificar al usuario que se procesó el audio
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🎤→📝 Procesando como texto:', text);
      }
    }

    // Continuar con procesamiento normal de texto
    if (!text) {
      return res.status(200).json({ ok: true, ignored: true, reason: 'no_text_content' });
    }

    // 🛡️ FILTRO 2: Evitar procesar el propio número del bot
    const BOT_NUMBER = process.env.WHATSAPP_BOT_NUMBER || process.env.WASSENGER_DEVICE_ID || process.env.WASSENGER_DEVICE;
    if (BOT_NUMBER && userId.includes(BOT_NUMBER.replace(/\D/g, ''))) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] Mensaje ignorado: es del propio bot');
      }
      return res.json({ ok: true, ignored: true, reason: 'self-message' });
    }

    // 🛡️ FILTRO 3: Detectar si el mensaje viene del bot (campo fromMe)
    if (data.fromMe === true || data.fromMe === 'true') {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] Mensaje ignorado: fromMe=true');
      }
      return res.json({ ok: true, ignored: true, reason: 'message_from_bot' });
    }

    // 🛡️ FILTRO 4: Ignorar mensajes muy antiguos (más de 1 hora)
    const messageTimestamp = data.timestamp || Date.now() / 1000;
    const now = Date.now() / 1000;
    if (now - messageTimestamp > 3600) { // 1 hora
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] Mensaje ignorado: muy antiguo (>1h)');
      }
      return res.json({ ok: true, ignored: true, reason: 'old_message' });
    }

    // 🛡️ FILTRO 5: Detectar y bloquear BOTS
    const isBot = detectarBot(data, text, name);
    if (isBot.detected) {
      console.log(`[WASSENGER] BOT DETECTADO y bloqueado: ${isBot.reason}`);
      return res.json({ ok: true, ignored: true, reason: 'bot_detected', details: isBot.reason });
    }

    // 🔍 DEBUG: Log del mensaje que va a procesar Aurora
    if (!isProd && process.env.DEBUG_MODE === 'true') {
      console.log('[WASSENGER] ✅ PROCESANDO MENSAJE VÁLIDO:');
      console.log(`- Usuario: ${userId}`);
      console.log(`- Nombre: ${name}`);
      console.log(`- Texto: "${text}"`);
      console.log(`- Tipo: ${messageType}`);
      console.log('- Datos completos:', JSON.stringify(data, null, 2));
    }

    // Perfil/memoria
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[DEBUG-FLOW] 1️⃣ Iniciando loadProfile para:', userId);
    }
    const current = await loadProfile(userId) || {};
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[DEBUG-FLOW] 2️⃣ loadProfile completado, firstVisit:', current?.firstVisit);
    }
    const firstVisit = current?.firstVisit === undefined ? true : current.firstVisit;
    
    // 🆕 Cargar historial de conversación (últimos 10 mensajes)
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[DEBUG-FLOW] 3️⃣ Iniciando loadConversationHistory...');
    }
    const conversationHistory = await loadConversationHistory(userId, 10);
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[DEBUG-FLOW] 4️⃣ loadConversationHistory completado, mensajes:', conversationHistory?.length || 0);
    }
    
    // 🆕 DETECCIÓN INTELIGENTE DEL NOMBRE
    let detectedName = current.name || null;
    
    // Si no tenemos nombre guardado, intentar extraerlo
    if (!detectedName && name) {
      detectedName = cleanWhatsAppName(name);
      if (!isProd) {
        console.log(`[WASSENGER] Nombre detectado de WhatsApp: "${name}" → limpio: "${detectedName}"`);
      }
    }
    
    // También intentar detectar nombre del mensaje si es primera vez
    if (!detectedName && firstVisit && text) {
      const nameFromMessage = extractNameFromMessage(text);
      if (nameFromMessage) {
        detectedName = nameFromMessage;
        if (!isProd) {
          console.log(`[WASSENGER] Nombre detectado del mensaje: "${nameFromMessage}"`);
        }
      }
    }
    
    // 🆕 DETECCIÓN AUTOMÁTICA DE EMAIL
    let detectedEmail = current.email || null;
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    const emailMatch = text.match(emailRegex);
    if (emailMatch && !detectedEmail) {
      detectedEmail = emailMatch[0].toLowerCase();
      if (!isProd) {
        console.log(`[WASSENGER] 📧 Email detectado automáticamente: "${detectedEmail}"`);
      }
    }
    
    let profile = {
      ...current,
      userId,
      name: detectedName,
      email: detectedEmail, // 🆕 Guardar email detectado automáticamente
      whatsappDisplayName: name || null, // Guardar nombre original de WhatsApp
      channel: 'whatsapp',
      lastMessageAt: new Date().toISOString(),
      conversationCount: (current.conversationCount || 0) + 1
      // ⚠️ CRÍTICO: NO sobrescribir firstVisit, freeTrialUsed, freeTrialDate
      // Esos campos solo se actualizan en confirmation-flow.js
      // Si los pasamos aquí, se sobrescriben en cada mensaje
    };
    
    // Guardar perfil actualizado
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[DEBUG-FLOW] 5️⃣ Iniciando saveProfile...');
    }
    await saveProfile(userId, profile);
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[DEBUG-FLOW] 6️⃣ saveProfile completado');
    }

    // 🔍 DEBUG: Log del perfil completo
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[DEBUG-PERFIL] 📊 Perfil cargado:', {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        firstVisit: profile.firstVisit,
        freeTrialUsed: profile.freeTrialUsed,
        conversationCount: profile.conversationCount,
        hasPendingConfirmation: !!profile.pendingConfirmation,
        pendingConfirmationData: profile.pendingConfirmation ? {
          date: profile.pendingConfirmation.date,
          startTime: profile.pendingConfirmation.startTime,
          serviceType: profile.pendingConfirmation.serviceType,
          email: profile.pendingConfirmation.email ? 'Sí' : 'No'
        } : 'No hay'
      });
    }

    // 🧹 Limpiar flag temporal "justConfirmed" si han pasado más de 10 minutos
    if (profile.justConfirmed && profile.justConfirmedUntil) {
      const expiresAt = new Date(profile.justConfirmedUntil).getTime();
      const now = Date.now();
      if (now > expiresAt) {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] 🧹 Fin de periodo justConfirmed, limpiando en DB');
        }
        await clearJustConfirmed(userId);
        profile.justConfirmed = false;
      }
    }

    // 🚦 VALIDAR AGENTE ACTIVO - Solo responde el agente que está activo
    const activeAgent = profile.activeAgent || 'AURORA';
    const isAgentMention = /@(aurora|enzo|adriana|aluna)/i.test(text);
    
    // NUEVA LÓGICA: Si el usuario NO menciona un agente específico, el mensaje va al agente activo
    // Solo validamos si detectamos mención explícita de cambio de agente
    // Esto permite que después de un handoff, todos los mensajes vayan al nuevo agente
    if (process.env.DEBUG_MODE === 'true') {
      console.log(`[WASSENGER] 🎯 Agente activo: ${activeAgent}, Mención detectada: ${isAgentMention}`);
    }

    // 🔄 DETECTAR CONTEXTO DE REPLY (mensajes citados)
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[DEBUG-FLOW] 7️⃣ Analizando contexto de reply...');
    }
    const replyContext = buildReplyContext(text, body, conversationHistory);
    
    if (replyContext.hasReplyContext && process.env.DEBUG_MODE === 'true') {
      console.log('[REPLY-CONTEXT] ✅ Contexto de reply detectado:', {
        type: replyContext.contextType,
        source: replyContext.source,
        confidence: replyContext.confidence,
        quotedPreview: replyContext.quotedMessage?.substring(0, 50) + '...'
      });
    }
    
    // Si detectamos contexto de reply, usar el mensaje enriquecido
    let processedText = replyContext.hasReplyContext ? replyContext.enrichedMessage : text;
    
    // 🆕 Guardar mensaje del usuario en historial
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[DEBUG-FLOW] 8️⃣ Iniciando saveConversationMessage...');
    }
    await saveConversationMessage(userId, {
      role: 'user',
      content: processedText
    });
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[DEBUG-FLOW] 8️⃣ saveConversationMessage completado');
    }

    // 🧠 FORMULARIO PARCIAL INTELIGENTE - Detectar y extraer datos progresivamente (PRIMERO)
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[WASSENGER] 🧠 Procesando mensaje con formulario inteligente...');
    }
    // Usar processedText (con contexto de reply si existe) en lugar de text original
    const formResult = await processMessageWithForm(userId, processedText, profile, profile.freeTrialUsed);
    
    // Pasar el mensaje del usuario al formResult para detección de frustración
    formResult.userMessage = text;
    
    // 🚨 VALIDACIÓN CRÍTICA: Si hay error de validación (domingo/feriado), responder inmediatamente
    if (formResult.validationError) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🚫 Error de validación detectado:', formResult.validationError.type);
      }
      
      const errorMessage = formResult.validationError.message;
      
      // Enviar mensaje de error al usuario
      await enviarWhatsApp(userId, errorMessage);
      
      // Guardar interacción
      await saveInteraction({
        userId,
        agent: 'aurora',
        agentName: 'Aurora',
        intentReason: 'validation_error',
        input: text,
        output: errorMessage,
        meta: {
          route: '/webhooks/wassenger',
          via: 'whatsapp',
          errorType: formResult.validationError.type,
          suggestedDate: formResult.validationError.suggestedDate
        }
      });
      
      // Guardar en historial
      await saveConversationMessage(userId, {
        role: 'assistant',
        content: errorMessage,
        agent: 'Aurora'
      });
      
      // Limpiar el formulario para que pueda intentar otra fecha
      await clearPartialForm(userId);
      
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] ✅ Error de validación enviado - formulario limpiado');
      }
      
      return res.json({ 
        ok: true, 
        processed: true,
        type: 'validation_error',
        errorType: formResult.validationError.type
      });
    }
    
    if (formResult.updates && Object.keys(formResult.updates).length > 0) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] ✨ Datos detectados automáticamente:', formResult.updates);
      }
      
      // Actualizar perfil con datos detectados
      if (formResult.updates.email && !profile.email) {
        profile.email = formResult.updates.email;
        await saveProfile(userId, profile);
      }
    }

    // 🚫 BLOQUEO: Si hay reservas con pago pendiente, no permitir nuevas reservas
    const reservationKeywords = ['reserva', 'reservar', 'hot desk', 'sala', 'espacio'];
    const isReservationIntent = reservationKeywords.some(kw => text.toLowerCase().includes(kw));
    
    if (isReservationIntent) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🔍 Detectado intent de reserva - verificando pagos pendientes...');
      }
      
      const { default: reservationRepository } = await import('../../database/reservationRepository.js');
      const allUserReservations = await reservationRepository.findByUser(userId);
      const pendingPayments = allUserReservations.filter(r => 
        r.status === 'pending_payment' && r.payment_status === 'pending'
      );
      
      if (pendingPayments.length > 0) {
        console.log(`[WASSENGER] 🚫 Usuario tiene ${pendingPayments.length} reserva(s) sin pagar`);
        
        const pendingList = pendingPayments.map((r, idx) => {
          const date = new Date(r.date).toLocaleDateString('es-EC', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          return `${idx + 1}. ${date} | ${r.start_time}-${r.end_time} | $${r.total_price}`;
        }).join('\n');
        
        const blockMessage = `⚠️ *Tienes ${pendingPayments.length} reserva(s) pendiente(s) de pago:*

${pendingList}

Por favor, completa el pago de tu(s) reserva(s) anterior(es) antes de agendar una nueva. 🙏

¿Cómo prefieres pagar?
💳 *Tarjeta* (Payphone - online)
🏦 *Transferencia* bancaria`;

        await enviarWhatsApp(userId, blockMessage);
        
        await saveInteraction({
          userId,
          agent: 'aurora',
          agentName: 'Aurora',
          intentReason: 'blocked_pending_payments',
          input: text,
          output: blockMessage,
          meta: {
            route: '/webhooks/wassenger',
            via: 'whatsapp',
            pendingCount: pendingPayments.length,
            pendingIds: pendingPayments.map(r => r.id)
          }
        });
        
        await saveConversationMessage(userId, {
          role: 'assistant',
          content: blockMessage,
          agent: 'Aurora'
        });
        
        return res.json({ 
          ok: true, 
          processed: true,
          type: 'blocked_pending_payments',
          pendingCount: pendingPayments.length
        });
      }
    }
    
    // 🔄 RETOMANDO RESERVA - Solo si existe partial_form guardado (de cancelación previa)
    // Verificar si hay un partial_form guardado en DB (solo se guarda cuando hay cancelación)
    const { getPartialForm } = await import('../../perfiles-interacciones/memoria-sqlite.js');
    const savedPartialForm = await getPartialForm(userId);
    
    if (isReservationIntent && savedPartialForm && formResult.form.getResumeMessage) {
      const resumeMessage = formResult.form.getResumeMessage();
      if (resumeMessage) {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] 📋 Usuario retoma reserva cancelada anteriormente - enviando resumen');
        }
        formResult.resumeMessage = resumeMessage;
      }
    }

    // 🔄 SISTEMA DE CONFIRMACIONES SI/NO (DESPUÉS de actualizar formulario)
    // Solo procesar SI/NO si hay confirmación pendiente Y la respuesta es explícitamente SI/NO
    if (hasPendingConfirmation(profile)) {
      const isPositive = isPositiveResponse(text);
      const isNegative = isNegativeResponse(text);
      
      if (isPositive || isNegative) {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] Usuario tiene confirmación pendiente Y respuesta es SI/NO');
        }
        
        // Detectar si hay contexto adicional después del SI (ej: "Si, pero quiero hacer otra reserva")
        const hasAdditionalContext = text.match(/^s[ií][,.\s]+(.+)/i);
        const additionalText = hasAdditionalContext ? hasAdditionalContext[1].trim() : null;
        
        const confirmationResult = await processConfirmationResponse(text, profile);
      
        // Enviar respuesta de confirmación
        await enviarWhatsApp(userId, confirmationResult.message);
        
        // Guardar interacción de confirmación
        await saveInteraction({
          userId,
          agent: 'aurora',
          agentName: 'Aurora',
          intentReason: 'confirmation_response',
          input: text,
          output: confirmationResult.message,
          meta: {
            route: '/webhooks/wassenger',
            via: 'whatsapp',
            confirmationSuccess: confirmationResult.success,
            actionType: confirmationResult.actionType,
            needsAction: confirmationResult.needsAction,
            hasAdditionalContext: !!additionalText
          }
        });

        // Guardar respuesta en historial
        await saveConversationMessage(userId, {
          role: 'assistant',
          content: confirmationResult.message,
          agent: 'Aurora'
        });
        
        // Si confirmó exitosamente Y tiene contexto adicional, continuar procesando con Aurora
        if (confirmationResult.success && additionalText) {
          if (process.env.DEBUG_MODE === 'true') {
            console.log(`[WASSENGER] ✅ Confirmación exitosa + contexto adicional detectado: "${additionalText}"`);
            console.log('[WASSENGER] 🔄 Continuando con Aurora para procesar: ', additionalText);
          }
          
          // Pequeño delay para que vea el mensaje de confirmación primero
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Recargar perfil actualizado post-confirmación
          profile = await loadProfile(userId, data.chat?.name || data.contact?.name || data.fromName || name);
          conversationHistory = await loadConversationHistory(userId);
          
          // Procesar el contexto adicional con Aurora (caerá al flujo normal más abajo)
          processedText = additionalText;
          // NO hacer return aquí - continuar al flujo de Aurora
        } else {
          // Confirmación normal sin contexto adicional o negativa - terminar
          return res.json({ 
            ok: true, 
            processed: true,
            type: 'confirmation_response',
            success: confirmationResult.success,
            needsAction: confirmationResult.needsAction
          });
        }
      }
    }

    // Si el formulario NO está completo, continuar con Aurora para que pida datos faltantes
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[WASSENGER] Formulario incompleto o respuesta no es SI/NO, continuando con Aurora...');
    }
    
    // 💡 LÓGICA DE UPSELL: Si mencionó personas y pidió hot desk, sugerir sala
    let upsellMessage = null;
    if (formResult.form.spaceType === 'hotDesk' && formResult.form.numPeople >= 3) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 💡 Upsell detectado: 3+ personas con hot desk');
      }
      upsellMessage = `
¡Nota! Veo que vienen ${formResult.form.numPeople} personas 👥

Para grupos, te recomiendo nuestra **Sala de Reuniones** ($29/2h para 3-4 personas):
✅ Espacio privado
✅ Más cómodo para trabajar en equipo
✅ Incluye pizarra y pantalla

¿Prefieres cambiar a la sala o mantenemos el hot desk? 🤔
`.trim();
    }

    // 🚀 VERIFICAR CAMPAÑAS PUBLICITARIAS (SOLO PRIMERA VISITA Y NO ACABA DE CANCELAR)
    const campaignCheck = detectCampaignMessage(text);
    let reply;
    // NOTA: 'resultado' ya fue declarado más arriba (línea ~1203) donde se ejecuta el orquestador
    
    // 🌍 DETECTAR Y PROCESAR CAMBIO DE IDIOMA
    const languageCommand = detectLanguageCommand(text);
    if (languageCommand) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🌍 Comando de cambio de idioma detectado:', languageCommand);
      }
      
      // Actualizar idioma preferido del usuario
      await saveProfile(userId, { preferredLanguage: languageCommand });
      
      // Enviar mensaje de confirmación
      const confirmationMsg = getLanguageChangeConfirmation(languageCommand);
      await enviarWhatsApp(userId, confirmationMsg);
      
      // Guardar en historial
      await saveConversationMessage(userId, {
        role: 'assistant',
        content: confirmationMsg,
        agent: 'Aurora'
      });
      
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] ✅ Idioma actualizado y confirmación enviada');
      }
      return res.status(200).json({ status: 'ok', action: 'language_changed', language: languageCommand });
    }
    
    // 🌍 DETECTAR IDIOMA DEL MENSAJE (auto-detección)
    const currentLanguage = profile.preferredLanguage || 'es';
    const detectedLanguage = getUserLanguage(text, currentLanguage);
    
    // Si el idioma detectado es diferente al preferido con alta confianza, actualizar
    // Simplificamos la condición: solo requiere confidence > 0.7 y que sea diferente
    if (detectedLanguage.confidence > 0.7 && 
        detectedLanguage.language !== currentLanguage && 
        detectedLanguage.source === 'auto_detected_high_confidence') {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🌍 Cambio de idioma auto-detectado:', {
          anterior: currentLanguage,
          nuevo: detectedLanguage.language,
          confianza: detectedLanguage.confidence,
          source: detectedLanguage.source
        });
      }
      
      // Actualizar idioma preferido
      await saveProfile(userId, { preferredLanguage: detectedLanguage.language });
      profile.preferredLanguage = detectedLanguage.language;
      
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] ✅ Idioma actualizado automáticamente a:', detectedLanguage.language);
      }
    } else {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🌍 Idioma detectado:', {
          language: detectedLanguage.language,
          confidence: detectedLanguage.confidence,
          source: detectedLanguage.source,
          current: currentLanguage,
          willUpdate: false
        });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🎯 ORQUESTADOR - Ejecutar AQUÍ (después de tener processedText y formResult)
    // ═══════════════════════════════════════════════════════════════════════════
    // AHORA sí tenemos todo lo que el orquestador necesita:
    // ✓ profile cargado
    // ✓ conversationHistory cargado
    // ✓ processedText creado (con contexto de reply)
    // ✓ formResult extraído
    // → El orquestador puede ejecutarse y detectar handoffs ANTES de procesamiento especializado
    
    let resultado = null;
    
    // 🔍 DEBUG: Verificar perfil antes de enviar al orquestador
    console.log(`[WASSENGER] 🔍 DEBUGGING NOMBRE - Perfil antes del orquestador:`, {
      userId: profile.userId,
      name: profile.name,
      whatsappDisplayName: profile.whatsappDisplayName,
      firstVisit: profile.firstVisit
    });
    
    // 📧 DETECTAR SOLICITUD DE REENVÍO DE CONFIRMACIÓN
    const { detectResendConfirmationRequest, resendLastReservationConfirmation } = 
      await import('../../servicios/resend-confirmation.js');
    
    const isResendRequest = detectResendConfirmationRequest(text);
    
    if (isResendRequest) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 📧 Detectada solicitud de reenvío de confirmación');
      }
      
      const resendResult = await resendLastReservationConfirmation(userId, profile.email);
      
      if (resendResult.success) {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] ✅ Confirmación reenviada exitosamente');
        }
        
        await enviarWhatsApp(userId, resendResult.message);
        
        // Guardar en historial
        await saveConversationMessage(userId, {
          role: 'user',
          content: text
        });
        await saveConversationMessage(userId, {
          role: 'assistant',
          content: resendResult.message,
          agent: 'Aurora'
        });
        
        return res.json({ 
          ok: true, 
          processed: true,
          type: 'resend_confirmation'
        });
      } else {
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] ⚠️ No se pudo reenviar:', resendResult.error);
        }
        // Continuar con el flujo normal para que Aurora responda
      }
    }
    
    // Procesar mensaje con orquestador (ahora con historial + formulario + contexto de reply)
    resultado = procesarMensaje(processedText, profile, conversationHistory, formResult);
    
    // 🚫 MANEJAR CANCELACIÓN
    if (resultado.metadata.cancelacion) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🚫 Cancelación detectada');
      }
      
      // Guardar formulario parcial si existe
      if (resultado.metadata.shouldSavePartialForm) {
        await savePartialForm(userId, formResult, 'reservation');
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] 💾 Formulario parcial guardado');
        }
      }
      
      // Limpiar estados activos
      await clearPendingConfirmation(userId);
      await clearJustConfirmed(userId);
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🧹 Estados de reserva limpiados');
      }
    }

    // 🤝 MANEJAR HANDOFF - Cambio de agente
    if (resultado.metadata.agentHandoff) {
      const targetAgent = resultado.metadata.targetAgent;
      const fromAgent = activeAgent; // Agente ACTUAL antes del cambio
      if (process.env.DEBUG_MODE === 'true') {
        console.log(`[WASSENGER] 🤝 Handoff detectado: ${fromAgent} → ${targetAgent}`);
      }
      
      try {
        // 1. Obtener configuración del agente ACTUAL (quien se despide)
        const { AGENTES } = await import('../../deteccion-intenciones/orquestador.js');
        const agenteActual = AGENTES[fromAgent];
        
        if (!agenteActual) {
          console.error(`[WASSENGER] ❌ Agente actual ${fromAgent} no encontrado`);
          throw new Error(`Agente ${fromAgent} no encontrado`);
        }

        // 2. Generar mensaje de despedida/transición desde el agente ACTUAL
        const userName = profile.whatsappDisplayName || profile.name || 'amigo';
        const targetAgentConfig = AGENTES[targetAgent];
        const targetAgentName = targetAgentConfig?.nombre || targetAgent;
        
        // Obtener mensaje de handoff del agente actual
        let handoffMessage;
        if (agenteActual.rules?.handoverAxel && targetAgent === 'AXEL') {
          // Aurora tiene mensaje específico para Axel
          handoffMessage = agenteActual.rules.handoverAxel.replace('{nombre}', userName);
        } else if (agenteActual.mensajes?.despedida) {
          handoffMessage = agenteActual.mensajes.despedida;
        } else {
          handoffMessage = `Perfecto ${userName}, te dejo con *${targetAgentName}* quien te ayudará con esto. 👍`;
        }

        if (process.env.DEBUG_MODE === 'true') {
          console.log(`[WASSENGER] 📤 ${fromAgent} enviando mensaje de transición...`);
        }
        
        // 3. Enviar mensaje de transición
        const handoffResult = await enviarWhatsApp(userId, handoffMessage);
        if (!handoffResult.ok) {
          throw new Error(`Error enviando mensaje de transición: ${handoffResult.error}`);
        }

        // 4. Guardar mensaje de transición en historial
        await saveConversationMessage(userId, {
          role: 'assistant',
          content: handoffMessage,
          agent: fromAgent // Usar el agente ACTUAL, no el detectado
        });

        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] ⏳ Esperando 5 segundos antes de que entre el nuevo agente...');
        }
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 5. Obtener configuración del nuevo agente
        const nuevoAgente = AGENTES[targetAgent];
        
        if (!nuevoAgente) {
          throw new Error(`Agente ${targetAgent} no encontrado en configuración`);
        }

        // 6. Actualizar agente activo en perfil (ANTES de enviar mensaje de entrada)
        await saveProfile(userId, {
          activeAgent: targetAgent
        });
        
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] 👤 Agente activo actualizado a:', targetAgent);
        }

        // 7. Enviar mensaje de entrada del nuevo agente (SIN saludo, Aurora ya lo presentó)
        let mensajeEntrada = nuevoAgente.mensajes?.entrada || `¿En qué puedo ayudarte?`;
        
        // NO reemplazar {nombre} ya que el mensaje no debe ser un saludo
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] 📤 Enviando mensaje de entrada del nuevo agente...');
        }
        const entradaResult = await enviarWhatsApp(userId, mensajeEntrada);
        
        if (!entradaResult.ok) {
          throw new Error(`Error enviando mensaje de entrada: ${entradaResult.error}`);
        }

        // 8. Guardar mensaje de entrada en historial
        await saveConversationMessage(userId, {
          role: 'assistant',
          content: mensajeEntrada,
          agent: nuevoAgente.nombre
        });

        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] ✅ Handoff completado exitosamente');
        }
        
        // 9. Guardar interacción del handoff
        await saveInteraction({
          userId,
          agent: fromAgent.toLowerCase(),
          agentName: fromAgent,
          intentReason: 'agent_handoff',
          input: text,
          output: `Handoff desde ${fromAgent} a ${targetAgent}`,
          meta: {
            route: '/webhooks/wassenger',
            via: 'whatsapp',
            handoff: true,
            fromAgent: fromAgent,
            toAgent: targetAgent
          }
        });

        return res.json({ success: true, handoff: true, targetAgent });
        
      } catch (handoffError) {
        console.error('[WASSENGER] ❌ Error durante handoff:', handoffError);
        
        // Enviar mensaje de error al usuario
        await enviarWhatsApp(
          userId, 
          'Disculpa, hubo un problema al conectarte con el especialista. Por favor, intenta de nuevo o escribe "ayuda".'
        );
        
        // Guardar error en interacciones
        await saveInteraction({
          userId,
          agent: 'system',
          agentName: 'System',
          intentReason: 'handoff_error',
          input: text,
          output: `Error en handoff: ${handoffError.message}`,
          meta: {
            route: '/webhooks/wassenger',
            via: 'whatsapp',
            error: handoffError.message,
            targetAgent
          }
        });
        
        return res.json({ success: false, error: 'handoff_failed', message: handoffError.message });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Si llegamos aquí, el orquestador NO detectó handoff
    // → Continuar con flujo normal (procesamiento especializado y respuesta)
    // ═══════════════════════════════════════════════════════════════════════════
    // Si llegamos aquí, NO hubo handoff → Continuar con flujo normal
    // ═══════════════════════════════════════════════════════════════════════════

    // 👋 MANEJAR RETORNO - Usuario vuelve a un agente
    if (resultado.metadata.returningToAurora) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 👋 Usuario retorna a Aurora desde otro agente');
      }
      
      try {
        // Enviar mensaje de despedida del agente anterior
        const agenteAnterior = profile.activeAgent;
          
          if (agenteAnterior && agenteAnterior !== 'AURORA') {
            const { AGENTES } = await import('../../deteccion-intenciones/orquestador.js');
            const agenteObj = AGENTES[agenteAnterior];
            
            if (agenteObj && agenteObj.mensajes?.despedida) {
              if (process.env.DEBUG_MODE === 'true') {
                console.log('[WASSENGER] 👋 Enviando despedida de:', agenteObj.nombre);
              }
              
              const despedidaResult = await enviarWhatsApp(userId, agenteObj.mensajes.despedida);
              
              if (despedidaResult.ok) {
                await saveConversationMessage(userId, {
                  role: 'assistant',
                  content: agenteObj.mensajes.despedida,
                  agent: agenteObj.nombre
                });

                // Delay de 5 segundos
                if (process.env.DEBUG_MODE === 'true') {
                  console.log('[WASSENGER] ⏳ Esperando 5 segundos antes de entrada de Aurora...');
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
              } else {
                console.warn('[WASSENGER] ⚠️ No se pudo enviar despedida:', despedidaResult.error);
              }
            }
          }

          // Actualizar agente activo a Aurora
          await saveProfile(userId, {
            activeAgent: 'AURORA'
          });
          
          if (process.env.DEBUG_MODE === 'true') {
            console.log('[WASSENGER] ✅ Agente activo actualizado a: AURORA');
          }

          // Aurora responde con su mensaje de entrada (siempre AURORA aquí)
          reply = await complete(resultado.prompt, {
            temperature: 0.4,
            max_tokens: 300,
            system: resultado.systemPrompt
          });
          
        } catch (returnError) {
          console.error('[WASSENGER] ❌ Error durante retorno a Aurora:', returnError);
          
          // Forzar actualización a Aurora y continuar
          await saveProfile(userId, {
            activeAgent: 'AURORA'
          });
          
          // Aurora responde normalmente (siempre AURORA en catch)
          reply = await complete(resultado.prompt, {
            temperature: 0.4,
            max_tokens: 300,
            system: resultado.systemPrompt
          });
        }
      }
    
    // 🎯 Flujo normal - Generar respuesta con el agente activo
    if (!reply) {
      // Solo generar respuesta si no se generó en el bloque de returningToAurora
      console.log(`[WASSENGER] 🔍 DEBUGGING PROMPT - Contexto enviado a OpenAI:`, {
        promptIncluyeNombre: resultado.prompt.includes(profile.name || 'SIN_NOMBRE'),
        perfilNombre: profile.name,
        esCancelacion: resultado.metadata.cancelacion,
        firstVisit: profile.firstVisit,
        freeTrialUsed: profile.freeTrialUsed
      });

      // 🎯 Configuración según agente activo
      const activeAgent = profile.activeAgent || 'AURORA';
      const isSpecializedAgent = ['ENZO', 'ADRIANA', 'ALUNA'].includes(activeAgent);
      
      console.log(`[WASSENGER] 🤖 LLAMANDO A OPENAI - activeAgent: ${activeAgent}, isSpecialized: ${isSpecializedAgent}`);
      
      reply = await complete(resultado.prompt, {
        temperature: isSpecializedAgent ? 0.7 : 0.4,  // Agentes especializados más creativos
        max_tokens: isSpecializedAgent ? 800 : 300,   // Agentes especializados sin límites
        system: resultado.systemPrompt
      });
      
      console.log(`[WASSENGER] ✅ RESPUESTA DE OPENAI RECIBIDA - length: ${reply?.length || 0}`);
    } else {
      console.log(`[WASSENGER] ⏭️ SKIP OPENAI - reply ya existe, length: ${reply?.length || 0}`);
    }

    // 💳 BYPASS DESHABILITADO - Aurora maneja el flujo completo con confirmación
    // El bypass causaba: 1) Skip de confirmación, 2) No cálculo de precio, 3) No muestra opciones de pago
    // Mantener este código comentado - Aurora ahora gestiona reservas de principio a fin
    /*
    const paymentCheck = shouldSendPaymentLink(text, profile);
    if (paymentCheck && resultado.agenteKey === 'AURORA') {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 💳 Usuario recurrente eligió espacio:', paymentCheck.serviceType);
        console.log('[WASSENGER] 💳 Enviando link de pago automáticamente');
      }
      reply = paymentCheck.message;
      
      // Guardar en perfil que está esperando comprobante
      profile.awaitingPaymentReceipt = {
        serviceType: paymentCheck.serviceType,
        price: paymentCheck.price,
        timestamp: new Date().toISOString()
      };
      await saveProfile(userId, profile); // FIX: Pasar userId correctamente
    }
    */

    // 🎯 Agregar mensaje de upsell si aplica (ANTES de Aurora response)
    if (upsellMessage && !campaignCheck.detected && !paymentCheck) {
      reply = `${reply}\n\n${upsellMessage}`;
    }

    // 🔄 PROCESAR POSIBLES CONFIRMACIONES DE AURORA
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[WASSENGER] 🔍 Antes de finalReply - reply:', reply ? 'EXISTE' : 'NULL/UNDEFINED');
    }
    let finalReply = reply;
    let confirmationActivated = false;
    
    if (resultado.agenteKey === 'AURORA') {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🔍 Llamando enhanceAuroraResponse con reply de length:', reply?.length || 0);
        console.log('[WASSENGER] 🔍 Pasando formResult al enhancement:', formResult ? 'DISPONIBLE' : 'NO DISPONIBLE');
      }
      const enhancement = await enhanceAuroraResponse(reply, profile, formResult);
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🔍 enhanceAuroraResponse completado - enhanced:', enhancement.enhanced);
      }
      
      if (enhancement.enhanced) {
        finalReply = enhancement.finalMessage;
        confirmationActivated = true;
        if (process.env.DEBUG_MODE === 'true') {
          console.log('[WASSENGER] ✅ Aurora activó sistema de confirmación');
        }
      } else {
        // Si no hubo enhancement, usar la respuesta original de Aurora
        finalReply = reply;
      }
    } else {
      // Otros agentes usan su respuesta directamente
      finalReply = reply;
    }

    // 🆕 Guardar respuesta del asistente en historial
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[WASSENGER] 💾 Guardando mensaje en historial - finalReply length:', finalReply?.length || 0);
    }
    await saveConversationMessage(userId, {
      role: 'assistant',
      content: finalReply,
      agent: resultado.agente
    });
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[WASSENGER] ✅ Mensaje guardado en historial');
    }

    // 🔧 MARCAR PRIMERA VISITA COMO COMPLETADA después de respuesta de Aurora
    if (resultado.agenteKey === 'AURORA' && profile.firstVisit === true) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🎯 Marcando primera visita como completada para:', userId);
        console.log('[WASSENGER] 📊 Perfil antes del cambio:', JSON.stringify(profile, null, 2));
      }
      
      const updatedProfile = {
        ...profile,
        firstVisit: false // ✅ Ya no es primera visita después de que Aurora responda
        // conversationCount ya se incrementó en línea 876, no duplicar
      };
      
      await saveProfile(userId, updatedProfile);
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] ✅ Perfil actualizado con firstVisit: false');
      }
      
      // Verificar que se guardó correctamente
      const verifiedProfile = await loadProfile(userId);
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] 🔍 Perfil verificado después del guardado:', verifiedProfile.firstVisit);
      }
    }

    // Guardar interacción
    saveInteraction({
      userId,
      agent: resultado.agenteKey,
      agentName: resultado.agente,
      intentReason: resultado.razonSeleccion,
      input: text,
      output: finalReply,
      meta: { 
        route: '/webhooks/wassenger',
        via: 'whatsapp',
        rol: resultado.metadata.rol,
        freeTrialUsed: profile.freeTrialUsed,
        conversationCount: profile.conversationCount,
        confirmationActivated: confirmationActivated,
        replyContext: getReplyContextMetadata(replyContext)
      }
    });

    // Enviar respuesta a WhatsApp
    if (process.env.DEBUG_MODE === 'true') {
      console.log('[WASSENGER] 📤 Enviando mensaje a WhatsApp - finalReply:', finalReply ? 'EXISTE' : 'NULL/UNDEFINED', '- Length:', finalReply?.length || 0);
    }
    const envio = await enviarWhatsApp(userId, finalReply);

    if (process.env.DEBUG_MODE === 'true') {
      console.log('[WASSENGER] 📬 Resultado del envío - ok:', envio.ok);
    }
    if (!envio.ok) {
      console.error('[WASSENGER] ❌ Error al enviar respuesta:', envio.error);
    } else {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('[WASSENGER] ✅ Mensaje enviado correctamente');
      }
    }

    // Responder al webhook (ACK)
    return res.json({ 
      ok: true, 
      agent: resultado.agente,
      messageSent: envio.ok,
      reply: finalReply,
      confirmationActivated: confirmationActivated 
    });

  } catch (err) {
    console.error('[WASSENGER WEBHOOK] Error capturado:', err);
    console.error('[WASSENGER WEBHOOK] Stack:', err.stack);
    
    // Responder siempre 200 OK para que Wassenger no reintente
    return res.status(200).json({ 
      ok: false, 
      error: 'INTERNAL_ERROR', 
      message: err.message,
      handled: true 
    });
  }
});

/**
 * GET /webhooks/wassenger/status - Verificación de estado (sin auth)
 */
router.get('/webhooks/wassenger/status', (req, res) => {
  const wassengerEnabled = process.env.WASSENGER_ENABLED !== 'false';
  res.json({ 
    ok: true, 
    message: 'Wassenger Webhook activo',
    enabled: wassengerEnabled,
    status: wassengerEnabled ? '✅ ACTIVO' : '⏸️ PAUSADO',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /webhooks/wassenger - Verificación de webhook (para Wassenger)
 */
router.get('/webhooks/wassenger', (req, res) => {
  res.send('ok');
});

/**
 * POST /webhooks/wassenger/control - Activar/Desactivar Wassenger
 * Body: { "action": "enable" | "disable" }
 * Nota: Esto solo funciona si usas un comando de Heroku CLI para cambiar config vars
 */
router.post('/webhooks/wassenger/control', (req, res) => {
  return res.json({ 
    ok: false, 
    error: 'NOT_IMPLEMENTED',
    message: 'Use Heroku CLI para cambiar WASSENGER_ENABLED',
    help: {
      disable: 'heroku config:set WASSENGER_ENABLED=false --app coworkia-agent',
      enable: 'heroku config:set WASSENGER_ENABLED=true --app coworkia-agent',
      status: 'heroku config:get WASSENGER_ENABLED --app coworkia-agent'
    }
  });
});

export default router;
