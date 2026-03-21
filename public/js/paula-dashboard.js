const API_BASE = window.location.origin;
let currentFilters = { status: '', operationType: '', search: '' };
let allLeads = [];

// ══ PIPELINE ══════════════════════════════════════════════════════════════════════
function updatePipeline() {
  document.getElementById('pipe-active').textContent    = allLeads.filter(l => l.status === 'pending').length;
  document.getElementById('pipe-24h').textContent       = allLeads.filter(l => l.status === 'viewing_scheduled').length;
  document.getElementById('pipe-3d').textContent        = allLeads.filter(l => l.status === 'negotiating').length;
  document.getElementById('pipe-converted').textContent = allLeads.filter(l => l.status === 'closed').length;
}

function formatDate(ds) {
  if (!ds) return '-';
  try {
    const d = new Date(ds);
    if (isNaN(d)) return '-';
    const diff = Math.floor((Date.now() - d) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 7) return `Hace ${diff} días`;
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '-'; }
}

function statusBadge(status) {
  const map = {
    pending:            ['badge-pending',            '⏳ Pendiente'],
    viewing_scheduled:  ['badge-viewing_scheduled',  '🏠 Visita'],
    negotiating:        ['badge-negotiating',         '💬 Negociando'],
    closed:             ['badge-closed',              '✅ Cerrado'],
    cancelled:          ['badge-cancelled',           '❌ Cancelado'],
  };
  const [cls, label] = map[status] || ['badge-pending', status || '-'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function opBadge(op) {
  if (!op) return '-';
  return op === 'Compra'
    ? `<span class="badge badge-op-compra">🏡 Compra</span>`
    : `<span class="badge badge-op-arriendo">🔑 Arriendo</span>`;
}

// ── STATS ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/paula/leads-stats`);
    const result = await res.json();
    if (!result.ok) return;
    const d = result.data;
    document.getElementById('stat-total').textContent = d.total || 0;
    document.getElementById('stat-month').textContent = d.thisMonth || 0;
    document.getElementById('stat-week').textContent  = d.thisWeek  || 0;
    const buyers = (d.byOp || []).find(o => o.operation_type === 'Compra');
    document.getElementById('stat-buyers').textContent = buyers?.count || 0;
  } catch (err) { console.error('[PAULA-DASH] stats error:', err); }
}

// ── UPDATE STATUS ─────────────────────────────────────────────────────────────
async function updateStatus(id, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/api/paula/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const result = await res.json();
    if (!result.ok) { alert(`Error: ${result.error || 'No se pudo actualizar'}`); return; }
    const l = allLeads.find(l => l.id == id);
    if (l) l.status = newStatus;
    updatePipeline();
  } catch (err) { console.error('[PAULA-DASH] updateStatus error:', err); }
}

// ── SEND WA ────────────────────────────────────────────────────────────────────
async function sendWA(id, btn) {
  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';
  try {
    const res = await fetch(`${API_BASE}/api/paula/leads/${id}/send-wa`, { method: 'POST' });
    const d = await res.json();
    if (d.ok) {
      btn.textContent = '✅ Enviado';
      setTimeout(() => { btn.textContent = '📲 WhatsApp'; btn.disabled = false; }, 3000);
    } else {
      alert(`❌ Error: ${d.error}`);
      btn.textContent = '📲 WhatsApp';
      btn.disabled = false;
    }
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
    btn.textContent = '📲 WhatsApp';
    btn.disabled = false;
  }
}

// ── LEADS ─────────────────────────────────────────────────────────────────────
async function loadLeads() {
  const container = document.getElementById('leads-container');
  container.innerHTML = '<div class="loading">Cargando leads de Paula...</div>';

  const params = new URLSearchParams({ limit: 500 });
  if (currentFilters.status)        params.set('status', currentFilters.status);
  if (currentFilters.operationType) params.set('operationType', currentFilters.operationType);
  if (currentFilters.search)        params.set('search', currentFilters.search);

  try {
    const res    = await fetch(`${API_BASE}/api/paula/leads?${params}`);
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Error desconocido');

    const leads = result.data || [];
    allLeads = leads;
    updatePipeline();
    document.getElementById('table-count').textContent = `${leads.length} registro${leads.length !== 1 ? 's' : ''}`;

    if (leads.length === 0) {
      container.innerHTML = '<div class="empty">No hay leads que coincidan con los filtros.</div>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Operación</th>
            <th>Tipo Propiedad</th>
            <th>Zona</th>
            <th>Presupuesto</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(l => `
            <tr>
              <td>
                <div class="client-name">${l.client_name || '-'}</div>
                ${l.email ? `<div class="client-sub">✉️ ${l.email}</div>` : ''}
                ${l.phone ? `<div class="client-sub">📱 ${l.phone}</div>` : ''}
              </td>
              <td>${opBadge(l.operation_type)}</td>
              <td>${l.property_type || '-'}</td>
              <td>${l.preferred_zone || '-'}</td>
              <td><span class="amount">${l.budget_range || '-'}</span></td>
              <td>${statusBadge(l.status)}</td>
              <td><span class="date-cell">${formatDate(l.created_at)}</span></td>
              <td>
                <select class="status-select" data-id="${l.id}">
                  <option value="pending"           ${l.status==='pending'           ?'selected':''}>⏳ Pendiente</option>
                  <option value="viewing_scheduled" ${l.status==='viewing_scheduled' ?'selected':''}>🏠 Visita</option>
                  <option value="negotiating"       ${l.status==='negotiating'       ?'selected':''}>💬 Negociando</option>
                  <option value="closed"            ${l.status==='closed'            ?'selected':''}>✅ Cerrado</option>
                  <option value="cancelled"         ${l.status==='cancelled'         ?'selected':''}>❌ Cancelado</option>
                </select>
                ${l.phone ? `<button class="reminder-btn" data-id="${l.id}">📲 WhatsApp</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    console.error('[PAULA-DASH] leads error:', err);
    container.innerHTML = `<div class="error">❌ Error: ${err.message}</div>`;
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadLeads();

  document.getElementById('filter-status').addEventListener('change', e => {
    currentFilters.status = e.target.value; loadLeads();
  });
  document.getElementById('filter-op').addEventListener('change', e => {
    currentFilters.operationType = e.target.value; loadLeads();
  });
  let searchTimer;
  document.getElementById('search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { currentFilters.search = e.target.value; loadLeads(); }, 400);
  });

  // Event delegation para acciones en tabla
  const container = document.getElementById('leads-container');
  container.addEventListener('change', e => {
    const sel = e.target.closest('.status-select');
    if (sel) updateStatus(sel.dataset.id, sel.value);
  });
  container.addEventListener('click', e => {
    const btn = e.target.closest('.reminder-btn');
    if (btn) sendWA(btn.dataset.id, btn);
  });
});

async function seedDemo() {
  const btn = document.getElementById('btn-seed-demo');
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = '⏳ Cargando...';
  btn.disabled = true;
  try {
    const r = await fetch('/api/paula/seed-demo');
    const d = await r.json();
    if (d.ok) {
      btn.textContent = `✅ ${d.inserted} insertados`;
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
      loadStats(); loadLeads();
    } else {
      btn.textContent = '❌ Error';
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
    }
  } catch(e) {
    btn.textContent = '❌ Error';
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
  }
}
