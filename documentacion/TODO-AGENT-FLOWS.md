# 🎯 TODO: FLOWS COMPLETOS PARA TODOS LOS AGENTES
# Fecha: 2026-01-15
# Objetivo: Garantizar que Adriana, Aluna, Axel, Enzo y Tomi tengan flows IMPECABLES como Aurora

## 📋 ESTADO ACTUAL

### ✅ AURORA (REFERENCIA - COMPLETO)
- [x] Detección de intención y datos completos
- [x] Formulario inteligente (partial-reservation-form.js)
- [x] Confirmación por SI/NO
- [x] Creación de reserva en PostgreSQL
- [x] Email de confirmación con reintentos
- [x] Google Calendar event creation
- [x] Manejo de primera visita GRATIS
- [x] Validación de disponibilidad Hot Desk
- [x] Timezone Ecuador correcto en todos los helpers

---

## 🚨 PRIORIDAD ALTA - FLOWS CRÍTICOS

### 1. ADRIANA (Seguros - SegPopular)
**Status:** ⚠️ INCOMPLETO - Solo conversacional, sin flow transaccional

**Necesita implementar:**
- [ ] **Detección de tipo de seguro** (auto, salud, vida, hogar)
- [ ] **Formulario de datos del cliente:**
  - Nombre completo
  - Cédula/RUC
  - Email
  - Teléfono
  - Tipo de seguro solicitado
  - Datos específicos según tipo (ej: modelo auto, edad para salud)
- [ ] **Confirmación de solicitud:** "¿Confirmas estos datos? Responde SI"
- [ ] **Creación de lead en DB** (nueva tabla: insurance_leads)
- [ ] **Email a Adriana (agente humano)** con datos del cliente
- [ ] **Google Calendar event** para seguimiento (reminder en 24h)
- [ ] **Email al cliente** confirmando recepción y tiempo de respuesta

**Archivos a modificar:**
- `src/deteccion-intenciones/adriana.js` - Actualizar system prompt
- `src/servicios/insurance-form.js` - NUEVO: Formulario inteligente
- `src/servicios/insurance-confirmation.js` - NUEVO: Flow de confirmación
- `src/database/postgres-adapter.js` - Agregar tabla insurance_leads

**Prioridad:** 🔴 ALTA - Adriana es uno de los servicios principales del ecosistema

---

### 2. AXEL (Colisiones - PaintBull)
**Status:** ⚠️ PARCIAL - Tiene cotización pero sin persistencia ni calendar

**Necesita implementar:**
- [ ] **Mejorar detección de daños** (rayones, abolladuras, pintura, etc)
- [ ] **Formulario de cotización:**
  - Nombre completo
  - Email
  - Teléfono
  - Marca/modelo vehículo
  - Año
  - Descripción de daños
  - Fotos (links de WhatsApp)
- [ ] **Confirmación de solicitud:** "¿Confirmas que quieres la cotización? SI"
- [ ] **Guardar cotización en DB** (nueva tabla: collision_quotes)
- [ ] **Email a Axel (agente humano)** con datos + fotos
- [ ] **Google Calendar event** para inspección (sugerir horarios)
- [ ] **Email al cliente** con próximos pasos

**Archivos a modificar:**
- `src/deteccion-intenciones/axel.js` - Actualizar system prompt
- `src/servicios/collision-form.js` - NUEVO: Formulario inteligente
- `src/servicios/collision-confirmation.js` - NUEVO: Flow de confirmación
- `src/database/postgres-adapter.js` - Agregar tabla collision_quotes

**Adicional específico de Axel:**
- [ ] **Integración con sistema de cotización existente** (si existe API PaintBull)
- [ ] **Manejo de múltiples fotos** de WhatsApp

**Prioridad:** 🟠 MEDIA-ALTA - Axel ya tiene lógica de cotización, falta persistencia

---

### 3. ENZO (Marketing - MarketingLab)
**Status:** ⚠️ INCOMPLETO - Solo conversacional, sin flow transaccional

