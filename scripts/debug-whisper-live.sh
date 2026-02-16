#!/bin/bash
# 🔍 Script de diagnóstico en tiempo real - Whisper No Responde
# Uso: ./scripts/debug-whisper-live.sh

echo "🔍 DIAGNÓSTICO WHISPER - Modo en tiempo real"
echo "============================================="
echo ""
echo "⚠️  Este script monitoreará los logs de Heroku en tiempo real"
echo "   Envía un audio por WhatsApp DESPUÉS de ejecutar este script"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[1/4] Verificando conexión con Heroku...${NC}"
heroku whoami --app coworkia-agent 2>/dev/null
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error: No autenticado en Heroku${NC}"
  echo "   Ejecuta: heroku login"
  exit 1
fi
echo -e "${GREEN}✅ Conectado a Heroku${NC}"
echo ""

echo -e "${BLUE}[2/4] Verificando estado de dynos...${NC}"
DYNO_STATUS=$(heroku ps --app coworkia-agent 2>&1 | grep "web.1" | awk '{print $2}')
echo "   Estado: $DYNO_STATUS"
if [[ "$DYNO_STATUS" != "up" ]]; then
  echo -e "${YELLOW}⚠️  Dyno no está 'up' - estado: $DYNO_STATUS${NC}"
fi
echo ""

echo -e "${BLUE}[3/4] Última versión deployed:${NC}"
LAST_RELEASE=$(heroku releases --app coworkia-agent -n 1 2>&1 | tail -1 | awk '{print $1}')
echo "   Release: $LAST_RELEASE"
echo ""

echo -e "${BLUE}[4/4] Iniciando monitoreo en tiempo real...${NC}"
echo ""
echo -e "${YELLOW}📱 AHORA envía un audio por WhatsApp${NC}"
echo -e "${YELLOW}   Verás los logs aparecer aquí en tiempo real${NC}"
echo ""
echo "============================================="
echo ""

# Monitoreo en tiempo real con filtros relevantes
heroku logs --app coworkia-agent --tail 2>&1 | grep --line-buffered -E \
  "Processing incoming|Whisper|🎤|Procesando audio|Fallback|transcrito|DEDUP|ERROR|❌|Agent response"
