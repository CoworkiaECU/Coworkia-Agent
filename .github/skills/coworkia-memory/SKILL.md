---
name: coworkia-memory
description: Memoria de largo plazo del proyecto Coworkia Agent. Contexto completo del sistema multi-agente, decisiones técnicas históricas, problemas resueltos, preferencias de Diego, y estado actual. Lee SIEMPRE al inicio de cada sesión para tener contexto total del proyecto sin necesidad de explicaciones.
---

# Coworkia Memory - Memoria de Largo Plazo

## 🎯 Propósito de Este Skill

**Nunca más preguntar "¿cómo funciona el proyecto?"**

Este skill contiene la memoria completa del proyecto Coworkia Agent: arquitectura, decisiones técnicas, problemas resueltos, preferencias del desarrollador, y estado actual. Debe ser leído automáticamente al inicio de cada sesión para tener contexto completo.

---

## � PROTOCOLO DE INICIO DE SESIÓN

**Cada vez que Diego inicia una sesión de trabajo, el agente DEBE:**

### 1. Configurar Workspace en Dos Ventanas
```
┌─────────────────────┬─────────────────────┐
│  PLAN DE VUELO      │   CHAT ACTIVO       │
│  (archivo .md)      │   (conversación)    │
│                     │                     │
│  - Plan del día     │   - Work in         │
│  - Tareas           │     progress        │
│  - Checkpoints      │   - Requests        │
│                     │   - Updates         │
└─────────────────────┴─────────────────────┘
```

### 2. Abrir Automáticamente Estos Archivos:

**Panel Izquierdo** (Archivo de contexto):
- **Prioridad 1**: `planes-de-vuelo/plan-vuelo-[fecha actual].md`
- **Prioridad 2** (si no existe plan del día): `planes-de-vuelo/plan-vuelo-[último disponible].md`
- **Prioridad 3** (si trabaja en skills): `.github/skills/coworkia-memory/SKILL.md`

**Panel Derecho**: 
- **Chat activo** (siempre visible)

### 3. Saludo de Inicio de Sesión

Al abrir, el agente debe decir:

```
¡Hola Diego! 👋

📋 Plan de vuelo cargado: [nombre del archivo]
🧠 Memoria del proyecto cargada
🎯 Listo para trabajar

¿Continuamos donde lo dejamos o hay algo nuevo? 🚀
```

### 4. Verificación de Continuidad

Antes de empezar trabajo nuevo:
- ✅ Leer plan de vuelo actual
- ✅ Verificar últimos checkpoints
- ✅ Revisar pendientes del día anterior
- ✅ Preguntar si hay cambios de prioridad

### 5. Regla de Dos Archivos Siempre Visibles

**NUNCA** trabajar solo con el chat. **SIEMPRE** tener:
1. **Contexto escrito** (plan de vuelo o skill)
2. **Chat activo** para interacción

Esto permite:
- 📊 Ver progreso en tiempo real
- ✅ Marcar tareas completadas
- 🔄 Mantener contexto compartido
- 📝 Documentar mientras trabajamos

---
## 🎉 HITOS IMPORTANTES DEL PROYECTO

### 🚀 Primer Uso Exitoso de Autopilot - 20 Mar 2026

**CONTEXTO**: Primer vez que el agente trabaja 4.5 horas continuas de forma completamente autónoma, ejecutando un plan de vuelo sin intervención humana.

**OBJETIVO**: Completar el 70% faltante de Aluna (membresías) en una sesión

**ACTIVACIÓN**: Diego dijo "autopilot verde nena" después de presentar el plan

**RESULTADOS**:
- ✅ **3 bloques completados** en 4.5h (vs 7-8h estimado manual)
- ✅ **3 commits incrementales** (checkpoints cada ~1.5h)
- ✅ **20/20 tests exitosos** (2 test suites creados)
- ✅ **0 errores** de compilación o runtime
- ✅ **Arquitectura respetada** (siguió patrones existentes)

**BLOQUES IMPLEMENTADOS**:

1. **Client Response Tracking** (1h)
   - Columnas BD: `client_response_at`, `client_whatsapp_reply`
   - Función: `markAlunaClientResponse(userPhone, channel)`
   - Auto-tracking en webhook cuando prospecto responde
   - Test: 5/5 checks ✅