**Necesita implementar:**
- [ ] **Detección de tipo de proyecto:**
  - Campaña Meta/Google Ads
  - Automatización con IA
  - Software a medida
  - Estrategia digital
  - Sistema de agentes (como Aurora)
- [ ] **Formulario de proyecto:**
  - Nombre completo
  - Empresa
  - Email
  - Teléfono
  - Tipo de proyecto
  - Presupuesto aproximado
  - Descripción del reto/objetivo
  - Urgencia (ASAP, 1 semana, 1 mes, flexible)
- [ ] **Confirmación de solicitud:** "¿Agendamos una reunión? SI"
- [ ] **Guardar lead en DB** (nueva tabla: marketing_leads)
- [ ] **Email a Enzo (agente humano)** con datos del proyecto
- [ ] **Google Calendar event** para reunión inicial (ofrecer slots)
- [ ] **Email al cliente** confirmando reunión + preparación

**Archivos a modificar:**
- `src/deteccion-intenciones/enzo.js` - Actualizar system prompt
- `src/servicios/marketing-form.js` - NUEVO: Formulario inteligente
- `src/servicios/marketing-confirmation.js` - NUEVO: Flow de confirmación
- `src/database/postgres-adapter.js` - Agregar tabla marketing_leads

**Prioridad:** 🟠 MEDIA - Enzo es estratégico pero menos urgente

---

### 4. TOMI (Real Estate - PropElite)
**Status:** ⚠️ INCOMPLETO - Solo conversacional, sin flow transaccional

**Necesita implementar:**
- [ ] **Detección de tipo de búsqueda:**
  - Compra (departamento, casa, local, terreno)
  - Venta (tasación)
  - Arriendo
- [ ] **Formulario de búsqueda:**
  - Nombre completo
  - Email
  - Teléfono
  - Tipo de operación (compra/venta/arriendo)
  - Tipo de propiedad (depa, casa, local, terreno)
  - Presupuesto/rango de precio
  - Zona/sector preferido
  - Características (dormitorios, m², amenidades)
- [ ] **Confirmación de búsqueda:** "¿Quieres que busque opciones? SI"
- [ ] **Guardar lead en DB** (nueva tabla: real_estate_leads)
- [ ] **Email a Tomi (agente humano)** con perfil del cliente
- [ ] **Google Calendar event** para llamada/visita (ofrecer slots)
- [ ] **Email al cliente** con próximos pasos

**Adicional específico de Tomi:**
- [ ] **Sistema de comparación de propiedades** del mismo constructor
  - Tabla: property_comparisons
  - Guardar criterios de comparación
  - Generar reporte comparativo
- [ ] **Integración con API de propiedades** (si existe)

**Archivos a modificar:**
- `src/deteccion-intenciones/tomi.js` - Actualizar system prompt
- `src/servicios/realestate-form.js` - NUEVO: Formulario inteligente
- `src/servicios/realestate-confirmation.js` - NUEVO: Flow de confirmación
- `src/servicios/property-comparison.js` - NUEVO: Comparador de propiedades
- `src/database/postgres-adapter.js` - Agregar tablas real_estate_leads, property_comparisons

**Prioridad:** 🟠 MEDIA - Tomi recién se agregó a lista pública

---

### 5. ALUNA (Membresías - Interno)
**Status:** ⚠️ INCOMPLETO - Solo informativo, sin flow de venta

**Necesita implementar:**
- [ ] **Detección de tipo de membresía:**
  - Hot Desk mensual
  - Oficina privada
  - Sala de reuniones recurrente
  - Virtual office
- [ ] **Formulario de membresía:**
  - Nombre completo
  - Email
  - Teléfono
  - Tipo de membresía deseada
  - Fecha inicio preferida
  - Necesidades especiales
- [ ] **Confirmación de interés:** "¿Agendamos una visita? SI"
- [ ] **Guardar lead en DB** (nueva tabla: membership_leads)
- [ ] **Email a admin Coworkia** con datos del prospecto
- [ ] **Google Calendar event** para tour + presentación (ofrecer slots)
- [ ] **Email al cliente** confirmando visita

