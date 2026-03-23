import https from 'https';

const [,, title, agent = 'AURORA'] = process.argv;
if (!title) { console.error('Usage: node magic-todo-done.mjs "title" [agent]'); process.exit(1); }

const HOST = 'coworkia-agent-e97d15dac56f.herokuapp.com';

function post(path, body) {
  return new Promise((res, rej) => {
    const s = JSON.stringify(body);
    const req = https.request({ hostname: HOST, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s) } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    });
    req.on('error', rej); req.write(s); req.end();
  });
}
function patch(path, body) {
  return new Promise((res, rej) => {
    const s = JSON.stringify(body);
    const req = https.request({ hostname: HOST, path, method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s) } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    });
    req.on('error', rej); req.write(s); req.end();
  });
}

const created = await post('/api/todos', { title, agent, priority: 'high' });
const id = created.id || created.todo?.id;
const patched = await patch(`/api/todos/${id}/status`, { status: 'done' });
console.log(`✅ Magic TODO #${id} → done (ok: ${patched.ok})`);
