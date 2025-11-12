import { Router } from 'express';
import { testEmailConfiguration } from '../../servicios/email.js';
import { circuitBreakerManager } from '../../utils/circuit-breaker.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'coworkia-agent',
    version: '0.2.0',
    uptime: process.uptime(),
  });
});

/**
 * 📧 Endpoint para probar la configuración de email
 */
router.post('/test-email', async (req, res) => {
  console.log('[HEALTH] 🧪 Probando configuración de email...');
  
  try {
    const testResult = await testEmailConfiguration();
    
    if (testResult.success) {
      res.status(200).json({
        success: true,
        message: 'Configuración de email correcta',
        details: testResult
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error en configuración de email',
        error: testResult.error
      });
    }
  } catch (error) {
    console.error('[HEALTH] ❌ Error probando email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno probando email',
      error: error.message
    });
  }
});

/**
 * 📅 Endpoint para probar la configuración de Google Calendar
 */
router.post('/test-calendar', async (req, res) => {
  console.log('[HEALTH] 🧪 Probando configuración de Google Calendar...');
  
  try {
    const { testCalendarConnection } = await import('../../servicios/google-calendar.js');
    const testResult = await testCalendarConnection();
    
    if (testResult.success) {
      res.status(200).json({
        success: true,
        message: 'Configuración de Google Calendar correcta',
        details: testResult
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error en configuración de Google Calendar',
        error: testResult.error
      });
    }
  } catch (error) {
    console.error('[HEALTH] ❌ Error probando Google Calendar:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno probando Google Calendar',
      error: error.message
    });
  }
});

/**
 * 📅 Endpoint para probar creación de evento en Google Calendar
 */
router.post('/test-event', async (req, res) => {
  console.log('[HEALTH] 🧪 Probando creación de evento en Google Calendar...');
  
  try {
    const { createCalendarEvent } = await import('../../servicios/google-calendar.js');
    
    const testData = {
      userName: req.body.userName || 'Usuario Prueba',
      spaceType: req.body.spaceType || 'Hot Desk',
      date: req.body.date || new Date().toISOString().split('T')[0],
      startTime: req.body.startTime || '09:00',
      endTime: req.body.endTime || '17:00',
      acompanantes: req.body.acompanantes || [],
      whatsapp: req.body.whatsapp || 'test',
      isTest: true
    };
    
    const result = await createCalendarEvent(testData);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Evento de prueba creado exitosamente',
        eventData: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error creando evento de prueba',
        error: result.error
      });
    }
  } catch (error) {
    console.error('[HEALTH] ❌ Error probando creación de evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno probando evento',
      error: error.message
    });
  }
});

/**
 * 📧 Endpoint para probar el nuevo diseño del email
 */
router.post('/test-email-design', async (req, res) => {
  console.log('[HEALTH] 🎨 Probando nuevo diseño del email...');
  
  try {
    const { sendReservationConfirmation } = await import('../../servicios/email.js');
    
    const testData = {
      userName: req.body.userName || 'Diego Villota',
      email: req.body.email || 'yo@diegovillota.com',
      date: req.body.date || '2024-11-11',
      startTime: req.body.startTime || '09:00',
      endTime: req.body.endTime || '17:00',
      serviceType: req.body.serviceType || 'Hot Desk',
      durationHours: req.body.durationHours || 8,
      guestCount: req.body.guestCount || 2, // Acompañantes para test
      wasFree: req.body.wasFree !== undefined ? req.body.wasFree : true,
      totalPrice: req.body.totalPrice || 20,
      reservation: {
        id: 'test-' + Date.now(),
        whatsapp: '593987770788'
      }
    };
    
    const result = await sendReservationConfirmation(testData);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Email de prueba enviado exitosamente con nuevo diseño',
        emailData: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error enviando email de prueba',
        error: result.error
      });
    }
  } catch (error) {
    console.error('[HEALTH] ❌ Error probando email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno probando email',
      error: error.message
    });
  }
});

/**
 * 🛡️ Endpoint para monitorear circuit breakers
 */
router.get('/circuit-breakers', (req, res) => {
  const states = circuitBreakerManager.getAllStates();
  
  const summary = {
    total: Object.keys(states).length,
    healthy: 0,
    degraded: 0,
    failed: 0,
    breakers: states
  };
  
  Object.values(states).forEach(breaker => {
    if (breaker.state === 'CLOSED') summary.healthy++;
    else if (breaker.state === 'HALF_OPEN') summary.degraded++;
    else if (breaker.state === 'OPEN') summary.failed++;
  });
  
  res.status(200).json(summary);
});

/**
 * 🔄 Endpoint para resetear circuit breakers
 */
router.post('/circuit-breakers/reset', (req, res) => {
  const { name } = req.body;
  
  if (name) {
    circuitBreakerManager.reset(name);
    res.status(200).json({
      success: true,
      message: `Circuit breaker ${name} reseteado`
    });
  } else {
    circuitBreakerManager.resetAll();
    res.status(200).json({
      success: true,
      message: 'Todos los circuit breakers reseteados'
    });
  }
});

export default router;
