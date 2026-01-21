import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

export const EMAIL_USER = process.env.EMAIL_USER || process.env.GMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS || process.env.GMAIL_PASS;
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail';
const DEBUG_EMAIL = process.env.DEBUG_EMAIL === 'true';

async function createTransporter() {
  console.log('[MAILER] 🔧 Inicializando transportador de email');
  console.log('[MAILER] - Usuario configurado:', EMAIL_USER ? '✅' : '❌');
  console.log('[MAILER] - Servicio:', EMAIL_SERVICE);

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('[MAILER] ❌ Configuración de email no encontrada. Emails no se enviarán.');
    return null;
  }

  try {
    const instance = nodemailer.createTransport({
      service: EMAIL_SERVICE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: DEBUG_EMAIL,
      logger: DEBUG_EMAIL
    });

    try {
      await instance.verify();
      console.log('[MAILER] ✅ Conexión SMTP verificada exitosamente');
    } catch (verifyError) {
      console.error('[MAILER] ❌ Error verificando conexión SMTP:', verifyError.message);
      console.error('[MAILER] 💡 Posibles soluciones:');
      console.error('  1. Usar App Password en lugar de contraseña normal');
      console.error('  2. Verificar que 2FA esté habilitado en Gmail');
      console.error('  3. Generar un App Password específico para esta aplicación');
      console.error('  4. Verificar que EMAIL_PASS sea el App Password, no la contraseña normal');
    }

    return instance;
  } catch (error) {
    console.error('[MAILER] ❌ Error creando transportador:', error);
    return null;
  }
}

let cachedTransporter = null;

export async function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = await createTransporter();
  }
  return cachedTransporter;
}

export const transporter = await getTransporter();
