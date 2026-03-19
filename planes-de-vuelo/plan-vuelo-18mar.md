# ✈️ Plan de Vuelo - 18 de Marzo 2026

## 🎯 Objetivo Principal
Captura automática en tiempo real de leads de Aluna via keywords en Wassenger + Dashboard mejorado

---

## ✅ Completado Hoy

### 1. Dashboard Aluna Mejorado
- **Qué**: Rediseño del dashboard para presentación
- **Implementación**:
  - ❌ Columna Email removida (oculta)
  - ✅ Nueva columna: # (número de fila)
  - ✅ Nueva columna: Automatizaciones (muestra D+1, D+3 con estado)
  - ✅ Nueva columna: Último Contacto (color-coded: 🟢 hoy, 🟡 3d, 🔴 >12d)
  - ✅ Nueva columna: Interacción Cliente (📱 WhatsApp, 📧 Email, "Sin respuesta")
- **Archivos**:
  - `public/aluna-proformas.html` - HTML del dashboard
  - `public/js/aluna-dashboard.js` - Funciones de renderizado mejoradas
- **Estado**: ✅ Deployado a Heroku

### 2. Captura Automática de Leads en Tiempo Real
- **Qué**: Sistema que detecta keywords y crea leads automáticamente
- **Keywords**: plan, membresía, mensual, oficina, cowork
- **Implementación**:
  - ✅ Nueva función `captureAlunaLeadFromKeywords()` en `alunaRepository.js`
  - ✅ Integración en webhook de Wassenger (línea ~2072)
  - ✅ Crea lead en `membership_leads` automáticamente
  - ✅ Si ya existe, actualiza `last_interaction_at`
  - ✅ Genera ID único: `ML-WS-{timestamp}-{random}`
- **Archivos**:
  - `src/database/alunaRepository.js` - Nueva función de captura
  - `src/express-servidor/endpoints-api/wassenger.js` - Llamada en webhook
- **Estado**: ✅ Deployado a Heroku

### 3. Schema de Base de Datos Actualizado
- **Nuevos campos en `membership_leads`**:
  - `automation_d1_sent` BOOLEAN
  - `automation_d3_sent` BOOLEAN
  - `followup_24h_sent_at` TIMESTAMP
  - `followup_3d_sent_at` TIMESTAMP
  - `last_interaction_at` TIMESTAMP
  - `client_response_at` TIMESTAMP
  - `client_whatsapp_reply` BOOLEAN
  - `client_email_reply` BOOLEAN
- **Archivo**: `src/database/postgres-adapter.js`
- **Estado**: ✅ Migrations correrán automáticamente en Heroku

### 4. Limpieza de Código
- ❌ Eliminado `wassenger-sync.js` (no lo necesitamos, usamos tiempo real)
- ✅ Eliminadas rutas no utilizadas en `index.js`

---

## ⏳ Pendiente para Mañana

### PRIORIDAD 1: Botones de Acción Manual
**Objetivo**: Dashboard permita enviar mensajes manualmente

#### A implementar:
1. **Botones por fila en dashboard**:
   ```html
   📱 D+1 WhatsApp | 📧 D+1 Email | 📱 D+3 WhatsApp | 📧 D+3 Email
   ```
2. **Estados de botones**:
   - Habilitado: verde, clickeable
   - Deshabilitado: gris (si ya se envió)
3. **Modal al clickear**:
   - Mostrar template del mensaje
   - Permitir editar antes de enviar
   - Variables: {{nombre}}, {{plan}}, {{mensualidad}}
   - Botón "Enviar" y "Cancelar"
4. **Backend endpoints**:
   - `POST /api/aluna/send-d1-whatsapp`
   - `POST /api/aluna/send-d1-email`
   - `POST /api/aluna/send-d3-whatsapp`
   - `POST /api/aluna/send-d3-email`
5. **Actualizar estado**:
   - Marcar `automation_d1_sent` = true
   - Guardar timestamp en `followup_24h_sent_at`

**Archivos a modificar**:
- `public/aluna-proformas.html` (agregar botones en tabla)
- `public/js/aluna-dashboard.js` (modal + fetch)
- `src/express-servidor/endpoints-api/aluna-dashboard.js` (nuevos endpoints)

**Estimado**: 2-3 horas

---

### PRIORIDAD 2: Ventana de Creación de Campañas
**Objetivo**: Poder crear mensajes/campañas desde el dashboard

#### A implementar:
1. **Botón en dashboard**: `+ Crear Campaña`
2. **Modal con**:
   - 📋 Nombre de campaña
   - 🎯 Filtro de audiencia (por status: new, negotiating, etc)
   - 📝 Editor de mensaje (textarea)
   - 🔤 Variables disponibles: {{nombre}}, {{plan}}, {{email}}, {{phone}}
   - 👁️ Preview del mensaje
   - ⏰ Enviar ahora / Programar
