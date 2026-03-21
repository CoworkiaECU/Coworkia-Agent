const API_BASE = window.location.origin;
let currentFilters = { status: '', search: '' };
let allQuotes = [];

// ── UTILS ──────────────────────────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ── PIPELINE ───────────────────────────────────────────────────────────────────
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updatePipeline() {
  setEl('pipe-pending',     allQuotes.filter(q => q.status === 'pending').length);
  setEl('pipe-quoted',      allQuotes.filter(q => q.status === 'quoted').length);
  setEl('pipe-in_progress', allQuotes.filter(q => q.status === 'in_progress').length);
  setEl('pipe-completed',   allQuotes.filter(q => q.status === 'completed').length);
}

// ── FORMAT HELPERS ─────────────────────────────────────────────────────────────
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
  if (val == null || val === '') return '-';
  return `$${parseFloat(val).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function statusBadge(status) {
  const map = {
    pending:     ['badge-pending',     '⏳ Pendiente'],
    inspecting:  ['badge-inspecting',  '🔍 Inspeccionando'],
    quoted:      ['badge-quoted',      '📧 Cotizado'],
    accepted:    ['badge-accepted',    '✅ Aceptado'],
    in_progress: ['badge-in_progress', '🔧 En Proceso'],
    completed:   ['badge-completed',   '✅ Completado'],
    cancelled:   ['badge-cancelled',   '❌ Cancelado'],
  };
  const [cls, label] = map[status] || ['badge-pending', status || '-'];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ── STATS ──────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res    = await fetch(`${API_BASE}/api/axel/quotes-stats`, { cache: 'no-store' });
    const result = await res.json();
    if (!result.ok) return;
    const d = result.data;
    setEl('stat-total', d.total     || 0);
    setEl('stat-month', d.thisMonth || 0);
    setEl('stat-week',  d.thisWeek  || 0);
    setEl('stat-avg',   d.avgQuote > 0 ? formatMoney(d.avgQuote) : '-');
    setEl('header-revenue', d.totalRevenue > 0 ? formatMoney(d.totalRevenue) : '$0');
  } catch (err) { console.error('[AXEL-DASH] stats error:', err); }
}

// ── CARD RENDERER ──────────────────────────────────────────────────────────────
function renderCard(q) {
  const vehicleLine = [q.vehicle_brand, q.vehicle_model].filter(Boolean).join(' ') || 'Vehículo sin datos';
  const year        = q.vehicle_year ? `· ${q.vehicle_year}` : '';
  const priceHtml   = (q.price_min != null && q.price_max != null)
    ? `${formatMoney(q.price_min)} – ${formatMoney(q.price_max)}`
    : (q.price_min != null ? `Desde ${formatMoney(q.price_min)}` : 'Sin cotización aún');
  const contact = q.email || q.phone || q.user_phone || '';
  const damage  = q.damage_type || 'Daño no especificado';

  return `
    <div class="quote-card">
      <div class="quote-card-header">
        <div>
          <div class="vehicle-name">🚗 ${vehicleLine}</div>
          <div class="vehicle-year">${year}</div>
        </div>
        <div class="quote-code-badge">${q.quote_code || '-'}</div>
      </div>
      <div class="quote-card-body">
        <div class="quote-client">
          <div class="client-avatar">${initials(q.client_name)}</div>
          <div class="client-info">
            <div class="client-name">${q.client_name || 'Cliente no identificado'}</div>
            ${contact ? `<div class="client-contact">${contact}</div>` : ''}
          </div>
        </div>
        <div class="quote-details">
          <div class="detail-item">
            <div class="detail-label">Tipo de Daño</div>
            <div class="detail-value"><span class="damage-tag">${damage}</span></div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Estado</div>
            <div class="detail-value">${statusBadge(q.status)}</div>
          </div>
        </div>
        <div class="price-display">
          <div>
            <div class="price-label">Rango de Cotización</div>
            <div class="price-range">${priceHtml}</div>
          </div>
          <span style="font-size:22px;">💰</span>
        </div>
      </div>
      <div class="quote-card-footer">
        <span class="date-label">📅 ${formatDate(q.created_at)}</span>
        ${q.photo_urls ? `<span style="font-size:11px;color:#9ca3af;font-weight:600;">📸 Fotos adjuntas</span>` : ''}
      </div>
      <div class="card-actions">
        <select class="status-select" data-code="${q.quote_code}">
          <option value="pending"     ${q.status==='pending'     ?'selected':''}>⏳ Pendiente</option>
          <option value="inspecting"  ${q.status==='inspecting'  ?'selected':''}>🔍 Inspeccionando</option>
          <option value="quoted"      ${q.status==='quoted'      ?'selected':''}>📧 Cotizado</option>
          <option value="accepted"    ${q.status==='accepted'    ?'selected':''}>✅ Aceptado</option>
          <option value="in_progress" ${q.status==='in_progress' ?'selected':''}>🔧 En Proceso</option>
          <option value="completed"   ${q.status==='completed'   ?'selected':''}>✅ Completado</option>
          <option value="cancelled"   ${q.status==='cancelled'   ?'selected':''}>❌ Cancelado</option>
        </select>
        <button class="reminder-btn" data-code="${q.quote_code}" data-name="${q.client_name||''}">📲 Recordatorio</button>
      </div>
    </div>`;
}

// ── QUOTES ─────────────────────────────────────────────────────────────────────
async function loadQuotes() {
  const container = document.getElementById('quotes-container');
  container.innerHTML = '<div class="state-block loading-state">Cargando cotizaciones...</div>';

  const params = new URLSearchParams({ limit: 500 });
  if (currentFilters.status) params.set('status', currentFilters.status);
  if (currentFilters.search) params.set('search', currentFilters.search);

  try {
    const res    = await fetch(`${API_BASE}/api/axel/quotes?${params}`, { cache: 'no-store' });
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Error desconocido');

    const quotes = result.data || [];
    allQuotes = quotes;
    updatePipeline();
    setEl('table-count', `${quotes.length} cotizaci${quotes.length !== 1 ? 'ones' : 'ón'}`);

    if (quotes.length === 0) {
      container.innerHTML = `
        <div class="state-block empty-state">
          <div style="font-size:48px;margin-bottom:12px;">🚗</div>
          <div>No hay cotizaciones que coincidan con los filtros.</div>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="quotes-grid">${quotes.map(renderCard).join('')}</div>`;
  } catch (err) {
    console.error('[AXEL-DASH] quotes error:', err);
    container.innerHTML = `<div class="state-block error-state">❌ Error al cargar: ${err.message}</div>`;
  }
}

// ── REFRESH ────────────────────────────────────────────────────────────────────
function refresh() { loadStats(); loadQuotes(); }

// ── STATUS UPDATE ──────────────────────────────────────────────────────────────
async function updateStatus(code, status) {
  try {
    const res = await fetch(`${API_BASE}/api/axel/quotes/${code}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (!d.ok) console.error('[AXEL-DASH] updateStatus error:', d.error);
    else {
      const q = allQuotes.find(q => q.quote_code === code);
      if (q) q.status = status;
      updatePipeline();
    }
  } catch (err) { console.error('[AXEL-DASH] updateStatus error:', err); }
}

