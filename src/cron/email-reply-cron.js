/**
 * 📬 email-reply-cron.js — Polling periódico de respuestas de clientes por email
 * 
 * Cada 10 minutos revisa Gmail IMAP por nuevas respuestas a emails del sistema.
 * Cada respuesta se enruta al agente correcto sin cruzar información.
 * 
 * Uso: startEmailReplyCron() desde index.js en el boot.
 */

import { CronJob } from 'cron';
import { pollEmailReplies } from '../servicios/email-reply-reader.js';

let emailReplyCronJob = null;

/**
 * Inicia el cron de polling de email replies (cada 10 minutos)
 */
export function startEmailReplyCron() {
  if (emailReplyCronJob) {
    console.log('[EMAIL-CRON] ⚠️ Cron ya estaba activo');
    return;
  }

  // Cada 10 minutos: '*/10 * * * *'
  emailReplyCronJob = new CronJob(
    '*/10 * * * *',
    async () => {
      try {
        await pollEmailReplies();
      } catch (error) {
        console.error('[EMAIL-CRON] ❌ Error en polling:', error.message);
      }
    },
    null,
    true,
    'America/Guayaquil'
  );

  console.log('[EMAIL-CRON] ✅ Polling de email replies configurado (cada 10 min)');
}

/**
 * Detiene el cron de email replies
 */
export function stopEmailReplyCron() {
  if (emailReplyCronJob) {
    emailReplyCronJob.stop();
    emailReplyCronJob = null;
    console.log('[EMAIL-CRON] 🛑 Cron detenido');
  }
}
