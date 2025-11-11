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
    
    // Arrancar servidor después de DB
    app.listen(PORT, () => {
      console.log(`> Coworkia Agent listo en http://localhost:${PORT}`);
      console.log(`> SQLite Database: ${process.env.DATABASE_URL || './data/coworkia.db'}`);
    });
    
  } catch (error) {
    console.error('💥 Error inicializando aplicación:', error);
    process.exit(1);
  }
}

// Iniciar la aplicación
startServer();
