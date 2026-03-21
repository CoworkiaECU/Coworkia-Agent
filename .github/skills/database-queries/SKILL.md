---
name: database-queries
description: Queries SQL comunes para debugging, monitoreo y análisis de datos. Usa este skill cuando necesites consultar reservas, leads, usuarios, follow-ups, verificar integridad de datos, generar reportes, o debuggear problemas de base de datos.
applyTo:
  - "src/database/**"
---

# Database Common Queries

## 🎯 ACCESO A LA BASE DE DATOS

### Conectar desde Terminal
```bash
# Opción 1: Heroku CLI
heroku pg:psql --app coworkia-agent

# Opción 2: psql directo (necesitas DATABASE_URL)
heroku config:get DATABASE_URL --app coworkia-agent
psql [DATABASE_URL copiado]
```

### Comandos Útiles de psql
```sql
\dt                      -- Listar todas las tablas
\d membership_leads      -- Ver estructura de tabla específica
\q                       -- Salir
```

---

## 📊 ALUNA (MEMBRESÍAS)

### Leads Calientes (Requieren Seguimiento Humano)
```sql
SELECT 
  id,
  name,
  user_phone,
  membership_type,
  status,
  created_at,
  last_interaction_at
FROM membership_leads
WHERE status IN ('negotiating', 'tour_scheduled')
ORDER BY updated_at DESC
LIMIT 20;
```

### Leads Nuevos del Día
```sql
SELECT 
  COUNT(*) as total_hoy,
  COUNT(*) FILTER (WHERE status = 'pending') as pendientes,
  COUNT(*) FILTER (WHERE status = 'negotiating') as negociando,
  COUNT(*) FILTER (WHERE status = 'tour_scheduled') as tours
FROM membership_leads
WHERE created_at::date = CURRENT_DATE;
```

### Leads Sin Respuesta (Más de 7 días)
```sql
SELECT 
  name,
  user_phone,
  membership_type,
  mensualidad,
  created_at,
  last_interaction_at
FROM membership_leads
WHERE last_interaction_at < NOW() - INTERVAL '7 days'
  AND status = 'pending'
ORDER BY created_at DESC;
```

### Leads Convertidos (Clientes Activos)
```sql
SELECT 
  name,
  user_phone,
  membership_type,
  created_at as fecha_lead,
  updated_at as fecha_conversion
FROM membership_leads
WHERE status = 'active'
ORDER BY updated_at DESC
LIMIT 20;
```

---

## 📈 EFECTIVIDAD DE FOLLOW-UPS

### Tasa de Respuesta D+1 vs D+3
```sql
SELECT 
  COUNT(*) FILTER (WHERE followup_24h_sent_at IS NOT NULL) as d1_enviados,
  COUNT(*) FILTER (WHERE client_response_at IS NOT NULL 
                   AND client_response_at > followup_24h_sent_at) as d1_respondieron,
  ROUND(100.0 * 
    COUNT(*) FILTER (WHERE client_response_at > followup_24h_sent_at) / 
    NULLIF(COUNT(*) FILTER (WHERE followup_24h_sent_at IS NOT NULL), 0), 
    1) as d1_tasa_respuesta_pct,
  
  COUNT(*) FILTER (WHERE followup_3d_sent_at IS NOT NULL) as d3_enviados,
  COUNT(*) FILTER (WHERE client_response_at IS NOT NULL 
                   AND client_response_at > followup_3d_sent_at) as d3_respondieron,
  ROUND(100.0 * 
    COUNT(*) FILTER (WHERE client_response_at > followup_3d_sent_at) / 
    NULLIF(COUNT(*) FILTER (WHERE followup_3d_sent_at IS NOT NULL), 0), 
    1) as d3_tasa_respuesta_pct
FROM membership_leads
WHERE created_at > NOW() - INTERVAL '30 days';
```

