#!/usr/bin/env node
/**
 * 🔍 Auditoría de uso de campos en código vs BD
 */

import pg from 'pg';
const { Pool } = pg;
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Campos en PostgreSQL (REAL)
const REAL_FIELDS = {
  users: [
    'phone_number', 'name', 'email', 'whatsapp_display_name',
    'first_visit', 'free_trial_used', 'free_trial_date',
    'conversation_count', 'last_message_at', 'created_at', 'updated_at',
    'active_agent', 'preferred_language', 'active_agents', 'context_preferences'
  ],
  reservations: [
    'id', 'user_phone', 'service_type', 'date', 'start_time', 'end_time',
    'duration_hours', 'guest_count', 'total_price', 'was_free',
    'status', 'payment_status', 'payment_data', 'payment_method',
    'hot_desk_number', 'calendar_event_id', 'created_at', 'confirmed_at'
  ],
  agent_conversations: [
    'id', 'user_phone', 'agent', 'conversation_topic', 'session_id',
    'role', 'content', 'metadata', 'parent_message_id', 'timestamp'
  ],
  active_topics: [
    'user_phone', 'agent', 'topic', 'session_id', 'status',
    'last_interaction', 'context_summary'
  ]
};

// Campos NO EXISTENTES que podrían usarse por error
const WRONG_FIELDS = [
  'user_id',        // Debe ser user_phone
  'nombre',         // Debe ser name
  'firstName',      // No existe
  'displayName',    // Debe ser whatsapp_display_name
  'whatsapp_name',  // Debe ser whatsapp_display_name
  'topic',          // En agent_conversations debe ser conversation_topic
  'created',        // Debe ser created_at
  'updated'         // Debe ser updated_at
];

function findJsFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'coverage') {
        findJsFiles(filePath, fileList);
      }
    } else if (extname(file) === '.js') {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

async function auditFieldUsage() {
  console.log('🔍 ════════════════════════════════════════════════');
  console.log('   AUDITORÍA DE USO DE CAMPOS - CÓDIGO vs BD');
  console.log('════════════════════════════════════════════════\n');

  const srcDir = join(process.cwd(), 'src');
  const jsFiles = findJsFiles(srcDir);
  
  console.log(`📁 Analizando ${jsFiles.length} archivos JavaScript...\n`);
  
  const issues = [];
  
  for (const wrongField of WRONG_FIELDS) {
    const regex = new RegExp(`\\b${wrongField}\\b`, 'g');
    
    for (const filePath of jsFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Skip comentarios
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return;
        }
        
        if (regex.test(line)) {
          issues.push({
            file: filePath.replace(process.cwd(), ''),
            line: index + 1,
            field: wrongField,
            code: line.trim().substring(0, 80)
          });
        }
      });
    }
  }
  
  if (issues.length === 0) {
    console.log('✅ NO SE ENCONTRARON PROBLEMAS\n');
    console.log('Todos los campos usados coinciden con el esquema PostgreSQL.\n');
  } else {
    console.log(`⚠️  PROBLEMAS ENCONTRADOS: ${issues.length}\n`);
    console.log('─'.repeat(80));
    
    const groupedByField = {};
    issues.forEach(issue => {
      if (!groupedByField[issue.field]) {
        groupedByField[issue.field] = [];
      }
      groupedByField[issue.field].push(issue);
    });
    
    for (const [field, occurrences] of Object.entries(groupedByField)) {
      console.log(`\n🚨 Campo problemático: "${field}" (${occurrences.length} ocurrencias)`);
      console.log('─'.repeat(80));
      
      occurrences.forEach((issue, idx) => {
        if (idx < 10) { // Mostrar máximo 10 por campo
          console.log(`  ${issue.file}:${issue.line}`);
          console.log(`    ${issue.code}`);
          console.log('');
        }
      });
      
      if (occurrences.length > 10) {
        console.log(`  ... y ${occurrences.length - 10} ocurrencias más\n`);
      }
    }
  }
  
  // Verificar estructura real de tablas críticas
  console.log('\n📊 VERIFICACIÓN DE ESTRUCTURA REAL EN PRODUCCIÓN');
  console.log('─'.repeat(80));
  
  for (const [table, expectedFields] of Object.entries(REAL_FIELDS)) {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    
    const actualFields = result.rows.map(r => r.column_name);
    
    console.log(`\n📋 Tabla: ${table}`);
    console.log(`   Campos en BD: ${actualFields.join(', ')}`);
    
    // Verificar campos faltantes
    const missing = expectedFields.filter(f => !actualFields.includes(f));
    if (missing.length > 0) {
      console.log(`   ❌ FALTANTES: ${missing.join(', ')}`);
    }
    
    // Verificar campos extra
    const extra = actualFields.filter(f => !expectedFields.includes(f));
    if (extra.length > 0) {
      console.log(`   ⚠️  EXTRAS: ${extra.join(', ')}`);
    }
    
    if (missing.length === 0 && extra.length === 0) {
      console.log(`   ✅ Estructura coincide`);
    }
  }
  
  console.log('\n════════════════════════════════════════════════');
  console.log('✅ AUDITORÍA COMPLETADA');
  console.log('════════════════════════════════════════════════\n');
  
  await pool.end();
  
  // Exit code según resultados
  process.exit(issues.length > 0 ? 1 : 0);
}

auditFieldUsage().catch(error => {
  console.error('❌ Error en auditoría:', error);
  process.exit(1);
});
