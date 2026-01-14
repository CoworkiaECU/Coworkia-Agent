-- Migration 002: Add follow-up tracking columns
-- T14: Sistema de follow-up automático 2h timeout

-- Add follow-up tracking columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS transaction_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS transaction_agent VARCHAR(50),
ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMP;

-- Create index for efficient follow-up queries
CREATE INDEX IF NOT EXISTS idx_users_transaction_started 
ON users(transaction_started_at) 
WHERE transaction_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_follow_up_sent 
ON users(follow_up_sent_at) 
WHERE follow_up_sent_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.transaction_started_at IS 'Timestamp when user started a transaction (form/quote process)';
COMMENT ON COLUMN users.transaction_agent IS 'Agent handling the transaction (AURORA, AXEL, etc)';
COMMENT ON COLUMN users.follow_up_sent_at IS 'Timestamp when follow-up message was sent after timeout';
