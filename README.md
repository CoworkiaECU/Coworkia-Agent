# 🤖 Coworkia Agent

Sistema de agente conversacional multi-personalidad para Coworkia Business Center. Integración WhatsApp (Wassenger) + OpenAI GPT-4o-mini + PostgreSQL en Heroku.

**Versión Actual**: v315 (Enero 2026)  
**Status**: ✅ Producción | 0 vulnerabilities | PostgreSQL optimizado

[![Heroku](https://img.shields.io/badge/deployed-heroku-430098)](https://coworkia-agent-e97d15dac56f.herokuapp.com/)
[![Security](https://img.shields.io/badge/vulnerabilities-0-success)](package.json)
[![Node](https://img.shields.io/badge/node-24.x-brightgreen)](package.json)
[![Database](https://img.shields.io/badge/database-PostgreSQL-blue)](src/database/postgres-adapter.js)

---

## 🌟 Características Principales

### 💬 Sistema Multi-Agente (7 Especialistas)
- **Aurora** - Recepcionista Coworkia (secretaria central)
- **Axel** - The PaintBull (enderezada y pintura automotriz)
- **Enzo** - MarketingLab (marketing digital e IA)
- **Adriana** - SegPopular (seguros)
- **Aluna** - Membresías Coworkia
- **Ángela** - MedBeneficios (salud y bienestar)
- **Gabi** - Finanzas, RRHH y Legal (NEW)

### 🎯 Handoffs Inteligentes
- Mención explícita: `@axel`, `@enzo`, `@adriana`, etc.
- Detección contextual automática
- Memoria conversacional preservada
- Transiciones fluidas entre agentes

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

### 💼 Gabi - Finanzas, RRHH y Legal (NEW)
Experta administrativa para empresas del Business Center.

**Activación:** `@gabi` o "finanzas", "nómina", "legal"

**Funciones:**
- 💰 Gestión financiera/contable
- 👥 RRHH y nómina
- ⚖️ Asesoría legal
- 📋 Compliance
- 🏢 Admin empresas aliadas

**Empresas que atiende:**
- MarketingLab (@enzo)
- SegPopular (@adriana)
- The PaintBull (@axel)
- MedBeneficios (@angela)
- Coworkia (@aurora)

**Ejemplo:**
```
Usuario: "@gabi cómo calculo la nómina"
Gabi: "Para la gestión de nómina incluye:
💰 Cálculo nómina, décimos 13º/14º..."
```

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
│   ├── postgres-adapter.js         # PostgreSQL wrapper
│   ├── userRepository.js
│   └── reservationRepository.js
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
```

---

## 📊 Endpoints API

### Health & Monitoreo

```bash
# Health básico
GET /health
→ { "ok": true, "status": "healthy" }

# Health detallado
GET /health/system
→ { database, scheduler, circuitBreakers }
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