### Follow-ups Pendientes de Enviar
```sql
-- D+1 pendientes
SELECT 
  name,
  user_phone,
  interest_at,
  EXTRACT(HOUR FROM (NOW() - interest_at)) as horas_desde_interes
FROM membership_leads
WHERE followup_24h_sent_at IS NULL
  AND interest_at <= NOW() - INTERVAL '24 hours'
  AND status IN ('pending', 'negotiating')
ORDER BY interest_at;

-- D+3 pendientes
SELECT 
  name,
  user_phone,
  interest_at,
  EXTRACT(DAY FROM (NOW() - interest_at)) as dias_desde_interes
FROM membership_leads
WHERE followup_3d_sent_at IS NULL
  AND interest_at <= NOW() - INTERVAL '3 days'
  AND status IN ('pending', 'negotiating')
ORDER BY interest_at;
```

### Conversión: Lead → Cliente
```sql
SELECT 
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as leads_30d,
  COUNT(*) FILTER (WHERE status = 'active' 
                   AND updated_at > NOW() - INTERVAL '30 days') as convertidos_30d,
  ROUND(100.0 * 
    COUNT(*) FILTER (WHERE status = 'active' AND updated_at > NOW() - INTERVAL '30 days') /
    NULLIF(COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0),
    1) as tasa_conversion_pct
FROM membership_leads;
```

---

## 🏢 AURORA (RESERVAS)

### Reservas Pendientes Hoy
```sql
SELECT 
  id,
  user_name as nombre,
  user_phone as telefono,
  fecha_hora,
  numero_personas,
  status,
  created_at
FROM pending_confirmations
WHERE fecha_hora::date = CURRENT_DATE
  AND status = 'pending'
ORDER BY fecha_hora;
```

### Reservas de Próximos 7 Días
```sql
SELECT 
  fecha_hora::date as fecha,
  COUNT(*) as total_reservas,
  SUM(numero_personas) as personas_total
FROM pending_confirmations
WHERE fecha_hora BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND status = 'confirmed'
GROUP BY fecha_hora::date
ORDER BY fecha;
```

### Reservas Sin Email Enviado (Necesitan Reenvío)
```sql
SELECT 
  user_name,
  user_email,
  fecha_hora,
  created_at
FROM pending_confirmations
WHERE email_sent = false
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Ocupación por Horario (top horarios)
```sql
SELECT 
  EXTRACT(HOUR FROM fecha_hora)::integer as hora,
  COUNT(*) as num_reservas,
  SUM(numero_personas) as personas_total
FROM pending_confirmations
WHERE fecha_hora > NOW() - INTERVAL '30 days'
  AND status = 'confirmed'
GROUP BY EXTRACT(HOUR FROM fecha_hora)
ORDER BY num_reservas DESC;
```

---

## 👥 USUARIOS Y CONVERSACIONES

### Usuarios Activos (Últimos 7 días)
```sql
SELECT 
  sender_id as user_phone,
  COUNT(*) as num_mensajes,
  MAX(timestamp) as ultimo_mensaje
FROM conversation_history
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY sender_id
ORDER BY num_mensajes DESC
LIMIT 50;
```

### Conversaciones por Agente
```sql
SELECT 
  agent,
  COUNT(DISTINCT sender_id) as usuarios_unicos,
  COUNT(*) as mensajes_totales
FROM conversation_history
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY agent
ORDER BY mensajes_totales DESC;
```

### Mensajes Sin Responder (Posible Bug)
```sql
SELECT 
  ch.sender_id,
  ch.message_text,
  ch.timestamp,
  ch.agent
FROM conversation_history ch
LEFT JOIN conversation_history ch_response 
  ON ch.sender_id = ch_response.sender_id 
  AND ch_response.timestamp > ch.timestamp
  AND ch_response.is_from_bot = true
WHERE ch.is_from_bot = false
  AND ch.timestamp > NOW() - INTERVAL '1 hour'
  AND ch_response.id IS NULL
