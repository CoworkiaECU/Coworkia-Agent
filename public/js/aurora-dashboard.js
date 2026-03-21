console.log('[AURORA-DASH] 🚀 Script iniciado');
const API_BASE = window.location.origin;
console.log('[AURORA-DASH] API_BASE:', API_BASE);

// Estado de la aplicación
let allReservations = [];
let _activeTab = 'all';
let currentFilters = {
  serviceType: '',
  date: '',
  search: ''
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ── Tabs de pipeline ──────────────────────────────────────────────────────────
function getTabReservations(reservations, tab) {
  if (tab === 'all') return reservations;
  if (tab === 'confirmed') return reservations.filter(r => r.status === 'confirmed');
  if (tab === 'pending') return reservations.filter(r => ['pending', 'pending_payment'].includes(r.status));
  if (tab === 'completed') return reservations.filter(r => r.status === 'completed');
  if (tab === 'followup') {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return reservations.filter(r => r.status === 'completed' && new Date(r.updated_at || r.created_at) > cutoff);
  }
  return reservations;
}

function updateTabCounts(reservations) {
  const counts = {
    all:       reservations.length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    pending:   reservations.filter(r => ['pending', 'pending_payment'].includes(r.status)).length,
    completed: reservations.filter(r => r.status === 'completed').length,
    followup:  reservations.filter(r => {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return r.status === 'completed' && new Date(r.updated_at || r.created_at) > cutoff;
    }).length
  };
  for (const [tab, count] of Object.entries(counts)) {
    const el = document.getElementById(`tc-${tab}`);
    if (el) el.textContent = count;
  }
}

function switchTab(tabName) {
  _activeTab = tabName;
  document.querySelectorAll('#pipeline-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  // Re-render with current allReservations using new tab
  renderReservationsTable(allReservations);
}

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
    'confirmed':       'Confirmada',
    'pending':         'Pendiente',
    'pending_payment': 'Pago Pendiente',
    'cancelled':       'Cancelada',
    'completed':       'Completada',
    'rejected':        'Rechazada'
  };
  const label = statusMap[status] || status;
  return `<span class="badge badge-${status}">${label}</span>`;
}

