console.log('[ALUNA-DASH] 🚀 Script iniciado');
const API_BASE = window.location.origin;
console.log('[ALUNA-DASH] API_BASE:', API_BASE);

// Estado de la aplicación
let allProformas = [];
let currentFilters = {
  status: '',
  origin: '',
  search: ''
};

// Formateo de fecha
function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-EC', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch (e) {
    return '-';
  }
}

// Formateo de precio
function formatPrice(price, allowDash = true) {
  if (!price || price == 0) return allowDash ? '-' : '$0.00';
  return `$${parseFloat(price).toFixed(2)}`;
}

// Formateo de estado
function getStatusBadge(status) {
  const statusMap = {
    'pending': 'Pendiente',
    'pending_payment': 'Pago Pendiente',
    'tour_scheduled': 'Tour Agendado',
    'negotiating': 'Negociando',
    'accepted': 'Aceptada',
    'active': 'Activa',
    'cancelled': 'Cancelada',
    'expired': 'Expirada'
  };
  
  const label = statusMap[status] || status;
  const className = `status-${status}`;
  
  return `<span class="status-badge ${className}">${label}</span>`;
}

// Formateo de plan
function formatPlan(plan) {
  if (!plan) return '-';
  return plan.replace('plan_', 'Plan ').replace('_', ' ');
}

// Detectar si una proforma fue enviada por Big Boss (admin)
function isBigBoss(specialRequirements) {
  const req = (specialRequirements || '').toLowerCase();
  return req.includes('enviado por administrador') ||
         req.includes('admin:') ||
         req.includes('big boss');
}

// Formateo de origen (Big Boss vs Aluna)
function getOriginBadge(specialRequirements) {
  if (isBigBoss(specialRequirements)) {
    return '<span class="origin-badge origin-boss">Big Boss</span>';
  } else {
    return '<span class="origin-badge origin-aluna">Aluna</span>';
  }
}

// Cargar estadísticas
async function loadStats() {
  try {
    console.log('[ALUNA-DASH] Cargando stats desde:', `${API_BASE}/api/aluna/stats`);
    const response = await fetch(`${API_BASE}/api/aluna/stats`);
    console.log('[ALUNA-DASH] Response status:', response.status);
    const result = await response.json();
    console.log('[ALUNA-DASH] Stats result:', result);
    
    if (result.ok) {
      const { data } = result;
      document.getElementById('stat-total').textContent = data.total || 0;
      document.getElementById('stat-month').textContent = data.recent?.thisMonth || 0;
      document.getElementById('stat-week').textContent = data.recent?.last7Days || 0;
      document.getElementById('stat-revenue').textContent = formatPrice(data.revenue?.potential || 0, false);
    } else {
      console.error('[ALUNA-DASH] Stats failed:', result.error);
    }
  } catch (error) {
    console.error('[ALUNA-DASH] Error cargando stats:', error);
  }
}

// Cargar proformas
async function loadProformas() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const tableEl = document.getElementById('proformas-table');
  const emptyEl = document.getElementById('empty-state');
  const tbody = document.getElementById('table-body');
  
  // Mostrar loading
  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  tableEl.style.display = 'none';
  emptyEl.style.display = 'none';
  
  try {
    // Construir URL con filtros
    const params = new URLSearchParams();
    if (currentFilters.status) params.append('status', currentFilters.status);
    params.append('limit', '1000'); // Cargar todas
    
    const url = `${API_BASE}/api/aluna/proformas?${params}`;
    console.log('[ALUNA-DASH] Cargando proformas desde:', url);
    
    const response = await fetch(url);
    console.log('[ALUNA-DASH] Response status:', response.status);
    
    const result = await response.json();
    console.log('[ALUNA-DASH] Result:', result);
    console.log('[ALUNA-DASH] Data length:', result.data?.length);
    
    if (!result.ok) {
      throw new Error(result.error || 'Error cargando proformas');
    }
    
    allProformas = result.data || [];
    console.log('[ALUNA-DASH] Proformas cargadas:', allProformas.length);
    
    // Aplicar filtros locales (origen + búsqueda)
    let filtered = allProformas;
    if (currentFilters.origin) {
      const wantBoss = currentFilters.origin === 'bigboss';
      filtered = filtered.filter(p => isBigBoss(p.special_requirements) === wantBoss);
    }
    if (currentFilters.search) {
      const search = currentFilters.search.toLowerCase();
      filtered = filtered.filter(p => 
        (p.client_name || '').toLowerCase().includes(search) ||
        (p.email || '').toLowerCase().includes(search) ||
        (p.membership_code || '').toLowerCase().includes(search) ||
        (p.phone || '').toLowerCase().includes(search)
      );
    }
    
    console.log('[ALUNA-DASH] Proformas filtradas:', filtered.length);
    
    // Renderizar tabla
    loadingEl.style.display = 'none';
    
    if (filtered.length === 0) {
      console.log('[ALUNA-DASH] No hay proformas para mostrar');
      emptyEl.style.display = 'block';
    } else {
      console.log('[ALUNA-DASH] Renderizando tabla...');
      tbody.innerHTML = filtered.map(p => `
        <tr>
          <td><strong>${p.membership_code || '-'}</strong></td>
          <td>${p.client_name || '-'}</td>
          <td>${p.email || '-'}</td>
          <td>${formatPlan(p.membership_type)}</td>
          <td class="money">${formatPrice(p.monthly_fee)}</td>
          <td>${getStatusBadge(p.status)}</td>
          <td>${getOriginBadge(p.special_requirements)}</td>
          <td>${formatDate(p.quote_sent_at || p.created_at)}</td>
        </tr>
      `).join('');
      
      tableEl.style.display = 'table';
      console.log('[ALUNA-DASH] Tabla renderizada');
    }
    
    // Actualizar stats
    await loadStats();
    
  } catch (error) {
    console.error('[ALUNA-DASH] Error completo:', error);
    console.error('[ALUNA-DASH] Error stack:', error.stack);
    loadingEl.style.display = 'none';
    errorEl.textContent = `Error: ${error.message}`;
    errorEl.style.display = 'block';
  }
}

// Resetear filtros
function resetFilters() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-origin').value = '';
  document.getElementById('search').value = '';
  currentFilters = { status: '', origin: '', search: '' };
  loadProformas();
}

// Event listeners
try {
  console.log('[ALUNA-DASH] Configurando event listeners...');
  
  document.getElementById('filter-status').addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    loadProformas();
  });

  document.getElementById('filter-origin').addEventListener('change', (e) => {
    currentFilters.origin = e.target.value;
    loadProformas();
  });

  document.getElementById('search').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    // Debounce: recargar después de 500ms de inactividad
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => loadProformas(), 500);
  });

  document.getElementById('search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(window.searchTimeout);
      loadProformas();
    }
  });

  console.log('[ALUNA-DASH] Event listeners configurados');
  
  // Cargar al inicio
  console.log('[ALUNA-DASH] Iniciando carga de proformas...');
  loadProformas().catch(err => {
    console.error('[ALUNA-DASH] Error fatal en carga inicial:', err);
    alert('Error cargando dashboard: ' + err.message + '\nRevisa el Console (Cmd+Option+J) para más detalles');
  });

  // Auto-refresh cada 30 segundos
  setInterval(loadStats, 30000);
  
  console.log('[ALUNA-DASH] ✅ Inicialización completa');
} catch (error) {
  console.error('[ALUNA-DASH] ❌ Error en inicialización:', error);
  alert('Error inicializando dashboard: ' + error.message);
}
