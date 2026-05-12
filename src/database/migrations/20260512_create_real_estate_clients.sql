-- Migration: Create real_estate_clients table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'real_estate_clients') THEN
        CREATE TABLE real_estate_clients (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug        TEXT UNIQUE NOT NULL,
            name        TEXT NOT NULL,
            brand_name  TEXT,
            country     TEXT DEFAULT 'ec',
            wa_number   TEXT,
            email_from  TEXT,
            active      BOOLEAN DEFAULT true,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Insert initial client
INSERT INTO real_estate_clients (slug, name, country)
VALUES ('casas-jardin', 'Casas Jardín El Morenal', 'ec')
ON CONFLICT (slug) DO NOTHING;