import { jest } from '@jest/globals';

const enviarWhatsApp = jest.fn().mockResolvedValue({ ok: true });
const sendEmail = jest.fn().mockResolvedValue({ ok: true });
const buildEmailTemplate = jest.fn(() => '<html>Aurora test</html>');
const databaseService = {
  all: jest.fn(),
  run: jest.fn().mockResolvedValue({ rowCount: 1 }),
};
const findReservationsForOneHourFollowup = jest.fn();
const markFollowup1hSent = jest.fn().mockResolvedValue();
const findReservationsForRebookingReminder = jest.fn();
const markRebookReminderSent = jest.fn().mockResolvedValue();
const auroraLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

jest.unstable_mockModule('../../src/express-servidor/endpoints-api/wassenger.js', () => ({
  enviarWhatsApp,
}));

jest.unstable_mockModule('../../src/servicios/email.js', () => ({
  sendEmail,
}));

jest.unstable_mockModule('../../src/servicios/email-template-system.js', () => ({
  buildEmailTemplate,
}));

jest.unstable_mockModule('../../src/database/database.js', () => ({
  default: databaseService,
}));

jest.unstable_mockModule('../../src/database/auroraRepository.js', () => ({
  findReservationsForOneHourFollowup,
  markFollowup1hSent,
  findReservationsForRebookingReminder,
  markRebookReminderSent,
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  loggers: {
    aurora: auroraLogger,
  },
}));

const { ALUNA } = await import('../../src/deteccion-intenciones/aluna.js');
const { AURORA } = await import('../../src/deteccion-intenciones/aurora.js');
const { FREE_TRIALS, HOURS, LOCATION } = await import('../../src/utils/coworkia-facts.js');
const {
  sendOneHourFollowups,
  sendOneHourFollowup,
  sendAuroraReminder24h,
} = await import('../../src/servicios/aurora-followup-service.js');

const originalAdminPhone = process.env.ADMIN_PHONE;
const originalDiegoPhone = process.env.DIEGO_PERSONAL_PHONE;

const internalPhone = '+593999000001';
const clientPhone = '+593999000002';

function reservation(overrides = {}) {
  return {
    id: 701,
    user_phone: clientPhone,
    service_type: 'hot_desk',
    date: '2026-08-12',
    start_time: '09:00',
    end_time: '17:00',
    total_price: 10,
    user_name: 'Cliente Test',
    user_email: 'cliente@example.test',
    ...overrides,
  };
}

function minutesFromTime(value) {
  const normalized = value
    .replace(' AM', '')
    .replace(' PM', '')
    .trim();
  const [hour, minute] = normalized.split(':').map(Number);
  const isPm = value.includes('PM') && hour !== 12;
  return (isPm ? hour + 12 : hour) * 60 + minute;
}

function isWithinCanonicalHours(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const weekday = parts.weekday;
  const current = Number(parts.hour) * 60 + Number(parts.minute);
  const open = minutesFromTime(HOURS.open);
  const close = minutesFromTime(HOURS.close);

  return !['Sat', 'Sun'].includes(weekday) && current >= open && current < close;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ADMIN_PHONE = internalPhone;
  process.env.DIEGO_PERSONAL_PHONE = '+593999000099';
});

afterAll(() => {
  if (originalAdminPhone === undefined) delete process.env.ADMIN_PHONE;
  else process.env.ADMIN_PHONE = originalAdminPhone;

  if (originalDiegoPhone === undefined) delete process.env.DIEGO_PERSONAL_PHONE;
  else process.env.DIEGO_PERSONAL_PHONE = originalDiegoPhone;
});