// ── SEND REMINDER ──────────────────────────────────────────────────────────────
async function sendReminder(code, name, btn) {
  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';
  try {
    const res = await fetch(`${API_BASE}/api/axel/quotes/${code}/send-reminder`, { method: 'POST' });
    const d = await res.json();
    if (d.ok) {
      btn.textContent = '✅ Enviado';
      setTimeout(() => { btn.textContent = '📲 Recordatorio'; btn.disabled = false; }, 3000);
    } else {
      alert(`❌ Error: ${d.error}`);
      btn.textContent = '📲 Recordatorio';
      btn.disabled = false;
    }
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
    btn.textContent = '📲 Recordatorio';
    btn.disabled = false;
  }
}

// ── INIT ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadQuotes();

  // Event delegation for card actions
  const container = document.getElementById('quotes-container');
  container.addEventListener('change', e => {
    const sel = e.target.closest('.status-select');
    if (sel) updateStatus(sel.dataset.code, sel.value);
  });
  container.addEventListener('click', e => {
    const btn = e.target.closest('.reminder-btn');
    if (btn) sendReminder(btn.dataset.code, btn.dataset.name, btn);
  });

  // Filter pills
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilters.status = btn.dataset.status;
      loadQuotes();
    });
  });

  // Search
  let searchTimer;
  document.getElementById('search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentFilters.search = e.target.value.trim();
      loadQuotes();
    }, 400);
  });
});