ORDER BY ch.timestamp DESC;
```

---

## 🔍 DEBUGGING Y AUDITORÍA

### Forms Stuck (Más de 1 hora sin completar)
```sql
SELECT 
  user_id,
  agent,
  current_step,
  form_data,
  created_at,
  EXTRACT(HOUR FROM (NOW() - created_at)) as horas_stuck
FROM agent_forms
WHERE created_at < NOW() - INTERVAL '1 hour'
  AND current_step != 'completed'
ORDER BY created_at;
```

### Mensajes Duplicados (Detectar Webhook Issues)
```sql
SELECT 
  message_id,
  COUNT(*) as veces_procesado,
  MAX(created_at) as ultima_vez
FROM conversation_history
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY message_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
```

### Integridad de Datos: Leads Sin Teléfono o Nombre
```sql
-- Leads mal formateados
SELECT * FROM membership_leads
WHERE user_phone IS NULL 
   OR user_phone = '' 
   OR name IS NULL 
   OR name = '';
```

---

## 📊 REPORTES PARA DIEGO

### Reporte Diario Completo
```sql
WITH stats AS (
  SELECT 
    -- Aluna
    COUNT(*) FILTER (WHERE ml.created_at::date = CURRENT_DATE) as aluna_leads_hoy,
    COUNT(*) FILTER (WHERE ml.status = 'negotiating') as aluna_negociando,
    COUNT(*) FILTER (WHERE ml.status = 'tour_scheduled') as aluna_tours,
    
    -- Aurora
    (SELECT COUNT(*) FROM pending_confirmations 
     WHERE created_at::date = CURRENT_DATE) as aurora_reservas_hoy,
    (SELECT COUNT(*) FROM pending_confirmations 
     WHERE fecha_hora::date = CURRENT_DATE AND status = 'confirmed') as aurora_confirmadas_hoy
  FROM membership_leads ml
)
SELECT * FROM stats;
```

### Reporte Semanal de Performance
```sql
SELECT 
  DATE_TRUNC('week', created_at)::date as semana,
  COUNT(*) as leads_capturados,
  COUNT(*) FILTER (WHERE status = 'active') as convertidos,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'active') / COUNT(*), 1) as tasa_conversion
FROM membership_leads
WHERE created_at > NOW() - INTERVAL '8 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY semana DESC;
```

---

## 🧹 LIMPIEZA Y MANTENIMIENTO

### Eliminar Leads de Prueba
```sql
-- CUIDADO: Verificar antes de ejecutar
DELETE FROM membership_leads 
WHERE user_phone LIKE '%test%' 
   OR user_phone LIKE '%prueba%'
   OR name ILIKE '%test%'
   OR name ILIKE '%prueba%';
```

### Archivar Conversaciones Viejas (>6 meses)
```sql
-- Primero contar cuánto se eliminará
SELECT COUNT(*) FROM conversation_history 
WHERE timestamp < NOW() - INTERVAL '6 months';

-- Luego eliminar (considerar hacer backup antes)
DELETE FROM conversation_history 
WHERE timestamp < NOW() - INTERVAL '6 months';
```

### Resetear Form Stuck Manualmente
```sql
-- Ver el form
SELECT * FROM agent_forms WHERE user_id = '573XXXXXXXXX';

-- Eliminarlo para que pueda reiniciarse
DELETE FROM agent_forms WHERE user_id = '573XXXXXXXXX' AND agent = 'AURORA';
```

---

## 💡 TIPS

### Exportar Resultados a CSV (desde psql)
```sql
\copy (SELECT * FROM membership_leads WHERE created_at > NOW() - INTERVAL '30 days') TO '/tmp/leads_30d.csv' CSV HEADER;
```

### Ver Plan de Ejecución de Query Lenta
```sql
EXPLAIN ANALYZE
SELECT * FROM membership_leads 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

### Crear Índice para Query Frecuente
```sql
-- Si notas que queries por phone son lentas
CREATE INDEX idx_membership_leads_phone ON membership_leads(user_phone);

-- Si queries por status son frecuentes
CREATE INDEX idx_membership_leads_status ON membership_leads(status);
```