**Archivos a modificar:**
- `src/deteccion-intenciones/aluna.js` - Actualizar system prompt
- `src/servicios/membership-form.js` - NUEVO: Formulario inteligente
- `src/servicios/membership-confirmation.js` - NUEVO: Flow de confirmación
- `src/database/postgres-adapter.js` - Agregar tabla membership_leads

**Prioridad:** 🟡 MEDIA-BAJA - Aluna es uso interno, menos prioritario

---

## 🏗️ INFRAESTRUCTURA COMPARTIDA A CREAR

### A. Sistema de Formularios Genérico
**Archivo:** `src/servicios/generic-form-handler.js`

**Funcionalidades:**
- Detección incremental de campos
- Validación de datos (email, teléfono, etc)
- Persistencia en pending_confirmations
- Manejo de campos opcionales vs obligatorios
- Timeout de formularios (expiración)

### B. Sistema de Confirmación Genérico
**Archivo:** `src/servicios/generic-confirmation-flow.js`

**Funcionalidades:**
- Proceso SI/NO universal
- Creación de registros en DB
- Email con reintentos (usando runWithRetry)
- Calendar event creation
- Limpieza de pending data
- Mensajes de éxito/error

### C. Tablas de Base de Datos
**Archivo:** `src/database/postgres-adapter.js`

