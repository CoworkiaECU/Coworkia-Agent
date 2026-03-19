---
name: database-queries
description: Queries SQL comunes para debugging, monitoreo y análisis de datos. Usa este skill cuando necesites consultar reservas, leads, usuarios, follow-ups, verificar integridad de datos, generar reportes, o debuggear problemas de base de datos.
---

# Database Queries Skill

## Cuándo Usar Este Skill
- 📊 Necesito ver reservas de hoy/semana
- 🔍 Buscar usuario por teléfono/nombre
- 💼 Ver leads calientes de Aluna
- ⏰ Verificar follow-ups pendientes
- 🐛 Debuggear dato corrupto
- 📈 Generar reporte mensual

## Conexión a DB

### Local (PostgreSQL Heroku)
```bash
# Todas las apps usan la MISMA DB de Heroku:
DATABASE_URL=postgresql://...

# Conectar vía psql:
heroku pg:psql --app coworkia-agent

# O usar connection string:
psql $DATABASE_URL
```

### Verificar Conexión
```sql
-- Ver tablas:
\dt

-- Ver schema de tabla:
\d users
\d reservations
\d membership_leads
```

## Schema Principal

### Tablas Core

#### `users`
```sql
- id SERIAL PRIMARY KEY
- nombre TEXT
- email TEXT
- phone_number TEXT UNIQUE
- tipo_usuario TEXT (visitante, miembro, etc)
- plan TEXT (daypass, hotdesk, etc)
- horas_disponibles INTEGER
- creado_en TIMESTAMP
```

#### `reservations`
```sql
- id TEXT PRIMARY KEY (RES-...)
- user_id INTEGER → users.id
- fecha_hora TIMESTAMP
- duracion_horas INTEGER
- numero_personas INTEGER
- plan TEXT
- total_pagado DECIMAL
- estado TEXT (confirmada, pendiente, cancelada)
- flag_24h BOOLEAN (follow-up enviado)
```

#### `membership_leads`
```sql
- id TEXT PRIMARY KEY (ML-...)
- membership_code TEXT
- user_phone TEXT
- client_name TEXT
- phone TEXT
- email TEXT
- status TEXT (pending, negotiating, active, etc)
- monthly_fee DECIMAL
- membership_type TEXT
- last_interaction_at TIMESTAMP
- automation_d1_sent BOOLEAN
- automation_d3_sent BOOLEAN
- client_whatsapp_reply BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

#### `aluna_prospect_followups`
```sql
- user_phone TEXT PRIMARY KEY
- user_name TEXT
- membership_type TEXT
- interest_at TIMESTAMP
- followup_24h_sent_at TIMESTAMP
- followup_3d_sent_at TIMESTAMP
- converted_at TIMESTAMP
```

#### `pending_confirmations`
```sql
- user_phone TEXT PRIMARY KEY
- agent_type TEXT (AURORA, ALUNA)
- reservation_data JSONB
- confirmation_type TEXT
- created_at TIMESTAMP
- expires_at TIMESTAMP
```

## Queries por Agente

### Aurora (Reservas)

#### Ver Reservas de Hoy
```sql
SELECT 
    r.id,
    r.fecha_hora,
    r.duracion_horas,
    r.plan,
    u.nombre,
    u.phone_number,
    r.estado
FROM reservations r
JOIN users u ON r.user_id = u.id
WHERE DATE(r.fecha_hora) = CURRENT_DATE
ORDER BY r.fecha_hora;
```

#### Reservas Pendientes (Futuras)
```sql
SELECT 
    r.id,
    r.fecha_hora,
    u.nombre,
    u.phone_number,
    r.plan,
    r.numero_personas,
    r.estado
FROM reservations r
JOIN users u ON r.user_id = u.id
WHERE r.fecha_hora > NOW()
  AND r.estado = 'confirmada'