2. **Dashboard de Métricas** (2h)
   - Endpoint `/api/aluna/stats` ampliado con métricas de efectividad
   - 4 cards frontend: D+1 sent, D+3 sent, Response rate, Conversion rate
   - Auto-refresh cada 30s
   - Permite medir ROI del sistema automatizado

3. **High Intent Detection** (1.5h)
   - 45 keywords en 4 categorías (pricing, availability, commitment, urgency)
   - Auto-cambio status → `negotiating`
   - Notificación WhatsApp a Diego con contexto completo
   - Test: 15/15 casos ✅ (0 falsos positivos/negativos)

**LECCIONES APRENDIDAS**:

✅ **Lo que funcionó bien**:
- Plan de vuelo con bloques claros y tiempo estimado
- Tests antes de cada commit = alta confianza
- Checkpoints incrementales = fácil rollback
- Import dinámico con `await import()` evita dependencias circulares
- Try/catch no crítico = features nuevas no rompen flujo existente

⚠️ **Lo que mejorar**:
- `replace_string_in_file` falla con emojis corruptos → usar `sed` como backup
- Agregar notificación WhatsApp a Diego cuando autopilot termina
- Considerar +10% buffer en estimaciones de tiempo

**IMPACTO**: Aluna pasó de 30% → 100% funcional. Sistema completo end-to-end operativo.

**COMMITS**:
- `3f416d3` - BLOQUE 1/3: Tracking de respuestas Aluna
- `7d2eb6c` - BLOQUE 2/3: Dashboard de métricas Aluna
- `d14f1fa` - BLOQUE 3/3: High intent detection Aluna

---
### 🛡️ Sistema Anti-Fallos y Skills de Troubleshooting - 21 Mar 2026

**CONTEXTO**: Campaña fuerte al aire → sistema debe funcionar 24/7 sin supervisión. Necesidad de herramientas de diagnóstico y recuperación automática.

**OBJETIVO**: Estabilización completa con skills especializados, tests automatizados, y mejoras de productividad.

**ESTRATEGIA**: Plan de vuelo masivo de 7.5h dividido en 3 fases, ejecutado con autopilot.

**PLAN DE VUELO**: `plan-vuelo-21mar.md`

---

#### FASE 1: Skills de Troubleshooting (2.5h) ✅ COMPLETADA

**4 Skills Creados**:

1. **aurora-troubleshooting.md**
   - Diagnóstico de reservas que no se procesan
   - Webhooks perdidos, confirmaciones fallidas, emails no enviados
   - Flujo normal documentado con diagramas
   - Queries de debugging específicas
   - Comandos de recuperación rápida

2. **aluna-troubleshooting.md**
   - Diagnóstico de leads no capturados
   - Proformas que no se envían, follow-ups que fallan
   - Dashboard que no muestra datos
   - Keywords que no detectan
   - Test de high intent detection

3. **heroku-deployment.md**
   - Deploy standard y rollback rápido
   - Monitoreo de logs en tiempo real
   - Restart de dynos, configuración de env vars
   - Troubleshooting de builds, crashes, timeouts
   - Checklists pre/post-deploy

4. **database-queries.md**
   - Queries comunes para debugging y monitoreo
   - Reportes de reservas, leads, conversiones
   - Análisis de efectividad de follow-ups
   - Queries de limpieza y mantenimiento
   - Detección de datos corruptos

**VALOR AGREGADO**:
- ✅ Copilot tiene contexto especializado al trabajar en archivos relacionados
- ✅ Diego puede diagnosticar problemas rápidamente sin memoria humana
- ✅ Agente puede resolver fallos en producción sin intervención
- ✅ Documentación viva que evoluciona con el proyecto

**UBICACIÓN**: `.github/skills/[nombre-skill]/SKILL.md`

**INTEGRACIÓN**: Skills aparecen automáticamente en Copilot cuando trabajas en archivos que coinciden con `applyTo` patterns del frontmatter YAML.

---

#### FASE 2: Testing Automatizado (2h) ✅ COMPLETADA

**Objetivo**: Suite de tests end-to-end para Aurora y Aluna

**Tests implementados**:
- 6+ tests de integración Aurora (webhook → confirmación → email)
- 6+ tests de integración Aluna (keywords → proforma → follow-ups)
- Tests de high intent detection (45 keywords)
- Tests de client response tracking
- **Total**: 12 tests automatizados funcionando ✅

**Archivos creados**:
- `tests/aurora-integration.test.js`
- `tests/aluna-integration.test.js`

**Comando**: `npm test`

