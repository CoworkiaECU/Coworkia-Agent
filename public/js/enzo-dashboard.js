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
    'Urgente': { class: 'urgency-urgent', text: '🔥 Urgente' },
    'Medium': { class: 'urgency-medium', text: '⚡ Media' },
    'Normal': { class: 'urgency-normal', text: '📅 Normal' }
  };
  
  const badge = urgencyMap[urgency] || { class: 'urgency-normal', text: urgency || 'Normal' };
  return `<div class="urgency-badge ${badge.class}">${badge.text}</div>`;
}

/**
 * Obtener badge de estado
 */
function getStatusBadge(status) {
  const statusMap = {
    'pending': { class: 'status-pending', text: '⏳ Pendiente' },
    'meeting_scheduled': { class: 'status-meeting_scheduled', text: '📅 Reunión' },
    'proposal_sent': { class: 'status-proposal_sent', text: '📧 Propuesta' },
    'accepted': { class: 'status-accepted', text: '✅ Aceptado' },
    'negotiating': { class: 'status-proposal_sent', text: '💬 Negociando' },
    'cancelled': { class: 'status-cancelled', text: '❌ Cancelado' }
  };
  
  const badge = statusMap[status] || { class: 'status-pending', text: status || 'Pendiente' };
  return `<div class="status-badge ${badge.class}">${badge.text}</div>`;
}

// ═══ DATA LOADING ════════════════════════════════════════════════════════════

/**
 * Cargar dashboard completo
 */
async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/api/enzo/dashboard`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error desconocido');
    }
    
    const { month, topProjects } = result.data;
    
    // Actualizar stats
    document.getElementById('stat-month-projects').textContent = month.totalProjects || 0;
    document.getElementById('stat-proposals').textContent = month.proposals || 0;
    document.getElementById('stat-accepted').textContent = month.accepted || 0;
    document.getElementById('stat-revenue').textContent = formatPrice(month.revenue);
    
    // Guardar proyectos
    allProjects = topProjects || [];
    
    // Renderizar proyectos iniciales
    renderProjects(allProjects);
    
  } catch (error) {
    console.error('[ENZO-DASH] Error:', error);
    document.getElementById('projects-list').innerHTML = `
      <div class="error">
        ❌ Error al cargar proyectos<br>
        <small>${error.message}</small>
      </div>
    `;
  }
}

/**
 * Renderizar proyectos en la tabla
 */
function renderProjects(projects) {
  const container = document.getElementById('projects-list');
  
  if (!projects || projects.length === 0) {
    container.innerHTML = `
      <div class="empty">
        No hay proyectos que coincidan con los filtros seleccionados
      </div>
    `;
    return;
  }
  
  container.innerHTML = projects.map(project => `
    <div class="project-row">
      <div class="project-code">${project.project_code || '-'}</div>
      
      <div class="project-info">
        <div class="project-type">${project.project_type || 'Proyecto'}</div>
        <div class="project-client">${project.client_name || 'Cliente'}</div>
        ${project.company ? `<div class="project-company">🏢 ${project.company}</div>` : ''}
      </div>
      
      <div>${getUrgencyBadge(project.urgency)}</div>
      <div>${getStatusBadge(project.status)}</div>
      <div class="project-amount">${formatPrice(project.proposal_amount)}</div>
      <div class="project-date">${formatDate(project.created_at)}</div>
    </div>
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
});
