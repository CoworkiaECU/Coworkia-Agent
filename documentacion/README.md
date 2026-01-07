# 📚 Documentación Coworkia Agent

**Versión**: 0.2.0  
**Última actualización**: Enero 2026  

## 🎯 Documentos Actuales

### Sistema Core
- **[SISTEMA_HANDOVERS.md](SISTEMA_HANDOVERS.md)** - Multi-agente: Aurora, Axel, Enzo, Adriana, Aluna, Ángela, Gabi
- **[SISTEMA_MULTIIDIOMA.md](SISTEMA_MULTIIDIOMA.md)** - ES/EN/FR con auto-detección
- **[SISTEMA_REPLY_CONTEXT.md](SISTEMA_REPLY_CONTEXT.md)** - Contexto de mensajes citados
- **[SISTEMA_FOLLOW_UP.md](SISTEMA_FOLLOW_UP.md)** - Follow-ups automáticos

### Integraciones
- **[WASSENGER_SETUP.md](WASSENGER_SETUP.md)** - WhatsApp API setup
- **[GMAIL_SETUP.md](GMAIL_SETUP.md)** - Configuración email
- **[GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)** - Calendar API
- **[CONEXION_HEROKU.md](CONEXION_HEROKU.md)** - Deploy Heroku + PostgreSQL

### Diagnóstico
- **[DIAGNOSTICO-EMAIL-CALENDAR.md](DIAGNOSTICO-EMAIL-CALENDAR.md)** - Troubleshooting
- **[MIGRACION_POSTGRES.md](MIGRACION_POSTGRES.md)** - SQLite → PostgreSQL
- **[TESTING_LOCAL.md](TESTING_LOCAL.md)** - Setup local dev
- **[BACKUP_PLAN.md](BACKUP_PLAN.md)** - Estrategia respaldos

### Conversación
- **[ESCENAS_CONVERSACIONALES.md](ESCENAS_CONVERSACIONALES.md)** - Flujos UX
- **[INSTRUCCIONES_GOOGLE_CALENDAR.md](INSTRUCCIONES_GOOGLE_CALENDAR.md)** - Calendar workflows

## 📦 Archivo
- **[archive-nov2025/](archive-nov2025/)** - Documentos obsoletos (v120-v294)

## 🏗️ Arquitectura

```
Multi-Agent System
├── Aurora (Secretary) - Coordina reservas
├── Axel (Auto Shop) - The PaintBull specialist
├── Enzo (Marketing) - MarketingLab IA
├── Adriana (Insurance) - SegPopular
├── Ángela (Health) - MedBeneficios
├── Gabi (Finance/HR/Legal) - Business Center
└── Aluna (Memberships) - Planes mensuales
```

## 🔗 Links Útiles
- **Producción**: https://coworkia-agent-e97d15dac56f.herokuapp.com/
- **Webhook**: /webhooks/wassenger
- **Health**: /health
