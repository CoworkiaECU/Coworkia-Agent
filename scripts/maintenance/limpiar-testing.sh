#!/bin/bash
# Limpieza completa de números de prueba

echo "🧹 LIMPIEZA DE TESTING"
echo ""

PHONE1="+593987770788"
PHONE2="+593992320262"

echo "📱 Limpiando $PHONE1"
heroku pg:psql DATABASE_URL --app coworkia-agent -c "UPDATE users SET profile_data = jsonb_set(COALESCE(profile_data, '{}'), '{activeAgent}', '\"AURORA\"'), whatsapp_display_name = NULL WHERE phone_number = '$PHONE1';"
heroku pg:psql DATABASE_URL --app coworkia-agent -c "DELETE FROM pending_confirmations WHERE user_phone = '$PHONE1';"
heroku pg:psql DATABASE_URL --app coworkia-agent -c "DELETE FROM reservation_state WHERE user_phone = '$PHONE1';"
heroku pg:psql DATABASE_URL --app coworkia-agent -c "DELETE FROM reservations WHERE user_phone = '$PHONE1' AND status IN ('pending', 'pending_confirmation', 'pending_payment', 'cancelled');"
heroku pg:psql DATABASE_URL --app coworkia-agent -c "UPDATE agent_forms SET is_active = FALSE, cancelled_at = NOW() WHERE user_phone = '$PHONE1' AND is_active = TRUE;"

echo ""
echo "📱 Limpiando $PHONE2"
heroku pg:psql DATABASE_URL --app coworkia-agent -c "UPDATE users SET profile_data = jsonb_set(COALESCE(profile_data, '{}'), '{activeAgent}', '\"AURORA\"'), whatsapp_display_name = NULL WHERE phone_number = '$PHONE2';"
heroku pg:psql DATABASE_URL --app coworkia-agent -c "DELETE FROM pending_confirmations WHERE user_phone = '$PHONE2';"
heroku pg:psql DATABASE_URL --app coworkia-agent -c "DELETE FROM reservation_state WHERE user_phone = '$PHONE2';"
heroku pg:psql DATABASE_URL --app coworkia-agent -c "DELETE FROM reservations WHERE user_phone = '$PHONE2' AND status IN ('pending', 'pending_confirmation', 'pending_payment', 'cancelled');"
heroku pg:psql DATABASE_URL --app coworkia-agent -c "UPDATE agent_forms SET is_active = FALSE, cancelled_at = NOW() WHERE user_phone = '$PHONE2' AND is_active = TRUE;"

echo ""
echo "✅ Limpieza completada - Listos para pruebas frescas"
