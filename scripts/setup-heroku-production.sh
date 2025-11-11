#!/bin/bash
# 🚀 Script de configuración rápida para Heroku
# Uso: ./scripts/setup-heroku-production.sh [app-name]

set -e  # Exit on error

APP_NAME="${1:-coworkia-agent}"

echo "🚀 Configurando Heroku para: $APP_NAME"
echo "═══════════════════════════════════════════════════════════════"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para preguntar y configurar variable
configure_var() {
  local var_name=$1
  local var_description=$2
  local var_default=$3
  local is_required=$4
  
  echo ""
  echo -e "${YELLOW}📝 $var_name${NC}"
  echo "   $var_description"
  
  # Verificar si ya existe
  existing_value=$(heroku config:get $var_name --app $APP_NAME 2>/dev/null || echo "")
  
  if [ -n "$existing_value" ]; then
    echo -e "   ${GREEN}✅ Ya configurada${NC}"
    return
  fi
  
  if [ -n "$var_default" ]; then
    echo -n "   Valor [$var_default]: "
  else
    echo -n "   Valor: "
  fi
  
  read user_input
  
  if [ -z "$user_input" ]; then
    user_input=$var_default
  fi
  
  if [ -z "$user_input" ] && [ "$is_required" = "true" ]; then
    echo -e "   ${RED}❌ Este valor es requerido${NC}"
    exit 1
  fi
  
  if [ -n "$user_input" ]; then
    heroku config:set $var_name="$user_input" --app $APP_NAME
    echo -e "   ${GREEN}✅ Configurada${NC}"
  else
    echo -e "   ${YELLOW}⊘ Saltada (opcional)${NC}"
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "1️⃣  VARIABLES BÁSICAS"
echo "═══════════════════════════════════════════════════════════════"

configure_var "NODE_ENV" "Entorno de ejecución" "production" "true"
configure_var "PORT" "Puerto para el servidor" "3000" "false"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "2️⃣  WEBHOOK SECURITY"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "Generando token seguro..."
WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo -e "${GREEN}Token generado: $WEBHOOK_SECRET${NC}"

heroku config:set WASSENGER_WEBHOOK_SECRET="$WEBHOOK_SECRET" --app $APP_NAME
echo -e "${GREEN}✅ WASSENGER_WEBHOOK_SECRET configurado${NC}"

echo ""
echo -e "${YELLOW}📋 IMPORTANTE: Configura este token en Wassenger:${NC}"
echo "   URL: https://$APP_NAME.herokuapp.com/api/v1/webhooks/wassenger"
echo "   Header: x-webhook-signature"
echo "   Algoritmo: HMAC-SHA256"
echo "   Secret: $WEBHOOK_SECRET"
echo ""
read -p "Presiona ENTER cuando hayas configurado Wassenger..."

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "3️⃣  OPENAI"
echo "═══════════════════════════════════════════════════════════════"

configure_var "OPENAI_API_KEY" "API Key de OpenAI" "" "true"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "4️⃣  WASSENGER (WhatsApp)"
echo "═══════════════════════════════════════════════════════════════"

configure_var "WASSENGER_API_KEY" "API Key de Wassenger" "" "true"
configure_var "WASSENGER_DEVICE_ID" "Device ID de Wassenger" "" "false"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "5️⃣  GOOGLE CALENDAR"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo -e "${YELLOW}Para configurar Google Calendar necesitas:${NC}"
echo "1. Crear Service Account en Google Cloud Console"
echo "2. Habilitar Google Calendar API"
echo "3. Descargar JSON de credenciales"
echo "4. Compartir el calendario con el email del Service Account"
echo ""

configure_var "GOOGLE_CALENDAR_ID" "ID del calendario (ej: abc@group.calendar.google.com)" "" "true"

echo ""
echo "¿Tienes el archivo JSON de credenciales? (s/n)"
read has_json

if [ "$has_json" = "s" ]; then
  echo "Ruta al archivo JSON:"
  read json_path
  
  if [ -f "$json_path" ]; then
    json_content=$(cat "$json_path" | tr -d '\n' | tr -d ' ')
    heroku config:set GOOGLE_SERVICE_ACCOUNT_JSON="$json_content" --app $APP_NAME
    echo -e "${GREEN}✅ GOOGLE_SERVICE_ACCOUNT_JSON configurado${NC}"
  else
    echo -e "${RED}❌ Archivo no encontrado: $json_path${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️ Necesitarás configurar GOOGLE_SERVICE_ACCOUNT_JSON manualmente${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "6️⃣  PAGOS (Payphone)"
echo "═══════════════════════════════════════════════════════════════"

configure_var "PAYPHONE_TOKEN" "Token de Payphone" "" "false"
configure_var "PAYPHONE_STORE_ID" "Store ID de Payphone" "" "false"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "7️⃣  BASE DE DATOS (SQLite)"
echo "═══════════════════════════════════════════════════════════════"

configure_var "SQLITE_PATH" "Ruta de la base de datos" "/app/data/coworkia.db" "true"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "8️⃣  SISTEMA DE BACKUPS"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "¿Dónde quieres almacenar los backups?"
echo "1) AWS S3"
echo "2) Google Cloud Storage"
echo "3) Otro / Manual"
echo -n "Opción [1]: "
read backup_option
backup_option=${backup_option:-1}

case $backup_option in
  1)
    echo ""
    echo "Configurando AWS S3..."
    configure_var "AWS_ACCESS_KEY_ID" "AWS Access Key ID" "" "true"
    configure_var "AWS_SECRET_ACCESS_KEY" "AWS Secret Access Key" "" "true"
    configure_var "AWS_DEFAULT_REGION" "AWS Region" "us-east-1" "true"
    configure_var "BACKUP_REMOTE_DIR" "Bucket S3 (ej: s3://my-bucket/backups)" "" "true"
    heroku config:set BACKUP_UPLOAD_COMMAND="aws s3 cp" --app $APP_NAME
    echo -e "${GREEN}✅ AWS S3 configurado${NC}"
    ;;
  2)
    echo ""
    echo "Configurando Google Cloud Storage..."
    echo "¿Tienes el archivo JSON de credenciales de GCS? (s/n)"
    read has_gcs_json
    
    if [ "$has_gcs_json" = "s" ]; then
      echo "Ruta al archivo JSON:"
      read gcs_json_path
      
      if [ -f "$gcs_json_path" ]; then
        gcs_json_content=$(cat "$gcs_json_path" | base64)
        heroku config:set GOOGLE_CLOUD_CREDENTIALS="$gcs_json_content" --app $APP_NAME
        echo -e "${GREEN}✅ Credenciales GCS configuradas${NC}"
      fi
    fi
    
    configure_var "BACKUP_REMOTE_DIR" "Bucket GCS (ej: gs://my-bucket/backups)" "" "true"
    heroku config:set BACKUP_UPLOAD_COMMAND="gsutil cp" --app $APP_NAME
    echo -e "${GREEN}✅ Google Cloud Storage configurado${NC}"
    ;;
  3)
    echo ""
    configure_var "BACKUP_REMOTE_DIR" "Destino remoto" "" "false"
    configure_var "BACKUP_UPLOAD_COMMAND" "Comando de subida" "" "false"
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "9️⃣  HEROKU SCHEDULER (Backups Automáticos)"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "¿Quieres instalar Heroku Scheduler para backups automáticos? (s/n)"
read install_scheduler

