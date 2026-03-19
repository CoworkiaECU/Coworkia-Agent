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

/* ─── stage filter ───────────────────────────────────────────── */
let activeStageFilter = null;

function filterByStage(stage) {
  if (activeStageFilter === stage) {
    clearStageFilter();
    return;
  }
  activeStageFilter = stage;
  document.querySelectorAll('.funnel-stage').forEach(el => el.classList.remove('active'));
  const map = { captado: 'fs-captado', d1: 'fs-d1', d3: 'fs-d3', converted: 'fs-conv' };
  if (map[stage]) document.getElementById(map[stage]).classList.add('active');
  const label = document.getElementById('stage-filter-label');
  const names = { captado: '🎯 Captado', d1: '📨 D+1 Enviado', d3: '⏰ D+3 Enviado', converted: '🏆 Convertido' };
  label.querySelector('button').previousSibling.textContent = `▶ ${names[stage]} — `;
  label.style.display = 'inline-flex';
  renderPipelineRows(window._lastProspects || []);
}

function clearStageFilter() {
  activeStageFilter = null;
  document.querySelectorAll('.funnel-stage').forEach(el => el.classList.remove('active'));
  document.getElementById('stage-filter-label').style.display = 'none';
  renderPipelineRows(window._lastProspects || []);
}

function getProspectStage(p) {
  if (p.converted_at)        return 'converted';
  if (p.followup_3d_sent_at)  return 'd3';
  if (p.followup_24h_sent_at) return 'd1';
  return 'captado';
}

/* ─── sequence accordion ─────────────────────────────────────── */
function toggleSeq(btn) {
  const body = document.getElementById('seq-body');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  btn.textContent = open ? 'Ver mensajes programados ▶' : 'Ocultar ▲';
}

/* ─── stepper builder ────────────────────────────────────────── */
function buildStepper(p) {
  const stage = getProspectStage(p);
  const steps = [
    { label: 'Captado', key: 'captado' },
    { label: 'D+1 📱',  key: 'd1' },
    { label: 'D+3 📱',  key: 'd3' },
    { label: '✅',       key: 'converted' },
  ];
  const order = ['captado', 'd1', 'd3', 'converted'];
  const pos = order.indexOf(stage);

  let html = '<div style="margin-bottom:4px;"><div class="stepper">';
  steps.forEach((s, i) => {
    const isDone    = i < pos;
    const isCurrent = i === pos;
    const cls = isDone ? 'done' : (isCurrent ? 'current' : '');
    html += `<div class="step-dot ${cls}" title="${s.label}">${isDone ? '✓' : (i + 1)}</div>`;
    if (i < steps.length - 1) {
      html += `<div class="step-line ${isDone ? 'done' : ''}"></div>`;
    }
  });
  html += '</div>';

  // labels row
  html += '<div style="display:flex;align-items:center;gap:0;margin-top:3px;">';
  steps.forEach((s, i) => {
    const isDone    = i < pos;
    const isCurrent = i === pos;
    const col = isDone ? '#34d399' : (isCurrent ? '#f97316' : '#334155');
    html += `<div style="width:22px;text-align:center;font-size:8px;color:${col};flex-shrink:0;">${s.label.split(' ')[0]}</div>`;
    if (i < steps.length - 1) html += '<div style="width:16px;flex-shrink:0;"></div>';
  });
  html += '</div></div>';
  return html;
}

/* ─── next action ────────────────────────────────────────────── */
function getNextAction(p) {
  if (p.converted_at) return `<span class="next-action na-done">🏆 Convertido</span>`;
  if (p.followup_3d_sent_at) {
    const diff = Math.floor((Date.now() - new Date(p.followup_3d_sent_at)) / 86400000);
    return `<span class="next-action na-waiting">⏳ Esperando resp. (D+${diff})</span>`;
  }
  if (p.followup_24h_sent_at) {
    const diff = Math.floor((Date.now() - new Date(p.followup_24h_sent_at)) / 3600000);
    const label = diff >= 72 ? `📱 Enviar D+3 — pendiente` : `⏳ D+3 en ${Math.max(0, 72 - diff)}h`;
    const cls = diff >= 72 ? 'na-pending' : 'na-waiting';
    return `<span class="next-action ${cls}">${label}</span>`;
  }
  const hrs = Math.floor((Date.now() - new Date(p.interest_at)) / 3600000);
  const label = hrs >= 24 ? `📱 Enviar D+1 — pendiente` : `⏳ D+1 en ${Math.max(0, 24 - hrs)}h`;
  const cls = hrs >= 24 ? 'na-pending' : 'na-waiting';
  return `<span class="next-action ${cls}">${label}</span>`;
}
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

function getDetailedStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge pending" title="Esperando respuesta inicial">⏳ Pendiente</span>',
    'quoted': '<span class="badge pending" title="Cotización enviada, sin respuesta">📨 Cotizado</span>',
    'tour_scheduled': '<span class="badge tour" title="Tour programado - próximo paso">📅 Tour Agendado</span>',
    'negotiating': '<span class="badge negotiating" title="En proceso de negociación">💬 Negociando</span>',
    'pending_payment': '<span class="badge payment" title="Esperando confirmación de pago">💳 Pago Pendiente</span>',
    'accepted': '<span class="badge accepted" title="Aceptado, esperando inicio">✅ Aceptado</span>',
    'active': '<span class="badge active" title="Cliente activo con membresía">🟢 Activo</span>',
    'cancelled': '<span class="badge cancelled" title="Cliente canceló el proceso">🚫 Cancelado</span>',
    'expired': '<span class="badge expired" title="Proforma expirada sin respuesta">⏰ Expirado</span>'
  };
  return badges[status] || `<span class="badge">${status}</span>`;
}

function getAutomationStatus(p) {
  const d1Sent = p.followup_24h_sent_at || p.automation_d1_sent;
  const d3Sent = p.followup_3d_sent_at || p.automation_d3_sent;
  
  let html = '<div style="display:flex;gap:6px;align-items:center;font-size:11px;">';
  
  if (d1Sent) {
    html += '<span title="D+1 enviado" style="background:#064e3b;color:#34d399;padding:2px 8px;border-radius:10px;font-weight:600;">✓ D+1</span>';
  } else {
    html += '<span title="D+1 pendiente" style="background:#334155;color:#64748b;padding:2px 8px;border-radius:10px;">◯ D+1</span>';
  }
  
  if (d3Sent) {
    html += '<span title="D+3 enviado" style="background:#064e3b;color:#34d399;padding:2px 8px;border-radius:10px;font-weight:600;">✓ D+3</span>';
  } else {
    html += '<span title="D+3 pendiente" style="background:#334155;color:#64748b;padding:2px 8px;border-radius:10px;">◯ D+3</span>';
  }
  
  html += '</div>';
  return html;
}

function getTimeSinceLastContact(p) {
  const dates = [
    p.last_interaction_at,
    p.client_response_at,
    p.followup_3d_sent_at,
    p.followup_24h_sent_at,
    p.quote_sent_at,
    p.created_at
  ].filter(d => d);
  
  if (dates.length === 0) return '<span style="color:#64748b;">Sin contacto</span>';
  
  const lastDate = new Date(Math.max(...dates.map(d => new Date(d))));
  const diff = Math.floor((Date.now() - lastDate) / 86400000);
  
  let color = '#34d399';
  let emoji = '🟢';
  if (diff > 7) { color = '#f87171'; emoji = '🔴'; }
  else if (diff > 3) { color = '#f59e0b'; emoji = '🟡'; }
  
  const text = diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : `Hace ${diff}d`;
  return `<span style="color:${color};font-weight:500;">${emoji} ${text}</span>`;
}

