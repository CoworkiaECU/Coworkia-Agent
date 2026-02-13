# 📚 Documentación Coworkia Agent

Sistema multi-agente inteligente con IA para gestión de coworking, seguros, marketing y más.

---

## 📂 Estructura de Documentación

### [01-setup-configuracion/](./01-setup-configuracion/)
Guías de configuración inicial y setup de servicios externos.

- **gmail-setup.md** - Configuración Gmail API
- **google-calendar-setup.md** - Setup Google Calendar API
- **google-calendar-instrucciones.md** - Instrucciones detalladas Calendar
- **wassenger-setup.md** - Configuración Wassenger WhatsApp
- **heroku-conexion.md** - Deploy y conexión Heroku
- **healthcheck-config.md** - Configuración health checks
- **postgres-migracion.md** - Migración a PostgreSQL
- **backup-plan.md** - Plan de respaldo y recuperación

### [02-agentes-especializados/](./02-agentes-especializados/)
Documentación de agentes especializados implementados.

**Coordinador:**
- **aurora-coordinador.md** - Aurora Core (coordinador inteligente)
- **aurora-messaging.md** - Sistema de mensajería Aurora

**Agentes Especializados:**
- **aluna-implementacion.md** - Aluna (Coworking)
- **axel-mvp.md** - Axel (Cotizaciones auto)
- **axel-flujo-cotizaciones.md** - Flujo de cotizaciones Axel
- **adriana-implementacion.md** - Adriana (Seguros)
- **adriana-analisis-documentos.md** - Análisis documentos seguros
- **enzo-implementacion.md** - Enzo (Marketing visual)
- **enzo-analisis-visual.md** - Análisis visual marketing
- **gabi-sistema.md** - Gabi (Asistencia administrativa)

### [03-arquitectura-sistemas/](./03-arquitectura-sistemas/)
Arquitectura general y sistemas core del proyecto.

- **arquitectura-conversaciones.md** - Arquitectura de conversaciones unificadas
- **diagramas-arquitectura.md** - Diagramas visuales del sistema
- **mapa-flujo-completo.md** - Mapa completo de flujos
- **escenas-conversacionales.md** - Escenas y contextos conversacionales
- **sistema-follow-up.md** - Sistema de seguimiento automático
- **sistema-handovers.md** - Sistema de handoffs entre agentes
- **sistema-multiidioma.md** - Sistema multiidioma
- **sistema-reply-context.md** - Contexto de respuestas (replies)
- **calendario-universal.md** - Calendario universal multi-agente
- **flujo-axel-cotizaciones.md** - Flujo específico cotizaciones

### [04-deployment-produccion/](./04-deployment-produccion/)
Deployment, testing y gestión de producción.

- **testing-y-deployment.md** - Guía testing y deployment
- **testing-local.md** - Testing en ambiente local
- **deployment-v375.md** - Deployment exitoso v375
- **deployment-v379-adriana.md** - Deployment Adriana v379
- **fixes-p0-p1-p2.md** - Fixes críticos priorizados
- **fixes-ux-v387.md** - Fixes UX producción v387
- **promocion-marketinglab.md** - Promoción MarketingLab/OneMind

### [05-testing-auditoria/](./05-testing-auditoria/)
Auditorías técnicas, diagnósticos y testing sistemático.

- **t02-diagnostico-latencia.md** - Diagnóstico latencia sistema
- **t03-auditoria-wassenger.md** - Auditoría integración Wassenger
- **t04-auditoria-reglas-agentes.md** - Auditoría reglas de agentes
- **t05-auditoria-individual-agentes.md** - Auditoría individual agentes
- **t06-auditoria-database.md** - Auditoría base de datos
- **t07-observabilidad.md** - Sistema de observabilidad
- **t08-suite-testing-e2e.md** - Suite testing end-to-end
- **auditoria-limpieza-codigo.md** - Auditoría y limpieza código
- **diagnostico-email-calendar.md** - Diagnóstico email/calendar

### [06-tareas-completadas/](./06-tareas-completadas/)
Documentación de tareas completadas con implementación detallada.

- **t14-follow-up-2h-timeout.md** - Follow-up automático 2h timeout

---

## 🏗️ Arquitectura Multi-Agente

```
Sistema Multi-Agente Coworkia
│
├── 🎯 AURORA (Coordinador Inteligente)
│   ├── Gestión reservas coworking
│   ├── Formularios parciales
│   ├── Confirmaciones automáticas
│   └── Routing a especialistas
│
├── 🚗 AXEL (The PaintBull)
│   ├── Análisis fotos colisión
│   ├── Cotizaciones automáticas
│   └── Envío email + WhatsApp
│
├── ☕ ALUNA (Planes Coworking)
│   ├── Plan 10 horas
│   ├── Plan 20 horas
│   ├── Oficina Ejecutiva
│   └── Planes personalizados
│
├── 🛡️ ADRIANA (Seguros IA)
│   ├── Análisis documentos
│   ├── Cotizaciones seguros
│   └── Recomendaciones
│
├── 🎨 ENZO (Marketing Visual)
│   ├── Análisis imágenes
│   ├── Estrategias marketing
│   └── Contenido visual
│
├── 💰 ANGELA (OneMind IA)
│   ├── Contabilidad
│   ├── Finanzas
│   └── Asesoría tributaria
│
├── 📊 GABI (Asistencia Admin)
│   ├── Gestión documentos
│   ├── Procesos admin
│   └── Soporte legal
│
└── 🏡 PAULA (PropElite)
    ├── Bienes raíces
    ├── Propiedades premium
    └── Agendamiento visitas
```

