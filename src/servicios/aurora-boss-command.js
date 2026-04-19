/**
 * 📅 Aurora Boss Command — Reservar hot desk para cliente desde WhatsApp
 *
 * Diego escribe: "@aurora reserva hot desk mañana 10am para Juan Pérez juan@email.com 0991234567"
 * Aurora: crea reserva + envía email de confirmación + guarda en boss_quotes
 */

import { complete } from '../servicios-ia/openai.js';
import { sendEmail } from './email.js';
import { buildEmailTemplate } from './email-template-system.js';
import reservationRepository from '../database/reservationRepository.js';
import userRepository from '../database/userRepository.js';
import { normalizePhoneEC } from '../utils/validators.js';
import { getServiceLabel } from '../utils/service-labels.js';

/**
 * Detecta si el mensaje del jefe es un comando de reserva Aurora.
 * Requiere: keyword de reserva + fecha/hora + nombre o teléfono del cliente
 */
export function isAuroraBossCommand(mensaje) {
  if (!mensaje) return false;
  const text = mensaje.toLowerCase();
  const hasReservaKeyword = /reserv[ao]|agenda|book|hot\s?desk|escritorio|desk/i.test(text);
  const hasTimeRef = /ma[ñn]ana|hoy|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|\d{1,2}[:/h]\d{0,2}|\d{1,2}\s*(am|pm)|para\s+el\s+\d/i.test(text);
  return hasReservaKeyword && hasTimeRef;
}

/**
 * Parsea los datos del comando natural del jefe usando OpenAI.
 */
export async function parseAuroraReservationData(mensaje) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  const dayName = new Date().toLocaleDateString('es-EC', { weekday: 'long', timeZone: 'America/Guayaquil' });

  try {
    const raw = await complete(mensaje, {
      system: `Eres asistente de Coworkia (coworking en Quito). El CEO te envía un mensaje de WhatsApp para reservar un hot desk para un cliente. Hoy es ${dayName} ${today}. Extrae ÚNICAMENTE este JSON (sin markdown):
{
  "nombre": "nombre completo del cliente (si lo menciona, sino null)",
  "email": "email@ejemplo.com (si lo menciona, sino null)",
  "telefono": "número de teléfono (si lo menciona, sino null)",
  "fecha": "YYYY-MM-DD (interpreta 'mañana', 'hoy', 'lunes', etc.)",
  "horaInicio": "HH:MM (formato 24h, ej: 10:00, 14:30)",
  "duracion": 2,
  "serviceType": "hotDesk"
}
REGLAS:
- Si no dice duración, asumir 2 horas (bloque mínimo)
- Si dice "sala" o "reunión" → serviceType = "meetingRoom"
- Si no especifica hora, usar "09:00"
- Fecha siempre en formato YYYY-MM-DD`,
      temperature: 0.1,
      max_tokens: 300,
      model: 'gpt-4o-mini',
    });
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[AURORA-BOSS] ❌ Error parseando datos:', err.message);
    return null;
  }
}

/**
 * Crea la reserva + envía email de confirmación.
 */
export async function executeAuroraBossReservation(data) {
  const { nombre, email, telefono, fecha, horaInicio, duracion = 2, serviceType = 'hotDesk' } = data;

  const phone = normalizePhoneEC(telefono);
  if (!fecha || !horaInicio) {
    return { success: false, error: 'Faltan fecha u hora' };
  }

  // Calcular hora fin
  const [h, m] = horaInicio.split(':').map(Number);
  const endH = h + duracion;
  const horaFin = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  // Calcular precio (base: $10 por bloque de 2h)
  const isHotDesk = serviceType === 'hotDesk';
  const basePrice = isHotDesk ? 10 : 29;
  const extraHours = Math.max(0, duracion - 2);
  const extraRate = isHotDesk ? 10 : 15;
  const totalPrice = basePrice + (extraHours * extraRate);

  try {
    // 1. Asegurar usuario existe
    if (phone) {
      const existing = await userRepository.findByPhone(phone);
      if (!existing) {
        await userRepository.create(phone, {
          name: nombre || null,
          email: email || null,
        });
      } else if (email && !existing.email) {
        await userRepository.update(phone, { email });
      }
    }

    // 2. Crear reserva
    const reservation = await reservationRepository.create({
      user_phone: phone || 'BOSS_DIRECT',
      service_type: serviceType,
      date: fecha,
      start_time: horaInicio,
      end_time: horaFin,
      duration_hours: duracion,
      total_price: totalPrice,
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'boss_direct',
    });

    // 3. Confirmar reserva
    if (reservation?.id) {
      await reservationRepository.update(reservation.id, {
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      });
    }

    // 4. Enviar email de confirmación
    let emailSent = false;
    if (email) {
      const serviceLabel = getServiceLabel(serviceType);
      const fechaDisplay = new Date(fecha + 'T12:00:00').toLocaleDateString('es-EC', {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Guayaquil'
      });
      const html = buildEmailTemplate('AURORA', 'CONFIRMATION', {
        nombre: nombre || 'Estimad@',
        servicio: serviceLabel,
        dia: fechaDisplay,
        hora: horaInicio,
        precio: `$${totalPrice}`,
      });
      const firstName = nombre ? nombre.split(' ')[0] : '';
      const emailResult = await sendEmail({
        to: email,
        subject: `¡Reserva Confirmada${firstName ? ` para ${firstName}` : ''}! 🎉 — Coworkia`,
        html,
        agent: 'aurora',
      });
      emailSent = emailResult.success;
    }

    return {
      success: true,
      reservationId: reservation?.id,
      nombre,
      email,
      telefono: phone,
      fecha,
      horaInicio,
      horaFin,
      duracion,
      totalPrice,
      serviceType,
      emailSent,
    };
  } catch (err) {
    console.error('[AURORA-BOSS] ❌ Error creando reserva:', err.message);
    return { success: false, error: err.message };
  }
}