**Commit**: `5c16da2` - FASE 2: Tests integración (1858 líneas)

**Tiempo real**: ~30 min (estimado: 2h) - 4x más rápido

**Valor**: Cualquier cambio futuro se valida automáticamente antes de deploy.

---

#### FASE 3: Mejoras de Dashboard (3h) - PENDIENTE

**Funcionalidad planeada**:

1. **Botones de Acción Manual** (1.5h)
   - 4 botones por lead: 📱 D+1 WA | 📧 D+1 Email | 📱 D+3 WA | 📧 D+3 Email
   - Modal con template editable antes de enviar
   - Backup manual si automation falla

2. **Ventana de Creación de Campañas** (1.5h)
   - Editor de mensajes masivos
   - Filtros por status (pending, negotiating, etc)
   - Variables dinámicas: {{nombre}}, {{plan}}, {{email}}
   - Preview en tiempo real
   - Tabla `campaigns` en BD

**Valor**: Aumenta productividad de Diego, permite intervención humana rápida.

---

#### FASE 4: Sistema de Notificaciones (2h) - PLANEADA

**Objetivo**: Notificaciones proactivas a WhatsApp personal de Diego

**Casos de uso**:
- 🚨 High intent detectado → alerta inmediata
- 📊 Reporte diario 9am → resumen de leads/conversiones
- ⚠️ Error crítico → circuit breaker abierto, DB down
- ✅ Autopilot completó → resumen de tareas
- 🤔 Autopilot bloqueado → necesita decisión

**Implementación**: `notification-service.js` + cron jobs + health monitor

---

**IMPACTO TOTAL ESPERADO**:
- 🛡️ Sistema robusto 24/7 con auto-diagnóstico y recuperación
- 📊 Tests automáticos previenen regresiones
- 🚀 Dashboard más productivo con acciones manuales
- 📱 Monitoreo proactivo sin necesidad de abrir dashboard

**TIEMPO TOTAL**: ~7.5h (ejecutado con autopilot en sesiones paralelas)

**LECCIONES**:
- ✅ División de trabajo: Chat Control Tower (planifica) + Chat Autopilot (ejecuta)
- ✅ Planes masivos son viables con bloques bien definidos
- ✅ Skills permanentes > soluciones one-off

---## �📦 SETUP DEL PROYECTO

### Identidad del Sistema
- **Nombre**: Coworkia Agent (Aurora)
- **Tipo**: Sistema multi-agente para WhatsApp Business
- **Stack**: Node.js + Express + PostgreSQL + OpenAI GPT-4
- **Deployment**: Heroku (app: coworkia-agent)
- **WhatsApp**: Wassenger API
- **Base de datos**: PostgreSQL compartida (Heroku Postgres)

### Agentes del Ecosistema (8 total)
1. **AURORA** - Coordinadora central (coworking, reservas)
2. **ALUNA** - Membresías y planes recurrentes (coworking)
3. **GABI** - Legal, finanzas, compliance (GR Consulting)
4. **ENZO** - Marketing, publicidad, IA para negocios (MarketingLab)
5. **PAULA** - Bienes raíces Ecuador/RD (PropElite)
6. **AXEL** - Reparación vehicular + Vision AI (PaintBull)
7. **ANGELA** - Salud y bienestar (MedBeneficios)
8. **ADRIANA** - Seguros empresariales (SegPopular)

### Arquitectura de Handoffs

**Regla de Oro**: Solo AURORA y ALUNA son agentes de coworking. El resto son empresas externas.

**Consecuencia crítica**:
- ✅ **AURORA + ALUNA**: Reciben formularios de reserva, contexto de membresías, historial completo (15 mensajes)
- ❌ **EXTERNOS (otros 6)**: NO reciben formularios de coworking, historial reducido (8 mensajes)

**Tipos de handoff**:
1. `@mención` → handoff inmediato y prioritario (todos los agentes)
2. Keywords automáticas → AURORA ↔ ALUNA, AURORA → PAULA (sin menciones)
3. Sticky agents → una vez activo, se mantiene hasta nueva `@mención`

### Flujo de Mensaje Estándar

```
Usuario → WhatsApp → Wassenger Webhook
    ↓
wassenger.js (endpoints-api)
    ↓
orquestador.js (detección de intención)
    ↓
Agente especializado (prompt + contexto filtrado)
    ↓
Respuesta + handoff (si aplica)
    ↓
Persistencia BD + envío WhatsApp
```

