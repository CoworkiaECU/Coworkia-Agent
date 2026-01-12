-- ============================================
-- TABLA: axel_quotes
-- Sistema de cotizaciones PaintBull (Axel)
-- Independiente de user_id - búsqueda por código
-- ============================================

CREATE TABLE IF NOT EXISTS axel_quotes (
  -- Identificadores
  quote_code VARCHAR(20) PRIMARY KEY,           -- AXEL-2026-0001
  original_user_phone VARCHAR(20) NOT NULL,     -- +593991234567
  
  -- Datos del vehículo
  vehicle_brand VARCHAR(50),                    -- Kia
  vehicle_model VARCHAR(50),                    -- Seltos
  vehicle_year VARCHAR(10),                     -- 2020
  
  -- Análisis de daños (JSON)
  damage_analysis JSONB NOT NULL,               -- {severity, areas, description, estimatedCost}
  
  -- Cotización
  quote_details TEXT,                           -- Texto completo de la cotización
  price_min DECIMAL(10,2),                      -- 720.00
  price_max DECIMAL(10,2),                      -- 960.00
  currency VARCHAR(10) DEFAULT 'USD',
  
  -- Cliente
  customer_name VARCHAR(100),                   -- Diego Villota
  customer_email VARCHAR(100),                  -- yo@diegovillota.com
  
  -- URLs de fotos (array JSON)
  photo_urls JSONB,                             -- ["url1", "url2", ...]
  
  -- Estado y tracking
  status VARCHAR(20) DEFAULT 'sent',            -- sent, confirmed, scheduled, completed, cancelled
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  
  -- Cita (si aplica)
  appointment_date DATE,
  appointment_time TIME,
  appointment_confirmed BOOLEAN DEFAULT false,
  appointment_notes TEXT,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('sent', 'confirmed', 'scheduled', 'completed', 'cancelled'))
);

-- Índice para búsqueda por teléfono (historial de cliente)
CREATE INDEX IF NOT EXISTS idx_axel_quotes_phone ON axel_quotes(original_user_phone);

-- Índice para búsqueda por fecha (cotizaciones recientes)
CREATE INDEX IF NOT EXISTS idx_axel_quotes_created ON axel_quotes(created_at DESC);

-- Índice para búsqueda por estado (dashboard admin)
CREATE INDEX IF NOT EXISTS idx_axel_quotes_status ON axel_quotes(status);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_axel_quotes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_axel_quotes_timestamp
BEFORE UPDATE ON axel_quotes
FOR EACH ROW
EXECUTE FUNCTION update_axel_quotes_timestamp();

-- Comentarios de documentación
COMMENT ON TABLE axel_quotes IS 'Cotizaciones de The PaintBull (Axel) - independiente de user_id para permitir consultas desde cualquier número';
COMMENT ON COLUMN axel_quotes.quote_code IS 'Código único de cotización formato AXEL-YYYY-NNNN';
COMMENT ON COLUMN axel_quotes.status IS 'Estado del workflow: sent → confirmed → scheduled → completed';
