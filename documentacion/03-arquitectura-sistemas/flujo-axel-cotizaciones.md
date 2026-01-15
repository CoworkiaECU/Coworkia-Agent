# 🚗 FLUJO DE COTIZACIONES - AXEL (PaintBull)

## 📊 Resumen Ejecutivo

**Estado Actual:** ✅ Funcional pero incompleto
**Problema:** Sistema de formulario existe PERO no se activa después del análisis de fotos
**Impacto:** Usuario recibe análisis pero no cotización formal por email

---

## 🔄 FLUJO ACTUAL (lo que está programado)

### FASE 1: Análisis de Fotos (✅ FUNCIONA)

```
1. Usuario → @axel + "hola tengo un golpe"
2. Axel → "Envíame fotos del daño"
3. Usuario → Envía foto(s)
4. Sistema → Espera 15 segundos (batch de fotos)
5. Sistema → Analiza con GPT-4o Vision API
6. Axel → Respuesta con análisis:
   - "{nombre}, revisé las fotos..."
   - Severidad: leve/moderado/grave
   - Áreas afectadas
   - Estimación referencial: $X - $Y
   - "¿Te gustaría que te envíe una cotización oficial por email? 📧"
```

**Código:**
- [wassenger.js:520-640](../src/express-servidor/endpoints-api/wassenger.js)
- [collision-analysis.js](../src/servicios/collision-analysis.js)

---

### FASE 2: Formulario de Datos (❌ NO SE ACTIVA)

**El problema:** Después del análisis, el sistema NO pregunta por:
- Marca
- Modelo
- Año
- Nombre completo
- Email

**Código existe pero no está conectado:**
- [axel-quote-form.js](../src/servicios/axel-quote-form.js) ← Sistema completo programado
- Función `processAxelFormMessage()` existe
- Extracción con OpenAI configurada
- Base de datos `partial_forms` lista

**Dónde se importa pero no se usa correctamente:**
```javascript
// wassenger.js:339
const { processAxelFormMessage, getAxelForm } = await import('../../servicios/axel-quote-form.js');

// Se usa SOLO si usuario escribe ANTES de enviar fotos
// NO se activa después del análisis
```

---

### FASE 3: Generación de Cotización (❌ ESPERANDO FASE 2)

**Código:**
- [axel-quote-generator.js](../src/servicios/axel-quote-generator.js)
- Genera cotización con OpenAI
- Formatea en PDF/HTML
- Envía por email

**No se puede activar porque falta data del formulario**

---

## 🔧 FLUJO CORRECTO (lo que DEBERÍA pasar)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HANDOVER A AXEL                                          │
│    - Usuario menciona @axel                                 │
│    - Aurora transfiere con contexto                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BIENVENIDA + SOLICITUD DE FOTOS                          │
│    "Envíame fotos del daño"                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RECEPCIÓN Y ANÁLISIS DE FOTOS                            │
│    - Batch timer 15 segundos                                │
│    - GPT-4o Vision analiza daños                            │
│    - Detecta áreas + estima costo                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RESPUESTA CON ANÁLISIS                                   │
│    "{nombre}, revisé las fotos..."                          │
│    "Severidad: MODERADO"                                    │
│    "Áreas: capó, puerta, parachoques"                       │
│    "Estimación: $720 - $960"                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ❌ AQUÍ ESTÁ EL HUECO ❌                                  │
│    Sistema debería preguntar:                               │
│    "¿Te gustaría cotización oficial por email?"            │
│                                                              │
│    Si usuario dice "sí":                                    │
│    → Pedir datos vehículo                                   │
│    → Pedir datos personales                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. RECOLECCIÓN DE DATOS (FORMULARIO)                        │
│    Pregunta 1: "🚗 Datos del vehículo?"                     │
│    Usuario: "Toyota Corolla 2018"                           │
│                                                              │
│    Pregunta 2: "📋 Tu nombre y email?"                      │
│    Usuario: "Carlos Pérez, carlos@gmail.com"               │
│                                                              │
│    Sistema guarda en `partial_forms`                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. GENERACIÓN DE COTIZACIÓN                                 │
│    - OpenAI genera cotización formal                        │
│    - Incluye análisis + datos vehículo                      │
│    - Formatea en HTML/PDF                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. ENVÍO POR EMAIL                                          │
│    - axel-quote-email.js                                    │
│    - Gmail API                                              │
│    - Adjunto PDF                                            │
│    - Notifica en WhatsApp                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐛 PROBLEMA ESPECÍFICO

