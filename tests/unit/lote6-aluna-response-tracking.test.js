import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';

const databaseService = {
  ensureInitialized: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};
const query = jest.fn();
const enviarWhatsApp = jest.fn().mockResolvedValue({ ok: true });
const sendEmail = jest.fn().mockResolvedValue({ success: true });
const getUserPreferredLanguage = jest.fn().mockResolvedValue('es');
const buildEmailTemplate = jest.fn(() => '<html>template</html>');
const alunaLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

let d3Rows = [];

jest.unstable_mockModule('../../src/database/database.js', () => ({
  default: databaseService,
  query,
}));

jest.unstable_mockModule('../../src/express-servidor/endpoints-api/wassenger.js', () => ({
  enviarWhatsApp,
}));

jest.unstable_mockModule('../../src/servicios/email.js', () => ({
  sendEmail,
}));

jest.unstable_mockModule('../../src/servicios/email-template-system.js', () => ({
  buildEmailTemplate,
}));

jest.unstable_mockModule('../../src/perfiles-interacciones/memoria-sqlite.js', () => ({
  getUserPreferredLanguage,
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  loggers: {
    aluna: alunaLogger,
  },
}));

const {
  markAlunaMembershipLeadClientResponse,
} = await import('../../src/database/alunaRepository.js');
const {
  shouldTrackAlunaFollowupReply,
  trackAlunaFollowupReply,
} = await import('../../src/servicios/aluna-response-tracking.js');
const { sendD3Followups } = await import('../../src/servicios/aluna-followup-service.js');

const clientPhone = '+593990000002';
const internalPhone = '+593990000099';

function lead(overrides = {}) {
  return {
    id: 'ML-TEST-001',
    user_phone: clientPhone,
    phone: clientPhone,
    name: 'Cliente Demo',
    email: '',
    interest_type: 'plan10',
    mensualidad: 140,
    created_at: '2026-08-01T10:00:00.000Z',
    client_response_at: null,
    ...overrides,
  };
}

