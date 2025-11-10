import { Router } from 'express';
import { testEmailConfiguration } from '../../servicios/email.js';

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

export default router;