ORDER BY r.fecha_hora;
```

#### Reservas Sin Follow-up 24h
```sql
SELECT 
    r.id,
    r.fecha_hora,
    u.nombre,
    u.phone_number,
    r.fecha_hora - INTERVAL '24 hours' as trigger_time,
    NOW() as current_time
FROM reservations r
JOIN users u ON r.user_id = u.id
WHERE r.flag_24h = FALSE
  AND r.fecha_hora > NOW()
  AND r.fecha_hora - INTERVAL '24 hours' <= NOW()
  AND r.estado = 'confirmada'
ORDER BY r.fecha_hora;
```

#### Confirmaciones Pendientes
```sql
SELECT 
    user_phone,
    agent_type,
    reservation_data->>'plan' as plan,
    reservation_data->>'fecha_hora' as fecha,
    created_at,
    expires_at,
    expires_at < NOW() as expirado
FROM pending_confirmations
WHERE agent_type = 'AURORA'
ORDER BY created_at DESC;
```

#### Revenue del Mes
```sql
SELECT 
    DATE_TRUNC('month', fecha_hora) as mes,
    COUNT(*) as total_reservas,
    SUM(total_pagado) as revenue_total,
    AVG(total_pagado) as ticket_promedio
FROM reservations
WHERE estado = 'confirmada'
  AND fecha_hora >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY mes;
```

### Aluna (Membresías)

#### Leads Calientes (Últimos 7 Días)
```sql
SELECT 
    id,
    client_name,
    phone,
    email,
    status,
    membership_type,
    monthly_fee,
    last_interaction_at,
    EXTRACT(EPOCH FROM (NOW() - last_interaction_at))/3600 as horas_desde_contacto,
    automation_d1_sent,
    automation_d3_sent,
    client_whatsapp_reply
FROM membership_leads
WHERE last_interaction_at > NOW() - INTERVAL '7 days'
  AND status IN ('pending', 'negotiating', 'tour_scheduled')
ORDER BY last_interaction_at DESC;
```

#### Leads Capturados por Keywords (Última Hora)
```sql
SELECT 
    id,
    client_name,
    phone,
    status,
    notes,
    created_at
FROM membership_leads
WHERE notes LIKE '%Keywords:%'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

#### Prospectos Sin Follow-up 24h
```sql
SELECT 
    user_phone,
    user_name,
    membership_type,
    interest_at,
    EXTRACT(EPOCH FROM (NOW() - interest_at))/3600 as horas_transcurridas
FROM aluna_prospect_followups
WHERE followup_24h_sent_at IS NULL
  AND converted_at IS NULL
  AND interest_at <= NOW() - INTERVAL '24 hours'
ORDER BY interest_at;
```

#### Prospectos Sin Follow-up 3 Días
```sql
SELECT 
    user_phone,
    user_name,
    followup_24h_sent_at,
    EXTRACT(EPOCH FROM (NOW() - followup_24h_sent_at))/3600 as horas_desde_d1
FROM aluna_prospect_followups
WHERE followup_24h_sent_at IS NOT NULL
  AND followup_3d_sent_at IS NULL
  AND converted_at IS NULL
  AND followup_24h_sent_at <= NOW() - INTERVAL '72 hours'
ORDER BY followup_24h_sent_at;
```

#### Automatizaciones Enviadas (Dashboard View)
```sql
SELECT 
    id,
    client_name,
    phone,
    status,
    automation_d1_sent,
    automation_d3_sent,
    followup_24h_sent_at,
    followup_3d_sent_at,
    last_interaction_at,
    client_whatsapp_reply,
    client_email_reply,
    CASE
        WHEN last_interaction_at > NOW() - INTERVAL '24 hours' THEN '🟢 Hoy'
        WHEN last_interaction_at > NOW() - INTERVAL '72 hours' THEN '🟡 3d'
        ELSE '🔴 +12d'
    END as color_contacto
FROM membership_leads
WHERE automation_d1_sent = TRUE
   OR automation_d3_sent = TRUE
ORDER BY last_interaction_at DESC NULLS LAST
LIMIT 50;
```