---

## 🏗️ DECISIONES TÉCNICAS HISTÓRICAS

### ¿Por qué Architecture v2.0?

**Problema original (v1.0)**:
- Todos los agentes recibían TODO el contexto
- Agentes externos (Enzo, Gabi, Paula) procesaban datos de coworking que no necesitaban
- Tokens desperdiciados, respuestas lentas, confusión de contexto

**Solución implementada (v2.0 - Enero 2026)**:
- **Filtrado de contexto por grupo de agente**
- Historial separado: 15 msgs (coworking) vs 8 msgs (externos)
- Formularios persistentes en BD, NO en contexto de agentes externos
- Handoffs preservan datos sin contaminar contexto

### ¿Por qué No Tocar el Orquestador Sin Análisis?

**Lecciones históricas**:
- El orquestador (`orquestador.js`) es el cerebro del ecosistema
- Cambios sin análisis han causado:
  - **Bug de timing (v838)**: Adiós de Aurora llegaba DESPUÉS del delay de 7s
  - **Bug de formularios (v840)**: Form de ALUNA bloqueaba switch automático a AURORA
  - **Bug de keywords (v839)**: "sala de reuniones" activaba campaña ALUNA (falso positivo)

**Protocolo obligatorio**:
1. Leer código completo del archivo afectado
2. Identificar todas las dependencias
3. Presentar plan detallado → esperar "verde nena"
4. Ejecutar cambio
5. Testing exhaustivo en local ANTES de deploy

### ¿Por qué Prefijos en Códigos?

**Problema histórico**:
- Códigos genéricos (`RES-001`, `PRO-123`) no indicaban qué agente los generó
- Debugging complicado al buscar en logs
- Reportes confusos

**Solución (v925 - Mar 14, 2026)**:
- Sistema unificado en `code-generator.js`
- Prefijos específicos por agente:
  - `AUR-` → Aurora (reservas)
  - `ALU-` → Aluna (membresías)
  - `AXL-` → Axel (cotizaciones)
  - `ADR-` → Adriana (seguros)
  - `ENZ-` → Enzo (propuestas)
  - `PAU-` → Paula (bienes raíces)
  - `GAB-` → Gabi (consultoría)

**Migración DB**: 2 rows en `membership_leads` migrados de `PRO-` → `ALU-` (v928)

### ¿Por qué Boss Commands con OpenAI?

**Problema original**:
- Boss commands requerían sintaxis rígida: `GABI PROPUESTA Empresa XYZ | RUC 12345 | Giro Construcción`
- Diego tenía que recordar formato exacto
- 50% de comandos fallaban por sintaxis

**Solución (v841 - Mar 08, 2026)**:
- Parser NLP con OpenAI `gpt-4o`
- Detecta comandos en español natural: "manda propuesta de Gabi para Constructora ABC"
- Triggers ampliados: `manda`, `envía`, `propuesta`, `proforma`, `coti`, `para <Nombre>`
- Reducción de errores de 50% → 5%

### ¿Por qué BaseRepository.js?

**Problema histórico**:
- 236 líneas de código boilerplate duplicado en 4 repositorios (adriana, gabi, enzo, paula)
- Métodos `create`, `update`, `findById`, `findAll` idénticos
- Mantenimiento pesado: mismos fixes en 4 archivos

**Solución (v930 - Mar 14, 2026)**:
- `BaseRepository.js` centraliza operaciones CRUD genéricas
- Repositorios específicos heredan solo lógica especializada
- Reducción: -236 líneas, 1 lugar para fixes

---

## 🐛 PROBLEMAS RESUELTOS (NO REPETIR)

### Problema: `query()` en database.js Inexistente (v840)

**Síntoma**: Saves de `axel_quotes`, upserts de `collision_quotes` fallaban con "query is not a function"

**Causa**: `database.js` llamaba `databaseService.db.query()` que no existía

**Fix**: Cambiar a `databaseService.query()` directamente

**Lección**: Siempre verificar métodos exportados del módulo `database.js` antes de usar

### Problema: Columna `damage_analysis` No Existía en Producción (v842)

**Síntoma**: SELECT fallan con "column does not exist"

**Causa**: Schema local tenía columna, DB live no

**Fix**: 
```sql
ALTER TABLE collision_quotes 
ADD COLUMN IF NOT EXISTS damage_analysis JSONB;
```

**Lección**: Siempre verificar schema en producción antes de queries nuevas

