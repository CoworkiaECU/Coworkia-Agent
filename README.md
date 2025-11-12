# 🤖 Coworkia Agent

Sistema de agente conversacional inteligente con múltiples personalidades para gestión de coworking, ventas, seguros y marketing. Integrado con WhatsApp vía Wassenger y OpenAI GPT-4.

[![Heroku](https://img.shields.io/badge/deployed-heroku-430098)](https://coworkia-agent-e97d15dac56f.herokuapp.com/)
[![Tests](https://img.shields.io/badge/tests-160%2F167%20passing-success)](src/__tests__)
[![Node](https://img.shields.io/badge/node-20.x-brightgreen)](package.json)

---

## 🌟 **Características Principales**

### 💬 **Sistema Multi-Agente Inteligente**
- **4 Agentes Especializados**: Aurora, Aluna, Adriana, Enzo
- **Cambio Contextual**: Transición inteligente entre agentes según necesidades
- **Memoria Conversacional**: Mantiene contexto de usuario e historial

### 📝 **Formulario Inteligente de Reservas**
- Detecta datos en **cualquier orden** del mensaje
- Recuerda información parcial entre mensajes (TTL 15 min)
- Validación **timezone-aware** Ecuador (UTC-5)
- Upsell automático: 3+ personas → sugerencia sala reunión

### ⚡ **Sistema Robusto**
- **Circuit Breakers**: OpenAI + Wassenger
- **Cron Jobs**: Limpieza automática, recordatorios
- **Task Queue**: Procesamiento inline eficiente
- **SQLite**: Base de datos persistente

### 🧪 **Testing Completo**
- 149 tests unitarios (100%)
- 11 tests E2E (flujo completo reservas)
- **160/167 tests passing** (95.8%)

---

## 👥 **Agentes Disponibles**

### 🌟 **Aurora** - Recepcionista Coworkia
**Activación:** Por defecto (bot principal)

**Funciones:**
- 📅 Reservas Hot Desk y Salas de Reunión
- 💳 Verificación de pagos (comprobantes)
- 🎁 Gestión día gratis (primer uso)
- ⏰ Validación horarios 7am-8pm Ecuador
- 📧 Confirmaciones por email
- 📆 Integración Google Calendar

**Ejemplo:**
```
Usuario: "Necesito hot desk mañana a las 2pm"
Aurora: "¡Perfecto! Te reservo hot desk para [fecha] 14:00-16:00..."
```

---

### 💼 **Aluna** - Closer de Ventas
**Activación:** Menciona "plan mensual", "membresía"

**Funciones:**
- 🎯 Planes mensuales: $199 (10 visitas) y $349 (20 visitas)
- 🏢 Oficinas ejecutivas y virtuales
- 💰 Cierre de ventas y seguimiento
- 📊 Argumentación de valor

**Ejemplo:**
```
Usuario: "Quiero un plan mensual"
Aluna: "¡Excelente decisión! Tenemos dos planes..."
```

---

### 🛡️ **Adriana** - Broker de Seguros (Segpopular S.A.)
**Activación:** `@adriana` o menciona "seguro"

**Funciones:**
- 🚗 Seguros de vehículos
- 🏠 Seguros contra incendio
- ❤️ Seguros de vida
- 💼 17 años de experiencia
- 📋 Cotizaciones personalizadas

**Ejemplo:**
```
Usuario: "@adriana necesito seguro para mi auto"
Adriana: "¡Con gusto te ayudo! Para cotizar tu seguro vehicular..."
```

---

### 🚀 **Enzo** - Experto en Marketing & IA
**Activación:** `@enzo` o menciona "marketing", "IA"

**Funciones:**
- 📱 Estrategias marketing digital
- 🤖 Implementación de IA
- 🎯 Automatización de procesos
- 📊 Campañas para mercado Ecuador
- 💡 Consultoría tecnológica

**Ejemplo:**
```
Usuario: "@enzo cómo mejoro mi presencia digital"
Enzo: "¡Gran pregunta! Primero analicemos tu situación actual..."
```

---

## 🏗️ **Arquitectura del Sistema**

```
src/
├── servicios/                    # Lógica de negocio
│   ├── aurora-confirmation-helper.js   # Flujo reservas Aurora
│   ├── partial-reservation-form.js     # Formulario inteligente
│   ├── calendario.js                   # Disponibilidad + timezone
│   ├── payment-verification.js         # Verificación pagos
│   ├── email.js                        # Notificaciones Gmail
│   └── google-calendar.js              # Integración Calendar
├── cerebro/                      # Motor multi-agente
│   ├── orquestador.js                  # Coordinación agentes
│   ├── detectar-intencion.js           # NLP intenciones
│   └── personalidades/                 # 4 agentes
├── database/                     # Persistencia
│   ├── database.js                     # SQLite setup
│   ├── reservationRepository.js
│   └── userRepository.js
├── express-servidor/             # API REST
│   └── endpoints-api/
│       ├── wassenger.js                # Webhook WhatsApp
│       ├── health.js                   # Monitoreo
│       └── chat.js                     # API pública
└── __tests__/                    # Testing
    ├── *.test.js                       # 149 unitarios
    └── e2e-reservation-flow.test.js    # 11 E2E
```

---

## 🚀 **Deploy y Configuración**

### **Requisitos**
- Node.js 20.x
- Cuenta Heroku
- OpenAI API Key
- Wassenger Account
- Gmail App Password (opcional)
- Google Calendar API (opcional)

### **Variables de Entorno**

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Wassenger (WhatsApp)
WASSENGER_TOKEN=...
WASSENGER_DEVICE_ID=...

# Opcional: Email
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=...

# Opcional: Google Calendar
GOOGLE_CALENDAR_ID=...
GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account",...}

# Debug (desarrollo)
DEBUG=true
DEBUG_EMAIL=true
```

### **Deploy Heroku**

```bash
# 1. Clonar repo
git clone https://github.com/CoworkiaECU/Coworkia-Agent.git
cd Coworkia-Agent

# 2. Login Heroku
heroku login

# 3. Crear app
heroku create coworkia-agent

# 4. Configurar variables
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set WASSENGER_TOKEN=...
heroku config:set WASSENGER_DEVICE_ID=...
heroku config:set NODE_ENV=production

# 5. Deploy
git push heroku main

# 6. Ver logs
heroku logs --tail

# 7. Verificar health
curl https://coworkia-agent.herokuapp.com/health
```

### **Configurar Webhook Wassenger**

1. Ir a Wassenger Dashboard
2. Settings → Webhooks
3. URL: `https://your-app.herokuapp.com/webhooks/wassenger`
4. Eventos: `message:in:new`
5. Test Connection ✅

---

## 📊 **Endpoints API**

### **Health & Monitoreo**

```bash
# Health básico
GET /health
→ { "ok": true, "ai": "ready" }

# Health detallado
GET /health/system
→ { health, circuitBreakers, database, scheduler }

# Estadísticas pagos (v121)
GET /health/payment-stats
→ { totalVerified, pendingPayments, successRate, paymentMethods }

# Colas y tareas
GET /health/queues
→ { taskQueue, pendingReservations, cronJobs }
```

### **Webhook WhatsApp**

```bash
# Wassenger webhook
POST /webhooks/wassenger
Body: { event, data: { fromNumber, body } }
→ Procesamiento automático + respuesta
```

### **Chat API (Público)**

```bash
# Enviar mensaje
POST /api/chat
Body: { phoneNumber, message, agentType? }
→ { response, agent, context }
```

---

## 🧪 **Testing**

```bash
# Todos los tests
npm test

# Solo E2E
npm test e2e-reservation-flow

# Con cobertura
npm test:coverage

# Watch mode
npm test:watch
```

**Cobertura Actual:**
- ✅ 149/149 tests unitarios
- ✅ 11/18 tests E2E
- 📊 **95.8% passing** (160/167)

---

## 🛠️ **Scripts Disponibles**

```bash
# Desarrollo
npm run dev              # Nodemon con hot-reload

# Producción
npm start                # Node directo

# Testing
npm test                 # Jest tests
npm run test:watch       # Watch mode

# Database
npm run backup           # Backup SQLite
npm run backup:list      # Listar backups

# Mantenimiento
npm run cleanup          # Limpia datos expirados
npm run cleanup:dry-run  # Simula limpieza
npm run audit            # Auditoría reservas

# Reservas
npm run reservations     # Gestionar reservas manual
```

---

## 📈 **Historial de Versiones Recientes**

### **v120 - Logs Limpios** (Nov 12, 2025)
- ✅ DEBUG logs condicionales (process.env.DEBUG)
- ✅ Producción sin logs innecesarios
- ✅ email.js debug condicional

### **v121 - Payment Stats + E2E Fix** (Nov 12, 2025)
- ✅ getPaymentVerificationStats() con BD real
- ✅ Endpoint /health/payment-stats
- ✅ Tests E2E ejecutándose (11/18 passing)

### **v117-v119 - Sistema Completo** (Nov 11, 2025)
- ✅ Timezone-aware Ecuador (UTC-5)
- ✅ suggestAlternativeSlots con reservas reales
- ✅ Script audit-reservations.js
- ✅ 18 tests E2E creados

### **v112-v116 - Formulario Inteligente** (Nov 10-11, 2025)
- ✅ Formulario parcial persistente (TTL 15 min)
- ✅ Detección datos en cualquier orden
- ✅ Upsell automático 3+ personas
- ✅ 149/149 tests unitarios passing

---

## 📝 **Funcionalidades Destacadas**

### **Formulario Inteligente**
```javascript
// Usuario puede enviar datos en CUALQUIER orden
"hot desk mañana"           → Detecta: spaceType, date
"para 3 personas"           → Detecta: numPeople (trigger upsell)
"a las 2pm"                 → Detecta: time
"test@email.com"            → Detecta: email
// ✅ Formulario completo → Validación automática
```

### **Validación Timezone-aware**
```javascript
// Ecuador UTC-5 - Rechaza horarios pasados
checkAvailability('2025-11-12', '08:00', 2, 'hotDesk')
// Si son las 9am Ecuador → { available: false, reason: 'Ese horario ya pasó' }
```

### **Upsell Automático**
```javascript
// Usuario dice: "para 4 personas"
// Sistema detecta: numPeople >= 3
// Aurora sugiere: "¿Qué tal una sala de reunión privada? Más cómodo..."
```

### **Circuit Breakers**
```javascript
// OpenAI falla 3 veces → Circuit OPEN
// Wassenger timeout → Circuit HALF-OPEN
// Sistema se recupera automáticamente
```

---

## 🔧 **Desarrollo Local**

```bash
# 1. Clonar e instalar
git clone https://github.com/CoworkiaECU/Coworkia-Agent.git
cd Coworkia-Agent
npm install

# 2. Configurar .env
cp .env.example .env
# Editar .env con tus keys

# 3. Iniciar desarrollo
npm run dev
# Servidor: http://localhost:3000

# 4. Exponer con ngrok (testing WhatsApp)
ngrok http 3000
# Copiar URL → Wassenger webhook
```

---

## 📚 **Documentación Adicional**

- [LISTA_TAREAS.md](documentacion/LISTA_TAREAS.md) - Roadmap completo
- [WASSENGER_SETUP.md](documentacion/WASSENGER_SETUP.md) - Configuración WhatsApp
- [GOOGLE_CALENDAR_SETUP.md](documentacion/GOOGLE_CALENDAR_SETUP.md) - Integración Calendar
- [GMAIL_SETUP.md](documentacion/GMAIL_SETUP.md) - Configuración email

---

## 📞 **Soporte y Contacto**

- **Repositorio:** [github.com/CoworkiaECU/Coworkia-Agent](https://github.com/CoworkiaECU/Coworkia-Agent)
- **Issues:** [GitHub Issues](https://github.com/CoworkiaECU/Coworkia-Agent/issues)
- **Email:** yo@diegovillota.com

---

## 📄 **Licencia**

MIT License - Ver [LICENSE](LICENSE) para más detalles.

---

## 🙏 **Agradecimientos**

- OpenAI GPT-4 - Motor conversacional
- Wassenger - Integración WhatsApp
- Heroku - Hosting y deploy
- Jest - Framework de testing

---

**Desarrollado con ❤️ por Diego Villota para Coworkia Ecuador** 🇪🇨
