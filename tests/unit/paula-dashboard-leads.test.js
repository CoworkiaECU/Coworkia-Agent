import { readFile } from 'node:fs/promises';
import { describe, beforeAll, beforeEach, it, expect, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const database = {
  initialize: jest.fn(),
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
};

jest.unstable_mockModule('../../src/database/database.js', () => ({ default: database }));
jest.unstable_mockModule('../../src/express-servidor/endpoints-api/wassenger.js', () => ({
  enviarWhatsApp: jest.fn(),
}));

let app;

beforeAll(async () => {
  const { default: paulaRouter } = await import('../../src/express-servidor/endpoints-api/paula-dashboard.js');
  app = express();
  app.use(express.json());
  app.use('/api/paula', paulaRouter);
});

beforeEach(() => {
  jest.clearAllMocks();
  database.initialize.mockResolvedValue(undefined);
  database.all.mockResolvedValue([]);
  database.get.mockResolvedValue(null);
  database.run.mockResolvedValue({ rowCount: 0 });
});

describe('Paula dashboard leads', () => {
  it('uses only real_estate_leads and returns successful filtered listings', async () => {
    const lead = { id: 'RE-001', client_name: 'Cliente de prueba', status: 'pending' };
    database.all.mockResolvedValueOnce([lead]);

    const response = await request(app)
      .get('/api/paula/leads?status=pending&operationType=Compra&zone=Cumbaya&search=Cliente&limit=25&offset=10');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, data: [lead] });
    const [query, params] = database.all.mock.calls[0];
    expect(query).toContain('FROM real_estate_leads');
    expect(query).not.toMatch(/paula_lead_scores|\bscore\b|\btier\b/i);
    expect(query).not.toMatch(/\bJOIN\b/i);
    expect(query).toContain('ORDER BY created_at DESC LIMIT $5 OFFSET $6');
    expect(params).toEqual(['pending', 'Compra', '%Cumbaya%', '%Cliente%', 25, 10]);
  });

  it('returns HTTP 200 with an empty list and the frontend keeps its empty state', async () => {
    const response = await request(app).get('/api/paula/leads');
    const dashboardScript = await readFile(new URL('../../public/js/paula-dashboard.js', import.meta.url), 'utf8');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, data: [] });
    expect(dashboardScript).toContain('const leads = result.data || [];');
    expect(dashboardScript).toContain('if (leads.length === 0)');
    expect(dashboardScript).toContain('No hay leads que coincidan con los filtros.');
  });

  it('keeps database errors controlled in the existing frontend-compatible format', async () => {
    database.all.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await request(app).get('/api/paula/leads');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ ok: false, error: 'database unavailable' });
  });

  it('preserves the leads-stats response contract and public route', async () => {
    database.get
      .mockResolvedValueOnce({ total: 3 })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });
    database.all
      .mockResolvedValueOnce([{ status: 'pending', count: 2 }])
      .mockResolvedValueOnce([{ operation_type: 'Compra', count: 3 }]);

    const response = await request(app).get('/api/paula/leads-stats');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      data: {
        total: 3,
        thisMonth: 2,
        thisWeek: 1,
        byStatus: [{ status: 'pending', count: 2 }],
        byOp: [{ operation_type: 'Compra', count: 3 }],
      },
    });
  });

  it('has one canonical loadLeads implementation and keeps the mounted route unchanged', async () => {
    const [dashboardHtml, dashboardScript, serverSource] = await Promise.all([
      readFile(new URL('../../public/paula-inmobiliaria.html', import.meta.url), 'utf8'),
      readFile(new URL('../../public/js/paula-dashboard.js', import.meta.url), 'utf8'),
      readFile(new URL('../../src/express-servidor/index.js', import.meta.url), 'utf8'),
    ]);
    const loaders = `${dashboardHtml}\n${dashboardScript}`.match(/^async function loadLeads\(/gm) || [];

    expect(loaders).toHaveLength(1);
    expect(serverSource).toContain("app.use('/api/paula', paulaDashboardRouter);");
  });
});