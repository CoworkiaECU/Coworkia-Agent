-- Migration 003: Add missing columns to partial_forms and reservation_state
-- Date: 2026-01-22
-- Purpose: Fix schema errors found in cron cleanup jobs

-- Add expires_at to partial_forms if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partial_forms' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE partial_forms ADD COLUMN expires_at TIMESTAMP;
    RAISE NOTICE 'Added expires_at column to partial_forms';
  ELSE
    RAISE NOTICE 'expires_at column already exists in partial_forms';
  END IF;
END $$;

-- Add created_at to reservation_state if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservation_state' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE reservation_state ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    RAISE NOTICE 'Added created_at column to reservation_state';
  ELSE
    RAISE NOTICE 'created_at column already exists in reservation_state';
  END IF;
END $$;

-- Update existing rows in partial_forms to have expires_at (24 hours from updated_at)
UPDATE partial_forms 
SET expires_at = updated_at + INTERVAL '24 hours'
WHERE expires_at IS NULL AND updated_at IS NOT NULL;

-- Update existing rows in reservation_state to have created_at (use updated_at as fallback)
UPDATE reservation_state
SET created_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_at IS NULL;