---

## 🚀 Quick Start

### Para Desarrolladores

1. **Setup inicial:**
   ```bash
   cd /Users/diegovillota/coworkia-agent
   npm install
   cp .env.example .env  # Configurar variables
   ```

2. **Configurar servicios:**
   - Gmail: Ver [01-setup-configuracion/gmail-setup.md](./01-setup-configuracion/gmail-setup.md)
   - Calendar: Ver [01-setup-configuracion/google-calendar-setup.md](./01-setup-configuracion/google-calendar-setup.md)
   - Wassenger: Ver [01-setup-configuracion/wassenger-setup.md](./01-setup-configuracion/wassenger-setup.md)

3. **Testing local:**
   ```bash
   npm run dev
   # Ver documentacion/04-deployment-produccion/testing-local.md
   ```

4. **Deploy a Heroku:**
   ```bash
   git push heroku main
   # Ver documentacion/01-setup-configuracion/heroku-conexion.md
   ```

### Para Product Managers

1. **Entender arquitectura:** [03-arquitectura-sistemas/arquitectura-conversaciones.md](./03-arquitectura-sistemas/arquitectura-conversaciones.md)
2. **Ver flujos:** [03-arquitectura-sistemas/mapa-flujo-completo.md](./03-arquitectura-sistemas/mapa-flujo-completo.md)
3. **Agentes:** Explorar [02-agentes-especializados/](./02-agentes-especializados/)
4. **Escenas UX:** [03-arquitectura-sistemas/escenas-conversacionales.md](./03-arquitectura-sistemas/escenas-conversacionales.md)

---

## 🔧 Mantenimiento

### Auditorías Regulares
- **Latencia:** [05-testing-auditoria/t02-diagnostico-latencia.md](./05-testing-auditoria/t02-diagnostico-latencia.md)
- **Base de datos:** [05-testing-auditoria/t06-auditoria-database.md](./05-testing-auditoria/t06-auditoria-database.md)
- **Observabilidad:** [05-testing-auditoria/t07-observabilidad.md](./05-testing-auditoria/t07-observabilidad.md)

### Troubleshooting
- **Email/Calendar:** [05-testing-auditoria/diagnostico-email-calendar.md](./05-testing-auditoria/diagnostico-email-calendar.md)
- **Wassenger:** [05-testing-auditoria/t03-auditoria-wassenger.md](./05-testing-auditoria/t03-auditoria-wassenger.md)
- **Agentes:** [05-testing-auditoria/t05-auditoria-individual-agentes.md](./05-testing-auditoria/t05-auditoria-individual-agentes.md)

---

## 📝 Convenciones de Nombres

### Archivos Nuevos
- ✅ **Correcto:** `mi-archivo.md`, `sistema-follow-up.md`, `t14-follow-up-2h-timeout.md`
- ❌ **Evitar:** `MI_ARCHIVO.MD`, `SISTEMA_FOLLOW_UP.md`, `T14-FOLLOW-UP-ONE-TIME-2H.md`

### Carpetas
- Prefijo numérico: `01-setup-configuracion/`
- Nombres descriptivos en lowercase
- Guiones para separar palabras

### Tareas
- Formato: `t##-descripcion-corta.md`
- Ejemplo: `t14-follow-up-2h-timeout.md`
- Siempre en carpeta `06-tareas-completadas/` cuando finalizan

---

## 🔗 Links Útiles

### Producción
- **App:** https://coworkia-agent-e97d15dac56f.herokuapp.com/
- **Webhook:** `POST /webhooks/wassenger`
- **Health:** `GET /health`

### Heroku
```bash
# Ver logs
heroku logs --app coworkia-agent --tail

# Restart
heroku restart --app coworkia-agent

# Config vars
heroku config --app coworkia-agent
```

### Database
```bash
# Conectar a PostgreSQL
heroku pg:psql --app coworkia-agent

# Ver info DB
heroku pg:info --app coworkia-agent
```

---

## 📊 Estado del Sistema

**Versión actual:** v455+  
**Última actualización:** Enero 2026  
**Node.js:** 24.13.0  
**Database:** PostgreSQL (Heroku)  

**Agentes activos:** 8  
**Tareas completadas:** 14/15  
**Cobertura tests:** En progreso (T8)

---

## 🎯 Próximos Pasos

1. **T15:** Sistema manual reset agentes desde VSC/DB
2. **T11:** REFACTOR - Reorganizar 32 archivos en /servicios
3. **T12:** Validar y eliminar archivos obsoletos

Ver [todo list completa](../README.md) en raíz del proyecto.

---

**Mantenido por:** Diego Villota  
**Proyecto:** Coworkia Multi-Agent System  
**Stack:** Node.js, OpenAI, PostgreSQL, Heroku, Wassenger
