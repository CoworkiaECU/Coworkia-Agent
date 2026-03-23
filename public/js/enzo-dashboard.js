/**
 * 🎯 Enzo Dashboard - Frontend JavaScript
 * MarketingLab Proyectos Dashboard
 */

function showToast(msg, type = 'error') {
  const container = document.getElementById('toast-container') || document.body;
  const t = document.createElement('div');
  const bg = type === 'success' ? '#059669' : type === 'info' ? '#0369a1' : '#dc2626';
  t.className = 'toast ' + type;
  t.style.cssText = `background:${bg};color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;max-width:380px;box-shadow:0 4px 12px rgba(0,0,0,.4);line-height:1.4;`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

const API_BASE = window.location.origin;

// ═══ STATE ═══════════════════════════════════════════════════════════════════
let allProjects = [];
let currentFilters = {
  status: '',
  urgency: '',
  projectType: '',
  search: ''
};

// ═══ FORMATTING FUNCTIONS ═══════════════════════════════════════════════════

/**
 * Formatear fecha relativa
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    
    return date.toLocaleDateString('es-EC', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch (e) {
    return '-';
  }
}

/**
 * Formatear precio
 */
function formatPrice(amount) {
  if (!amount || amount === 0) return '-';
  return `$${parseFloat(amount).toFixed(2)}`;
}

/**
 * Obtener badge de urgencia
 */
function getUrgencyBadge(urgency) {
  const urgencyMap = {
    'Urgente': { cls: 'badge-urgente',  text: '🔥 Urgente' },
    'Medium':  { cls: 'badge-medium',   text: '⚡ Media' },
    'Normal':  { cls: 'badge-normal-u', text: '📅 Normal' }
  };
  const badge = urgencyMap[urgency] || { cls: 'badge-normal-u', text: urgency || 'Normal' };
  return `<span class="badge ${badge.cls}">${badge.text}</span>`;
}

/**
 * Obtener badge de estado
 */
function getStatusBadge(status) {
  const statusMap = {
    'pending':           { cls: 'badge-pending',           text: '⏳ Pendiente' },
    'meeting_scheduled': { cls: 'badge-meeting_scheduled', text: '📅 Reunión' },
    'proposal_sent':     { cls: 'badge-proposal_sent',     text: '📧 Propuesta' },
    'accepted':          { cls: 'badge-accepted',          text: '✅ Aceptado' },
    'negotiating':       { cls: 'badge-negotiating',       text: '💬 Negociando' },
    'cancelled':         { cls: 'badge-cancelled',         text: '❌ Cancelado' }
  };
  const badge = statusMap[status] || { cls: 'badge-pending', text: status || 'Pendiente' };
  return `<span class="badge ${badge.cls}">${badge.text}</span>`;
}

/**
 * Actualizar pipeline KPIs desde allProjects
 */
function updatePipeline(projects) {
  document.getElementById('pipe-active').textContent    = projects.filter(p => p.status === 'pending').length;
  document.getElementById('pipe-24h').textContent       = projects.filter(p => p.status === 'meeting_scheduled').length;
  document.getElementById('pipe-3d').textContent        = projects.filter(p => ['proposal_sent','negotiating'].includes(p.status)).length;
  document.getElementById('pipe-converted').textContent = projects.filter(p => p.status === 'accepted').length;
}
// ═══ UPDATE STATUS ════════════════════════════════════════════════════════════════════════
async function updateStatus(code, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/api/enzo/projects/${code}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const result = await res.json();
    if (!result.ok) { showToast(result.error || 'No se pudo actualizar'); return; }
    const p = allProjects.find(p => p.project_code === code);
    if (p) p.status = newStatus;
    updatePipeline(allProjects);
  } catch (err) { console.error('[ENZO-DASH] updateStatus error:', err); }
}

