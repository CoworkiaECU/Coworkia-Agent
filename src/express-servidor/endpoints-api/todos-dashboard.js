import express from 'express';
import databaseService from '../../database/database.js';

const router = express.Router();

// SSE clients store
const sseClients = new Set();

function broadcast(payload) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch (_) { sseClients.delete(res); }
  }
}

// ── GET /api/todos — list all
router.get('/', async (_req, res) => {
  try {
    const rows = await databaseService.all(
      `SELECT * FROM todos ORDER BY
        CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        updated_at DESC`
    );
    res.json({ ok: true, todos: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/todos — create
router.post('/', async (req, res) => {
  const { title, priority = 'medium', assigned_agent = null } = req.body;
  if (!title?.trim()) return res.status(400).json({ ok: false, error: 'title required' });
  try {
    const row = await databaseService.get(
      `INSERT INTO todos (title, status, priority, assigned_agent)
       VALUES ($1, 'pending', $2, $3)
       RETURNING *`,
      [title.trim(), priority, assigned_agent]
    );
    broadcast({ event: 'created', todo: row });
    res.json({ ok: true, todo: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PATCH /api/todos/:id/status — update status (agents call this)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['pending', 'in_progress', 'done', 'blocked'];
  if (!validStatuses.includes(status))
    return res.status(400).json({ ok: false, error: `status must be one of: ${validStatuses.join(', ')}` });
  try {
    const row = await databaseService.get(
      `UPDATE todos SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, id]
    );
    if (!row) return res.status(404).json({ ok: false, error: 'todo not found' });
    broadcast({ event: 'updated', todo: row });
    res.json({ ok: true, todo: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PATCH /api/todos/:id — full update (title, priority, agent, status)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, status, priority, assigned_agent } = req.body;
  try {
    const row = await databaseService.get(
      `UPDATE todos
       SET title=COALESCE($1,title),
           status=COALESCE($2,status),
           priority=COALESCE($3,priority),
           assigned_agent=COALESCE($4,assigned_agent),
           updated_at=NOW()
       WHERE id=$5
       RETURNING *`,
      [title ?? null, status ?? null, priority ?? null, assigned_agent ?? null, id]
    );
    if (!row) return res.status(404).json({ ok: false, error: 'todo not found' });
    broadcast({ event: 'updated', todo: row });
    res.json({ ok: true, todo: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /api/todos/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await databaseService.run(`DELETE FROM todos WHERE id=$1`, [id]);
    broadcast({ event: 'deleted', id: Number(id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/todos/stream — SSE real-time
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Heroku / nginx don't buffer SSE
  res.flushHeaders();

  // Send heartbeat every 25s to keep connection alive through Heroku's 30s timeout
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { cleanup(); }
  }, 25000);

  const cleanup = () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  };

  sseClients.add(res);
  req.on('close', cleanup);
  req.on('error', cleanup);
});

export default router;
