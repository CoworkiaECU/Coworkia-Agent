#!/bin/bash

# Script para activar/desactivar Wassenger temporalmente
# Uso: ./scripts/toggle-wassenger.sh [enable|disable|status]

ACTION=${1:-status}
HEROKU_APP="coworkia-agent"
API_URL="https://${HEROKU_APP}-e97d15dac56f.herokuapp.com/webhooks/wassenger"

case $ACTION in
  enable)
    echo "🔄 Activando Wassenger..."
    curl -X POST "${API_URL}/control" \
      -H "Content-Type: application/json" \
      -d '{"action":"enable"}' | jq
    ;;
  disable)
    echo "⏸️  Desactivando Wassenger..."
    curl -X POST "${API_URL}/control" \
      -H "Content-Type: application/json" \
      -d '{"action":"disable"}' | jq
    ;;
  status)
    echo "📊 Consultando estado de Wassenger..."
    curl -s -X GET "${API_URL}/status" | jq
    ;;
  *)
    echo "❌ Acción inválida. Uso: $0 [enable|disable|status]"
    exit 1
    ;;
esac