// ═══ SEND REMINDER ════════════════════════════════════════════════════════════════════
async function sendReminder(code, btn) {
  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';
  try {
    const res = await fetch(`${API_BASE}/api/enzo/projects/${code}/send-reminder`, { method: 'POST' });
    const d = await res.json();
    if (d.ok) {
      btn.textContent = '✅ Enviado';
      setTimeout(() => { btn.textContent = '📲 Recordatorio'; btn.disabled = false; }, 3000);
    } else {
      const msg = d.error === 'TEST_LEAD' ? '📵 Lead de prueba — el teléfono del cliente aún no está registrado'
                : d.error === 'NO_CLIENT_PHONE' ? '📱 Sin teléfono del cliente — no se puede enviar'
                : `❌ ${d.error}`;
      showToast(msg);
      btn.textContent = '📲 Recordatorio';
      btn.disabled = false;
    }
  } catch (err) {
    showToast(`❌ ${err.message}`);
    btn.textContent = '📲 Recordatorio';
    btn.disabled = false;
  }
}
// ═══ DATA LOADING ════════════════════════════════════════════════════════════

/**
 * Cargar dashboard completo
 */
async function loadDashboard() {
  try {
    // Stats desde /dashboard (métricas de mes/semana) + todos los proyectos desde /projects
    const [dashResponse, projectsResponse] = await Promise.all([
      fetch(`${API_BASE}/api/enzo/dashboard`),
      fetch(`${API_BASE}/api/enzo/projects`)
    ]);

    const dashResult = await dashResponse.json();
    const projectsResult = await projectsResponse.json();

    if (!dashResult.success) {
      throw new Error(dashResult.error || 'Error desconocido');
    }

    const { month } = dashResult.data;

    // Actualizar stats
    document.getElementById('stat-month-projects').textContent = month.totalProjects || 0;
    document.getElementById('stat-proposals').textContent = month.proposals || 0;
    document.getElementById('stat-accepted').textContent = month.accepted || 0;
    document.getElementById('stat-revenue').textContent = formatPrice(month.revenue);

    // Guardar TODOS los proyectos (sin límite de 10)
    allProjects = (projectsResult.success ? projectsResult.data : dashResult.data.topProjects) || [];

    // Renderizar proyectos y pipeline
    renderProjects(allProjects);
    updatePipeline(allProjects);

  } catch (error) {
    console.error('[ENZO-DASH] Error:', error);
    document.getElementById('projects-list').innerHTML = `
      <tr><td colspan="8" class="error">❌ Error al cargar proyectos: ${error.message}</td></tr>`;
  }
}

/**
 * Renderizar proyectos en la tabla
 */
