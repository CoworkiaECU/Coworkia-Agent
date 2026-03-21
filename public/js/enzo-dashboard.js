/**
 * 🎯 Enzo Dashboard - Frontend JavaScript
 * MarketingLab Proyectos Dashboard
 */

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
    if (!result.ok) { alert(`Error: ${result.error || 'No se pudo actualizar'}`); return; }
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
  // Cargar dashboard inicial
  loadDashboard();
  
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

  // Event delegation para acciones en tabla
  const table = document.getElementById('projects-list').closest('table') || document.querySelector('table tbody');
  document.addEventListener('change', e => {
    const sel = e.target.closest('.status-select');
    if (sel) updateStatus(sel.dataset.code, sel.value);
  });
  document.addEventListener('click', e => {
    const btn = e.target.closest('.reminder-btn');
    if (btn) sendReminder(btn.dataset.code, btn);
  });
});
