#!/bin/bash
# Healthcheck script para Heroku Scheduler
# Este script mantiene el dyno despierto haciendo ping cada 10 minutos

curl -s https://coworkia-agent-e97d15dac56f.herokuapp.com/ping > /dev/null

echo "✅ Healthcheck completado"
