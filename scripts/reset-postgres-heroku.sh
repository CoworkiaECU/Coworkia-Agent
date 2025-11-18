#!/bin/bash
# 🔄 Reset completo de PostgreSQL en Heroku
# ⚠️ ADVERTENCIA: Esto borra TODOS los datos

APP_NAME="coworkia-agent"

echo "⚠️  ADVERTENCIA: Esto borrará TODOS los datos de producción"
echo ""
echo "📊 Base de datos: $APP_NAME"
echo ""
read -p "¿Estás seguro? Escribe 'SI BORRAR TODO' para confirmar: " confirmation

if [ "$confirmation" != "SI BORRAR TODO" ]; then
  echo "❌ Operación cancelada"
  exit 0
fi

echo ""
echo "🗑️  Reseteando base de datos PostgreSQL..."
heroku pg:reset DATABASE --confirm $APP_NAME -a $APP_NAME

if [ $? -eq 0 ]; then
  echo "✅ Base de datos reseteada"
  echo ""
  echo "🔄 Reiniciando aplicación para crear esquema nuevo..."
  heroku restart -a $APP_NAME
  
  echo ""
  echo "⏳ Esperando 10 segundos para que se aplique el esquema..."
  sleep 10
  
  echo ""
  echo "✅ Proceso completado"
  echo ""
  echo "📝 Verifica los logs:"
  echo "   heroku logs --tail -a $APP_NAME"
else
  echo "❌ Error al resetear base de datos"
  exit 1
fi