// Formateo de tipo de servicio
function getServiceBadge(serviceType) {
  const serviceMap = {
    'hotDesk':     { label: 'Hot Desk',            cls: 'svc-hotdesk' },
    'meetingRoom': { label: 'Sala de Reuniones',   cls: 'svc-meetingroom' }
  };
  const mapped = serviceMap[serviceType] || { label: serviceType, cls: 'svc-hotdesk' };
  return `<span class="${mapped.cls}">${mapped.label}</span>`;
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
  const loadingEl = document.getElementById('loading-reservations');
  const errorEl   = document.getElementById('error-reservations');
  const tableEl   = document.getElementById('reservations-table');
  const emptyEl   = document.getElementById('empty-state-reservations');
  
  // Mostrar loading
  loadingEl.style.display = 'block';
  errorEl.style.display   = 'none';
  tableEl.style.display   = 'none';
  emptyEl.style.display   = 'none';
  
  try {
    // Construir URL con filtros
    const params = new URLSearchParams();
    if (currentFilters.serviceType) params.append('serviceType', currentFilters.serviceType);
    if (currentFilters.date) params.append('date', currentFilters.date);
    params.append('limit', '1000');
    
    const url = `${API_BASE}/api/aurora/reservations?${params}`;
    console.log('[AURORA-DASH] Cargando reservas desde:', url);
    
    const response = await fetch(url);
    const result   = await response.json();
    
    if (!result.ok) throw new Error(result.error || 'Error cargando reservas');
    
    allReservations = result.data || [];
    console.log('[AURORA-DASH] Reservas cargadas:', allReservations.length);
    
    // Aplicar filtro de búsqueda local sobre el array completo
    let baseFiltered = allReservations;
    if (currentFilters.search) {
      const search = currentFilters.search.toLowerCase();
      baseFiltered = allReservations.filter(r =>
        (r.user_name  || '').toLowerCase().includes(search) ||
        (r.user_phone || '').toLowerCase().includes(search) ||
        (r.id         || '').toLowerCase().includes(search)
      );
    }
    
    // Actualizar contadores de tabs con el set completo (sin filtro de tab)
    updateTabCounts(baseFiltered);
    
    // Renderizar según tab activo
    loadingEl.style.display = 'none';
    renderReservationsTable(baseFiltered);
    
    // Actualizar stats
    await loadStats();
    
  } catch (error) {
    console.error('[AURORA-DASH] Error:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent    = `Error: ${error.message}`;
    errorEl.style.display  = 'block';
  }
}

// Renderiza la tabla según el tab activo
function renderReservationsTable(reservations) {
  const tableEl = document.getElementById('reservations-table');
  const emptyEl = document.getElementById('empty-state-reservations');
  const tbody   = document.getElementById('table-body');
  
  const filtered = getTabReservations(reservations, _activeTab);
  
  if (filtered.length === 0) {
    tableEl.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  
  emptyEl.style.display = 'none';
  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td>
        ${r.user_name || 'Sin nombre'}<br>
        <small class="text-muted">${r.user_phone}</small>
      </td>
      <td>${getServiceBadge(r.service_type)}</td>
      <td>${formatSimpleDate(r.date)}</td>
      <td>
        ${r.start_time} - ${r.end_time}<br>
        <small class="text-muted">${r.duration_hours}h${r.guest_count > 0 ? ` · ${r.guest_count} inv.` : ''}</small>
      </td>
      <td class="money">
        ${formatPrice(r.total_price)}
        ${r.was_free ? '<span class="badge badge-completed" style="font-size:10px;">GRATIS</span>' : ''}
      </td>
      <td>${getStatusBadge(r.status)}</td>
      <td>${getPaymentBadge(r.payment_status)}</td>
      <td>${formatDate(r.created_at)}</td>
    </tr>
  `).join('');
  
  tableEl.style.display = 'table';
}

// Resetear filtros
function resetFilters() {
  document.getElementById('filter-service').value = '';
  document.getElementById('filter-date').value    = '';
  document.getElementById('search').value         = '';
  currentFilters = { serviceType: '', date: '', search: '' };
  loadReservations();
}

// ─── Inteligencia de prospectos ───────────────────────────────────────────────
let _allProspects = [];
let _activeFilter = 'all';

function getUrgencyLevel(p) {
  if (p.engagement === 'hot' && (p.days_since_last ?? 0) >= 2) return 'urgent';
  return p.engagement; // 'hot' | 'warm' | 'cold'
}

const URGENCY_STYLE = {
  urgent: { border: '#dc2626', bg: '#fef2f2', badge: '<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">🚨 URGENTE</span>' },
  hot:    { border: '#ea580c', bg: '#fff7ed', badge: '<span style="background:#fff7ed;color:#ea580c;border:1px solid #fdba74;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">🔥 HOT</span>' },
  warm:   { border: '#d97706', bg: '#fffbeb', badge: '<span style="background:#fffbeb;color:#d97706;border:1px solid #fcd34d;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">🌡 WARM</span>' },
  cold:   { border: '#4ECDC4', bg: '#f0fdfa', badge: '<span style="background:#f0fdfa;color:#0d9488;border:1px solid #5eead4;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">❄️ COLD</span>' },
};

function getWaTemplate(rawTopics, name) {
  const topicsStr = rawTopics.join('|').toLowerCase();
  const label = (name && name !== 'Sin nombre') ? name.split(' ')[0] : null;
  const greeting = label ? `Hola ${label}! ` : 'Hola! ';
  if (/virtual_agent_sales_promo/.test(topicsStr)) {
    return encodeURIComponent(`${greeting}🤖 Escríbele esto a Aurora y descubre lo que la IA puede hacer por tu empresa:\n\n_Aurora, quiero saber ¿qué puede hacer un Agente Virtual como tú para mi empresa?_\n\nO conoce nuestro ecosistema de agentes: https://coworkia-agent-e97d15dac56f.herokuapp.com/ ✨`);
  }
  if (/trigger @aluna|membership_interest/.test(topicsStr)) {
    return encodeURIComponent(`${greeting}💼 ¿Sigues interesado en Coworkia? Tenemos planes de membresía con semana gratis 🎉`);
  }
  if (/trigger @aurora|interés reserva|reserva/.test(topicsStr)) {
    return encodeURIComponent(`${greeting}👋 Soy Aurora de Coworkia. ¿Sigues buscando un espacio? Tenemos disponibilidad esta semana 🏢`);
  }
  return encodeURIComponent(`${greeting}👋 Soy Aurora de Coworkia. ¿En qué puedo ayudarte hoy?`);
}

function buildProspectCard(p) {
  const urgency  = getUrgencyLevel(p);
  const style    = URGENCY_STYLE[urgency] || URGENCY_STYLE.cold;
  const name     = p.user_name  || 'Sin nombre';
  const phone    = p.user_phone || '';
  const days     = p.days_since_last ?? 0;
  const msgs     = p.interaction_count || 0;
  const score    = p.priority_score || 0;

  const initials   = name.split(' ').slice(0,2).map(w => w[0] || '?').join('').toUpperCase();
  const daysColor  = days <= 1 ? '#16a34a' : days <= 3 ? '#d97706' : '#dc2626';
  const daysLabel  = days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days}d`;

  const rawTopics   = Array.isArray(p.topics) ? p.topics : [];
  const topicLabels = formatTopics(rawTopics);
  const topicChips  = topicLabels.length
    ? topicLabels.map(t => `<span style="background:#f3f4f6;color:#374151;padding:2px 8px;border-radius:99px;font-size:11px;white-space:nowrap;">${t}</span>`).join('')
    : '<span style="background:#f3f4f6;color:#9ca3af;padding:2px 8px;border-radius:99px;font-size:11px;">Sin categoría</span>';

  const waTpl  = getWaTemplate(rawTopics, name);
  const waLink = `https://wa.me/${phone.replace(/\D/g,'')}?text=${waTpl}`;

  return `
    <div class="prospect-card" data-urgency="${urgency}" data-engagement="${p.engagement}"
      style="border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);border:1px solid #f3f4f6;background:white;display:flex;flex-direction:column;">
      <div style="display:flex;padding:14px 16px;gap:12px;align-items:flex-start;border-left:4px solid ${style.border};background:${style.bg};">
        <div style="width:40px;height:40px;border-radius:50%;background:#4ECDC4;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:#1f2937;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
          <div style="font-size:12px;color:#6b7280;">${phone}</div>
        </div>
        ${style.badge}
      </div>
      <div style="display:flex;border-bottom:1px solid #f3f4f6;">
        <div style="flex:1;text-align:center;padding:12px 8px;border-right:1px solid #f3f4f6;">
          <div style="font-size:24px;font-weight:800;color:#1f2937;">${msgs}</div>
          <div style="font-size:11px;color:#6b7280;">mensajes</div>
        </div>
        <div style="flex:1;text-align:center;padding:12px 8px;border-right:1px solid #f3f4f6;">
          <div style="font-size:18px;font-weight:700;color:${daysColor};">${daysLabel}</div>
          <div style="font-size:11px;color:#6b7280;">último</div>
        </div>
        <div style="flex:1;text-align:center;padding:12px 8px;">
          <div style="font-size:18px;font-weight:700;color:#6b7280;">${score}</div>
          <div style="font-size:11px;color:#6b7280;">prioridad</div>
        </div>
      </div>
      <div style="padding:10px 14px;display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid #f3f4f6;min-height:38px;align-items:center;">
        ${topicChips}
      </div>
      <div style="padding:12px 14px;margin-top:auto;">
        <a href="${waLink}" target="_blank"
          style="display:block;text-align:center;background:#25d366;color:white;padding:8px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
          💬 WhatsApp →
        </a>
      </div>
    </div>`;
}

