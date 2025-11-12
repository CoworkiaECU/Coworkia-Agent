// src/express-servidor/index.js
'use strict';

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

// 🗄️ Inicializar SQLite Database
import databaseService from '../database/database.js';

// 🕐 Scheduler para tareas programadas
import { initScheduler, stopScheduler, getSchedulerStatus } from '../servicios/cron-scheduler.js';

// 📊 Sistema de monitoreo
import { getAllCircuits } from '../servicios/external-dispatcher.js';
import { getQueueStats } from '../servicios/task-queue.js';

// Endpoints API
import healthRouter from './endpoints-api/health.js';
import aiRouter from './endpoints-api/ai.js';
import chatRouter from './endpoints-api/chat.js';
import agentRouter from './endpoints-api/agent.js';
import wassengerRouter from './endpoints-api/wassenger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANTES para Heroku / proxies (evita error X-Forwarded-For)
app.set('trust proxy', 1);

// Seguridad básica
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors());

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limit (seguro para proxy)
const limiter = rateLimit({
  windowMs: 60 * 1000,          // 1 minuto
  max: 90,                      // 90 req / minuto
  standardHeaders: true,
  legacyHeaders: false,
  // usar IP ya respetando 'trust proxy'
  keyGenerator: (req) => req.ip,
});
app.use(limiter);

// Healthchecks rápidos
app.get('/', (_req, res) => res.json({ ok: true, service: 'coworkia-agent', env: process.env.ENV || 'local' }));
app.get('/health', (_req, res) => res.json({ ok: true, ai: 'ready' }));
app.get('/health/db', async (_req, res) => {
  try {
    await databaseService.get('SELECT 1 as ok');
    res.json({ ok: true, db: 'ready' });
  } catch (error) {
    console.error('[HEALTH][DB] Error:', error);
    res.status(500).json({ ok: false, error: 'DB_UNAVAILABLE', message: error.message });
  }
});

// 📊 Sistema completo de salud
app.get('/health/system', async (_req, res) => {
  try {
    // 1. Circuit Breakers
    const circuits = getAllCircuits();
    
    // 2. Task Queues
    const queues = getQueueStats();
    
    // 3. Cron Jobs
    const scheduler = getSchedulerStatus();
    
    // 4. Database Metrics
    const [usersCount, reservationsCount, interactionsCount, pendingConfirmationsCount] = await Promise.all([
      databaseService.get('SELECT COUNT(*) as count FROM users'),
      databaseService.get('SELECT COUNT(*) as count FROM reservations'),
      databaseService.get('SELECT COUNT(*) as count FROM interactions'),
      databaseService.get('SELECT COUNT(*) as count FROM pending_confirmations')
    ]);
    
    // 5. Database Size (aproximación basada en row counts)
    const dbStats = {
      users: usersCount.count,
      reservations: reservationsCount.count,
      interactions: interactionsCount.count,
      pendingConfirmations: pendingConfirmationsCount.count,
      totalRecords: usersCount.count + reservationsCount.count + interactionsCount.count + pendingConfirmationsCount.count
    };
    
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown',
      
      circuitBreakers: {
        total: Object.keys(circuits).length,
        circuits: circuits
      },
      
      taskQueues: {
        total: Object.keys(queues).length,
        queues: queues
      },
      
      scheduler: {
        active: scheduler.active,
        jobs: scheduler.jobs
      },
      
      database: dbStats
    });
    
  } catch (error) {
    console.error('[HEALTH][SYSTEM] Error:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'SYSTEM_CHECK_FAILED', 
      message: error.message 
    });
  }
});

// Health para Wassenger (evita 404 en pruebas GET)
app.get('/webhooks/wassenger', (_req, res) => res.status(200).send('ok'));

// Rutas del proyecto
app.use('/', healthRouter);
app.use('/', aiRouter);
app.use('/', chatRouter);
app.use('/', agentRouter);
app.use('/', wassengerRouter);

// 404 final
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not Found' });
});

// 🚀 Inicializar base de datos antes de arrancar servidor
async function startServer() {
  try {
    console.log('🗄️ Inicializando base de datos SQLite...');
    await databaseService.initialize();
    console.log('✅ Base de datos SQLite inicializada correctamente');
    
    // Iniciar tareas programadas
    console.log('⏰ Iniciando tareas programadas...');
    initScheduler();
    
    // Arrancar servidor después de DB
    app.listen(PORT, () => {
      console.log(`> Coworkia Agent listo en http://localhost:${PORT}`);
      console.log(`> SQLite Database: ${process.env.DATABASE_URL || './data/coworkia.db'}`);
      console.log(`> Cron Jobs: ACTIVOS`);
    });
    
  } catch (error) {
    console.error('💥 Error inicializando aplicación:', error);
    process.exit(1);
  }
}

// Manejar shutdown graceful
process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal SIGTERM, cerrando...');
  stopScheduler();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal SIGINT, cerrando...');
  stopScheduler();
  process.exit(0);
});

// Iniciar la aplicación
startServer();
