# 🎨 v211: UX Conversacional - Campaign Flow + Saludos Personalizados

## 📋 Resumen de Cambios

### Problema Identificado
1. **Usuarios nuevos** recibían oferta de pago prematuramente al decir "quiero probar el servicio"
2. **Usuarios recurrentes** no recibían saludo personalizado mencionando su última visita

### Solución Implementada

#### 1. Campaign Detection Fix (wassenger.js)
**Antes:**
- Todos los usuarios que decían "quiero probar el servicio" eran interceptados por campaign
- La lógica duplicada causaba que usuarios nuevos vieran precios

**Ahora:**
- Solo usuarios **RECURRENTES** son interceptados por campaign
- Usuarios **NUEVOS** (firstVisit: true) pasan directo a Aurora
- Aurora maneja usuarios nuevos con contexto completo y conversación natural

```javascript
// Lógica actualizada en wassenger.js líneas 764-797
if (yaUsoTrial) {
  // Usuario RECURRENTE → Campaign response con pago
  reply = personalizeCampaignResponse(campaignCheck.template, profile);
} else {
  // Usuario NUEVO → Bypass campaign, Aurora maneja
  reply = await complete(resultado.prompt, ...);
}
```

#### 2. Warm Personalized Greetings (aurora.js)
**Añadido en líneas 328-354:**

**Saludo Ideal:**
```
¡Hola Diego! Qué bueno que quieras volver a Coworkia 😊

La última vez reservaste un [Hot Desk/Sala de Reuniones] el [fecha]. 
¿Agendamos lo mismo o prefieres algo diferente?

📍 Hot Desk: $10 por 2 horas (1-2 personas)
🏢 Sala Reuniones: $29 por 2 horas (3-4 personas)

¿Qué te reservo?
```

**Variaciones naturales:**
- "¡Hola [nombre]! Qué bueno que quieras volver... la última vez usaste [espacio] el [fecha], ¿agendamos lo mismo?"
- "¡[Nombre]! Qué alegría verte de nuevo 😊 Veo que la última vez viniste el [fecha] con [espacio]. ¿Lo mismo esta vez?"
- "¡Hola [nombre]! Te extrañábamos por acá 😊 La última vez fue el [fecha] en [espacio]. ¿Repetimos?"

**Reglas Clave:**
- ✅ Tono CÁLIDO y CERCANO
- ✅ Mencionar última visita de forma NATURAL
- ✅ Preguntar "¿lo mismo o algo diferente?" (facilita decisión)
- ❌ NO decir "usaste tu día gratis" (suena transaccional)
- ✅ SÍ decir "la última vez reservaste..." (suena personal)

## 🧪 Testing

### Test Automatizado
Creado `scripts/test-campaign-flow.js` con 4 casos:

1. **Campaign Detection** ✅
   - Detecta "quiero probar el servicio" correctamente

2. **New User Response** ✅
   - Ofrece 2 horas gratis
   - NO muestra precios
   - Campaign es BYPASSADO → va a Aurora

3. **Returning User Response** ✅
   - Saludo cálido personalizado
   - Muestra precios ($10/$29)
   - NO ofrece trial gratis

4. **Wassenger Logic** ✅
   - New users: Bypass campaign → Aurora
   - Returning users: Campaign response → Pago

**Ejecutar test:**
```bash
node scripts/test-campaign-flow.js
```

## 📦 Archivos Modificados

### src/express-servidor/endpoints-api/wassenger.js
- **Líneas 764-797**: Campaign detection logic
- **Cambio**: Solo interceptar campaign para usuarios recurrentes
- **Nueva lógica**: Usuarios nuevos bypass → Aurora maneja

### src/deteccion-intenciones/aurora.js
- **Líneas 328-354**: Warm personalized greetings
- **Añadido**: Saludo ideal con última visita
- **Añadido**: 3 variaciones naturales de saludo
- **Añadido**: Reglas sobre tono cálido y lenguaje cercano

### scripts/test-campaign-flow.js
- **Nuevo archivo**: Test automatizado del flujo de campaign
- **Casos**: 4 escenarios (detection, new user, returning, wassenger logic)

## 🚀 Deployment

```bash
# Commit
git commit -m "v211: Fix campaign flow + warm greetings"

# Deploy
git push heroku main

# Status
✅ Released v211
✅ https://coworkia-agent-e97d15dac56f.herokuapp.com/
```

## 📊 Resultados Esperados

### Para Usuarios Nuevos
**Antes:**
```
Usuario: "quiero probar el servicio"
Aurora: [Muestra precios $10/$29 inmediatamente] ❌
```

**Ahora:**
```
Usuario: "quiero probar el servicio"
Aurora: "¡Hola Diego! Qué bueno que quieres conocer Coworkia. 
        Como es tu primera vez, te regalo 2 horas gratis..." ✅
```

### Para Usuarios Recurrentes
**Antes:**
```
Usuario: "quiero probar el servicio"
Aurora: [Respuesta genérica con precios] ❌
```

**Ahora:**
```
Usuario: "quiero probar el servicio"
Aurora: "¡Hola Diego! Qué bueno que quieras volver a Coworkia 😊
        La última vez reservaste un Hot Desk el 15 de enero.
        ¿Agendamos lo mismo o prefieres algo diferente?" ✅
```

## 🎯 Próximos Pasos de Testing

1. **Test con usuario nuevo real:**
   - Enviar "quiero probar el servicio"
   - Verificar que ofrece 2 horas gratis
   - Confirmar que NO muestra precios

2. **Test con usuario recurrente:**
   - Enviar "quiero probar el servicio"
   - Verificar saludo personalizado con última visita
   - Confirmar que muestra precios ($10/$29)

3. **Monitorear logs de Heroku:**
   ```bash
   heroku logs --tail
   ```
   - Buscar: `[WASSENGER] 🆕 Usuario NUEVO detectado - Bypassing campaign`
   - Buscar: `[WASSENGER] 🎯 Campaña detectada - Usuario RECURRENTE`

## 💡 Notas Técnicas

- Campaign bypass usa `firstVisit`, `freeTrialUsed`, `reservationHistory`
- Saludo personalizado usa `lastReservation.date` y `lastReservation.serviceType`
- Variaciones de saludo permiten conversación más natural y menos robótica
- Test automatizado valida lógica sin necesidad de WhatsApp

---

**Versión:** v211  
**Fecha:** 2025-01-XX  
**Estado:** ✅ Deployed to Production  
**Test:** ✅ Passing