function getClientInteraction(p) {
  if (p.client_whatsapp_reply) {
    return '<span title="Cliente respondió por WhatsApp" style="background:#064e3b;color:#34d399;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;">📱 WhatsApp</span>';
  }
  if (p.client_email_reply) {
    return '<span title="Cliente respondió por Email" style="background:#1e40af;color:#93c5fd;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;">📧 Email</span>';
  }
  if (p.client_response_at) {
    return '<span title="Cliente hizo contacto" style="background:#065f46;color:#6ee7b7;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;">✓ Respondió</span>';
  }
  return '<span style="color:#475569;font-size:11px;">Sin respuesta</span>';
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
    const prospects = d.prospects || [];
    window._lastProspects = prospects;

    // Count per stage
    const counts = { captado: 0, d1: 0, d3: 0, converted: 0 };
    prospects.forEach(p => counts[getProspectStage(p)]++);
    const total = prospects.length || 1;

    document.getElementById('pipe-captado').textContent   = counts.captado;
    document.getElementById('pipe-d1').textContent        = counts.d1;
    document.getElementById('pipe-d3').textContent        = counts.d3;
    document.getElementById('pipe-converted').textContent = counts.converted;

    // Fill funnel bars
    document.getElementById('bar-captado').style.width = Math.round(counts.captado / total * 100) + '%';
    document.getElementById('bar-d1').style.width      = Math.round(counts.d1 / total * 100) + '%';
    document.getElementById('bar-d3').style.width      = Math.round(counts.d3 / total * 100) + '%';
    document.getElementById('bar-conv').style.width    = Math.round(counts.converted / total * 100) + '%';

    document.getElementById('tab-count-pipeline').textContent = prospects.length;

    renderPipelineRows(prospects);

  } catch (e) {
    console.error('[ALUNA-DASH] Error cargando pipeline:', e);
  }
}

function renderPipelineRows(prospects) {
  const tbody = document.getElementById('pipeline-body');

  let list = prospects;
  if (activeStageFilter) {
    list = prospects.filter(p => getProspectStage(p) === activeStageFilter);
  }

  if (list.length === 0) {
    const msg = activeStageFilter
      ? 'Sin prospectos en esta etapa.'
      : 'Sin prospectos aún. Los leads de Aluna aparecen aquí automáticamente.';
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#475569;">${msg}</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const converted = !!p.converted_at;
    const wa24Done  = !!p.followup_24h_sent_at;
    const wa3dDone  = !!p.followup_3d_sent_at;
    const allDone   = converted || (wa24Done && wa3dDone);
    let waBtnLabel  = wa24Done && !wa3dDone ? '📱 WA D+3' : '📱 WA D+1';

    return `
    <tr>
      <td>
        <div class="name-cell">
          <div class="avatar">${initials(p.user_name)}</div>
          <div>
            <div class="name-main">${p.user_name || p.user_phone}</div>
            <div class="name-sub">${p.user_phone}</div>
            ${p.user_email ? `<div class="name-sub">${p.user_email}</div>` : ''}
            <div style="margin-top:4px;">${getTempBadge(p.temperature)}</div>
          </div>
        </div>
      </td>
      <td>${p.membership_type || '—'}</td>
      <td>${buildStepper(p)}</td>
      <td>${getNextAction(p)}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm btn-convert" onclick="convertProspect('${p.user_phone}', this)" ${converted ? 'disabled' : ''}>
          ${converted ? '✅ Convertido' : '✅ Convertir'}
        </button>
        <button class="btn btn-sm btn-wa" onclick="sendWANow('${p.user_phone}', this)" ${allDone ? 'disabled' : ''} style="margin-top:4px;">
          ${allDone ? '✓ Secuencia OK' : waBtnLabel}
        </button>
      </td>
    </tr>`;
  }).join('');
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
      tbody.innerHTML = filtered.map((p, idx) => `
        <tr>
          <td><strong style="color:#64748b;">${idx + 1}</strong></td>
          <td><strong style="color:#f1f5f9;">${p.membership_code || '—'}</strong></td>
          <td>${p.client_name || '—'}</td>
          <td>${(p.membership_type || '—').replace('plan-','Plan ').replace('plan_','Plan ').replace('_',' ')}</td>
          <td class="money-green">${formatPrice(p.monthly_fee)}</td>
          <td>${getDetailedStatusBadge(p.status)}</td>
          <td>${getAutomationStatus(p)}</td>
          <td class="text-muted">${getTimeSinceLastContact(p)}</td>
          <td>${getClientInteraction(p)}</td>
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
