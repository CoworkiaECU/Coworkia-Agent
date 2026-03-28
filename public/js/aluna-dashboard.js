/* ══════════════════════════════════════════════════════════════
   aluna-dashboard.js  —  Proformas + Pipeline de seguimiento
   ══════════════════════════════════════════════════════════════ */

const API_BASE = window.location.origin;

let allProformas = [];
let currentFilters = { status: '', origin: '', search: '' };
let currentTab = 'proformas';

/* ─── toast ─────────────────────────────────────────────────── */
window.toast = function(msg, dur = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
};

/* ─── tabs ───────────────────────────────────────────────────── */
window.switchTab = function(name) {
  currentTab = name;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.getElementById('tab-proformas').style.display = name === 'proformas' ? '' : 'none';
  document.getElementById('tab-pipeline').style.display  = name === 'pipeline'  ? '' : 'none';
  document.getElementById('tab-automatizaciones').style.display = name === 'automatizaciones' ? '' : 'none';
  if (name === 'automatizaciones') loadAutomationStats();
};

/* ─── stage filter ───────────────────────────────────────────── */
let activeStageFilter = null;

window.filterByStage = function(stage) {
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

window.clearStageFilter = function() {
  activeStageFilter = null;
  document.querySelectorAll('.funnel-stage').forEach(el => el.classList.remove('active'));
  document.getElementById('stage-filter-label').style.display = 'none';
  renderPipelineRows(window._lastProspects || []);
};

function getProspectStage(p) {
  if (p.membership_activated || p.converted_at) return 'converted';
  if (p.followup_3d_sent_at  || p.automation_d3_sent)  return 'd3';
  if (p.followup_24h_sent_at || p.automation_d1_sent)  return 'd1';
  return 'captado';
}

/* ─── sequence accordion ─────────────────────────────────────── */
window.toggleSeq = function(btn) {
  const body = document.getElementById('seq-body');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  btn.textContent = open ? 'Ver mensajes programados ▶' : 'Ocultar ▲';
};

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
window.convertProspect = async function(phone, btn) {
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

window.sendWANow = async function(phone, btn) {
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

window.sendD1WA = async function(leadId, phone, name, plan, btn) {
  if (!confirm(`¿Enviar WhatsApp D+1 a ${name || phone}?`)) return;
  btn.disabled = true;
  btn.textContent = '⏳…';
  const firstName = (name || '').split(' ')[0] || 'Hola';
  const planLabel = plan ? `*${plan}*` : 'los planes de membresía';
  const message = `Hola ${firstName} 🌙\n\nQuería hacer seguimiento sobre ${planLabel} que estuviste revisando 😊\n\n¿Tienes alguna duda o necesitas más detalles?\n\nY si quieres conocer el espacio antes de decidir, *te invito a venir un día completo sin ningún costo* — de *8am a 7pm*, usas todo como si ya fuera tu oficina 🏢✨\n\nSin compromiso. ¿Cuándo te quedaría bien?`;
  try {
    const r = await fetch(`${API_BASE}/api/aluna/send-d1-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, userPhone: phone, message })
    });
    const j = await r.json();
    if (j.ok) {
      toast('📱 D+1 WA enviado');
      await loadPipeline();
    } else {
      toast('⚠️ ' + (j.error || 'Error enviando D+1'));
      btn.disabled = false;
      btn.textContent = '📱 D+1';
    }
  } catch (e) {
    toast('❌ Error de red');
    btn.disabled = false;
    btn.textContent = '📱 D+1';
  }
}

window.sendD3WA = async function(leadId, phone, name, plan, btn) {
  if (!confirm(`¿Enviar WhatsApp D+3 a ${name || phone}?`)) return;
  btn.disabled = true;
  btn.textContent = '⏳…';
  const firstName = (name || '').split(' ')[0] || 'Hola';
  const planLabel = plan ? `*${plan}*` : 'los planes de membresía';
  const message = `Hola ${firstName} 👋\n\n¿Cómo estás? Hace unos días charlamos sobre ${planLabel} y quería hacer un último acercamiento 😊\n\n*Mi propuesta:* ven a Coworkia un día completo, completamente gratis.\n\n📍 Sin costo, de *8am a 7pm* — WiFi, café, hot desk, sala de reuniones.\nSolo di en recepción que eres invitada/o de Aluna 🏢\n\n¿Qué día de esta semana te queda bien? 🗓️`;
  try {
    const r = await fetch(`${API_BASE}/api/aluna/send-d3-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, userPhone: phone, message })
    });
    const j = await r.json();
    if (j.ok) {
      toast('📱 D+3 WA enviado');
      await loadPipeline();
    } else {
      toast('⚠️ ' + (j.error || 'Error enviando D+3'));
      btn.disabled = false;
      btn.textContent = '📱 D+3';
    }
  } catch (e) {
    toast('❌ Error de red');
    btn.disabled = false;
    btn.textContent = '📱 D+3';
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
    const leadId    = p.id;
    const phone     = p.user_phone;
    const name      = p.user_name;
    const plan      = p.membership_type;

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
        <button class="btn btn-sm btn-convert" data-action="convert" data-phone="${phone}" ${converted ? 'disabled' : ''}>
          ${converted ? '✅ Convertido' : '✅ Convertir'}
        </button>
        <button class="btn btn-sm btn-wa" data-action="pipeline-d1-wa" data-lid="${leadId || ''}" data-phone="${phone}" data-name="${(name||'').replace(/"/g,'&quot;')}" data-plan="${(plan||'').replace(/"/g,'&quot;')}" ${wa24Done ? 'disabled' : ''} style="margin-top:4px;" title="${wa24Done ? 'D+1 ya enviado' : 'Enviar WhatsApp D+1'}">
          ${wa24Done ? '✓ D+1' : '📱 D+1'}
        </button>
        <button class="btn btn-sm btn-wa" data-action="pipeline-d3-wa" data-lid="${leadId || ''}" data-phone="${phone}" data-name="${(name||'').replace(/"/g,'&quot;')}" data-plan="${(plan||'').replace(/"/g,'&quot;')}" ${wa3dDone || !wa24Done ? 'disabled' : ''} style="margin-top:4px;" title="${!wa24Done && !wa3dDone ? 'Enviar D+1 primero' : wa3dDone ? 'D+3 ya enviado' : 'Enviar WhatsApp D+3'}">
          ${wa3dDone ? '✓ D+3' : '📱 D+3'}
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
    
    // Stats generales (legacy)
    document.getElementById('stat-total').textContent   = d.total || 0;
    document.getElementById('stat-month').textContent   = d.recent?.thisMonth || 0;
    document.getElementById('stat-week').textContent    = d.recent?.last7Days || 0;
    document.getElementById('stat-revenue').textContent = formatPrice(d.revenue?.potential || 0);
    
    // Stats de follow-ups (nuevas - BLOQUE 2)
    if (d.followups) {
      const fu = d.followups;
      
      // D+1 Enviados
      document.getElementById('stat-d1-pct').textContent = `${fu.automation.d1Percentage}%`;
      document.getElementById('stat-d1-sub').textContent = `${fu.automation.d1Sent} de ${fu.leads.active} prospectos`;
      
      // D+3 Enviados
      document.getElementById('stat-d3-pct').textContent = `${fu.automation.d3Percentage}%`;
      document.getElementById('stat-d3-sub').textContent = `${fu.automation.d3Sent} de ${fu.leads.active} prospectos`;
      
      // Tasa de respuesta
      document.getElementById('stat-response-pct').textContent = `${fu.engagement.responseRate}%`;
      document.getElementById('stat-response-sub').textContent = `${fu.engagement.responded} de ${fu.engagement.withFollowups} respondieron`;
      
      // Tasa de conversión
      document.getElementById('stat-conv-pct').textContent = `${fu.conversion.conversionRate}%`;
      document.getElementById('stat-conv-sub').textContent = `${fu.conversion.converted} de ${fu.conversion.total} convertidos`;
    }
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
          <td>${buildPaymentCell(p)}</td>
          <td>${getAutomationStatus(p)}</td>
          <td class="text-muted">${getTimeSinceLastContact(p)}</td>
          <td>${getClientInteraction(p)}</td>
          <td>${buildActionButtons(p)}</td>
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
window.refreshAll = function() {
  loadStats();
  loadProformas();
  loadPipeline();
};

/* ─── reset filters ──────────────────────────────────────────── */
window.resetFilters = function() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-origin').value = '';
  document.getElementById('search').value = '';
  currentFilters = { status: '', origin: '', search: '' };
  loadProformas();
};

/* ─── manual followup actions ────────────────────────────────── */
let currentFollowupData = null;

/* ─── payment cell builder ───────────────────────────────────── */
function buildPaymentCell(p) {
  const isPending = p.status === 'pending_payment' || p.status === 'pending';
  const isAccepted = p.status === 'accepted' || p.status === 'active';

  if (isAccepted) {
    // Check if hybrid payment via raw_vision_data
    return `<span class="badge" style="background:#065f46;color:#6ee7b7;font-size:10px;">✅ Pagado</span>`;
  }

  if (!isPending) {
    return `<span style="color:#64748b;font-size:11px;">—</span>`;
  }

  // Inline payment editor for pending_payment
  return `
    <div style="display:flex;flex-direction:column;gap:4px;min-width:160px;" data-payment-editor="${p.id}">
      <div style="display:flex;gap:3px;align-items:center;">
        <span style="font-size:10px;color:#94a3b8;">💵</span>
        <input type="text" inputmode="decimal" placeholder="$ Efectivo"
               data-pay-cash="${p.id}"
               style="width:75px;padding:3px 5px;border:1px solid #334155;border-radius:4px;background:#0f172a;color:#f1f5f9;font-size:11px;">
      </div>
      <div style="display:flex;gap:3px;align-items:center;">
        <span style="font-size:10px;color:#94a3b8;">🔄</span>
        <input type="text" inputmode="decimal" placeholder="$ Canje"
               data-pay-canje="${p.id}"
               style="width:75px;padding:3px 5px;border:1px solid #334155;border-radius:4px;background:#0f172a;color:#f1f5f9;font-size:11px;">
      </div>
      <input type="text" placeholder="Servicio/producto canje"
             data-pay-desc="${p.id}"
             style="width:100%;padding:3px 5px;border:1px solid #334155;border-radius:4px;background:#0f172a;color:#f1f5f9;font-size:10px;display:none;">
      <button data-action="register-payment" data-lid="${p.id}" 
        style="padding:4px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#10b981;color:#fff;border:none;cursor:pointer;width:100%;"
        title="Registrar pago (híbrido si ambos montos)">
        💰 Registrar Pago
      </button>
    </div>
  `;
}

/* ─── register hybrid payment ────────────────────────────────── */
window.registerHybridPayment = async function(leadId) {
  const cashInput  = document.querySelector(`[data-pay-cash="${leadId}"]`);
  const canjeInput = document.querySelector(`[data-pay-canje="${leadId}"]`);
  const descInput  = document.querySelector(`[data-pay-desc="${leadId}"]`);
  const btn        = document.querySelector(`[data-action="register-payment"][data-lid="${leadId}"]`);

  if (!cashInput) return;

  const cashAmount  = parseFloat((cashInput.value || '0').replace(',', '.'));
  const canjeAmount = parseFloat((canjeInput?.value || '0').replace(',', '.'));
  const canjeDesc   = descInput?.value?.trim() || '';

  if (isNaN(cashAmount) && isNaN(canjeAmount)) {
    toast('⚠️ Ingresa al menos un monto');
    return;
  }

  const totalAmount = (cashAmount || 0) + (canjeAmount || 0);
  if (totalAmount <= 0) {
    toast('⚠️ El monto total debe ser mayor a $0');
    return;
  }

  if (canjeAmount > 0 && !canjeDesc) {
    toast('⚠️ Describe el servicio/producto del canje');
    descInput.focus();
    return;
  }

  // Confirm
  const isHybrid = canjeAmount > 0;
  const confirmMsg = isHybrid
    ? `Registrar pago HÍBRIDO:\n💵 Efectivo: $${(cashAmount||0).toFixed(2)}\n🔄 Canje: $${canjeAmount.toFixed(2)} (${canjeDesc})\n💰 Total: $${totalAmount.toFixed(2)}\n\n¿Confirmar?`
    : `Registrar pago de $${totalAmount.toFixed(2)} en efectivo?\n\n¿Confirmar?`;

  if (!confirm(confirmMsg)) return;

  if (btn) { btn.disabled = true; btn.textContent = '⏳...'; }

  try {
    const r = await fetch(`${API_BASE}/api/aluna/memberships/${leadId}/register-payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cashAmount: cashAmount || 0,
        canjeAmount: canjeAmount || 0,
        canjeDescription: canjeDesc,
        paymentMethod: isHybrid ? 'mixto' : 'efectivo'
      })
    });

    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'Error registrando pago');

    const waIcon = data.waSent ? '📱✅' : '📱❌';
    const emailIcon = data.emailSent ? '📧✅' : '📧❌';
    toast(`✅ Pago registrado — $${data.totalAmount.toFixed(2)} ${isHybrid ? '(híbrido)' : ''} ${waIcon} ${emailIcon}`);

    // Refresh table
    setTimeout(() => { loadProformas(); loadPipeline(); }, 500);

  } catch (e) {
    console.error('[PAYMENT] Error:', e);
    toast(`❌ ${e.message}`);
    if (btn) { btn.disabled = false; btn.textContent = '💰 Registrar Pago'; }
  }
};

function buildActionButtons(p) {
  const d1Sent = p.followup_24h_sent_at || p.automation_d1_sent;
  const d3Sent = p.followup_3d_sent_at || p.automation_d3_sent;
  
  // Botón verde si NO enviado, gris si ya enviado
  const btnStyle = (sent) => sent 
    ? 'background:#1e293b;color:#64748b;border:1px solid #334155;opacity:0.6;cursor:not-allowed;' 
    : 'background:#10b981;color:#fff;border:none;cursor:pointer;';
  
  const btnBaseStyle = 'padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;margin:2px;';
  
  // data-action attrs en vez de onclick (evita CSP + comillas en strings)
  return `
    <div style="display:flex;flex-wrap:wrap;gap:4px;min-width:180px;">
      <button data-action="followup" data-lid="${p.id}" data-type="d1-wa"
        style="${btnBaseStyle}${btnStyle(d1Sent)}" 
        ${d1Sent ? 'disabled' : ''} 
        title="${d1Sent ? 'D+1 WhatsApp ya enviado' : 'Enviar D+1 por WhatsApp'}">
        📱 D+1
      </button>
      <button data-action="followup" data-lid="${p.id}" data-type="d1-email"
        style="${btnBaseStyle}${btnStyle(d1Sent)}" 
        ${d1Sent ? 'disabled' : ''} 
        title="${d1Sent ? 'D+1 Email ya enviado' : 'Enviar D+1 por Email'}">
        📧 D+1
      </button>
      <button data-action="followup" data-lid="${p.id}" data-type="d3-wa"
        style="${btnBaseStyle}${btnStyle(d3Sent)}" 
        ${d3Sent ? 'disabled' : ''} 
        title="${d3Sent ? 'D+3 WhatsApp ya enviado' : 'Enviar D+3 por WhatsApp (FOMO)'}">
        📱 D+3
      </button>
      <button data-action="followup" data-lid="${p.id}" data-type="d3-email"
        style="${btnBaseStyle}${btnStyle(d3Sent)}" 
        ${d3Sent ? 'disabled' : ''} 
        title="${d3Sent ? 'D+3 Email ya enviado' : 'Enviar D+3 por Email (FOMO)'}">
        📧 D+3
      </button>
    </div>
  `;
}

// Declarar función como global explícitamente para que onclick funcione
window.openFollowupModalById = function(leadId, type) {
  console.log('🔍 openFollowupModalById called:', { leadId, type });
  
  // Buscar lead en el array global
  const leadData = allProformas.find(p => p.id === leadId);
  if (!leadData) {
    console.error('❌ Lead not found:', leadId);
    toast('⚠️ Error: Lead no encontrado');
    return;
  }
  console.log('✅ Lead found:', leadData.client_name);
  
  currentFollowupData = { ...leadData, type };
  
  const modal = document.getElementById('modal-followup');
  const title = document.getElementById('followup-modal-title');
  const leadName = document.getElementById('followup-lead-name');
  const leadPlan = document.getElementById('followup-lead-plan');
  const messageBox = document.getElementById('followup-message');
  
  // Títulos según tipo
  const titles = {
    'd1-wa': '📱 Enviar Follow-up D+1 por WhatsApp',
    'd1-email': '📧 Enviar Follow-up D+1 por Email',
    'd3-wa': '📱 Enviar Follow-up D+3 por WhatsApp (FOMO)',
    'd3-email': '📧 Enviar Follow-up D+3 por Email (FOMO)'
  };
  
  title.textContent = titles[type] || 'Enviar Follow-up';
  leadName.textContent = leadData.client_name || 'Sin nombre';
  leadPlan.textContent = `${leadData.membership_type || 'Plan no especificado'} • $${leadData.monthly_fee || 0}/mes`;
  
  // Templates de mensajes
  const templates = {
    'd1-wa': `Hola {{nombre}} 👋

¿Cómo estás? Te escribo de Coworkia.

Ayer charlamos sobre {{plan}} y quería asegurarme de que recibiste toda la información que necesitas 📋

Aquí te dejo nuevamente tu proforma personalizada: [link]

¿Tienes alguna duda? Estoy para ayudarte 😊

¡Que tengas un gran día!`,
    'd1-email': `Hola {{nombre}},

Espero que estés muy bien.

Te contacto desde Coworkia para hacer seguimiento a tu interés en {{plan}}.

Adjunto encontrarás tu proforma personalizada con todos los detalles:
- Precio mensual: {{mensualidad}}
- Beneficios incluidos
- Términos y condiciones

¿Podemos agendar una visita a nuestras instalaciones esta semana?

Quedo atento a tus comentarios.

Saludos,
Equipo Coworkia`,
    'd3-wa': `{{nombre}}, últimas disponibilidades! 🔥

Este mes tenemos una promoción especial:
🎁 Primer mes con 20% de descuento

Pero solo nos quedan 2 espacios y ya varios clientes interesados.

¿Hablamos hoy? Te reservo uno antes de que se agoten 👀

Responde "Sí" y coordinamos una visita para esta semana 📅`,
    'd3-email': `Hola {{nombre}},

**Últimas disponibilidades para {{plan}}**

Te contacto porque nos quedan muy pocos espacios disponibles este mes y recuerdo tu interés.

**Oferta limitada:**
• 20% de descuento primer mes
• Sin costo de inscripción
• Válido solo esta semana

Tenemos 2 clientes más interesados en los últimos espacios.

¿Te gustaría agendar una visita hoy o mañana?

Saludos,
Equipo Coworkia`
  };
  
  messageBox.value = templates[type] || 'Mensaje no disponible';
  console.log('✅ Modal opening with display:block');
  modal.style.display = 'block';
};

window.closeFollowupModal = function() {
  document.getElementById('modal-followup').style.display = 'none';
  currentFollowupData = null;
};

window.sendFollowupManual = async function() {
  if (!currentFollowupData) return;
  
  const message = document.getElementById('followup-message').value.trim();
  if (!message) {
    toast('⚠️ El mensaje no puede estar vacío');
    return;
  }
  
  const sendBtn = document.getElementById('btn-send-followup');
  const loadingDiv = document.getElementById('followup-sending');
  
  sendBtn.disabled = true;
  sendBtn.style.opacity = '0.6';
  loadingDiv.style.display = 'block';
  
  try {
    // Reemplazar variables
    let finalMessage = message
      .replace(/\{\{nombre\}\}/g, currentFollowupData.client_name || 'Cliente')
      .replace(/\{\{plan\}\}/g, currentFollowupData.membership_type || 'Plan')
      .replace(/\{\{mensualidad\}\}/g, `$${currentFollowupData.monthly_fee || 0}`)
      .replace(/\{\{email\}\}/g, currentFollowupData.email || '')
      .replace(/\{\{phone\}\}/g, currentFollowupData.user_phone || '');
    
    // Determinar endpoint según tipo
    const endpoints = {
      'd1-wa': '/api/aluna/send-d1-whatsapp',
      'd1-email': '/api/aluna/send-d1-email',
      'd3-wa': '/api/aluna/send-d3-whatsapp',
      'd3-email': '/api/aluna/send-d3-email'
    };
    
    const endpoint = endpoints[currentFollowupData.type];
    if (!endpoint) {
      toast('❌ Tipo de follow-up no válido');
      return;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: currentFollowupData.id,
        membershipCode: currentFollowupData.membership_code,
        userPhone: currentFollowupData.user_phone,
        email: currentFollowupData.email,
        name: currentFollowupData.client_name || '',
        plan: currentFollowupData.membership_type || '',
        message: finalMessage
      })
    });
    
    const result = await response.json();
    
    if (result.success || result.ok) {
      toast('✅ Follow-up enviado correctamente');
      closeFollowupModal();
      setTimeout(() => loadProformas(), 1000); // Recargar tabla
    } else {
      toast(`❌ Error: ${result.error || 'Desconocido'}`);
    }
    
  } catch (error) {
    console.error('[FOLLOWUP] Error:', error);
    toast(`❌ Error de red: ${error.message}`);
  } finally {
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
    loadingDiv.style.display = 'none';
  }
}

/* ─── campaign modal ─────────────────────────────────────────── */
let campaignChannel = 'whatsapp';
let campaignPreviewLeads = [];

window.openCampaignModal = function() {
  console.log('🎯 openCampaignModal called');
  const modal = document.getElementById('modal-campaign');
  modal.style.display = 'block';
  
  // Reset defaults
  document.getElementById('campaign-name').value = '';
  document.getElementById('campaign-filter').value = 'pending';
  document.getElementById('campaign-message').value = '';
  campaignChannel = 'whatsapp';
  selectCampaignChannel('whatsapp');
  
  // Load preview
  updateCampaignPreview();
}

window.closeCampaignModal = function() {
  document.getElementById('modal-campaign').style.display = 'none';
};

window.selectCampaignChannel = function(channel) {
  campaignChannel = channel;
  const waBtn = document.getElementById('campaign-channel-wa');
  const emailBtn = document.getElementById('campaign-channel-email');
  
  if (channel === 'whatsapp') {
    waBtn.style.background = '#10b981';
    waBtn.style.color = '#fff';
    waBtn.style.border = 'none';
    emailBtn.style.background = '#1e293b';
    emailBtn.style.color = '#94a3b8';
    emailBtn.style.border = '1px solid #334155';
  } else {
    emailBtn.style.background = '#10b981';
    emailBtn.style.color = '#fff';
    emailBtn.style.border = 'none';
    waBtn.style.background = '#1e293b';
    waBtn.style.color = '#94a3b8';
    waBtn.style.border = '1px solid #334155';
  }
}

window.updateCampaignPreview = async function() {
  const filter = document.getElementById('campaign-filter').value;
  const countEl = document.getElementById('campaign-preview-count');
  const finalCountEl = document.getElementById('campaign-final-count');
  const previewBox = document.getElementById('campaign-preview-box');
  const previewMsg = document.getElementById('campaign-preview-message');
  
  countEl.textContent = 'Calculando audiencia...';
  countEl.style.color = '#3b82f6';
  
  try {
    const response = await fetch(`/api/aluna/campaigns/preview?filter=${filter}`);
    const data = await response.json();
    
    if (data.ok) {
      campaignPreviewLeads = data.leads || [];
      const count = data.count || 0;
      
      countEl.textContent = `✅ ${count} lead${count !== 1 ? 's' : ''} recibirán este mensaje`;
      countEl.style.color = '#10b981';
      finalCountEl.textContent = count;
      
      // Show preview with first lead
      if (campaignPreviewLeads.length > 0) {
        const firstLead = campaignPreviewLeads[0];
        const messageTemplate = document.getElementById('campaign-message').value;
        
        if (messageTemplate) {
          const previewText = messageTemplate
            .replace(/\{\{nombre\}\}/g, firstLead.client_name || 'Cliente')
            .replace(/\{\{plan\}\}/g, firstLead.membership_type || 'Plan')
            .replace(/\{\{mensualidad\}\}/g, `$${firstLead.monthly_fee || 0}`)
            .replace(/\{\{email\}\}/g, firstLead.email || '')
            .replace(/\{\{phone\}\}/g, firstLead.user_phone || '');
          
          previewMsg.textContent = previewText;
          previewBox.style.display = 'block';
        }
      } else {
        previewBox.style.display = 'none';
      }
      
    } else {
      countEl.textContent = '⚠️ Error al calcular audiencia';
      countEl.style.color = '#f87171';
    }
    
  } catch (error) {
    console.error('[CAMPAIGN] Error preview:', error);
    countEl.textContent = '❌ Error de conexión';
    countEl.style.color = '#f87171';
  }
}

window.createAndSendCampaign = async function() {
  const name = document.getElementById('campaign-name').value.trim();
  const filter = document.getElementById('campaign-filter').value;
  const message = document.getElementById('campaign-message').value.trim();
  
  if (!name) {
    toast('⚠️ Por favor ingresa un nombre para la campaña');
    return;
  }
  
  if (!message) {
    toast('⚠️ El mensaje no puede estar vacío');
    return;
  }
  
  if (campaignPreviewLeads.length === 0) {
    toast('⚠️ No hay leads en la audiencia seleccionada');
    return;
  }
  
  const confirmMsg = `¿Enviar campaña a ${campaignPreviewLeads.length} leads por ${campaignChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}?`;
  if (!confirm(confirmMsg)) return;
  
  const sendBtn = document.getElementById('btn-create-campaign');
  const loadingDiv = document.getElementById('campaign-sending');
  const progressDiv = document.getElementById('campaign-progress');
  
  sendBtn.disabled = true;
  sendBtn.style.opacity = '0.6';
  loadingDiv.style.display = 'block';
  progressDiv.textContent = '';
  
  try {
    // 1. Create campaign
    const createResponse = await fetch('/api/aluna/campaigns/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        messageTemplate: message,
        targetFilter: filter,
        channel: campaignChannel
      })
    });
    
    const createResult = await createResponse.json();
    
    if (!createResult.ok) {
      toast(`❌ Error al crear campaña: ${createResult.error}`);
      return;
    }
    
    const campaignId = createResult.campaignId;
    progressDiv.textContent = `Campaña creada. Enviando a ${campaignPreviewLeads.length} leads...`;
    
    // 2. Send campaign
    const sendResponse = await fetch('/api/aluna/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        leads: campaignPreviewLeads,
        message,
        channel: campaignChannel
      })
    });
    
    const sendResult = await sendResponse.json();
    
    if (sendResult.ok) {
      toast(`✅ Campaña enviada a ${sendResult.sentCount} leads correctamente`);
      closeCampaignModal();
      setTimeout(() => loadProformas(), 1000);
    } else {
      toast(`❌ Error al enviar: ${sendResult.error}`);
    }
    
  } catch (error) {
    console.error('[CAMPAIGN] Error:', error);
    toast(`❌ Error de red: ${error.message}`);
  } finally {
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
    loadingDiv.style.display = 'none';
  }
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

/* ─── event delegation — botones dinámicos (D+1, D+3, convert, wanow, payment) ─── */
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.disabled) return;
  const action = btn.dataset.action;
  if (action === 'followup') {
    openFollowupModalById(btn.dataset.lid, btn.dataset.type);
  } else if (action === 'convert') {
    convertProspect(btn.dataset.phone, btn);
  } else if (action === 'wanow') {
    sendWANow(btn.dataset.phone, btn);
  } else if (action === 'pipeline-d1-wa') {
    sendD1WA(btn.dataset.lid, btn.dataset.phone, btn.dataset.name, btn.dataset.plan, btn);
  } else if (action === 'pipeline-d3-wa') {
    sendD3WA(btn.dataset.lid, btn.dataset.phone, btn.dataset.name, btn.dataset.plan, btn);
  } else if (action === 'register-payment') {
    registerHybridPayment(btn.dataset.lid);
  }
});

/* ─── show/hide canje description when canje amount entered ──── */
document.addEventListener('input', function(e) {
  const canjeInput = e.target.closest('[data-pay-canje]');
  if (!canjeInput) return;
  const lid = canjeInput.dataset.payCanje;
  const descInput = document.querySelector(`[data-pay-desc="${lid}"]`);
  if (descInput) {
    const val = parseFloat((canjeInput.value || '0').replace(',', '.'));
    descInput.style.display = val > 0 ? 'block' : 'none';
  }
});

/* ─── static button listeners (reemplaza onclick en HTML, CSP-safe) ───── */
(function initButtons() {
  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
  });

  // Funnel stages (id: fs-captado, fs-d1, fs-d3, fs-conv)
  const stageMap = { 'fs-captado': 'captado', 'fs-d1': 'd1', 'fs-d3': 'd3', 'fs-conv': 'converted' };
  document.querySelectorAll('.funnel-stage').forEach(el => {
    el.addEventListener('click', function() { const s = stageMap[this.id]; if (s) filterByStage(s); });
  });

  // Botones de acción
  bind('btn-open-campaign',   () => openCampaignModal());
  bind('btn-reset-filters',   () => resetFilters());
  bind('btn-clear-stage',     () => clearStageFilter());
  bind('btn-open-prospect',   () => openAddProspectModal());
  bind('fab-refresh',         () => refreshAll());
  bind('btn-submit-prospect', () => submitAddProspect());
  bind('btn-close-prospect',  () => closeProspectModal());
  bind('btn-send-followup',   () => sendFollowupManual());
  bind('btn-close-followup',  () => closeFollowupModal());
  bind('campaign-channel-wa',    () => selectCampaignChannel('whatsapp'));
  bind('campaign-channel-email', () => selectCampaignChannel('email'));
  bind('btn-create-campaign', () => createAndSendCampaign());
  bind('btn-close-campaign',  () => closeCampaignModal());

  // Toggle seq (necesita referencia al botón mismo)
  const seqBtn = document.getElementById('btn-toggle-seq');
  if (seqBtn) seqBtn.addEventListener('click', function() { toggleSeq(seqBtn); });

  // Campaign filter change
  const cf = document.getElementById('campaign-filter');
  if (cf) cf.addEventListener('change', () => updateCampaignPreview());
})();

loadProformas();
loadPipeline();

setInterval(() => { loadStats(); loadPipeline(); }, 30000);

/* ─── prospect modal (añadir al pipeline) ────────────────────── */
window.openAddProspectModal = function() {
  console.log('➕ openAddProspectModal called');
  const modal = document.getElementById('modal-prospect');
  if (!modal) { console.error('modal-prospect not found'); return; }
  modal.style.display = 'block';
  // Reset todos los campos del form
  const p = (id) => document.getElementById(id);
  if (p('mp-phone')) p('mp-phone').value = '';
  if (p('mp-name')) p('mp-name').value = '';
  if (p('mp-plan')) p('mp-plan').value = 'Plan 20';
  if (p('mp-code')) p('mp-code').value = '';
  if (p('mp-email')) p('mp-email').value = '';
  if (p('mp-converted')) p('mp-converted').checked = false;
};

window.closeProspectModal = function() {
  const modal = document.getElementById('modal-prospect');
  if (modal) {
    modal.style.display = 'none';
  }
};

window.submitAddProspect = async function() {
  const phone = document.getElementById('mp-phone').value.trim();
  const name = document.getElementById('mp-name').value.trim();
  const plan = document.getElementById('mp-plan').value;
  
  if (!phone) {
    toast('⚠️ El teléfono es obligatorio');
    return;
  }
  
  if (!name) {
    toast('⚠️ El nombre es obligatorio');
    return;
  }
  
  try {
    const response = await fetch('/api/aluna/prospect/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPhone: phone,
        userName: name,
        membershipType: plan
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      toast('✅ Prospecto registrado correctamente');
      closeProspectModal();
      setTimeout(() => {
        loadProformas();
        loadPipeline();
      }, 500);
    } else {
      toast(`❌ Error: ${result.error || 'Desconocido'}`);
    }
    
  } catch (error) {
    console.error('[PROSPECT] Error:', error);
    toast(`❌ Error de red: ${error.message}`);
  }
};

/* ─── automatizaciones ────────────────────────────────────── */

async function loadAutomationStats() {
  try {
    const res = await fetch(`${API_BASE}/api/aluna/automations/stats`);
    const data = await res.json();
    if (!data.ok || !data.stats) return;

    const grid = document.getElementById('automations-grid');
    if (!grid) return;

    let html = '';
    for (const [key, s] of Object.entries(data.stats)) {
      const active = (s.total || 0) > 0;
      const badge = active
        ? '<span style="background:#064e3b;color:#34d399;padding:2px 8px;border-radius:10px;font-size:11px;">✅ Activo</span>'
        : '<span style="background:#1e293b;color:#64748b;padding:2px 8px;border-radius:10px;font-size:11px;">⏸ Sin datos</span>';

      const lastStr = s.lastSent
        ? new Date(s.lastSent).toLocaleString('es-EC', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
        : '—';

      html += `
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:18px;transition:border-color .2s;" onmouseover="this.style.borderColor='#334155'" onmouseout="this.style.borderColor='#1e293b'">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span style="font-size:20px;">${s.icon || '⚙️'}</span>
            ${badge}
          </div>
          <div style="color:#e2e8f0;font-weight:600;font-size:14px;margin-bottom:4px;">${s.label}</div>
          <div style="color:#64748b;font-size:12px;margin-bottom:14px;">🕐 ${s.schedule || '—'}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">
            ${s.today !== undefined ? `<div><div style="color:#34d399;font-size:18px;font-weight:700;">${s.today}</div><div style="color:#64748b;font-size:10px;">Hoy</div></div>` : ''}
            ${s.week !== undefined ? `<div><div style="color:#38bdf8;font-size:18px;font-weight:700;">${s.week}</div><div style="color:#64748b;font-size:10px;">Semana</div></div>` : ''}
            <div><div style="color:#a78bfa;font-size:18px;font-weight:700;">${s.total || 0}</div><div style="color:#64748b;font-size:10px;">Total</div></div>
          </div>
          <div style="color:#475569;font-size:11px;margin-top:10px;border-top:1px solid #1e293b;padding-top:8px;">Último: ${lastStr}</div>
        </div>`;
    }

    grid.innerHTML = html;
  } catch (err) {
    console.warn('[ALUNA-DASH] No se pudieron cargar automation stats:', err.message);
  }
}

/* ─── end ───────────────────────────────────────────────────── */
// Estado de la aplicación -- LEGACY (removed)
