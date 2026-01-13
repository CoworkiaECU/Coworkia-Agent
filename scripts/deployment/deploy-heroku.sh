#!/bin/bash
# Script de deploy rápido a Heroku

echo "🚀 DEPLOY COWORKIA AGENT A HEROKU"
echo "=================================="
echo ""

# Verificar que estamos en git
if [ ! -d .git ]; then
  echo "📦 Inicializando Git..."
  git init
  git add .
  git commit -m "feat: Coworkia Agent completo"
fi

# Push a GitHub (opcional, comentado)
# echo "📤 Subiendo a GitHub..."
# git branch -M main
# git remote add origin https://github.com/TU-USUARIO/coworkia-agent.git
# git push -u origin main

# Verificar login Heroku
echo "🔐 Verificando login en Heroku..."
heroku auth:whoami || heroku login

# Crear app si no existe
APP_NAME="coworkia-agent"
echo "🏗️  Creando/verificando app en Heroku: $APP_NAME"
heroku apps:info $APP_NAME 2>/dev/null || heroku create $APP_NAME

# Configurar variables de entorno
echo "⚙️  Configurando variables de entorno..."

heroku config:set \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  OPENAI_MODEL="gpt-4o-mini" \
  WASSENGER_TOKEN="$WASSENGER_TOKEN" \
  WASSENGER_DEVICE="$WASSENGER_DEVICE" \
  AGENT_BUILDER_TOKEN="$AGENT_BUILDER_TOKEN" \
  ENV="production" \
  PORT="3001"

echo ""
echo "📋 Variables configuradas:"
heroku config

# Deploy
echo ""
echo "🚀 Desplegando a Heroku..."
git push heroku main

# Ver logs
echo ""
echo "📊 Logs en tiempo real (Ctrl+C para salir):"
heroku logs --tail
