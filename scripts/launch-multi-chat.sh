#!/bin/bash
# 🚀 Coworkia Agent — Multi-Chat Launcher
# Abre 3 ventanas de VS Code con chats limpios y memoria pre-cargada
#
# Uso: ./scripts/launch-multi-chat.sh

set -e

WORKSPACE_FILE="/Users/diegovillota/coworkia-agent/coworkia.code-workspace"

echo "🚀 Lanzando Coworkia Agent Multi-Chat Setup..."
echo ""

# Ventana 1 — Aurora (principal, con todos los agentes)
echo "📱 Ventana 1: Aurora (Principal)"
code "$WORKSPACE_FILE" &
sleep 2

# Ventana 2 — Aluna (ventana separada)
echo "💼 Ventana 2: Aluna"
code --new-window "$WORKSPACE_FILE" &
sleep 2

# Ventana 3 — Adriana (ventana separada)
echo "🚗 Ventana 3: Adriana"
code --new-window "$WORKSPACE_FILE" &
sleep 1

echo ""
echo "✅ 3 ventanas lanzadas"
echo ""
echo "📋 Siguiente paso:"
echo "   En cada ventana, abre el chat de Copilot y di:"
echo "   → Ventana 1: 'nena hoy nos enfocamos en aurora'"
echo "   → Ventana 2: 'nena hoy nos enfocamos en aluna'"
echo "   → Ventana 3: 'nena hoy nos enfocamos en adriana'"
echo ""
echo "🤖 Cada agente cargará su memoria y plan de vuelo automáticamente"
echo ""
