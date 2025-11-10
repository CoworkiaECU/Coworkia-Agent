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

export default router;
