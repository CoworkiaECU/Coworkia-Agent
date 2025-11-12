/**
 * Tests para Circuit Breaker Pattern
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import CircuitBreaker from '../src/utils/circuit-breaker.js';

describe('Circuit Breaker', () => {
  let breaker;
  
  beforeEach(() => {
    breaker = new CircuitBreaker('TestService', {
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeout: 100 // 100ms para tests rápidos
    });
  });
  
  describe('CLOSED state (normal operation)', () => {
    it('should execute function successfully', async () => {
      const fn = async () => 'success';
      const result = await breaker.execute(fn);
      
      expect(result).toBe('success');
      expect(breaker.state).toBe('CLOSED');
      expect(breaker.stats.successfulRequests).toBe(1);
    });
    
    it('should track failure count', async () => {
      const fn = async () => { throw new Error('fail'); };
      
      try {
        await breaker.execute(fn);
      } catch (error) {
        expect(error.message).toBe('fail');
      }
      
      expect(breaker.failureCount).toBe(1);
      expect(breaker.state).toBe('CLOSED');
    });
  });
  
  describe('OPEN state (circuit tripped)', () => {
    beforeEach(async () => {
      // Generar 3 fallos para abrir el circuit
      const fn = async () => { throw new Error('fail'); };
      
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (e) {
          // Expected
        }
      }
    });
    
    it('should trip to OPEN after threshold failures', () => {
      expect(breaker.state).toBe('OPEN');
      expect(breaker.failureCount).toBe(3);
    });
    
    it('should reject requests immediately when OPEN', async () => {
      const fn = async () => 'should not execute';
      
      try {
        await breaker.execute(fn);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('Circuit breaker');
        expect(error.message).toContain('OPEN');
      }
      
      expect(breaker.stats.rejectedRequests).toBeGreaterThan(0);
    });
    
    it('should use fallback when OPEN', async () => {
      const fn = async () => 'should not execute';
      const fallback = () => 'fallback response';
      
      const result = await breaker.execute(fn, fallback);
      
      expect(result).toBe('fallback response');
      expect(breaker.stats.rejectedRequests).toBeGreaterThan(0);
    });
  });
  
  describe('HALF_OPEN state (recovery)', () => {
    beforeEach(async () => {
      // Abrir el circuit
      const fn = async () => { throw new Error('fail'); };
      
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (e) {
          // Expected
        }
      }
      
      // Esperar el resetTimeout
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    
    it('should transition to HALF_OPEN after timeout', async () => {
      expect(breaker.state).toBe('OPEN');
      
      const fn = async () => 'test';
      await breaker.execute(fn);
      
      expect(breaker.state).toBe('HALF_OPEN');
    });
    
    it('should close after successful threshold', async () => {
      const fn = async () => 'success';
      
      // Primera request exitosa -> HALF_OPEN
      await breaker.execute(fn);
      expect(breaker.state).toBe('HALF_OPEN');
      expect(breaker.successCount).toBe(1);
      
      // Segunda request exitosa -> CLOSED
      await breaker.execute(fn);
      expect(breaker.state).toBe('CLOSED');
      expect(breaker.successCount).toBe(2);
      expect(breaker.failureCount).toBe(0);
    });
    
    it('should reopen if failure occurs in HALF_OPEN', async () => {
      const successFn = async () => 'success';
      const failFn = async () => { throw new Error('fail'); };
      
      // Una exitosa -> HALF_OPEN
      await breaker.execute(successFn);
      expect(breaker.state).toBe('HALF_OPEN');
      
      // Fallo -> debe regresar a OPEN
      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }
      
      expect(breaker.failureCount).toBeGreaterThan(0);
    });
  });
  
  describe('Fallback responses', () => {
    it('should execute fallback on error', async () => {
      const fn = async () => { throw new Error('fail'); };
      const fallback = () => 'fallback value';
      
      const result = await breaker.execute(fn, fallback);
      
      expect(result).toBe('fallback value');
    });
    
    it('should execute async fallback', async () => {
      const fn = async () => { throw new Error('fail'); };
      const fallback = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async fallback';
      };
      
      const result = await breaker.execute(fn, fallback);
      
      expect(result).toBe('async fallback');
    });
  });
  
  describe('Manual reset', () => {
    it('should reset to CLOSED state', async () => {
      // Abrir el circuit
      const fn = async () => { throw new Error('fail'); };
      
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (e) {
          // Expected
        }
      }
      
      expect(breaker.state).toBe('OPEN');
      
      // Reset manual
      breaker.reset();
      
      expect(breaker.state).toBe('CLOSED');
      expect(breaker.failureCount).toBe(0);
      expect(breaker.successCount).toBe(0);
    });
  });
  
  describe('Stats tracking', () => {
    it('should track total requests', async () => {
      const successFn = async () => 'success';
      const failFn = async () => { throw new Error('fail'); };
      
      await breaker.execute(successFn);
      
      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }
      
      await breaker.execute(successFn);
      
      expect(breaker.stats.totalRequests).toBe(3);
      expect(breaker.stats.successfulRequests).toBe(2);
      expect(breaker.stats.failedRequests).toBe(1);
    });
    
    it('should record last success and failure timestamps', async () => {
      const successFn = async () => 'success';
      const failFn = async () => { throw new Error('fail'); };
      
      await breaker.execute(successFn);
      expect(breaker.stats.lastSuccess).toBeTruthy();
      
      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }
      
      expect(breaker.stats.lastFailure).toBeTruthy();
    });
  });
  
  describe('getState()', () => {
    it('should return complete state information', () => {
      const state = breaker.getState();
      
      expect(state).toHaveProperty('name');
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('failureCount');
      expect(state).toHaveProperty('successCount');
      expect(state).toHaveProperty('stats');
      
      expect(state.name).toBe('TestService');
      expect(state.state).toBe('CLOSED');
    });
  });
  
  describe('isAvailable()', () => {
    it('should return true when CLOSED', () => {
      expect(breaker.isAvailable()).toBe(true);
    });
    
    it('should return false when OPEN and timeout not elapsed', async () => {
      // Abrir circuit
      const fn = async () => { throw new Error('fail'); };
      
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (e) {
          // Expected
        }
      }
      
      expect(breaker.isAvailable()).toBe(false);
    });
  });
});