function renderProjects(projects) {
  const container = document.getElementById('projects-list');
  document.getElementById('table-count').textContent = `${projects?.length || 0} registro${(projects?.length || 0) !== 1 ? 's' : ''}`;

  if (!projects || projects.length === 0) {
    container.innerHTML = `<tr><td colspan="8" class="empty">No hay proyectos que coincidan con los filtros.</td></tr>`;
    return;
  }

  container.innerHTML = projects.map(project => `
    <tr>
      <td><span class="code">${project.project_code || '-'}</span></td>
      <td>
        <div class="client-name">${project.client_name || '-'}</div>
        ${project.company ? `<div class="client-sub">🏢 ${project.company}</div>` : ''}
        ${project.email   ? `<div class="client-sub">✉️ ${project.email}</div>` : ''}
      </td>
      <td>${project.project_type || '-'}</td>
      <td>${getUrgencyBadge(project.urgency)}</td>
      <td>${getStatusBadge(project.status)}</td>
      <td><span class="amount">${formatPrice(project.proposal_amount)}</span></td>
      <td><span class="date-cell">${formatDate(project.created_at)}</span></td>
      <td>
        <select class="status-select" data-code="${project.project_code}">
          <option value="pending"           ${project.status==='pending'           ?'selected':''}>⏳ Pendiente</option>
          <option value="meeting_scheduled" ${project.status==='meeting_scheduled' ?'selected':''}>📅 Reunión</option>
          <option value="proposal_sent"     ${project.status==='proposal_sent'     ?'selected':''}>📧 Propuesta</option>
          <option value="accepted"          ${project.status==='accepted'          ?'selected':''}>✅ Aceptado</option>
          <option value="negotiating"       ${project.status==='negotiating'       ?'selected':''}>💬 Negociando</option>
          <option value="cancelled"         ${project.status==='cancelled'         ?'selected':''}>❌ Cancelado</option>
        </select>
        <button class="reminder-btn" data-code="${project.project_code}">📲 Recordatorio</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Aplicar filtros a los proyectos
 */
function applyFilters() {
  let filtered = [...allProjects];
  
  // Filtro de estado
  if (currentFilters.status) {
    filtered = filtered.filter(p => p.status === currentFilters.status);
  }
  
  // Filtro de urgencia
  if (currentFilters.urgency) {
    filtered = filtered.filter(p => p.urgency === currentFilters.urgency);
  }
  
  // Filtro de tipo de proyecto
  if (currentFilters.projectType) {
    filtered = filtered.filter(p => p.project_type === currentFilters.projectType);
  }
  
  // Búsqueda por texto
  if (currentFilters.search) {
    const searchLower = currentFilters.search.toLowerCase();
    filtered = filtered.filter(p => 
      (p.company || '').toLowerCase().includes(searchLower) ||
      (p.client_name || '').toLowerCase().includes(searchLower) ||
      (p.email || '').toLowerCase().includes(searchLower) ||
      (p.project_code || '').toLowerCase().includes(searchLower)
    );
  }
  
  renderProjects(filtered);
}

// ═══ EVENT LISTENERS ═════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Restore last active tab — this also triggers lazy-load for the active tab
  const savedTab = localStorage.getItem('enzo-active-tab') || 'followups';
  switchMainTab(savedTab, /* noSave */ true);
  
  // Filtro de estado
  document.getElementById('filter-status').addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    applyFilters();
  });
  
  // Filtro de urgencia
  document.getElementById('filter-urgency').addEventListener('change', (e) => {
    currentFilters.urgency = e.target.value;
    applyFilters();
  });
  
  // Filtro de tipo
  document.getElementById('filter-type').addEventListener('change', (e) => {
    currentFilters.projectType = e.target.value;
    applyFilters();
  });
  
  // Búsqueda con debounce
  let searchTimeout;
  document.getElementById('search').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => applyFilters(), 500);
  });
  
  // Auto-refresh cada 60 segundos
  setInterval(loadDashboard, 60000);

  // Event delegation para acciones en tabla proyectos
  document.addEventListener('change', e => {
    const sel = e.target.closest('.status-select');
    if (sel && sel.closest('#tab-proyectos')) updateStatus(sel.dataset.code, sel.value);
  });
  document.addEventListener('click', e => {
    const btn = e.target.closest('.reminder-btn');
    if (btn && btn.closest('#tab-proyectos')) sendReminder(btn.dataset.code, btn);
  });

  // Follow-ups tab filters
  const fuFilters = document.getElementById('fu-status-filters');
  if (fuFilters) {
    fuFilters.addEventListener('click', e => {
      const pill = e.target.closest('[data-status]');
      if (!pill) return;
      fuFilters.querySelectorAll('[data-status]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      fuActiveStatus = pill.dataset.status;
      loadLeads();
    });
  }

  let fuSearchTimeout;
  const fuSearchEl = document.getElementById('fu-search');
  if (fuSearchEl) {
    fuSearchEl.addEventListener('input', e => {
      fuSearchTerm = e.target.value;
      clearTimeout(fuSearchTimeout);
      fuSearchTimeout = setTimeout(() => renderLeads(), 300);
    });
  }

  // Event delegation for leads table actions
  document.addEventListener('change', e => {
    const sel = e.target.closest('.fu-status-select');
    if (sel) updateLeadStatus(sel.dataset.code, sel.value, sel);
  });
  document.addEventListener('click', e => {
    const btn = e.target.closest('.fu-reminder-btn');
    if (btn) sendLeadReminder(btn.dataset.code, btn);
  });
});

// ═══ MAIN TAB SWITCHING ═══════════════════════════════════════════════════════

let _proyectosLoaded = false;

window.switchMainTab = function(tab, noSave) {
  const tabs = ['proyectos', 'followups'];
  tabs.forEach(t => {
    const btn = document.getElementById(`etab-${t}`);
    const content = document.getElementById(`tab-${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
    if (content) content.style.display = t === tab ? 'block' : 'none';
  });

  if (!noSave) localStorage.setItem('enzo-active-tab', tab);

  // Lazy-load on first activation of each tab
  if (tab === 'followups' && !_leadsLoaded) {
    _leadsLoaded = true;
    loadLeads();
  }
  if (tab === 'proyectos' && !_proyectosLoaded) {
    _proyectosLoaded = true;
    loadDashboard();
  }
};