describe('Lote 3 — Aluna prueba autonoma y Aurora facts', () => {
  test('Aluna coordina la prueba de dia completo sin handoff ni recepcion ficticia', () => {
    const prompt = ALUNA.getSystemPrompt(false, 'es');
    const askIndex = prompt.indexOf('pregunta qué día');
    const confirmIndex = prompt.indexOf('confirma el día acordado');

    expect(prompt).toContain(FREE_TRIALS.aluna.label);
    expect(prompt).toContain(FREE_TRIALS.aluna.scope);
    expect(prompt).toContain(HOURS.display);
    expect(prompt).toContain(LOCATION.address);
    expect(askIndex).toBeGreaterThan(-1);
    expect(confirmIndex).toBeGreaterThan(askIndex);
    expect(prompt).toContain('NO derives al cliente a Aurora');
    expect(prompt).toContain('NO inventes pasos ficticios');
    expect(prompt).toContain('Coworkia no tiene esos pasos');
    expect(prompt).not.toContain('Lunes a Viernes 8:00 AM – 7:00 PM');
  });

  test('Aurora expone horario canonico desde facts y descarta horarios antiguos', () => {
    const infoEs = AURORA.getServiciosInfo('es');
    const infoEn = AURORA.getServiciosInfo('en');
    const prompt = AURORA.getSystemPrompt(false, 'es');

    expect(infoEs.ubicacion).toContain(HOURS.display);
    expect(infoEn.ubicacion).toContain(HOURS.open);
    expect(infoEn.ubicacion).toContain(HOURS.close);
    expect(AURORA.serviciosInfo.ubicacion).toContain(HOURS.display);
    expect(AURORA.conocimiento.servicios.prueba.condicion).toContain(HOURS.display);
    expect(prompt).toContain(HOURS.display);

    const obsoleteHours = /08:00|8:00|12:00|19h|7pm|7:00 PM/i;
    expect(infoEs.ubicacion).not.toMatch(obsoleteHours);
    expect(infoEs.hotDesk.conPrimeraVisita).not.toMatch(obsoleteHours);
    expect(AURORA.serviciosInfo.ubicacion).not.toMatch(obsoleteHours);
  });

  test('los limites operativos se interpretan en zona Ecuador', () => {
    expect(isWithinCanonicalHours(new Date('2026-08-10T13:29:00Z'))).toBe(false); // lunes 08:29 EC
    expect(isWithinCanonicalHours(new Date('2026-08-10T13:30:00Z'))).toBe(true);  // lunes 08:30 EC
    expect(isWithinCanonicalHours(new Date('2026-08-10T22:59:00Z'))).toBe(true);  // lunes 17:59 EC
    expect(isWithinCanonicalHours(new Date('2026-08-10T23:00:00Z'))).toBe(false); // lunes 18:00 EC
    expect(isWithinCanonicalHours(new Date('2026-08-15T15:00:00Z'))).toBe(false); // sabado
    expect(isWithinCanonicalHours(new Date('2026-08-16T15:00:00Z'))).toBe(false); // domingo
  });
});

describe('Lote 3 — exclusion de contactos internos Aurora', () => {
  test('omite un interno en +1h antes de WhatsApp y lo marca para no reintentar', async () => {
    findReservationsForOneHourFollowup.mockResolvedValue([
      reservation({ id: 801, user_phone: internalPhone }),
    ]);

    const result = await sendOneHourFollowups();

    expect(result).toEqual({ success: true, sent: 0, errors: 0 });
    expect(enviarWhatsApp).not.toHaveBeenCalled();
    expect(markFollowup1hSent).toHaveBeenCalledWith(801);
    expect(auroraLogger.info.mock.calls.flat().join('\n')).toContain('contacto interno');
    expect(auroraLogger.info.mock.calls.flat().join('\n')).not.toContain(internalPhone);
  });

  test('no excluye un cliente legitimo con telefono distinto al interno', async () => {
    const clientReservation = reservation({ id: 802, user_phone: clientPhone });

    const result = await sendOneHourFollowup(clientReservation);

    expect(result).toBeUndefined();
    expect(enviarWhatsApp).toHaveBeenCalledWith(clientPhone, expect.any(String));
    expect(markFollowup1hSent).toHaveBeenCalledWith(802);
  });

  test('omite 24h interno antes de WhatsApp/email y registra el skip sin datos personales', async () => {
    databaseService.all.mockResolvedValueOnce([
      reservation({ id: 803, user_phone: internalPhone }),
    ]);

    const result = await sendAuroraReminder24h();

    expect(result).toEqual({ success: true, sent: 0, errors: 0 });
    expect(enviarWhatsApp).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(databaseService.run).toHaveBeenCalledWith(
      expect.stringContaining('reminder_24h_sent_at'),
      [803]
    );
    const logText = auroraLogger.info.mock.calls.flat().join('\n');
    expect(logText).toContain('contacto interno');
    expect(logText).not.toContain(internalPhone);
    expect(logText).not.toContain('cliente@example.test');
  });
});