### Problema: Keywords ALUNA Capturaban "sala de reuniones" (v839)

**Síntoma**: Usuarios preguntando por salas → activaban campaña de membresías (falso positivo)

**Causa**: Keyword `sala` también matchea "sala de reuniones" (contexto Aurora)

**Fix**: Refinar keywords + añadir lógica de contexto en orquestador

**Lección**: Keywords deben ser contextuales, no solo substring match

### Problema: Form de ALUNA Bloqueaba Handoff a AURORA (v842)

**Síntoma**: Usuario con form de ALUNA activo dice "hot desk" → no cambia a Aurora

**Causa**: Form persistente bloqueaba switch automático por keywords

**Fix**: Si detecta keyword de Aurora mientras ALUNA activa → limpiar form de ALUNA + caer al orquestador

**Lección**: Forms deben ser cancelables por keywords del agente opuesto

### Problema: Prospectos Sin Follow-up Programado

**Síntoma**: Leads de ALUNA no recibían follow-ups 24h/3d

**Causa**: `trackAlunaProspect()` no se llamaba tras enviar proforma

**Fix**: Ejecutar `trackAlunaProspect()` inmediatamente después de `sendAlunaProforma()`

**Lección**: Siempre trackear prospectos en el momento de interés, no después

---

## 👨‍💻 PREFERENCIAS DE DIEGO

### Workflow Preferido

1. **"Lupa antes que escalpelo"**: Leer todo el contexto ANTES de tocar código
2. **Un fix a la vez**: Presentar plan → esperar "verde nena" → ejecutar → verificar errores
3. **Commits frecuentes**: Cada feature o fix → commit inmediato con mensaje claro
4. **Testing SIEMPRE antes de deploy**: No hacer push a Heroku sin probar en local
5. **Sin tecnicismos en el plan**: Explicar en lenguaje humano, código solo tras aprobación

### Señales Clave

- **"verde nena"** = aprobación para ejecutar (GAS)
- **"desvío"** = problema inesperado encontrado → documentar en plan de vuelo
- **"botella"** = estamos estancados, necesita análisis profundo
- **"checkpoint"** = commit + actualizar plan de vuelo + resumen de avance

### Lo Que NO Hacer (Sin Excepción)

❌ **Refactorizar "de paso"** → Si funciona, no tocar
❌ **Auditar sin que lo pida** → Auditorías completas SOLO cuando Diego las solicita explícitamente
❌ **Tocar orquestador sin análisis profundo** → Es el cerebro, cambios causan efectos en cascada
❌ **Crear dead code** → Eliminar funciones obsoletas inmediatamente
❌ **Usar placeholders en emails** → Datos siempre reales, email de prueba `yo@diegovillota.com`

### Patrones de Comunicación Preferidos

✅ **Hacer**: "Detecté que X está duplicado. Propongo consolidar en Y. ¿Verde nena?"
❌ **No hacer**: "Voy a refactorizar todo el módulo para usar patrón singleton..."

✅ **Hacer**: "Encontré 3 funciones obsoletas. ¿Las elimino?"
❌ **No hacer**: *[Elimina código sin preguntar]*

✅ **Hacer**: "Completé F1.1 y F1.2. Checkpoint: v922 commited. ¿Continúo con F2?"
❌ **No hacer**: *[Trabaja en silencio 2 horas sin updates]*

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### Features en Producción (✅ LIVE)

#### Aurora (Reservas)
- ✅ Formulario de reserva completo
- ✅ Confirmaciones con timeout (30 min)
- ✅ Emails de confirmación con QR
- ✅ Procesamiento de pagos
- ✅ Follow-ups automáticos (día anterior, 5pm)
- ✅ Códigos con prefijo `AUR-`

#### Aluna (Membresías)
- ✅ Captura automática por keywords (`plan`, `membresía`, `mensual`, `oficina`, `cowork`)
- ✅ Formulario de membresía
- ✅ Proformas automáticas por email
- ✅ Follow-ups 24h (D+1) y 3 días (D+3)
- ✅ Dashboard con tracking de automatizaciones
- ✅ Códigos con prefijo `ALU-`
- ✅ Recordatorios de renovación (día 25 y día 30)

#### Axel (Reparación Vehicular)
- ✅ Análisis de fotos con Vision AI
- ✅ Collector de fotos con timeout
- ✅ Cotizaciones automáticas
- ✅ System message handling
- ✅ Emails con fotos embebidas (CID)
- ✅ Footer correcto en emails

