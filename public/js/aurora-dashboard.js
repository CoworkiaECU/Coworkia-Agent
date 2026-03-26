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
  // Confirmadas = confirmadas Y (ya pagaron O ya asistieron)
  if (tab === 'confirmed') return reservations.filter(r =>
    r.status === 'confirmed' && (r.payment_status === 'paid' || r.attended === true)
  );
  // Pendientes = pending/pending_payment + confirmed sin pago y sin asistencia confirmada
  if (tab === 'pending') return reservations.filter(r =>
    ['pending', 'pending_payment'].includes(r.status) ||
    (r.status === 'confirmed' && r.payment_status !== 'paid' && r.attended !== true)
  );
  if (tab === 'completed') return reservations.filter(r => r.status === 'completed');
  if (tab === 'followup') {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return reservations.filter(r => r.status === 'completed' && r.date && new Date(r.date) > cutoff);
  }
  return reservations;
}

function updateTabCounts(reservations) {
  const counts = {
    all:       reservations.length,
    confirmed: reservations.filter(r =>
      r.status === 'confirmed' && (r.payment_status === 'paid' || r.attended === true)
    ).length,
    pending:   reservations.filter(r =>
      ['pending', 'pending_payment'].includes(r.status) ||
      (r.status === 'confirmed' && r.payment_status !== 'paid' && r.attended !== true)
    ).length,
    completed: reservations.filter(r => r.status === 'completed').length,
    followup:  reservations.filter(r => {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return r.status === 'completed' && r.date && new Date(r.date) > cutoff;
    }).length
  };
  for (const [tab, count] of Object.entries(counts)) {
    const el = document.getElementById(`tc-${tab}`);
    if (el) el.textContent = count;
  }
  const mainEl = document.getElementById('tc-main-reservas');
  if (mainEl) mainEl.textContent = counts.all;
}

window.switchTab = function(tabName) {
  _activeTab = tabName;
  document.querySelectorAll('#pipeline-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  renderReservationsTable(allReservations);
}

// ── Main tab navigation (Reservas / Prospectos / Interesados / Conversaciones) ──
let _conversationsLoaded = false;
let _interestedLoaded    = false;
let _metricasLoaded      = false;

window.switchMainTab = function(name) {
  document.querySelectorAll('.main-tab-content').forEach(el => { el.style.display = 'none'; });
  const target = document.getElementById('main-tab-' + name);
  if (target) target.style.display = 'block';
  document.querySelectorAll('#main-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.maintab === name);
  });
  localStorage.setItem('aurora_main_tab', name);
  if (name === 'conversaciones' && !_conversationsLoaded) {
    _conversationsLoaded = true;
    loadConversations();
  }
  if (name === 'interesados' && !_interestedLoaded) {
    _interestedLoaded = true;
    loadInterestedGroups();
  }
  if (name === 'metricas' && !_metricasLoaded) {
    _metricasLoaded = true;
    loadMetricas();
  }
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

// ─── Toggle "Asistió Sí/No" (reemplaza badge de estado en tabla) ─────────────
function renderAttendedToggle(r) {
  // Solo aplica a reservas confirmadas; resto sigue usando el badge original
  if (r.status !== 'confirmed') return getStatusBadge(r.status);

  const paid      = r.payment_status === 'paid';
  const attended  = r.attended === true || paid;
  const noShow    = r.attended === false && !paid;

  if (attended) {
    return `<span style="background:#022c22;color:#6ee7b7;border:1px solid #065f46;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;">✅ Asistió</span>`;
  }
  if (noShow) {
    return `<span style="background:#450a0a;color:#f87171;border:1px solid #7f1d1d;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;">❌ No asistió</span>`;
  }
  // Aún sin marcar → mostrar toggle de dos botones
  return `<div style="display:flex;gap:4px;flex-wrap:nowrap;">
    <button onclick="markAttended('${r.id}', true)"
      style="background:#022c22;color:#4ade80;border:1px solid #15803d;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;"
      title="Marcar que el cliente asistió">✓ Sí</button>
    <button onclick="markAttended('${r.id}', false)"
      style="background:#450a0a;color:#f87171;border:1px solid #7f1d1d;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;"
      title="Marcar que el cliente no asistió — cancela la reserva">✗ No</button>
  </div>`;
}

// Registrar asistencia vía API
window.markAttended = async function(id, attended) {
  try {
    const res = await fetch(`/api/aurora/reservations/${id}/attended`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attended })
    });
    const data = await res.json();
    if (data.ok) {
      await loadReservations();
      showToast(attended ? '✅ Marcado como asistió' : '❌ Marcado como no asistió — reserva cancelada');
    } else {
      showToast('❌ ' + (data.error || 'Error'));
    }
  } catch (e) {
    showToast('❌ Error de red al marcar asistencia');
  }
};

// ─── Celda MONTO: muestra precio + formulario inline para pagos pendientes en efectivo
function renderMontoCell(r) {
  if (r.was_free) return '<span class="pay-chip pay-free">🎁 Gratis</span>';
  const price = formatPrice(r.total_price, false);
  if (r.payment_status === 'pending_efectivo') {
    const preVal = parseFloat(r.total_price) > 0 ? parseFloat(r.total_price).toFixed(2) : '';
    return `
      <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start;">
        <span style="color:#94a3b8;font-size:12px;">${price}</span>
        <div style="display:flex;gap:4px;align-items:center;">
          <input id="pay-amt-${r.id}" type="text" inputmode="decimal" value="${preVal}"
            placeholder="0.00"
            style="width:76px;padding:3px 6px;border-radius:5px;border:1px solid #f97316;
                   background:#0f172a;color:#f1f5f9;font-size:12px;text-align:right;"
            onkeydown="if(event.key==='Enter') registerPayment('${r.id}')">
          <button onclick="registerPayment('${r.id}')"
            style="background:#16a34a;color:#fff;border:none;padding:3px 9px;border-radius:5px;
                   font-size:13px;font-weight:700;cursor:pointer;line-height:1.4;"
            title="Confirmar pago en efectivo">✓</button>
        </div>
      </div>`;
  }
  return price;
}

