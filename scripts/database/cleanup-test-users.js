/**
 * 🧹 LIMPIEZA DE USUARIOS DE TEST
 * 
 * Elimina TODA la información de usuarios específicos para pruebas frescas:
 * - Perfil de usuario (user_profiles)
 * - Historial de conversaciones (agent_conversations)
 * - Reservas (reservations)
 * - Archivos subidos (conversation_files)
 * - Temas activos (active_topics)
 * - Interacciones legacy (interactions)
 * - Confirmaciones pendientes (pending_confirmations)
 */

/**
 * 🧹 LIMPIEZA DE USUARIOS DE TEST
 * 
 * Script para Heroku CLI:
 * heroku pg:psql --app coworkia-agent
 * 
 * Luego copiar y pegar los comandos SQL de abajo
 */

const TEST_USERS = [
  '+593990650788',  // Diego - Personal
  '+593990650262'   // Coworkia - Empresa
];

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧹 LIMPIEZA DE USUARIOS DE TEST - HEROKU POSTGRESQL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 INSTRUCCIONES:

1. Abrir terminal y conectar a Heroku PostgreSQL:
   heroku pg:psql --app coworkia-agent

2. Copiar y pegar los siguientes comandos SQL:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 LIMPIAR: ${TEST_USERS[0]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Eliminar archivos subidos
DELETE FROM conversation_files WHERE user_phone = '${TEST_USERS[0]}';

-- 2. Eliminar temas activos  
DELETE FROM active_topics WHERE user_phone = '${TEST_USERS[0]}';

-- 3. Eliminar conversaciones
DELETE FROM agent_conversations WHERE user_phone = '${TEST_USERS[0]}';

-- 4. Eliminar reservas
DELETE FROM reservations WHERE user_phone = '${TEST_USERS[0]}';

-- 5. Eliminar confirmaciones pendientes
DELETE FROM pending_confirmations WHERE user_phone = '${TEST_USERS[0]}';

-- 6. Eliminar interacciones legacy
DELETE FROM interactions WHERE user_id = '${TEST_USERS[0]}';

-- 7. Resetear perfil (mantener usuario pero como nuevo)
UPDATE users 
SET conversation_count = 0,
    active_agent = 'AURORA',
    active_agents = '{}',
    context_preferences = '{}',
    last_message_at = NULL,
    free_trial_used = false,
    free_trial_date = NULL
WHERE phone_number = '${TEST_USERS[0]}';

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 LIMPIAR: ${TEST_USERS[1]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Eliminar archivos subidos
DELETE FROM conversation_files WHERE user_phone = '${TEST_USERS[1]}';

-- 2. Eliminar temas activos
DELETE FROM active_topics WHERE user_phone = '${TEST_USERS[1]}';

-- 3. Eliminar conversaciones
DELETE FROM agent_conversations WHERE user_phone = '${TEST_USERS[1]}';

-- 4. Eliminar reservas
DELETE FROM reservations WHERE user_phone = '${TEST_USERS[1]}';

-- 5. Eliminar confirmaciones pendientes
DELETE FROM pending_confirmations WHERE user_phone = '${TEST_USERS[1]}';

-- 6. Eliminar interacciones legacy
DELETE FROM interactions WHERE user_id = '${TEST_USERS[1]}';

-- 7. Resetear perfil
UPDATE users 
SET conversation_count = 0,
    active_agent = 'AURORA',
    active_agents = '{}',
    context_preferences = '{}',
    last_message_at = NULL,
    free_trial_used = false,
    free_trial_date = NULL
WHERE phone_number = '${TEST_USERS[1]}';

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VERIFICAR LIMPIEZA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Ver perfil reseteado
SELECT phone_number, name, conversation_count, active_agent, free_trial_used
FROM users 
WHERE phone_number IN ('${TEST_USERS[0]}', '${TEST_USERS[1]}');

-- Verificar que no hay conversaciones
SELECT COUNT(*) as total_conversaciones
FROM agent_conversations 
WHERE user_phone IN ('${TEST_USERS[0]}', '${TEST_USERS[1]}');

-- Verificar que no hay reservas
SELECT COUNT(*) as total_reservas
FROM reservations 
WHERE user_phone IN ('${TEST_USERS[0]}', '${TEST_USERS[1]}');

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 RESULTADO ESPERADO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ conversation_count = 0
✅ active_agent = 'AURORA'  
✅ free_trial_used = false
✅ No conversaciones
✅ No reservas
✅ Usuario nuevo para pruebas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
