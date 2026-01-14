-- ⏱️ T14: Reset estado follow-up para Diego
-- Limpia transacciones pendientes y permite testear el nuevo sistema

-- Usuario de prueba: Diego (+593987770788)
UPDATE users 
SET 
  transaction_started_at = NULL,
  transaction_agent = NULL,
  follow_up_sent_at = NULL,
  pending_confirmation = NULL
WHERE phone_number = '+593987770788';

-- Verificar estado después del reset
SELECT 
  phone_number,
  name,
  active_agent,
  transaction_started_at,
  transaction_agent,
  follow_up_sent_at,
  pending_confirmation,
  last_message_at
FROM users 
WHERE phone_number = '+593987770788';
