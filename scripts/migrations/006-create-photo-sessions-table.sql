-- Migración: Crear tabla photo_sessions para AXEL (FASE 2)
-- Fecha: 2026-02-02
-- Descripción: Sistema de análisis multi-foto con Vision AI

CREATE TABLE IF NOT EXISTS photo_sessions (
  id SERIAL PRIMARY KEY,
  user_phone VARCHAR(50) NOT NULL,
  photo_count INTEGER DEFAULT 0,
  photos JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  analysis_result JSONB,
  
  -- Índices para búsqueda rápida
  CONSTRAINT unique_active_session UNIQUE (user_phone, status)
);

-- Índice para búsqueda por usuario
CREATE INDEX IF NOT EXISTS idx_photo_sessions_user ON photo_sessions(user_phone);

-- Índice para sesiones activas
CREATE INDEX IF NOT EXISTS idx_photo_sessions_status ON photo_sessions(status);

-- Comentarios
COMMENT ON TABLE photo_sessions IS 'Sesiones de análisis multi-foto para AXEL';
COMMENT ON COLUMN photo_sessions.photos IS 'Array JSONB con URLs y metadatos de fotos';
COMMENT ON COLUMN photo_sessions.status IS 'active, completed, cancelled';
COMMENT ON COLUMN photo_sessions.analysis_result IS 'Resultado del análisis Vision AI';
