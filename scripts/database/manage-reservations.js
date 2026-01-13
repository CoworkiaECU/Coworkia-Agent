#!/usr/bin/env node
/**
 * 🛠️ CLI para gestión manual de reservas
 * Uso: node scripts/manage-reservations.js [comando] [opciones]
 */

import databaseService from '../src/database/database.js';
import reservationRepository from '../src/database/reservationRepository.js';
import userRepository from '../src/database/userRepository.js';

const COMMANDS = {
  list: 'Listar reservas',
  create: 'Crear reserva manual',
  cancel: 'Cancelar reserva',
  search: 'Buscar reservas',
  help: 'Mostrar ayuda'
};

const SERVICE_TYPES = {
  'hot-desk': 'Hot Desk (escritorio compartido)',
  'sala-reunion': 'Sala de Reunión',
  'oficina-privada': 'Oficina Privada',
  'espacio-evento': 'Espacio para Evento'
};

const STATUSES = {
  pending: 'Pendiente de pago',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada'
};

/**
 * 📋 Listar reservas
 */
async function listReservations(options = {}) {
  const { date, status, user, serviceType, limit = 20 } = options;
  
  let query = 'SELECT * FROM reservations WHERE 1=1';
  const params = [];
  
  if (date) {
    query += ' AND date = ?';
    params.push(date);
  }
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  if (user) {
    query += ' AND user_phone LIKE ?';
    params.push(`%${user}%`);
  }
  
  if (serviceType) {
    query += ' AND service_type = ?';
    params.push(serviceType);
  }
  
  query += ' ORDER BY date DESC, start_time DESC LIMIT ?';
  params.push(limit);
  
  const reservations = await databaseService.all(query, params);
  
  if (reservations.length === 0) {
    console.log('📭 No se encontraron reservas con los criterios especificados.');
    return;
  }
  
  console.log(`\n📋 Encontradas ${reservations.length} reservas:\n`);
  console.log('═'.repeat(100));
  
  for (const res of reservations) {
    const user = await userRepository.findByPhone(res.user_phone);
    const statusIcon = res.status === 'confirmed' ? '✅' : res.status === 'cancelled' ? '❌' : '⏳';
    
    let notes = '';
    try {
      const paymentData = JSON.parse(res.payment_data || '{}');
      notes = paymentData.notes || paymentData.cancellation_reason || '';
    } catch (e) {
      // Ignorar errores de parse
    }
    
    console.log(`${statusIcon} ID: ${res.id}`);
    console.log(`   Usuario: ${user?.name || 'Desconocido'} (${res.user_phone})`);
    console.log(`   Servicio: ${SERVICE_TYPES[res.service_type] || res.service_type}`);
    console.log(`   Fecha: ${res.date} | Hora: ${res.start_time} - ${res.end_time} (${res.duration_hours}h)`);
    console.log(`   Estado: ${STATUSES[res.status] || res.status}`);
    console.log(`   Precio: $${res.total_price} | Pago: ${res.payment_status}`);
    if (notes) console.log(`   Notas: ${notes}`);
    console.log('─'.repeat(100));
  }
  
  console.log(`\nTotal: ${reservations.length} reservas\n`);
}

/**
 * ➕ Crear reserva manual
 */