async function loadAbandoned() {
  const gridEl  = document.getElementById('prospects-grid');
  const emptyEl = document.getElementById('prospects-empty');
  if (!gridEl) return;

  gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#9ca3af;">Cargando prospectos...</div>';
  emptyEl.style.display = 'none';

  try {
    const res  = await fetch(`${API_BASE}/api/aurora/prospects/abandoned`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    document.getElementById('kpi-prospects-urgent').textContent = data.stats.urgent ?? 0;
    document.getElementById('kpi-prospects-hot').textContent    = data.stats.hot;
    document.getElementById('kpi-prospects-warm').textContent   = data.stats.warm;
    document.getElementById('kpi-prospects-total').textContent  = data.stats.total;

    _allProspects = data.data;
    _activeFilter = 'all';
    document.querySelectorAll('.pill').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === 'all');
    });

    renderProspectGrid(_allProspects);
  } catch (err) {
    gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#dc2626;">Error cargando prospectos. Revisa la consola.</div>';
    console.error('[AURORA-DASH] Error cargando prospectos:', err);
  }
}

function renderProspectGrid(prospects) {
  const gridEl  = document.getElementById('prospects-grid');
  const emptyEl = document.getElementById('prospects-empty');
  if (!gridEl) return;
  if (!prospects.length) {
    gridEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';
  gridEl.innerHTML = prospects.map(buildProspectCard).join('');
}

function filterProspects(filter) {
  _activeFilter = filter;
  document.querySelectorAll('.pill').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  const filtered = filter === 'all'     ? _allProspects
    : filter === 'urgent' ? _allProspects.filter(p => getUrgencyLevel(p) === 'urgent')
    : _allProspects.filter(p => p.engagement === filter);
  renderProspectGrid(filtered);
}

function copyCampaignList() {
  if (!_allProspects.length) { alert('Primero carga los prospectos.'); return; }
  const date     = new Date().toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' });
  const urgentes = _allProspects.filter(p => getUrgencyLevel(p) === 'urgent');
  const hots     = _allProspects.filter(p => p.engagement === 'hot' && getUrgencyLevel(p) !== 'urgent');
  const warms    = _allProspects.filter(p => p.engagement === 'warm');
  const colds    = _allProspects.filter(p => p.engagement === 'cold');
  const fmt      = p => {
    const name   = p.user_name  || 'Sin nombre';
    const phone  = p.user_phone || '';
    const chips  = formatTopics(Array.isArray(p.topics) ? p.topics : []).slice(0,2).join(', ') || '—';
    return `• ${name} — ${phone} — ${chips}`;
  };
  let text = `📋 Campaña Aurora · ${date}\nTotal: ${_allProspects.length} prospectos\n`;
  if (urgentes.length) text += `\n🚨 URGENTES — ${urgentes.length}\n` + urgentes.map(fmt).join('\n');
  if (hots.length)     text += `\n\n🔥 HOT — ${hots.length}\n`        + hots.map(fmt).join('\n');
  if (warms.length)    text += `\n\n🌡 WARM — ${warms.length}\n`       + warms.map(fmt).join('\n');
  if (colds.length)    text += `\n\n❄️ COLD — ${colds.length}\n`       + colds.map(fmt).join('\n');

  navigator.clipboard.writeText(text.trim()).then(() => {
    const btn = document.getElementById('btn-copy-campaign');
    if (btn) { const orig = btn.textContent; btn.textContent = '✅ ¡Copiado!'; setTimeout(() => { btn.textContent = orig; }, 2200); }
  }).catch(() => alert('No se pudo copiar al portapapeles.'));
}


// ─── Mapa de topics: intent_reason → etiqueta visible (null = ocultar) ────────
const TOPIC_LABELS = {
  'trigger @Aluna':               '💼 Interés membresía',
  'trigger @Aurora':              '📅 Interés reserva',
  'trigger @Axel':                '🔧 Interés taller/colisión',
  'trigger @Paula':               '🏠 Interés inmobiliaria',
  'trigger @Gabi':                '⚖️ Asesoría legal',
  'trigger @Enzo':                '🎯 Interés marketing',
  'trigger @Adriana':             '🛡️ Interés seguros',
  'email_sent':                   '📧 Email enviado',
  'proforma_sent':                '📋 Proforma enviada',
  'payment_verification':         '💳 Verifició pago',
  'payment_verified':             '✅ Pago verificado',
  'axel_quote_generated':         '🔧 Cotización generada',
  'photo_received':               '📷 Envió fotos',
  'reservation_completed':        '✅ Reserva completada',
  'membership_interest':          '💼 Interés membresía',
  'virtual_agent_sales_promo':    '🎯 Promoción servicios',
  'greeting_service_interest':    '👋 Saludo + interés',
};

function formatTopics(rawTopics) {
  const seen = new Set();
  const result = [];
  for (const t of rawTopics) {
    // Chequeo directo
    let label = TOPIC_LABELS[t];
    // Chequeo parcial para topics que contienen palabras clave
    if (label === undefined) {
      if (/trigger\s+@(\w+)/i.test(t)) {
        const ag = t.match(/trigger\s+@(\w+)/i)?.[1] || '';
        label = `📬 Trigger ${ag}`;
      } else if (/email_sent|proforma_sent/i.test(t)) {
        label = '📧 Email enviado';
      } else if (/payment|pago/i.test(t)) {
        label = '💳 Pago';
      } else if (/photo|foto/i.test(t)) {
        label = '📷 Fotos';
      } else if (/reservation|reserva/i.test(t)) {
        label = '📅 Reserva';
      } else {
        // Ocultar ruido interno
        label = null;
      }
    }
    if (label && !seen.has(label)) {
      seen.add(label);
      result.push(label);
    }
  }
  return result;
}

function maskPhone(phone) {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '•••••';
  return '••• ••• ' + digits.slice(-4);
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
      // Topics: filtrar / traducir
      const labeledTopics = formatTopics((c.topics || []).filter(Boolean));
      const topicsHtml = labeledTopics.length
        ? labeledTopics.map(t => `<span style="background:#eff6ff;color:#1e40af;padding:2px 8px;border-radius:99px;font-size:11px;margin:2px;display:inline-block;">${t}</span>`).join('')
        : '<span style="color:#9ca3af;font-size:12px;">—</span>';
      // CRM status badge (multi-agente)
      const crmStatus    = c.crm_status;
      const crmAgent     = c.crm_agent;
      const agentEmojis  = {ALUNA:'💼',GABI:'⚖️',ENZO:'🎯',PAULA:'🏠',AXEL:'🔧',ADRIANA:'🛡️'};
      const agentColors  = {ALUNA:'#d1fae5',GABI:'#fef3c7',ENZO:'#fef2f2',PAULA:'#fdf4ff',AXEL:'#dbeafe',ADRIANA:'#d1fae5'};
      const agentText    = {ALUNA:'#065f46',GABI:'#92400e',ENZO:'#991b1b',PAULA:'#6b21a8',AXEL:'#1e40af',ADRIANA:'#065f46'};
      const bg   = (crmStatus && crmAgent) ? (agentColors[crmAgent] || '#f3f4f6') : '#f3f4f6';
      const tc   = (crmStatus && crmAgent) ? (agentText[crmAgent]   || '#374151') : '#374151';
      const em   = crmAgent ? (agentEmojis[crmAgent] || '📋') : '⬜';
      const crmBadge = crmStatus
        ? `<span style="background:${bg};color:${tc};padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;">${em} ${crmAgent} · ${crmStatus}</span>`
        : '<span style="color:#9ca3af;font-size:12px;">Sin CRM</span>';
      const proforma  = c.proforma_code ? `<small style="color:#6b7280; font-size:11px;display:block;">${c.proforma_code}</small>` : '';
      // Alias de cliente (últimos 4 del teléfono, privacidad)
      const alias = 'CLI-' + (phone.replace(/\D/g,'').slice(-4) || '????');
      const waLink = `https://wa.me/${phone.replace(/\D/g,'')}`;
      return `
        <tr class="conv-row" style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:12px 16px;">
            <strong style="color:#1f2937;">${name}</strong><br>
            <small style="color:#9ca3af;font-size:11px;">${alias}</small>
          </td>
          <td style="padding:12px 16px; text-align:center;">
            <span style="background:#dbeafe; color:#1e40af; padding:4px 12px; border-radius:99px; font-weight:700; font-size:14px;">${c.message_count}</span>
          </td>
          <td style="padding:12px 16px; color:#6b7280; font-size:13px;">${last}</td>
          <td style="padding:12px 16px; color:#6b7280; font-size:13px;">${first}</td>
          <td style="padding:12px 16px; font-size:12px; color:#374151;">${agents}</td>
          <td style="padding:12px 16px; max-width:180px;">${topicsHtml}</td>
          <td style="padding:12px 16px;">${crmBadge}${proforma}</td>
          <td style="padding:12px 16px; display:flex; gap:8px; flex-wrap:wrap;">
            <button data-action="open-thread" data-phone="${phone.replace(/"/g,'&quot;')}" data-name="${name.replace(/"/g,'&quot;')}" data-alias="${alias}" style="background:#4ECDC4; font-size:12px; padding:5px 12px; border-radius:6px; cursor:pointer;">💬 Ver hilo</button>
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

async function openThread(phone, name, alias) {
  const threadEl    = document.getElementById('conv-thread');
  const threadTitle = document.getElementById('conv-thread-title');
  const threadBody  = document.getElementById('conv-thread-body');

  threadTitle.textContent = `Conversación con ${name} (${alias || maskPhone(phone)})`;
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
      const agentLabel = m.agent || m.intent_reason || null;
      const agentBubble = agentLabel ? `<small style="color:${isUser ? '#6b7280' : '#4ECDC4'}; font-size:11px;">${agentLabel}</small>` : '';
      const content = m.content || '';
      if (!content.trim()) return '';
      return `
        <div style="display:flex; flex-direction:column; align-items:${isUser ? 'flex-start' : 'flex-end'};">
          <div style="max-width:75%; background:${isUser ? '#f3f4f6' : '#e0fdf4'}; color:${isUser ? '#1f2937' : '#065f46'}; border-radius:${isUser ? '4px 16px 16px 4px' : '16px 4px 4px 16px'}; padding:10px 14px; font-size:14px; line-height:1.5; white-space:pre-wrap;">
            ${content.substring(0, 800)}${content.length > 800 ? '…' : ''}
          </div>
          <div style="display:flex; gap:6px; margin-top:3px; align-items:center;">${agentBubble}<small style="color:#9ca3af; font-size:11px;">${time}</small></div>
        </div>`;
    }).filter(Boolean).join('');

    // Scroll to bottom of thread
    threadBody.scrollTop = threadBody.scrollHeight;
  } catch (err) {
    threadBody.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">Error: ${err.message}</p>`;
  }
}