**Ubicación del bug:** [wassenger.js:621](../src/express-servidor/endpoints-api/wassenger.js#L621)

```javascript
// ACTUAL (línea 621):
respuesta += `¿Te gustaría que te envíe una cotización oficial por email? 📧`;

await enviarWhatsApp(userId, respuesta);

// ❌ AQUÍ TERMINA - NO HAY LÓGICA POSTERIOR

// DEBERÍA:
// 1. Guardar analysis en profile.axelData.lastAnalysis ✅ (esto sí pasa)
// 2. Marcar flag: awaitingQuoteConfirmation = true
// 3. En próximo mensaje → detectar "sí/ok/dale/etc"
// 4. Si confirma → iniciar formulario
// 5. Si no confirma → dejar en standby
```

---

## 🔨 SOLUCIÓN PROPUESTA

### Opción A: Flow Automático (Recomendado para MVP)

**Ventaja:** Sin fricción, experiencia fluida
**Desventaja:** Puede ser invasivo si usuario solo quería estimación rápida

```javascript
// Después del análisis (wassenger.js:621)
respuesta += `\n\n✅ *COTIZACIÓN OFICIAL POR EMAIL*\n`;
respuesta += `Para enviarte la cotización formal necesito:\n`;
respuesta += `🚗 Marca, modelo y año del vehículo\n`;
respuesta += `📋 Tu nombre completo y email\n\n`;
respuesta += `_Ejemplo: Toyota Corolla 2018, Carlos Pérez, carlos@gmail.com_`;

await enviarWhatsApp(userId, respuesta);

// Marcar en profile que está esperando datos
freshProfile.axelData = freshProfile.axelData || {};
freshProfile.axelData.awaitingFormData = true;
freshProfile.axelData.lastAnalysisId = analysis.id;
await saveProfile(userId, freshProfile);
```

### Opción B: Flow con Confirmación (Menos invasivo)

**Ventaja:** Usuario decide si quiere cotización formal
**Desventaja:** Paso extra, puede perder usuario

```javascript
// Después del análisis (wassenger.js:621)
respuesta += `\n\n¿Te gustaría que te envíe una cotización oficial por email? 📧\n`;
respuesta += `Responde *SÍ* o *NO*`;

await enviarWhatsApp(userId, respuesta);

// Marcar en profile que está esperando confirmación
freshProfile.axelData = freshProfile.axelData || {};
freshProfile.axelData.awaitingQuoteConfirmation = true;
freshProfile.axelData.lastAnalysisId = analysis.id;
await saveProfile(userId, freshProfile);

// En próximo mensaje → detectar respuesta
if (text.match(/s[ií]|ok|dale|perfecto|env[ií]a/i)) {
  // Iniciar formulario
  await enviarWhatsApp(userId, 
    '✅ Perfecto! Para la cotización oficial necesito:\n\n' +
    '🚗 Marca, modelo y año\n' +
    '📋 Tu nombre y email\n\n' +
    '_Ejemplo: Toyota Corolla 2018, Carlos Pérez, carlos@gmail.com_'
  );
  
  // Crear formulario en partial_forms
  await saveAxelForm(userId, {
    analysis: profile.axelData.lastAnalysis,
    photoUrls: profile.axelData.lastAnalysis.photoUrls,
    step: 'awaiting_vehicle_data'
  });
}
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### 1. Conectar análisis → formulario ✅
- [ ] Después de análisis, preguntar datos automáticamente
- [ ] O preguntar confirmación primero
- [ ] Guardar flag `awaitingFormData` en profile

### 2. Activar sistema de formulario ✅
- [ ] Detectar cuando usuario responde con datos
- [ ] Usar `processAxelFormMessage()` existente
- [ ] Extraer datos con OpenAI
- [ ] Guardar en `partial_forms`

### 3. Generar cotización cuando formulario completo ✅
- [ ] Detectar `formResult.complete === true`
- [ ] Llamar `axel-quote-generator.js`
- [ ] Pasar analysis + formData
- [ ] Generar PDF/HTML

### 4. Enviar por email ✅
- [ ] Usar `axel-quote-email.js`
- [ ] Gmail API
- [ ] Adjunto PDF
- [ ] Notificar usuario en WhatsApp

### 5. Limpiar estado ✅
- [ ] Eliminar formulario de `partial_forms`
- [ ] Marcar cotización como enviada en profile
- [ ] Resetear flags

---

## 💾 DATOS INVOLUCRADOS

### Profile (users table)
```javascript
profile.axelData = {
  lastAnalysis: {
    severity: 'moderate',
    damageAreas: ['capó', 'puerta', 'guardabarro'],
    estimatedCost: 840,
    photoUrls: ['https://...', 'https://...'],
    analyzedAt: '2026-01-12T14:10:00Z'
  },
  awaitingFormData: true,  // ← Nuevo flag
  lastQuoteSentAt: null
}
```

### Partial Forms (partial_forms table)
```javascript
{
  user_phone: '+593987770788',
  form_type: 'axel_quote',
  form_data: {
    // Datos del análisis
    analysis: { /* lastAnalysis */ },
    photoUrls: ['https://...'],
    
    // Datos del formulario (progresivo)
    marca: 'Toyota',      // ← Usuario responde
    modelo: 'Corolla',    // ← Usuario responde
    año: '2018',          // ← Usuario responde
    nombre: 'Carlos Pérez', // ← Usuario responde
    email: 'carlos@gmail.com' // ← Usuario responde
  }
}
```

---

## ⚙️ ARCHIVOS A MODIFICAR

1. **wassenger.js** (línea 621)
   - Agregar lógica post-análisis
   - Detectar confirmación o datos directos
   - Llamar a formulario

2. **axel-quote-form.js** (sin cambios)
   - Ya está completo
   - Solo necesita ser llamado

3. **axel-quote-generator.js** (sin cambios)
   - Ya está completo
   - Solo necesita ser llamado

4. **axel-quote-email.js** (sin cambios)
   - Ya está completo
   - Gmail API configurada

---

## 🎯 DECISIÓN REQUERIDA

¿Cuál flujo prefieres para tu cliente?

**A. Automático** (sin pregunta)
- ✅ Más rápido
- ✅ Menos fricción
- ❌ Puede ser invasivo

**B. Con confirmación** ("¿Quieres cotización? Sí/No")
- ✅ Usuario decide
- ✅ Menos invasivo
- ❌ Paso extra

**C. Híbrido** (pregunta + datos en un mensaje)
- "¿Quieres cotización? Responde con: Marca Modelo Año Nombre Email"
- ✅ Un solo paso
- ❌ Mensaje largo puede confundir

---

## 📊 MÉTRICAS DE ÉXITO

Post-implementación, medir:

1. **Tasa de conversión fotos → datos**
   - % de usuarios que dan datos después del análisis

2. **Tasa de completitud formulario**
   - % de usuarios que completan todos los campos

3. **Tasa de envío email**
   - % de cotizaciones efectivamente enviadas

4. **Tiempo promedio foto → email**
   - Ideal: < 5 minutos

---

## 🚨 RIESGOS

1. **Análisis impreciso** (ya identificado)
   - Vision API a veces subestima/sobreestima
   - Solución: Mejorar prompt + más fotos obligatorias

2. **Usuario abandona en formulario**
   - Solución: Hacer campos opcionales progresivos
   - Permitir reinicio

3. **Email no llega**
   - Gmail API puede fallar
   - Solución: Fallback a WhatsApp con PDF

---

## ✅ PRÓXIMOS PASOS

1. **Decidir flujo:** A, B o C
2. **Implementar conexión:** análisis → formulario
3. **Probar con casos reales** (2-3 usuarios)
4. **Iterar según feedback**
5. **Escalar**

---

**Última actualización:** 2026-01-12
**Versión actual sistema:** v395
**Estado:** Funcional parcial (análisis OK, formulario desconectado)