3. **Backend**:
   - Nueva tabla: `campaigns` (id, name, message_template, target_filter, created_at, status)
   - Endpoint: `POST /api/aluna/campaigns/create`
   - Endpoint: `POST /api/aluna/campaigns/send`
4. **Funcionalidad**:
   - Validar que mensaje tenga variables correctas
   - Mostrar preview con datos reales de un lead
   - Guardar campaña en DB
   - Enviar inmediatamente o programar

**Archivos a crear/modificar**:
- `public/aluna-proformas.html` (agregar modal de campaña)
- `public/js/aluna-dashboard.js` (funciones de campaña)
- `src/express-servidor/endpoints-api/aluna-dashboard.js` (endpoints)
- `src/database/postgres-adapter.js` (nueva tabla campaigns)

**Estimado**: 3-4 horas

---

### PRIORIDAD 3: Templates de Mensajes Editables
**Objetivo**: Los mensajes automáticos (D+1, D+3) deben ser editables

#### A implementar:
1. **Página de configuración**: `/admin/aluna-settings`
2. **Templates**:
   - D+1 WhatsApp (español)
   - D+1 Email (asunto + cuerpo HTML)
   - D+3 WhatsApp (español)
   - D+3 Email (asunto + cuerpo HTML)
3. **Editor**:
   - Textarea con preview en tiempo real
   - Variables disponibles claramente mostradas
   - Botón "Guardar" y "Restaurar por defecto"
4. **Backend**:
   - Nueva tabla: `message_templates` (id, type, channel, language, subject, body, created_at)
   - Endpoint: `GET /api/aluna/templates`
   - Endpoint: `PUT /api/aluna/templates/:id`
5. **Integración**:
   - Modificar `follow-up-service.js` para leer templates de DB
   - Fallback a templates por defecto si no hay en DB

**Archivos a crear/modificar**:
- `public/admin/aluna-settings.html` (nueva página)
- `src/express-servidor/endpoints-api/aluna-dashboard.js` (endpoints)
- `src/database/postgres-adapter.js` (nueva tabla)
- `src/servicios/follow-up-service.js` (leer templates de DB)

**Estimado**: 2-3 horas

---

## 📝 Notas Técnicas

### Captura en Tiempo Real - Cómo Funciona
```javascript
// Webhook de Wassenger recibe mensaje
// → webhook detecta keywords: plan, membresía, mensual, oficina, cowork
// → llama a captureAlunaLeadFromKeywords(userId, userName, messageText)
// → crea lead en membership_leads con status='pending'
// → aparece inmediatamente en dashboard
```

### Dashboard - Nuevas Columnas
```javascript
// Automatizaciones: getAutomationStatus()
// → Lee automation_d1_sent, automation_d3_sent
// → Muestra: "✓ D+1 ○ D+3" (verde si enviado, gris si no)

// Último Contacto: getTimeSinceLastContact()
// → Lee last_interaction_at
// → Muestra: "🟢 Hoy" / "🟡 Hace 3d" / "🔴 Hace 12d"

// Interacción Cliente: getClientInteraction()
// → Lee client_whatsapp_reply, client_email_reply
// → Muestra: "📱 WhatsApp" / "📧 Email" / "Sin respuesta"
```

### API de Wassenger - Limitaciones
- ❌ No tiene endpoint público para mensajes históricos
- ✅ Solo funciona con webhooks en tiempo real
- 💡 Solución: Capturar desde ahora en adelante

---

## 🚀 Deployment Status

### Heroku
- **App**: coworkia-agent
- **URL**: https://coworkia-agent-e97d15dac56f.herokuapp.com/aluna-proformas.html
- **Versión**: v977 (estimado, en deploy ahora)
- **Cambios deployados**:
  1. Dashboard mejorado (sin email, con nuevas columnas)
  2. Captura automática de keywords
  3. Schema updates (migrations automáticas)

### Localhost
- **Puerto**: 3000
- **Status**: Servidor corriendo (PID 43374)
- **Sync**: Todos los cambios sincronizados con Heroku

---

## 🐛 Issues Conocidos
- Ninguno reportado

---

## 📊 Métricas
- **Commits hoy**: 1 (`feat(aluna): Dashboard mejorado + captura automática`)
- **Archivos modificados**: 6
- **Líneas agregadas**: +292
- **Líneas eliminadas**: -15
- **Nuevas funciones**: 5 (getDetailedStatusBadge, getAutomationStatus, getTimeSinceLastContact, getClientInteraction, captureAlunaLeadFromKeywords)

---

## ✈️ Próximo Vuelo: 19 de Marzo
**Tareas**: Botones de acción manual + Modal de campañas + Templates editables
**Objetivo**: Dashboard 100% funcional para venta y gestión de leads
