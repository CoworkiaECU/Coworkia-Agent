-- Migration: Add real_estate_client_id column to paula_leads and property_visits
DO $$
BEGIN
    -- Add column to paula_leads
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'paula_leads' AND column_name = 'real_estate_client_id'
    ) THEN
        ALTER TABLE paula_leads ADD COLUMN real_estate_client_id UUID REFERENCES real_estate_clients(id);
    END IF;

    -- Add column to property_visits
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'property_visits' AND column_name = 'real_estate_client_id'
    ) THEN
        ALTER TABLE property_visits ADD COLUMN real_estate_client_id UUID REFERENCES real_estate_clients(id);
    END IF;
END $$;