// ═══ FOLLOW-UPS TAB STATE + FUNCTIONS ════════════════════════════════════════

let allLeads = [];
let fuActiveStatus = '';
let fuSearchTerm = '';
let _leadsLoaded = false;

const FU_STATUS_LABELS = {
  pending:          '⏳ Pendiente',
  meeting_scheduled:'📅 Reunión',
  proposal_sent:    '📧 Propuesta',
  negotiating:      '🤝 Negociando',
  accepted:         '✅ Aceptado',
  completed:        '✅ Completado',
  cancelled:        '❌ Cancelado'
};

async function loadLeads() {
  const tbody = document.getElementById('leads-tbody');
  if (tbody) tbody.innerHTML = `<tr class="leads-state loading-state"><td colspan="9">🔄 Cargando follow-ups...</td></tr>`;
  try {
    const url = `/api/enzo/projects${fuActiveStatus ? `?status=${fuActiveStatus}` : ''}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error desconocido');
    allLeads = json.data || [];
    renderLeads();
    updateLeadKPIs();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr class="leads-state error-state"><td colspan="9">❌ Error: ${err.message}</td></tr>`;
  }
}

function updateLeadKPIs() {
  const now = Date.now();
  const H = 3600000;
  const withProp = allLeads.filter(l => l.proposal_sent_at);
  const d1p = withProp.filter(l => !l.followup_d1_sent_at && now - new Date(l.proposal_sent_at).getTime() >= 24*H);
  const d3p = withProp.filter(l => l.followup_d1_sent_at && !l.followup_d3_sent_at && now - new Date(l.proposal_sent_at).getTime() >= 72*H);
  const d7p = withProp.filter(l => l.followup_d3_sent_at && !l.followup_d7_sent_at && now - new Date(l.proposal_sent_at).getTime() >= 168*H);
  const accepted = allLeads.filter(l => l.status === 'accepted' || l.status === 'completed');
  const el = id => document.getElementById(id);
  if (el('fu-stat-total'))    el('fu-stat-total').textContent    = allLeads.length;
  if (el('fu-stat-d1'))       el('fu-stat-d1').textContent       = d1p.length;
  if (el('fu-stat-d3'))       el('fu-stat-d3').textContent       = d3p.length;
  if (el('fu-stat-d7'))       el('fu-stat-d7').textContent       = d7p.length;
  if (el('fu-stat-accepted')) el('fu-stat-accepted').textContent = accepted.length;
}

