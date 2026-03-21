/**
 * Tests — Adriana Form State Machine
 * Verifica las funciones de estado del formulario conversacional (adriana_quote_leads)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockRun = jest.fn().mockResolvedValue({ rowCount: 1 });
const mockGet = jest.fn().mockResolvedValue(null);

jest.unstable_mockModule('../../src/database/database.js', () => ({
  default: {
    ensureInitialized: jest.fn().mockResolvedValue(true),
    run: (...args) => mockRun(...args),
    get: (...args) => mockGet(...args),
  },
}));

// ── Subject (importado DESPUÉS de los mocks) ───────────────────────────────
const { getQuoteLead, upsertQuoteLead, updateQuoteLeadData, deleteQuoteLead } =
  await import('../../src/database/adrianaRepository.js');

// ── Tests ──────────────────────────────────────────────────────────────────

describe('getQuoteLead()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna null cuando no hay lead activo', async () => {
    mockGet.mockResolvedValueOnce(null);
    const result = await getQuoteLead('+593991234567');
    expect(result).toBeNull();
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('adriana_quote_leads'),
      ['+593991234567']
    );
  });

  it('retorna el lead cuando existe', async () => {
    const fakeLead = { phone: '+593991234567', status: 'gathering_id', vehicle_data: {} };
    mockGet.mockResolvedValueOnce(fakeLead);
    const result = await getQuoteLead('+593991234567');
    expect(result).toEqual(fakeLead);
  });
});

describe('upsertQuoteLead()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('llama a run con INSERT ON CONFLICT', async () => {
    await upsertQuoteLead('+593991234567', {
      status: 'gathering_vehicle',
      vehicleData: { brand: 'Toyota', model: 'RAV4', year: 2021, value: 35000 },
    });
    expect(mockRun).toHaveBeenCalledTimes(1);
    const [sql, params] = mockRun.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO adriana_quote_leads/);
    expect(sql).toMatch(/ON CONFLICT.*DO UPDATE/);
    expect(params[0]).toBe('+593991234567');
    expect(params[1]).toBe('gathering_vehicle');
  });

  it('serializa vehicleData como JSON string', async () => {
    const vData = { brand: 'Mazda', model: 'CX-5', year: 2022, value: 42000 };
    await upsertQuoteLead('+593991234567', { vehicleData: vData });
    const [, params] = mockRun.mock.calls[0];
    const parsed = JSON.parse(params[4]);
    expect(parsed).toEqual(vData);
  });

  it('usa status predeterminado gathering_vehicle', async () => {
    await upsertQuoteLead('+593991234567', {});
    const [, params] = mockRun.mock.calls[0];
    expect(params[1]).toBe('gathering_vehicle');
  });
});

describe('updateQuoteLeadData()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('actualiza el status correctamente', async () => {
    await updateQuoteLeadData('+593991234567', { status: 'selecting_coverage' });
    const [sql, params] = mockRun.mock.calls[0];
    expect(sql).toMatch(/status = \$2/);
    expect(params.includes('selecting_coverage')).toBe(true);
  });

  it('siempre incluye updated_at en SET', async () => {
    await updateQuoteLeadData('+593991234567', { status: 'quote_sent' });
    const [sql] = mockRun.mock.calls[0];
    expect(sql).toMatch(/updated_at = CURRENT_TIMESTAMP/);
  });

  it('serializa idCardData como JSON', async () => {
    const idData = { cedula: '1712345678', raw: 'Juan Pérez...' };
    await updateQuoteLeadData('+593991234567', { idCardData: idData });
    const [, params] = mockRun.mock.calls[0];
    const serialized = params.find(p => typeof p === 'string' && p.includes('cedula'));
    expect(JSON.parse(serialized)).toEqual(idData);
  });
});

describe('deleteQuoteLead()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ejecuta DELETE con el teléfono correcto', async () => {
    await deleteQuoteLead('+593991234567');
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM adriana_quote_leads'),
      ['+593991234567']
    );
  });
});