if [ "$install_scheduler" = "s" ]; then
  heroku addons:create scheduler:standard --app $APP_NAME || echo "Scheduler ya instalado"
  echo ""
  echo -e "${GREEN}✅ Scheduler instalado${NC}"
  echo -e "${YELLOW}📋 Configura el job:${NC}"
  echo "   1. Abre el dashboard: heroku addons:open scheduler --app $APP_NAME"
  echo "   2. Agrega nuevo job:"
  echo "      - Comando: npm run backup"
  echo "      - Frecuencia: Every day at 3:00 AM UTC"
  echo ""
  read -p "Presiona ENTER para continuar..."
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "📊 Variables configuradas:"
heroku config --app $APP_NAME | head -20

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🚀 PRÓXIMOS PASOS"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "1. Deploy a Heroku:"
echo "   git push heroku main"
echo ""
echo "2. Ver logs:"
echo "   heroku logs --tail --app $APP_NAME"
echo ""
echo "3. Verificar health:"
echo "   curl https://$APP_NAME.herokuapp.com/health"
echo ""
echo "4. Verificar base de datos:"
echo "   curl https://$APP_NAME.herokuapp.com/health/db"
echo ""
echo "5. Probar backup:"
echo "   heroku run npm run backup --app $APP_NAME"
echo ""
echo "6. Ver tests:"
echo "   npm test"
echo ""

echo -e "${GREEN}¡Configuración exitosa! 🎉${NC}"
