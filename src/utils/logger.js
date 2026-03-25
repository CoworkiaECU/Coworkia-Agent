/**
 * 📊 SISTEMA DE LOGGING ESTRUCTURADO
 * Logging centralizado con niveles, contexto y formato consistente
 * Optimizado para Heroku logs y debugging en producción
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];

/**
 * Formatea timestamp en formato legible
 */
function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Formatea contexto estructurado
 */
function formatContext(context = {}) {
  const parts = [];
  
  if (context.userId) parts.push(`user=${context.userId}`);
  if (context.agent) parts.push(`agent=${context.agent}`);
  if (context.action) parts.push(`action=${context.action}`);
  if (context.requestId) parts.push(`req=${context.requestId}`);
  if (context.duration) parts.push(`duration=${context.duration}ms`);
  
  return parts.length > 0 ? `[${parts.join(' ')}]` : '';
}

/**
 * Función base de logging
 */
function log(level, module, message, context = {}, error = null) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
  
  const timestamp = formatTimestamp();
  const contextStr = formatContext(context);
  const emoji = {
    DEBUG: '🔍',
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌'
  }[level];
  
  // Formato: [TIMESTAMP] EMOJI [LEVEL] [MODULE] contextStr message
  let logLine = `[${timestamp}] ${emoji} [${level}] [${module}]`;
  if (contextStr) logLine += ` ${contextStr}`;
  logLine += ` ${message}`;
  
  // Output según nivel
  if (level === 'ERROR') {
    console.error(logLine);
    if (error) {
      console.error('Error details:', error);
      if (error.stack) console.error('Stack:', error.stack);
    }
  } else if (level === 'WARN') {
    console.warn(logLine);
  } else {
    console.log(logLine);
  }
  
  // Metadata adicional en modo DEBUG
  if (level === 'DEBUG' && Object.keys(context).length > 0) {
    console.log('Context:', JSON.stringify(context, null, 2));
  }
}

/**
 * Logger class con métodos convenientes
 */
class Logger {
  constructor(module) {
    this.module = module;
  }
  
  debug(message, context = {}) {
    log('DEBUG', this.module, message, context);
  }
  
  info(message, context = {}) {
    log('INFO', this.module, message, context);
  }
  
  warn(message, context = {}, error = null) {
    log('WARN', this.module, message, context, error);
  }
  
  error(message, context = {}, error = null) {
    log('ERROR', this.module, message, context, error);
  }
  
  /**
   * Log de timing para medir performance
   */
  timing(action, duration, context = {}) {
    const emoji = duration > 5000 ? '🐌' : duration > 2000 ? '⏱️' : '⚡';
    this.info(`${emoji} ${action} completed`, { ...context, duration });
  }
  
  /**
   * Log de handoff entre agentes
   */
  handoff(fromAgent, toAgent, userId, reason) {
    this.info(`🤝 Handoff: ${fromAgent} → ${toAgent}`, {
      userId,
      action: 'handoff',
      fromAgent,
      toAgent,
      reason
    });
  }
  
  /**
   * Log de mensaje de usuario procesado
   */
  userMessage(userId, agent, messagePreview) {
    this.info(`💬 User message`, {
      userId,
      agent,
      action: 'process_message',
      preview: messagePreview.substring(0, 50)
    });
  }
  
  /**
   * Log de respuesta enviada
   */
  agentResponse(userId, agent, success) {
    const emoji = success ? '✅' : '❌';
    this.info(`${emoji} Agent response sent`, {
      userId,
      agent,
      action: 'send_response',
      success
    });
  }
}

/**
 * Factory para crear loggers
 */
export function createLogger(module) {
  return new Logger(module);
}

/**
 * Loggers pre-configurados para módulos comunes
 */
export const loggers = {
  webhook: createLogger('WEBHOOK'),
  orquestador: createLogger('ORQUESTADOR'),
  openai: createLogger('OPENAI'),
  database: createLogger('DATABASE'),
  axel: createLogger('AXEL'),
  aurora: createLogger('AURORA'),
  adriana: createLogger('ADRIANA'),
  wassenger: createLogger('WASSENGER')
};

export default createLogger;
