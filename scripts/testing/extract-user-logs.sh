#!/bin/bash
# Script para extraer logs de un usuario específico de Heroku

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parámetros
USER_ID=${1:-"5930788"}
LINES=${2:-500}
OUTPUT_FILE="logs-${USER_ID}-$(date +%Y%m%d-%H%M%S).txt"

echo -e "${BLUE}📊 Extrayendo logs del usuario: ${USER_ID}${NC}"
echo -e "${YELLOW}🔍 Buscando en últimas ${LINES} líneas...${NC}"
echo ""

# Extraer logs recientes y filtrar por usuario
heroku logs --app coworkia-agent --num $LINES 2>&1 | \
  grep -E "(${USER_ID}|AXEL|GABI|AURORA|ADRIANA|ALUNA|PAULA|ENZO)" | \
  grep -A 10 -B 2 "${USER_ID}" > "$OUTPUT_FILE"

# Contar líneas encontradas
LINE_COUNT=$(wc -l < "$OUTPUT_FILE")

if [ $LINE_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Logs extraídos: ${LINE_COUNT} líneas${NC}"
  echo -e "${GREEN}📄 Archivo: ${OUTPUT_FILE}${NC}"
  echo ""
  echo -e "${BLUE}Últimas 50 líneas:${NC}"
  echo "════════════════════════════════════════════════════════════"
  tail -50 "$OUTPUT_FILE"
else
  echo -e "${YELLOW}⚠️  No se encontraron logs del usuario ${USER_ID}${NC}"
  rm "$OUTPUT_FILE"
fi