#### Conversion Rate
```sql
SELECT 
    COUNT(*) FILTER (WHERE status = 'active') as convertidos,
    COUNT(*) FILTER (WHERE status IN ('pending', 'negotiating', 'tour_scheduled')) as activos,
    COUNT(*) as total,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'active')::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as conversion_rate
FROM membership_leads
WHERE created_at >= NOW() - INTERVAL '30 days';
```

## Queries de Usuarios

### Buscar Usuario por Teléfono
```sql
SELECT 
    id,
    nombre,
    email,
    phone_number,
    tipo_usuario,
    plan,
    horas_disponibles,
    creado_en
FROM users
WHERE phone_number LIKE '%593%'  -- Reemplazar con número
ORDER BY creado_en DESC;
```

### Buscar Usuario por Nombre
```sql
SELECT 
    id,
    nombre,
    email,
    phone_number,
    tipo_usuario
FROM users
WHERE nombre ILIKE '%juan%'  -- Case-insensitive
ORDER BY nombre;
```

### Usuarios con Horas Disponibles
```sql
SELECT 
    nombre,
    phone_number,
    plan,
    horas_disponibles,
    creado_en
FROM users
WHERE horas_disponibles > 0
ORDER BY horas_disponibles DESC;
```

### Usuarios Activos (Con Reserva Reciente)
```sql
SELECT 
    u.nombre,
    u.phone_number,
    u.plan,
    MAX(r.fecha_hora) as ultima_reserva,
    COUNT(r.id) as total_reservas
FROM users u
JOIN reservations r ON u.id = r.user_id
WHERE r.fecha_hora > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.nombre, u.phone_number, u.plan
ORDER BY ultima_reserva DESC;
```

## Queries de Mantenimiento

### Ver Tablas y Tamaño
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Limpiar Confirmaciones Expiradas
```sql
-- Ver expiradas:
SELECT COUNT(*) FROM pending_confirmations
WHERE expires_at < NOW();

-- Eliminar:
DELETE FROM pending_confirmations
WHERE expires_at < NOW();
```

### Limpiar Forms Expirados
```sql
-- Ver expirados:
SELECT COUNT(*) FROM agent_forms
WHERE expires_at < NOW();

-- Eliminar:
DELETE FROM agent_forms
WHERE expires_at < NOW();
```

### Ver Últimos Errores
```sql
SELECT 
    error_type,
    error_message,
    stack_trace,
    created_at
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;
```

## Queries de Debugging

### Verificar Integridad: Reservas Sin Usuario
```sql
SELECT r.*
FROM reservations r
LEFT JOIN users u ON r.user_id = u.id
WHERE u.id IS NULL;
```

### Verificar Integridad: Leads Sin Teléfono
```sql
SELECT id, client_name, email, created_at
FROM membership_leads
WHERE phone IS NULL OR phone = '';
```

### Duplicados de Teléfono
```sql
SELECT phone_number, COUNT(*) as veces
FROM users
GROUP BY phone_number
HAVING COUNT(*) > 1;
```

### Leads Duplicados
```sql
SELECT user_phone, COUNT(*) as veces
FROM membership_leads
GROUP BY user_phone
HAVING COUNT(*) > 1;
```

## Updates Comunes

### Marcar Reserva como Cancelada
```sql
UPDATE reservations
SET estado = 'cancelada'
WHERE id = 'RES-...';
```

### Restaurar Horas a Usuario
```sql
UPDATE users
SET horas_disponibles = horas_disponibles + 4
WHERE phone_number = '+593...';
```

### Marcar Follow-up como Enviado (Manual)
```sql
UPDATE aluna_prospect_followups
SET followup_24h_sent_at = NOW()
WHERE user_phone = '+593...'
  AND followup_24h_sent_at IS NULL;
```

