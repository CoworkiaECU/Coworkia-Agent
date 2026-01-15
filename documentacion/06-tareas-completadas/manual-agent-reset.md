# 🔄 T9: Manual Agent Reset

Script para resetear manualmente el agente activo de un usuario desde terminal.

## 🎯 Propósito

Permite al developer resetear manualmente un usuario que está "atascado" con un agente especializado, regresándolo a AURORA con una secuencia elegante de 3 mensajes.

## 📋 Diferencia con T14

| Aspecto | T14 (Automático) | T9 (Manual) |
|---------|------------------|-------------|
| **Trigger** | Automático cron (2h timeout) | Developer ejecuta comando |
| **Mensajes** | 1 despedida | 3 mensajes (despedida + transición + saludo) |
| **Timing** | 2 horas post-transacción | Inmediato on-demand |
| **Propósito** | Follow-up abandonos | Reset manual casos especiales |

## 🚀 Uso

```bash
# Desde raíz del proyecto
node scripts/maintenance/manual-agent-reset.js <phone_number>

# Ejemplo con Diego
node scripts/maintenance/manual-agent-reset.js +593987770788
```

## 📝 Flujo de Ejecución

1. **Validación:** Verifica que usuario existe y no está ya en AURORA
2. **Mensaje 1:** Agente actual se despide (personalizado por agente)
3. **Delay 3s:** Pausa natural
4. **Mensaje 2:** Sistema notifica transición a Aurora
5. **Delay 3s:** Pausa natural
6. **Mensaje 3:** Aurora saluda al usuario
7. **Update DB:**
   - `activeAgent` → AURORA
   - `transactionStartedAt` → NULL
   - `transactionAgent` → NULL
   - `followUpSentAt` → NULL

## 💬 Mensajes por Agente

### AXEL (The PaintBull)
```
{nombre}, fue un gusto atenderte en The PaintBull. ¡Hasta la próxima! 🚗🔧
```

### ALUNA (Coworking)
```
{nombre}, gracias por considerar nuestros espacios de coworking. ¡Nos vemos pronto! ☕
```

### ADRIANA (Seguros)
```
{nombre}, fue un placer asesorarte en seguros. ¡Cuídate! 🛡️
```

### ENZO (Marketing)
```
{nombre}, excelente trabajar contigo en marketing visual. ¡Éxitos! 🎨
```

### ANGELA (OneMind)
```
{nombre}, gracias por confiar en OneMind IA. ¡Hasta pronto! 💰
```

### GABI (Admin)
```
{nombre}, fue un placer asistirte. ¡Estamos en contacto! 📊
```

### TOMI (Inversiones)
```
{nombre}, gracias por considerar nuestros servicios de inversión. ¡Éxito! 💼
```

### Mensaje Transición (Sistema)
```
Transferiendo tu conversación a Aurora, nuestro coordinador principal...
```

### Aurora Saludo
```
¡Hola {nombre}! 👋

Soy Aurora, tu asistente de Coworkia. ¿En qué puedo ayudarte hoy?
```

## 🔧 Casos de Uso

### 1. Usuario atascado con agente especializado
```bash
# Usuario hizo consulta con Axel hace días y quiere volver a Aurora
node scripts/maintenance/manual-agent-reset.js +593987770788
```

### 2. Testing de handoffs
```bash
# Probar flujo de regreso a Aurora después de testing
node scripts/maintenance/manual-agent-reset.js +593999999999
```

### 3. Cleanup post-demo
```bash
# Resetear múltiples usuarios después de demostración
for phone in "+593987770788" "+593999999999"; do
  node scripts/maintenance/manual-agent-reset.js $phone
done
```

## ⚠️ Validaciones

El script incluye validaciones:

1. **Número requerido:** Debe proporcionar phone_number como argumento
2. **Formato E.164:** Debe incluir código país (+593...)
3. **Usuario existe:** Verifica en DB antes de proceder
4. **No es AURORA:** Si ya está en AURORA, no hace nada

## 📊 Output Esperado

```
🔄 [T9] Iniciando reset manual para +593987770788...

📋 Usuario: Diego
🤖 Agente actual: AXEL

💬 [Axel] Despedida: "Diego, fue un gusto atenderte en The PaintBull..."
✅ Mensaje 1/3 enviado
⏱️  Esperando 3 segundos...

💬 [Sistema] Transición: "Transferiendo tu conversación a Aurora..."
✅ Mensaje 2/3 enviado
⏱️  Esperando 3 segundos...

💬 [Aurora] Saludo: "¡Hola Diego! 👋..."
✅ Mensaje 3/3 enviado

✅ [T9] Reset completado exitosamente!
📊 Resumen:
   - Agente anterior: AXEL
   - Agente nuevo: AURORA
   - Transacción limpiada: Sí
   - Mensajes enviados: 3
```

## 🚨 Errores Comunes

### Error: Usuario no encontrado
```bash
❌ Usuario +593999999999 no encontrado en base de datos.
```
**Solución:** Verificar que el número está en DB

### Error: Formato inválido
```bash
❌ Error: Número debe incluir código de país (ejemplo: +593987770788)
```
**Solución:** Agregar + y código país

### Error: Variables de entorno
```bash
Error enviando WhatsApp: Request failed with status code 401
```
**Solución:** Verificar WASSENGER_TOKEN y WASSENGER_DEVICE en .env

## 🔐 Seguridad

- ✅ Solo ejecutable por developers con acceso al servidor
- ✅ Requiere variables de entorno WASSENGER_TOKEN/DEVICE
- ✅ Valida formato de número antes de proceder
- ✅ No expone información sensible en logs

## 🔗 Archivos Relacionados

- **Script principal:** [scripts/maintenance/manual-agent-reset.js](../../scripts/maintenance/manual-agent-reset.js)
- **Sistema automático (T14):** [documentacion/06-tareas-completadas/t14-follow-up-2h-timeout.md](./t14-follow-up-2h-timeout.md)
- **Handoffs automáticos:** [documentacion/03-arquitectura-sistemas/sistema-handovers.md](../03-arquitectura-sistemas/sistema-handovers.md)

## 📚 Referencias

**Commit:** v456 (T9)  
**Autor:** Diego Villota  
**Fecha:** Enero 2026
