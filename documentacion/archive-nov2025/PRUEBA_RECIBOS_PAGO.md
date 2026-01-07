# 🧪 Guía de Pruebas: Lectura de Recibos de Pago

## 📸 Comprobante de Prueba: Produbanco

**Datos del comprobante:**
- **Monto:** $16.25
- **Fecha:** Martes 11 Nov. 2025 - 10:11 am
- **Tipo:** Transferencia Local
- **Banco:** Produbanco
- **Comprobante Nro.:** 590709020900
- **Para:** Ormaza Vargas Raul Fernando - Banco Pichincha
- **Cuenta:** Ahorros 2•••••••341
- **De:** Diego Mauricio Villota - Cuenta Corriente Nacional 0•••••••626

---

## 🎯 Objetivo de la Prueba

Verificar que Aurora puede:
1. ✅ **Leer** el comprobante de Produbanco
2. ✅ **Extraer** todos los datos correctamente
3. ✅ **Transcribir** la información al usuario
4. ⚠️ **Detectar** que el monto no coincide con reserva
5. 🤝 **Permitir** confirmación manual

---

## 🚀 Método 1: Prueba Directa WhatsApp (RECOMENDADO)

### Pasos:

1. **Guarda la imagen del comprobante** en tu celular
2. **Abre WhatsApp** y busca el número: **+593 99 483 7117**
3. **Sin hacer ninguna reserva**, simplemente envía la imagen del comprobante
4. **Espera la respuesta** de Aurora

### ✅ Respuesta Esperada:

```
📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $16.25
📅 Fecha: 2025-11-11
💳 Método: Transferencia Local - Produbanco
🔢 Referencia: [ID transacción si lo detecta]
📝 Comprobante: 590709020900

¿Los datos son correctos?
```

### ⚠️ Y luego:

```
⚠️ ADVERTENCIA: El monto no coincide
💰 Esperado: $[X]
💳 Pagado: $16.25

¿Puedes verificar? Si el monto es correcto, responde SI para continuar
```

O bien:

```
❌ No encontré ninguna reserva pendiente de pago. 
¿Tienes una reserva activa?
```

---

## 🖥️ Método 2: Prueba Local con Script

### Pasos:

1. **Sube la imagen** a un servicio temporal:
   - https://imgur.com/ (recomendado)
   - https://imgbb.com/
   - https://postimages.org/

2. **Copia la URL directa** de la imagen (debe terminar en .jpg o .png)

3. **Ejecuta el script:**
   ```bash
   node scripts/test-payment-receipt.js https://i.imgur.com/TU_URL_AQUI.jpg
   ```

### ✅ Output Esperado:

```
🔍 Analizando comprobante...

📸 URL: https://i.imgur.com/...

1️⃣ Extrayendo datos con Vision API...

📊 RESULTADO DEL ANÁLISIS:

✅ Éxito: true
📋 Válido: true
🎯 Confianza: 90 %

💰 DATOS EXTRAÍDOS:

  Monto: 16.25
  Moneda: USD
  Fecha: 2025-11-11
  Hora: 10:11
  Método: Transferencia Local
  Banco: Produbanco
  Referencia: [ID transacción]
  Comprobante Nro.: 590709020900

📝 TRANSCRIPCIÓN PARA USUARIO:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 ¡Perfecto! Recibí tu comprobante

He registrado:
💵 Monto: $16.25
📅 Fecha: 2025-11-11
💳 Método: Transferencia Local - Produbanco
🔢 Referencia: [ID]
📝 Comprobante: 590709020900

¿Los datos son correctos?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 SIMULACIÓN DE VALIDACIÓN:

  ❌ Monto esperado $10 → Diferencia: $6.25 (RECHAZADO)
  ❌ Monto esperado $20 → Diferencia: $3.75 (RECHAZADO)
  ❌ Monto esperado $29 → Diferencia: $12.75 (RECHAZADO)
  ❌ Monto esperado $49 → Diferencia: $32.75 (RECHAZADO)

📋 CASOS DE USO:

  ⚠️  Monto no estándar - Requiere verificación manual

✅ Prueba completada
```