### Actualizar Status de Lead
```sql
UPDATE membership_leads
SET status = 'negotiating',
    last_interaction_at = NOW()
WHERE id = 'ML-...';
```

### Resetear Automatizaciones
```sql
UPDATE membership_leads
SET automation_d1_sent = FALSE,
    automation_d3_sent = FALSE,
    followup_24h_sent_at = NULL,
    followup_3d_sent_at = NULL
WHERE id = 'ML-...';
```

## Reportes

### Reporte Mensual de Reservas
```sql
SELECT 
    TO_CHAR(fecha_hora, 'YYYY-MM') as mes,
    plan,
    COUNT(*) as cantidad,
    SUM(total_pagado) as revenue,
    AVG(duracion_horas) as horas_promedio
FROM reservations
WHERE estado = 'confirmada'
  AND fecha_hora >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
GROUP BY mes, plan
ORDER BY mes DESC, plan;
```

### Reporte de Captura de Keywords
```sql
SELECT 
    DATE(created_at) as fecha,
    COUNT(*) as leads_capturados,
    COUNT(*) FILTER (WHERE status = 'pending') as pendientes,
    COUNT(*) FILTER (WHERE status = 'negotiating') as negociando
FROM membership_leads
WHERE notes LIKE '%Keywords:%'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY fecha
ORDER BY fecha DESC;
```

### Performance de Follow-ups
```sql
SELECT 
    COUNT(*) as total_prospectos,
    COUNT(*) FILTER (WHERE followup_24h_sent_at IS NOT NULL) as d1_enviados,
    COUNT(*) FILTER (WHERE followup_3d_sent_at IS NOT NULL) as d3_enviados,
    COUNT(*) FILTER (WHERE converted_at IS NOT NULL) as convertidos,
    ROUND(
        COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as conversion_rate
FROM aluna_prospect_followups
WHERE interest_at >= NOW() - INTERVAL '30 days';
```

## Backup y Restore

### Crear Backup Manual
```bash
# Via Heroku:
heroku pg:backups:capture --app coworkia-agent

# Download:
heroku pg:backups:download --app coworkia-agent
```

### Restore desde Backup
```bash
# List backups:
heroku pg:backups --app coworkia-agent

# Restore (CUIDADO - sobrescribe todo):
heroku pg:backups:restore b001 --app coworkia-agent --confirm coworkia-agent
```

## Indexes Recomendados

```sql
-- Para queries de búsqueda por teléfono:
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_membership_leads_phone ON membership_leads(user_phone);

-- Para queries de fecha:
CREATE INDEX idx_reservations_fecha ON reservations(fecha_hora);
CREATE INDEX idx_membership_leads_interaction ON membership_leads(last_interaction_at);

-- Para queries de follow-up:
CREATE INDEX idx_aluna_followup_24h ON aluna_prospect_followups(followup_24h_sent_at);
CREATE INDEX idx_aluna_followup_3d ON aluna_prospect_followups(followup_3d_sent_at);
```

## Troubleshooting DB

### Connection Pool Exhausted
```sql
-- Ver conexiones activas:
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    NOW() - query_start as query_duration
FROM pg_stat_activity
WHERE datname = 'dccdcb...'  -- Tu DB name
ORDER BY query_start;

-- Matar conexión colgada:
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid = 12345;
```

### Slow Queries
```sql
-- Ver queries lentas:
SELECT 
    pid,
    NOW() - query_start as duration,
    query
FROM pg_stat_activity
WHERE state = 'active'
  AND NOW() - query_start > INTERVAL '5 seconds'
ORDER BY duration DESC;
```

## Transactions Seguras

```sql
-- Siempre usar transacciones para updates críticos:
BEGIN;

-- Tus queries aquí...
UPDATE users SET horas_disponibles = 10 WHERE id = 123;

-- Verificar antes de commit:
SELECT * FROM users WHERE id = 123;

-- Si todo OK:
COMMIT;

-- Si algo mal:
ROLLBACK;
```