function closeThread() {
  document.getElementById('conv-thread').style.display = 'none';
}

// Campaña WA masivo — completos del mes
function sendCampaignWA() {
  const cutoff    = new Date();
  cutoff.setDate(1);
  cutoff.setHours(0, 0, 0, 0);
  const completed = allReservations.filter(r => r.status === 'completed' && new Date(r.created_at || r.updated_at) >= cutoff);

  if (!completed.length) {
    showToast('No hay reservas completadas este mes.');
    return;
  }

  const date = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  const lines = completed.map(r => `• ${r.user_name || 'Sin nombre'} — ${r.user_phone || ''} — ${formatSimpleDate(r.date)}`);
  const text  = `📣 Campaña Follow-Up D+7 · ${date}\nTotal: ${completed.length} reservas completadas\n\n${lines.join('\n')}`;

  navigator.clipboard.writeText(text.trim()).then(() => {
    showToast(`✅ Lista D+7 copiada — ${completed.length} contactos`);
    const btn = document.getElementById('qa-campaign-wa');
    if (btn) { const orig = btn.textContent; btn.textContent = '✅ Copiado!'; setTimeout(() => { btn.textContent = orig; }, 2200); }
  }).catch(() => alert('No se pudo copiar al portapapeles.'));
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
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => loadReservations(), 500);
  });

  document.getElementById('search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(window.searchTimeout);
      loadReservations();
    }
  });

  // ── Tabs pipeline ─────────────────────────────────────────────────────────
  document.getElementById('pipeline-tabs')?.addEventListener('click', function(e) {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  // ── Botones estáticos ─────────────────────────────────────────────────────
  document.getElementById('btn-reset-filters')?.addEventListener('click', () => resetFilters());
  document.getElementById('btn-copy-campaign')?.addEventListener('click', () => copyCampaignList());
  document.getElementById('btn-copy-campaign-prospects')?.addEventListener('click', () => copyCampaignList());
  document.getElementById('btn-refresh-prospects')?.addEventListener('click', () => loadAbandoned());
  document.getElementById('btn-refresh-conversations')?.addEventListener('click', () => loadConversations());
  document.getElementById('btn-close-thread')?.addEventListener('click', () => closeThread());
  document.getElementById('btn-fab-refresh')?.addEventListener('click', () => refreshAll());

  // ── Quick Actions ─────────────────────────────────────────────────────────
  document.getElementById('qa-refresh-all')?.addEventListener('click', () => refreshAll());
  document.getElementById('qa-load-prospects')?.addEventListener('click', () => loadAbandoned());
  document.getElementById('qa-copy-list')?.addEventListener('click', () => copyCampaignList());
  document.getElementById('qa-conversations')?.addEventListener('click', () => loadConversations());
  document.getElementById('qa-campaign-wa')?.addEventListener('click', () => sendCampaignWA());

  // ── Event delegation: pill filters (prospectos) ───────────────────────────
  document.getElementById('prospect-filters')?.addEventListener('click', function(e) {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    filterProspects(btn.dataset.filter);
  });

  // ── Event delegation: tabla conversaciones (data-action) ─────────────────
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action="open-thread"]');
    if (!btn) return;
    openThread(btn.dataset.phone, btn.dataset.name, btn.dataset.alias);
  });

  console.log('[AURORA-DASH] Event listeners configurados');

  // Cargar al inicio
  console.log('[AURORA-DASH] Iniciando carga...');
  loadReservations().catch(err => {
    console.error('[AURORA-DASH] Error fatal en carga inicial:', err);
  });

  // Auto-refresh stats cada 30s
  setInterval(loadStats, 30000);

  // Prospectos: cargar al inicio + refresco cada 60s
  loadAbandoned();
  setInterval(loadAbandoned, 60000);

  // Conversaciones al inicio
  loadConversations();

  console.log('[AURORA-DASH] ✅ Inicialización completa');
} catch (error) {
  console.error('[AURORA-DASH] ❌ Error en inicialización:', error);
  alert('Error inicializando dashboard: ' + error.message);
}