function renderLeads() {
  const tbody = document.getElementById('leads-tbody');
  if (!tbody) return;
  const q = fuSearchTerm.toLowerCase();
  const filtered = allLeads.filter(l => {
    if (!q) return true;
    return (l.client_name||'').toLowerCase().includes(q) ||
           (l.company||'').toLowerCase().includes(q) ||
           (l.project_code||'').toLowerCase().includes(q) ||
           (l.project_type||'').toLowerCase().includes(q);
  });
  const countEl = document.getElementById('fu-count');
  if (countEl) countEl.textContent = filtered.length === allLeads.length ? `${filtered.length} leads` : `${filtered.length} de ${allLeads.length}`;
  if (!filtered.length) {
    tbody.innerHTML = `<tr class="leads-state"><td colspan="9">Sin resultados para los filtros aplicados.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(l => buildLeadRow(l)).join('');
}

function buildLeadRow(l) {
  const initials = ((l.client_name||'E').split(' ').map(w=>w[0]).join('').substring(0,2)).toUpperCase();
  const hasProp = !!l.proposal_sent_at;
  const d1c = fuChip(hasProp, l.followup_d1_sent_at);
  const d3c = fuChip(hasProp && !!l.followup_d1_sent_at, l.followup_d3_sent_at);
  const d7c = fuChip(hasProp && !!l.followup_d3_sent_at, l.followup_d7_sent_at);
  const precio = l.proposal_amount
    ? `<div class="proposal-amount">$${parseFloat(l.proposal_amount).toLocaleString('es-EC',{minimumFractionDigits:0})}</div>`
    : l.budget_range ? `<div class="budget-range">${l.budget_range}</div>` : `<div class="budget-range">—</div>`;
  const badgeCls = `badge badge-${l.status||'pending'}`;
  const badgeLbl = FU_STATUS_LABELS[l.status] || l.status || '—';
  const creado = l.created_at ? new Date(l.created_at).toLocaleDateString('es-EC',{day:'2-digit',month:'short'}) : '—';
  const opts = Object.entries(FU_STATUS_LABELS).map(([v,lbl]) =>
    `<option value="${v}" ${l.status===v?'selected':''}>${lbl}</option>`).join('');
  return `
    <tr id="lead-row-${l.project_code}">
      <td>
        <div class="client-cell">
          <div class="client-avatar">${initials}</div>
          <div>
            <div class="client-name">${l.client_name||'—'}</div>
            <div class="client-company">${l.company||''}</div>
            <div class="project-code">${l.project_code||''}</div>
          </div>
        </div>
      </td>
      <td>${l.project_type||'—'}</td>
      <td>${precio}</td>
      <td class="center">${d1c}</td>
      <td class="center">${d3c}</td>
      <td class="center">${d7c}</td>
      <td><span class="${badgeCls}">${badgeLbl}</span></td>
      <td style="min-width:240px;">
        <div style="display:flex;gap:6px;align-items:center;">
          <select class="status-select fu-status-select" data-code="${l.project_code}">${opts}</select>
          <button class="reminder-btn fu-reminder-btn" data-code="${l.project_code}" data-tip="Enviar WhatsApp">📲</button>
        </div>
      </td>
      <td style="white-space:nowrap;color:#94a3b8;font-size:12px;">${creado}</td>
    </tr>`;
}

function fuChip(applicable, sentAt) {
  if (!applicable) return `<span class="fu-chip fu-na">—</span>`;
  if (sentAt)      return `<span class="fu-chip fu-sent" title="${new Date(sentAt).toLocaleDateString('es-EC')}">✅</span>`;
  return `<span class="fu-chip fu-pending">⏳</span>`;
}

async function updateLeadStatus(code, status, selectEl) {
  selectEl.disabled = true;
  try {
    const res = await fetch(`/api/enzo/projects/${code}/status`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error');
    const row = document.getElementById(`lead-row-${code}`);
    if (row) {
      const badge = row.querySelector('.badge');
      if (badge) { badge.className = `badge badge-${status}`; badge.textContent = FU_STATUS_LABELS[status]||status; }
    }
    const lead = allLeads.find(l => l.project_code === code);
    if (lead) lead.status = status;
  } catch (err) {
    showToast(`Error al actualizar estado: ${err.message}`);
  } finally {
    selectEl.disabled = false;
  }
}

async function sendLeadReminder(code, btn) {
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = '⏳';
  try {
    const res = await fetch(`/api/enzo/leads/${code}/send-followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const d = await res.json();
    if (d.ok) {
      btn.textContent = '✅';
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
    } else {
      const msg = d.error === 'TEST_LEAD' ? '📵 Lead de prueba — teléfono no registrado'
                : d.error === 'NO_CLIENT_PHONE' ? '📱 Sin teléfono del cliente'
                : `❌ ${d.error}`;
      showToast(msg);
      btn.textContent = orig;
      btn.disabled = false;
    }
  } catch (err) {
    showToast(`❌ ${err.message}`);
    btn.textContent = orig;
    btn.disabled = false;
  }
}

window.refreshLeads = () => loadLeads();
