const API_BASE = window.location.origin;

// ═══ STATE ═══════════════════════════════════════════════════════════════════
let currentFilters = { status: '', type: '', urgency: '', search: '' };let allLeads = [];

// ═══ PIPELINE ═════════════════════════════════════════════════════════════════════════════
function updatePipeline() {
  document.getElementById('pipe-active').textContent    = allLeads.filter(l => l.status === 'pending').length;
  document.getElementById('pipe-24h').textContent       = allLeads.filter(l => ['meeting_scheduled','quote_sent'].includes(l.status)).length;
  document.getElementById('pipe-3d').textContent        = allLeads.filter(l => l.status === 'service_in_progress').length;
  document.getElementById('pipe-converted').textContent = allLeads.filter(l => l.status === 'completed').length;
}
// ═══ HELPERS ═════════════════════════════════════════════════════════════════
function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const diffDays = Math.floor((Date.now() - date) / 86400000);
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '-'; }
}

function formatMoney(val) {
  if (!val || val === 0) return '-';
  return `$${parseFloat(val).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadge(status) {
  const map = {
    pending:              ['badge-pending',       '⏳ Pendiente'],
    meeting_scheduled:   ['badge-meeting_scheduled', '📅 Reunión'],
    quote_sent:          ['badge-quote_sent',     '📧 Cotizada'],
    negotiating:         ['badge-negotiating',    '💬 Negociando'],
    service_in_progress: ['badge-service_in_progress', '🔧 En Proceso'],
    completed:           ['badge-completed',      '✅ Completado'],
    cancelled:           ['badge-cancelled',      '❌ Cancelado'],
  };
  const [cls, label] = map[status] || ['badge-pending', status || '-'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function urgencyBadge(urgency) {
  const map = {
    'Urgente':       ['badge-urgente',       '🚨 Urgente'],
    'Normal':        ['badge-normal-u',      '📅 Normal'],
    'Planificación': ['badge-planificacion', '📋 Plan.'],
  };
  const [cls, label] = map[urgency] || ['badge-normal-u', urgency || 'Normal'];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ═══ STATS ═══════════════════════════════════════════════════════════════════
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/gabi/leads-stats`);
    const result = await res.json();
    if (!result.ok) return;
    const d = result.data;
    document.getElementById('stat-total').textContent   = d.total || 0;
    document.getElementById('stat-month').textContent   = d.thisMonth || 0;
    document.getElementById('stat-week').textContent    = d.thisWeek || 0;
    document.getElementById('stat-revenue').textContent = formatMoney(d.revenue?.total || 0);
  } catch (err) {
    console.error('[GABI-DASH] Error stats:', err);
  }
}

// ═══ LEADS TABLE ═════════════════════════════════════════════════════════════
async function loadLeads() {
  const container = document.getElementById('leads-container');
  container.innerHTML = '<div class="loading">Cargando consultas...</div>';

  const params = new URLSearchParams({ limit: 500 });
  if (currentFilters.status)  params.set('status', currentFilters.status);
  if (currentFilters.type)    params.set('consultationType', currentFilters.type);
  if (currentFilters.urgency) params.set('urgency', currentFilters.urgency);
  if (currentFilters.search)  params.set('search', currentFilters.search);

  try {
    const res = await fetch(`${API_BASE}/api/gabi/leads?${params}`);
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Error desconocido');

    const leads = result.data || [];
    allLeads = leads;
    updatePipeline();
    document.getElementById('table-count').textContent = `${leads.length} registro${leads.length !== 1 ? 's' : ''}`;

    if (leads.length === 0) {
      container.innerHTML = '<div class="empty">No hay consultas que coincidan con los filtros.</div>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Tipo</th>
            <th>Urgencia</th>
            <th>Estado</th>
            <th>Cotización</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(l => `
            <tr>
              <td><span class="code">${l.consultation_code || '-'}</span></td>
              <td>
                <div class="client-name">${l.client_name || '-'}</div>
                ${l.company ? `<div class="client-sub">🏢 ${l.company}</div>` : ''}
                ${l.email   ? `<div class="client-sub">✉️ ${l.email}</div>` : ''}
              </td>
              <td>${l.consultation_type || '-'}</td>
              <td>${urgencyBadge(l.urgency)}</td>
              <td>${statusBadge(l.status)}</td>
              <td><span class="amount">${formatMoney(l.quote_amount)}</span></td>
              <td><span class="date-cell">${formatDate(l.created_at)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

  } catch (err) {
    console.error('[GABI-DASH] Error leads:', err);
    container.innerHTML = `<div class="error">❌ Error al cargar consultas: ${err.message}</div>`;
  }
}

// ═══ INIT ═════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadLeads();

  document.getElementById('filter-status').addEventListener('change', e => {
    currentFilters.status = e.target.value; loadLeads();
  });
  document.getElementById('filter-type').addEventListener('change', e => {
    currentFilters.type = e.target.value; loadLeads();
  });
  document.getElementById('filter-urgency').addEventListener('change', e => {
    currentFilters.urgency = e.target.value; loadLeads();
  });

  let searchTimeout;
  document.getElementById('search').addEventListener('input', e => {
    currentFilters.search = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadLeads, 400);
  });

  // Auto-refresh cada 60s
  setInterval(() => { loadStats(); loadLeads(); }, 60000);
});
