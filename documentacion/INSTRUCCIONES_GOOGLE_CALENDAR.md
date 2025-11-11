# 🚀 CONFIGURAR GOOGLE CALENDAR PASO A PASO

## PASO 1: Google Cloud Console
1. Ve a: https://console.cloud.google.com
2. **Crear Nuevo Proyecto**:
   - Nombre: "Coworkia Calendar"
   - ID: coworkia-calendar-2024

## PASO 2: Habilitar Google Calendar API
1. En el menú lateral → "APIs & Services" → "Library"
2. Buscar: "Google Calendar API"
3. Clic en "ENABLE" (Habilitar)

## PASO 3: Crear Service Account
1. "APIs & Services" → "Credentials"
2. "CREATE CREDENTIALS" → "Service Account"
3. Nombre: "coworkia-calendar-bot"
4. Descripción: "Bot para crear eventos automáticamente"
5. Clic "CREATE AND CONTINUE"

## PASO 4: Generar Clave JSON
1. En "Service Accounts" → clic en la cuenta creada
2. Pestaña "KEYS" → "ADD KEY" → "Create new key"
3. Tipo: JSON → "CREATE"
4. ⚠️ GUARDAR EL ARCHIVO JSON descargado

## PASO 5: Configurar Heroku
```bash
# Copiar contenido del archivo JSON
cat ~/Downloads/coworkia-calendar-*.json

# Configurar en Heroku (reemplazar con el JSON real)
heroku config:set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

## PASO 6: Configurar Calendario
1. Abrir Google Calendar: https://calendar.google.com
2. Crear nuevo calendario: "Coworkia Reservas"
3. Compartir con el email del service account
4. Dar permisos de "Make changes to events"

## LISTO ✅
- El bot podrá crear eventos automáticamente
- Se enviarán invitaciones a los usuarios
- Todo será visible en Google Calendar