// Formateo de estado de pago
function getPaymentBadge(paymentStatus, paymentMethod) {
  // Normalizar: combinar status + method cuando aplica
  const key = paymentStatus?.toLowerCase()?.trim() || '';
  const method = paymentMethod?.toLowerCase()?.trim() || '';

  // Pagado
  if (key === 'paid' || key.startsWith('paid')) {
    const label = method === 'transferencia' ? '🏦 Transferencia'
                : method === 'tarjeta'       ? '💳 Tarjeta'
                : method === 'efectivo'      ? '💵 Efectivo'
                : '✅ Pagado';
    return `<span class="pay-chip pay-paid">${label}</span>`;
  }
  // Pendiente de pago en efectivo
  if (key === 'pending_efectivo') {
    return `<span class="pay-chip pay-pending">💵 Por cobrar</span>`;
  }
  // Pendiente genérico
  if (key === 'pending' || key === 'pending_payment') {
    return `<span class="pay-chip pay-pending">⏳ Pendiente</span>`;
  }
  // Cortesía / exonerado
  if (key === 'waived') {
    return `<span class="pay-chip pay-waived">🎁 Cortesía</span>`;
  }
  // Gratis
  if (key === 'free') {
    return `<span class="pay-chip pay-free">🎁 Gratis</span>`;
  }
  if (key === 'n/a' || !key) return '<span style="color:#475569;font-size:12px;">—</span>';
  return `<span class="pay-chip pay-pending">${paymentStatus}</span>`;
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

// ─── Helpers de estado de carga de stats ─────────────────────────────────────
const STAT_IDS = ['stat-total', 'stat-month', 'stat-upcoming', 'stat-revenue'];
function setStatsLoading(on) {
  STAT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (on) { el.classList.add('stat-loading'); el.setAttribute('data-orig', el.textContent); el.textContent = ''; }
    else      { el.classList.remove('stat-loading'); }
  });
}

// Cargar estadísticas
async function loadStats() {
  setStatsLoading(true);
  try {
    console.log('[AURORA-DASH] Cargando stats desde:', `${API_BASE}/api/aurora/stats`);
    const response = await fetch(`${API_BASE}/api/aurora/stats`);
    console.log('[AURORA-DASH] Response status:', response.status);
    const result = await response.json();
    console.log('[AURORA-DASH] Stats result:', result);
    
    if (result.ok) {
      const { data } = result;
      document.getElementById('stat-total').textContent     = data.total || 0;
      document.getElementById('stat-month').textContent     = data.recent?.thisMonth || 0;
      document.getElementById('stat-upcoming').textContent  = data.recent?.upcoming || 0;
      document.getElementById('stat-revenue').textContent   = formatPrice(data.revenue?.total || 0, false);
    } else {
      console.error('[AURORA-DASH] Stats failed:', result.error);
      STAT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = el.getAttribute('data-orig') || '—';
      });
    }
  } catch (error) {
    console.error('[AURORA-DASH] Error cargando stats:', error);
    STAT_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = el.getAttribute('data-orig') || '—';
    });
  } finally {
    setStatsLoading(false);
    updateLastRefreshed();
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

// ─── Stepper visual (progreso reserva) ─────────────────────────────────────
function buildReservationStepper(r) {
  let pos = 0;
  if (r.status === 'completed') pos = 2;
  else if (r.status === 'confirmed') pos = 1;
  const steps  = ['Creada', 'Confirmada', '✅ Completa'];
  const colors = ['#34d399', '#f97316', '#60a5fa'];
  let html = '<div style="display:flex;align-items:center;gap:2px;margin-top:5px;">';
  steps.forEach((label, i) => {
    const isDone    = i < pos;
    const isCurrent = i === pos;
    const clr = isDone ? '#34d399' : (isCurrent ? colors[i] : '#475569');
    html += `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:16px;height:16px;border-radius:50%;background:#0f172a;border:2px solid ${clr};display:flex;align-items:center;justify-content:center;font-size:8px;color:${clr};">${isDone ? '✓' : (i + 1)}</div>
      <div style="font-size:8px;color:${clr};margin-top:1px;white-space:nowrap;">${label}</div>
    </div>`;
    if (i < steps.length - 1) {
      html += `<div style="width:10px;height:2px;background:${isDone ? '#22c55e' : '#1e293b'};margin-bottom:12px;flex-shrink:0;"></div>`;
    }
  });
  return html + '</div>';
}

// Renderiza la tabla según el tab activo
function renderReservationsTable(reservations) {
  const tableEl = document.getElementById('reservations-table');
  const emptyEl = document.getElementById('empty-state-reservations');
  const tbody   = document.getElementById('table-body');

  const tabFiltered = getTabReservations(reservations, _activeTab);
  const filtered    = _activeServiceFilter
    ? tabFiltered.filter(r => r.service_type === _activeServiceFilter)
    : tabFiltered;

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
        <div class="name-main">${r.user_name || 'Sin nombre'}</div>
      </td>
      <td>${getServiceBadge(r.service_type)}</td>
      <td>${formatSimpleDate(r.date)}</td>
      <td>
        ${r.start_time} - ${r.end_time}<br>
        <small class="text-muted">${r.duration_hours}h${r.guest_count > 0 ? ` · ${r.guest_count} inv.` : ''}</small>
      </td>
      <td class="money">${renderMontoCell(r)}</td>
      <td>${renderAttendedToggle(r)}</td>
      <td>${getPaymentBadge(r.payment_status, r.payment_method)}</td>
      <td>${formatDate(r.created_at)}</td>
      <td style="white-space:nowrap;">
        ${!r.followup_1h_sent_at
          ? `<button style="background:#2563eb;color:#fff;border:none;padding:4px 8px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;margin:2px;" data-fu-id="${r.id}" data-fu-action="followup-1h" data-tip="Enviar WA de confirmación 1h después de la reserva">📲 +1h</button>`
          : '<span style="font-size:10px;color:#60a5fa;" title="Follow-up +1h ya enviado">✓ +1h</span>'}
        ${!r.rebook_reminder_sent_at
          ? `<button style="background:#8B5CF6;color:white;border:none;padding:4px 8px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;margin:2px;" data-fu-id="${r.id}" data-fu-action="rebooking" data-tip="Enviar recordatorio D+7 para volver a reservar">🔄 D+7</button>`
          : '<span style="font-size:10px;color:#a78bfa;" title="Recordatorio D+7 ya enviado">✓ D+7</span>'}
      </td>
    </tr>
  `).join('');
  
  tableEl.style.display = 'table';
}

// ─── Registro de pago manual en efectivo ─────────────────────────────────────
window.registerPayment = async function(id) {
  const input = document.getElementById(`pay-amt-${id}`);
  // Aceptar coma o punto como separador decimal
  const rawVal = input?.value?.trim().replace(',', '.');
  const amount = parseFloat(rawVal);
  if (!input || isNaN(amount) || amount <= 0) {
    showToast('⚠️ Ingresa un monto válido para registrar el pago.');
    return;
  }
  const btn = input.nextElementSibling;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    const res = await fetch(`/api/aurora/reservations/${id}/register-payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (data.ok) {
      await loadReservations();
      showToast(`💰 Pago de $${amount.toFixed(2)} registrado${data.waSent ? ' · ✅ WA enviado al cliente' : ''}`);
    } else {
      showToast('❌ ' + (data.error || 'No se pudo registrar el pago'));
      if (btn) { btn.disabled = false; btn.textContent = '✓'; }
    }
  } catch (e) {
    showToast('❌ Error de red al registrar pago');
    if (btn) { btn.disabled = false; btn.textContent = '✓'; }
  }
};

