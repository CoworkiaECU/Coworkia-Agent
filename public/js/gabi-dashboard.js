console.log('[GABI-DASH] 🚀 Script iniciado');
const API_BASE = window.location.origin;
console.log('[GABI-DASH] API_BASE:', API_BASE);

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

// Formatear teléfono
function formatPhone(phone) {
  if (!phone) return '-';
  // +593987654321 -> 098 765 4321
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('593')) {
    const local = cleaned.substring(3);
    return `0${local.substring(0, 2)} ${local.substring(2, 5)} ${local.substring(5)}`;
  }
  return phone;
}

// Cargar dashboard completo
async function loadDashboard() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const topUsersEl = document.getElementById('top-users');
  const emptyEl = document.getElementById('empty-state');
  
  // Mostrar loading
  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  topUsersEl.style.display = 'none';
  emptyEl.style.display = 'none';
  
  try {
    const url = `${API_BASE}/api/gabi/dashboard`;
    console.log('[GABI-DASH] Cargando dashboard desde:', url);
    
    const response = await fetch(url);
    console.log('[GABI-DASH] Response status:', response.status);
    
    const result = await response.json();
    console.log('[GABI-DASH] Result:', result);
    
    if (!result.ok) {
      throw new Error(result.error || 'Error cargando dashboard');
    }
    
    const { month, week, topUsers } = result.data;
    
    // Actualizar stats del mes
    document.getElementById('stat-month-consultas').textContent = month?.totalConsultas || 0;
    document.getElementById('stat-week-consultas').textContent = week?.totalConsultas || 0;
    document.getElementById('stat-users').textContent = month?.usuariosUnicos || 0;
    
    const avg = month?.promedioInteraccionesPorUsuario || 0;
    document.getElementById('stat-avg').textContent = avg.toFixed(1);
    
    // Ocultar loading
    loadingEl.style.display = 'none';
    
    // Renderizar top users
    if (topUsers && topUsers.length > 0) {
      topUsersEl.innerHTML = topUsers.map((user, index) => `
        <div class="user-card">
          <div class="user-header">
            <div class="user-phone">${formatPhone(user.userId)}</div>
            <div class="user-count">${user.interactionCount} consultas</div>
          </div>
          ${user.topics && user.topics.length > 0 ? `
            <div class="user-topics">
              ${user.topics.slice(0, 3).map(topic => `
                <span class="topic-tag">${topic}</span>
              `).join('')}
              ${user.topics.length > 3 ? `<span class="topic-tag">+${user.topics.length - 3}</span>` : ''}
            </div>
          ` : ''}
          <div class="user-date">Última consulta: ${formatDate(user.lastInteraction)}</div>
        </div>
      `).join('');
      
      topUsersEl.style.display = 'grid';
    } else {
      emptyEl.style.display = 'block';
    }
    
  } catch (error) {
    console.error('[GABI-DASH] Error completo:', error);
    console.error('[GABI-DASH] Error stack:', error.stack);
    loadingEl.style.display = 'none';
    errorEl.textContent = `Error: ${error.message}`;
    errorEl.style.display = 'block';
  }
}

// Cargar al inicio
try {
  console.log('[GABI-DASH] Iniciando carga de dashboard...');
  loadDashboard().catch(err => {
    console.error('[GABI-DASH] Error fatal en carga inicial:', err);
    alert('Error cargando dashboard: ' + err.message + '\nRevisa el Console (Cmd+Option+J) para más detalles');
  });

  // Auto-refresh cada 60 segundos
  setInterval(loadDashboard, 60000);
  
  console.log('[GABI-DASH] ✅ Inicialización completa');
} catch (error) {
  console.error('[GABI-DASH] ❌ Error en inicialización:', error);
  alert('Error inicializando dashboard: ' + error.message);
}
