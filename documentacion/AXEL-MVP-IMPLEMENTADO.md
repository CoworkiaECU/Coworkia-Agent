# 🚗 AXEL MVP - Sistema Funcional Implementado

## ✅ Implementación Completada (Demo Ready)

### Características MVP

**1. PERSONALIDAD EMPÁTICA**
- Mensaje de entrada cálido y tranquilizador
- Tono cercano: "Tranquilo/a, estás en buenas manos"
- Sin tecnicismos robóticos
- Mensajes breves y naturales

**2. BATCH PROCESSING INTELIGENTE**
- Timer de 15 segundos para recolectar fotos
- Análisis consolidado de todas las imágenes juntas
- Una sola respuesta completa (no múltiples mensajes fragmentados)
- Confirmación inmediata al recibir primera foto

**3. FLUJO SIMPLIFICADO (Sin VIN)**
```
Usuario contacta Axel
    ↓
Axel: mensaje empático + solicitud de fotos
    ↓
Usuario envía 1+ fotos
    ↓
Sistema: "Foto recibida. Envía todas las que tengas..."
    ↓
[TIMER 15 segundos - recolecta todas las fotos]
    ↓
Análisis batch con GPT-4 Vision
    ↓
Respuesta única consolidada:
  - Evaluación empática del daño
  - Áreas afectadas (máx 3)
  - Rango de cotización aproximada
  - Call to action: "¿Envío cotización por email?"
    ↓
FIN (demo completo)
```

**4. SISTEMA DE COTIZACIÓN MVP**
- Análisis visual con GPT-4 Vision
- Detección automática de severidad (leve/moderado/grave)
- Rangos de precio amplios (-10% / +20%)
- Respuesta natural, no técnica

---

## 📁 Archivos Modificados

### 1. `/src/deteccion-intenciones/axel.js`

**Cambios:**
- ✅ Mensaje entrada empático
- ✅ Personalidad cálida vs robótica
- ✅ System prompt simplificado (4 reglas vs 20)
- ✅ Acepta fotos como vengan (sin exigir VIN, ángulos perfectos)

**Antes:**
```javascript
entrada: '¡Hola {nombre}! Soy Axel 🚗, especialista en enderezada...'
```

**Después:**
```javascript
entrada: 'Hola {nombre}, soy Axel de PaintBull 🚗\n\n' +
         'Tranquilo/a, estás en buenas manos. Con 15 años de experiencia...\n\n' +
         'Para darte una cotización precisa, envíame las fotos que tengas del daño - ' +
         'con las que puedas tomar está bien, no te preocupes por la calidad perfecta.'
```

### 2. `/src/express-servidor/endpoints-api/wassenger.js`

**Cambios:**
- ✅ Batch processing con timer 15 segundos
- ✅ Map temporal `axelPendingPhotos` para acumular fotos
- ✅ Análisis consolidado único
- ✅ Respuesta empática estructurada según severidad
- ✅ Eliminados flujos complejos (Juan, formularios, múltiples mensajes)

**Lógica implementada:**
```javascript
// Recibe foto → agrega a Map → reinicia timer
photoData.photos.push({ url: mediaUrl, receivedAt: Date.now() });

// Después de 15s sin nuevas fotos → procesa batch
setTimeout(async () => {
  const allPhotos = currentPhotoData?.photos || [];
  const analysis = await analyzeCollisionPhoto(photoUrls[0], { 
    photoType: 'batch',
    additionalPhotos: photoUrls.slice(1),
    totalPhotos: photoUrls.length
  });
  
  // Genera respuesta consolidada personalizada
  let respuesta = '';
  if (severe) respuesta = 'El golpe sí es considerable, pero tranquilo/a...';
  else if (moderate) respuesta = 'Es un daño moderado, de esos que vemos seguido...';
  else respuesta = 'El daño es leve, se puede solucionar sin problema...';
  
  // Áreas + cotización + CTA
  await enviarWhatsApp(userId, respuesta);
}, 15000);
```

### 3. `/src/servicios/collision-analysis.js`

**Cambios:**
- ✅ Prompts simplificados (natural vs técnico)
- ✅ Modo `batch` para múltiples fotos
- ✅ Parsing de respuesta para extraer: severity, damageAreas, estimatedCost
- ✅ Respuestas breves (2-4 oraciones vs listas técnicas)

