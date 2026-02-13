# 🏗️ Arquitectura Multi-Agente Coworkia v2.0

**Fecha:** Enero 2026  
**Versión:** 2.0 (Post-refactoring arquitectónico)

---

## 📖 Índice

1. [Visión General](#visión-general)
2. [Agentes del Ecosistema](#agentes-del-ecosistema)
3. [Flujo de Comunicación](#flujo-de-comunicación)
4. [Sistema de Memoria](#sistema-de-memoria)
5. [Gestión de Formularios](#gestión-de-formularios)
6. [Handoffs Entre Agentes](#handoffs-entre-agentes)
7. [Manejo de Idiomas](#manejo-de-idiomas)
8. [Mantenimiento Automático](#mantenimiento-automático)
9. [Mejoras Implementadas](#mejoras-implementadas)

---

## 🎯 Visión General

Coworkia es un **ecosistema multi-agente** donde cada agente representa una empresa especializada que cohesiona en un espacio de coworking. Aurora actúa como la coordinadora central (torre de control) que gestiona las interacciones y deriva a especialistas según el contexto.

### Principios Arquitectónicos

```
┌─────────────────────────────────────────────────┐
│              AURORA (Coordinadora)              │
│         Torre de control del ecosistema         │
└─────────────────────────────────────────────────┘
                      ↓
        ┌─────────────┴─────────────┐
        │                           │
   ┌────▼────┐                 ┌────▼────┐
   │ COWORKING│                 │EMPRESAS │
   │ (Aurora) │                 │AFILIADAS│
   └────┬────┘                 └────┬────┘
        │                           │
   ┌────▼────┐          ┌───────────┴────────────┐
   │  Aluna  │          │  Enzo  Angela  Adriana │
   │(Planes) │          │  Axel    Gabi   Paula  │
   └─────────┘          └────────────────────────┘
```

**Regla Fundamental:**  
Solo Aurora y Aluna (agentes de coworking) reciben contexto de reservas. Los demás agentes operan independientemente sin contaminación de datos de coworking.

---

## 🤖 Agentes del Ecosistema

### **1. AURORA - Coordinadora Central**
- **Rol:** Recepcionista y coordinadora del ecosistema
- **Responsabilidades:**
  - Gestión de reservas (Hot Desk, Salas)
  - Coordinación de handoffs a especialistas
  - Procesamiento de pagos unitarios
  - Manejo de día de prueba gratuito
- **Contexto que recibe:** Formularios de reserva, historial completo
- **Idioma:** Multiidioma (español por defecto)

### **2. ALUNA - Membresías y Planes**
- **Rol:** Especialista en planes recurrentes
- **Responsabilidades:**
  - Venta de membresías mensuales
  - Configuración de planes personalizados
  - Beneficios para empresas
- **Contexto que recibe:** Formularios de reserva (hereda de Aurora)

### **3. ENZO - Marketing e IA**
- **Empresa:** MarketingLab
- **Rol:** Experto en estrategias de marketing
- **Responsabilidades:**
  - Asesoría en marketing digital
  - Implementación de IA generativa
  - Automatización de campañas
  - **Venta de sistemas de agentes virtuales**
- **Contexto que recibe:** NINGUNO de coworking (aislado)

### **4. ANGELA - Salud y Bienestar**
- **Empresa:** MedBeneficios
- **Rol:** Asistente médica corporativa
- **Responsabilidades:**
  - Asesoría en salud y bienestar
  - Planes médicos corporativos
  - Emergencias y primeros auxilios
- **Contexto que recibe:** NINGUNO de coworking

### **5. ADRIANA - Seguros**
- **Empresa:** Bróker de Seguros
- **Rol:** Especialista en seguros empresariales
- **Responsabilidades:**
  - Cotización de seguros
  - Asesoría en coberturas
  - Gestión de pólizas
- **Contexto que recibe:** NINGUNO de coworking

### **6. AXEL - Reparación Vehicular**
- **Empresa:** The PaintBull
- **Rol:** Experto en reparación de colisiones
- **Responsabilidades:**
  - Análisis de fotos de daños (Vision AI)
  - Cotizaciones automáticas
  - Coordinación de reparaciones
- **Contexto que recibe:** NINGUNO de coworking
- **Sistema especial:** Collector de fotos con timeout

### **7. GABI - Finanzas y Legal**
- **Empresa:** GR Consulting
- **Rol:** Especialista en compliance
- **Responsabilidades:**
  - Asesoría financiera
  - Compliance legal (UAFE)
  - Gestión administrativa
- **Contexto que recibe:** NINGUNO de coworking

### **8. PAULA - PropElite Bienes Raíces**
- **Empresa:** PropElite
- **Rol:** Asesora inmobiliaria premium
- **Responsabilidades:**
  - Búsqueda de propiedades
  - Agendamiento de visitas
  - Asesoría inmobiliaria
- **Contexto que recibe:** NINGUNO de coworking

---

## 🔄 Flujo de Comunicación

### **Arquitectura de Mensajes**

```
Usuario → WhatsApp → Wassenger Webhook
    ↓
┌───────────────────────────────────────┐
│    Procesamiento Inicial (wassenger.js) │
│  - Detección de idioma                │
│  - Verificación de bot/grupo          │
│  - Rate limiting                      │
│  - Formulario persistente             │
└───────────┬───────────────────────────┘
            ↓
┌───────────────────────────────────────┐
│    Orquestador (orquestador.js)       │
│  - Detectar intención                 │
│  - Decidir agente                     │
│  - Construir contexto FILTRADO        │
│  - Generar prompt                     │
└───────────┬───────────────────────────┘
            ↓
┌───────────────────────────────────────┐
│    Agente Especializado               │
│  - System prompt específico           │
│  - Contexto relevante ÚNICAMENTE      │
│  - Generación de respuesta            │
└───────────┬───────────────────────────┘
            ↓
┌───────────────────────────────────────┐
│    Post-procesamiento                 │
│  - Detección de handoff               │
│  - Guardado en BD                     │
│  - Envío WhatsApp                     │
└───────────────────────────────────────┘
```

### **Reglas de Handoff**

1. **Detección:** `@enzo`, `@angela`, `@aurora`, etc.
2. **Secuencia:**
   - Agente actual despide
   - Delay 400ms
   - Nuevo agente saluda
3. **Preservación de datos:**
   - Formularios persisten en BD
   - NO se pasan en contexto a agentes externos
4. **Retorno a Aurora:**
   - Resumen automático de reserva pendiente
   - Mensaje: "Vi que estabas reservando..."

---

## 🧠 Sistema de Memoria

### **Memoria Conversacional**

```javascript
// Configuración actual
HISTORY_SIZE = 15 mensajes  // 7-8 intercambios
TRUNCATE_THRESHOLD = 150 caracteres
```

**Estrategia:**
- Se almacenan últimos 15 mensajes (usuario + asistente)
- Mensajes largos se truncan a 150 chars
- Se incluye agente que generó cada respuesta
- Optimizado para tokens vs contexto

### **Memoria Persistente (BD)**

```sql
-- Tabla: users
- phone_number (PK)
- name
- email
- preferred_language ('es', 'en', 'qu', 'am')
- free_trial_used (boolean)
- active_agent (string)

-- Tabla: partial_forms
- user_phone (PK)
- form_data (JSON)
- form_type ('reservation', 'axel_quote')
- created_at
- TTL: 24 horas (limpieza 00:00)

-- Tabla: pending_confirmations
- user_phone (PK)
- reservation_data (JSON)
- expires_at (timestamp)
- TTL: 2 horas

-- Tabla: reservations
- reservation completa confirmada
- Permanente (histórico)
```

---

## 📝 Gestión de Formularios

### **Sistema de Formulario Parcial Inteligente**

**Archivo:** `src/servicios/partial-reservation-form.js`

**Características:**

1. **Extracción Automática:**
   ```javascript
   extractDataFromMessage(message, currentForm) {
     // Detecta automáticamente:
     - spaceType: "hot desk", "sala reuniones"
     - date: "mañana", "2026-01-15", "lunes 20"
     - time: "9am", "14:30", "a las 3pm"
     - email: "user@domain.com"
     - numPeople: "somos 3", "voy con 2 personas"
   }
   ```

2. **Activación Inteligente:**
   ```javascript
   // Se activa si:
   - isReservationIntent() → "reservar", "necesito espacio"
   - hasActiveForm → Ya existe formulario guardado
   - isFormContinuation() → "ya te dije", "mi email es"
   ```

3. **Persistencia:**
   - Se guarda en `partial_forms` después de cada actualización
   - TTL: 24 horas (limpieza automática)
   - Se recupera automáticamente en próximo mensaje

4. **Validaciones:**
   - Domingos cerrados
   - Feriados Ecuador
   - Horarios laborales
   - Fechas pasadas

5. **Mensaje de Retorno:**
   ```javascript
   getResumeMessage() {
     "¡Perfecto! Ya tengo algunos datos:
      💻 Hot Desk
      📅 2026-01-15
      🕐 09:00
      
      ❓ Solo necesito: email
      
      ¿Te viene bien o prefieres cambiar algo?"
   }
   ```

---

## 🔀 Handoffs Entre Agentes

### **Protocolo de Handoff**

**Código:** `src/deteccion-intenciones/orquestador.js`

```javascript
// 1. Construcción de contexto FILTRADO
function construirContexto(perfil, historial, formData, handoffContext, targetAgent) {
  const isCoworkingAgent = ['AURORA', 'ALUNA'].includes(targetAgent);
  
  if (isCoworkingAgent) {
    // Incluir formularios y reservas
    lineas.push(formData.summary);
    lineas.push(formData.form);
  } else {
    // NO incluir datos de coworking
    lineas.push('📋 Aurora mantendrá cualquier reserva pendiente');
  }
}

// 2. Detección de retorno con reserva
if (isReturningToAurora && formData?.form && !formData.form.isComplete()) {
  lineas.push('🔄 USUARIO REGRESA CON RESERVA PENDIENTE');
  lineas.push('📋 Datos ya capturados: ...');
  lineas.push('⚠️ ACCIÓN: Ya se le mostró resumen');
}
```

### **Mensaje de Handoff**

**Formato estándar:**
```
[Agente Actual]: "Diego, te dejo con Enzo."
[400ms delay]
[Nuevo Agente]: "¡Hola Diego! Soy Enzo, experto en marketing..."

// Si regresa a Aurora con reserva:
[Aurora]: "¡Hola Diego! Soy Aurora..."
[600ms delay]
[Aurora]: "¡Perfecto! Ya tengo datos de tu reserva: ..." [resumen automático]
```

---

## 🌍 Manejo de Idiomas

### **Sistema de Detección Natural**

**Archivo:** `src/utils/language-detector.js`

**Idiomas soportados:**
- 🇪🇸 Español (es) - Por defecto
- 🇺🇸 English (en)
- 🇪🇨 Runasimi/Quechua (qu)
- 🇪🇹 አማርኛ Amharic (am)

**Flujo:**

```javascript
// 1. Usuario escribe en otro idioma
Usuario: "english"  // o mensaje en inglés

// 2. Sistema detecta con getUserLanguage()
confidence: 0.3+ → Cambio aceptado

// 3. Sistema actualiza perfil
await saveProfile(userId, { preferredLanguage: 'en' });

// 4. Sistema REPITE último mensaje traducido
const lastMessage = historial.find(msg => msg.role === 'assistant');
const translated = await translate(lastMessage.content, 'en');
await enviarWhatsApp(userId, translated);

// 5. Todos los agentes usan nuevo idioma
getSystemPrompt(preferredLanguage)
```

**Características:**
- ✅ Detección automática (no comandos)
- ✅ Umbral bajo (0.3) para cambio rápido
- ✅ Repite último mensaje traducido
- ✅ Persiste entre agentes y sesiones
- ✅ Aplica a TODOS los agentes automáticamente

---

## 🧹 Mantenimiento Automático

### **Limpieza Diaria (Cron)**

**Archivo:** `scripts/maintenance/daily-cleanup.js`

**Horario:** 00:00 (medianoche Ecuador - America/Guayaquil)

**Tareas:**
```javascript
await dailyCleanup() {
  // 1. Formularios de reserva >24h
  DELETE FROM partial_forms 
  WHERE form_type = 'reservation'
    AND created_at < datetime('now', '-1 day');
  
  // 2. Formularios cotización Axel >24h
  DELETE FROM partial_forms 
  WHERE form_type = 'axel_quote'
    AND created_at < datetime('now', '-1 day');
  
  // 3. Confirmaciones expiradas
  DELETE FROM pending_confirmations 
  WHERE expires_at < datetime('now');
  
  // 4. Estados antiguos >48h
  DELETE FROM reservation_state 
  WHERE created_at < datetime('now', '-2 days');
}
```

**Scheduler:**
```javascript
// src/servicios/cron-scheduler.js
const dailyCleanupJob = new CronJob(
  '0 0 * * *',  // 00:00 diario
  dailyCleanup,
  null,
  true,
  'America/Guayaquil'
);
```

**Otras tareas cron:**
- Cada 2h: Limpieza confirmaciones expiradas
- Cada 30min: Follow-up automático transacciones
- Diario 3AM: Limpieza interacciones antiguas (>30 días)
- Diario 4AM: Backup automático (producción)

---

## ✨ Mejoras Implementadas (v2.0)

### **1. Formulario Persistente Inteligente**

**Antes:**
```javascript
if (isReservationIntent(text)) {
  formResult = await processMessageWithForm(...);
}
```

**Ahora:**
```javascript
const hasActiveForm = !!(await getPartialForm(userId));
const isFormContinuation = detectFormContinuation(text);

if (isReservationIntent || hasActiveForm || isFormContinuation) {
  formResult = await processMessageWithForm(...);
}
```

**Beneficio:** Captura "ya te dije", emails, fechas sin keywords.

---

### **2. Datos Explícitos en Prompt**

**Antes:**
```
Reserva en proceso: Hot Desk, mañana 9am
```

**Ahora:**
```
📋 FORMULARIO EN PROCESO:
✅ Ya capturado: tipo (Hot Desk), fecha (2026-01-15), hora (09:00)
❌ Falta: email

⚠️ CRÍTICO: NO preguntes por tipo, fecha, hora. Solo pregunta: email
```

**Beneficio:** Aurora ve exactamente qué tiene y qué NO debe preguntar.

---

### **3. Memoria Ampliada**

**Antes:** 6 mensajes (3 intercambios)  
**Ahora:** 15 mensajes (7-8 intercambios)

**Beneficio:** Contexto 2.5x mayor para handoffs complejos.

---

### **4. Aislamiento de Contexto**

**Antes:**
```javascript
// Todos los agentes recibían formData
const contexto = construirContexto(perfil, historial, formData);
```

**Ahora:**
```javascript
const isCoworkingAgent = ['AURORA', 'ALUNA'].includes(targetAgent);

if (isCoworkingAgent && formData?.form) {
  // Solo Aurora/Aluna ven reservas
} else {
  // Otros agentes NO reciben datos de coworking
}
```

**Beneficio:** Arquitectura limpia, cada agente solo ve lo relevante.

---

### **5. Retoma Automática**

**Antes:** Usuario tenía que recordarle a Aurora la reserva.

**Ahora:**
```javascript
// Usuario regresa de otro agente
if (isReturningToAurora && formData?.resumeMessage) {
  await enviarWhatsApp(userId, formData.resumeMessage);
}
```

**Beneficio:** Aurora detecta y muestra resumen automáticamente.

---

### **6. Cambio Natural de Idioma**

**Antes:** Comandos explícitos "English please", "Español por favor".

**Ahora:**
```javascript
Usuario: "english"
Sistema: [Detecta, repite último mensaje traducido]
```

**Beneficio:** Cambio natural sin fricción, repite mensaje para continuidad.

---

### **7. Mensajes Simplificados**

**Antes:**
```
¡Hola! Soy Aurora...

🤝 NUESTROS EXPERTOS:
💡 @enzo - Marketing...
🛡️ @adriana - Seguros...
[lista de 5 agentes]
```

**Ahora:**
```
¡Hola! Soy Aurora...

📍 ESPACIOS:
💻 Hot Desk - $10/2h
🏢 Sala Reuniones - $29/2h

¿Qué necesitas hoy? 🚀
```

**Beneficio:** Enfoque en coworking, menciona expertos solo si preguntan.

---

### **8. Limpieza Automática**

**Antes:** Datos se acumulaban indefinidamente.

**Ahora:** Cron diario 00:00 limpia automáticamente.

**Beneficio:** BD limpia, mejor rendimiento.

---

## 📊 Métricas y Monitoreo

### **Logs Clave:**

```bash
# Activación de formulario
[FORM] 🎯 Activando formulario: { 
  isReservationIntent: true, 
  hasActiveForm: false, 
  isFormContinuation: false 
}

# Handoff exitoso
[HANDOFF] 🔄 Usuario regresa a Aurora con reserva pendiente
[HANDOFF] ✅ Resumen enviado

# Cambio de idioma
[LANGUAGE] 🌍 Cambio detectado: { from: 'es', to: 'en', confidence: 0.85 }
[LANGUAGE] 🔄 Repitiendo último mensaje en nuevo idioma
[LANGUAGE] ✅ Mensaje repetido en en

# Limpieza diaria
[DAILY-CLEANUP] ✅ Limpieza completada: 11 registros
```

---

## 🚀 Próximos Pasos

1. ✅ Testing end-to-end en producción
2. ⏳ Métricas de satisfacción post-cambios
3. ⏳ A/B testing mensajes simplificados
4. ⏳ Expansión a más idiomas (Francés, Italiano)
5. ⏳ Dashboard de analytics

---

## 📞 Soporte

**Equipo:** Aurora Core Development  
**Contacto:** Gonzalo Villota - coworkia.ec@gmail.com  
**WhatsApp:** +593 99 483 7117

---

**Última actualización:** 2026-01-14  
**Versión:** 2.0 - Post-refactoring arquitectónico
