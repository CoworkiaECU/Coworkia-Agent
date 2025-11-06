import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

export function applySecurity(app) {
  app.use(helmet());              // Headers de seguridad
  app.use(cors());                // CORS abierto por ahora (luego restringimos)
  app.use(morgan('dev'));         // Logs HTTP

  // Límite básico: 90 requests por 60s por IP
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 90,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}
