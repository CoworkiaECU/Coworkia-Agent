#!/bin/bash

# 📧 Script para actualizar la configuración de Gmail en Heroku
# Uso: ./update-gmail-config.sh [APP_PASSWORD]

APP_NAME="coworkia-agent"
EMAIL_USER="secretaria.coworkia@gmail.com"

echo "🔧 Configurando Gmail para Coworkia Agent..."
echo "📱 App: $APP_NAME"
echo "📧 Usuario: $EMAIL_USER"

# Verificar si se proporcionó App Password
if [ -z "$1" ]; then
    echo ""
    echo "❌ Error: Debes proporcionar el App Password de Gmail"
    echo ""
    echo "📋 Instrucciones:"
    echo "1. Ve a https://myaccount.google.com/apppasswords"
    echo "2. Genera un App Password para 'Coworkia Agent'"
    echo "3. Ejecuta: ./update-gmail-config.sh [TU_APP_PASSWORD]"
    echo ""
    exit 1
fi

APP_PASSWORD="$1"

echo ""
echo "🚀 Actualizando variables de entorno en Heroku..."

# Actualizar variables
heroku config:set EMAIL_USER="$EMAIL_USER" -a "$APP_NAME"
heroku config:set EMAIL_PASS="$APP_PASSWORD" -a "$APP_NAME" 
heroku config:set EMAIL_SERVICE="gmail" -a "$APP_NAME"

echo ""
echo "✅ Variables actualizadas!"
echo ""
echo "🔍 Verificando configuración..."
heroku config:grep EMAIL -a "$APP_NAME"

echo ""
echo "🧪 Para probar la configuración, ejecuta:"
echo "curl -X POST https://coworkia-agent.herokuapp.com/api/test-email"
echo ""
echo "📝 Revisa los logs con:"
echo "heroku logs --tail -a $APP_NAME"