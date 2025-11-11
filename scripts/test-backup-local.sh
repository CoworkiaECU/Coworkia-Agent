#!/bin/bash
# 🧪 Script de prueba local para sistema de backups
# Simula el entorno de Heroku localmente

echo "🧪 PRUEBA LOCAL DEL SISTEMA DE BACKUPS"
echo "═══════════════════════════════════════════════════════════════"

# Configurar variables de entorno temporales
export SQLITE_PATH="./data/coworkia.db"
export NODE_ENV="development"

echo ""
echo "1️⃣  Verificando base de datos..."

if [ ! -f "$SQLITE_PATH" ]; then
  echo "   ⚠️ Base de datos no encontrada en: $SQLITE_PATH"
  echo "   💡 Creando base de datos de prueba..."
  mkdir -p ./data
  touch "$SQLITE_PATH"
  echo "SELECT 1" | sqlite3 "$SQLITE_PATH"
  echo "   ✅ Base de datos de prueba creada"
else
  DB_SIZE=$(du -h "$SQLITE_PATH" | cut -f1)
  echo "   ✅ Base de datos encontrada: $DB_SIZE"
fi

echo ""
echo "2️⃣  Ejecutando backup..."
npm run backup

echo ""
echo "3️⃣  Verificando backups creados..."
npm run backup:list

echo ""
echo "4️⃣  Verificando directorio de backups..."
if [ -d "./data/backups" ]; then
  BACKUP_COUNT=$(ls -1 ./data/backups/*.db 2>/dev/null | wc -l)
  echo "   ✅ Directorio existe con $BACKUP_COUNT backup(s)"
  
  if [ $BACKUP_COUNT -gt 0 ]; then
    echo ""
    echo "   📁 Backups más recientes:"
    ls -lth ./data/backups/*.db | head -3 | awk '{print "      " $9 " (" $5 ")"}'
  fi
else
  echo "   ❌ Directorio de backups no encontrado"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ PRUEBA COMPLETADA"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "📋 Siguiente paso: Configurar subida remota"
echo ""
echo "Para AWS S3:"
echo "  export BACKUP_REMOTE_DIR='s3://tu-bucket/backups'"
echo "  export BACKUP_UPLOAD_COMMAND='aws s3 cp'"
echo "  export AWS_ACCESS_KEY_ID='...'"
echo "  export AWS_SECRET_ACCESS_KEY='...'"
echo ""
echo "Para Google Cloud Storage:"
echo "  export BACKUP_REMOTE_DIR='gs://tu-bucket/backups'"
echo "  export BACKUP_UPLOAD_COMMAND='gsutil cp'"
echo "  export GOOGLE_CLOUD_CREDENTIALS='<base64-encoded-json>'"
echo ""
echo "Luego ejecuta: npm run backup"
echo ""
