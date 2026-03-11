const API_BASE = window.location.origin;
let currentFilters = { status: '', operationType: '', search: '' };

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
});
