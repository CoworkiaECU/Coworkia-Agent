console.log('[AURORA-DASH] 🚀 Script iniciado');
const API_BASE = window.location.origin;
console.log('[AURORA-DASH] API_BASE:', API_BASE);

// Estado de la aplicación
let allReservations = [];
let currentFilters = {
  status: '',
  serviceType: '',
  date: '',
  search: ''
};

// Formateo de fecha
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
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
}

// Formateo de fecha simple (YYYY-MM-DD)
function formatSimpleDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Formateo de precio
function formatPrice(price) {
  if (!price || price == 0) return 'Gratis';
  return `$${parseFloat(price).toFixed(2)}`;
}

// Formateo de estado
function getStatusBadge(status) {
  const statusMap = {
    'confirmed': 'Confirmada',
    'pending': 'Pendiente',
    'pending_payment': 'Pago Pendiente',
    'cancelled': 'Cancelada',
    'completed': 'Completada',
    'rejected': 'Rechazada'
  };
  
  const label = statusMap[status] || status;
  const className = `status-${status}`;
  
  return `<span class="status-badge ${className}">${label}</span>`;
}

// Formateo de tipo de servicio
function getServiceBadge(serviceType) {
  const serviceMap = {
    'hotDesk': 'Hot Desk',
    'meetingRoom': 'Sala de Reuniones'
  };
  
  const label = serviceMap[serviceType] || serviceType;
  const className = `service-${serviceType.toLowerCase()}`;
  
  return `<span class="service-badge ${className}">${label}</span>`;
}

// Cargar estadísticas
async function loadStats() {
  try {
    console.log('[AURORA-DASH] Cargando stats desde:', `${API_BASE}/api/aurora/stats`);
    const response = await fetch(`${API_BASE}/api/aurora/stats`);
    console.log('[AURORA-DASH] Response status:', response.status);
    const result = await response.json();
    console.log('[AURORA-DASH] Stats result:', result);
    
    if (result.ok) {
      const { data } = result;
      document.getElementById('stat-total').textContent = data.total || 0;
      document.getElementById('stat-month').textContent = data.recent?.thisMonth || 0;
      document.getElementById('stat-upcoming').textContent = data.recent?.upcoming || 0;
      document.getElementById('stat-revenue').textContent = formatPrice(data.revenue?.total || 0);
    } else {
      console.error('[AURORA-DASH] Stats failed:', result.error);
    }
  } catch (error) {
    console.error('[AURORA-DASH] Error cargando stats:', error);
  }
}

// Cargar reservas
async function loadReservations() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const tableEl = document.getElementById('reservations-table');
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
    if (currentFilters.serviceType) params.append('serviceType', currentFilters.serviceType);
    if (currentFilters.date) params.append('date', currentFilters.date);
    params.append('limit', '1000'); // Cargar todas
    
    const url = `${API_BASE}/api/aurora/reservations?${params}`;
    console.log('[AURORA-DASH] Cargando reservas desde:', url);
    
    const response = await fetch(url);
    console.log('[AURORA-DASH] Response status:', response.status);
    
    const result = await response.json();
    console.log('[AURORA-DASH] Result:', result);
    console.log('[AURORA-DASH] Data length:', result.data?.length);
    
    if (!result.ok) {
      throw new Error(result.error || 'Error cargando reservas');
    }
    
    allReservations = result.data || [];
    console.log('[AURORA-DASH] Reservas cargadas:', allReservations.length);
    
    // Aplicar filtro de búsqueda local
    let filtered = allReservations;
    if (currentFilters.search) {
      const search = currentFilters.search.toLowerCase();
      filtered = allReservations.filter(r => 
        (r.user_name || '').toLowerCase().includes(search) ||
        (r.user_phone || '').toLowerCase().includes(search) ||
        (r.id || '').toLowerCase().includes(search)
      );
    }
    
    console.log('[AURORA-DASH] Reservas filtradas:', filtered.length);
    
    // Renderizar tabla
    loadingEl.style.display = 'none';
    
    if (filtered.length === 0) {
      console.log('[AURORA-DASH] No hay reservas para mostrar');
      emptyEl.style.display = 'block';
    } else {
      console.log('[AURORA-DASH] Renderizando tabla...');
      tbody.innerHTML = filtered.map(r => `
        <tr>
          <td><strong>${r.id.substring(0, 12)}...</strong></td>
          <td>
            ${r.user_name || 'Sin nombre'}<br>
            <small style="color: #6b7280;">${r.user_phone}</small>
          </td>
          <td>${getServiceBadge(r.service_type)}</td>
          <td>${formatSimpleDate(r.date)}</td>
          <td>
            ${r.start_time} - ${r.end_time}<br>
            <small style="color: #6b7280;">${r.duration_hours}h${r.guest_count > 0 ? ` · ${r.guest_count} invitados` : ''}</small>
          </td>
          <td class="money">
            ${formatPrice(r.total_price)}
            ${r.was_free ? '<span class="free-badge">GRATIS</span>' : ''}
          </td>
          <td>${getStatusBadge(r.status)}</td>
          <td>
            <small>${r.payment_status || 'N/A'}</small>
            ${r.payment_method ? `<br><small style="color: #6b7280;">${r.payment_method}</small>` : ''}
          </td>
          <td>${formatDate(r.created_at)}</td>
        </tr>
      `).join('');
      
      tableEl.style.display = 'table';
      console.log('[AURORA-DASH] Tabla renderizada');
    }
    
    // Actualizar stats
    await loadStats();
    
  } catch (error) {
    console.error('[AURORA-DASH] Error completo:', error);
    console.error('[AURORA-DASH] Error stack:', error.stack);
    loadingEl.style.display = 'none';
    errorEl.textContent = `Error: ${error.message}`;
    errorEl.style.display = 'block';
  }
}

// Resetear filtros
function resetFilters() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-service').value = '';
  document.getElementById('filter-date').value = '';
  document.getElementById('search').value = '';
  currentFilters = { status: '', serviceType: '', date: '', search: '' };
  loadReservations();
}

// Event listeners
try {
  console.log('[AURORA-DASH] Configurando event listeners...');
  
  document.getElementById('filter-status').addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
  });

  document.getElementById('filter-service').addEventListener('change', (e) => {
    currentFilters.serviceType = e.target.value;
  });

  document.getElementById('filter-date').addEventListener('change', (e) => {
    currentFilters.date = e.target.value;
  });

  document.getElementById('search').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
  });

  document.getElementById('search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadReservations();
  });

  console.log('[AURORA-DASH] Event listeners configurados');
  
  // Cargar al inicio
  console.log('[AURORA-DASH] Iniciando carga de reservas...');
  loadReservations().catch(err => {
    console.error('[AURORA-DASH] Error fatal en carga inicial:', err);
    alert('Error cargando dashboard: ' + err.message + '\nRevisa el Console (Cmd+Option+J) para más detalles');
  });

  // Auto-refresh cada 30 segundos
  setInterval(loadStats, 30000);
  
  console.log('[AURORA-DASH] ✅ Inicialización completa');
} catch (error) {
  console.error('[AURORA-DASH] ❌ Error en inicialización:', error);
  alert('Error inicializando dashboard: ' + error.message);
}
