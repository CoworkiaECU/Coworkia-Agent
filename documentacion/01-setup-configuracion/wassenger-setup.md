# 📱 Integración WhatsApp con Wassenger

## 🎯 Objetivo
Conectar Aurora (y todos los agentes) a WhatsApp para atender clientes 24/7 de forma automática.

## 📋 Requisitos Previos

1. **Cuenta en Wassenger**
   - Crea cuenta en https://wassenger.com
   - Conecta tu número de WhatsApp Business

2. **Credenciales necesarias** (en tu `.env`):
   ```env
   WASSENGER_TOKEN=tu_token_aqui
   WASSENGER_DEVICE=tu_device_id_aqui
   ```

3. **Servidor público** (una de estas opciones):
   - ngrok (desarrollo/testing)
   - Render.com (producción gratuita)
   - Heroku (producción)
   - Railway (producción)

---

## 🚀 Paso 1: Configurar Variables de Entorno

Edita tu archivo `.env`:

```env
# Tu token de Wassenger (Dashboard > API > Token)
WASSENGER_TOKEN=e572b534785689a6e8c2e8840a83...

# Tu Device ID (Dashboard > Devices > Ver ID)
WASSENGER_DEVICE=682de9ea896d635a50b7cd69
```

---

## 🚀 Paso 2: Exponer Servidor con ngrok (Testing Local)

### 2.1 Instalar ngrok
```bash
# macOS
brew install ngrok

# O descargar de https://ngrok.com/download
```

### 2.2 Iniciar túnel
```bash
# En terminal 1: Servidor Node
npm run dev

# En terminal 2: ngrok
ngrok http 3001
```

Obtendrás una URL como:
```
https://abc123.ngrok.io
```

### 2.3 URL del Webhook
Tu webhook será:
```
https://abc123.ngrok.io/webhooks/wassenger
```

---

## 🚀 Paso 3: Configurar Webhook en Wassenger

1. Ve a **Wassenger Dashboard**
2. **Settings → Webhooks**
3. **Add Webhook:**
   - **URL:** `https://abc123.ngrok.io/webhooks/wassenger`
   - **Events:** Selecciona `message:in` o `message:in:text`
   - **Save**

4. **Test Connection** (botón en Wassenger)
   - Debe mostrar ✅ Connected

---

## 🧪 Paso 4: Probar Integración

### 4.1 Enviar mensaje de prueba desde WhatsApp

Envía un mensaje a tu número de WhatsApp Business conectado en Wassenger:

```
Hola, quiero información
```

### 4.2 Verificar logs del servidor

Deberías ver en tu terminal:

```bash
[WASSENGER] Webhook recibido: {
  "event": "message:in:text",
  "data": {
    "fromNumber": "593987654321",
    "body": "Hola, quiero información",
    "fromName": "Diego"
  }
}
```

### 4.3 Recibir respuesta en WhatsApp

Aurora debería responder automáticamente en WhatsApp.

---

## 🎭 Paso 5: Probar Todos los Agentes

### Aurora (por defecto)
```
Hola, quiero reservar un espacio
```
Respuesta esperada: Aurora te atiende con info de reservas

### Aluna (planes mensuales)
```
Necesito información de planes mensuales
```
Respuesta esperada: Aluna te asesora sobre membresías

### Adriana (seguros - solo @adriana)
```
@adriana necesito un seguro de vida
```
Respuesta esperada: Adriana te cotiza seguros

### Enzo (marketing/IA - solo @enzo)
```
@enzo cómo puedo hacer marketing digital en Ecuador
```
Respuesta esperada: Enzo te asesora en estrategias

---

## 🔍 Monitoreo y Debug

### Ver logs en tiempo real
```bash
tail -f data/interactions.jsonl
```

### Endpoint de verificación
```bash
curl https://abc123.ngrok.io/webhooks/wassenger
```

Respuesta esperada:
```json
{
  "ok": true,
  "message": "Wassenger Webhook activo",
  "timestamp": "2025-11-06T..."
}
```

---

## 🚢 Paso 6: Deploy en Producción (Render.com)

### 6.1 Preparar repositorio
```bash
git init
git add .
git commit -m "Integración Wassenger completa"
git branch -M main
```

### 6.2 Push a GitHub
```bash
# Crear repo en GitHub primero
git remote add origin https://github.com/tu-usuario/coworkia-agent.git
git push -u origin main
```

### 6.3 Deploy en Render
1. Ve a https://render.com
2. **New → Web Service**
3. Conecta tu repositorio de GitHub
4. Configuración:
   - **Name:** coworkia-agent
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   
5. **Environment Variables:**
   ```
   OPENAI_API_KEY=sk-proj-...
   WASSENGER_TOKEN=e572b534...
   WASSENGER_DEVICE=682de9ea...
   OPENAI_MODEL=gpt-4o-mini
   PORT=3001
   ```

6. **Deploy**

### 6.4 Obtener URL de producción
Render te dará una URL como:
```
https://coworkia-agent.onrender.com
```

### 6.5 Actualizar webhook en Wassenger
Cambia la URL del webhook a:
```
https://coworkia-agent.onrender.com/webhooks/wassenger
```

---

## ✅ Checklist Final

- [ ] Variables de entorno configuradas
- [ ] Servidor corriendo sin errores
- [ ] ngrok expone servidor localmente (testing)
- [ ] Webhook configurado en Wassenger
- [ ] Test enviando mensaje → Respuesta recibida
- [ ] Aurora responde mensajes generales
- [ ] Aluna responde sobre planes
- [ ] Adriana responde con @adriana
- [ ] Enzo responde con @enzo
- [ ] Logs guardándose en `data/interactions.jsonl`
- [ ] Deploy en producción (Render/Heroku)
- [ ] Webhook actualizado a URL de producción

---

## 🐛 Troubleshooting

### Problema: No llegan webhooks
**Solución:**
- Verifica que ngrok esté corriendo
- Revisa URL en Wassenger (debe ser exacta)
- Chequea logs de Wassenger Dashboard

### Problema: Servidor responde pero no envía a WhatsApp
**Solución:**
- Verifica `WASSENGER_TOKEN` y `WASSENGER_DEVICE` en `.env`
- Revisa logs del servidor: `[WASSENGER] Error al enviar respuesta`
- Confirma que el device esté conectado en Wassenger Dashboard

### Problema: Respuestas muy lentas
**Solución:**
- Reduce `max_tokens` en `wassenger.js` (línea ~112)
- Usa modelo más rápido: `gpt-3.5-turbo` en lugar de `gpt-4o-mini`

### Problema: Mensajes duplicados
**Solución:**
- Verifica que solo tengas UN webhook configurado en Wassenger
- Revisa que no haya múltiples instancias del servidor corriendo

---

## 📊 Monitoreo en Producción

### Ver interacciones guardadas
```bash
cat data/interactions.jsonl | jq '.'
```

### Estadísticas rápidas
```bash
# Total de interacciones
wc -l data/interactions.jsonl

# Por agente
grep '"agent":"AURORA"' data/interactions.jsonl | wc -l
grep '"agent":"ALUNA"' data/interactions.jsonl | wc -l
```

---

## 🎉 ¡Listo!

Tu agente ahora está conectado a WhatsApp y responde automáticamente 24/7.

**Siguiente paso:** Probar en situaciones reales y ajustar personalidades según feedback.
