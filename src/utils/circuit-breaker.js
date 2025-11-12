/**
 * 🛡️ Circuit Breaker Pattern
 * Protege el sistema de cascading failures cuando APIs externas fallan
 * 
 * Estados:
 * - CLOSED: Funcionamiento normal
 * - OPEN: Muchos fallos, no se hacen requests (fail fast)
 * - HALF_OPEN: Modo de prueba, intentando recuperarse
 */

const STATES = {
  CLOSED: 'CLOSED',       // Todo bien
  OPEN: 'OPEN',           // Demasiados fallos, cortocircuito activo
  HALF_OPEN: 'HALF_OPEN'  // Probando si ya se recuperó
};

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    
    // Configuración
    this.failureThreshold = options.failureThreshold || 5;        // Fallos antes de abrir
    this.successThreshold = options.successThreshold || 2;        // Éxitos para cerrar
    this.timeout = options.timeout || 60000;                      // Tiempo en OPEN (1 min)
    this.resetTimeout = options.resetTimeout || 30000;            // Tiempo antes de HALF_OPEN
    
    // Estado
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
    
    // Métricas
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      lastFailure: null,
      lastSuccess: null
    };
    
    console.log(`[Circuit Breaker] 🛡️ Inicializado: ${this.name}`);
  }
  
  /**
   * Ejecuta una función protegida por el circuit breaker
   */
  async execute(fn, fallback = null) {
    this.stats.totalRequests++;
    
    // Si está OPEN, rechazar inmediatamente
    if (this.state === STATES.OPEN) {
      if (Date.now() < this.nextAttempt) {
        this.stats.rejectedRequests++;
        console.log(`[Circuit Breaker] ⛔ ${this.name} está OPEN, rechazando request`);
        
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
      
      // Tiempo cumplido, intentar recuperación
      this.state = STATES.HALF_OPEN;
      this.successCount = 0;
      console.log(`[Circuit Breaker] 🔄 ${this.name} pasando a HALF_OPEN`);
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
      
    } catch (error) {
      this.onFailure();
      
      if (fallback) {
        console.log(`[Circuit Breaker] 🔄 ${this.name} usando fallback`);
        return fallback();
      }
      
      throw error;
    }
  }
  
  /**
   * Registra éxito
   */
  onSuccess() {
    this.failureCount = 0;
    this.stats.successfulRequests++;
    this.stats.lastSuccess = new Date().toISOString();
    
    if (this.state === STATES.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        this.state = STATES.CLOSED;
        console.log(`[Circuit Breaker] ✅ ${this.name} CERRADO (recuperado)`);
      }
    }
  }
  
  /**
   * Registra fallo
   */
  onFailure() {
    this.failureCount++;
    this.stats.failedRequests++;
    this.stats.lastFailure = new Date().toISOString();
    this.lastFailureTime = Date.now();
    
    console.log(`[Circuit Breaker] ⚠️ ${this.name} fallo ${this.failureCount}/${this.failureThreshold}`);
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = STATES.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeout;
      
      console.log(`[Circuit Breaker] 🔴 ${this.name} ABIERTO por ${this.resetTimeout}ms`);
    }
  }
  
  /**
   * Resetea el circuit breaker manualmente
   */
  reset() {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    console.log(`[Circuit Breaker] 🔄 ${this.name} reseteado manualmente`);
  }
  
  /**
   * Obtiene el estado actual
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      stats: this.stats,
      nextAttempt: this.state === STATES.OPEN ? new Date(this.nextAttempt).toISOString() : null
    };
  }
  
  /**
   * Verifica si está disponible para requests
   */
  isAvailable() {
    return this.state === STATES.CLOSED || 
           (this.state === STATES.HALF_OPEN && Date.now() >= this.nextAttempt);
  }
}

/**
 * 🎛️ Circuit Breaker Manager
 * Gestiona múltiples circuit breakers
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }
  
  /**
   * Crea o recupera un circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name);
  }
  
  /**
   * Obtiene estado de todos los breakers
   */
  getAllStates() {
    const states = {};
    this.breakers.forEach((breaker, name) => {
      states[name] = breaker.getState();
    });
    return states;
  }
  
  /**
   * Resetea todos los breakers
   */
  resetAll() {
    this.breakers.forEach(breaker => breaker.reset());
    console.log('[Circuit Breaker Manager] 🔄 Todos los breakers reseteados');
  }
  
  /**
   * Resetea un breaker específico
   */
  reset(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }
}

// Instancia global
const manager = new CircuitBreakerManager();

// Circuit breakers pre-configurados para servicios externos
export const openaiBreaker = manager.getBreaker('OpenAI', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 60000,
  resetTimeout: 30000
});

export const wassengerBreaker = manager.getBreaker('Wassenger', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  resetTimeout: 20000
});

export { CircuitBreaker, manager as circuitBreakerManager };
export default CircuitBreaker;
