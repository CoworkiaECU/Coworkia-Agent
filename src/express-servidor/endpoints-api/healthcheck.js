/**
 * 💚 Healthcheck Endpoint para Heroku Eco Dynos
 * Previene que el dyno se duerma respondiendo a pings periódicos
 */

import express from 'express';

const router = express.Router();

// Estado del servidor
let serverStartTime = Date.now();
let requestCount = 0;
let lastRequestTime = Date.now();

/**
 * GET /health
 * Endpoint básico de healthcheck
 */
router.get('/health', (req, res) => {
  requestCount++;
  lastRequestTime = Date.now();
  
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  
  res.json({
    status: 'ok',
    uptime: uptime,
    uptimeFormatted: formatUptime(uptime),
    timestamp: new Date().toISOString(),
    requestCount: requestCount,
    lastRequest: new Date(lastRequestTime).toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || 'unknown'
  });
});

/**
 * GET /health/detailed
 * Healthcheck detallado con métricas adicionales
 */
router.get('/health/detailed', async (req, res) => {
  requestCount++;
  lastRequestTime = Date.now();
  
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  
  // Verificar conexión a PostgreSQL
  let dbStatus = 'unknown';
  let dbLatency = null;
  
  try {
    const dbStart = Date.now();
    const { default: database } = await import('../database/database.js');
    await database.initialize();
    await database.get('SELECT 1 as ping');
    dbLatency = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
    console.error('[HEALTH] Database check failed:', error.message);
  }
  
  // Verificar estado de circuit breakers
  let circuitBreakersStatus = {};
  try {
    const { circuitBreakerManager } = await import('../utils/circuit-breaker.js');
    circuitBreakersStatus = circuitBreakerManager.getAllStates();
  } catch (error) {
    console.error('[HEALTH] Circuit breakers check failed:', error.message);
  }
  
  res.json({
    status: 'ok',
    uptime: uptime,
    uptimeFormatted: formatUptime(uptime),
    timestamp: new Date().toISOString(),
    requestCount: requestCount,
    lastRequest: new Date(lastRequestTime).toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || 'unknown',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      unit: 'MB'
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatency
    },
    circuitBreakers: circuitBreakersStatus
  });
});

/**
 * GET /ping
 * Endpoint ultra-ligero para keep-alive
 */
router.get('/ping', (req, res) => {
  res.send('pong');
});

/**
 * Formatea uptime en formato legible
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

export default router;