#### Otros Agentes
- ✅ ENZO: Boss commands con OpenAI parser, emails con logo real
- ✅ ADRIANA: Cotizaciones de seguros estructuradas
- ✅ GABI: Consultoría legal/financiera
- ✅ PAULA: Bienes raíces con handoff automático por keywords
- ✅ ANGELA: Salud y bienestar

#### Infraestructura
- ✅ Orquestador con handoffs bidireccionales
- ✅ Sistema de formularios persistentes
- ✅ Memoria conversacional (15 msgs coworking / 8 msgs externos)
- ✅ Rate limiting
- ✅ Deduplicación de mensajes
- ✅ Circuit breakers para OpenAI y Wassenger
- ✅ Manejo de idiomas (español, inglés, portugués)
- ✅ Boss commands para todos los agentes
- ✅ BaseRepository para código DRY
- ✅ date-time-parser.js centralizado (timezone Ecuador)
- ✅ code-generator.js con prefijos por agente

### Features Pendientes (🔵 BACKLOG)

#### Dashboard Aluna (Pausado - Campaña al Aire)
- 🔵 Botones de acción manual (enviar D+1, D+3 on-demand)
- 🔵 Modal de campañas con templates editables
- 🔵 Filtros avanzados por status
- 🔵 Exportación a CSV

#### Axel v2 (En Diseño)
- 🔵 CTAs persuasivos en emails
- 🔵 Agendamiento de calendario Coworkia
- 🔵 Recordatorios automáticos de citas

#### Mejoras Generales (Ideas)
- 🔵 Webhooks de pago (confirmación automática sin mensaje)
- 🔵 Integración con calendario Google
- 🔵 Sistema de campañas programadas
- 🔵 Analytics dashboard (métricas de conversión)

### Versión Actual
**v930** (14 Mar 2026)

**Último trabajo completado**:
- F5: BaseRepository.js refactoring (-236 líneas)
- F4: date-time-parser.js centralizado
- F3: code-generator.js con prefijos AUR/ALU/AXL/etc
- DEV1: Fixes Axel (system message, secuencial, footer)

---

## 📚 UBICACIÓN DE ARCHIVOS CLAVE

### Orquestación
- `src/deteccion-intenciones/orquestador.js` - Cerebro del ecosistema
- `src/deteccion-intenciones/detectar-intencion.js` - Clasificación de intenciones
- `src/deteccion-intenciones/intent-resolver-v2.js` - Resolución avanzada
- `src/deteccion-intenciones/handoff-manager.js` - Gestión de handoffs

### Agentes
- `src/deteccion-intenciones/aurora.js` - Coordinadora central
- `src/deteccion-intenciones/aluna.js` - Membresías
- `src/deteccion-intenciones/enzo.js` - Marketing
- `src/deteccion-intenciones/gabi.js` - Legal/finanzas
- `src/deteccion-intenciones/paula.js` - Bienes raíces
- `src/deteccion-intenciones/axel.js` - Reparación vehicular
- `src/deteccion-intenciones/angela.js` - Salud
- `src/deteccion-intenciones/adriana.js` - Seguros

### Servicios Críticos
- `src/servicios/partial-reservation-form.js` - Form de reservas Aurora
- `src/servicios/membership-form.js` - Form de membresías Aluna
- `src/servicios/reservation-state.js` - Estado de confirmaciones
- `src/servicios/aluna-proforma-email.js` - Envío de proformas
- `src/servicios/confirmation-flow.js` - Flujo de confirmación genérico

### Base de Datos
- `src/database/database.js` - Conexión y operaciones BD
- `src/database/reservationRepository.js` - Repositorio de reservas
- `src/database/alunaRepository.js` - Repositorio de Aluna
- `src/database/BaseRepository.js` - CRUD genérico
- `src/database/postgres-adapter.js` - Adapter y migraciones

### Utilities
- `src/utils/code-generator.js` - Generación de códigos con prefijos
- `src/utils/date-time-parser.js` - Parsing de fechas (timezone Ecuador)
- `src/servicios-ia/email-ecosystem.js` - Tabla de ecosistema en emails
- `src/servicios-ia/generic-email-templates.js` - Templates HTML de emails

### Endpoints
- `src/express-servidor/endpoints-api/wassenger.js` - Webhook principal de WhatsApp
- `src/express-servidor/endpoints-api/aluna-dashboard.js` - API del dashboard Aluna
- `src/express-servidor/endpoints-api/aurora-dashboard.js` - API del dashboard Aurora

