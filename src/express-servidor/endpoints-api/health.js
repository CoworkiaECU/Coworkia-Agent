import { Router } from 'express';
import { testEmailConfiguration } from '../../servicios/email.js';
import { circuitBreakerManager } from '../../utils/circuit-breaker.js';
import { getQueueStats } from '../../servicios/task-queue.js';
import reservationRepository from '../../database/reservationRepository.js';
import { getSchedulerStatus } from '../../servicios/cron-scheduler.js';

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

/**
 * 📊 Endpoint para monitorear colas y tareas pendientes
 * Muestra: task queues, reservas pending_payment, cron jobs
 */
router.get('/queues', async (req, res) => {
  try {
    console.log('[HEALTH-QUEUES] 📊 Obteniendo estado de colas y tareas...');
    
    // 1. Estado de task queues (inline ahora, pero útil para debugging)
    const queueStats = getQueueStats();
    
    // 2. Reservas pending_payment
    const pendingReservations = await reservationRepository.getPendingPaymentReservations();
    
    // Calcular tiempo de espera para cada reserva
    const now = Date.now();
    const reservationsWithWaitTime = pendingReservations.map(reservation => {
      const createdAt = new Date(reservation.created_at).getTime();
      const waitingMinutes = Math.floor((now - createdAt) / 1000 / 60);
      
      return {
        id: reservation.id,
        userId: reservation.user_id,
        date: reservation.date,
        startTime: reservation.start_time,
        serviceType: reservation.service_type,
        totalPrice: reservation.total_price,
        createdAt: reservation.created_at,
        waitingMinutes,
        isStale: waitingMinutes > 30 // Alerta si lleva >30min esperando pago
      };
    });
    
    // 3. Estado de cron jobs
    let cronStatus = { active: false, jobs: [] };
    try {
      const schedulerStatus = getSchedulerStatus();
      if (schedulerStatus && schedulerStatus.active > 0) {
        cronStatus = {
          active: true,
          jobCount: schedulerStatus.active,
          jobs: schedulerStatus.jobs.map(job => ({
            id: job.id,
            running: job.running,
            nextRun: job.nextRun || null
          }))
        };
      }
    } catch (cronError) {
      console.warn('[HEALTH-QUEUES] ⚠️ No se pudo obtener estado de cron:', cronError.message);
    }
    
    // 4. Detectar alertas
    const alerts = [];
    
    // Alerta: Reservas esperando pago >30min
    const staleReservations = reservationsWithWaitTime.filter(r => r.isStale);
    if (staleReservations.length > 0) {
      alerts.push({
        level: 'warning',
        type: 'stale_reservations',
        count: staleReservations.length,
        message: `${staleReservations.length} reserva(s) esperando pago >30min`,
        reservations: staleReservations.map(r => ({
          id: r.id,
          userId: r.userId,
          waitingMinutes: r.waitingMinutes
        }))
      });
    }
    
    // Alerta: Task queue con items pendientes (no debería pasar ahora que es inline)
    if (queueStats.totalPending > 0) {
      alerts.push({
        level: 'info',
        type: 'queue_pending',
        count: queueStats.totalPending,
        message: `${queueStats.totalPending} tarea(s) pendiente(s) en cola`
      });
    }
    
    // 5. Construir respuesta
    const response = {
      ok: true,
      timestamp: new Date().toISOString(),
      taskQueues: {
        total: queueStats.total,
        pending: queueStats.totalPending,
        running: queueStats.totalRunning,
        queues: queueStats.queues
      },
      pendingReservations: {
        total: reservationsWithWaitTime.length,
        stale: staleReservations.length,
        reservations: reservationsWithWaitTime
      },
      cronJobs: cronStatus,
      alerts: {
        count: alerts.length,
        items: alerts
      }
    };
    
    // Log de alertas críticas
    if (alerts.length > 0) {
      console.warn('[HEALTH-QUEUES] ⚠️ ALERTAS DETECTADAS:', alerts.length);
      alerts.forEach(alert => {
        console.warn(`[HEALTH-QUEUES] 📢 ${alert.level.toUpperCase()}: ${alert.message}`);
      });
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('[HEALTH-QUEUES] ❌ Error obteniendo estado de colas:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
