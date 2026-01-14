# 📅 Configuración de Google Calendar para Coworkia Agent

## ✅ Estado Actual: CÓDIGO IMPLEMENTADO
- ✅ Servicio `google-calendar.js` completo
- ✅ Integración automática en emails de confirmación
- ✅ Endpoints `/test-calendar` funcionando
- ✅ Creación automática de eventos tras pagos
- ⚠️ **Pendiente**: Configurar credenciales reales de Google

## 🔧 Pasos para Completar la Configuración

### **Paso 1: Crear Service Account en Google Cloud**

1. **Ir a Google Cloud Console**: https://console.cloud.google.com/
2. **Crear/Seleccionar Proyecto**: "Coworkia Calendar"
3. **Habilitar Google Calendar API**:
   - APIs & Services → Library
   - Buscar "Google Calendar API"
   - Click "Enable"

### **Paso 2: Crear Service Account**

1. **IAM & Admin → Service Accounts**
2. **Create Service Account**:
   - Name: `coworkia-calendar-bot`
   - Description: `Automatización de eventos de reservas Coworkia`
3. **Create Key (JSON)**:
   - Service Account → Keys → Add Key → Create New Key
   - Formato: JSON
   - **Descargar archivo JSON**

### **Paso 3: Configurar Permisos en Google Calendar**

1. **Abrir Google Calendar** (secretaria.coworkia@gmail.com)
2. **Settings → Add Calendar → Create New Calendar**:
   - Name: `Coworkia Reservas`
   - Description: `Eventos automáticos de reservas`
   - Time Zone: `(GMT-05:00) America/Guayaquil`
3. **Share Calendar**:
   - Settings → Calendar Settings → Share with specific people
   - Add: `coworkia-calendar-bot@[PROJECT].iam.gserviceaccount.com`
   - Permission: **Make changes to events**

### **Paso 4: Actualizar Variables en Heroku**

```bash
# Configurar Service Account JSON (todo en una línea)
heroku config:set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' -a coworkia-agent

# Configurar Calendar ID (opcional, usa 'primary' si no se especifica)
heroku config:set GOOGLE_CALENDAR_ID="calendario_id_aqui@group.calendar.google.com" -a coworkia-agent
```

### **Paso 5: Verificar Configuración**

```bash
# Probar conexión
curl -X POST https://coworkia-agent-e97d15dac56f.herokuapp.com/test-calendar

# Resultado esperado:
# {"success":true,"message":"Configuración de Google Calendar correcta","calendars":[...]}
```

## 🎯 **Resultado Final**

Una vez configurado, **automáticamente**:

1. ✅ **Reserva confirmada** → Email + **Evento en Google Calendar**
2. ✅ **Invitación automática** → Usuario recibe evento en su calendario
3. ✅ **Recordatorios configurados** → 1 día antes + 1 hora antes  
4. ✅ **Detalles completos** → Ubicación, descripción, contactos

## 📋 **Variables Requeridas**

- `GOOGLE_SERVICE_ACCOUNT_JSON`: Credenciales del Service Account (JSON completo)
- `GOOGLE_CALENDAR_ID`: ID del calendario específico (opcional, usa 'primary' por defecto)

## 🧪 **Para Testing**

El sistema ya incluye endpoints de prueba:
- `POST /test-calendar` → Verifica conexión
- `POST /test-email` → Verifica emails

## 🚨 **Importante**

- El Service Account debe tener permisos en el calendario destino
- El JSON de credenciales debe estar en una sola línea para Heroku
- Timezone configurado como America/Guayaquil (Ecuador UTC-5)