### Frontend
- `public/aurora-reservas.html` - Dashboard de reservas
- `public/aluna-proformas.html` - Dashboard de membresías
- `public/js/aurora-dashboard.js` - Lógica dashboard Aurora
- `public/js/aluna-dashboard.js` - Lógica dashboard Aluna

### Documentación
- `reglas_multiagente.md` - Reglas del ecosistema (leer SIEMPRE primero)
- `documentacion/ARQUITECTURA-MULTIAGENTE-V2.md` - Arquitectura detallada
- `planes-de-vuelo/plan-vuelo-[fecha].md` - Planes diarios de trabajo

### Skills
- `.github/skills/aurora-troubleshooting/SKILL.md` - Debug Aurora
- `.github/skills/aluna-troubleshooting/SKILL.md` - Debug Aluna
- `.github/skills/database-queries/SKILL.md` - Queries SQL comunes
- `.github/skills/heroku-deployment/SKILL.md` - Deploy y rollback

---

## 🔄 SISTEMA DE ACTUALIZACIÓN

### Cuándo Actualizar Este Skill

Este skill debe actualizarse en los siguientes casos:

1. **Nueva decisión técnica importante**
   - Ejemplo: "Decidimos usar Redis para caché" → Añadir a "Decisiones Técnicas"

2. **Problema resuelto que podría repetirse**
   - Ejemplo: "Bug de timezone en follow-ups" → Añadir a "Problemas Resueltos"

3. **Cambio arquitectónico significativo**
   - Ejemplo: "Migramos a v3.0 con microservicios" → Actualizar "Setup del Proyecto"

4. **Nueva feature en producción**
   - Ejemplo: "Aluna ahora tiene A/B testing" → Añadir a "Estado Actual"

5. **Nueva preferencia de Diego identificada**
   - Ejemplo: "Diego prefiere testing con usuarios reales antes de seed data" → Añadir a "Preferencias"

### Protocolo de Actualización

```markdown
## [Fecha] - [Título del Cambio]

**Contexto**: [Por qué se hizo el cambio]

**Cambio**: [Qué se modificó exactamente]

**Impacto**: [Qué afecta este cambio]

**Ubicación en proyecto**: [Archivos modificados]
```

### Resumen de Sesión (Template)

Al final de cada sesión de trabajo, añadir un resumen rápido:

```markdown
---

## 📝 Última Sesión: [Fecha]

**Trabajo completado**:
- [Item 1]
- [Item 2]

**Decisiones tomadas**:
- [Decisión 1]
- [Decisión 2]

**Próximos pasos sugeridos**:
- [Paso 1]
- [Paso 2]

**Estado emocional del proyecto**: 🟢 Verde / 🟡 Amarillo / 🔴 Rojo

---
```

---

## 🚀 CÓMO USAR ESTE SKILL

### Al Inicio de Cada Sesión

1. **Lee este skill COMPLETO** (toma 2-3 minutos)
2. Lee `reglas_multiagente.md` (1 minuto)
3. Lee el último `plan-vuelo-[fecha].md` (1 minuto)
4. Ya tienes contexto total → listo para trabajar

### Durante el Trabajo

- Consulta "Decisiones Técnicas" antes de proponer cambios arquitectónicos
- Revisa "Problemas Resueltos" antes de debuggear (puede estar resuelto)
- Verifica "Preferencias de Diego" antes de actuar autónomamente
- Usa "Ubicación de Archivos" para saber dónde está cada cosa

### Al Final de la Sesión

1. Actualiza este skill si hubo decisiones importantes
2. Añade resumen de sesión
3. Commit con mensaje: `docs: update coworkia-memory [fecha]`

---

## ✅ CHECKLIST DE INICIACIÓN

Cuando un nuevo agente (o Diego en una nueva sesión) arranca:

- [ ] Leí `coworkia-memory.md` completo
- [ ] Leí `reglas_multiagente.md`
- [ ] Leí el último plan de vuelo
- [ ] Verifiqué el estado actual del proyecto
- [ ] Revisé preferencias de Diego
- [ ] Estoy listo para trabajar sin hacer preguntas básicas

---

**Última actualización**: 20 Mar 2026
**Versión proyecto**: v930
**Próxima auditoría sugerida**: 27 Mar 2026 (1 semana)
