/* ══════════════════════════════════════════════════════════════
   aluna-dashboard.js  —  Proformas + Pipeline de seguimiento
   ══════════════════════════════════════════════════════════════ */

const API_BASE = window.location.origin;

let allProformas = [];
let currentFilters = { status: '', origin: '', search: '' };
let currentTab = 'proformas';

/* ─── toast ─────────────────────────────────────────────────── */
function toast(msg, dur = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

/* ─── tabs ───────────────────────────────────────────────────── */
function switchTab(name) {
  currentTab = name;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.getElementById('tab-proformas').style.display = name === 'proformas' ? '' : 'none';
  document.getElementById('tab-pipeline').style.display  = name === 'pipeline'  ? '' : 'none';
}

/* ─── sequence accordion ─────────────────────────────────────── */
function toggleSeq(btn) {
  const body = document.getElementById('seq-body');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  btn.textContent = open ? 'Ver secuencia ▶' : 'Ocultar ▲';
}

/* ─── helpers ────────────────────────────────────────────────── */
function formatDate(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date)) return '—';
    const diff = Math.floor((Date.now() - date) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 7)  return `Hace ${diff}d`;
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
  } catch { return '—'; }
}

function formatDateShort(d) {
  if (!d) return null;
  try {
    const date = new Date(d);
    if (isNaN(date)) return null;
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch { return null; }
}

function formatPrice(v) {
  if (!v || v == 0) return '$0.00';
  return `$${parseFloat(v).toFixed(2)}`;
}

function isBigBoss(sr) {
  const s = (sr || '').toLowerCase();
  return s.includes('enviado por administrador') || s.includes('admin:') || s.includes('big boss');
}

function getOriginBadge(sr) {
  return isBigBoss(sr)
    ? '<span class="badge badge-boss">Big Boss</span>'
    : '<span class="badge badge-aluna">Aluna</span>';
}

function getStatusBadge(st) {
  const map = {
    pending:         'Pendiente',
    pending_payment: 'Pago Pendiente',
    tour_scheduled:  'Tour Agendado',
    negotiating:     'Negociando',
    accepted:        'Aceptada',
    active:          'Activa',
    cancelled:       'Cancelada',
    expired:         'Expirada'
  };
  const label = map[st] || st;
  return `<span class="badge badge-${st}">${label}</span>`;
}

function getTempBadge(t) {
  const map = {
    hot:  ['🔥 Caliente', 'temp-hot'],
    warm: ['🟡 Tibio',    'temp-warm'],
    cold: ['❄️ Frío',    'temp-cold']
  };
  const [label, cls] = map[t] || map['cold'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function getPhase(p) {
  if (p.converted_at)      return ['✅ Convertido', 'temp-done'];
  if (p.followup_3d_sent_at) return ['D+3 enviado', 'temp-cold'];
  if (p.followup_24h_sent_at) return ['Esperando D+3', 'temp-warm'];
  const hrs = (Date.now() - new Date(p.interest_at)) / 3600000;
  if (hrs < 24) return ['🔥 Reciente', 'temp-hot'];
  return ['Esperando D+1', 'temp-warm'];
}

function tsCell(ts) {
  const dt = formatDateShort(ts);
  if (dt) return `<span class="ts-sent">✓ ${dt}</span>`;
  return `<span class="ts-none">—</span>`;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

/* ─── pipeline actions ────────────────────────────────────────── */
async function convertProspect(phone, btn) {
  if (!confirm('¿Marcar este prospecto como convertido?')) return;
  btn.disabled = true;
  try {
    const r = await fetch(`${API_BASE}/api/aluna/prospect/${encodeURIComponent(phone)}/convert`, { method: 'POST' });
    const j = await r.json();
    if (j.ok) {
      toast('✅ Prospecto marcado como convertido');
      await loadPipeline();
    } else {
      toast('⚠️ Error: ' + (j.error || 'desconocido'));
      btn.disabled = false;
    }
  } catch (e) {
    toast('❌ Error de red');
    btn.disabled = false;
  }
}

async function sendWANow(phone, btn) {
  if (!confirm('¿Enviar WhatsApp de seguimiento ahora?')) return;
  btn.disabled = true;
  btn.textContent = '⏳ Enviando…';
  try {
    const r = await fetch(`${API_BASE}/api/aluna/prospect/${encodeURIComponent(phone)}/sendwa`, { method: 'POST' });
    const j = await r.json();
    if (j.ok) {
      toast('📱 WA enviado — ' + (j.message || ''));
      await loadPipeline();
    } else {
      toast('⚠️ Error: ' + (j.error || 'desconocido'));
      btn.disabled = false;
      btn.textContent = '📱 WA ahora';
    }
  } catch (e) {
    toast('❌ Error de red');
    btn.disabled = false;
    btn.textContent = '📱 WA ahora';
  }
}

/* ─── load pipeline ──────────────────────────────────────────── */
async function loadPipeline() {
  try {
    const r = await fetch(`${API_BASE}/api/aluna/pipeline`);
    const res = await r.json();
    if (!res.ok) return;

    const d = res.data;
    document.getElementById('pipe-active').textContent    = d.activeProspects ?? '—';
    document.getElementById('pipe-24h').textContent       = d.readyFor24h ?? '—';
    document.getElementById('pipe-3d').textContent        = d.readyFor3d ?? '—';
    document.getElementById('pipe-converted').textContent = d.converted ?? '—';

    const count = (d.prospects || []).length;
    document.getElementById('tab-count-pipeline').textContent = count;

    const tbody = document.getElementById('pipeline-body');
    if (!d.prospects || d.prospects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#475569;">Sin prospectos aún. Los leads de Aluna aparecen aquí automáticamente.</td></tr>`;
      return;
    }

    tbody.innerHTML = d.prospects.map(p => {
      const [phaseLabel, phaseCls] = getPhase(p);
      const converted = !!p.converted_at;
      const wa24Done  = !!p.followup_24h_sent_at;
      const wa3dDone  = !!p.followup_3d_sent_at;
      const allDone   = converted || (wa24Done && wa3dDone);
      
      // Botón WA: qué mensaje queda por enviar
      let waBtnLabel = '📱 WA D+1';
      if (wa24Done && !wa3dDone) waBtnLabel = '📱 WA D+3';
      
      return `
      <tr>
        <td>
          <div class="name-cell">
            <div class="avatar">${initials(p.user_name)}</div>
            <div>
              <div class="name-main">${p.user_name || p.user_phone}</div>
              <div class="name-sub">${p.user_phone}</div>
              ${p.user_email ? `<div class="name-sub">${p.user_email}</div>` : ''}
            </div>
          </div>
        </td>
        <td>${p.membership_type || '—'}</td>
        <td>${getTempBadge(p.temperature)}</td>
        <td><span class="badge ${phaseCls}" style="white-space:nowrap;">${phaseLabel}</span></td>
        <td>${tsCell(p.interest_at)}</td>
        <td>${tsCell(p.followup_24h_sent_at)}</td>
        <td>${p.user_email ? tsCell(p.followup_24h_email_sent_at) : '<span class="ts-none" title="Sin email">—</span>'}</td>
        <td>${tsCell(p.followup_3d_sent_at)}</td>
        <td>${p.user_email ? tsCell(p.followup_3d_email_sent_at) : '<span class="ts-none" title="Sin email">—</span>'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-convert" onclick="convertProspect('${p.user_phone}', this)" ${converted ? 'disabled' : ''}>
            ${converted ? '✅ Ya convertido' : '✅ Convertir'}
          </button>
          <button class="btn btn-sm btn-wa" onclick="sendWANow('${p.user_phone}', this)" ${allDone ? 'disabled' : ''} style="margin-top:4px;">
            ${allDone ? '✓ Secuencia completa' : waBtnLabel}
          </button>
        </td>
      </tr>`;
    }).join('');

  } catch (e) {
    console.error('[ALUNA-DASH] Error cargando pipeline:', e);
  }
}

/* ─── load stats ─────────────────────────────────────────────── */
async function loadStats() {
  try {
    const r = await fetch(`${API_BASE}/api/aluna/stats`);
    const res = await r.json();
    if (!res.ok) return;
    const d = res.data;
    document.getElementById('stat-total').textContent   = d.total || 0;
    document.getElementById('stat-month').textContent   = d.recent?.thisMonth || 0;
    document.getElementById('stat-week').textContent    = d.recent?.last7Days || 0;
    document.getElementById('stat-revenue').textContent = formatPrice(d.revenue?.potential || 0);
  } catch (e) {
    console.error('[ALUNA-DASH] Error cargando stats:', e);
  }
}

/* ─── load proformas ─────────────────────────────────────────── */
async function loadProformas() {
  const loadingEl = document.getElementById('loading-proformas');
  const errorEl   = document.getElementById('error-proformas');
  const tableEl   = document.getElementById('proformas-table');
  const emptyEl   = document.getElementById('empty-proformas');
  const tbody     = document.getElementById('table-body');

  loadingEl.style.display = 'block';
  errorEl.style.display   = 'none';
  tableEl.style.display   = 'none';
  emptyEl.style.display   = 'none';

  try {
    const params = new URLSearchParams({ limit: 1000 });
    if (currentFilters.status) params.set('status', currentFilters.status);
    const r = await fetch(`${API_BASE}/api/aluna/proformas?${params}`);
    const res = await r.json();
    if (!res.ok) throw new Error(res.error || 'Error cargando proformas');

    allProformas = res.data || [];

    let filtered = allProformas;
    if (currentFilters.origin) {
      const wantBoss = currentFilters.origin === 'bigboss';
      filtered = filtered.filter(p => isBigBoss(p.special_requirements) === wantBoss);
    }
    if (currentFilters.search) {
      const s = currentFilters.search.toLowerCase();
      filtered = filtered.filter(p =>
        (p.client_name || '').toLowerCase().includes(s) ||
        (p.email || '').toLowerCase().includes(s) ||
        (p.membership_code || '').toLowerCase().includes(s) ||
        (p.phone || '').toLowerCase().includes(s)
      );
    }

    document.getElementById('tab-count-proformas').textContent = filtered.length;
    loadingEl.style.display = 'none';

    if (filtered.length === 0) {
      emptyEl.style.display = 'block';
    } else {
      tbody.innerHTML = filtered.map(p => `
        <tr>
          <td><strong style="color:#f1f5f9;">${p.membership_code || '—'}</strong></td>
          <td>${p.client_name || '—'}</td>
          <td class="text-muted">${p.email || '—'}</td>
          <td>${(p.membership_type || '—').replace('plan_','').replace('_',' ')}</td>
          <td class="money-green">${formatPrice(p.monthly_fee)}</td>
          <td>${getStatusBadge(p.status)}</td>
          <td>${getOriginBadge(p.special_requirements)}</td>
          <td class="text-muted">${formatDate(p.quote_sent_at || p.created_at)}</td>
        </tr>`).join('');
      tableEl.style.display = 'table';
    }

    await loadStats();

  } catch (e) {
    console.error('[ALUNA-DASH] Error:', e);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Error: ' + e.message;
    errorEl.style.display = 'block';
  }
}

/* ─── refresh all ────────────────────────────────────────────── */
function refreshAll() {
  loadStats();
  loadProformas();
  loadPipeline();
}

/* ─── reset filters ──────────────────────────────────────────── */
function resetFilters() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-origin').value = '';
  document.getElementById('search').value = '';
  currentFilters = { status: '', origin: '', search: '' };
  loadProformas();
}

/* ─── init ───────────────────────────────────────────────────── */
document.getElementById('filter-status').addEventListener('change', e => {
  currentFilters.status = e.target.value;
  loadProformas();
});
document.getElementById('filter-origin').addEventListener('change', e => {
  currentFilters.origin = e.target.value;
  loadProformas();
});
document.getElementById('search').addEventListener('input', e => {
  currentFilters.search = e.target.value;
  clearTimeout(window._searchTimer);
  window._searchTimer = setTimeout(loadProformas, 450);
});

loadProformas();
loadPipeline();

setInterval(() => { loadStats(); loadPipeline(); }, 30000);

/* ─── end ───────────────────────────────────────────────────── */
// Estado de la aplicación -- LEGACY (removed)
