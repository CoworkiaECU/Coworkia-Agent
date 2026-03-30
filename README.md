# 🤖 Coworkia Agent

Sistema de agente conversacional multi-personalidad para Coworkia Business Center. Integración WhatsApp (Wassenger) + OpenAI GPT-4o-mini + PostgreSQL en Heroku.

**Versión Actual**: v842 (Marzo 2026)  
**Status**: ✅ Producción | 0 vulnerabilities | PostgreSQL optimizado | Observabilidad completa | Boss Commands NLP

[![Heroku](https://img.shields.io/badge/deployed-heroku-430098)](https://coworkia-agent-e97d15dac56f.herokuapp.com/)
[![Security](https://img.shields.io/badge/vulnerabilities-0-success)](package.json)
[![Node](https://img.shields.io/badge/node-24.x-brightgreen)](package.json)
[![Database](https://img.shields.io/badge/database-PostgreSQL-blue)](src/database/postgres-adapter.js)

---

## 🚀 Quick Start — Desarrollo Multi-Chat

**Launcher automático** para trabajar con 3 chats paralelos (Aurora, Aluna, Adriana):

```bash
./scripts/launch-multi-chat.sh
```

Esto abre 3 ventanas de VS Code separadas, cada una con memoria cargada y lista para asignar agente.

📖 Ver [scripts/LAUNCH-README.md](scripts/LAUNCH-README.md) para detalles completos.

---

## 🌟 Características Principales

### 💬 Sistema Multi-Agente (8 Especialistas)
- **Aurora** - Recepcionista Coworkia (secretaria central)
- **Aluna** - Membresías Coworkia
- **Axel** - The PaintBull (enderezada y pintura automotriz)
- **Enzo** - MarketingLab (marketing digital e IA)
- **Gabi** - GR Consulting (Finanzas, RRHH y Legal)
- **Paula** - PropElite (Bienes raíces Ecuador y Rep. Dominicana)
- **Adriana** - SegPopular (seguros)
- **Ángela** - MedBeneficios (salud y bienestar)

### 🎯 Handoffs Inteligentes
- Mención explícita: `@axel`, `@enzo`, `@adriana`, etc.
- Detección contextual automática
- Memoria conversacional preservada
- Transiciones fluidas entre agentes

### 📋 Boss Commands (Cotizaciones del Jefe)
- Lenguaje natural: `"gabi prepara cotización para Juan juan@mail.com cel 099..."`
- Sin orden rígido — OpenAI GPT-4o extrae los datos automáticamente
- 6 agentes con boss command: GABI, ENZO, PAULA, AXEL, ALUNA, ADRIANA
- AXEL incluye fotos reales de casos anteriores de colisiones

### 🗄️ Base de Datos PostgreSQL
- 7 tablas optimizadas (users, reservations, interactions, etc.)
- Foreign keys e índices configurados
- Retención automática: 30 días (interacciones)
- Cron job diario de limpieza (3:00 AM)
- 9.3 MB / 1 GB (saludable)

### 🔒 Seguridad Robusta
- Webhook HMAC SHA-256 validation
- Rate limiting: 10 requests/min por usuario
- Timing-safe comparisons
- 0 vulnerabilities npm (audit clean)

### 🌍 Multi-idioma
- Español (default)
- English
- Detección automática de idioma
- Comandos: `/lang es`, `/lang en`

---

## 👥 Agentes Disponibles

### 🌟 Aurora - Recepcionista Coworkia
Coordinadora central del Business Center.

**Funciones:**
- 📅 Reservas Hot Desk y Salas
- 🎁 Primera visita gratis
- 👥 Cálculo por persona
- 📧 Confirmaciones email
- 📆 Google Calendar sync

**Ejemplo:**
```
Usuario: "Necesito hot desk mañana 2pm"
Aurora: "¡Perfecto! Te reservo..."
```

---

### 🎨 Axel - The PaintBull
Especialista en enderezada, pintura y colisiones vehiculares.

**Activación:** `@axel` o "daños auto", "pintura"

**Funciones:**
- 📸 Análisis visual de daños (Vision API)
- 💰 Cotización con rangos referenciales
- 🔍 Detección daños ocultos
- ⚖️ Disclaimers legales
- 🎯 15 años experiencia

**Tarifas Referenciales:**
- Rayones leves: $50-100
- Abolladuras: $150-300
- Pintura completa: $800-1500
- Enderezada pesada: $1000-2000

**Ejemplo:**
```
Usuario: "@axel tengo un rayón en la puerta"
Axel: "📸 ¿Puedes enviar fotos? Necesito ver:
- Rayón de cerca
- Panel completo..."
```

---

### 🚀 Enzo - MarketingLab
Experto en marketing digital e implementación de IA.

**Activación:** `@enzo` o "marketing", "IA"

**Funciones:**
- 📱 Estrategias digitales
- 🤖 Automatización IA
- 📊 Campañas Ecuador
- 💡 Consultoría tech
- 🎯 ROI optimización

**Ejemplo:**
```
Usuario: "@enzo cómo mejoro mi presencia digital"
Enzo: "¡Gran pregunta! Analicemos tu situación actual..."
```

---

### 🛡️ Adriana - SegPopular
Broker de seguros (Segpopular S.A.)

**Activación:** `@adriana` o "seguro"

**Funciones:**
- 🚗 Seguros vehículos
- 🏠 Seguros incendio
- ❤️ Seguros vida
- 💼 17 años experiencia
- 📋 Cotizaciones

**Ejemplo:**
```
Usuario: "@adriana necesito seguro para mi auto"
Adriana: "¡Con gusto! Para cotizar..."
```

---

### 💼 Aluna - Membresías
Closer de ventas para planes mensuales.

**Activación:** "plan mensual", "membresía"

**Funciones:**
- 🎯 Planes $199 / $349
- 🏢 Oficinas virtuales
- 💰 Cierre ventas
- 📊 Argumentación valor

---

### ❤️ Ángela - MedBeneficios
Especialista en salud y bienestar corporativo.

**Activación:** `@angela` o "salud", "bienestar"

**Funciones:**
- 🏥 Planes salud empresariales
- 💊 Medicina preventiva
- 🧘 Programas bienestar
- 📊 Check-ups corporativos

---

### 💼 Gabi - GR Consulting
Experta en finanzas, RRHH, legal y compliance para empresas del Business Center.

**Activación:** `@gabi` o "finanzas", "nómina", "legal"

**Funciones:**
- 💰 Gestión financiera/contable
- 👥 RRHH y nómina
- ⚖️ Asesoría legal
- 📋 Compliance SCVS, SRI, IESS
- 🏢 Admin empresas aliadas

**Ejemplo:**
```
Usuario: "gabi cotización para Fer Gavilanez, empresa Wellness-Series,
         SCVS, Mafer@gmail.com, cel 0998379860"
Gabi: [envía cotización por email con logo GR Consulting]
```

---

### 🏠 Paula - PropElite
Especialista en bienes raíces Ecuador y Rep. Dominicana.

**Activación:** `@paula` o "propiedad", "apartamento", "casa"

**Funciones:**
- 🏘️ Venta y arriendo de propiedades
- 📋 Cotizaciones y brochures por email
- 🌎 Cobertura Ecuador + Rep. Dominicana

---

## 🏗️ Arquitectura

```
src/
├── deteccion-intenciones/
│   ├── orquestador.js              # Coordinador multi-agente
│   ├── aurora.js                   # Recepcionista (212 líneas)
│   ├── axel.js                     # The PaintBull (245 líneas) ✨ OPTIMIZADO
│   ├── enzo.js                     # MarketingLab
│   ├── adriana.js                  # SegPopular
│   ├── aluna.js                    # Membresías
│   ├── angela.js                   # MedBeneficios
│   └── gabi.js                     # Finanzas/RRHH/Legal (92 líneas) ✨ OPTIMIZADO
├── database/
│   ├── postgres-adapter.js         # PostgreSQL wrapper (T6: transaction, pool events)
│   ├── userRepository.js
│   └── reservationRepository.js
├── utils/
│   └── observability.js            # T7: Métricas, logs, health checks (450+ líneas)
├── servicios/
│   ├── cron-scheduler.js           # Limpieza automática
│   ├── email.js                    # Gmail notifications
│   └── google-calendar.js
├── servicios-ia/
│   └── openai.js                   # GPT-4o-mini client
└── express-servidor/
    ├── middleware/
    │   └── webhook-security.js     # HMAC validation
    └── endpoints-api/
        └── wassenger.js            # WhatsApp webhook
```

---

## 🚀 Deploy Heroku

### Requisitos
- Node.js 24.x
- PostgreSQL (Heroku Postgres)
- OpenAI API Key
- Wassenger Account

### Variables de Entorno

```bash
# Database
DATABASE_URL=postgresql://...  # Auto-configurado por Heroku

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Wassenger
WASSENGER_TOKEN=...
WASSENGER_DEVICE_ID=...
WASSENGER_WEBHOOK_SECRET=...  # HMAC signature

# Opcional
GMAIL_USER=...
GMAIL_APP_PASSWORD=...
GOOGLE_CALENDAR_ID=...
DEBUG_MODE=false
```

### Comandos

```bash
# Deploy
git push heroku main

# Logs
heroku logs --tail

# Auditoría DB
heroku run "node scripts/audit-database.js" --app coworkia-agent

# Limpieza manual
heroku run "node scripts/cleanup-obsolete-tables.js" --app coworkia-agent

# Health check
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/health

# Métricas del sistema (T7)
curl https://coworkia-agent-e97d15dac56f.herokuapp.com/metrics | jq

# Ver logs estructurados
heroku logs --tail | grep '"level":"ERROR"'
```

---

## 📊 Endpoints API

### 👁️ Observabilidad (v425)

```bash
# Métricas del sistema
GET /metrics
→ {
  "requests": { "total": 1234, "success": 1200, "avgResponseTime": 245 },
  "database": { "queriesTotal": 3456, "slowQueries": 12 },
  "agents": { "AURORA": { "activations": 892 } },
  "openai": { "tokensUsed": 456789 },
  "system": { "uptime": 86400, "memoryUsage": 256 }
}

# Health checks
GET /health
→ {
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy", "responseTime": 4 },
    "memory": { "status": "healthy", "percentUsed": "35%" }
  }
}
```

**Documentación completa:** [T7-OBSERVABILIDAD.md](documentacion/T7-OBSERVABILIDAD.md)

### Health & Monitoreo Legacy

```bash
# Health básico (legacy)
GET /
→ { "ok": true, "service": "coworkia-agent", "version": "v425" }
```

### Webhook WhatsApp

```bash
# Wassenger webhook (protegido con HMAC)
POST /webhooks/wassenger
Headers: { "x-webhook-signature": "sha256=..." }
Body: { event, data: { from, body } }
→ Procesamiento automático
```

---

## 🗄️ Base de Datos

### Tablas Activas (7)

1. **users** - Perfiles de usuarios
2. **reservations** - Reservas Coworkia
3. **interactions** - Log conversaciones (retención 30 días)
4. **pending_confirmations** - Confirmaciones pendientes
5. **reservation_state** - Estado reservas
6. **partial_forms** - Formularios cancelados
7. **conversation_history** - Historial completo

### Cron Jobs

```bash
# Limpieza confirmaciones expiradas (cada 2h)
cleanupExpiredConfirmations()

# Limpieza interacciones >30 días (diario 3:00 AM)
cleanupOldInteractions({ retentionDays: 30 })

# Follow-up automático (cada hora 6am-10pm)
processFollowUps()
```

---

## 🛠️ Scripts Disponibles

### Auditoría

```bash
# Auditoría completa PostgreSQL
node scripts/audit-database.js

# Auditar reservas
node scripts/audit-reservations.js

# Ver reservas usuario
node scripts/check-user-reservations.js
```

### Limpieza

```bash
# Limpiar datos expirados
node scripts/cleanup-expired-data.js

# Limpiar tablas obsoletas
node scripts/cleanup-obsolete-tables.js

# Reset completo DB (¡CUIDADO!)
node scripts/clear-database.js
```

### Gestión

```bash
# Gestionar reservas
node scripts/manage-reservations.js

# Reset usuario específico
node scripts/reset-user-temp.js
```

Ver [scripts/README.md](scripts/README.md) para lista completa.

---

## 📈 Historial de Versiones

### v842 (Marzo 2026) - Schema migration collision_quotes 🔧
- ✅ `ALTER TABLE collision_quotes ADD COLUMN IF NOT EXISTS damage_analysis JSONB`
- ✅ `ALTER TABLE collision_quotes ADD COLUMN IF NOT EXISTS quote_details TEXT`
- ✅ `fetchBestDemoCase()`: removida columna `damage_analysis` del SELECT (no existía en live DB)

### v841 (Marzo 2026) - Boss Commands NLP natural language 🤖
- ✅ Parsers async con `gpt-4o` para GABI, PAULA, AXEL (temperature: 0.1)
- ✅ ALUNA boss command: inline OpenAI en `wassenger.js` (reemplaza pipe-syntax regex)
- ✅ `isXxxBossQuoteCommand()` ampliado: acepta `manda`, `envía`, `propuesta`, `proforma`, `para <Nombre>`, `coti`
- ✅ `wassenger.js`: `await` en parsers AXEL y PAULA
- ✅ Frases naturales sin orden rígido en todos los 6 agentes

### v840 (Marzo 2026) - Fix DB query + name parser 🔧
- ✅ `database.js` `query()`: corregido para usar `db.all()` con retorno `{ rows }` (postgresAdapter no tiene `.query()` nativo)
- ✅ `axel-demo-cotizacion.js` `fetchBestDemoCase()`: usa `databaseService.all()` directamente
- ✅ Parser nombre: strips de secuencias numéricas y literal "telefono" en nombre resultante

### v839 (Marzo 2026) - Fixes campaña WhatsApp 📣
- ✅ `sala de reuniones` ya no activa campaña de membresías ALUNA (falso positivo)
- ✅ Campaña #1 ahora incluye hint `@aluna` para navegación
- ✅ `me interesa` → handoff a ENZO funciona correctamente en ventana de 30 min (`lastVirtualAgentPromoAt`)

### v427 (Enero 2026) - Caché de Perfiles P1 ⚡
- ✅ **P1**: Caché en memoria para perfiles (30s TTL)
  - Map() nativo, sin dependencias externas
  - Cache hit ratio esperado: ~80%
  - Latencia: 0ms (hit) vs 100-300ms (miss)
  - Invalidación automática en saveProfile()
  - Reducción queries DB: ~70-80%

### v426 (Enero 2026) - Optimización loadProfile P0 ⚡
- ✅ **P0**: Queries en paralelo con Promise.all()
  - 5 queries secuenciales → paralelas
  - Reducción latencia: 50-70%
  - Tiempo loadProfile: 500-1000ms → 100-300ms

### v425 (Enero 2026) - Observabilidad + DB Audit ✨
- ✅ **T6**: Auditoría DB completa (8.5/10 health score)
  - transaction() method implementado
  - Pool event handlers (error/acquire/release)
  - Error categorization (23505, 23503, 57014, 42P01)
- ✅ **T7**: Sistema de observabilidad completo (450+ líneas)
  - MetricsCollector: requests, DB, agents, OpenAI, system
  - StructuredLogger: logs JSON con niveles
  - HealthChecker: database + memory checks
  - Endpoints: /metrics, /health
  - requestTrackingMiddleware automático
- ✅ **T8**: Suite testing E2E (66/66 tests ✓)
- 📄 **Docs**: T6-AUDITORIA-DB.md + T7-OBSERVABILIDAD.md

### v315 (Enero 2026) - Limpieza DB ✨
- ✅ Retención 30 días (antes 90)
- ✅ Eliminadas tablas obsoletas (form_data, just_confirmed)
- ✅ -370 interacciones antiguas
- ✅ Script audit-database.js

### v314 (Enero 2026) - Auditoría completa
- ✅ Script auditoría PostgreSQL
- ✅ Análisis estructura, índices, foreign keys
- ✅ Detección issues automática

### v313 (Enero 2026) - Seguridad + Deps ✨
- ✅ Webpack security endurecido
- ✅ 7 → 0 vulnerabilidades npm
- ✅ Axel optimizado: 429 → 245 líneas (-43%)
- ✅ Gabi optimizado: 292 → 92 líneas (-68%)
- ✅ .env consolidation: 5 → 3 archivos

### v312 (Diciembre 2025) - Orquestador refactor
- ✅ Orquestador ejecuta PRIMERO
- ✅ Handoffs limpios sin duplicación
- ✅ Arquitectura optimizada

---

## 📚 Documentación

- **[documentacion/README.md](documentacion/README.md)** - Índice completo documentación
- **[documentacion/T6-AUDITORIA-DB.md](documentacion/T6-AUDITORIA-DB.md)** - Auditoría PostgreSQL (v425)
- **[documentacion/T7-OBSERVABILIDAD.md](documentacion/T7-OBSERVABILIDAD.md)** - Métricas + Logs (v425)
- **[scripts/README.md](scripts/README.md)** - Índice scripts disponibles
- **[documentacion/SISTEMA_HANDOVERS.md](documentacion/SISTEMA_HANDOVERS.md)** - Multi-agente
- **[documentacion/SISTEMA_MULTIIDIOMA.md](documentacion/SISTEMA_MULTIIDIOMA.md)** - ES/EN
- **[documentacion/WASSENGER_SETUP.md](documentacion/WASSENGER_SETUP.md)** - WhatsApp setup
- **[documentacion/CONEXION_HEROKU.md](documentacion/CONEXION_HEROKU.md)** - Deploy Heroku

---

## 🔧 Desarrollo Local

```bash
# 1. Clonar e instalar
git clone https://github.com/CoworkiaECU/Coworkia-Agent.git
cd Coworkia-Agent
npm install

# 2. Configurar .env.local
cp .env.example .env.local
# Editar con tus keys

# 3. Iniciar
npm run dev
# → http://localhost:3000

# 4. Testing WhatsApp (opcional)
ngrok http 3000
# Copiar URL → Wassenger webhook
```

---

## 📞 Contacto

- **Desarrollador:** Diego Villota
- **Email:** yo@diegovillota.com
- **GitHub:** [CoworkiaECU/Coworkia-Agent](https://github.com/CoworkiaECU/Coworkia-Agent)

---

## 📄 Licencia

MIT License

---

**Desarrollado con ❤️ para Coworkia Business Center** 🇪🇨  
Sistema demo de ventas - Enero 2026
