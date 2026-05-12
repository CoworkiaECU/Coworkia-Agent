-- Migration: Create real_estate_properties table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'real_estate_properties') THEN
        CREATE TABLE real_estate_properties (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id       UUID REFERENCES real_estate_clients(id),
            code            TEXT NOT NULL,
            name            TEXT NOT NULL,
            type            TEXT,
            operation       TEXT,
            price_usd       NUMERIC,
            city            TEXT,
            country         TEXT DEFAULT 'ec',
            address         TEXT,
            maps_url        TEXT,
            description     TEXT,
            features        JSONB,
            brochure_url    TEXT,
            active          BOOLEAN DEFAULT true,
            created_at      TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;