**Nuevas tablas necesarias:**
```sql
-- Leads de seguros (Adriana)
CREATE TABLE insurance_leads (
  id TEXT PRIMARY KEY,
  user_phone TEXT NOT NULL,
  insurance_type TEXT NOT NULL,
  client_name TEXT,
  email TEXT,
  cedula TEXT,
  specific_data TEXT, -- JSON con datos específicos
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cotizaciones de colisiones (Axel)
CREATE TABLE collision_quotes (
  id TEXT PRIMARY KEY,
  user_phone TEXT NOT NULL,
  client_name TEXT,
  email TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  damage_description TEXT,
  photo_urls TEXT, -- JSON array
  quote_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads de marketing (Enzo)
CREATE TABLE marketing_leads (
  id TEXT PRIMARY KEY,
  user_phone TEXT NOT NULL,
  client_name TEXT,
  company TEXT,
  email TEXT,
  project_type TEXT,
  budget_range TEXT,
  description TEXT,
  urgency TEXT,
  meeting_scheduled TIMESTAMP,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads de real estate (Tomi)
CREATE TABLE real_estate_leads (
  id TEXT PRIMARY KEY,
  user_phone TEXT NOT NULL,
  client_name TEXT,
  email TEXT,
  operation_type TEXT, -- compra/venta/arriendo
  property_type TEXT,
  budget_range TEXT,
  preferred_zone TEXT,
  requirements TEXT, -- JSON
  visit_scheduled TIMESTAMP,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comparaciones de propiedades (Tomi)
CREATE TABLE property_comparisons (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES real_estate_leads(id),
  constructor_name TEXT,
  properties_data TEXT, -- JSON array
  comparison_criteria TEXT, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads de membresías (Aluna)
CREATE TABLE membership_leads (
  id TEXT PRIMARY KEY,
  user_phone TEXT NOT NULL,
  client_name TEXT,
  email TEXT,
  membership_type TEXT,
  start_date DATE,
  special_requirements TEXT,
  tour_scheduled TIMESTAMP,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📅 PLAN DE IMPLEMENTACIÓN

### FASE 1 - INFRAESTRUCTURA (1-2 días)
1. [ ] Crear `generic-form-handler.js`
2. [ ] Crear `generic-confirmation-flow.js`
3. [ ] Agregar todas las tablas nuevas a postgres-adapter.js
4. [ ] Crear `generic-email-templates.js` para emails de cada agente
5. [ ] Testing de infraestructura

### FASE 2 - ADRIANA (1 día)
1. [ ] Implementar insurance-form.js
2. [ ] Implementar insurance-confirmation.js
3. [ ] Actualizar adriana.js con nuevo system prompt
4. [ ] Testing E2E de Adriana
5. [ ] Deploy y validación

### FASE 3 - AXEL (1 día)
1. [ ] Implementar collision-form.js
2. [ ] Implementar collision-confirmation.js
3. [ ] Actualizar axel.js con nuevo system prompt
4. [ ] Testing E2E de Axel
5. [ ] Deploy y validación

### FASE 4 - ENZO (1 día)
1. [ ] Implementar marketing-form.js
2. [ ] Implementar marketing-confirmation.js
3. [ ] Actualizar enzo.js con nuevo system prompt
4. [ ] Testing E2E de Enzo
5. [ ] Deploy y validación

### FASE 5 - TOMI (1-2 días)
1. [ ] Implementar realestate-form.js
2. [ ] Implementar realestate-confirmation.js
3. [ ] Implementar property-comparison.js
4. [ ] Actualizar tomi.js con nuevo system prompt
5. [ ] Testing E2E de Tomi
6. [ ] Deploy y validación

### FASE 6 - ALUNA (1 día)
1. [ ] Implementar membership-form.js
2. [ ] Implementar membership-confirmation.js
3. [ ] Actualizar aluna.js con nuevo system prompt
4. [ ] Testing E2E de Aluna
5. [ ] Deploy y validación

---

## ✅ CHECKLIST DE CALIDAD POR AGENTE

Cada agente debe cumplir:

- [ ] **Formulario inteligente** que detecta datos incrementalmente
- [ ] **Validación de datos** (email formato correcto, teléfono válido, etc)
- [ ] **Persistencia en DB** con tabla específica
- [ ] **Confirmación SI/NO** antes de procesar
- [ ] **Email al agente humano** con datos completos
- [ ] **Email al cliente** confirmando recepción
- [ ] **Google Calendar event** para seguimiento/reunión
- [ ] **Manejo de timezone** Ecuador correcto
- [ ] **Retry logic** en emails y calendar (3 intentos)
- [ ] **Mensajes de éxito** claros al usuario
- [ ] **Mensajes de error** informativos
- [ ] **Testing manual** completo (checklist como Aurora)
- [ ] **Logs detallados** para debugging

---

## 🎯 MÉTRICAS DE ÉXITO

### Conversión
- % de formularios iniciados que se completan
- % de confirmaciones SI vs NO
- % de emails enviados exitosamente
- % de calendar events creados

### Calidad
- Tiempo promedio de completar formulario
- % de datos válidos (email, teléfono)
- % de leads que resultan en cierre

### Técnicas
- Uptime del sistema
- Tasa de error en emails
- Tasa de error en calendar
- Tiempo de respuesta de AI

---

## 📝 NOTAS IMPORTANTES

1. **Reutilizar código de Aurora:**
   - `partial-reservation-form.js` es el modelo
   - `confirmation-flow.js` es el modelo
   - `notification-helper.js` ya tiene retry logic
   - `google-calendar.js` ya funciona correctamente

2. **Timezone Ecuador en TODO:**
   - Usar `Intl.DateTimeFormat` con `timeZone: 'America/Guayaquil'`
   - Offset explícito `-05:00` en ISO strings

3. **Snake_case en DB, camelCase en JS:**
   - Cuidado con mapeo de campos
   - Usar conversión consistente

4. **Testing exhaustivo:**
   - Crear script manual como `TEST-E2E-MANUAL.sh` para cada agente
   - Probar casos felices y casos error
   - Validar emails y calendar events reales

5. **Documentación:**
   - Cada nuevo archivo debe tener JSDoc
   - System prompts deben estar bien documentados
   - README de cada agente con ejemplos

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. **Revisar esta lista con el equipo**
2. **Priorizar agentes según urgencia de negocio**
3. **Asignar recursos** (desarrolladores)
4. **Definir sprints** (recomendación: 1 agente por sprint)
5. **Empezar con Adriana** (es el que más urge después de Aurora)

---

**Última actualización:** 2026-01-15 20:25 GMT-5
**Responsable:** Diego Villota
**Status:** 📋 TODO List creada, pendiente inicio de implementación