---

## 🔍 Qué Validar en la Prueba

### ✅ Lectura Correcta:
- [ ] Monto: $16.25
- [ ] Fecha: 11 nov 2025 o 2025-11-11
- [ ] Hora: 10:11 am
- [ ] Banco: Produbanco
- [ ] Método: Transferencia Local
- [ ] Comprobante Nro.: 590709020900

### ⚙️ Lógica del Sistema:
- [ ] Detecta que es un comprobante válido
- [ ] Confianza > 70%
- [ ] Identifica que no hay reserva pendiente
- [ ] O identifica discrepancia en monto si hay reserva
- [ ] Permite override manual con "SI"

### 📱 Experiencia de Usuario:
- [ ] Mensaje claro y amigable
- [ ] Todos los datos transcritos
- [ ] Opciones de confirmación explicadas
- [ ] Manejo apropiado de errores

---

## 🎭 Escenarios de Prueba

### Escenario 1: Sin Reserva Previa
**Acción:** Enviar comprobante directamente  
**Esperado:** "No encontré ninguna reserva pendiente"

### Escenario 2: Con Reserva Pendiente ($29)
**Setup:**
1. Hacer reserva de Sala de Reuniones = $29
2. Esperar link de pago
3. Enviar comprobante de $16.25

**Esperado:** 
```
⚠️ ADVERTENCIA: El monto no coincide
💰 Esperado: $29.00
💳 Pagado: $16.25
```

### Escenario 3: Con Reserva Matching ($16.25)
**Setup:**
1. Necesitarías una reserva custom de $16.25
2. Enviar comprobante

**Esperado:** ✅ Confirmación automática

---

## 🛠️ Troubleshooting

### Problema: "No pude analizar el comprobante"
**Causas:**
- Imagen muy borrosa
- OpenAI Vision API caída
- Formato de imagen no soportado

**Solución:**
- Enviar imagen más clara
- Verificar logs en Heroku
- Intentar de nuevo

### Problema: "Confidence < 70%"
**Causas:**
- Comprobante muy borroso
- Formato no reconocido
- Texto ilegible

**Solución:**
- Tomar screenshot más claro
- Aumentar resolución
- Verificar que sea comprobante real

### Problema: No detecta número de comprobante
**Esperado:** Es posible que algunos campos sean null
**Acción:** Verificar en logs qué extrajo exactamente Vision API

---

## 📊 Métricas de Éxito

| Métrica | Target | Crítico |
|---------|--------|---------|
| Lectura exitosa | >95% | ✅ |
| Confianza | >80% | ⚠️ 70% |
| Extracción monto | 100% | ✅ |
| Extracción fecha | >90% | ⚠️ |
| Extracción banco | >85% | ⚠️ |
| Extracción referencia | >80% | ⚠️ |
| Detección comprobante | >75% | ⚠️ |

---

## 🚀 Próximos Pasos Después de Prueba

### Si TODO funciona:
1. ✅ Marcar feature como completada
2. 📝 Documentar casos edge detectados
3. 🎯 Probar con otros bancos (Pichincha, Guayaquil, etc.)

### Si hay problemas:
1. 🔍 Revisar logs de Vision API
2. 🎨 Ajustar prompt de extracción
3. 🧪 Crear más tests con variaciones
4. 📊 Aumentar confianza mínima si muchos falsos positivos

---

## 📞 Contacto de Prueba

**WhatsApp Coworkia Bot:** +593 99 483 7117  
**Ambiente:** Producción (Heroku)  
**Versión actual:** v194

---

## ⚡ Tips Rápidos

1. 💡 **No necesitas reserva** para probar la lectura
2. 📸 **La imagen debe ser clara** - screenshot funciona mejor que foto
3. 🔄 **Puedes enviar múltiples comprobantes** para comparar
4. 🎯 **El monto siempre se detectará como "no coincide"** con este comprobante de $16.25
5. ✅ **Esto es normal** - solo estás probando la lectura, no el flujo completo

---

**Última actualización:** 15 nov 2025  
**Versión:** v194
