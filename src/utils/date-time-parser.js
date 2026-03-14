/**
 * 📅 PARSER DE FECHAS Y HORAS
 *
 * Funciones centralizadas para parsear fechas y horas en lenguaje natural.
 * Timezone-aware para Ecuador (America/Guayaquil, UTC-5).
 *
 * Usadas por: aurora-confirmation-helper.js, paula-confirmation-helper.js
 */

/**
 * 🕐 Normaliza formato de hora (11 am → 11:00, 1:30pm → 13:30)
 * @param {string} timeStr
 * @param {string} [defaultTime='09:00']
 * @returns {string} HH:MM en formato 24h
 */
export function normalizeTimeFormat(timeStr, defaultTime = '09:00') {
  if (!timeStr) return defaultTime;

  timeStr = timeStr.toLowerCase().trim();

  // Si ya está en formato HH:MM, retornar normalizado
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return timeStr.padStart(5, '0');
  }

  const match = timeStr.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
  if (!match) return defaultTime;

  let hour = parseInt(match[1]);
  let minutes = parseInt(match[2] || '0');
  const period = match[3] ? match[3].toLowerCase() : null;

  if (period === 'pm' && hour !== 12) {
    hour += 12;
  } else if (period === 'am' && hour === 12) {
    hour = 0;
  }

  if (hour > 23) hour = 23;
  if (minutes > 59) minutes = 0;

  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * 📅 Parsea fecha en lenguaje natural (timezone-aware para Ecuador)
 * Soporta: 'mañana', 'hoy', días de la semana, DD/MM/YYYY, DD-MM-YYYY
 * @param {string} dateStr
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function parseDate(dateStr) {
  const formatter = new Intl.DateTimeFormat('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year  = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day   = parts.find(p => p.type === 'day').value;
  const today = `${year}-${month}-${day}`;

  const todayDate    = new Date(`${year}-${month}-${day}T12:00:00-05:00`);
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowParts = formatter.formatToParts(tomorrowDate);
  const tomorrow = `${tomorrowParts.find(p => p.type === 'year').value}-${tomorrowParts.find(p => p.type === 'month').value}-${tomorrowParts.find(p => p.type === 'day').value}`;

  if (!dateStr) return tomorrow;

  // Términos relativos
  if (/mañana|manana/i.test(dateStr)) {
    console.log(`[PARSE-DATE] 🗓️ "mañana" → ${tomorrow}`);
    return tomorrow;
  }
  if (/\bhoy\b/i.test(dateStr)) {
    console.log(`[PARSE-DATE] 🗓️ "hoy" → ${today}`);
    return today;
  }

  // Días de la semana (0=domingo … 6=sábado)
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dayAliases = { miercoles: 3, sabado: 6 }; // sin tildes
  const lc = dateStr.toLowerCase().trim();

  let dayMatch = dayNames.findIndex(d => lc.includes(d));
  if (dayMatch === -1) {
    for (const [alias, idx] of Object.entries(dayAliases)) {
      if (lc.includes(alias)) { dayMatch = idx; break; }
    }
  }

  if (dayMatch !== -1) {
    let daysAhead = (dayMatch - todayDate.getDay() + 7) % 7;
    if (daysAhead === 0) daysAhead = 7; // Mismo día → próxima semana
    const targetDay = new Date(todayDate);
    targetDay.setDate(targetDay.getDate() + daysAhead);
    const tp = formatter.formatToParts(targetDay);
    const result = `${tp.find(p => p.type === 'year').value}-${tp.find(p => p.type === 'month').value}-${tp.find(p => p.type === 'day').value}`;
    console.log(`[PARSE-DATE] 🗓️ "${dateStr}" → ${result} (+${daysAhead}d)`);
    return result;
  }

  // Formato DD/MM/YYYY o DD-MM-YYYY
  const fmtMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (fmtMatch) {
    let [, d, m, y] = fmtMatch;
    if (y.length === 2) y = '20' + y;
    const date = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00-05:00`);
    const dp = formatter.formatToParts(date);
    const result = `${dp.find(p => p.type === 'year').value}-${dp.find(p => p.type === 'month').value}-${dp.find(p => p.type === 'day').value}`;
    console.log(`[PARSE-DATE] 🗓️ Fecha manual "${dateStr}" → ${result}`);
    return result;
  }

  console.log(`[PARSE-DATE] ⚠️ No reconocida "${dateStr}", fallback → ${tomorrow}`);
  return tomorrow;
}
