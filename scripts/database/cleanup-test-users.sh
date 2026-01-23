#!/bin/bash

# 🧹 Script de limpieza rápida para usuarios de test
# Ejecuta directamente los comandos SQL en Heroku PostgreSQL

echo "🧹 Limpiando usuarios de test en Heroku PostgreSQL..."
echo ""

# Usuario 1: +593990650788 (Diego)
echo "📱 Limpiando +593990650788..."
heroku pg:psql --app coworkia-agent <<EOF
DELETE FROM conversation_files WHERE user_phone = '+593990650788';
DELETE FROM active_topics WHERE user_phone = '+593990650788';
DELETE FROM agent_conversations WHERE user_phone = '+593990650788';
DELETE FROM reservations WHERE user_phone = '+593990650788';
DELETE FROM pending_confirmations WHERE user_phone = '+593990650788';
DELETE FROM interactions WHERE user_id = '+593990650788';
UPDATE users 
SET conversation_count = 0,
    active_agent = 'AURORA',
    active_agents = '{}',
    context_preferences = '{}',
    last_message_at = NULL,
    free_trial_used = false,
    free_trial_date = NULL
WHERE phone_number = '+593990650788';
EOF

echo ""
echo "📱 Limpiando +593990650262..."
heroku pg:psql --app coworkia-agent <<EOF
DELETE FROM conversation_files WHERE user_phone = '+593990650262';
DELETE FROM active_topics WHERE user_phone = '+593990650262';
DELETE FROM agent_conversations WHERE user_phone = '+593990650262';
DELETE FROM reservations WHERE user_phone = '+593990650262';
DELETE FROM pending_confirmations WHERE user_phone = '+593990650262';
DELETE FROM interactions WHERE user_id = '+593990650262';
UPDATE users 
SET conversation_count = 0,
    active_agent = 'AURORA',
    active_agents = '{}',
    context_preferences = '{}',
    last_message_at = NULL,
    free_trial_used = false,
    free_trial_date = NULL
WHERE phone_number = '+593990650262';
EOF

echo ""
echo "✅ Limpieza completada"
echo ""
echo "📊 Verificando resultados..."
heroku pg:psql --app coworkia-agent <<EOF
SELECT phone_number, name, conversation_count, active_agent, free_trial_used
FROM users 
WHERE phone_number IN ('+593990650788', '+593990650262');
EOF

echo ""
echo "🎯 Usuarios reseteados como nuevos para pruebas"
