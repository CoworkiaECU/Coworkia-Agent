# 🔧 Configuración de Gmail para Coworkia Agent

## ❌ Problema Actual
Los emails se envían "exitosamente" según los logs, pero no llegan a los destinatarios. Esto indica un problema de autenticación con Gmail.

## ✅ Solución: App Password de Gmail

### 1. Verificar 2FA
- Ve a tu cuenta de Google: https://myaccount.google.com/
- Buscar "Verificación en 2 pasos"
- **DEBE estar habilitada** para usar App Passwords

### 2. Generar App Password
1. Ve a https://myaccount.google.com/apppasswords
2. Selecciona "Correo" como app
3. Selecciona "Otro (nombre personalizado)"
4. Escribir: "Coworkia Agent"
5. Copiar la contraseña de 16 caracteres generada

### 3. Actualizar Variables de Entorno en Heroku
```bash
# Conectar a Heroku
heroku config:set EMAIL_USER="secretaria.coworkia@gmail.com" -a coworkia-agent
heroku config:set EMAIL_PASS="[APP_PASSWORD_DE_16_CARACTERES]" -a coworkia-agent

# Verificar configuración
heroku config -a coworkia-agent
```

### 4. Testear Configuración
```bash
# Ejecutar en el servidor
curl -X POST https://coworkia-agent.herokuapp.com/api/test-email
```

## 🔍 Variables Actuales
- `EMAIL_USER`: secretaria.coworkia@gmail.com
- `EMAIL_PASS`: ⚠️ Debe ser App Password, no contraseña normal
- `EMAIL_SERVICE`: gmail

## 📧 Verificación
Después de actualizar el App Password, los logs deberían mostrar:
- ✅ Conexión SMTP verificada exitosamente
- ✅ Email enviado con accepted: [email]
- ✅ Sin rejected recipients

## 🚨 Si el problema persiste
1. Verificar que la cuenta Gmail permite "Aplicaciones menos seguras"
2. Considerar usar OAuth2 en lugar de App Password
3. Verificar que no hay límites de envío activados