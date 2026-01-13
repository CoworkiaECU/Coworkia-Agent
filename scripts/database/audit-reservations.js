import 'dotenv/config';
import { fileURLToPath } from 'url';
import databaseService from '../../src/database/database.js';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function ensureDatabaseReady() {
  if (!databaseService.isInitialized) {
    await databaseService.initialize();
  }
}

function formatDate(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleString('es-EC', { 
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isExpired(isoString) {
  if (!isoString) return false;
  return new Date(isoString) < new Date();
}

async function auditReservations() {
  await ensureDatabaseReady();
  
  console.log(`\n${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  console.log(`${COLORS.cyan}📊 AUDITORÍA DE RESERVAS - Coworkia${COLORS.reset}`);
  console.log(`${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`);

  // 1. Resumen de reservas por estado
  console.log(`${COLORS.blue}🎫 RESERVAS POR ESTADO:${COLORS.reset}`);
  const reservations = await databaseService.all('SELECT status, COUNT(*) as count FROM reservations GROUP BY status');
  
  if (reservations.length === 0) {
    console.log(`  ${COLORS.yellow}⚠️  No hay reservas en el sistema${COLORS.reset}`);
  } else {
    const statusEmojis = {
      pending: '⏳',
      pending_payment: '💳',
      confirmed: '✅',
      cancelled: '❌',
      rejected: '🚫',
      completed: '🎉'
    };
    
    reservations.forEach(r => {
      const emoji = statusEmojis[r.status] || '❓';
      console.log(`  ${emoji} ${r.status.padEnd(20)} ${r.count}`);
    });
  }

  // 2. Confirmaciones pendientes
  console.log(`\n${COLORS.blue}⏰ CONFIRMACIONES PENDIENTES:${COLORS.reset}`);
  const pendingConfirmations = await databaseService.all(
    'SELECT user_phone, reservation_data, expires_at, created_at FROM pending_confirmations'
  );
  
  if (pendingConfirmations.length === 0) {
    console.log(`  ${COLORS.green}✓ No hay confirmaciones pendientes${COLORS.reset}`);
  } else {
    let expiredCount = 0;
    pendingConfirmations.forEach(pc => {
      const expired = isExpired(pc.expires_at);
      if (expired) expiredCount++;
      
      const color = expired ? COLORS.red : COLORS.green;
      const status = expired ? '❌ EXPIRADO' : '✓ ACTIVO';
      
      console.log(`\n  ${color}${status}${COLORS.reset}`);
      console.log(`    📞 Teléfono: ${pc.user_phone}`);
      console.log(`    📅 Creado: ${formatDate(pc.created_at)}`);
      console.log(`    ⏰ Expira: ${formatDate(pc.expires_at)}`);
      
      try {
        const data = JSON.parse(pc.reservation_data);
        console.log(`    📋 Datos: ${data.spaceType || 'N/A'} - ${data.date || 'N/A'} ${data.time || 'N/A'}`);
      } catch (e) {
        console.log(`    📋 Datos: [Error parseando JSON]`);
      }
    });
    
    if (expiredCount > 0) {
      console.log(`\n  ${COLORS.yellow}⚠️  ${expiredCount} confirmaciones expiradas detectadas${COLORS.reset}`);
    }
  }

  // 3. Flags justConfirmed
  console.log(`\n${COLORS.blue}🚩 FLAGS JUST_CONFIRMED:${COLORS.reset}`);
  const justConfirmedFlags = await databaseService.all(
    'SELECT user_phone, just_confirmed_until, last_reservation_id, updated_at FROM reservation_state'
  );
  
  if (justConfirmedFlags.length === 0) {
    console.log(`  ${COLORS.green}✓ No hay flags activos${COLORS.reset}`);
  } else {
    let expiredFlags = 0;
    justConfirmedFlags.forEach(flag => {
      const expired = isExpired(flag.just_confirmed_until);
      if (expired) expiredFlags++;
      
      const color = expired ? COLORS.red : COLORS.green;
      const status = expired ? '❌ EXPIRADO' : '✓ ACTIVO';
      
      console.log(`\n  ${color}${status}${COLORS.reset}`);
      console.log(`    📞 Teléfono: ${flag.user_phone}`);
      console.log(`    🎫 Reserva: ${flag.last_reservation_id || 'N/A'}`);
      console.log(`    ⏰ Expira: ${formatDate(flag.just_confirmed_until)}`);
      console.log(`    🔄 Actualizado: ${formatDate(flag.updated_at)}`);
    });
    
    if (expiredFlags > 0) {
      console.log(`\n  ${COLORS.yellow}⚠️  ${expiredFlags} flags expirados detectados${COLORS.reset}`);
    }
  }

  // 4. Anomalías detectadas
  console.log(`\n${COLORS.blue}🔍 DETECCIÓN DE ANOMALÍAS:${COLORS.reset}`);
  
  // Reservas pendientes muy antiguas (>24h)
  const threshold24h = new Date();
  threshold24h.setHours(threshold24h.getHours() - 24);
  
  const oldPending = await databaseService.all(
    `SELECT id, user_phone, date, start_time, status, created_at 
     FROM reservations 
     WHERE status IN ('pending', 'pending_payment') 
     AND created_at < ?`,
    [threshold24h.toISOString()]
  );
  
  if (oldPending.length > 0) {
    console.log(`\n  ${COLORS.red}⚠️  ${oldPending.length} reservas pendientes > 24h:${COLORS.reset}`);
    oldPending.forEach(r => {
      console.log(`    🎫 ID: ${r.id}`);
      console.log(`       📞 ${r.user_phone}`);
      console.log(`       📅 ${r.date} ${r.start_time}`);
      console.log(`       ⏰ Creado hace: ${Math.floor((new Date() - new Date(r.created_at)) / (1000 * 60 * 60))}h`);
    });
  } else {
    console.log(`  ${COLORS.green}✓ No hay reservas pendientes antiguas${COLORS.reset}`);
  }

  // Reservas con precio = 0 (posibles anomalías)
  const freeReservations = await databaseService.all(
    `SELECT COUNT(*) as count FROM reservations WHERE total_price = 0 AND was_free = 0`
  );
  
  if (freeReservations[0].count > 0) {
    console.log(`  ${COLORS.yellow}⚠️  ${freeReservations[0].count} reservas con precio $0 (no marcadas como gratis)${COLORS.reset}`);
  }

  // 5. Recomendaciones
  console.log(`\n${COLORS.magenta}💡 RECOMENDACIONES:${COLORS.reset}`);
  
  const totalExpired = pendingConfirmations.filter(pc => isExpired(pc.expires_at)).length +
                       justConfirmedFlags.filter(f => isExpired(f.just_confirmed_until)).length;
  
  if (totalExpired > 0) {
    console.log(`  ${COLORS.yellow}→ Ejecutar: npm run cleanup${COLORS.reset}`);
  }
  
  if (oldPending.length > 0) {
    console.log(`  ${COLORS.yellow}→ Revisar reservas pendientes antiguas manualmente${COLORS.reset}`);
  }
  
  if (totalExpired === 0 && oldPending.length === 0) {
    console.log(`  ${COLORS.green}✓ Sistema saludable, no se requiere acción${COLORS.reset}`);
  }

  console.log(`\n${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`);
}

async function cli() {
  try {
    await auditReservations();
    process.exit(0);
  } catch (error) {
    console.error(`${COLORS.red}[AUDIT] ❌ Error:${COLORS.reset}`, error);
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  cli();
}

export { auditReservations };