async function createReservation(data) {
  const {
    userPhone,
    serviceType,
    date,
    startTime,
    endTime,
    price,
    notes
  } = data;
  
  // Validar datos requeridos
  if (!userPhone || !serviceType || !date || !startTime || !endTime) {
    throw new Error('Faltan datos requeridos: userPhone, serviceType, date, startTime, endTime');
  }
  
  // Verificar que el usuario existe
  let user = await userRepository.findByPhone(userPhone);
  if (!user) {
    console.log(`⚠️  Usuario ${userPhone} no existe. Creando perfil...`);
    await userRepository.create(userPhone, {
      name: 'Usuario Manual',
      whatsapp_display_name: 'Usuario Manual'
    });
    user = await userRepository.findByPhone(userPhone);
  }
  
  // Verificar disponibilidad (no overlaps)
  const overlaps = await databaseService.all(
    `SELECT * FROM reservations 
     WHERE date = ? 
     AND service_type = ?
     AND status != 'cancelled'
     AND (
       (start_time <= ? AND end_time > ?) OR
       (start_time < ? AND end_time >= ?) OR
       (start_time >= ? AND end_time <= ?)
     )`,
    [date, serviceType, startTime, startTime, endTime, endTime, startTime, endTime]
  );
  
  if (overlaps.length > 0) {
    console.log('❌ Conflicto de horario detectado:');
    for (const overlap of overlaps) {
      console.log(`   - Reserva ${overlap.reservation_id}: ${overlap.start_time} - ${overlap.end_time}`);
    }
    throw new Error('Ya existe una reserva en ese horario para ese servicio');
  }
  
  // Crear reserva
  const reservationId = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  // Calcular duración en horas
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const durationHours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
  
  await databaseService.run(
    `INSERT INTO reservations 
     (id, user_phone, service_type, date, start_time, end_time, 
      duration_hours, total_price, status, payment_status, payment_data, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      reservationId,
      userPhone,
      serviceType,
      date,
      startTime,
      endTime,
      durationHours,
      price || 0,
      'confirmed',
      'pending',
      JSON.stringify({ method: 'manual', notes: notes || 'Reserva creada manualmente' })
    ]
  );
  
  console.log('\n✅ Reserva creada exitosamente!');
  console.log(`📋 ID: ${reservationId}`);
  console.log(`👤 Usuario: ${user.name} (${userPhone})`);
  console.log(`📅 Fecha: ${date}`);
  console.log(`⏰ Horario: ${startTime} - ${endTime}`);
  console.log(`💰 Precio: $${price || 0}\n`);
  
  return reservationId;
}

/**
 * ❌ Cancelar reserva
 */
async function cancelReservation(reservationId, reason = 'Cancelada manualmente') {
  const reservation = await databaseService.get(
    'SELECT * FROM reservations WHERE id = ?',
    [reservationId]
  );
  
  if (!reservation) {
    throw new Error(`No se encontró la reserva ${reservationId}`);
  }
  
  if (reservation.status === 'cancelled') {
    console.log('⚠️  Esta reserva ya está cancelada.');
    return;
  }
  
  // Actualizar payment_data con la razón de cancelación
  let paymentData = {};
  try {
    paymentData = JSON.parse(reservation.payment_data || '{}');
  } catch (e) {
    // Si falla el parse, usar objeto vacío
  }
  paymentData.cancellation_reason = reason;
  
  await databaseService.run(
    `UPDATE reservations 
     SET status = 'cancelled', 
         payment_data = ?
     WHERE id = ?`,
    [JSON.stringify(paymentData), reservationId]
  );
  
  console.log('\n✅ Reserva cancelada exitosamente!');
  console.log(`📋 ID: ${reservationId}`);
  console.log(`📅 Fecha: ${reservation.date}`);
  console.log(`⏰ Horario: ${reservation.start_time} - ${reservation.end_time}`);
  console.log(`💬 Razón: ${reason}\n`);
}

/**
 * 🔍 Buscar reservas
 */
async function searchReservations(query) {
  const results = await databaseService.all(
    `SELECT * FROM reservations 
     WHERE id LIKE ? 
     OR user_phone LIKE ?
     OR date LIKE ?
     OR payment_data LIKE ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
  );
  
  if (results.length === 0) {
    console.log(`📭 No se encontraron resultados para: "${query}"`);
    return;
  }
  
  // Mostrar resultados usando listReservations con los IDs encontrados
  console.log(`\n🔍 Encontradas ${results.length} reservas que coinciden con "${query}":\n`);
  console.log('═'.repeat(100));
  
  for (const res of results) {
    const user = await userRepository.findByPhone(res.user_phone);
    const statusIcon = res.status === 'confirmed' ? '✅' : res.status === 'cancelled' ? '❌' : '⏳';
    
    let notes = '';
    try {
      const paymentData = JSON.parse(res.payment_data || '{}');
      notes = paymentData.notes || paymentData.cancellation_reason || '';
    } catch (e) {
      // Ignorar errores de parse
    }
    
    console.log(`${statusIcon} ID: ${res.id}`);
    console.log(`   Usuario: ${user?.name || 'Desconocido'} (${res.user_phone})`);
    console.log(`   Servicio: ${SERVICE_TYPES[res.service_type] || res.service_type}`);
    console.log(`   Fecha: ${res.date} | Hora: ${res.start_time} - ${res.end_time} (${res.duration_hours}h)`);
    console.log(`   Estado: ${STATUSES[res.status] || res.status}`);
    console.log(`   Precio: $${res.total_price} | Pago: ${res.payment_status}`);
    if (notes) console.log(`   Notas: ${notes}`);
    console.log('─'.repeat(100));
  }
  
  console.log(`\nTotal: ${results.length} reservas\n`);
}

