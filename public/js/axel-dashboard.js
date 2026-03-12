const API_BASE = window.location.origin;
let currentFilters = { status: '', search: '' };
let allQuotes = [];

// ══ PIPELINE ══════════════════════════════════════════════════════════════════════
function updatePipeline() {
  document.getElementById('pipe-active').textContent    = allQuotes.filter(q => q.status === 'pending').length;
  document.getElementById('pipe-24h').textContent       = allQuotes.filter(q => q.status === 'quoted').length;
  document.getElementById('pipe-3d').textContent        = allQuotes.filter(q => q.status === 'in_progress').length;
  document.getElementById('pipe-converted').textContent = allQuotes.filter(q => q.status === 'completed').length;
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
  return `$${parseFloat(val).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function statusBadge(status) {
  const map = {
    pending:     ['badge-pending',     '⏳ Pendiente'],
    quoted:      ['badge-quoted',      '📧 Cotizado'],
    accepted:    ['badge-accepted',    '✅ Aceptado'],
    in_progress: ['badge-in_progress', '🔧 En Proceso'],
    completed:   ['badge-completed',   '✅ Completado'],
    cancelled:   ['badge-cancelled',   '❌ Cancelado'],
  };
  const [cls, label] = map[status] || ['badge-pending', status || '-'];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ── STATS ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res    = await fetch(`${API_BASE}/api/axel/quotes-stats`);
    const result = await res.json();
    if (!result.ok) return;
    const d = result.data;
    document.getElementById('stat-total').textContent = d.total     || 0;
    document.getElementById('stat-month').textContent = d.thisMonth || 0;
    document.getElementById('stat-week').textContent  = d.thisWeek  || 0;
    document.getElementById('stat-avg').textContent   = d.avgQuote > 0 ? formatMoney(d.avgQuote) : '-';
  } catch (err) { console.error('[AXEL-DASH] stats error:', err); }
}

// ── QUOTES ────────────────────────────────────────────────────────────────────
async function loadQuotes() {
  const container = document.getElementById('quotes-container');
  container.innerHTML = '<div class="loading">Cargando cotizaciones de Axel...</div>';

  const params = new URLSearchParams({ limit: 500 });
  if (currentFilters.status) params.set('status', currentFilters.status);
  if (currentFilters.search) params.set('search', currentFilters.search);

  try {
    const res    = await fetch(`${API_BASE}/api/axel/quotes?${params}`);
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Error desconocido');

    const quotes = result.data || [];
    allQuotes = quotes;
    updatePipeline();
    document.getElementById('table-count').textContent = `${quotes.length} registro${quotes.length !== 1 ? 's' : ''}`;

    if (quotes.length === 0) {
      container.innerHTML = '<div class="empty">No hay cotizaciones que coincidan con los filtros.</div>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Vehículo</th>
            <th>Tipo Daño</th>
            <th>Rango Precio</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${quotes.map(q => `
            <tr>
              <td><span class="code">${q.quote_code || '-'}</span></td>
              <td>
                <div class="client-name">${q.client_name || '-'}</div>
                ${q.email ? `<div class="client-sub">✉️ ${q.email}</div>` : ''}
                ${q.phone ? `<div class="client-sub">📱 ${q.phone}</div>` : ''}
              </td>
              <td>
                <div>${[q.vehicle_brand, q.vehicle_model].filter(Boolean).join(' ') || '-'}</div>
                ${q.vehicle_year ? `<div class="client-sub">${q.vehicle_year}</div>` : ''}
              </td>
              <td>${q.damage_type || '-'}</td>
              <td>
                <span class="price-range">
                  ${q.price_min != null && q.price_max != null
                    ? `${formatMoney(q.price_min)} – ${formatMoney(q.price_max)}`
                    : '-'}
                </span>
              </td>
              <td>${statusBadge(q.status)}</td>
              <td><span class="date-cell">${formatDate(q.created_at)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    console.error('[AXEL-DASH] quotes error:', err);
    container.innerHTML = `<div class="error">❌ Error: ${err.message}</div>`;
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadQuotes();

  document.getElementById('filter-status').addEventListener('change', e => {
    currentFilters.status = e.target.value; loadQuotes();
  });
  let searchTimer;
  document.getElementById('search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { currentFilters.search = e.target.value; loadQuotes(); }, 400);
  });
});
