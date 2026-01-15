# ✅ Test Manual: Flujo Completo de Reserva

**Objetivo:** Validar que el sistema maneja correctamente todo el flujo de reserva sin interrupciones, pérdida de datos o preguntas redundantes.

**Fecha test:** 2026-01-14  
**Tester:** Sistema actualizado con mejoras arquitectónicas

---

## 📋 Escenarios a Validar

### ✅ **Escenario 1: Flujo Básico Sin Interrupciones**

**Pasos:**
1. Usuario: "Hola"
2. Sistema: Mensaje de bienvenida (sin lista de agentes)
3. Usuario: "Quiero reservar un Hot Desk para mañana a las 9am"
4. Sistema: Solicita email (NO vuelve a preguntar fecha/hora)
5. Usuario: "mi email es test@coworkia.com"
6. Sistema: Muestra confirmación con todos los datos
7. Usuario: "sí"
8. Sistema: Reserva confirmada + email enviado

**Validaciones:**
- ✅ Sistema NO pregunta fecha después de que el usuario la dio
- ✅ Sistema NO pregunta hora después de que el usuario la dio
- ✅ Formulario captura todos los datos automáticamente
- ✅ Confirmación muestra TODOS los datos correctos
- ✅ Email de confirmación se envía

---

### ✅ **Escenario 2: Datos en Orden Aleatorio**

**Pasos:**
1. Usuario: "Hola"
2. Usuario: "mi email es random@test.com"
3. Sistema: Detecta email, pregunta por tipo de espacio + fecha
4. Usuario: "Hot Desk"
5. Sistema: Pregunta fecha/hora
6. Usuario: "mañana a las 10am"
7. Sistema: Confirmación completa

**Validaciones:**
- ✅ Sistema acepta datos en cualquier orden
- ✅ NO vuelve a preguntar lo que ya tiene
- ✅ Formulario persiste entre mensajes

---

### ✅ **Escenario 3: Usuario Frustrado "Ya te dije"**

**Pasos:**
1. Usuario: "Necesito Hot Desk para hoy 2pm"
2. Sistema: Solicita email
3. Usuario: "Ya te dije que es para hoy a las 2pm"
4. Sistema: Reconoce frustración, NO vuelve a preguntar fecha/hora
5. Sistema: Solo pide email si falta

**Validaciones:**
- ✅ Detecta patrón "ya te dije"
- ✅ NO repite preguntas
- ✅ Continúa flujo suavemente

---

### ✅ **Escenario 4: Handoff y Retorno con Reserva Pendiente**

**Pasos:**
1. Usuario: "Quiero Hot Desk para mañana 9am"
2. Sistema: Solicita email
3. Usuario: "@angela" (cambia a otro agente)
4. Sistema: Handoff a Angela SIN mencionar reserva
5. Usuario habla con Angela
6. Usuario: "@aurora" (regresa)
7. Sistema: "Vi que estabas reservando Hot Desk para mañana 9am. ¿Quieres continuar?"
8. Usuario: "sí, mi email es test@test.com"
9. Sistema: Confirmación

**Validaciones:**
- ✅ Formulario persiste durante handoff
- ✅ Angela NO recibe contexto de reserva
- ✅ Aurora retoma automáticamente al regresar
- ✅ Muestra resumen de datos capturados
- ✅ Continúa desde donde quedó

---

### ✅ **Escenario 5: Cambio de Idioma Natural**

**Pasos:**
1. Usuario: "Hola"
2. Sistema: Respuesta en español
3. Usuario: "english please"
4. Sistema: Repite último mensaje en inglés
5. Usuario: "I need a hot desk tomorrow 9am"
6. Sistema: Responde en inglés
7. Usuario: "español"
8. Sistema: Repite último mensaje en español
9. Continúa flujo en español

**Validaciones:**
- ✅ Detecta cambio de idioma sin comandos específicos
- ✅ Repite último mensaje traducido
- ✅ Todos los agentes usan nuevo idioma
- ✅ Persiste hasta nuevo cambio

---

### ✅ **Escenario 6: Formulario se Limpia a Medianoche**

**Pasos:**
1. Usuario inicia reserva a las 11:50 PM
2. Proporciona algunos datos (fecha, hora)
3. NO completa reserva
4. Espera hasta 00:00 (medianoche)
5. A las 00:01 usuario regresa: "quiero continuar"
6. Sistema: Formulario limpiado, comienza desde cero

**Validaciones:**
- ✅ Cron ejecuta a las 00:00
- ✅ Formularios >24h eliminados
- ✅ Usuario puede empezar limpio al día siguiente

---

## 🧪 Validaciones Técnicas

### **Base de Datos:**
```sql
-- Verificar que partial_forms se guarda correctamente
SELECT * FROM partial_forms WHERE user_phone = 'TEST_USER';

-- Verificar que pending_confirmations se limpia
SELECT * FROM pending_confirmations WHERE expires_at < datetime('now');

-- Verificar reservation_state
SELECT * FROM reservation_state WHERE user_phone = 'TEST_USER';
```

### **Logs a Revisar:**
```
[FORM] 🎯 Activando formulario: { isReservationIntent: true, hasActiveForm: false, isFormContinuation: false }
[FORM] 📧 Email auto-completado desde perfil: user@test.com
[FORM] 📊 Estado del formulario: { isComplete: true, missingFields: [] }
[HANDOFF] 🔄 Usuario regresa a Aurora con reserva pendiente
[LANGUAGE] 🌍 Cambio de idioma detectado: { from: 'es', to: 'en', confidence: 0.85 }
[DAILY-CLEANUP] ✅ Formularios de reserva limpiados: 3
```

---

## 🎯 Criterios de Éxito

| Criterio | Estado |
|----------|--------|
| No hay preguntas redundantes | ⏳ Por validar |
| Formulario persiste entre mensajes | ⏳ Por validar |
| Handoff no pierde contexto | ⏳ Por validar |
| Retorno muestra resumen automático | ⏳ Por validar |
| Cambio de idioma natural funciona | ⏳ Por validar |
| Limpieza automática 00:00 funciona | ⏳ Por validar |
| Datos en cualquier orden funcionan | ⏳ Por validar |
| "Ya te dije" es reconocido | ⏳ Por validar |

---

## 🐛 Issues Conocidos (Pre-mejoras)

1. ❌ Sistema preguntaba fecha/hora aunque ya estaba en formulario
2. ❌ Handoff perdía contexto de reserva
3. ❌ Auto-promoción muy larga en saludo inicial
4. ❌ Idioma cambiaba sin control del usuario
5. ❌ Formularios nunca se limpiaban
6. ❌ Memoria conversacional muy corta (6 mensajes)

## ✅ Mejoras Implementadas

1. ✅ Formulario persistente con detección inteligente
2. ✅ Datos explícitos en prompt (NO preguntar lo que existe)
3. ✅ Memoria ampliada a 15 mensajes
4. ✅ Aislamiento de contexto por agente
5. ✅ Limpieza automática diaria 00:00
6. ✅ Retoma automática con resumen
7. ✅ Cambio de idioma natural
8. ✅ Mensajes simplificados

---

## 📝 Notas para Testing

- Usar número de test: `+593999999999`
- Limpiar datos antes: `DELETE FROM partial_forms WHERE user_phone = '+593999999999'`
- Verificar logs en tiempo real: `tail -f logs/coworkia-agent.log`
- Probar en horarios diferentes para validar timezone Ecuador
- Validar emails recibidos en `coworkia.ec@gmail.com`

---

**Última actualización:** 2026-01-14  
**Responsable:** Sistema Aurora Core v2.0
