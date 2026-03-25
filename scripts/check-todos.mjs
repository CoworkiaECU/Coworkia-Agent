#!/usr/bin/env node
import databaseService from '../src/database/database.js';

try {
  // Initialize database first
  await databaseService.initialize();
  
  const todos = await databaseService.all(
    `SELECT id, title, status, priority, assigned_agent, created_at 
     FROM todos 
     WHERE status != 'done' 
     ORDER BY 
       CASE priority 
         WHEN 'urgent' THEN 1 
         WHEN 'high' THEN 2 
         WHEN 'medium' THEN 3 
         ELSE 4 
       END,
       created_at ASC`
  );

  if (todos.length === 0) {
    console.log('✅ No hay todos pendientes - dashboard limpio');
  } else {
    console.log(`📋 TODOS PENDIENTES (${todos.length}):\n`);
    
    const byStatus = {
      pending: [],
      in_progress: [],
      blocked: []
    };
    
    todos.forEach(t => {
      if (byStatus[t.status]) {
        byStatus[t.status].push(t);
      }
    });
    
    for (const [status, items] of Object.entries(byStatus)) {
      if (items.length > 0) {
        const statusLabel = status === 'pending' ? '⏳ PENDING' : 
                           status === 'in_progress' ? '🔄 IN PROGRESS' : 
                           '🚫 BLOCKED';
        console.log(`\n${statusLabel}:`);
        items.forEach(t => {
          const priority = t.priority.toUpperCase().padEnd(6);
          const agent = (t.assigned_agent || 'unassigned').padEnd(10);
          console.log(`  [${priority}] [${agent}] ${t.title}`);
        });
      }
    }
  }
  
  await databaseService.close();
  process.exit(0);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
