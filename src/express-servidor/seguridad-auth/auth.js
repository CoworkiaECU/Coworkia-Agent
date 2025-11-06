// src/server/middleware/auth.js
export function authAgentBuilder(req, res, next) {
  const header = req.headers['authorization'] || '';
  const expected = `Bearer ${process.env.AGENT_BUILDER_TOKEN}`;
  if (!process.env.AGENT_BUILDER_TOKEN) {
    return res.status(500).json({ ok: false, error: 'SERVER_MISCONFIGURED' });
  }
  if (header !== expected) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }
  next();
}
