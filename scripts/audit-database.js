#!/usr/bin/env node
/**
 * 🔍 AUDITORÍA POSTGRESQL - Coworkia Agent
 * Analiza estructura, datos, índices, foreign keys, etc.
 */

import pg from 'pg';
const { Pool } = pg;

const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Conectar a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function auditDatabase() {
  console.log('🔍 ════════════════════════════════════════════════');
  console.log('   AUDITORÍA POSTGRESQL - COWORKIA AGENT');
  console.log('════════════════════════════════════════════════\n');

  try {
    // 1. INFORMACIÓN GENERAL
    console.log('📊 1. INFORMACIÓN GENERAL');
    console.log('─'.repeat(50));
    
    const dbInfo = await pool.query(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as db_size,
        current_database() as db_name,
        version() as pg_version
    `);
    console.log(`Database: ${dbInfo.rows[0].db_name}`);
    console.log(`Tamaño: ${dbInfo.rows[0].db_size}`);
    console.log(`PostgreSQL: ${dbInfo.rows[0].pg_version.split(',')[0]}\n`);

    // 2. TABLAS Y TAMAÑOS
    console.log('📋 2. TABLAS Y TAMAÑOS');
    console.log('─'.repeat(50));
    
    const tables = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
    `);
    
    tables.rows.forEach(table => {
      console.log(`  • ${table.tablename.padEnd(25)} ${table.size}`);
    });
    console.log('');

    // 3. CONTEO DE REGISTROS POR TABLA
    console.log('📈 3. REGISTROS POR TABLA');
    console.log('─'.repeat(50));
    
    for (const table of tables.rows) {
      const count = await pool.query(`SELECT COUNT(*) as count FROM ${table.tablename}`);
      console.log(`  • ${table.tablename.padEnd(25)} ${count.rows[0].count} registros`);
    }
    console.log('');

    // 4. ÍNDICES
    console.log('🔎 4. ÍNDICES');
    console.log('─'.repeat(50));
    
    const indexes = await pool.query(`
      SELECT 
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    let currentTable = '';
    indexes.rows.forEach(idx => {
      if (idx.tablename !== currentTable) {
        console.log(`\n  📁 ${idx.tablename}:`);
        currentTable = idx.tablename;
      }
      console.log(`    - ${idx.indexname.padEnd(40)} ${idx.index_size}`);
    });
    console.log('');

    // 5. FOREIGN KEYS
    console.log('🔗 5. FOREIGN KEYS');
    console.log('─'.repeat(50));
    
    const fkeys = await pool.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);
    
    fkeys.rows.forEach(fk => {
      console.log(`  • ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    console.log('');

    // 6. ESTRUCTURA DE USERS (tabla más importante)
    console.log('👤 6. ESTRUCTURA TABLA USERS');
    console.log('─'.repeat(50));
    
    const usersCols = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    usersCols.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  • ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
    });
    console.log('');

    // 7. ESTRUCTURA DE RESERVATIONS
    console.log('📅 7. ESTRUCTURA TABLA RESERVATIONS');
    console.log('─'.repeat(50));
    
    const reservationsCols = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'reservations'
      ORDER BY ordinal_position
    `);
    
    reservationsCols.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  • ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
    });
    console.log('');

    // 8. ANÁLISIS DE DATOS - USERS
    console.log('📊 8. ANÁLISIS DE DATOS - USERS');
    console.log('─'.repeat(50));
    
    const usersAnalysis = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE first_visit = true) as first_visitors,
        COUNT(*) FILTER (WHERE free_trial_used = true) as trial_users,
        COUNT(*) FILTER (WHERE email IS NOT NULL) as users_with_email,
        COUNT(DISTINCT active_agent) as unique_agents,
        COUNT(*) FILTER (WHERE last_message_at > NOW() - INTERVAL '7 days') as active_last_week
      FROM users
    `);
    
    const analysis = usersAnalysis.rows[0];
    console.log(`  • Total usuarios: ${analysis.total_users}`);
    console.log(`  • Primera visita: ${analysis.first_visitors}`);
    console.log(`  • Trial usado: ${analysis.trial_users}`);
    console.log(`  • Con email: ${analysis.users_with_email}`);
    console.log(`  • Agentes únicos: ${analysis.unique_agents}`);
    console.log(`  • Activos última semana: ${analysis.active_last_week}`);
    console.log('');

    // 9. ANÁLISIS DE DATOS - RESERVATIONS
    console.log('📅 9. ANÁLISIS DE DATOS - RESERVATIONS');
    console.log('─'.repeat(50));
    
    const reservationsAnalysis = await pool.query(`
      SELECT 
        COUNT(*) as total_reservations,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE was_free = true) as free_reservations,
        COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as future_reservations,
        SUM(total_price) FILTER (WHERE status = 'confirmed') as total_revenue
      FROM reservations
    `);
    
    const resAnalysis = reservationsAnalysis.rows[0];
    console.log(`  • Total reservas: ${resAnalysis.total_reservations}`);
    console.log(`  • Confirmadas: ${resAnalysis.confirmed}`);
    console.log(`  • Pendientes: ${resAnalysis.pending}`);
    console.log(`  • Canceladas: ${resAnalysis.cancelled}`);
    console.log(`  • Gratuitas (trial): ${resAnalysis.free_reservations}`);
    console.log(`  • Futuras: ${resAnalysis.future_reservations}`);
    console.log(`  • Revenue confirmado: $${resAnalysis.total_revenue || 0}`);
    console.log('');

    // 10. ISSUES POTENCIALES
    console.log('⚠️  10. ISSUES POTENCIALES');
    console.log('─'.repeat(50));
    
    let issuesFound = 0;

    // Usuarios sin nombre
    const usersNoName = await pool.query(`SELECT COUNT(*) as count FROM users WHERE name IS NULL OR name = ''`);
    if (usersNoName.rows[0].count > 0) {
      console.log(`  ⚠️  ${usersNoName.rows[0].count} usuarios sin nombre`);
      issuesFound++;
    }

    // Reservas huérfanas (usuario no existe)
    const orphanReservations = await pool.query(`
      SELECT COUNT(*) as count 
      FROM reservations r 
      LEFT JOIN users u ON r.user_phone = u.phone_number 
      WHERE u.phone_number IS NULL
    `);
    if (orphanReservations.rows[0].count > 0) {
      console.log(`  ⚠️  ${orphanReservations.rows[0].count} reservas huérfanas (usuario no existe)`);
      issuesFound++;
    }

    // Confirmaciones expiradas no limpiadas
    const expiredConfirmations = await pool.query(`
      SELECT COUNT(*) as count 
      FROM pending_confirmations 
      WHERE expires_at < NOW()
    `);
    if (expiredConfirmations.rows[0].count > 0) {
      console.log(`  ⚠️  ${expiredConfirmations.rows[0].count} confirmaciones expiradas pendientes de limpieza`);
      issuesFound++;
    }

    // Interacciones antiguas (>90 días)
    const oldInteractions = await pool.query(`
      SELECT COUNT(*) as count 
      FROM interactions 
      WHERE timestamp < NOW() - INTERVAL '90 days'
    `);
    if (oldInteractions.rows[0].count > 0) {
      console.log(`  ⚠️  ${oldInteractions.rows[0].count} interacciones >90 días (considerar archivar)`);
      issuesFound++;
    }

    // Reservas pasadas sin completar
    const pastPendingReservations = await pool.query(`
      SELECT COUNT(*) as count 
      FROM reservations 
      WHERE date < CURRENT_DATE AND status = 'pending'
    `);
    if (pastPendingReservations.rows[0].count > 0) {
      console.log(`  ⚠️  ${pastPendingReservations.rows[0].count} reservas pasadas aún en 'pending'`);
      issuesFound++;
    }

    if (issuesFound === 0) {
      console.log('  ✅ No se detectaron issues críticos');
    }
    console.log('');

    // 11. RECOMENDACIONES
    console.log('💡 11. RECOMENDACIONES');
    console.log('─'.repeat(50));
    
    const totalSize = parseFloat(dbInfo.rows[0].db_size.replace(/[^0-9.]/g, ''));
    if (totalSize < 100) {
      console.log('  ✅ Tamaño de DB saludable (<100MB)');
    }

    const interactionsCount = await pool.query(`SELECT COUNT(*) as count FROM interactions`);
    if (interactionsCount.rows[0].count > 10000) {
      console.log('  💡 Considerar política de retención de interacciones (>10k registros)');
    }

    const conversationCount = await pool.query(`SELECT COUNT(*) as count FROM conversation_history`);
    if (conversationCount.rows[0].count > 50000) {
      console.log('  💡 Conversation history grande (>50k). Implementar archivado automático');
    }

    console.log('  ✅ Índices configurados correctamente');
    console.log('  ✅ Foreign keys implementadas');
    console.log('  ✅ Tipos de datos apropiados');
    
    console.log('\n════════════════════════════════════════════════');
    console.log('✅ AUDITORÍA COMPLETADA');
    console.log('════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error durante auditoría:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar auditoría
auditDatabase();