// Resetear filtros
window.resetFilters = function() {
  document.getElementById('filter-date').value    = '';
  document.getElementById('search').value         = '';
  currentFilters = { serviceType: '', date: '', search: '' };
  _activeServiceFilter = null;
  document.querySelectorAll('#service-filter-pills .pill').forEach(b => {
    b.classList.toggle('active', (b.dataset.service || '') === '');
  });
  loadReservations();
}

// ─── Filtro por tipo de servicio (pills) ─────────────────────────────────────
let _activeServiceFilter = null;

window.filterByService = function(type) {
  _activeServiceFilter = type || null;
  document.querySelectorAll('#service-filter-pills .pill').forEach(b => {
    b.classList.toggle('active', (b.dataset.service || '') === (type || ''));
  });
  renderReservationsTable(allReservations);
};

window.clearServiceFilter = function() {
  window.filterByService('');
};

// ─── Inteligencia de prospectos ───────────────────────────────────────────────
let _allProspects = [];
let _activeFilter = 'all';
let _selectedProspects = new Set();

function getVisibleProspects() {
  if (_activeFilter === 'all') return _allProspects;
  if (_activeFilter === 'urgent') return _allProspects.filter(p => getUrgencyLevel(p) === 'urgent');
  return _allProspects.filter(p => p.engagement === _activeFilter);
}

function getUrgencyLevel(p) {
  if (p.engagement === 'hot' && (p.days_since_last ?? 0) >= 2) return 'urgent';
  return p.engagement; // 'hot' | 'warm' | 'cold'
}

// ─── Grupos de Interesados (Fase 1 Aurora CRM) ────────────────────────────────
let _igData = null;

async function loadInterestedGroups() {
  try {
    const res  = await fetch(`${API_BASE}/api/aurora/interested-groups`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    const { partial, inactive, cancelled } = json.data;
    const counts = json.counts;

    // Guardar en memoria para modal de campaña
    _igData = { partial, inactive, cancelled };

    // Actualizar contadores header
    document.getElementById('ig-count-partial').textContent   = counts.partial;
    document.getElementById('ig-count-inactive').textContent  = counts.inactive;
    document.getElementById('ig-count-cancelled').textContent = counts.cancelled;
    document.getElementById('tc-main-interesados').textContent = counts.total > 0 ? counts.total : '';

    // Renderizar cada grupo
    renderInterestedList('ig-partial-list',   partial,   renderPartialCard);
    renderInterestedList('ig-inactive-list',  inactive,  renderInactiveCard);
    renderInterestedList('ig-cancelled-list', cancelled, renderCancelledCard);

  } catch (err) {
    console.error('[AURORA-DASH] Error cargando grupos interesados:', err);
    ['ig-partial-list','ig-inactive-list','ig-cancelled-list'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<div style="color:#f87171;font-size:13px;">Error cargando datos. Intenta actualizar.</div>';
    });
  }
}

function renderInterestedList(containerId, items, cardFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = `<div style="color:#475569;font-size:13px;padding:12px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <span>✅ Sin registros en este grupo · <span style="color:#64748b;font-size:12px;">Los datos aparecen cuando hay actividad real (reservas parciales, clientes inactivos o canceladas).</span></span>
      <button onclick="sendCampaignToProspects('all')" class="btn btn-sm" style="background:#064e3b;color:#34d399;border:1px solid #065f46;font-size:12px;padding:4px 12px;border-radius:6px;cursor:pointer;">📣 Usar prospectos activos</button>
    </div>`;
    return;
  }
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">${items.map(cardFn).join('')}</div>`;
}

function serviceLabel(type) {
  const map = { hotDesk: '🖥️ Hot Desk', meetingRoom: '🏢 Sala de Reuniones', deskIndividual: '🪑 Escritorio Individual' };
  return map[type] || type || '—';
}

