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

// Formateo de fecha simple (YYYY-MM-DD)
function formatSimpleDate(dateString) {
  if (!dateString) return '-';
  try {
    // Si ya tiene hora, usar directamente; si no, agregar medianoche
    const dateStr = dateString.includes('T') ? dateString : dateString + 'T12:00:00';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateString; // fallback al string original
    
    return date.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

// Formateo de precio
function formatPrice(price, allowFree = true) {
  if (!price || price == 0) return allowFree ? 'Gratis' : '$0.00';
  return `$${parseFloat(price).toFixed(2)}`;
}

// Formateo de estado de pago
function getPaymentBadge(paymentStatus) {
  const paymentMap = {
    'paid': '✅ Pagado',
    'paid efectivo': '💵 Efectivo',
    'paid transferencia': '🏦 Transferencia',
    'paid tarjeta': '💳 Tarjeta',
    'pending': '⏳ Pendiente',
    'pending_efectivo': '💵 Pago Pendiente',
    'waived': '🎁 Cortesía',
    'free': '🎁 Gratis',
    'N/A': '-'
  };
  
  return paymentMap[paymentStatus] || paymentStatus || '-';
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
      document.getElementById('stat-revenue').textContent = formatPrice(data.revenue?.total || 0, false);
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
          <td><strong>${r.id}</strong></td>
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
          <td>${getPaymentBadge(r.payment_status)}</td>
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

// ─── Prospectos abandonados ────────────────────────────────────────────────
function getEngagementBadge(level) {
  if (level === 'hot')  return '<span style="background:#fff7ed;color:#ea580c;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;">🔥 Hot</span>';
  if (level === 'warm') return '<span style="background:#fffbeb;color:#d97706;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;">🌡 Warm</span>';
  return '<span style="background:#eff6ff;color:#2563eb;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;">❄️ Cold</span>';
}

async function loadAbandoned() {
  const tbody    = document.getElementById('abandoned-body');
  const tableEl  = document.getElementById('abandoned-table');
  const emptyEl  = document.getElementById('abandoned-empty');
  const loadingEl = document.getElementById('abandoned-loading');
  if (!tbody) return;

  loadingEl.style.display = 'block';
  tableEl.style.display   = 'none';
  emptyEl.style.display   = 'none';

  try {
    const res  = await fetch(`${API_BASE}/api/aurora/prospects/abandoned`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    // KPIs
    document.getElementById('kpi-prospects-total').textContent = data.stats.total;
    document.getElementById('kpi-prospects-hot').textContent   = data.stats.hot;
    document.getElementById('kpi-prospects-warm').textContent  = data.stats.warm;
    document.getElementById('kpi-prospects-cold').textContent  = data.stats.cold;

    loadingEl.style.display = 'none';

    if (!data.data.length) {
      emptyEl.style.display = 'block';
      return;
    }

    tbody.innerHTML = data.data.map(p => {
      const phone      = p.user_phone || '';
      const name       = p.user_name  || 'Sin nombre';
      const days       = Math.round(parseFloat(p.days_since_last) || 0);
      const staleness  = days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days}d`;
      const firstDate  = p.first_interaction ? new Date(p.first_interaction).toLocaleDateString('es-EC', { day:'2-digit', month:'short' }) : '-';
      const waLink     = `https://wa.me/${phone.replace(/\D/g,'')}`;
      return `
        <tr style="border-bottom:1px solid #f3f4f6; transition:background 0.15s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
          <td style="padding:12px 16px;">${getEngagementBadge(p.engagement)}</td>
          <td style="padding:12px 16px;">
            <strong style="color:#1f2937;">${name}</strong><br>
            <small style="color:#6b7280;">${phone}</small>
          </td>
          <td style="padding:12px 16px; text-align:center;">
            <span style="background:#f3f4f6; color:#374151; padding:4px 12px; border-radius:99px; font-weight:700; font-size:14px;">${p.interaction_count}</span>
          </td>
          <td style="padding:12px 16px; color:#6b7280; font-size:13px;">${staleness}</td>
          <td style="padding:12px 16px; color:#6b7280; font-size:13px;">${firstDate}</td>
          <td style="padding:12px 16px;">
            <a href="${waLink}" target="_blank" style="background:#25d366; color:white; padding:5px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600;">💬 WhatsApp</a>
          </td>
        </tr>`;
    }).join('');

    tableEl.style.display = 'table';
  } catch (err) {
    loadingEl.style.display = 'none';
    console.error('[AURORA-DASH] Error cargando prospectos:', err);
  }
}


// ─── Conversaciones ───────────────────────────────────────────────────────────
async function loadConversations() {
  const loadingEl = document.getElementById('conv-loading');
  const emptyEl   = document.getElementById('conv-empty');
  const listEl    = document.getElementById('conv-list');
  const tbody     = document.getElementById('conv-body');
  if (!loadingEl) return;

  loadingEl.style.display = 'block';
  emptyEl.style.display   = 'none';
  listEl.style.display    = 'none';

  try {
    const res  = await fetch(`${API_BASE}/api/aurora/conversations`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    loadingEl.style.display = 'none';

    if (!data.data || data.data.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }

    tbody.innerHTML = data.data.map(c => {
      const name    = c.user_name || 'Sin nombre';
      const phone   = c.user_phone || '';
      const last    = c.last_message ? new Date(c.last_message).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' }) : '-';
      const first   = c.first_message ? new Date(c.first_message).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' }) : '-';
      const agents  = (c.agents || []).filter(Boolean).join(', ') || '-';
      const preview = (c.last_content || '').substring(0, 60) + ((c.last_content || '').length > 60 ? '…' : '');
      const waLink  = `https://wa.me/${phone.replace(/\D/g,'')}`;
      return `
        <tr style="border-bottom:1px solid #f3f4f6;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
          <td style="padding:12px 16px;">
            <strong style="color:#1f2937;">${name}</strong><br>
            <small style="color:#6b7280;">${phone}</small>
          </td>
          <td style="padding:12px 16px; text-align:center;">
            <span style="background:#dbeafe; color:#1e40af; padding:4px 12px; border-radius:99px; font-weight:700; font-size:14px;">${c.message_count}</span>
          </td>
          <td style="padding:12px 16px; color:#6b7280; font-size:13px;">${last}</td>
          <td style="padding:12px 16px; color:#6b7280; font-size:13px;">${first}</td>
          <td style="padding:12px 16px; font-size:12px; color:#374151;">${agents}</td>
          <td style="padding:12px 16px; font-size:12px; color:#6b7280; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${preview}</td>
          <td style="padding:12px 16px; display:flex; gap:8px; flex-wrap:wrap;">
            <button onclick="openThread('${phone}', '${name.replace(/'/g,'\\\'')}')" style="background:#4ECDC4; font-size:12px; padding:5px 12px; border-radius:6px;">💬 Ver hilo</button>
            <a href="${waLink}" target="_blank" style="background:#25d366; color:white; padding:5px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600;">WhatsApp</a>
          </td>
        </tr>`;
    }).join('');

    listEl.style.display = 'block';
  } catch (err) {
    loadingEl.style.display = 'none';
    console.error('[AURORA-DASH] Error cargando conversaciones:', err);
  }
}

async function openThread(phone, name) {
  const threadEl    = document.getElementById('conv-thread');
  const threadTitle = document.getElementById('conv-thread-title');
  const threadBody  = document.getElementById('conv-thread-body');

  threadTitle.textContent = `Conversación con ${name} (${phone})`;
  threadBody.innerHTML    = '<p style="color:#6b7280; text-align:center; padding:20px;">Cargando mensajes...</p>';
  threadEl.style.display  = 'block';
  threadEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res  = await fetch(`${API_BASE}/api/aurora/conversations?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);

    if (!data.data.length) {
      threadBody.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:20px;">Sin mensajes registrados.</p>';
      return;
    }

    threadBody.innerHTML = data.data.map(m => {
      const isUser = m.role === 'user';
      const time   = m.timestamp ? new Date(m.timestamp).toLocaleString('es-EC', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
      const agent  = m.agent ? `<small style="color:${isUser ? '#6b7280' : '#4ECDC4'}; font-size:11px;">${m.agent}</small>` : '';
      return `
        <div style="display:flex; flex-direction:column; align-items:${isUser ? 'flex-start' : 'flex-end'};">
          <div style="max-width:75%; background:${isUser ? '#f3f4f6' : '#e0fdf4'}; color:${isUser ? '#1f2937' : '#065f46'}; border-radius:${isUser ? '4px 16px 16px 4px' : '16px 4px 4px 16px'}; padding:10px 14px; font-size:14px; line-height:1.5;">
            ${m.content}
          </div>
          <div style="display:flex; gap:6px; margin-top:3px; align-items:center;">${agent}<small style="color:#9ca3af; font-size:11px;">${time}</small></div>
        </div>`;
    }).join('');

    // Scroll to bottom of thread
    threadBody.scrollTop = threadBody.scrollHeight;
  } catch (err) {
    threadBody.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">Error: ${err.message}</p>`;
  }
}

function closeThread() {
  document.getElementById('conv-thread').style.display = 'none';
}

// Refresca todo el dashboard de una vez
function refreshAll() {
  loadReservations();
  loadAbandoned();
  loadConversations();
}

// Event listeners
try {
  console.log('[AURORA-DASH] Configurando event listeners...');
  
  document.getElementById('filter-status').addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    loadReservations();
  });

  document.getElementById('filter-service').addEventListener('change', (e) => {
    currentFilters.serviceType = e.target.value;
    loadReservations();
  });

  document.getElementById('filter-date').addEventListener('change', (e) => {
    currentFilters.date = e.target.value;
    loadReservations();
  });

  document.getElementById('search').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    // Debounce: recargar después de 500ms de inactividad
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => loadReservations(), 500);
  });

  document.getElementById('search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(window.searchTimeout);
      loadReservations();
    }
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

  // Cargar prospectos abandonados al inicio + refresco cada 60s
  loadAbandoned();
  setInterval(loadAbandoned, 60000);

  // Cargar conversaciones al inicio
  loadConversations();

  console.log('[AURORA-DASH] ✅ Inicialización completa');
} catch (error) {
  console.error('[AURORA-DASH] ❌ Error en inicialización:', error);
  alert('Error inicializando dashboard: ' + error.message);
}
