// src/express-servidor/middleware/webhook-security.js
import crypto from 'crypto';

const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

/**
 * 🔒 Middleware para validar firma HMAC de webhooks
 * Previene requests no autorizados al webhook
 */
export function validateWebhookSignature(req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const webhookSecret = process.env.WASSENGER_WEBHOOK_SECRET;
  const sharedToken = process.env.WASSENGER_WEBHOOK_TOKEN || process.env.WASSENGER_TOKEN;

  // Desarrollo: validación opcional si no hay secreto
  if (!isProd && !webhookSecret && !sharedToken) {
    if (DEBUG_MODE) {
      console.log('[WEBHOOK-SECURITY] 🔓 Dev mode sin secreto - permitido');
    }
    return next();
  }

  // Producción: secreto requerido
  if (isProd && !webhookSecret && !sharedToken) {
    console.error('[WEBHOOK-SECURITY] ❌ Secreto no configurado en producción');
    return res.status(500).json({ success: false, error: 'Webhook secret not configured' });
  }

  const signatureHeader = req.headers['x-webhook-signature'] || req.headers['x-hub-signature'];

  // Validación HMAC (método preferido)
  if (webhookSecret && signatureHeader) {
    try {
      const body = JSON.stringify(req.body || {});
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(body);
      const expectedSignature = 'sha256=' + hmac.digest('hex');

      if (!timingSafeCompare(signatureHeader, expectedSignature)) {
        console.error('[WEBHOOK-SECURITY] ❌ Firma HMAC inválida');
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (DEBUG_MODE) {
        console.log('[WEBHOOK-SECURITY] ✅ Firma HMAC válida');
      }
      return next();
    } catch (error) {
      console.error('[WEBHOOK-SECURITY] ❌ Error validando firma:', error);
      return res.status(500).json({ success: false, error: 'Signature validation failed' });
    }
  }

  // Validación por token compartido (fallback)
  const tokenHeader = req.headers['x-wassenger-token'] || req.headers['x-webhook-secret'];
  if (sharedToken && tokenHeader) {
    if (!timingSafeCompare(tokenHeader, sharedToken)) {
      console.error('[WEBHOOK-SECURITY] ❌ Token inválido');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (DEBUG_MODE) {
      console.log('[WEBHOOK-SECURITY] ✅ Token válido');
    }
    return next();
  }

  // Sin credenciales válidas
  console.error('[WEBHOOK-SECURITY] ❌ Request sin credenciales');
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

function timingSafeCompare(input, expected) {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
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
    console.warn(`[RATE-LIMIT] ⚠️ Usuario ${phoneNumber} excedió límite: ${recentRequests.length} requests/min`);
    return res.status(429).json({
      success: false,
      error: 'Too many requests - Please slow down'
    });
  }
  
  // Agregar request actual
  recentRequests.push(now);
  rateLimitStore.set(phoneNumber, recentRequests);
  
  // Limpiar store periódicamente
  if (Math.random() < 0.01) {
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
  
  if (DEBUG_MODE && cleaned > 0) {
    console.log(`[RATE-LIMIT] 🧹 Limpiados ${cleaned} usuarios`);
  }
}