function renderPartialCard(p) {
  const name = p.user_name || 'Sin nombre';
  const days = p.days_ago != null ? `hace ${p.days_ago} días` : '—';
  const progress = p.form_progress ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px;">Progreso: ${p.form_progress}</div>` : '';
  return `<div style="background:#1e293b;border:1px solid #334155;border-left:3px solid #f97316;border-radius:8px;padding:14px;">
    <div style="font-size:13px;font-weight:600;color:#f1f5f9;">${name}</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${p.user_phone}</div>
    <div style="font-size:12px;color:#fb923c;margin-top:6px;">${serviceLabel(p.service_type)}</div>
    ${p.wanted_date ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">Quería: ${p.wanted_date}</div>` : ''}
    ${progress}
    <div style="font-size:11px;color:#475569;margin-top:8px;">Último contacto: ${days}</div>
  </div>`;
}

function renderInactiveCard(p) {
  const name = p.user_name || 'Sin nombre';
  const days = p.days_since != null ? `hace ${p.days_since} días` : '—';
  return `<div style="background:#1e293b;border:1px solid #334155;border-left:3px solid #3b82f6;border-radius:8px;padding:14px;">
    <div style="font-size:13px;font-weight:600;color:#f1f5f9;">${name}</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${p.user_phone}</div>
    <div style="font-size:12px;color:#60a5fa;margin-top:6px;">Último: ${serviceLabel(p.last_service_type)}</div>
    <div style="font-size:11px;color:#475569;margin-top:8px;">Sin reservar ${days}</div>
  </div>`;
}

function renderCancelledCard(p) {
  const name = p.user_name || 'Sin nombre';
  const days = p.days_ago != null ? `hace ${p.days_ago} días` : '—';
  return `<div style="background:#1e293b;border:1px solid #334155;border-left:3px solid #ef4444;border-radius:8px;padding:14px;">
    <div style="font-size:13px;font-weight:600;color:#f1f5f9;">${name}</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${p.user_phone}</div>
    <div style="font-size:12px;color:#f87171;margin-top:6px;">${serviceLabel(p.service_type)}</div>
    ${p.reservation_date ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">Fecha reservada: ${p.reservation_date}</div>` : ''}
    <div style="font-size:11px;color:#475569;margin-top:8px;">Canceló ${days}</div>
  </div>`;
}

// ─── Campaña manual a grupo de interesados ────────────────────────────────────
let _campaignGroup = null;
let _campaignPhones = [];

window.openCampaignModal = function(group) {
  const groupData = {
    partial:   { label: '⏸️ Se fueron a la mitad',   listId: 'ig-partial-list'   },
    inactive:  { label: '🌙 No volvieron',             listId: 'ig-inactive-list'  },
    cancelled: { label: '❌ Cancelaron su reserva',    listId: 'ig-cancelled-list' },
  };
  const meta = groupData[group];
  if (!meta) return;

  const groupMap = { partial: _igData?.partial, inactive: _igData?.inactive, cancelled: _igData?.cancelled };
  const items    = groupMap[group] || [];
  const phones   = items.map(p => p.user_phone).filter(Boolean);

  openCampaignModalWithPhones(`📣 Campaña — ${meta.label}`, phones, group);
};

window.closeCampaignModal = function() {
  document.getElementById('campaign-modal').style.display = 'none';
};

window.sendCampaign = async function() {
  const message = document.getElementById('campaign-message').value.trim();
  if (!message) { showToast('⚠️ Escribe el mensaje antes de enviar'); return; }
  if (!_campaignPhones.length) { showToast('⚠️ Sin contactos en este grupo'); return; }

  const btn = document.getElementById('campaign-send-btn');
  btn.disabled = true;
  btn.textContent = `⏳ Enviando a ${_campaignPhones.length}…`;

  try {
    const res  = await fetch(`${API_BASE}/api/aurora/send-campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phones: _campaignPhones, message, group: _campaignGroup })
    });
    const json = await res.json();
    const resultEl = document.getElementById('campaign-result');
    if (json.ok) {
      resultEl.style.cssText = 'display:block;background:#022c22;color:#6ee7b7;border:1px solid #065f46;';
      resultEl.textContent = `✅ Enviados: ${json.sent} · Fallidos: ${json.failed} · Total: ${json.total}`;
      btn.textContent = '✅ Enviado';
      showToast(`✅ Campaña enviada: ${json.sent} mensajes`);
    } else {
      resultEl.style.cssText = 'display:block;background:#450a0a;color:#fca5a5;border:1px solid #7f1d1d;';
      resultEl.textContent = `❌ Error: ${json.error}`;
      btn.disabled = false;
      btn.textContent = '📤 Enviar a todos';
    }
  } catch (err) {
    showToast('❌ Error de red. Intenta de nuevo.');
    btn.disabled = false;
    btn.textContent = '📤 Enviar a todos';
  }
};


