import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockDb = {
  ensureInitialized: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};

jest.unstable_mockModule('../../src/database/database.js', () => ({
  default: mockDb,
}));

jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn(() => 'uuid-enzo-lead'),
}));

const { captureEnzoLeadFromKeywords } = await import('../../src/database/enzoRepository.js');

describe('captureEnzoLeadFromKeywords', () => {
  let originalAdminPhone;
  let originalDiegoPhone;
  let logSpy;
  let warnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    originalAdminPhone = process.env.ADMIN_PHONE;
    originalDiegoPhone = process.env.DIEGO_PERSONAL_PHONE;
    delete process.env.ADMIN_PHONE;
    delete process.env.DIEGO_PERSONAL_PHONE;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalAdminPhone === undefined) {
      delete process.env.ADMIN_PHONE;
    } else {
      process.env.ADMIN_PHONE = originalAdminPhone;
    }
    if (originalDiegoPhone === undefined) {
      delete process.env.DIEGO_PERSONAL_PHONE;
    } else {
      process.env.DIEGO_PERSONAL_PHONE = originalDiegoPhone;
    }
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('crea un lead Enzo sin email ficticio y sin guardar el mensaje crudo', async () => {
    mockDb.get.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id')) return null;
      if (sql.includes('INSERT INTO marketing_leads')) {
        return { id: 'uuid-enzo-lead', project_code: 'MKT-WS-ABC123DEF456' };
      }
      return null;
    });

    const result = await captureEnzoLeadFromKeywords(
      '+593 99 888 7777',
      'Laura Cliente',
      'Quiero marketing para mi clínica, mi correo es laura@example.com'
    );

    expect(result).toEqual({
      id: 'uuid-enzo-lead',
      projectCode: 'MKT-WS-ABC123DEF456',
      created: true,
    });

    const insertCall = mockDb.get.mock.calls.find(([sql]) => sql.includes('INSERT INTO marketing_leads'));
    expect(insertCall).toBeDefined();
    expect(insertCall[0]).toMatch(/ON CONFLICT \(project_code\) DO UPDATE/);

    const params = insertCall[1];
    expect(params[1]).toMatch(/^MKT-WS-[A-F0-9]{12}$/);
    expect(params[2]).toBe('+593 99 888 7777');
    expect(params[5]).toBe('Laura Cliente');
    expect(params[6]).toBeNull();
    expect(params[7]).toBe('+593 99 888 7777');
    expect(params[10]).toContain('Keywords: marketing');
    expect(params[10]).not.toContain('laura@example.com');
    expect(params.some(value => typeof value === 'string' && value.includes('wassenger+'))).toBe(false);

    const logs = logSpy.mock.calls.flat().join(' ');
    expect(logs).not.toContain('+593');
    expect(logs).not.toContain('Laura Cliente');
  });

  test('reintento del mismo usuario actualiza el lead existente sin insertar duplicado', async () => {
    mockDb.get.mockResolvedValueOnce({ id: 'lead-existente', project_code: 'MKT-001' });
    mockDb.run.mockResolvedValueOnce({ changes: 1 });

    const result = await captureEnzoLeadFromKeywords(
      '+593999000111',
      'Cliente',
      'Necesito un chatbot para captar leads'
    );

    expect(result).toEqual({ id: 'lead-existente', updated: true });
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE marketing_leads SET updated_at = CURRENT_TIMESTAMP/),
      ['+593999000111']
    );
    expect(mockDb.get).toHaveBeenCalledTimes(1);
  });

  test('ignora mensajes sin intención de servicio y teléfonos admin sin tocar la base', async () => {
    const noKeyword = await captureEnzoLeadFromKeywords('+593999000222', 'Cliente', 'gracias, ok');
    expect(noKeyword).toBeNull();

    process.env.ADMIN_PHONE = '+593999000222';
    const admin = await captureEnzoLeadFromKeywords('+593 999 000 222', 'Admin', 'quiero marketing');
    expect(admin).toBeNull();

    expect(mockDb.ensureInitialized).not.toHaveBeenCalled();
    expect(mockDb.get).not.toHaveBeenCalled();
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  test('un error del repositorio no rompe el flujo conversacional', async () => {
    mockDb.get.mockRejectedValueOnce(new Error('db unavailable'));

    const result = await captureEnzoLeadFromKeywords(
      '+593999000333',
      'Cliente',
      'Quiero automatización con IA'
    );

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      '[ENZO-CAPTURE] ⚠️ Error capturando lead (no crítico):',
      'db unavailable'
    );
  });
});