function setupQueryMocks() {
  query.mockImplementation(async (sql, params = []) => {
    const text = String(sql);
    if (text.includes('FROM membership_leads') && text.includes("INTERVAL '73 hours'")) {
      return { rows: d3Rows.filter((row) => row.client_response_at == null) };
    }
    if (text.includes('UPDATE membership_leads')) {
      return { rowCount: 1, params };
    }
    return { rows: [], rowCount: 0 };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  d3Rows = [];
  setupQueryMocks();
  process.env.ADMIN_PHONE = internalPhone;
  process.env.DIEGO_PERSONAL_PHONE = internalPhone;
  jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
    callback();
    return 0;
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.ADMIN_PHONE;
  delete process.env.DIEGO_PERSONAL_PHONE;
});

describe('Lote 6 - Aluna response tracking repository', () => {
  test('registra una respuesta elegible en membership_leads con una sola operacion atomica', async () => {
    databaseService.get.mockResolvedValueOnce({
      id: 'ML-TEST-001',
      client_response_at: '2026-08-10T10:00:00.000Z',
      client_whatsapp_reply: true,
      client_email_reply: false,
      last_interaction_at: '2026-08-10T10:00:00.000Z',
    });

    const result = await markAlunaMembershipLeadClientResponse(
      clientPhone,
      'whatsapp',
      'Me interesa continuar con el plan 10'
    );

    expect(result).toMatchObject({
      updated: true,
      leadId: 'ML-TEST-001',
      clientWhatsappReply: true,
    });
    expect(databaseService.get).toHaveBeenCalledTimes(1);

    const [sql, params] = databaseService.get.mock.calls[0];
    expect(sql).toContain('UPDATE membership_leads');
    expect(sql).toContain('followup_24h_sent_at IS NOT NULL');
    expect(sql).toContain('client_response_at IS NULL');
    expect(sql).toContain('ORDER BY followup_24h_sent_at DESC NULLS LAST, created_at DESC');
    expect(sql).toContain('LIMIT 1');
    expect(sql).toContain('RETURNING ml.id');
    expect(params[0]).toEqual(expect.arrayContaining([clientPhone, '593990000002']));
    expect(params[1]).toBe('whatsapp');
    expect(params[2]).toContain('Me interesa continuar con el plan 10');
  });

  test('es idempotente y no sobrescribe la primera client_response_at en reintentos', async () => {
    databaseService.get
      .mockResolvedValueOnce({
        id: 'ML-TEST-001',
        client_response_at: '2026-08-10T10:00:00.000Z',
        client_whatsapp_reply: true,
        client_email_reply: false,
        last_interaction_at: '2026-08-10T10:00:00.000Z',
      })
      .mockResolvedValueOnce(null);

    const first = await markAlunaMembershipLeadClientResponse(clientPhone, 'whatsapp', 'Primera respuesta');
    const duplicate = await markAlunaMembershipLeadClientResponse(clientPhone, 'whatsapp', 'Primera respuesta');

    expect(first).toMatchObject({ updated: true, clientResponseAt: '2026-08-10T10:00:00.000Z' });
    expect(duplicate).toEqual({ updated: false, reason: 'not_eligible' });
    expect(databaseService.get).toHaveBeenCalledTimes(2);
    expect(databaseService.get.mock.calls[1][0]).toContain('AND client_response_at IS NULL');
  });

  test('no marca leads sin followup_24h_sent_at ni leads inexistentes', async () => {
    databaseService.get.mockResolvedValue(null);

    const noD1 = await markAlunaMembershipLeadClientResponse(clientPhone, 'whatsapp', 'Respuesta sin D1');
    const missing = await markAlunaMembershipLeadClientResponse('+593990000003', 'whatsapp', 'Respuesta sin lead');

    expect(noD1).toEqual({ updated: false, reason: 'not_eligible' });
    expect(missing).toEqual({ updated: false, reason: 'not_eligible' });
    expect(databaseService.get.mock.calls[0][0]).toContain('followup_24h_sent_at IS NOT NULL');
  });
});

describe('Lote 6 - webhook tracking seam', () => {
  test('un mensaje normal invoca el helper correcto una sola vez y no envia comunicaciones', async () => {
    const markClientResponse = jest.fn().mockResolvedValue({ updated: true, leadId: 'ML-TEST-001' });
    const logger = { info: jest.fn(), warn: jest.fn() };

    const result = await trackAlunaFollowupReply({
      userId: clientPhone,
      messageText: 'Quiero avanzar con la membresia',
      markClientResponse,
      logger,
    });

    expect(result).toMatchObject({ updated: true, leadId: 'ML-TEST-001' });
    expect(markClientResponse).toHaveBeenCalledTimes(1);
    expect(markClientResponse).toHaveBeenCalledWith(
      clientPhone,
      'whatsapp',
      'Quiero avanzar con la membresia'
    );
    expect(logger.info).toHaveBeenCalledWith('[ALUNA-TRACKING] Respuesta de follow-up registrada');
    expect(enviarWhatsApp).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test('mensajes duplicados, fromMe o bot no invocan el helper', async () => {
    const markClientResponse = jest.fn();

    expect(shouldTrackAlunaFollowupReply({
      userId: clientPhone,
      messageText: 'hola',
      duplicate: true,
    })).toBe(false);

    const cases = [
      { duplicate: true },
      { fromMe: true },
      { bot: true },
    ];

    for (const flags of cases) {
      const result = await trackAlunaFollowupReply({
        userId: clientPhone,
        messageText: 'hola',
        markClientResponse,
        ...flags,
      });
      expect(result).toEqual({ updated: false, reason: 'skipped' });
    }

    expect(markClientResponse).not.toHaveBeenCalled();
  });

  test('un fallo del helper queda contenido y no tumba el webhook', async () => {
    const markClientResponse = jest.fn().mockRejectedValue(new Error('db unavailable'));
    const logger = { info: jest.fn(), warn: jest.fn() };

    const result = await trackAlunaFollowupReply({
      userId: clientPhone,
      messageText: 'respuesta valida',
      markClientResponse,
      logger,
    });

    expect(result).toEqual({ updated: false, reason: 'error', error: 'db unavailable' });
    expect(logger.warn).toHaveBeenCalledWith('[ALUNA-TRACKING] Error tracking respuesta:', 'db unavailable');
  });

  test('wassenger usa el seam y no referencia al namespace inexistente alunaRepository', () => {
    const source = readFileSync('src/express-servidor/endpoints-api/wassenger.js', 'utf8');

    expect(source).toContain('trackAlunaFollowupReply');
    expect(source).toContain('markAlunaMembershipLeadClientResponse');
    expect(source).not.toContain('alunaRepository.markAlunaClientResponse');
  });
});

describe('Lote 6 - D3 explicit response exclusion', () => {
  test('excluye de D3 un lead con client_response_at no nulo', async () => {
    d3Rows = [lead({ client_response_at: '2026-08-10T10:00:00.000Z' })];

    const result = await sendD3Followups();

    expect(result).toMatchObject({ success: true, sent: 0 });
    expect(enviarWhatsApp).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    const [sql] = query.mock.calls[0];
    expect(sql).toContain('client_response_at IS NULL');
  });

  test('permite D3 cuando client_response_at es nulo y las demas condiciones se cumplen', async () => {
    d3Rows = [lead({ id: 'ML-TEST-D3', client_response_at: null })];

    const result = await sendD3Followups();

    expect(result).toMatchObject({ success: true, sent: 1, errors: 0 });
    expect(enviarWhatsApp).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('followup_3d_sent_at = NOW()'), ['ML-TEST-D3']);
  });
});
