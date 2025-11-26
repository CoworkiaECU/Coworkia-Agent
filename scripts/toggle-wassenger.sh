#!/bin/bash

# Script para activar/desactivar Wassenger temporalmente usando Heroku Config Vars
# Uso: ./scripts/toggle-wassenger.sh [enable|disable|status]

ACTION=${1:-status}
HEROKU_APP="coworkia-agent"
API_URL="https://${HEROKU_APP}-e97d15dac56f.herokuapp.com/webhooks/wassenger"

case $ACTION in
  enable)
    echo "🔄 Activando Wassenger..."
    heroku config:set WASSENGER_ENABLED=true --app ${HEROKU_APP}
    echo ""
    echo "✅ Wassenger activado. Verificando estado..."
    sleep 2
    curl -s -X GET "${API_URL}/status" | jq
    ;;
  disable)
    echo "⏸️  Desactivando Wassenger..."
    heroku config:set WASSENGER_ENABLED=false --app ${HEROKU_APP}
    echo ""
    echo "✅ Wassenger desactivado. Verificando estado..."
    sleep 2
    curl -s -X GET "${API_URL}/status" | jq
    ;;
  status)
    echo "📊 Consultando estado de Wassenger..."
    echo ""
    echo "Config var actual:"
    heroku config:get WASSENGER_ENABLED --app ${HEROKU_APP}
    echo ""
    echo "Estado en la app:"
    curl -s -X GET "${API_URL}/status" | jq
    ;;
  *)
    echo "❌ Acción inválida. Uso: $0 [enable|disable|status]"
    exit 1
    ;;
esac