**Prompt batch:**
```javascript
Eres Axel de PaintBull analizando ${totalPhotos} foto(s).

ANALIZA TODAS LAS FOTOS JUNTAS Y RESPONDE:
1. Descripción general del daño (tono empático)
2. Severidad: LEVE | MODERADO | GRAVE
3. Áreas dañadas principales (máximo 3)
4. Estimación aproximada en $

Tono cálido, nada técnico. 3-4 oraciones máximo.
```

---

## 🎯 Testing del Sistema

### Caso 1: Foto única
```
Usuario: *envía 1 foto de parachoques*
Axel: "📸 Foto recibida. Envía todas las que tengas, las analizo juntas..."
[15 segundos]
Axel: "Diego, perfecto. El daño es leve, se puede solucionar sin problema. ✅

📋 Áreas afectadas: parachoques delantero

💰 Estimación referencial: $180 - $240 (sujeto a inspección física)

¿Te gustaría que te envíe una cotización oficial por email? 📧"
```

### Caso 2: Múltiples fotos
```
Usuario: *envía 3 fotos en secuencia rápida*
Axel: "📸 Foto recibida. Envía todas las que tengas..."
[usuario envía foto 2]
[usuario envía foto 3]
[15 segundos desde última foto]
Axel: "María, revisé las 3 fotos. Es un daño moderado, de esos que vemos seguido. No te preocupes. 👍

📋 Áreas afectadas: puerta trasera, guardabarro, lateral

💰 Estimación referencial: $450 - $600 (sujeto a inspección física)

¿Te gustaría que te envíe una cotización oficial por email? 📧"
```

### Caso 3: Colisión grave
```
Usuario: *envía foto de chasis doblado*
Axel: "📸 Foto recibida. Envía todas las que tengas..."
[15 segundos]
Axel: "Carlos, vi las fotos. Este golpe es considerable y afecta estructura del vehículo. 

Para este tipo de daño necesitas un taller especializado en carrocería pesada. Te recomiendo contactar con un taller certificado que tenga equipo de enderezado estructural.

PaintBull se enfoca en colisiones leves y moderadas. ¿Te puedo ayudar con algo más?"
```

---

## ⚠️ Limitaciones Conocidas (MVP)

**NO implementado (por simplicidad):**
- ❌ Cotización por email (manual por ahora)
- ❌ Formulario de datos del vehículo
- ❌ Conexión con jefe de taller Juan
- ❌ Extracción de VIN
- ❌ Sistema de pagos
- ❌ Calendario de citas

**Justificación:**
Sistema enfocado en **DEMO y VENTAS**, no en operación completa.
El objetivo es probar que:
1. Usuario envía fotos sin frustración
2. Axel responde de forma empática
3. Se genera cotización aproximada funcional
4. Flujo es rápido y simple

---

## 🚀 Próximos Pasos Post-Demo

Si el MVP funciona en ventas:
1. Implementar email de cotización automatizado
2. Agregar campo de captura de email del usuario
3. Integrar con Google Calendar para citas
4. Sistema de seguimiento de leads
5. Dashboard de métricas de conversión

---

## 📊 Métricas de Éxito MVP

**Indicadores clave:**
- ✅ Usuario completa flujo sin pedir "hablar con humano"
- ✅ Tiempo de respuesta < 20 segundos desde última foto
- ✅ Respuesta consolidada en 1 mensaje (no 5+)
- ✅ Cotización aproximada realista (±30% del real)
- ✅ Tono percibido como "ayuda" no "bot"

---

## 🔧 Variables de Configuración

```bash
# .env
DEBUG_MODE=true                    # Logs detallados
BATCH_PHOTO_TIMEOUT=15000          # 15 segundos
OPENAI_VISION_TEMPERATURE=0.2      # Consistencia en análisis
OPENAI_VISION_MAX_TOKENS=400       # Respuestas breves
```

---

**Implementado:** 11/01/2026
**Status:** ✅ FUNCIONAL - LISTO PARA DEMO
**Prioridad:** ALTA - Sistema crítico para adquisición de clientes
