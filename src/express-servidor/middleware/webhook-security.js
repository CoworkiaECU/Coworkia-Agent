// src/express-servidor/middleware/webhook-security.js
import crypto from 'crypto';

/**
 * 🔒 Middleware para validar firma HMAC de webhooks
 * Previene requests no autorizados al webhook
 */
export function validateWebhookSignature(req, res, next) {
  // 🚨 TEMPORALMENTE DESHABILITADO - Wassenger no envía firma HMAC compatible
  console.log('[WEBHOOK-SECURITY] 🔓 Validación HMAC deshabilitada temporalmente');
  return next();

  /* CÓDIGO ORIGINAL - REACTIVAR CUANDO WASSENGER TENGA FIRMA HMAC
  // Solo aplicar en producción
  if (process.env.NODE_ENV !== 'production') {
    console.log('[WEBHOOK-SECURITY] 🔓 Modo desarrollo - validación HMAC desactivada');
    return next();
  }

  const webhookSecret = process.env.WASSENGER_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('[WEBHOOK-SECURITY] ⚠️ WASSENGER_WEBHOOK_SECRET no configurado');
    return next(); // Permitir en caso de no estar configurado (backward compatibility)
  }

  const signature = req.headers['x-webhook-signature'] || req.headers['x-hub-signature'];
  
  if (!signature) {
    console.error('[WEBHOOK-SECURITY] ❌ Request sin firma HMAC');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Missing signature'
    });
  }*/

  /* CÓDIGO COMENTADO TEMPORALMENTE
  try {
    // Generar HMAC del body
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const body = JSON.stringify(req.body);
    hmac.update(body);
    const expectedSignature = 'sha256=' + hmac.digest('hex');

    // Comparación segura contra timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('[WEBHOOK-SECURITY] ❌ Firma HMAC inválida');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid signature'
      });
    }

    console.log('[WEBHOOK-SECURITY] ✅ Firma HMAC válida');
    next();
  } catch (error) {
    console.error('[WEBHOOK-SECURITY] ❌ Error validando firma:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
  */
}

/**
 * 🛡️ Rate limiting por número de teléfono
 */
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 10;

export function rateLimitByPhone(req, res, next) {
  const phoneNumber = req.body?.data?.from || req.body?.from;
  
  if (!phoneNumber) {
    return next(); // Si no hay teléfono, dejar pasar
  }

  const now = Date.now();
  const userRequests = rateLimitStore.get(phoneNumber) || [];
  
  // Filtrar requests dentro de la ventana de tiempo
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(`[RATE-LIMIT] ⚠️ Usuario ${phoneNumber} excedió límite: ${recentRequests.length} requests en 1min`);
    return res.status(429).json({
      success: false,
      error: 'Too many requests - Please slow down'
    });
  }
  
  // Agregar request actual
  recentRequests.push(now);
  rateLimitStore.set(phoneNumber, recentRequests);
  
  // Limpiar store cada 5 minutos
  if (Math.random() < 0.01) { // 1% de probabilidad
    cleanupRateLimitStore();
  }
  
  next();
}

/**
 * 🧹 Limpia entradas viejas del rate limit store
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [phone, timestamps] of rateLimitStore.entries()) {
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (recent.length === 0) {
      rateLimitStore.delete(phone);
      cleaned++;
    } else {
      rateLimitStore.set(phone, recent);
    }
  }
  
  if (cleaned > 0) {
    console.log(`[RATE-LIMIT] 🧹 Limpiados ${cleaned} usuarios del store`);
  }
}
