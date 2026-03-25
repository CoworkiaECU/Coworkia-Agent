#!/bin/zsh
# ═══════════════════════════════════════════════════════════════
# ✨ Sensei son Magic — Coworkia Agent CLI Aliases
# ═══════════════════════════════════════════════════════════════

# Deploy con double push
alias magic-push='git push origin main && git push heroku main'

# Status de producción
alias magic-status='heroku ps --app coworkia-agent && echo "---" && heroku logs --app coworkia-agent --num 15'

# Ver errores recientes
alias magic-errors='heroku logs --app coworkia-agent --num 100 | grep -i "error\|failed\|exception"'

# Health check rápido
alias magic-health='curl -s https://coworkia-agent-e97d15dac56f.herokuapp.com/health | jq'

# Ver commits recientes
alias magic-history='git log --oneline --decorate --graph -10'

# Restart dyno si es necesario
alias magic-restart='heroku restart --app coworkia-agent && echo "✅ Dyno reiniciado"'

# Función para commits con firma Sensei son Magic
magic-commit() {
  if [ -z "$1" ]; then
    echo "Usage: magic-commit 'Tu mensaje de commit'"
    return 1
  fi
  git commit -m "✨ Sensei son Magic — $1"
}

# Deploy completo con mensaje magic
magic-deploy() {
  if [ -z "$1" ]; then
    echo "Usage: magic-deploy 'descripción del deploy'"
    return 1
  fi
  git add .
  git commit -m "✨ Sensei son Magic — $1"
  git push origin main
  git push heroku main
  echo "🚀 Deploy completado!"
}

echo "✨ Sensei son Magic aliases cargados!"