const URGENCY_STYLE = {
  urgent: { border: '#dc2626', bg: '#2d0a0a', badge: '<span class="prospect-badge-urgent" style="background:#dc2626;color:white;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">🚨 URGENTE</span>' },
  hot:    { border: '#ea580c', bg: '#2a1205', badge: '<span style="background:#431407;color:#fb923c;border:1px solid #7c2d12;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">🔥 HOT</span>' },
  warm:   { border: '#d97706', bg: '#221505', badge: '<span style="background:#422006;color:#f59e0b;border:1px solid #92400e;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">🌡 WARM</span>' },
  cold:   { border: '#60a5fa', bg: '#0a1628', badge: '<span style="background:#0f2040;color:#60a5fa;border:1px solid #2563eb;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">❄️ COLD</span>' },
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

function buildProspectRow(p) {
  const urgency   = getUrgencyLevel(p);
  const style     = URGENCY_STYLE[urgency] || URGENCY_STYLE.cold;
  const name      = p.user_name  || 'Sin nombre';
  const phone     = p.user_phone || '';
  const days      = p.days_since_last ?? 0;
  const msgs      = p.interaction_count || 0;
  const daysColor = days <= 1 ? '#16a34a' : days <= 3 ? '#d97706' : '#dc2626';
  const daysLabel = days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days}d`;

  const rawTopics   = Array.isArray(p.topics) ? p.topics : [];
  const topicLabels = formatTopics(rawTopics);
  const topicChips  = topicLabels.slice(0, 3)
    .map(t => `<span style="background:#0f172a;color:#94a3b8;padding:2px 6px;border-radius:99px;font-size:10px;border:1px solid #334155;display:inline-block;margin:1px;">${t}</span>`)
    .join('') || '<span style="color:#475569;font-size:11px;">—</span>';

  const waTpl       = getWaTemplate(rawTopics, name);
  const waLink      = `https://wa.me/${phone.replace(/\D/g,'')}?text=${waTpl}`;
  const phoneEnc    = phone.replace(/"/g, '&quot;');
  const phoneDigits = phone.replace(/\D/g, '');
  const isChecked   = _selectedProspects.has(phone);

  return `
    <tr style="border-bottom:1px solid #1e293b;${isChecked ? 'background:#0f2040;' : ''}" data-phone="${phoneEnc}">
      <td style="padding:8px 10px;text-align:center;">
        <input type="checkbox" class="prospect-check" data-phone="${phoneEnc}" ${isChecked ? 'checked' : ''}
          style="cursor:pointer;width:14px;height:14px;accent-color:#3b82f6;">
      </td>
      <td style="padding:8px 10px;">
        <div style="margin-bottom:2px;">${style.badge}</div>
        <div style="font-size:10px;color:#475569;text-align:center;margin-top:3px;">${msgs} msgs</div>
      </td>
      <td style="padding:8px 10px;overflow:hidden;">
        <div style="font-weight:600;color:#f1f5f9;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${name}">${name}</div>
        <button onclick="copyToClipboard('${phoneDigits}', this)" style="background:none;border:none;cursor:pointer;color:#475569;font-size:10px;font-family:monospace;padding:0;display:block;margin-top:1px;" data-tip="Copiar teléfono">${maskPhone(phone)}</button>
        <div style="font-size:11px;color:${daysColor};font-weight:600;margin-top:1px;">${daysLabel}</div>
      </td>
      <td style="padding:8px 10px;">
        <div style="display:flex;flex-wrap:wrap;gap:2px;">${topicChips}</div>
      </td>
      <td style="padding:8px 8px;text-align:center;">
        <a href="${waLink}" target="_blank" title="WhatsApp" style="display:inline-flex;align-items:center;justify-content:center;background:#0d3b26;color:#4ade80;width:36px;height:28px;border-radius:6px;text-decoration:none;font-size:15px;border:1px solid #15803d;">💬</a>
      </td>
    </tr>`;}

window.loadAbandoned = async function() {
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
    const mainProspEl = document.getElementById('tc-main-prospectos');
    if (mainProspEl) mainProspEl.textContent = data.stats.total;

    _allProspects = data.data;
    _activeFilter = 'all';
    document.querySelectorAll('#prospect-filters .pill').forEach(b => {
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
  const selCount    = _selectedProspects.size;
  const isAllChecked = prospects.length > 0 && prospects.every(p => _selectedProspects.has(p.user_phone || ''));
  const thStyle = 'text-align:left;padding:8px 10px;font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #334155;white-space:nowrap;';
  gridEl.innerHTML = `
    <div id="prospect-selection-bar" style="display:${selCount > 0 ? 'flex' : 'none'};align-items:center;justify-content:space-between;background:#0f2040;border:1px solid #2563eb;border-radius:8px;padding:10px 16px;margin-bottom:12px;gap:8px;flex-wrap:wrap;">
      <span style="color:#93c5fd;font-size:13px;font-weight:600;">${selCount} seleccionado${selCount !== 1 ? 's' : ''}</span>
      <div style="display:flex;gap:8px;">
        <button onclick="sendCampaignToSelected()" style="background:#1d4ed8;color:#fff;border:none;padding:5px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">📣 Campaña a seleccionados</button>
        <button onclick="clearProspectSelection()" style="background:none;border:1px solid #334155;color:#94a3b8;padding:5px 10px;border-radius:6px;font-size:12px;cursor:pointer;">✕ Limpiar</button>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed;min-width:560px;">
        <colgroup>
          <col style="width:38px;">
          <col style="width:100px;">
          <col style="width:175px;">
          <col>
          <col style="width:50px;">
        </colgroup>
        <thead style="background:#0f172a;">
          <tr>
            <th style="${thStyle}text-align:center;">
              <input type="checkbox" id="prospect-check-all" ${isAllChecked ? 'checked' : ''}
                style="cursor:pointer;width:14px;height:14px;accent-color:#3b82f6;"
                title="Seleccionar todos los visibles">
            </th>
            <th style="${thStyle}">Urgencia</th>
            <th style="${thStyle}">Cliente</th>
            <th style="${thStyle}">Interés detectado</th>
            <th style="${thStyle}text-align:center;">WA</th>
          </tr>
        </thead>
        <tbody>${prospects.map(buildProspectRow).join('')}</tbody>
      </table>`;
}

window.filterProspects = function(filter) {
  _activeFilter = filter;
  _selectedProspects.clear();
  document.querySelectorAll('#prospect-filters .pill').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  renderProspectGrid(getVisibleProspects());
}

window.sendCampaignToSelected = function() {
  const phones = Array.from(_selectedProspects);
  if (!phones.length) { showToast('⚠️ Selecciona al menos un prospecto primero'); return; }
  openCampaignModalWithPhones(
    `📣 Campaña — ${phones.length} seleccionado${phones.length !== 1 ? 's' : ''}`,
    phones,
    'prospectos_seleccion'
  );
};

window.clearProspectSelection = function() {
  _selectedProspects.clear();
  renderProspectGrid(getVisibleProspects());
};

window.copyCampaignList = function() {
  if (!_allProspects.length) { showToast('⚠️ Primero carga los prospectos'); return; }
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
    showToast('✅ ¡Lista copiada al portapapeles!');
    const btn = document.getElementById('qa-copy-list') || document.getElementById('btn-copy-campaign-prospects');
    if (btn) { const orig = btn.innerHTML; btn.innerHTML = '✅ ¡Copiado!'; setTimeout(() => { btn.innerHTML = orig; }, 2200); }
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

// ─── Métricas semanales ────────────────────────────────────────────────────────
async function loadMetricas() {
  const loadingEl  = document.getElementById('met-loading');
  const tableWrap  = document.getElementById('met-table-wrap');
  const emptyEl    = document.getElementById('met-empty');
  const btypeWrap  = document.getElementById('met-bytype-wrap');
  const btypeEmpty = document.getElementById('met-bytype-empty');
  const el = id => document.getElementById(id);
  if (loadingEl) loadingEl.style.display = 'block';
  if (tableWrap) tableWrap.style.display = 'none';
  if (emptyEl)   emptyEl.style.display   = 'none';
  if (btypeWrap) btypeWrap.style.display = 'none';
  try {
    const res = await fetch('/api/aurora/stats/weekly');
    const d   = await res.json();
    if (!d.ok) throw new Error(d.error || 'Error al cargar métricas');
    const { weeks, byType, conversionRate } = d.data;
    if (loadingEl) loadingEl.style.display = 'none';

    // ── KPI cards ─────────────────────────────────────────────────────────
    const lastWeek = weeks[weeks.length - 1] || {};
    if (el('met-week-total'))   el('met-week-total').textContent   = lastWeek.total   ?? '0';
    if (el('met-week-revenue')) el('met-week-revenue').textContent = '$' + (+(lastWeek.revenue ?? 0)).toFixed(0);
    if (el('met-conversion'))   el('met-conversion').textContent   = conversionRate + '%';
    const typeLabels = {
      sala_reunion:'Sala Reunión', oficina_privada:'Oficina Privada',
      hot_desk:'Hot Desk', evento:'Evento', coworking:'Coworking'
    };
    if (el('met-top-type') && byType.length) {
      el('met-top-type').textContent = typeLabels[byType[0].service_type] || byType[0].service_type;
    }

    // ── Tabla semanal ─────────────────────────────────────────────────────
    if (!weeks.length) { if (emptyEl) emptyEl.style.display = 'block'; return; }
    const tbody = document.getElementById('met-tbody');
    if (tbody) {
      tbody.innerHTML = weeks.map(w => {
        const rate = w.total > 0 ? Math.round((w.confirmed / w.total) * 100) : 0;
        const dt   = new Date(w.weekStart + 'T12:00:00Z');
        const lbl  = dt.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
        const rateColor = rate >= 50 ? '#4ade80' : '#f59e0b';
        return `<tr style="border-bottom:1px solid #1e293b;">
          <td style="padding:10px 14px;color:#e2e8f0;">Sem&nbsp;${lbl}</td>
          <td style="padding:10px 14px;text-align:right;color:#94a3b8;">${w.total}</td>
          <td style="padding:10px 14px;text-align:right;color:#60a5fa;">${w.confirmed}</td>
          <td style="padding:10px 14px;text-align:right;color:#4ade80;">$${(+w.revenue).toFixed(0)}</td>
          <td style="padding:10px 14px;text-align:right;color:${rateColor};">${rate}%</td>
        </tr>`;
      }).join('');
    }
    if (tableWrap) tableWrap.style.display = 'block';

    // ── Barras por tipo ────────────────────────────────────────────────────
    if (byType.length) {
      const maxCount = byType[0].count;
      const barsEl   = document.getElementById('met-bytype-bars');
      if (barsEl) {
        barsEl.innerHTML = byType.map(t => {
          const pct = Math.round((t.count / maxCount) * 100);
          const lbl = typeLabels[t.service_type] || t.service_type;
          return `<div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#94a3b8;margin-bottom:4px;">
              <span>${lbl}</span><span>${t.count}</span>
            </div>
            <div style="background:#1e293b;border-radius:4px;height:8px;">
              <div style="width:${pct}%;background:#60a5fa;border-radius:4px;height:8px;transition:width .4s;"></div>
            </div>
          </div>`;
        }).join('');
      }
      if (btypeWrap)  btypeWrap.style.display  = 'block';
      if (btypeEmpty) btypeEmpty.style.display = 'none';
    } else {
      if (btypeEmpty) btypeEmpty.style.display = 'block';
    }
  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl) {
      emptyEl.style.display = 'block';
      const p = emptyEl.querySelector('p');
      if (p) p.textContent = 'Error: ' + err.message;
    }
    console.error('[AURORA-MÉTRICAS]', err);
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
      const agentsFull = (c.agents || []).filter(Boolean);
      const agents = agentsFull.length > 3
        ? agentsFull.slice(0,3).join(', ') + ` +${agentsFull.length - 3} más`
        : agentsFull.join(', ') || '-';
      // Topics: filtrar / traducir — máx 3 visibles
      const labeledTopics = formatTopics((c.topics || []).filter(Boolean));
      const visibleTopics = labeledTopics.slice(0, 3);
      const extraTopics   = labeledTopics.length - visibleTopics.length;
      const topicsHtml = labeledTopics.length
        ? visibleTopics.map(t => `<span style="background:#1e3a5f;color:#60a5fa;padding:2px 8px;border-radius:99px;font-size:11px;margin:2px;display:inline-block;border:1px solid #1e4a7a;">${t}</span>`).join('')
          + (extraTopics > 0 ? `<span style="background:#334155;color:#94a3b8;padding:2px 8px;border-radius:99px;font-size:11px;margin:2px;display:inline-block;" title="${labeledTopics.slice(3).join(', ')}">+${extraTopics} más</span>` : '')
        : '<span style="color:#475569;font-size:12px;">—</span>';
      // CRM status badge (multi-agente)
      const crmStatus    = c.crm_status;
      const crmAgent     = c.crm_agent;
      const agentEmojis  = {ALUNA:'💼',GABI:'⚖️',ENZO:'🎯',PAULA:'🏠',AXEL:'🔧',ADRIANA:'🛡️'};
      const agentColors  = {ALUNA:'#022c22',GABI:'#422006',ENZO:'#450a0a',PAULA:'#2e1065',AXEL:'#1e3a5f',ADRIANA:'#022c22'};
      const agentText    = {ALUNA:'#34d399',GABI:'#f59e0b',ENZO:'#f87171',PAULA:'#c4b5fd',AXEL:'#60a5fa',ADRIANA:'#34d399'};
      const bg   = (crmStatus && crmAgent) ? (agentColors[crmAgent] || '#1e293b') : '#1e293b';
      const tc   = (crmStatus && crmAgent) ? (agentText[crmAgent]   || '#94a3b8') : '#94a3b8';
      const em   = crmAgent ? (agentEmojis[crmAgent] || '📋') : '⬜';
      const crmBadge = crmStatus
        ? `<span style="background:${bg};color:${tc};padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;border:1px solid ${tc}22;">${em} ${crmAgent} · ${crmStatus}</span>`
        : '<span style="color:#475569;font-size:12px;">Sin CRM</span>';
      const proforma  = c.proforma_code ? `<small style="color:#64748b; font-size:11px;display:block;margin-top:4px;">${c.proforma_code}</small>` : '';
      // Alias de cliente (últimos 4 del teléfono, privacidad)
      const alias = 'CLI-' + (phone.replace(/\D/g,'').slice(-4) || '????');
      const waLink = `https://wa.me/${phone.replace(/\D/g,'')}`;
      return `
        <tr class="conv-row" style="border-bottom:1px solid #1e293b;">
          <td style="padding:12px 16px;">
            <strong style="color:#f1f5f9;">${name}</strong><br>
            <small style="color:#475569;font-size:11px;">${alias} · <button onclick="copyToClipboard('${phone.replace(/\D/g,'').replace(/\\/g,'')}', this)" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:11px;font-family:monospace;padding:0;" data-tip="Copiar teléfono">${maskPhone(phone)}</button></small>
          </td>
          <td style="padding:12px 16px; text-align:center;">
            <span style="background:#1e3a5f; color:#60a5fa; padding:4px 12px; border-radius:99px; font-weight:700; font-size:14px;">${c.message_count}</span>
          </td>
          <td style="padding:12px 16px; color:#94a3b8; font-size:13px;">${last}</td>
          <td style="padding:12px 16px; color:#64748b; font-size:13px;">${first}</td>
          <td style="padding:12px 16px; font-size:12px; color:#94a3b8; max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${agentsFull.join(', ')}">${agents}</td>
          <td style="padding:12px 16px; max-width:180px;">${topicsHtml}</td>
          <td style="padding:12px 16px;">${crmBadge}${proforma}</td>
          <td style="padding:12px 16px; display:flex; gap:8px; flex-wrap:wrap;">
            <button data-action="open-thread" data-phone="${phone.replace(/"/g,'&quot;')}" data-name="${name.replace(/"/g,'&quot;')}" data-alias="${alias}" style="background:#1d4ed8;color:#fff;border:none;font-size:12px; padding:5px 12px; border-radius:6px; cursor:pointer;font-weight:600;" data-tip="Ver historial de mensajes con este usuario">💬 Ver hilo</button>
            <a href="${waLink}" target="_blank" style="background:#0d3b26; color:#4ade80; padding:5px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600;border:1px solid #15803d;" data-tip="Abrir WhatsApp con este cliente">WhatsApp</a>
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
      const agentBubble = agentLabel ? `<small style="color:${isUser ? '#6b7280' : '#60a5fa'}; font-size:11px;">${agentLabel}</small>` : '';
      const content = m.content || '';
      if (!content.trim()) return '';
      return `
        <div style="display:flex; flex-direction:column; align-items:${isUser ? 'flex-start' : 'flex-end'};">
          <div style="max-width:75%; background:${isUser ? '#1e293b' : '#064e3b'}; color:${isUser ? '#cbd5e1' : '#6ee7b7'}; border-radius:${isUser ? '4px 16px 16px 4px' : '16px 4px 4px 16px'}; padding:10px 14px; font-size:14px; line-height:1.5; white-space:pre-wrap; border:1px solid ${isUser ? '#334155' : '#065f46'};">
            ${content.substring(0, 800)}${content.length > 800 ? '…' : ''}
          </div>
          <div style="display:flex; gap:6px; margin-top:3px; align-items:center;">${agentBubble}<small style="color:#475569; font-size:11px;">${time}</small></div>
        </div>`;
    }).filter(Boolean).join('');

    // Scroll to bottom of thread
    threadBody.scrollTop = threadBody.scrollHeight;
  } catch (err) {
    threadBody.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">Error: ${err.message}</p>`;
  }
}

window.closeThread = function() {
  document.getElementById('conv-thread').style.display = 'none';
};

// Campaña WA masivo — abre modal con reservas completadas este mes
window.sendCampaignWA = function() {
  const cutoff = new Date();
  cutoff.setDate(1);
  cutoff.setHours(0, 0, 0, 0);
  const completed = allReservations.filter(r => r.status === 'completed' && new Date(r.created_at || r.updated_at) >= cutoff);

  if (!completed.length) {
    showToast('No hay reservas completadas este mes para campaña D+7.');
    return;
  }

  const phones = completed.map(r => r.user_phone).filter(Boolean);
  openCampaignModalWithPhones(
    '🔄 Seguimiento D+7 — Completaron este mes',
    phones,
    'reservas_mes',
    `Hola {{nombre}}! 👋 Soy Aurora de Coworkia. ¿Cómo te fue en tu reserva? Recuerda que tienes tarifa preferencial para volver a reservar esta semana. ¿Te agendamos? 🏢`
  );
}

// Campaña WA desde prospectos — abre modal con subset de prospectos
window.sendCampaignToProspects = function(filter) {
  if (!_allProspects.length) { showToast('⚠️ Primero carga los prospectos (tab Prospectos)'); return; }

  let subset;
  let label;
  if (filter === 'urgent') {
    subset = _allProspects.filter(p => getUrgencyLevel(p) === 'urgent');
    label  = '🚨 Campaña — Urgentes';
  } else if (filter === 'hot') {
    subset = _allProspects.filter(p => p.engagement === 'hot');
    label  = '🔥 Campaña — HOT';
  } else {
    subset = _allProspects;
    label  = '📣 Campaña — Todos los prospectos';
  }

  if (!subset.length) { showToast(`No hay prospectos en este segmento.`); return; }

  const phones = subset.map(p => p.user_phone).filter(Boolean);
  openCampaignModalWithPhones(label, phones, 'prospectos_' + filter);
}

// Helper centralizado que puebla el modal de campaña con cualquier lista de phones
window.openCampaignModalWithPhones = function(title, phones, group, defaultMessage) {
  _campaignPhones = phones;
  _campaignGroup  = group;

  document.getElementById('campaign-modal-title').textContent = title;
  const hasContacts = phones.length > 0;
  document.getElementById('campaign-modal-info').innerHTML = hasContacts
    ? `<strong style="color:#f1f5f9;">${phones.length} personas</strong> recibirán este mensaje por WhatsApp.`
    : `<span style="color:#f59e0b;">⚠️ Este segmento no tiene contactos actualmente.</span>`;
  document.getElementById('campaign-message').value = defaultMessage || '';
  document.getElementById('campaign-result').style.display = 'none';
  document.getElementById('campaign-send-btn').disabled  = !hasContacts;
  document.getElementById('campaign-send-btn').textContent = hasContacts ? '📤 Enviar a todos' : '⚫ Sin contactos';

  document.getElementById('campaign-modal').style.display = 'flex';
}

// ─── Click-to-copy teléfono ───────────────────────────────────────────────────
window.copyToClipboard = function(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ Teléfono copiado');
    if (btn) { const orig = btn.textContent; btn.textContent = '✓'; setTimeout(() => { btn.textContent = orig; }, 1500); }
  }).catch(() => showToast('⚠️ No se pudo copiar'));
};

// ─── Timestamp "Actualizado: hace Xs" ────────────────────────────────────────
let _lastRefreshedAt = null;

function updateLastRefreshed() {
  _lastRefreshedAt = Date.now();
  _renderLastRefreshed();
}

function _renderLastRefreshed() {
  const el = document.getElementById('last-refreshed');
  if (!el || !_lastRefreshedAt) return;
  const secs = Math.round((Date.now() - _lastRefreshedAt) / 1000);
  el.textContent = secs < 60
    ? `Actualizado: hace ${secs}s`
    : `Actualizado: hace ${Math.floor(secs / 60)}m`;
}

// Refresca todo el dashboard de una vez
window.refreshAll = function() {
  loadReservations();
  loadAbandoned();
  loadConversations();
}



// ─── sendFollowupNow: envío directo sin modal ─────────────────────────────────
window.sendFollowupNow = async function(id, type, btn) {
  const origText  = btn.textContent;
  btn.disabled    = true;
  btn.textContent = '⏳';
  const endpoint = type === '1h'
    ? `/api/aurora/reservations/${id}/send-followup-1h`
    : `/api/aurora/reservations/${id}/send-rebooking`;
  try {
    const res  = await fetch(`${API_BASE}${endpoint}`, { method: 'POST' });
    const data = await res.json();
    if (data.ok)  { showToast('✅ Enviado'); btn.textContent = '✓'; }
    else { showToast('❌ ' + (data.error || 'Error')); btn.disabled = false; btn.textContent = origText; }
  } catch (err) { showToast('❌ Error de red'); btn.disabled = false; btn.textContent = origText; }
};

// ── Automatizaciones stats ────────────────────────────────────────────────────
async function loadAutomationStats() {
  try {
    const res = await fetch(`${API_BASE}/api/aurora/automations/stats`);
    const data = await res.json();
    if (!data.ok || !data.stats) return;

    const mapping = {
      followup_1h:  { prefix: '1h' },
      followup_d1:  { prefix: 'd1' },
      followup_d3:  { prefix: 'd3' },
      reminder_24h: { prefix: '24h' },
      reminder_2h:  { prefix: '2h' },
      no_show:      { prefix: 'noshow' },
      rebook_d7:    { prefix: 'd7' },
      payment:      { prefix: 'pay' },
      upsell:       { prefix: 'upsell' }
    };

    for (const [key, cfg] of Object.entries(mapping)) {
      const s = data.stats[key];
      if (!s) continue;
      const el = (id) => document.getElementById(id);
      const todayEl = el(`auto-${cfg.prefix}-today`);
      const weekEl  = el(`auto-${cfg.prefix}-week`);
      const totalEl = el(`auto-${cfg.prefix}-total`);
      const lastEl  = el(`auto-${cfg.prefix}-last`);

      if (todayEl) todayEl.textContent = s.today;
      if (weekEl)  weekEl.textContent  = s.week;
      if (totalEl) totalEl.textContent = s.total;
      if (lastEl) {
        lastEl.textContent = s.lastSent
          ? new Date(s.lastSent).toLocaleString('es-EC', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
          : '—';
      }

      // Update status badge dynamically based on whether automation has sent anything
      const card = document.querySelector(`[data-auto="${key}"]`);
      if (card) {
        const badge = card.querySelector('.auto-card-status');
        if (badge && s.total > 0) {
          badge.className = 'auto-card-status auto-status-active';
          badge.textContent = '✅ Activo';
        }
      }
    }

    console.log('[AURORA-DASH] ⚙️ Automation stats cargadas');
  } catch (err) {
    console.warn('[AURORA-DASH] No se pudieron cargar automation stats:', err.message);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
try {
  console.log('[AURORA-DASH] Configurando event listeners...');

  document.getElementById('filter-date').addEventListener('change', (e) => {
    currentFilters.date = e.target.value;
    loadReservations();
  });

  document.getElementById('search').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => loadReservations(), 450);
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
  document.getElementById('btn-refresh-interesados')?.addEventListener('click', () => { _interestedLoaded = false; loadInterestedGroups(); _interestedLoaded = true; });
  document.getElementById('btn-copy-campaign-prospects')?.addEventListener('click', () => copyCampaignList());
  document.getElementById('btn-refresh-prospects')?.addEventListener('click', () => loadAbandoned());
  document.getElementById('btn-refresh-conversations')?.addEventListener('click', () => loadConversations());
  document.getElementById('btn-refresh-metricas')?.addEventListener('click', () => { _metricasLoaded = false; loadMetricas(); _metricasLoaded = true; });
  document.getElementById('btn-close-thread')?.addEventListener('click', () => closeThread());
  document.getElementById('btn-fab-refresh')?.addEventListener('click', () => refreshAll());

  // ── Main tabs ─────────────────────────────────────────────────────────────
  document.getElementById('main-tabs')?.addEventListener('click', function(e) {
    const btn = e.target.closest('.tab-btn');
    if (!btn || !btn.dataset.maintab) return;
    switchMainTab(btn.dataset.maintab);
  });

  // ── Campaign D+7 button (tab reservas) ───────────────────────────────────
  document.getElementById('btn-campaign-wa')?.addEventListener('click', () => sendCampaignWA());

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

  // ── Event delegation: botones de follow-up → envío directo ─────────────────
  document.getElementById('table-body')?.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-fu-action]');
    if (!btn) return;
    const id     = btn.dataset.fuId;
    const action = btn.dataset.fuAction;
    window.sendFollowupNow(id, action === 'followup-1h' ? '1h' : 'd7', btn);
  });

  // ── Event delegation: pills de filtro por servicio ───────────────────────
  document.getElementById('service-filter-pills')?.addEventListener('click', function(e) {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    filterByService(btn.dataset.service);
  });

  // ── Event delegation: checkboxes de prospectos (select + select all) ──────
  document.getElementById('prospects-grid')?.addEventListener('change', function(e) {
    const visible = getVisibleProspects();
    // "Select all" checkbox
    if (e.target.id === 'prospect-check-all') {
      if (e.target.checked) visible.forEach(p => { if (p.user_phone) _selectedProspects.add(p.user_phone); });
      else visible.forEach(p => { if (p.user_phone) _selectedProspects.delete(p.user_phone); });
      renderProspectGrid(visible);
      return;
    }
    // Individual checkbox
    const cb = e.target.closest('.prospect-check');
    if (!cb) return;
    const phone = cb.dataset.phone;
    if (!phone) return;
    if (cb.checked) _selectedProspects.add(phone);
    else _selectedProspects.delete(phone);
    // Update selection bar without full re-render
    const bar = document.getElementById('prospect-selection-bar');
    if (bar) {
      bar.style.display = _selectedProspects.size > 0 ? 'flex' : 'none';
      const countEl = bar.querySelector('span');
      if (countEl) countEl.textContent = `${_selectedProspects.size} seleccionado${_selectedProspects.size !== 1 ? 's' : ''}`;
    }
    const row = cb.closest('tr');
    if (row) row.style.background = cb.checked ? '#0f2040' : '';
    // Sync "select all" checkbox
    const allCb = document.getElementById('prospect-check-all');
    if (allCb) allCb.checked = visible.length > 0 && visible.every(p => _selectedProspects.has(p.user_phone || ''));
  });

  // ── Keyboard shortcuts 1/2/3/4/R ─────────────────────────────────────────
  document.addEventListener('keydown', function(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (e.key === '1') switchMainTab('reservas');
    else if (e.key === '2') switchMainTab('prospectos');
    else if (e.key === '3') switchMainTab('interesados');
    else if (e.key === '4') switchMainTab('conversaciones');
    else if (e.key === '5') switchMainTab('metricas');
    else if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); refreshAll(); showToast('🔄 Actualizando...'); }
  });

  console.log('[AURORA-DASH] Event listeners configurados');

  // Siempre arrancar en tab 'all' para evitar quedar atrapado en D+7=0
  localStorage.removeItem('aurora_active_tab');
  const savedMainTab = localStorage.getItem('aurora_main_tab') || 'reservas';
  if (savedMainTab !== 'reservas') switchMainTab(savedMainTab);

  // Cargar al inicio
  console.log('[AURORA-DASH] Iniciando carga...');
  loadReservations().catch(err => {
    console.error('[AURORA-DASH] Error fatal en carga inicial:', err);
  });

  // Auto-refresh stats cada 30s
  setInterval(loadStats, 30000);

  // Badge "hace Xs" — actualiza cada 15s sin recargar datos
  setInterval(_renderLastRefreshed, 15000);

  // Prospectos: cargar al inicio + refresco cada 60s (alimenta el badge del tab)
  loadAbandoned();
  setInterval(loadAbandoned, 60000);

  // Conversaciones: se cargan la primera vez que se abre ese tab (lazy-load)

  // Métricas: se cargan la primera vez que se abre ese tab (lazy-load)

  // Automatizaciones: cargar stats al inicio + refresh cada 60s
  loadAutomationStats();
  setInterval(loadAutomationStats, 60000);

  document.getElementById('btn-refresh-automations')?.addEventListener('click', () => {
    loadAutomationStats();
    showToast('⚙️ Automatizaciones actualizadas');
  });

  console.log('[AURORA-DASH] ✅ Inicialización completa');
} catch (error) {
  console.error('[AURORA-DASH] ❌ Error en inicialización:', error);
  showToast('❌ Error inicializando dashboard: ' + error.message, 5000);
}
}); // DOMContentLoaded