/**
 * 📖 Mostrar ayuda
 */
function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           🛠️  CLI de Gestión de Reservas - Coworkia          ║
╚═══════════════════════════════════════════════════════════════╝

COMANDOS DISPONIBLES:

  📋 list [opciones]
     Listar reservas con filtros opcionales
     
     Opciones:
       --date=YYYY-MM-DD       Filtrar por fecha
       --status=pending|confirmed|cancelled|completed
       --user=telefono         Filtrar por usuario (teléfono parcial)
       --service=hot-desk|sala-reunion|oficina-privada|espacio-evento
       --limit=N               Límite de resultados (default: 20)
     
     Ejemplo: npm run reservations list --date=2025-11-15 --status=confirmed

  ➕ create [opciones]
     Crear una reserva manual
     
     Opciones (requeridas):
       --phone=+593...         Teléfono del usuario
       --service=tipo          Tipo de servicio
       --date=YYYY-MM-DD       Fecha de la reserva
       --start=HH:MM           Hora de inicio
       --end=HH:MM             Hora de fin
     
     Opciones (opcionales):
       --price=N               Precio (default: 0)
       --notes="texto"         Notas adicionales
     
     Ejemplo: npm run reservations create --phone=+593987770788 \\
              --service=hot-desk --date=2025-11-15 --start=09:00 --end=13:00 \\
              --price=10 --notes="Reserva VIP"

  ❌ cancel <reservation-id> [razón]
     Cancelar una reserva existente
     
     Ejemplo: npm run reservations cancel RES-1731234567-ABC123 "Cliente canceló"

  🔍 search <término>
     Buscar reservas por ID, teléfono, fecha o notas
     
     Ejemplo: npm run reservations search "+593987770788"
     Ejemplo: npm run reservations search "2025-11-15"

  ❓ help
     Mostrar esta ayuda

═══════════════════════════════════════════════════════════════

TIPOS DE SERVICIO DISPONIBLES:
  • hot-desk          - Hot Desk (escritorio compartido)
  • sala-reunion      - Sala de Reunión
  • oficina-privada   - Oficina Privada
  • espacio-evento    - Espacio para Evento

ESTADOS DE RESERVA:
  • pending           - Pendiente de pago
  • confirmed         - Confirmada y pagada
  • cancelled         - Cancelada
  • completed         - Completada

═══════════════════════════════════════════════════════════════
`);
}

/**
 * 🚀 Main CLI
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  try {
    // Inicializar base de datos
    await databaseService.initialize();
    
    // Parsear opciones
    const options = {};
    for (const arg of args.slice(1)) {
      if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        options[key] = value || true;
      }
    }
    
    switch (command) {
      case 'list':
        await listReservations(options);
        break;
        
      case 'create':
        await createReservation({
          userPhone: options.phone,
          serviceType: options.service,
          date: options.date,
          startTime: options.start,
          endTime: options.end,
          price: parseFloat(options.price) || 0,
          notes: options.notes
        });
        break;
        
      case 'cancel':
        const reservationId = args[1];
        const reason = args.slice(2).join(' ') || 'Cancelada manualmente';
        if (!reservationId) {
          console.error('❌ Error: Debes especificar el ID de la reserva');
          process.exit(1);
        }
        await cancelReservation(reservationId, reason);
        break;
        
      case 'search':
        const searchQuery = args.slice(1).join(' ');
        if (!searchQuery) {
          console.error('❌ Error: Debes especificar un término de búsqueda');
          process.exit(1);
        }
        await searchReservations(searchQuery);
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar CLI
main();
