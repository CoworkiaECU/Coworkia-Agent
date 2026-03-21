const API_BASE = window.location.origin;
let currentFilters = { status: '', insuranceType: '', search: '' };
let allLeads = [];

function showToast(msg, type = 'error') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;top:20px;right:20px;background:${type === 'error' ? '#dc2626' : '#16a34a'};color:#fff;padding:12px 20px;border-radius:8px;z-index:9999;font-size:14px;max-width:340px;box-shadow:0 4px 12px rgba(0,0,0,.25);line-height:1.4;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ══ PIPELINE ══════════════════════════════════════════════════════════════════════
function updatePipeline() {
  document.getElementById('pipe-active').textContent    = allLeads.filter(l => l.status === 'pending').length;
  document.getElementById('pipe-24h').textContent       = allLeads.filter(l => l.status === 'quoted').length;
  document.getElementById('pipe-converted').textContent = allLeads.filter(l => l.status === 'accepted').length;
  document.getElementById('pipe-3d').textContent        = allLeads.filter(l => ['rejected','cancelled'].includes(l.status)).length;
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

function formatMoney(val) {
  if (!val && val !== 0) return '-';
  return `$${parseFloat(val).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadge(status) {
  const map = {
    pending:   ['badge-pending',   '⏳ Pendiente'],
    quoted:    ['badge-quoted',    '📧 Cotizado'],
    accepted:  ['badge-accepted',  '✅ Aceptado'],
    rejected:  ['badge-rejected',  '❌ Rechazado'],
    cancelled: ['badge-cancelled', '🚫 Cancelado'],
  };
  const [cls, label] = map[status] || ['badge-pending', status || '-'];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ── UPDATE STATUS ─────────────────────────────────────────────────────────────
async function updateStatus(code, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/api/adriana/leads/${code}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const result = await res.json();
    if (!result.ok) { alert(`Error: ${result.error || 'No se pudo actualizar'}`); return; }
    await loadLeads();
  } catch (err) {
    console.error('[ADRIANA-DASH] updateStatus error:', err);
  }
}
// ── SEND WA ────────────────────────────────────────────────────────────────────
async function sendWA(code, btn) {
  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';
  try {
    const res = await fetch(`${API_BASE}/api/adriana/leads/${code}/send-wa`, { method: 'POST' });
    const d = await res.json();
    if (d.ok) {
      btn.textContent = '✅ Enviado';
      setTimeout(() => { btn.textContent = '📲 WA'; btn.disabled = false; }, 3000);
    } else {
      const msg = d.error === 'TEST_LEAD' ? '📵 Lead de prueba — el teléfono del cliente aún no está registrado'
                : d.error === 'NO_CLIENT_PHONE' ? '📱 Sin teléfono del cliente — no se puede enviar'
                : `❌ ${d.error}`;
      showToast(msg);
      btn.textContent = '📲 WA';
      btn.disabled = false;
    }
  } catch (err) {
    showToast(`❌ ${err.message}`);
    btn.textContent = '📲 WA';
    btn.disabled = false;
  }
}
// ── STATS ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res    = await fetch(`${API_BASE}/api/adriana/leads-stats`);
    const result = await res.json();
    if (!result.ok) return;
    const d = result.data;
    document.getElementById('stat-total').textContent = d.total      || 0;
    document.getElementById('stat-month').textContent = d.thisMonth  || 0;
    document.getElementById('stat-week').textContent  = d.thisWeek   || 0;
    document.getElementById('stat-avg').textContent   = d.avgPremium > 0 ? formatMoney(d.avgPremium) : '-';
  } catch (err) { console.error('[ADRIANA-DASH] stats error:', err); }
}

// ── LEADS ─────────────────────────────────────────────────────────────────────
async function loadLeads() {
  const container = document.getElementById('leads-container');
  container.innerHTML = '<div class="loading">Cargando leads de Adriana...</div>';

  const params = new URLSearchParams({ limit: 500 });
  if (currentFilters.status)       params.set('status', currentFilters.status);
  if (currentFilters.insuranceType) params.set('insuranceType', currentFilters.insuranceType);
  if (currentFilters.search)        params.set('search', currentFilters.search);

  try {
    const res    = await fetch(`${API_BASE}/api/adriana/leads?${params}`);
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
            <th>Código</th>
            <th>Cliente</th>
            <th>Tipo Seguro</th>
            <th>Vehículo</th>
            <th>Ciudad</th>
            <th>Prima Cotizada</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(l => `
            <tr>
              <td><span class="code">${l.quote_code || '-'}</span></td>
              <td>
                <div class="client-name">${l.client_name || '-'}</div>
                ${l.email ? `<div class="client-sub">✉️ ${l.email}</div>` : ''}
                ${l.phone ? `<div class="client-sub">📱 ${l.phone}</div>` : ''}
              </td>
              <td>${l.insurance_type || '-'}</td>
              <td>
                <div>${[l.vehicle_brand, l.vehicle_model].filter(Boolean).join(' ') || '-'}</div>
                ${l.vehicle_year ? `<div class="client-sub">${l.vehicle_year}</div>` : ''}
              </td>
              <td>${l.city || '-'}</td>
              <td><span class="amount">${formatMoney(l.quoted_premium)}</span></td>
              <td>${statusBadge(l.status)}</td>
              <td><span class="date-cell">${formatDate(l.created_at)}</span></td>
              <td>
                <select class="status-select" onchange="updateStatus('${l.quote_code}', this.value)">
                  <option value="pending"   ${l.status==='pending'   ? 'selected':''}}>⏳ Pendiente</option>
                  <option value="quoted"    ${l.status==='quoted'    ? 'selected':''}}📧 Cotizado</option>
                  <option value="accepted"  ${l.status==='accepted'  ? 'selected':''}}>✅ Aceptado</option>
                  <option value="rejected"  ${l.status==='rejected'  ? 'selected':''}}>❌ Rechazado</option>
                  <option value="cancelled" ${l.status==='cancelled' ? 'selected':''}}>🚫 Cancelado</option>
                </select>
                ${l.phone ? `<button class="reminder-btn" data-code="${l.quote_code}">📲 WA</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    console.error('[ADRIANA-DASH] leads error:', err);
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
  document.getElementById('filter-type').addEventListener('change', e => {
    currentFilters.insuranceType = e.target.value; loadLeads();
  });
  let searchTimer;
  document.getElementById('search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { currentFilters.search = e.target.value; loadLeads(); }, 400);
  });

  // Event delegation para boton WA
  const container = document.getElementById('leads-container');
  container.addEventListener('click', e => {
    const btn = e.target.closest('.reminder-btn');
    if (btn) sendWA(btn.dataset.code, btn);
  });
});

async function seedDemo() {
  const btn = document.getElementById('btn-seed-demo');
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = '⏳ Cargando...';
  btn.disabled = true;
  try {
    const r = await fetch('/api/adriana/seed-demo');
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
